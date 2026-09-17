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
  // Barack's opening painting is static. Only the later painting rotates per visit.
  const heroNames = new Set([
    'Tideheart', 'Afterburn', 'Snoop Dogg', 'Popeye', 'Hulk', 'Dracula', 'Leeloo',
    'Rene', 'Gustav', 'Elliott', 'Leia', 'Marty', 'Frida', 'Batman', 'Donald',
    'Marie', 'Elizabeth', 'Napoleon', 'Amy', 'Ozzy'
  ]);
  const slots = [...document.querySelectorAll('.band-dog')];
  async function reveal(img, src, title) {
    const preload = new Image();
    preload.src = src;
    await preload.decode();
    img.src = preload.src;
    img.alt = title + ', a loved living dog';
    if (img.classList.contains('band-dog')) {
      img.nextElementSibling.textContent = title + ' · from the loved collection';
      try { sessionStorage.setItem('alldogs-home-last-band', title); } catch (_) {}
    }
  }
  fetch('/dog-pound/dogs.json?v=20260916', {signal: AbortSignal.timeout(12000)}).then(r => { if (!r.ok) throw Error('Unavailable'); return r.json(); }).then(data => {
    const dogs = data.items.filter(d => d.state === 'living' && d.curation === 'loved');
    if (!dogs.length) throw Error('Unavailable');
    for (let i=dogs.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [dogs[i],dogs[j]]=[dogs[j],dogs[i]]; }
    const heroDogs = dogs.filter(d => heroNames.has(d.title));
    if (!heroDogs.length) throw Error('Unavailable');
    try {
      const last = sessionStorage.getItem('alldogs-home-last-band');
      if (heroDogs.length > 1 && heroDogs[0].title === last) heroDogs.push(heroDogs.shift());
    } catch (_) {}
    slots.forEach((img,index) => {
      const dog=heroDogs[index]; if (!dog) return;
      reveal(img, dog.variants[0].src, dog.title).catch(() => {});
    });
    const editorialDog = dogs.find(d => d.title !== 'Barack' && !heroDogs.slice(0, slots.length).includes(d));
    if (editorialDog) reveal(document.getElementById('whyDog'), editorialDog.variants[0].src, editorialDog.title).catch(() => {});
  }).catch(() => {}); // The approved static paintings remain if the catalog is unavailable.
})();
