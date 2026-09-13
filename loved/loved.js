(() => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  let cards = [...gallery.querySelectorAll('figure')];
  const manualCards = new Map(cards.map(card => [card.id, card]));
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
  function bindCard(card) { card.querySelector('.artwork').addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();show(cards.indexOf(card));dialog.showModal();
  }); }
  cards.forEach(bindCard);
  document.querySelector('#close-viewer').addEventListener('click', () => dialog.close());
  document.querySelector('#previous').addEventListener('click', () => show(index - 1));
  document.querySelector('#next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  const allowedHosts = new Set(['alldogs.wtf', 'recognitionphysics-public.t3.tigrisfiles.io']);
  function safeAsset(value) {
    if (typeof value !== 'string') throw Error('Invalid image');
    const url = new URL(value, location.origin);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) throw Error('Invalid image host');
    return url.href;
  }
  function makeCard(item) {
    if (!/^[a-zA-Z0-9_-]{1,240}$/.test(item.id) || typeof item.title !== 'string' || !Array.isArray(item.variants) || !item.variants.length) throw Error('Invalid artwork');
    const variants = item.variants.map(v => {
      if (!Number.isInteger(v.width) || v.width !== 2 * v.height || v.width < 2000) throw Error('Wide artwork required');
      return {...v, src:safeAsset(v.src)};
    }).sort((a,b) => a.width-b.width);
    const figure = document.createElement('figure'); figure.id = item.id;
    figure.dataset.revision = item.id; figure.dataset.original = safeAsset(item.original);
    const link = document.createElement('a'); link.className = 'artwork'; link.href = variants.at(-1).src;
    link.setAttribute('aria-label', 'Enlarge ' + item.title);
    const img = document.createElement('img'); img.alt = item.title; img.width = variants[0].width; img.height = variants[0].height; img.decoding = 'async';
    img.dataset.src = variants[0].src; img.dataset.srcset = variants.map(v => v.src + ' ' + v.width + 'w').join(', ');
    link.append(img);
    const caption = document.createElement('figcaption'), title = document.createElement('span'), number = document.createElement('span');
    title.textContent = item.title; number.className = 'number'; number.textContent = 'One of one'; caption.append(title,number);
    figure.append(link,caption); bindCard(figure); return figure;
  }
  let refreshing = false;
  let retryTimer, retryDelay = 5000;
  async function refreshLoved() {
    if (refreshing || document.hidden || dialog.open) return;
    refreshing = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('https://api.alldogs.wtf/collection-api/loved', {signal:controller.signal, credentials:'omit'});
      if (!response.ok) throw Error('Artwork unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.items)) throw Error('Invalid artwork list');
      clearTimeout(retryTimer); retryTimer = null; retryDelay = 5000;
      const incoming = new Map(data.items.map(item => [item.id,item]));
      // Validate the whole incoming set before touching the current gallery.
      const additions = [...incoming.values()].filter(item => !cards.some(card => card.id === item.id)).map(makeCard);
      const removals = cards.filter(card => !manualCards.has(card.id) && !incoming.has(card.id));
      if (!additions.length && !removals.length) return;
      cards = cards.filter(card => !removals.includes(card)); removals.forEach(card => {observer?.unobserve(card);card.remove();});
      cards.push(...additions); additions.forEach(card => {gallery.append(card);if(observer)observer.observe(card);else load(card);});
      const count = cards.length;
      gallery.setAttribute('aria-label', count + ' loved dogs');
      const intro = document.querySelector('.intro p');intro.replaceChildren(document.createTextNode(count + ' favorites.'),document.createElement('br'),document.createTextNode('A different order every visit.'));
      if (window.scrollY < 10) shuffle(true);
      announce.textContent = additions.length ? additions.length + ' new loved ' + (additions.length === 1 ? 'dog.' : 'dogs.') : 'Loved paintings updated.';
    } catch (_) {
      // Retain the complete last-rendered gallery on a temporary service failure.
      if (!retryTimer) {
        retryTimer = setTimeout(() => {retryTimer=null;refreshLoved();}, retryDelay);
        retryDelay = Math.min(60000, retryDelay * 2);
      }
    } finally {clearTimeout(timeout);refreshing=false;}
  }
  refreshLoved();
  setInterval(refreshLoved, 60000);
  document.addEventListener('visibilitychange', refreshLoved);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
})();
