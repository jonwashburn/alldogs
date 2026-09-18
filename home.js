(() => {
  'use strict';
  // Preserve shared links to the information moved off the homepage.
  if (document.body.dataset.page === 'home') {
    const moved = {'#game':'/adoption/#game', '#fates':'/adoption/#fates', '#why':'/about/#why', '#medium':'/about/#medium'};
    const followOldLink = () => { const target = moved[location.hash]; if (target) location.replace(target); };
    followOldLink();
    window.addEventListener('hashchange', followOldLink);
    // Vary the two lower paintings per visit, never the opening Barack pair.
    let storage;
    try { storage = window.sessionStorage; } catch (_) {}
    window.AllDogsRotation?.mount(document, storage);
  }
  const pairData = document.getElementById('approved-pairs');
  const pairs = pairData ? JSON.parse(pairData.textContent) : [];
  document.querySelectorAll('[data-pair]').forEach(figure => {
    const pair = pairs[Number(figure.dataset.pair)];
    const button = figure.querySelector('.zombie-reveal');
    const img = figure.querySelector('img');
    if (!pair || !button || !img) return;
    const label = button.querySelector('.reveal-label');
    let zombie = false;
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      const next = !zombie, preload = new Image();
      preload.src = next ? pair.zombie : pair.living;
      try {
        await preload.decode();
        img.src = preload.src;
        zombie = next;
        img.alt = pair.title + (zombie ? ', zombie' : ', living');
        figure.querySelector('.state-label').textContent = zombie ? 'Zombie' : 'Living';
        button.setAttribute('aria-pressed', String(zombie));
        label.textContent = zombie ? 'Back to living' : 'See the zombie';
      } catch (_) {
        label.textContent = 'Could not load preview. Try again';
      } finally {
        button.disabled = false;
      }
    });
  });
  const dialog = document.getElementById('art-dialog');
  if (!dialog) return;
  const art = document.getElementById('art-dialog-image');
  const title = document.getElementById('art-dialog-title');
  let opener = null;
  let viewing = 0;
  document.querySelectorAll('.artwork-open').forEach(button => {
    button.addEventListener('click', async () => {
      opener = button;
      const thisView = ++viewing;
      const source = button.querySelector('img');
      // Show the already-loaded painting while its larger derivative decodes.
      art.width = source.naturalWidth || source.width;
      art.height = source.naturalHeight || source.height;
      art.src = source.currentSrc || source.src;
      art.alt = source.alt;
      title.textContent = source.alt;
      dialog.showModal();
      document.documentElement.classList.add('art-is-open');
      if (button.dataset.artFull) {
        const full = new Image();
        full.src = button.dataset.artFull;
        try {
          await full.decode();
          if (dialog.open && viewing === thisView) art.src = full.src;
        } catch (_) {
          // Keep the loaded painting if the larger file is unavailable.
        }
      }
    });
  });
  dialog.querySelector('.art-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    viewing++;
    document.documentElement.classList.remove('art-is-open');
    art.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
})();
