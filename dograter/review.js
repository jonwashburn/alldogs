'use strict';
// A separate key per prop prevents edits to different props in two tabs from
// replacing one another. Writes re-read the record and patch only changed fields.
const COLLECTION = 'alldogs-obama-props-duel-20260909';
const PREFIX = COLLECTION + ':v1:';
const PROPS = ['fire','angel_wings','jetpack','halo','crown','airplane','police_car','pickup_truck','motorcycle','tank','boat','pocket_knife','toy_gun','bomb','guitar','boombox','bird','cat','flowers','house'];
const CHOICES = ['astra','fable','both','neither'];
const $ = id => document.getElementById(id);
const label = slug => slug.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
const imagePath = path => window.PROP_IMAGE_REVISION ? `${path}?v=${encodeURIComponent(window.PROP_IMAGE_REVISION)}` : path;
const candidatePath = (model, slug) => imagePath(`out/${model}/${slug}.jpg`);
// Fail closed if availability.js is missing or a model is not explicitly true.
const available = model => window.PROP_AVAILABILITY?.[model] === true;
const empty = () => ({preference:'', note:'', updatedAt:0, choiceRevision:''});
const records = Object.fromEntries(PROPS.map(slug => [slug, empty()]));
const corrupt = new Set();
const unsaved = new Set();
let index = 0, swapped = false, ready = false, loadId = 0, lastChoice = null, clearTarget = null;
let storageOK = true, statusTimer, advanceTimer;

function stopAdvance() {
  if (!advanceTimer) return false;
  clearTimeout(advanceTimer); advanceTimer = null;
  return true;
}

