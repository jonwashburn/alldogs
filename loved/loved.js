(() => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  // Loved curation only: keep White Lightning and retain Small Thunder in the archive.
  const omittedIds = new Set(['candidate-loop_0016_thor_20260911-thor-1a05642934dc8e38']);
  gallery.querySelectorAll('figure').forEach(card => { if (omittedIds.has(card.id)) card.remove(); });
  let cards = [...gallery.querySelectorAll('figure')];
  const manualCards = new Map(cards.map(card => [card.id, card]));
  const shuffleButton = document.querySelector('#shuffle');
  const announce = document.querySelector('#announcement');
  let observer;
  const viewControls = document.querySelector('.view-toggle');
  const viewButtons = [...document.querySelectorAll('.view-toggle [data-view]')];
  let view = 'wide';
  try { if (localStorage.getItem('alldogs-loved-view') === 'square') view = 'square'; } catch (_) {}
  function imageSizes() { return view === 'square' ? '(max-width: 1000px) 200vw, 2000px' : '100vw'; }
  function setView(next, save = false) {
    view = next === 'square' ? 'square' : 'wide';
    gallery.dataset.view = view;
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    gallery.querySelectorAll('img').forEach(img => img.sizes = imageSizes());
    if (save) {
      try { localStorage.setItem('alldogs-loved-view', view); } catch (_) {}
      announce.textContent = view === 'square' ? 'Square view.' : 'Full width view.';
    }
  }
  setView(view);
  if (viewControls) {
    viewControls.hidden = false;
    viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view, true)));
  }
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
    img.sizes = imageSizes();
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
    caption.textContent = card.querySelector('figcaption > span').textContent + (zombieStates.get(card)?.zombie ? ' · Zombie' : '');
    position.textContent = (index + 1) + ' / ' + cards.length;
    original.href = card.dataset.original;
    image.decode().then(() => {
      if (turn === ticket) image.style.visibility = 'visible';
    }).catch(() => {
      if (turn === ticket) { image.style.visibility = 'visible'; caption.textContent += ' · Open the original below'; }
    });
  }
  const zombieStates = new WeakMap();
  let zombieItems = new Map();
  let zombieRefresh = false;
  function livingSnapshot(card) {
    const img = card.querySelector('.artwork > img');
    return {src:img.dataset.src || img.getAttribute('src'), srcset:img.dataset.srcset || img.getAttribute('srcset') || '',
      width:img.width, height:img.height, alt:img.alt, href:card.querySelector('.artwork').href, original:card.dataset.original};
  }
  function paintSnapshot(state, spec) {
    const {card} = state, img = card.querySelector('.artwork > img');
    delete img.dataset.src; delete img.dataset.srcset;
    img.sizes = imageSizes(); img.srcset = spec.srcset; img.src = spec.src;
    img.width = spec.width; img.height = spec.height; img.alt = spec.alt;
    img.classList.remove('image-error'); img.classList.add('loaded');
    card.querySelector('.artwork').href = spec.href;
    card.querySelector('.artwork').setAttribute('aria-label', 'Enlarge ' + spec.alt);
    card.dataset.original = spec.original;
  }
  function zombieButton(state) {
    const item = zombieItems.get(state.card.id);
    state.button.disabled = !item;
    state.button.textContent = state.intent ? 'Living' : 'Zombie';
    state.button.setAttribute('aria-pressed', String(state.zombie));
    state.button.setAttribute('aria-busy', String(state.pending));
    state.button.setAttribute('aria-label', (state.intent ? 'Show living ' : 'Show zombie ') + state.title);
    state.button.title = item ? '' : 'Zombie version not yet available';
    state.message.textContent = state.pending ? 'Loading painting…' : (!item ? 'Not yet available' : state.error || '');
  }
  async function chooseZombie(state, desired) {
    const token = ++state.ticket;
    state.intent = desired; state.error = ''; state.pending = false;
    if (!desired) {
      paintSnapshot(state, state.living); state.zombie = false; zombieButton(state); return;
    }
    const item = zombieItems.get(state.card.id);
    if (!item) { state.intent = state.zombie; zombieButton(state); return; }
    const variants = item.variants;
    const spec = {src:variants[0].src, srcset:variants.map(v => v.src + ' ' + v.width + 'w').join(', '),
      width:variants[0].width, height:variants[0].height, alt:state.title + ' · Zombie',
      href:variants.at(-1).src, original:item.square.src};
    state.pending = true; zombieButton(state);
    try {
      const preview = new Image(); preview.sizes = imageSizes(); preview.srcset = spec.srcset; preview.src = spec.src;
      await preview.decode();
      if (token !== state.ticket || !state.card.isConnected) return;
      paintSnapshot(state, spec); state.zombie = true; state.assetId = item.zombieId;
      announce.textContent = state.title + ', zombie version.';
    } catch (_) {
      if (token !== state.ticket) return;
      state.intent = state.zombie; state.error = 'Could not load. Try again.';
    } finally {
      if (token === state.ticket) {state.pending = false; zombieButton(state);}
    }
  }
  function registerZombieCard(card) {
    if (zombieStates.has(card)) return;
    const controls = document.createElement('div'); controls.className = 'zombie-controls';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'zombie-toggle';
    const message = document.createElement('span'); message.className = 'zombie-status'; message.setAttribute('aria-live', 'polite');
    const state = {card, button, message, title:card.querySelector('figcaption > span').textContent,
      living:livingSnapshot(card), zombie:false, intent:false, pending:false, ticket:0};
    zombieStates.set(card, state); controls.append(button, message); card.append(controls);
    button.addEventListener('click', () => chooseZombie(state, !state.intent)); zombieButton(state);
  }
  function validateZombies(data) {
    if (data.version !== 1 || !Array.isArray(data.items) || data.items.length > 5000) throw Error('Invalid zombie list');
    const result = new Map();
    for (const item of data.items) {
      for (const id of [item.parentId, item.zombieId]) if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,240}$/.test(id)) throw Error('Invalid zombie identity');
      if (result.has(item.parentId) || !/^[a-f0-9]{64}$/.test(item.parentHash) || !/^[a-f0-9]{64}$/.test(item.imageHash)) throw Error('Invalid zombie mapping');
      if (!Array.isArray(item.variants) || !item.variants.length || item.variants.length > 6) throw Error('Missing zombie painting');
      const variants = item.variants.map(v => {
        if (!Number.isInteger(v.width) || v.height * 2 !== v.width || v.width < 2000 || v.width > 16000) throw Error('Invalid zombie dimensions');
        return {src:safeAsset(v.src), width:v.width, height:v.height};
      }).sort((a,b) => a.width - b.width);
      if (item.square?.width !== 2000 || item.square?.height !== 2000) throw Error('Missing zombie square');
      result.set(item.parentId, {...item, variants, square:{src:safeAsset(item.square.src), width:2000, height:2000}});
    }
    return result;
  }
  async function refreshZombies() {
    if (zombieRefresh || document.hidden) return;
    zombieRefresh = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('zombies.json', {signal:controller.signal, credentials:'omit', cache:'no-store'});
      if (!response.ok) throw Error('Zombie paintings unavailable');
      const next = validateZombies(await response.json()); zombieItems = next;
      for (const card of cards) {
        registerZombieCard(card); const state = zombieStates.get(card), item = next.get(card.id);
        if (!item && (state.zombie || state.intent)) chooseZombie(state, false);
        else if (state.zombie && state.assetId !== item.zombieId) chooseZombie(state, true);
        zombieButton(state);
      }
    } catch (_) {
      // Keep working mappings and the visible paintings during temporary failures.
    } finally {clearTimeout(timeout); zombieRefresh = false;}
  }

  function bindCard(card) { registerZombieCard(card); card.querySelector('.artwork').addEventListener('click', event => {
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
      const incoming = new Map(data.items.filter(item => !omittedIds.has(item.id)).map(item => [item.id,item]));
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
  refreshZombies();
  setInterval(refreshLoved, 60000);
  setInterval(refreshZombies, 60000);
  document.addEventListener('visibilitychange', refreshZombies);
  document.addEventListener('visibilitychange', refreshLoved);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
})();
