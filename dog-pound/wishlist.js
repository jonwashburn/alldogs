(() => {
  'use strict';
  const $ = id => document.getElementById(id), model = window.AllDogsWishlist;
  const dialog = $('dog-dialog'), cache = new Map();
  let receipt = '', dogs = [], ids = [], revision = 0, current = null, index = 0, imageTurn = 0, busy = true, drag = null;
  const validReceipt = value => /^DOG-[A-F0-9]{16}$/.test(value || '');
  function message(value) { $('wishlist-status').textContent = value; }
  function asset(value) {
    const url = new URL(value, 'https://alldogs.wtf');
    if (url.protocol !== 'https:' || !['alldogs.wtf','www.alldogs.wtf','recognitionphysics-public.t3.tigrisfiles.io'].includes(url.hostname)) throw Error('Invalid painting address.');
    return url.href;
  }
  async function request(action, values = {}) {
    const response = await fetch('https://api.alldogs.wtf/collection-api/application-wishlist', {
      method:'POST', credentials:'omit', cache:'no-store', headers:{'Content-Type':'application/json'},
      signal:AbortSignal.timeout(15000), body:JSON.stringify({action, receipt, ...values})
    });
    const result = await response.json();
    if (!response.ok) { const error = Error(result.error || 'The Pound is temporarily unavailable.'); error.status = response.status; throw error; }
    return result;
  }
  function preload(src) {
    if (!cache.has(src)) {
      const image = new Image(); image.src = src;
      const ready = image.decode().then(() => image); cache.set(src, ready);
      ready.catch(() => cache.delete(src));
      if (cache.size > 6) cache.delete(cache.keys().next().value);
    }
    return cache.get(src);
  }
  function addState() {
    for (const id of ['add-wish','dialog-add']) {
      const button = $(id), selected = current && ids.includes(current.id);
      button.disabled = busy || !current || selected || ids.length >= 3;
      button.textContent = selected ? 'On your wishlist ✓' : ids.length >= 3 ? 'Three favourites chosen' : 'Add to my wishlist +';
    }
  }
  function detail() {
    if (!current) return;
    const dog = current, turn = imageTurn;
    $('dialog-title').textContent = dog.title;
    $('dialog-position').textContent = $('spotlight-position').textContent;
    $('dialog-image').src = $('spotlight-image').src;
    $('dialog-image').alt = dog.title + ', a living dog painting';
    $('dialog-load-status').textContent = 'A wishlist is not a reservation.';
    preload(asset(dog.variants.at(-1).src)).then(image => {
      if (dialog.open && current === dog && imageTurn === turn) $('dialog-image').src = image.src;
    }).catch(() => {});
  }
  async function selectDog(next) {
    if (!dogs.length) return;
    index = (next + dogs.length) % dogs.length;
    const dog = dogs[index], position = index, turn = ++imageTurn;
    current = null; addState(); $('spotlight-open').disabled = true;
    $('painting-status').textContent = 'Loading ' + dog.title + '…';
    try {
      const image = await preload(asset(dog.variants[0].src));
      if (turn !== imageTurn) return;
      current = dog;
      $('spotlight-image').src = image.src; $('spotlight-image').alt = dog.title + ', a living dog painting';
      $('spotlight-image').dataset.ready = 'true'; $('spotlight-title').textContent = dog.title;
      $('spotlight-position').textContent = (position + 1) + ' / ' + dogs.length;
      $('spotlight-open').disabled = false; $('spotlight-open').setAttribute('aria-label','Look closer at ' + dog.title);
      $('painting-status').textContent = dog.title + '. Painting ' + (position + 1) + ' of ' + dogs.length + '.';
      if (dialog.open) detail();
      addState();
      for (const offset of [-1,1]) preload(asset(dogs[(position + offset + dogs.length) % dogs.length].variants[0].src)).catch(() => {});
    } catch (_) {
      if (turn === imageTurn) $('painting-status').textContent = 'This painting could not load. Use an arrow to try another.';
    }
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text; if (className) node.className = className;
    return node;
  }
  function button(text, label, callback, disabled = false) {
    const node = element('button', text); node.type = 'button'; node.setAttribute('aria-label', label);
    node.disabled = busy || disabled; node.addEventListener('click', callback); return node;
  }
  function render() {
    const slots = document.createDocumentFragment();
    for (let position = 0; position < 3; position++) {
      const id = ids[position], dog = dogs.find(d => d.id === id);
      const slot = element('li', '', 'wish-slot'); slot.dataset.position = String(position);
      slot.append(element('span', ['1st favourite','2nd favourite','3rd favourite'][position], 'wish-rank'));
      const frame = element('div', '', 'wish-frame' + (id ? '' : ' wish-empty'));
      if (dog) {
        const image = document.createElement('img'); image.src = asset(dog.original); image.alt = dog.title; image.loading = 'lazy';
        image.width = 1000; image.height = 1000;
        frame.append(image);
      } else if (id) frame.append(element('span','No longer in the Pound'));
      else frame.append(element('span','+'),element('span','A place for a good dog'));
      slot.append(frame);
      if (id) {
        const title = dog?.title || 'Unavailable painting';
        slot.append(element('h3',title,'wish-title'));
        const controls = element('div','','wish-actions');
        const handle = button('Drag', 'Drag ' + title + ' to change its rank', () => {});
        handle.className = 'wish-drag'; handle.dataset.drag = String(position);
        controls.append(handle,
          button('←','Move ' + title + ' earlier',() => save(model.move(ids,position,position-1), title + ' moved earlier.'), position === 0),
          button('→','Move ' + title + ' later',() => save(model.move(ids,position,position+1), title + ' moved later.'), position === ids.length-1));
        const release = button('Release','Release ' + title + ' from your wishlist',() => save(model.remove(ids,id),title + ' released from your wishlist.'));
        release.className = 'wish-release'; controls.append(release); slot.append(controls);
      }
      slots.append(slot);
    }
    $('wish-holders').replaceChildren(slots); $('wish-count').textContent = ids.length + ' of 3 chosen'; addState();
  }
  function restoreFocus(position) {
    const slot = $('wish-holders').children[Math.min(position,Math.max(ids.length-1,0))];
    const button = slot?.querySelector('button:not(:disabled)');
    if (button) button.focus({preventScroll:true});
  }
  async function save(next, success) {
    if (busy || JSON.stringify(next) === JSON.stringify(ids)) return;
    const active = document.activeElement?.closest('.wish-slot');
    const focusPosition = active ? Number(active.dataset.position) : null;
    busy = true; render(); message('Saving your wishlist…');
    try {
      const result = await request('save',{dogIds:next,revision});
      ids = result.dogIds; revision = result.revision; busy = false; render(); message(success + ' Saved.');
      if (focusPosition !== null) restoreFocus(focusPosition);
    } catch (error) {
      message((error.status === 409 ? error.message : 'We could not confirm that change.') + ' Reload your saved wishlist before continuing.');
      $('retry-wishlist').hidden = false;
      // Leave mutations locked: a timed-out write may have reached the server.
    }
  }
  async function load() {
    busy = true; render(); $('entry-status').textContent = 'Opening your wishlist…';
    $('retry-wishlist').hidden = true;
    try {
      const result = await request('get');
      dogs = result.items.filter(d => d.state === 'living' && d.curation === 'loved').reverse();
      dogs.forEach(d => { asset(d.original); d.variants.forEach(v => asset(v.src)); });
      const middle = new Set(['candidate-fable_wide_round_07_20260912-undertow-64a222b20f6a9c11','original-62-fb27c29277cc6593']);
      const featured = dogs.filter(d => middle.has(d.id)); dogs = dogs.filter(d => !middle.has(d.id));
      dogs.splice(Math.floor(dogs.length/2),0,...featured);
      ids = result.dogIds; revision = result.revision; busy = false;
      $('pound-gate').hidden = true; $('pound-content').hidden = false; $('leave-pound').hidden = false;
      $('welcome-handle').textContent = 'The Dog Pound · @' + result.handle;
      $('my-application').href = result.shortId ? '/vouch/' + result.shortId : '/dog-pound/application/?id=' + encodeURIComponent(result.publicId);
      try {
        sessionStorage.setItem('alldogs-application-receipt',receipt);
        sessionStorage.setItem('alldogs-application-public-id',result.publicId);
        if (result.shortId) sessionStorage.setItem('alldogs-application-short-id',String(result.shortId));
      } catch (_) {}
      $('entry-receipt').value = ''; render();
      message(ids.length ? 'Your wishlist is saved. You can change it anytime.' : 'Your three places are waiting. Choose a dog above.');
      for (const prefix of ['spotlight','dialog']) for (const direction of ['prev','next']) $(prefix + '-' + direction).disabled = dogs.length < 2;
      if (dogs.length) await selectDog(Math.min(index,dogs.length-1));
      else $('painting-status').textContent = 'The Pound is between viewings. Please check back for more paintings.';
    } catch (error) {
      $('entry-status').textContent = error.status === 403 ? error.message : 'The Pound could not open. Please try again.';
      if (!$('pound-content').hidden) { message('We could not reload your wishlist. Please try again.'); $('retry-wishlist').hidden = false; }
    }
  }
  for (const prefix of ['spotlight','dialog']) {
    $(prefix+'-prev').addEventListener('click',() => selectDog(index-1));
    $(prefix+'-next').addEventListener('click',() => selectDog(index+1));
  }
  for (const id of ['add-wish','dialog-add']) $(id).addEventListener('click',() => {
    if (current && !busy) save(model.add(ids,current.id),current.title + ' added to your wishlist.');
  });
  $('spotlight-open').addEventListener('click',() => { if (current) { dialog.showModal(); detail(); document.documentElement.classList.add('painting-is-open'); } });
  $('close-dialog').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',() => document.documentElement.classList.remove('painting-is-open'));
  document.addEventListener('keydown',event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (!dialog.open && !$('dogs').contains(event.target)) return;
    if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); selectDog(index + (event.key === 'ArrowLeft' ? -1 : 1)); }
  });
  $('pound-entry').addEventListener('submit',event => {
    event.preventDefault(); receipt = $('entry-receipt').value.trim().toUpperCase();
    if (validReceipt(receipt)) load();
  });
  $('retry-wishlist').addEventListener('click',load);
  $('leave-pound').addEventListener('click',() => {
    if (busy) return;
    try { for (const key of ['receipt','public-id','short-id']) sessionStorage.removeItem('alldogs-application-'+key); } catch (_) {}
    receipt = ''; ids = []; dogs = []; current = null; ++imageTurn; cache.clear();
    $('pound-content').hidden = true; $('pound-gate').hidden = false; $('leave-pound').hidden = true; $('entry-status').textContent = '';
    $('spotlight-image').removeAttribute('src'); $('dialog-image').removeAttribute('src'); render();
  });
  $('wish-holders').addEventListener('pointerdown',event => {
    const handle = event.target.closest('[data-drag]');
    if (!handle || busy || event.button !== 0) return;
    event.preventDefault();
    drag = {from:Number(handle.dataset.drag),to:Number(handle.dataset.drag),pointer:event.pointerId,handle};
    handle.setPointerCapture(event.pointerId); handle.closest('.wish-slot').classList.add('is-dragging');
  });
  $('wish-holders').addEventListener('pointermove',event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const slot = document.elementFromPoint(event.clientX,event.clientY)?.closest('.wish-slot');
    for (const item of $('wish-holders').children) item.classList.remove('is-target');
    drag.to = slot ? Number(slot.dataset.position) : null;
    if (slot) slot.classList.add('is-target');
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const finished = drag; drag = null;
    for (const item of $('wish-holders').children) item.classList.remove('is-target','is-dragging');
    if (event.type === 'pointerup' && finished.to !== null) save(model.move(ids,finished.from,finished.to),'Wishlist order updated.');
  }
  $('wish-holders').addEventListener('pointerup',endDrag);
  $('wish-holders').addEventListener('pointercancel',endDrag);
  $('wish-holders').addEventListener('lostpointercapture',endDrag);
  try { receipt = sessionStorage.getItem('alldogs-application-receipt') || ''; } catch (_) {}
  if (validReceipt(receipt)) load();
})();