function validRecord(value) {
  return value && typeof value === 'object' && ['', ...CHOICES].includes(value.preference) &&
    typeof value.note === 'string' && value.note.length <= 6000 &&
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && value.updatedAt >= 0;
}
function read(slug) {
  if (unsaved.has(slug)) return records[slug];
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    if (raw === null) { corrupt.delete(slug); return empty(); }
    const value = JSON.parse(raw);
    if (!validRecord(value)) throw new SyntaxError('Invalid record');
    corrupt.delete(slug);
    return {preference:value.preference, note:value.note, updatedAt:value.updatedAt,
      choiceRevision:typeof value.choiceRevision === 'string' ? value.choiceRevision : ''};
  } catch (error) {
    if (error instanceof SyntaxError) corrupt.add(slug);
    else storageOK = false;
    return records[slug];
  }
}
function refreshRecords() { for (const slug of PROPS) records[slug] = read(slug); }
function saveStatus(message) {
  clearTimeout(statusTimer);
  const warning = corrupt.size ? 'A stored record could not be read. Export your current work before clearing the affected prop.' :
    (!storageOK || unsaved.size) ? 'Some feedback is only in this open tab. Export before closing.' : '';
  $('save-status').textContent = warning ? [message,warning].filter(Boolean).join(' ') :
    (message || 'Saved in this browser only. Export feedback to keep a copy.');
}
function patch(slug, changes, replaceUnreadable = false, updatedAt = Date.now()) {
  const value = {...(replaceUnreadable ? empty() : read(slug)), ...changes, updatedAt};
  records[slug] = value;
  if (corrupt.has(slug)) {
    unsaved.add(slug);
    saveStatus('This prop’s new work is held in this open tab.');
  } else {
    try { localStorage.setItem(PREFIX + slug, JSON.stringify(value)); storageOK = true; unsaved.delete(slug); }
    catch { storageOK = false; unsaved.add(slug); }
    saveStatus();
  }
  renderProgress();
}
function renderProgress() {
  const counts = Object.fromEntries(CHOICES.map(c => [c, 0]));
  for (const slug of PROPS) if (records[slug].preference) counts[records[slug].preference]++;
  const reviewed = Object.values(counts).reduce((a,b) => a+b,0);
  $('progress').textContent = `${reviewed} / ${PROPS.length} reviewed`;
  $('summary').textContent = `Astra ${counts.astra} · Fable ${counts.fable} · Both ${counts.both} · Neither ${counts.neither}`;
  for (const button of $('prop-list').children) {
    const slug = button.dataset.slug, r = records[slug];
    button.dataset.reviewed = String(Boolean(r.preference));
    button.setAttribute('aria-current', String(PROPS[index] === slug));
    button.setAttribute('aria-label', `${label(slug)}: ${r.preference ? label(r.preference) : 'unreviewed'}${r.note ? ', has notes' : ''}`);
    button.title = `${r.preference ? label(r.preference) : 'Unreviewed'}${r.note ? ' · Has notes' : ''}`;
  }
}
function renderPreference() {
  const preference = records[PROPS[index]].preference;
  document.querySelectorAll('[data-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.choice === preference));
    button.disabled = !ready;
  });
  for (const side of ['left','right']) {
    const button = $(side + '-choice');
    button.disabled = !ready;
    button.setAttribute('aria-pressed', String(preference === button.dataset.model));
  }
  $('choice-status').textContent = preference ? `Your choice: ${label(preference)}.` : 'No preference recorded for this prop yet.';
  if (!available('astra') || !available('fable')) {
    $('choice-status').textContent = (preference ? `Saved choice: ${label(preference)}. ` : '') + 'Comparison choices open when both drawings are available. Your notes still save.';
  } else if (PROPS.every(slug => records[slug].preference)) {
    $('choice-status').textContent += ' All 20 props reviewed. Export feedback to keep or share your choices.';
  }
  $('undo').disabled = !lastChoice;
}
function show(nextIndex) {
  stopAdvance();
  index = (nextIndex + PROPS.length) % PROPS.length;
  const slug = PROPS[index];
  records[slug] = read(slug);
  $('position').textContent = `PROP ${String(index + 1).padStart(2,'0')} / ${PROPS.length}`;
  $('prop-title').textContent = label(slug);
  $('note').value = records[slug].note;
  $('note-count').textContent = `${records[slug].note.length} / 6000`;
  renderProgress();
  loadImages();
}
function loadImages() {
  const slug = PROPS[index], currentLoad = ++loadId;
  const models = swapped ? ['fable','astra'] : ['astra','fable'];
  const expected = models.filter(available).length;
  let loaded = 0;
  ready = false;
  $('pair').setAttribute('aria-busy', String(expected > 0));
  $('retry').hidden = true;
  for (const [i, side] of ['left','right'].entries()) {
    const model = models[i], fullSrc = candidatePath(model, slug), img = $(side + '-image');
    const closeUp = $('close-up').checked;
    const src = closeUp ? imagePath(`out/details/${model}/${slug}.jpg`) : fullSrc;
    $(side + '-name').textContent = label(model);
    $(side + '-action').textContent = 'Choose ' + label(model);
    $(side + '-choice').dataset.model = model;
    $(side + '-choice').setAttribute('aria-label', `Choose ${label(model)} for ${label(slug)}`);
    const panel = $(side + '-unavailable');
    $(side + '-choice').hidden = !available(model);
    $(side + '-full').hidden = !available(model);
    panel.hidden = available(model);
    img.onload = img.onerror = null;
    if (!available(model)) {
      img.removeAttribute('src');
      $(side + '-full').removeAttribute('href');
      panel.textContent = `${label(model)} drawings are waiting for model access`;
      $(side + '-status').textContent = '';
      continue;
    }
    $(side + '-full').href = fullSrc;
    $(side + '-status').textContent = 'Loading image…';
    img.alt = `${label(model)}: ${closeUp ? 'prop close-up of' : 'Obama dog with'} ${label(slug).toLowerCase()}`;
    img.onload = () => {
      if (currentLoad !== loadId) return;
      $(side + '-status').textContent = '';
      if (++loaded === expected) { ready = expected === 2; $('pair').setAttribute('aria-busy','false'); renderPreference(); }
    };
    img.onerror = () => {
      if (currentLoad !== loadId) return;
      $(side + '-status').textContent = 'Image unavailable. Retry when the drawings are ready.';
      $('retry').hidden = false;
      $('pair').setAttribute('aria-busy','false');
    };
    img.src = src;
  }
  renderPreference();
}
function choose(preference) {
  if (!ready || !CHOICES.includes(preference)) return;
  stopAdvance();
  const slug = PROPS[index], previous = read(slug).preference;
  const choiceRevision = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  lastChoice = {slug, previous, choiceRevision};
  patch(slug, {preference, choiceRevision});
  renderPreference();
  if ($('auto-next').checked) {
    // Lock immediately so a double click cannot answer the next prop.
    ready = false;
    document.querySelectorAll('[data-choice],.image-choice').forEach(b => b.disabled = true);
    advanceTimer = setTimeout(() => { advanceTimer = null; nextUnreviewed(); }, 500);
  }
}
function nextUnreviewed() {
  stopAdvance();
  refreshRecords();
  for (let step = 1; step <= PROPS.length; step++) {
    const next = (index + step) % PROPS.length;
    if (!records[PROPS[next]].preference) { show(next); return; }
  }
  loadImages(); renderProgress();
}
function undo() {
  if (!lastChoice) return;
  stopAdvance();
  const {slug, previous, choiceRevision} = lastChoice;
  if (read(slug).choiceRevision !== choiceRevision) {
    lastChoice = null; loadImages();
    $('choice-status').textContent = 'That choice changed in another tab. It has been preserved.'; return;
  }
  patch(slug, {preference:previous, choiceRevision:`undo-${Date.now()}`});
  lastChoice = null;
  show(PROPS.indexOf(slug));
}
function feedback() {
  refreshRecords();
  return {version:1, collection:COLLECTION, exportedAt:new Date().toISOString(),
    status:'Review candidates. Preferences do not accept or publish collection artwork.',
    props:PROPS.map(slug => ({slug, label:label(slug), astra:candidatePath('astra',slug), fable:candidatePath('fable',slug), ...records[slug]}))};
}
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(feedback(),null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href = url;
  a.download = `obama-props-feedback-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  saveStatus('Export requested. Keep the downloaded JSON file as your feedback backup.');
  statusTimer = setTimeout(() => saveStatus(), 5000);
}
function askClear(target) {
  if (stopAdvance()) loadImages();
  clearTarget = target;
  $('clear-title').textContent = target === 'all' ? 'Clear all 20 props?' : `Clear ${label(target)}?`;
  $('clear-description').textContent = 'This removes the selected preferences and notes from this browser. Export first if you want to keep them. Other ALL DOGS feedback is unaffected.';
  $('clear-confirm').value = ''; $('clear-confirm-button').disabled = true;
  $('clear-dialog').returnValue = 'cancel';
  $('clear-dialog').showModal();
}

for (const side of ['left','right']) {
  const panel = document.createElement('div');
  panel.id = side + '-unavailable'; panel.className = 'unavailable-panel'; panel.hidden = true;
  panel.setAttribute('role','status'); $(side + '-choice').before(panel);
}
for (const slug of PROPS) {
  const button = document.createElement('button'); button.textContent = label(slug); button.dataset.slug = slug;
  button.onclick = () => show(PROPS.indexOf(slug)); $('prop-list').append(button);
}
$('previous').onclick = () => show(index - 1);
$('next').onclick = $('skip').onclick = () => show(index + 1);
$('next-unreviewed').onclick = nextUnreviewed;
$('swap').onclick = () => { swapped = !swapped; stopAdvance(); loadImages(); };
$('close-up').onchange = () => { stopAdvance(); loadImages(); };
$('auto-next').onchange = () => { if (!$('auto-next').checked && stopAdvance()) loadImages(); };
$('retry').onclick = loadImages;
document.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => choose(button.dataset.choice));
for (const side of ['left','right']) $(side + '-choice').onclick = () => choose($(side + '-choice').dataset.model);
$('note').oninput = event => {
  if (stopAdvance()) loadImages();
  patch(PROPS[index], {note:event.target.value});
  $('note-count').textContent = `${event.target.value.length} / 6000`;
};
$('note').onblur = () => {
  const slug = PROPS[index]; records[slug] = read(slug);
  $('note').value = records[slug].note;
  $('note-count').textContent = `${records[slug].note.length} / 6000`;
};
$('undo').onclick = undo;
$('export').onclick = download;
$('copy').onclick = async () => {
  const text = ['ALL DOGS / OBAMA PROPS / ASTRA + FABLE', ...feedback().props.map(r => `${r.label}: ${r.preference ? label(r.preference) : 'Unreviewed'}${r.note ? '\n  '+r.note : ''}`)].join('\n\n');
  try { await navigator.clipboard.writeText(text); $('tools-status').textContent = 'Feedback copied. Paste it into your next message.'; }
  catch { $('tools-status').textContent = 'Clipboard unavailable. Use Export feedback to download your notes.'; }
};
$('import').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 1000000) throw Error('That file is too large for this feedback format.');
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || data.collection !== COLLECTION || !Array.isArray(data.props) || data.props.length !== PROPS.length ||
      new Set(data.props.map(r => r.slug)).size !== PROPS.length || data.props.some(r => !PROPS.includes(r.slug) || !validRecord(r))) {
      throw Error('Use an exported Obama props feedback JSON file.');
    }
    let restored = 0;
    for (const r of data.props) {
      const existing = read(r.slug);
      if (r.updatedAt > existing.updatedAt) {
        patch(r.slug, {preference:r.preference, note:r.note, choiceRevision:`import-${Date.now()}`}, false, r.updatedAt); restored++;
      }
    }
    lastChoice = null; show(index);
    $('tools-status').textContent = `${restored} newer prop records restored. Your more recent feedback was kept.`;
  } catch (error) { $('tools-status').textContent = 'Nothing imported: ' + error.message; }
  finally { event.target.value = ''; }
};
$('clear-one').onclick = () => askClear(PROPS[index]);
$('clear-all').onclick = () => askClear('all');
$('clear-confirm').oninput = () => $('clear-confirm-button').disabled = $('clear-confirm').value !== 'CLEAR';
$('clear-dialog').addEventListener('cancel', () => { $('clear-dialog').returnValue = 'cancel'; });
$('clear-dialog').addEventListener('close', () => {
  if ($('clear-dialog').returnValue !== 'confirm' || $('clear-confirm').value !== 'CLEAR') return;
  const targets = clearTarget === 'all' ? PROPS : [clearTarget];
  for (const slug of targets) {
    records[slug] = empty(); corrupt.delete(slug); unsaved.delete(slug);
    // A timestamped blank record prevents old imports from resurrecting a clear.
    patch(slug, {...empty(), choiceRevision:`clear-${Date.now()}`}, true);
  }
  lastChoice = null; show(index); saveStatus();
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || $('clear-dialog').open ||
    event.target.closest('input,textarea,select,[contenteditable]')) return;
  if (CHOICES[Number(event.key)-1]) { event.preventDefault(); choose(CHOICES[Number(event.key)-1]); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); show(index-1); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); show(index+1); }
  else if (event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
});
window.addEventListener('storage', event => {
  if (event.key !== null && !event.key.startsWith(PREFIX)) return;
  refreshRecords(); renderProgress(); renderPreference();
  // Keep an in-progress note intact; the next input patches only the note.
  if (document.activeElement !== $('note')) {
    $('note').value = records[PROPS[index]].note;
    $('note-count').textContent = `${$('note').value.length} / 6000`;
  }
  saveStatus('Feedback changed in another tab. The latest saved choices are shown.');
});
refreshRecords(); show(0); saveStatus();
