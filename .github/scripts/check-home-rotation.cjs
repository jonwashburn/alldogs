// Real selection and DOM-mount code, with a seeded random source and no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {dogs, select, selectNext, mount} = require('../../home-rotation.js');
const approved = ['Tideheart', 'Afterburn', 'Snoop Dogg', 'Popeye', 'Hulk', 'Dracula', 'Leeloo', 'Rene', 'Gustav', 'Elliott', 'Leia', 'Marty', 'Frida', 'Batman', 'Donald', 'Elizabeth', 'Napoleon', 'Amy', 'Ozzy'];
assert.deepEqual(dogs.map(d => d.title).sort(), approved.slice().sort());
const catalog = JSON.parse(fs.readFileSync('dog-pound/dogs.json', 'utf8')).items;
for (const dog of dogs) {
  if (dog.title === 'Hulk') {
    assert.equal(dog.src, '/assets/hulk-scissor-cardboard-1800.png');
    assert.equal(dog.full, '/assets/hulk-scissor-cardboard-3000.png');
    assert.ok(fs.existsSync(dog.src.slice(1)) && fs.existsSync(dog.full.slice(1)));
    continue;
  }
  const source = catalog.find(d => d.title === dog.title && d.state === 'living' && d.curation === 'loved');
  assert.ok(source, dog.title);
  const wide = source.variants.find(v => v.width === 2400 && v.height === 1200);
  assert.equal(dog.src, wide.src, dog.title + ' wide painting');
  assert.equal(dog.full, source.variants.reduce((a, b) => a.width > b.width ? a : b).src, dog.title + ' full resolution');
}
let seed = 9182026;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
let previous = [];
const seen = new Set();
for (let visit = 0; visit < 300; visit++) {
  const pair = select(previous, random);
  assert.equal(pair.length, 2);
  assert.notEqual(pair[0].title, pair[1].title);
  for (const dog of pair) {
    assert.ok(!previous.includes(dog.title));
    seen.add(dog.title);
  }
  previous = pair.map(d => d.title);
}
assert.equal(seen.size, 19);
assert.ok(seen.has('Amy'));
for (const bad of [null, 'Amy', {}, approved]) assert.equal(select(bad, random).length, 2);
function fixture(withControls = false) {
  const slots = Array.from({length: 2}, () => {
    const img = {}, name = {};
    const button = {dataset: {}, setAttribute(k, v) { this[k] = v; }, querySelector(q) { assert.equal(q, 'img'); return img; }};
    const next = withControls ? {hidden: true, disabled: false, addEventListener(event, handler) { assert.equal(event, 'click'); this.click = handler; }} : null;
    return {img, name, button, next, classList: {toggle(k, value) { assert.equal(k, 'cardboard-painting'); this.cardboard = value; }}, querySelector(q) { return q === '.artwork-open' ? button : q === '[data-next-painting]' ? next : name; }};
  });
  const doc = {querySelectorAll(q) { assert.equal(q, '[data-rotating-painting]'); return slots; }};
  return {slots, doc};
}
for (const stored of ['[]', '["Amy","Afterburn"]', 'null', '{}', 'bad JSON']) {
  const {slots, doc} = fixture();
  let saved;
  mount(doc, {getItem: () => stored, setItem(k, value) { assert.equal(k, 'alldogs-home-last-pair'); saved = JSON.parse(value); }});
  assert.equal(saved.length, 2);
  assert.notEqual(saved[0], saved[1]);
  slots.forEach((slot, i) => {
    const dog = dogs.find(d => d.title === saved[i]);
    assert.equal(slot.name.textContent, dog.title);
    assert.equal(slot.button.dataset.artName, dog.title);
    assert.equal(slot.button.dataset.artFull, dog.full);
    assert.equal(slot.img.src, dog.src);
    assert.equal(slot.img.width, dog.width || 2400);
    assert.equal(slot.img.height, dog.height || 1200);
    assert.equal(slot.classList.cardboard, Boolean(dog.cardboard));
    assert.match(slot.img.alt, /living dog painting by Wubbushi/);
    assert.equal(slot.button['aria-label'], 'Take a closer look at ' + dog.title);
  });
}
for (const storage of [undefined, {getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); }}]) {
  const {slots, doc} = fixture();
  assert.doesNotThrow(() => mount(doc, storage));
  assert.ok(slots.every(s => s.img.src));
}
assert.doesNotThrow(() => mount({querySelectorAll: () => []}));
// Manual browsing visits every approved painting before it repeats an unseen one.
const visited = new Set([dogs[0].title, dogs[1].title]);
let visible = [dogs[0].title, dogs[1].title];
for (let i = 0; i < 17; i++) {
  const dog = selectNext(visible, visited, random);
  assert.ok(!visited.has(dog.title));
  visible[0] = dog.title;
  visited.add(dog.title);
}
assert.equal(visited.size, 19);
assert.ok(!visible.includes(selectNext(visible, visited, random).title));
assert.equal(selectNext(approved, visited, random), undefined);

(async () => {
  const {slots, doc} = fixture(true);
  const pending = [];
  let saved;
  mount(doc, {getItem: () => '[]', setItem(k, value) { saved = JSON.parse(value); }}, src => new Promise((resolve, reject) => pending.push({src, resolve, reject})));
  const before = slots.map(s => ({src:s.img.src, name:s.name.textContent}));
  const first = slots[0].next.click();
  assert.equal(slots[0].next.disabled, true);
  assert.equal(slots[0].img.src, before[0].src, 'Keep visible artwork while loading');
  await slots[0].next.click();
  assert.equal(pending.length, 1, 'Ignore double click');
  const second = slots[1].next.click();
  assert.equal(pending.length, 2);
  assert.notEqual(pending[0].src, pending[1].src, 'Concurrent panels cannot pick the same dog');
  pending[1].resolve();
  await second;
  assert.equal(slots[1].img.src, pending[1].src);
  assert.notEqual(slots[1].name.textContent, before[1].name);
  assert.equal(slots[1].button.dataset.artFull, dogs.find(d => d.src === pending[1].src).full);
  assert.equal(saved[1], slots[1].name.textContent);
  pending[0].reject(Error('Image unavailable'));
  await first;
  assert.equal(slots[0].img.src, before[0].src, 'Failed decode keeps current painting');
  assert.equal(slots[0].name.textContent, before[0].name);
  assert.equal(slots[0].next.disabled, false);
  assert.match(slots[0].next.textContent, /Try another/);
  const retry = slots[0].next.click();
  pending[2].resolve();
  await retry;
  assert.equal(slots[0].img.src, pending[2].src);
  assert.notEqual(saved[0], saved[1]);
  assert.equal(slots[0].next.textContent, 'Meet another dog ↻');
  console.log('Homepage rotation passed: approved 19, catalog identity, 300 visits, manual browsing, concurrent clicks, decoded swaps, failure/retry, storage failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
