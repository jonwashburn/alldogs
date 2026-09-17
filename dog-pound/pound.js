(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let dogs = [], view = 'square', currentDog = null;
  const dialog = $('dog-dialog');
  function asset(value) {
    const u = new URL(value, location.origin);
    if (u.protocol !== 'https:' || !['alldogs.wtf', 'www.alldogs.wtf', 'recognitionphysics-public.t3.tigrisfiles.io'].includes(u.hostname)) throw Error('Invalid artwork URL');
    return u.href;
  }
  function showDog(dog) {
    currentDog = dog;
    $('dialog-title').textContent = dog.title;
    $('reference-name').textContent = 'Originally painted as ' + dog.title + '. You can keep the name, or make it your own.';
    $('dialog-image').src = asset(dog.original);
    $('dialog-image').alt = dog.title + ', living dog painting';
    $('full-painting').href = asset(dog.variants.at(-1).src);
    $('dog-name').value = '';
    $('name-preview').textContent = 'A name only you would choose.';
    dialog.showModal();
  }
  function render() {
    const term = $('search').value.trim().toLowerCase();
    const found = dogs.filter(dog => dog.title.toLowerCase().includes(term));
    const fragment = document.createDocumentFragment();
    for (const dog of found) {
      const card = document.createElement('article'); card.className = 'dog';
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', 'Meet ' + dog.title);
      const frame = document.createElement('span'); frame.className = 'image-wrap';
      const img = document.createElement('img'); img.src = asset(dog.variants[0].src); img.width = 2400; img.height = 1200; img.alt = dog.title + ', living'; img.loading = 'lazy'; img.decoding = 'async';
      const caption = document.createElement('span'); caption.className = 'caption';
      const name = document.createElement('span'); name.textContent = dog.title;
      const hello = document.createElement('span'); hello.className = 'hello'; hello.textContent = 'Say hello ↗';
      frame.append(img); caption.append(name, hello); button.append(frame, caption); card.append(button); fragment.append(card);
      button.addEventListener('click', () => showDog(dog));
    }
    $('gallery').replaceChildren(fragment);
    $('gallery').dataset.view = view;
    $('dog-count').textContent = found.length + (term ? ' of ' + dogs.length : '') + ' loved dogs';
    $('empty').hidden = found.length !== 0;
  }
  async function load() {
    try {
      const response = await fetch('dogs.json?v=20260916');
      if (!response.ok) throw Error('Unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.items) || !data.items.length) throw Error('Unavailable');
      dogs = data.items.filter(d => d.state === 'living' && d.curation === 'loved');
      dogs.forEach(d => { asset(d.original); d.variants.forEach(v => asset(v.src)); });
      render();
      const feature = dogs.find(d => d.id.startsWith('original-62-')) || dogs[0];
      $('spotlight-image').src = asset(feature.variants[0].src);
      $('spotlight-image').alt = feature.title + ', a loved living dog';
      $('spotlight-title').textContent = feature.title + ' · a reference name, until you choose your own';
      $('spotlight-meet').hidden = false;
      $('spotlight-meet').addEventListener('click', () => showDog(feature));
    } catch (_) {
      $('dog-count').textContent = 'The paintings could not load. Please refresh to try again.';
    }
  }
  $('search').addEventListener('input', render);
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.tagName !== 'BUTTON') return;
    button.addEventListener('click', () => {
      view = button.dataset.view;
      $('gallery').dataset.view = view;
      document.querySelectorAll('.view-toggle button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    });
  });
  $('dog-name').addEventListener('input', () => {
    const name = $('dog-name').value.trim();
    $('name-preview').textContent = name ? 'Hello, ' + name + '.' : 'A name only you would choose.';
  });
  $('close-dialog').addEventListener('click', () => dialog.close());
  $('dialog-apply').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  });
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
