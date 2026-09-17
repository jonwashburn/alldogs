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
    $('dialog-load-status').textContent = 'A preview, not a reservation.';
    $('dialog-image').src = $('spotlight-image').src;
    $('dialog-image').alt = dog.title + ', full living dog painting';
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
      $('spotlight-image').alt = dog.title + ', a loved living dog painting';
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
        const message = 'That painting could not load. Try another dog.';
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
      dogs = data.items.filter(d => d.state === 'living' && d.curation === 'loved');
      if (!dogs.length) throw Error('Unavailable');
      dogs.forEach(d => {
        if (!Array.isArray(d.variants) || !d.variants.length) throw Error('Invalid painting');
        d.variants.forEach(v => asset(v.src));
      });
      const first = dogs.findIndex(d => d.id.startsWith('original-62-'));
      if (first > 0) dogs.unshift(...dogs.splice(first, 1));
      for (const prefix of ['spotlight', 'dialog']) {
        $(prefix + '-prev').disabled = dogs.length < 2;
        $(prefix + '-next').disabled = dogs.length < 2;
      }
      await selectDog(0);
    } catch (_) {
      $('painting-status').textContent = 'The paintings could not load. Please refresh to try again.';
    }
  }
  let submission = null;
  try { submission = JSON.parse(sessionStorage.getItem('alldogs-application-attempt')); } catch (_) {}
  function showReceipt(receipt, publicId) {
    $('receipt-code').textContent = receipt;
    $('receipt').hidden = false;
    $('submit-application').hidden = true;
    $('form-status').textContent = '';
    for (const input of $('application-form').querySelectorAll('input, textarea')) input.disabled = true;
    try { sessionStorage.setItem('alldogs-application-receipt', receipt); } catch (_) {}
    if (/^[A-Za-z0-9_-]{24}$/.test(publicId || '')) {
      const url = 'https://alldogs.wtf/dog-pound/application/?id=' + publicId;
      $('share-application').hidden = false;
      $('view-application').href = url;
      $('share-on-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('I’m hoping to bring an ALL DOGS dog home. I need an eligible dog owner to vouch for me. Could you be my person?') + '&url=' + encodeURIComponent(url);
      $('copy-application').onclick = async () => {try {await navigator.clipboard.writeText(url); $('copy-application').textContent='Link copied';} catch (_) {$('copy-application').textContent='Copy the address from your application page';}};
      try { sessionStorage.setItem('alldogs-application-public-id', publicId); } catch (_) {}
    }
  }
  try { const receipt = sessionStorage.getItem('alldogs-application-receipt'); if (/^DOG-[A-F0-9]{16}$/.test(receipt || '')) showReceipt(receipt, sessionStorage.getItem('alldogs-application-public-id')); } catch (_) {}
  $('copy-receipt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('receipt-code').textContent); $('copy-receipt').textContent = 'Copied'; }
    catch (_) { $('copy-receipt').textContent = 'Select and copy the receipt above'; }
  });
  $('application-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!$('application-form').reportValidity()) return;
    const values = {handle: $('handle').value.trim(), wallet: $('wallet').value.trim(), note: $('note').value.trim(), consent: $('consent').checked, publicConsent: $('public-consent').checked, website: $('website').value};
    if (/^0x0{40}$/i.test(values.wallet)) {
      $('form-status').className = 'error'; $('form-status').textContent = 'Use your own Ethereum wallet, not the zero address.'; return;
    }
    const fingerprint = JSON.stringify(values);
    if (!submission || submission.fingerprint !== fingerprint) submission = {fingerprint, requestId: crypto.randomUUID()};
    try { sessionStorage.setItem('alldogs-application-attempt', JSON.stringify(submission)); } catch (_) {}
    const submit = $('submit-application'); submit.disabled = true; submit.textContent = 'Saving your application…';
    $('form-status').className = ''; $('form-status').textContent = '';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.alldogs.wtf/collection-api/adoption-applications', {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json'}, signal: controller.signal, body: JSON.stringify({...values, requestId: submission.requestId})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not save your application. Please try again.');
      if (!/^DOG-[A-F0-9]{16}$/.test(result.receipt || '')) throw Error('We could not confirm your receipt. Please try again.');
      if (!/^[A-Za-z0-9_-]{24}$/.test(result.publicId || '')) throw Error('We could not confirm your share link. Please retry the same application.');
      showReceipt(result.receipt, result.publicId);
    } catch (error) {
      $('form-status').className = 'error';
      $('form-status').textContent = error.name === 'AbortError' || error instanceof TypeError ? 'We could not confirm your application. Please retry; the same request will not create a duplicate.' : error.message;
    } finally { clearTimeout(timer); submit.disabled = false; submit.textContent = 'Join the adoption waitlist ↗'; }
  });
  load();
})();
