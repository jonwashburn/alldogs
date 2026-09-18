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
function returnToGate() {
  window.clearTimeout(openingTimer);
  viewing.hidden = true;
  arrival.hidden = false;
  arrival.classList.remove('opening');
  enter.disabled = false;
  enter.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
document.getElementById('close-viewing').addEventListener('click', returnToGate);

// These are the existing public wide paintings, in the artist's selection.
// Leave a painting on the wall until the next one has finished loading.
const dogImage = document.getElementById('dog-image');
const dogName = document.getElementById('dog-name');
const dogPainting = document.getElementById('dog-painting');
const galleryStatus = document.getElementById('gallery-status');
const dogPosition = document.getElementById('dog-position');
const enlarge = document.getElementById('enlarge');
const closeView = document.getElementById('close-view');
const dogs = [{title: 'Barack', src: dogImage.src, alt: dogImage.alt},
  ...(window.AllDogsRotation?.dogs || []).filter(dog => !dog.cardboard)];
let currentDog = 0, requestedDog = 0, imageRequest = 0;
function showPosition() {
  dogPosition.textContent = String(currentDog + 1).padStart(2, '0') + ' / ' + String(dogs.length).padStart(2, '0');
}
showPosition();
galleryStatus.textContent = dogs[0].title + ' · 1 of ' + dogs.length;
function describeDog(dog) {
  return dog.alt || dog.title + ', an original wide dog painting by Wubbushi.';
}
async function changeDog(direction) {
  requestedDog = (requestedDog + direction + dogs.length) % dogs.length;
  const index = requestedDog;
  const dog = dogs[index];
  const request = ++imageRequest;
  dogPainting.setAttribute('aria-busy', 'true');
  galleryStatus.classList.remove('has-error');
  galleryStatus.textContent = 'Meeting ' + dog.title + '…';
  let timeout;
  try {
    const next = new Image();
    next.src = dog.src;
    await Promise.race([next.decode(), new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Painting timed out')), 15000);
    })]);
    if (request !== imageRequest) return;
    currentDog = index;
    dogImage.src = dog.src;
    dogImage.alt = describeDog(dog);
    dogImage.width = next.naturalWidth;
    dogImage.height = next.naturalHeight;
    dogName.textContent = dog.title;
    showPosition();
    enlarge.setAttribute('aria-label', 'Look closely at ' + dog.title);
    galleryStatus.textContent = dog.title + ' · ' + (index + 1) + ' of ' + dogs.length;
  } catch (_) {
    if (request === imageRequest) {
      galleryStatus.classList.add('has-error');
      galleryStatus.textContent = 'That painting couldn’t load. Try another dog.';
    }
  } finally {
    clearTimeout(timeout);
    if (request === imageRequest) dogPainting.setAttribute('aria-busy', 'false');
  }
}
document.getElementById('previous-dog').addEventListener('click', () => changeDog(-1));
document.getElementById('next-dog').addEventListener('click', () => changeDog(1));
document.getElementById('adopt-dog').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('[data-open-adoption]').click();
});
document.addEventListener('keydown', event => {
  if (viewing.hidden || document.querySelector('dialog[open]') ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    changeDog(event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === 'Escape') returnToGate();
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
enlarge.addEventListener('click', () => {
  const dog = dogs[currentDog];
  const image = closeView.querySelector('img');
  image.src = dog.src;
  image.alt = describeDog(dog);
  image.width = dogImage.width;
  image.height = dogImage.height;
  closeView.setAttribute('aria-label', dog.title + ', a closer look');
  closeView.showModal();
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
