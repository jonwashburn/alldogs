(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('application-form')) return;
  const dialog = $('adoption-dialog');
  if (dialog) {
    document.querySelectorAll('[data-open-adoption]').forEach(button => {
      button.addEventListener('click', () => {
        dialog.showModal();
        document.documentElement.classList.add('adoption-is-open');
      });
    });
    $('close-adoption').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => document.documentElement.classList.remove('adoption-is-open'));
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  }
  let submission = null;
  try { submission = JSON.parse(sessionStorage.getItem('alldogs-application-attempt')); } catch (_) {}
  function showReceipt(receipt, publicId) {
    $('receipt-code').textContent = receipt;
    $('receipt').hidden = false;
    $('submit-application').hidden = true;
    $('form-status').textContent = '';
    for (const input of $('application-form').querySelectorAll('input, textarea')) input.disabled = true;
    try { sessionStorage.setItem('alldogs-application-receipt', receipt); } catch (_) {}
    if (/^[A-Za-z0-9_-]{24}$/.test(publicId || '')) {
      const url = 'https://alldogs.wtf/dog-pound/application/?id=' + publicId;
      $('share-application').hidden = false;
      $('view-application').href = url;
      $('share-on-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('I applied to adopt a dog from ALL DOGS. If you own one and are eligible to vouch, would you vouch for me?') + '&url=' + encodeURIComponent(url);
      $('copy-application').onclick = async () => {try {await navigator.clipboard.writeText(url); $('copy-application').textContent='Link copied';} catch (_) {$('copy-application').textContent='Copy the address from your application page';}};
      try { sessionStorage.setItem('alldogs-application-public-id', publicId); } catch (_) {}
    }
  }
  try { const receipt = sessionStorage.getItem('alldogs-application-receipt'); if (/^DOG-[A-F0-9]{16}$/.test(receipt || '')) showReceipt(receipt, sessionStorage.getItem('alldogs-application-public-id')); } catch (_) {}
  $('copy-receipt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('receipt-code').textContent); $('copy-receipt').textContent = 'Private receipt copied'; }
    catch (_) { $('copy-receipt').textContent = 'Select and copy the receipt above'; }
  });
  $('application-form').addEventListener('submit', async event => {
    event.preventDefault();
    if ($('submit-application').disabled || $('submit-application').hidden) return;
    if (!$('application-form').reportValidity()) return;
    const values = {handle: $('handle').value.trim(), wallet: $('wallet').value.trim(), applicationFlow: 'share-page-v2', website: $('website').value};
    if (/^0x0{40}$/i.test(values.wallet)) {
      $('form-status').className = 'error'; $('form-status').textContent = 'Enter your own Ethereum wallet address. The all-zero address is not accepted.'; return;
    }
    const fingerprint = JSON.stringify(values);
    if (!submission || submission.fingerprint !== fingerprint) submission = {fingerprint, requestId: crypto.randomUUID()};
    try { sessionStorage.setItem('alldogs-application-attempt', JSON.stringify(submission)); } catch (_) {}
    const submit = $('submit-application'); submit.disabled = true; submit.textContent = 'Saving your application…';
    $('form-status').className = ''; $('form-status').textContent = '';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.alldogs.wtf/collection-api/adoption-applications', {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json'}, signal: controller.signal, body: JSON.stringify({...values, requestId: submission.requestId})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not save your application. Please try again.');
      if (!/^DOG-[A-F0-9]{16}$/.test(result.receipt || '')) throw Error('We could not confirm your receipt. Please try again.');
      if (!/^[A-Za-z0-9_-]{24}$/.test(result.publicId || '')) throw Error('We could not confirm your application link. Submit the same details again.');
      showReceipt(result.receipt, result.publicId);
    } catch (error) {
      $('form-status').className = 'error';
      $('form-status').textContent = error.name === 'AbortError' || error instanceof TypeError ? 'We could not confirm whether your application was saved. Submit the same details again; this will not create a duplicate.' : error.message;
    } finally { clearTimeout(timer); submit.disabled = false; submit.textContent = 'Submit application ↗'; }
  });
})();
