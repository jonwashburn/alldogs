(() => {
  'use strict';
  // Preserve shared links to the information moved off the homepage.
  if (document.body.dataset.page === 'home') {
    const moved = {'#game':'/adoption/#game', '#fates':'/adoption/#fates', '#why':'/about/#why', '#medium':'/about/#medium'};
    const followOldLink = () => { const target = moved[location.hash]; if (target) location.replace(target); };
    followOldLink();
    window.addEventListener('hashchange', followOldLink);
    // Barack stays first; the other two paintings use the saved homepage selection.
    let storage;
    try { storage = window.sessionStorage; } catch (_) {}
    window.AllDogsRotation?.mount(document, storage);
  }
  const pairData = document.getElementById('approved-pairs');
  const pairs = pairData ? JSON.parse(pairData.textContent) : [];
  document.querySelectorAll('[data-pair]').forEach(figure => {
    const pair = pairs[Number(figure.dataset.pair)];
    const buttons = [...figure.querySelectorAll('[data-art-state]')];
    const img = figure.querySelector('img');
    const opener = figure.querySelector('.artwork-open');
    const note = figure.querySelector('.preview-status');
    if (!pair || !buttons.length || !img || !opener) return;
    let current = 'living', request = 0;
    buttons.forEach(button => button.addEventListener('click', async () => {
      const next = button.dataset.artState;
      if (!pair[next]) return;
      const thisRequest = ++request;
      if (next === current) {
        figure.setAttribute('aria-busy', 'false');
        note.textContent = '';
        return;
      }
      const preload = new Image();
      figure.setAttribute('aria-busy', 'true');
      note.textContent = 'Loading ' + next + '…';
      preload.src = pair[next];
      try {
        await preload.decode();
        if (thisRequest !== request) return;
        img.src = preload.src;
        current = next;
        img.alt = pair.title + ', ' + next;
        figure.querySelector('.state-label').textContent = button.textContent;
        opener.dataset.artFull = pair[next + 'Full'] || pair[next];
        opener.setAttribute('aria-label', 'Take a closer look at ' + pair.title + ', ' + next);
        buttons.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
        note.textContent = '';
      } catch (_) {
        if (thisRequest === request) note.textContent = 'Could not load ' + next + '. Try again.';
      } finally {
        if (thisRequest === request) figure.setAttribute('aria-busy', 'false');
      }
    }));
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
