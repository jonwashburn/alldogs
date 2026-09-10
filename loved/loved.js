(() => {
  const dialog = document.querySelector('#viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const cards = [...document.querySelectorAll('.gallery figure')];
  const image = document.querySelector('#viewer-image');
  const caption = document.querySelector('#viewer-caption');
  const position = document.querySelector('#viewer-position');
  let index = 0;
  function show(next) {
    index = (next + cards.length) % cards.length;
    const card = cards[index];
    const original = card.querySelector('img');
    image.src = original.src;
    image.alt = original.alt;
    caption.textContent = [...card.querySelectorAll('figcaption span')].map(part => part.textContent).join(' · ');
    position.textContent = (index + 1) + ' / ' + cards.length;
  }
  cards.forEach((card, i) => {
    card.querySelector('a').addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      show(i);
      dialog.showModal();
    });
  });
  document.querySelector('#close-viewer').addEventListener('click', () => dialog.close());
  document.querySelector('#previous').addEventListener('click', () => show(index - 1));
  document.querySelector('#next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
})();
