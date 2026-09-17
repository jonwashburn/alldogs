(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let dogs = [], currentDog = null, requestedIndex = 0, selection = 0, detailLoad = 0;
  const dialog = $('dog-dialog');
  const imageCache = new Map();
  function asset(value) {
    const u = new URL(value, location.origin);
    if (u.protocol !== 'https:' || !['alldogs.wtf', 'www.alldogs.wtf', 'recognitionphysics-public.t3.tigrisfiles.io'].includes(u.hostname)) throw Error('Invalid artwork URL');
    return u.href;
  }
  function preload(src) {
    if (!imageCache.has(src)) {
      const image = new Image();
      image.src = src;
      const ready = image.decode().then(() => image);
      imageCache.set(src, ready);
      ready.catch(() => imageCache.delete(src));
      // Keep only a few paintings in memory, not the whole collection.
      if (imageCache.size > 6) imageCache.delete(imageCache.keys().next().value);
    }
    return imageCache.get(src);
  }
  function updateDialog(dog, position) {
    const token = ++detailLoad;
    $('dialog-title').textContent = dog.title;
    $('dialog-position').textContent = position;
    $('dialog-load-status').textContent = 'No dog is reserved by this preview.';
    $('dialog-image').src = $('spotlight-image').src;
    $('dialog-image').alt = dog.title + ', full-size painting of a living dog';
    const full = asset(dog.variants.at(-1).src);
    $('full-painting').href = full;
    preload(full).then(image => {
      if (token === detailLoad && dialog.open && currentDog === dog) $('dialog-image').src = image.src;
    }).catch(() => {}); // The decoded preview remains visible if the larger file is unavailable.
  }
  async function selectDog(index) {
    if (!dogs.length) return;
    requestedIndex = (index + dogs.length) % dogs.length;
    const dogIndex = requestedIndex, dog = dogs[dogIndex], token = ++selection;
    $('spotlight-open').setAttribute('aria-busy', 'true');
    $('painting-status').textContent = 'Loading ' + dog.title + '…';
    if (dialog.open) $('dialog-load-status').textContent = 'Loading ' + dog.title + '…';
    try {
      const image = await preload(asset(dog.variants[0].src));
      if (token !== selection) return;
      currentDog = dog;
      const position = String(dogIndex + 1).padStart(2, '0') + ' / ' + dogs.length;
      $('spotlight-image').src = image.src;
      $('spotlight-image').alt = dog.title + ', a living dog painting';
      $('spotlight-image').dataset.ready = 'true';
      $('spotlight-title').textContent = dog.title;
      $('spotlight-position').textContent = position;
      $('spotlight-open').disabled = false;
      $('spotlight-open').setAttribute('aria-label', 'Look closer at ' + dog.title);
      $('painting-status').textContent = dog.title + '. Painting ' + (dogIndex + 1) + ' of ' + dogs.length + '.';
      if (dialog.open) updateDialog(dog, position);
      for (const offset of [-1, 1]) {
        const neighbor = dogs[(dogIndex + offset + dogs.length) % dogs.length];
        preload(asset(neighbor.variants[0].src)).catch(() => {});
      }
    } catch (_) {
      if (token === selection) {
        const message = 'This painting could not load. Use an arrow to try another.';
        $('painting-status').textContent = message;
        if (dialog.open) $('dialog-load-status').textContent = message;
      }
    } finally {
      if (token === selection) $('spotlight-open').setAttribute('aria-busy', 'false');
    }
  }
  function move(direction) { selectDog(requestedIndex + direction); }
  for (const prefix of ['spotlight', 'dialog']) {
    $(prefix + '-prev').addEventListener('click', () => move(-1));
    $(prefix + '-next').addEventListener('click', () => move(1));
  }
  $('spotlight-open').addEventListener('click', () => {
    if (!currentDog) return;
    updateDialog(currentDog, $('spotlight-position').textContent);
    dialog.showModal();
    document.documentElement.classList.add('painting-is-open');
  });
  $('close-dialog').addEventListener('click', () => dialog.close());
  $('dialog-apply').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    ++detailLoad;
    document.documentElement.classList.remove('painting-is-open');
  });
  dialog.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (!dialog.open && !$('dogs').contains(event.target)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  async function load() {
    try {
      const response = await fetch('dogs.json?v=20260916', {signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw Error('Unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.items)) throw Error('Unavailable');
      dogs = data.items.filter(d => d.state === 'living' && d.curation === 'loved').reverse();
      if (!dogs.length) throw Error('Unavailable');
      dogs.forEach(d => {
        if (!Array.isArray(d.variants) || !d.variants.length) throw Error('Invalid painting');
        d.variants.forEach(v => asset(v.src));
      });
      // Start at the old end, with the two homepage heroes halfway through the pack.
      const middleIds = new Set(['candidate-fable_wide_round_07_20260912-undertow-64a222b20f6a9c11', 'original-62-fb27c29277cc6593']);
      const middleDogs = dogs.filter(d => middleIds.has(d.id));
      dogs = dogs.filter(d => !middleIds.has(d.id));
      dogs.splice(Math.floor(dogs.length / 2), 0, ...middleDogs);
      for (const prefix of ['spotlight', 'dialog']) {
        $(prefix + '-prev').disabled = dogs.length < 2;
        $(prefix + '-next').disabled = dogs.length < 2;
      }
      await selectDog(0);
    } catch (_) {
      $('painting-status').textContent = 'The paintings could not load. Please refresh to try again.';
    }
  }
  load();
})();
