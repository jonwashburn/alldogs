(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let kind = 'initial', generation = 0, request;
  const text = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
  const catalog = fetch('/dog-pound/dogs.json', {signal: AbortSignal.timeout(10000)}).then(r => r.ok ? r.json() : []).catch(() => []);
  async function refresh() {
    const ticket = ++generation, currency = $('value-currency').value;
    request?.abort(); const controller = new AbortController(); request = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    $('value-list').replaceChildren(); $('value-empty').hidden = true;
    $('value-error').hidden = true; $('value-retry').hidden = true; $('value-status').textContent = 'Loading the register…';
    $('value-explanation').textContent = kind === 'initial' ? 'What adopters chose to pay for their participation in the seven days after receiving their dogs, highest first. Confirmed payments make up each dog’s recorded valuation.' : 'Each dog’s highest confirmed secondary sale. Gifts, listings and offers do not appear here.';
    try {
      const response = await fetch('https://api.alldogs.wtf/collection-api/valuations?kind=' + kind + '&currency=' + currency, {credentials: 'omit', cache: 'no-store', signal: controller.signal});
      if (!response.ok) throw Error('The value register is temporarily unavailable. Please try again.');
      const data = await response.json();
      if (!Array.isArray(data.dogs)) throw Error('The value register could not be read.');
      const paintings = await catalog;
      if (ticket !== generation) return;
      const items = Array.isArray(paintings) ? paintings : paintings.items || [];
      const fragment = document.createDocumentFragment();
      for (const dog of data.dogs) {
        const row = document.createElement('article'); row.className = 'value-row';
        row.append(text('span', '#' + dog.rank));
        const art = items.find(item => item.id === dog.dogId);
        const small = art?.original ? {src:art.original} : art?.variants?.find(item => item.width >= 600) || art?.variants?.[0];
        if (small && /^(https:\/\/|\/(?!\/))/.test(small.src)) {
          const img = document.createElement('img'); img.src = small.src; img.alt = dog.dogName + ', original painting'; img.loading = 'lazy'; img.width = 180; img.height = 180; row.append(img);
        } else row.append(text('span', 'ALL DOGS'));
        const detail = document.createElement('div'); detail.className = 'value-detail';
        detail.append(text('h2', dog.dogName), text('p', dog.dogStatus + ' · ' + new Date(dog.paidAt * 1000).toLocaleDateString()));
        if (dog.windowOpen) detail.append(text('p', 'First seven days still open'));
        row.append(detail);
        const amount = text('p', dog.amount + ' ' + dog.currency); amount.className = 'value-amount'; row.append(amount); fragment.append(row);
      }
      $('value-list').replaceChildren(fragment); $('value-empty').hidden = data.dogs.length > 0;
      $('value-empty').querySelector('h2').textContent = kind === 'initial' ? 'No first valuations recorded in ' + currency + ' yet.' : 'No resales recorded in ' + currency + ' yet.';
      $('value-status').textContent = data.dogs.length ? data.dogs.length + (data.dogs.length === 1 ? ' dog' : ' dogs') + ' · confirmed amounts in ' + currency : '';
    } catch (error) {
      if (ticket !== generation) return;
      $('value-status').textContent = ''; $('value-error').hidden = false; $('value-retry').hidden = false;
      $('value-error').textContent = error.name === 'AbortError' ? 'The register took too long to respond. Please try again.' : error.message;
    } finally { clearTimeout(timer); }
  }
  document.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click', () => {
    kind = button.dataset.kind;
    document.querySelectorAll('[data-kind]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    refresh();
  }));
  $('value-currency').addEventListener('change', refresh); $('value-retry').addEventListener('click', refresh); refresh();
})();
