// Real selection and DOM-mount code, with a seeded random source and no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {dogs, select, mount} = require('../../home-rotation.js');
const approved = ['Tideheart', 'Afterburn', 'Snoop Dogg', 'Popeye', 'Hulk', 'Dracula', 'Leeloo', 'Rene', 'Gustav', 'Elliott', 'Leia', 'Marty', 'Frida', 'Batman', 'Donald', 'Elizabeth', 'Napoleon', 'Amy', 'Ozzy'];
assert.deepEqual(dogs.map(d => d.title).sort(), approved.slice().sort());
const catalog = JSON.parse(fs.readFileSync('dog-pound/dogs.json', 'utf8')).items;
for (const dog of dogs) {
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
function fixture() {
  const slots = Array.from({length: 2}, () => {
    const img = {}, name = {};
    const button = {dataset: {}, setAttribute(k, v) { this[k] = v; }, querySelector(q) { assert.equal(q, 'img'); return img; }};
    return {img, name, button, querySelector(q) { return q === '.artwork-open' ? button : name; }};
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
console.log('Homepage rotation passed: 19 approved paintings, catalog URLs, 300 distinct-pair visits, full-resolution identity, malformed and blocked storage.');
