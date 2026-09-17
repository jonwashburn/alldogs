(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('application-form')) return;
  // Shared by the homepage dialog and the Pound. No wallet connection or keys.
  const walletLabel = $('wallet').closest('label');
  const choiceLabel = document.createElement('label');
  choiceLabel.textContent = 'A wallet for your dog';
  const choice = document.createElement('select');
  choice.id = 'wallet-choice'; choice.name = 'walletChoice'; choice.required = true;
  for (const [value, label] of [['', 'Choose an option'], ['existing', 'I have a wallet'], ['new', 'I don’t have a wallet'], ['later', 'I’ll provide my wallet later']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = label;
    if (!value) { option.disabled = true; option.selected = true; }
    choice.append(option);
  }
  choice.style.cssText = 'display:block;width:100%;font:inherit;padding:14px;margin-top:8px;background:white;color:inherit;border:1px solid currentColor;border-radius:0';
  choiceLabel.append(choice); walletLabel.before(choiceLabel);
  const help = document.createElement('p'); help.id = 'wallet-help'; help.hidden = true;
  choice.setAttribute('aria-describedby', 'wallet-help');
  help.setAttribute('role', 'status'); walletLabel.after(help);
  function walletChoiceChanged() {
    const existing = choice.value === 'existing';
    walletLabel.hidden = !existing; $('wallet').disabled = !existing; $('wallet').required = existing;
    help.textContent = ({new: 'No worries, we’ll get you set up with one.', later: 'Got it. We’ll ask again on adoption day.'})[choice.value] || '';
    help.hidden = !choice.value || existing;
  }
  choice.addEventListener('change', walletChoiceChanged); walletChoiceChanged();
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
  const validShortId = value => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 10000;
  function showReceipt(receipt, publicId, shortId) {
    $('receipt-code').textContent = receipt;
    $('receipt').hidden = false;
    $('submit-application').hidden = true;
    $('form-status').textContent = '';
    for (const input of $('application-form').querySelectorAll('input, textarea, select')) input.disabled = true;
    try { sessionStorage.setItem('alldogs-application-receipt', receipt); } catch (_) {}
    if (/^[A-Za-z0-9_-]{24}$/.test(publicId || '')) {
      const url = validShortId(shortId) ? 'https://alldogs.wtf/vouch/' + Number(shortId) : 'https://alldogs.wtf/dog-pound/application/?id=' + publicId;
      $('share-application').hidden = false;
      $('view-application').href = url;
      $('share-on-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('I applied to adopt a dog from ALL DOGS. If you own one and are eligible to vouch, would you vouch for me?') + '&url=' + encodeURIComponent(url);
      $('copy-application').onclick = async () => {try {await navigator.clipboard.writeText(url); $('copy-application').textContent='Link copied';} catch (_) {$('copy-application').textContent='Copy the address from your application page';}};
      try { sessionStorage.setItem('alldogs-application-public-id', publicId); if (validShortId(shortId)) sessionStorage.setItem('alldogs-application-short-id', String(shortId)); } catch (_) {}
      if (!validShortId(shortId)) {
        fetch('https://api.alldogs.wtf/collection-api/application?id=' + encodeURIComponent(publicId), {credentials: 'omit', cache: 'no-store'})
          .then(response => response.ok ? response.json() : null)
          .then(result => { if (result?.publicId === publicId && validShortId(result.shortId)) showReceipt(receipt, publicId, result.shortId); })
          .catch(() => {}); // The original link remains usable if the lookup is unavailable.
      }
    }
  }
  try { const receipt = sessionStorage.getItem('alldogs-application-receipt'); if (/^DOG-[A-F0-9]{16}$/.test(receipt || '')) showReceipt(receipt, sessionStorage.getItem('alldogs-application-public-id'), sessionStorage.getItem('alldogs-application-short-id')); } catch (_) {}
  $('copy-receipt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('receipt-code').textContent); $('copy-receipt').textContent = 'Private receipt copied'; }
    catch (_) { $('copy-receipt').textContent = 'Select and copy the receipt above'; }
  });
  $('application-form').addEventListener('submit', async event => {
    event.preventDefault();
    if ($('submit-application').disabled || $('submit-application').hidden) return;
    if (!$('application-form').reportValidity()) return;
    const values = {handle: $('handle').value.trim(), wallet: choice.value === 'existing' ? $('wallet').value.trim() : '', walletChoice: choice.value, applicationFlow: 'wallet-help-v3', website: $('website').value};
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
      showReceipt(result.receipt, result.publicId, result.shortId);
    } catch (error) {
      $('form-status').className = 'error';
      $('form-status').textContent = error.name === 'AbortError' || error instanceof TypeError ? 'We could not confirm whether your application was saved. Submit the same details again; this will not create a duplicate.' : error.message;
    } finally { clearTimeout(timer); submit.disabled = false; submit.textContent = 'Submit application ↗'; }
  });
})();
