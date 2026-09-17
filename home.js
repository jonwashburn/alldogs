(() => {
  'use strict';
  const pairs = JSON.parse(document.getElementById('approved-pairs').textContent);
  document.querySelectorAll('.life-preview').forEach(figure => {
    const pair = pairs[Number(figure.dataset.pair)], button = figure.querySelector('button'), img = figure.querySelector('img');
    let zombie = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const next = !zombie, preload = new Image(); preload.src = next ? pair.zombie : pair.living;
      try {
        await preload.decode();
        img.src = preload.src; zombie = next;
        img.alt = pair.title + (zombie ? ', zombie' : ', living');
        figure.querySelector('.state-label').textContent = zombie ? 'zombie' : 'living';
        button.setAttribute('aria-pressed', String(zombie)); button.textContent = zombie ? 'Back to living ↗' : 'See the zombie ↗';
      } catch (_) { button.textContent = 'Could not load. Try again'; }
      finally { button.disabled = false; }
    });
  });
  fetch('/dog-pound/dogs.json?v=20260916').then(r => { if (!r.ok) throw Error('Unavailable'); return r.json(); }).then(data => {
    const dogs = data.items.filter(d => d.state === 'living' && d.curation === 'loved');
    for (let i=dogs.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [dogs[i],dogs[j]]=[dogs[j],dogs[i]]; }
    const slots = [document.getElementById('hero-dog'), document.getElementById('whyDog'), ...document.querySelectorAll('.band-dog')].filter(Boolean);
    slots.forEach((img,index) => {
      const dog=dogs[index]; if (!dog) return;
      img.src=dog.variants[0].src; img.alt=dog.title+', living';
      if (img.id==='hero-dog') document.getElementById('hero-caption').textContent=dog.title+' · one of the loved dogs';
      if (img.classList.contains('band-dog')) img.nextElementSibling.textContent=dog.title;
    });
  }).catch(() => { document.querySelectorAll('.paint-band').forEach(el => el.hidden=true); });
})();
