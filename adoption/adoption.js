'use strict';
// Existing links to a rule should reveal it, including on back/forward navigation.
function openLinkedRule() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target || target.tagName !== 'DETAILS') return;
  target.open = true;
  target.scrollIntoView();
}
window.addEventListener('hashchange', openLinkedRule);
openLinkedRule();
