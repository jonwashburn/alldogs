'use strict';
// Keep shared links and the existing application flow reachable.
const movedLinks = {'#game':'/adoption/#game','#fates':'/adoption/#fates'};
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
function openLetter(name) {
  const copy = document.getElementById('copy-' + name);
  if (!copy) return;
  document.getElementById('reading-body').replaceChildren(copy.content.cloneNode(true));
  if (!reading.open) reading.showModal();
  reading.scrollTop = 0;
  document.body.classList.add('modal-open');
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-open]');
  if (button) openLetter(button.dataset.open);
});
document.getElementById('enlarge').addEventListener('click', () => {
  document.getElementById('close-view').showModal();
  document.body.classList.add('modal-open');
});
document.querySelectorAll('#reading, #close-view').forEach(dialog => {
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('video').forEach(video => video.pause());
    document.body.classList.remove('modal-open');
  });
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
});

// Existing shared links now open their matching panel on the painted page.
const followOldLink = () => {
  if (movedLinks[location.hash]) location.replace(movedLinks[location.hash]);
  else if (['#apply', '#drop'].includes(location.hash)) {
    const dialog = document.getElementById('adoption-dialog');
    if (!dialog.open) document.querySelector('[data-open-adoption]').click();
  } else if (['#why', '#medium'].includes(location.hash)) {
    openLetter('work');
    if (location.hash === '#medium') reading.querySelector('video').scrollIntoView();
  }
};
followOldLink();
window.addEventListener('hashchange', followOldLink);
