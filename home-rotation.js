/* Only the living paintings Wubbushi selected for the homepage. */
(function (root) {
  'use strict';
  const base = 'https://recognitionphysics-public.t3.tigrisfiles.io/share/';
  const native = [
    ['Hulk', 'hero_r1388ones_grounds', 38],
    ['Ozzy', 'hero_r1388ones_all', 40],
    ['Amy', 'hero_r1388ones_all', 46],
    ['Napoleon', 'hero_r1388ones_all', 51],
    ['Elizabeth', 'hero_r1388ones_all', 55],
    ['Donald', 'hero_r1388ones_grounds', 63],
    ['Batman', 'hero_r1388ones_grounds', 70],
    ['Frida', 'stills/r1388ones_artists', 102],
    ['Marty', 'hero_r1388ones_all', 117],
    ['Leia', 'hero_r1388ones_all', 129],
    ['Elliott', 'hero_r1388ones_all', 131],
    ['Gustav', 'stills/r1388ones_artists', 148],
    ['Rene', 'stills/r1388ones_artists_r3', 151]
  ].map(([title, folder, seed]) => ({
    title,
    src: base + `alldogs_design_live/${folder}/hero_faithful_${seed}_2400.jpg`,
    full: base + `alldogs_design_live/${folder}/hero_faithful_${seed}_5120.jpg`
  }));
  const gestures = [
    ['Dracula', 'c4276d62633308ed37c6ddb3bd1eaceda353ce2eeba06a2ff738c532ba435c73', '2f8c449642d4b50affd059d8c25981720bdc93735892109edf9550b9449d042f'],
    ['Leeloo', 'e331c2d30fac40db32411c73cb12c4895162cf4d1166a9b2cd919bec7c4b960f', '46c283b3dbe23c939c23317afa3a00e3010acb6356b7784c9c855ebe038f5c40'],
    ['Popeye', '4ea150412a116aa9ce0b01f58d91c7501d1de3cc15179da92bece1781e316910', '443bfe2acd37027eab491791e08aa15eb67ec479d45f0ba6a70264acce67aa4f'],
    ['Snoop Dogg', 'a1619c2f8aa5dea4be77caec23bf32d31c9c3cb8f300cb8941246bc68d7e661c', '0e87566d800d03642cb87dcddbec170317284f40c27a336193faff2a1847ac71'],
    ['Afterburn', 'b55e43406f264d00fbee9048b72a48f6e145ae6074265754d53b19b38c0997c2', '67f525b3107646f601538e4f0ef125c8a9f2014a4c132f034f0fca536d2d6df7'],
    ['Tideheart', '4f092f0443195981ff9c4ad24fa9043bd342783872cd2e3f309f1c8661e37a7d', 'f29dda66ea64068bc92b30ff204bdea2677c41ebb3a3f66ad508a6709d71c7ff']
  ].map(([title, src, full]) => ({title, src: base + `alldogs_auto_loved/${src}.jpg`, full: base + `alldogs_auto_loved/${full}.jpg`}));
  const dogs = native.concat(gestures);
  function select(previous = [], random = Math.random) {
    const last = new Set(Array.isArray(previous) ? previous : []);
    let pool = dogs.filter(dog => !last.has(dog.title));
    if (pool.length < 2) pool = dogs.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 2);
  }
  function mount(doc, storage) {
    const slots = [...doc.querySelectorAll('[data-rotating-painting]')];
    if (!slots.length) return;
    let previous = [];
    try { previous = JSON.parse(storage.getItem('alldogs-home-last-pair') || '[]'); } catch (_) {}
    const selected = select(previous);
    slots.forEach((figure, index) => {
      const dog = selected[index];
      if (!dog) return;
      const button = figure.querySelector('.artwork-open');
      const img = button.querySelector('img');
      // All three identities change together, including the full-resolution view.
      button.dataset.artName = dog.title;
      button.dataset.artFull = dog.full;
      button.setAttribute('aria-label', 'Take a closer look at ' + dog.title);
      img.alt = dog.title + ', a living dog painting by Wubbushi';
      img.src = dog.src;
      figure.querySelector('.painting-name').textContent = dog.title;
    });
    try { storage.setItem('alldogs-home-last-pair', JSON.stringify(selected.map(dog => dog.title))); } catch (_) {}
  }
  const api = {dogs, select, mount};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AllDogsRotation = api;
})(typeof globalThis === 'object' ? globalThis : this);
