(() => {
  'use strict';
  const pairs = JSON.parse(document.getElementById('approved-pairs').textContent);
  document.querySelectorAll('[data-pair]').forEach(figure => {
    const pair = pairs[Number(figure.dataset.pair)], button = figure.querySelector('button'), img = figure.querySelector('img');
    const label = button.querySelector('.reveal-label') || button, hint = button.querySelector('.reveal-hint');
    let zombie = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const next = !zombie, preload = new Image(); preload.src = next ? pair.zombie : pair.living;
      try {
        await preload.decode();
        img.src = preload.src; zombie = next;
        img.alt = pair.title + (zombie ? ', zombie' : ', living');
        figure.querySelector('.state-label').textContent = zombie ? 'zombie' : 'living';
        button.setAttribute('aria-pressed', String(zombie));
        label.textContent = (zombie ? 'Back to living' : 'See the zombie') + (label === button ? ' ↗' : '');
        if (hint) hint.textContent = zombie ? 'Press to return' : 'Press to preview';
      } catch (_) { label.textContent = 'Could not load. Try again'; }
      finally { button.disabled = false; }
    });
  });
  const rules = document.getElementById('game');
  const openLinkedRules = () => { if (location.hash === '#game') rules.open = true; };
  window.addEventListener('hashchange', openLinkedRules);
  document.querySelectorAll('a[href="#game"]').forEach(link => link.addEventListener('click', () => { rules.open = true; }));
  openLinkedRules();

  // The two lead paintings are fixed in the HTML and never depend on this feed.
  const slots = [document.getElementById('whyDog'), ...document.querySelectorAll('.band-dog')].filter(Boolean);
  async function reveal(img, src, title) {
    const preload = new Image();
    preload.src = src;
    await preload.decode();
    img.src = preload.src;
    img.alt = title + ', a loved living dog';
    if (img.classList.contains('band-dog')) img.nextElementSibling.textContent = title;
  }
  fetch('/dog-pound/dogs.json?v=20260916', {signal: AbortSignal.timeout(12000)}).then(r => { if (!r.ok) throw Error('Unavailable'); return r.json(); }).then(data => {
    const dogs = data.items.filter(d => d.state === 'living' && d.curation === 'loved' && d.title !== 'Undertow' && d.title !== 'Barack');
    if (!dogs.length) throw Error('Unavailable');
    for (let i=dogs.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [dogs[i],dogs[j]]=[dogs[j],dogs[i]]; }
    slots.forEach((img,index) => {
      const dog=dogs[index]; if (!dog) return;
      reveal(img, dog.variants[0].src, dog.title).catch(() => {
        if (img.classList.contains('band-dog')) img.closest('.paint-band').hidden = true;
      });
    });
  }).catch(() => { document.querySelectorAll('.band-dog').forEach(img => { img.closest('.paint-band').hidden = true; }); });
})();
