(() => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  let cards = [...gallery.querySelectorAll('figure')];
  const shuffleButton = document.querySelector('#shuffle');
  const announce = document.querySelector('#announcement');
  let observer;
  function load(card, eager = false) {
    const img = card.querySelector('img[data-src]');
    if (!img) return;
    img.addEventListener('load', () => img.classList.add('loaded'), {once:true});
    img.addEventListener('error', () => {
      img.classList.add('image-error');
      // The anchor still opens the full painting if a responsive source fails.
    }, {once:true});
    img.loading = eager ? 'eager' : 'lazy';
    img.fetchPriority = eager ? 'high' : 'auto';
    img.sizes = '(max-width: 600px) 200vw, 100vw';
    img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    delete img.dataset.src; delete img.dataset.srcset;
  }
  function shuffle(initial = false) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    gallery.replaceChildren(...cards);
    cards.forEach((card, index) => card.dataset.position = index + 1);
    observer?.disconnect();
    load(cards[0], true);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          load(entry.target); observer.unobserve(entry.target);
        }
      }, {rootMargin:'700px 0px'});
      cards.slice(1).forEach(card => observer.observe(card));
    } else cards.slice(1).forEach(card => load(card));
    if (!initial) {
      history.replaceState(null, '', location.pathname + location.search);
      announce.textContent = 'A new order for all ' + cards.length + ' dogs.';
    }
  }
  shuffle(true);
  shuffleButton.hidden = false;
  shuffleButton.addEventListener('click', () => shuffle());
  const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (anchor && cards.includes(anchor)) requestAnimationFrame(() => anchor.scrollIntoView());

  const dialog = document.querySelector('#viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = document.querySelector('#viewer-image');
  const caption = document.querySelector('#viewer-caption');
  const position = document.querySelector('#viewer-position');
  const original = document.querySelector('#viewer-original');
  let index = 0;
  let ticket = 0;
  function show(next) {
    index = (next + cards.length) % cards.length;
    const card = cards[index];
    const turn = ++ticket;
    image.style.visibility = 'hidden';
    image.src = card.querySelector('.artwork').href;
    image.alt = card.querySelector('img').alt;
    caption.textContent = card.querySelector('figcaption > span').textContent;
    position.textContent = (index + 1) + ' / ' + cards.length;
    original.href = card.dataset.original;
    image.decode().then(() => {
      if (turn === ticket) image.style.visibility = 'visible';
    }).catch(() => {
      if (turn === ticket) { image.style.visibility = 'visible'; caption.textContent += ' · Open the original below'; }
    });
  }
  cards.forEach(card => card.querySelector('.artwork').addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();show(cards.indexOf(card));dialog.showModal();
  }));
  document.querySelector('#close-viewer').addEventListener('click', () => dialog.close());
  document.querySelector('#previous').addEventListener('click', () => show(index - 1));
  document.querySelector('#next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
})();
