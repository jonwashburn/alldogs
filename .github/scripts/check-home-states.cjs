// Exercise the shipped hero controller, not a second implementation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('welcome/index.html', 'utf8');
const data = html.match(/<script type="application\/json" id="approved-pairs">(.*?)<\/script>/)[1];
const pair = JSON.parse(data)[0];
assert.equal(pair.title, 'Barack');
assert.ok(pair.living && pair.zombie && pair.angel && pair.angelFull && pair.livingFull);
for (const key of ['living', 'livingFull', 'zombie', 'zombieFull', 'angel', 'angelFull']) {
  if (!pair[key]) continue;
  if (pair[key].startsWith('/')) {
    assert.ok(fs.existsSync('.' + pair[key]), 'Missing local painting: ' + key);
  } else {
    const source = new URL(pair[key]);
    assert.equal(source.protocol, 'https:');
    assert.equal(source.hostname, 'recognitionphysics-public.t3.tigrisfiles.io');
    assert.match(source.pathname, /^\/share\/alldogs_(design_live|zombies)\/.+\.(jpg|png)$/);
  }
}
// The restored living work must use the existing curated original, not a study.
const original = JSON.parse(fs.readFileSync('dog-pound/dogs.json', 'utf8')).items.find(d => d.title === 'Barack');
for (const key of ['living', 'livingFull']) assert.ok(original.variants.some(v => v.src === pair[key]), key);
assert.deepEqual([...html.matchAll(/data-art-state="([^"]+)"/g)].map(m => m[1]), ['living', 'zombie', 'angel']);
const controls = ['living', 'zombie', 'angel'].map(state => ({
  dataset: {artState: state}, textContent: state[0].toUpperCase() + state.slice(1),
  'aria-pressed': String(state === 'living'),
  setAttribute(k, v) { this[k] = v; },
  addEventListener(type, callback) { assert.equal(type, 'click'); this.click = callback; }
}));
const img = {src: pair.living, alt: 'Barack, living'};
const label = {textContent: 'Living'}, note = {textContent: ''};
const opener = {dataset: {artFull: pair.livingFull}, setAttribute(k, v) { this[k] = v; }};
const figure = {
  dataset: {pair: '0'},
  setAttribute(k, v) { this[k] = v; },
  querySelectorAll(q) { assert.equal(q, '[data-art-state]'); return controls; },
  querySelector(q) { return {'img': img, '.artwork-open': opener, '.preview-status': note, '.state-label': label}[q]; }
};
const pending = [];
vm.runInNewContext(fs.readFileSync('home.js', 'utf8'), {
  document: {
    body: {dataset: {}},
    getElementById(id) { return id === 'approved-pairs' ? {textContent: data} : null; },
    querySelectorAll(q) { assert.equal(q, '[data-pair]'); return [figure]; }
  },
  Image: class { decode() { return new Promise((resolve, reject) => pending.push({src:this.src, resolve, reject})); } }
});
function expectState(state) {
  assert.equal(img.src, pair[state]);
  assert.equal(img.alt, 'Barack, ' + state);
  assert.equal(label.textContent.toLowerCase(), state);
  assert.equal(opener.dataset.artFull, pair[state + 'Full'] || pair[state]);
  controls.forEach(control => assert.equal(control['aria-pressed'], String(control.dataset.artState === state)));
  assert.equal(figure['aria-busy'], 'false');
}
(async () => {
  for (const state of ['zombie', 'angel', 'living']) {
    const before = img.src;
    const action = controls.find(c => c.dataset.artState === state).click();
    assert.equal(img.src, before, 'Keep current painting until decoded');
    assert.equal(figure['aria-busy'], 'true');
    pending.at(-1).resolve();
    await action;
    expectState(state);
    assert.equal(note.textContent, '');
  }
  const failed = controls[2].click();
  pending.at(-1).reject(Error('Image offline'));
  await failed;
  expectState('living');
  assert.match(note.textContent, /Could not load angel/);
  const oldRequest = controls[1].click(), oldImage = pending.at(-1);
  const latest = controls[2].click(), latestImage = pending.at(-1);
  latestImage.resolve(); await latest;
  oldImage.resolve(); await oldRequest;
  expectState('angel');
  const obsolete = controls[1].click(), obsoleteImage = pending.at(-1);
  await controls[2].click();
  obsoleteImage.reject(Error('Late error')); await obsolete;
  expectState('angel');
  assert.equal(note.textContent, '', 'No stale failure after selecting current painting');
  console.log('Hero states passed: all three images, decoded swaps, full-resolution sources, active links, failure/retry, rapid switching and cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
