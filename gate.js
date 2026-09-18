'use strict';
// Keep shared links and the existing application flow reachable.
const movedLinks = {'#apply':'/welcome/#apply','#drop':'/welcome/#drop','#game':'/adoption/#game','#fates':'/adoption/#fates','#why':'/about/#why','#medium':'/about/#medium'};
const followOldLink = () => { if (movedLinks[location.hash]) location.replace(movedLinks[location.hash]); };
followOldLink();
window.addEventListener('hashchange', followOldLink);
const arrival = document.querySelector('.arrival');
const viewing = document.getElementById('viewing');
const enter = document.getElementById('enter');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let openingTimer;
function showDog() {
  arrival.hidden = true;
  viewing.hidden = false;
  document.getElementById('viewing-title').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
enter.addEventListener('click', () => {
  enter.disabled = true;
  arrival.classList.add('opening');
  openingTimer = window.setTimeout(showDog, reducedMotion.matches ? 0 : 1100);
});
document.getElementById('return').addEventListener('click', () => {
  window.clearTimeout(openingTimer);
  viewing.hidden = true;
  arrival.hidden = false;
  arrival.classList.remove('opening');
  enter.disabled = false;
  enter.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
});
const reading = document.getElementById('reading');
document.querySelectorAll('[data-open]').forEach(button => {
  button.addEventListener('click', () => {
    const copy = document.getElementById('copy-' + button.dataset.open);
    document.getElementById('reading-body').replaceChildren(copy.content.cloneNode(true));
    reading.showModal();
    reading.scrollTop = 0;
    document.body.classList.add('modal-open');
  });
});
document.getElementById('enlarge').addEventListener('click', () => {
  document.getElementById('close-view').showModal();
  document.body.classList.add('modal-open');
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
});
