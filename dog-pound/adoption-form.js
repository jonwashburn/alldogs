(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('application-form')) return;
  const api = window.AllDogsAccount;
  let verifiedIdentity = null, opening = false, pending = null;
  try { pending = JSON.parse(sessionStorage.getItem('alldogs-pending-application')); } catch (_) {}
  if (!pending || !/^[a-z0-9_]{1,15}$/.test(pending.handle || '') || !['existing','help','new','later'].includes(pending.walletChoice) || !/^DOG-[A-F0-9]{16}$/.test(pending.receipt || '') || !/^[A-Za-z0-9_-]{24}$/.test(pending.publicId || '')) pending = null;
  $('application-form').hidden = false;
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
  choice.className = 'wallet-choice';
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
  const registrationStatus=document.createElement('p');registrationStatus.id='registration-status';registrationStatus.setAttribute('role','status');
  $('application-form').before(registrationStatus);
  const verification = document.createElement('section'); verification.id = 'application-verification'; verification.hidden = true;
  verification.innerHTML = `<p class="application-step">2 of 3 · Confirm your X account</p><h3>Your place is saved.</h3><p id="verify-copy"></p><p>One quick visit to X confirms that this handle belongs to you. Then you can add an email for your invitation.</p><button type="button" class="button primary" id="verify-x">Confirm with X ↗</button><p class="verification-domain">You’ll continue on <strong>x.com</strong>, then return here.</p><details><summary>What does All Dogs access?</summary><p>X asks for permission to read posts and account information. All Dogs only requests your account ID and handle to confirm your identity. We do not read your posts or messages, post for you, or retain your X access token.</p></details><p id="verify-status" role="status" aria-live="polite"></p><button type="button" class="text-link" id="edit-application">Correct my details</button><p class="verification-later">You can close this window and confirm later. Your application stays saved; reopen the waitlist in this browser tab to continue.</p>`;
  $('application-form').after(verification);
  function focusStep() {
    if (!dialog?.open) return;
    const heading = $('adoption-dialog-title'); heading.tabIndex = -1;
    heading.focus({preventScroll: true}); dialog.scrollTop = 0;
  }
  function showVerification(message = '') {
    $('application-form').hidden = true; $('receipt').hidden = true; verification.hidden = false;
    $('adoption-dialog-title').textContent = 'A little introduction.';
    $('verify-copy').textContent = '@' + pending.handle + ' is on your application. Your wallet details are saved privately.';
    $('verify-status').textContent = message;
    registrationStatus.textContent = '';
    focusStep();
  }
  async function finishVerification() {
    const result = await api.request('club/registration-verify', {receipt: pending.receipt, publicId: pending.publicId});
    pending = null; try { sessionStorage.removeItem('alldogs-pending-application'); } catch (_) {}
    verification.hidden = true; showReceipt(result.receipt, result.publicId, result.shortId);
    registrationStatus.textContent = 'X account confirmed: @' + verifiedIdentity.handle + '.';
  }
  $('verify-x').onclick = async () => {
    const button = $('verify-x'); button.disabled = true; $('verify-status').textContent = '';
    try {
      // Refresh the session immediately before using its CSRF proof.
      verifiedIdentity = await api.session();
      if (verifiedIdentity.signedIn && verifiedIdentity.authMethod === 'x' && verifiedIdentity.handle.toLowerCase() === pending.handle) {
        await finishVerification();
      } else {
        if (!verifiedIdentity.capabilities.xLogin) throw Error('X confirmation is temporarily unavailable. Your application is saved. Please try again later.');
        location.assign(api.signIn('/?register=1'));
      }
    } catch (error) { $('verify-status').textContent = error.message; }
    finally { button.disabled = false; }
  };
  $('edit-application').onclick = () => {
    verification.hidden = true; $('application-form').hidden = false;
    $('handle').readOnly = false; $('handle').value = '@' + pending.handle;
    choice.value = pending.walletChoice; $('wallet').value = pending.wallet || ''; walletChoiceChanged();
    $('adoption-dialog-title').textContent = 'Join the waitlist.';
    $('handle').focus();
  };
  async function openApplication(){
    if(opening)return;opening=true;
    // Keep the gate's hash router on the application while the X return resolves.
    if(new URLSearchParams(location.search).has('register'))history.replaceState(null,'',location.pathname+location.search+'#apply');
    if(dialog&&!dialog.open){dialog.showModal();document.documentElement.classList.add('adoption-is-open');}
    $('application-form').hidden = !!pending; if(pending) showVerification();
    try {
      verifiedIdentity=await api.session();
      if(verifiedIdentity.signedIn && verifiedIdentity.authMethod==='x'){
        if(pending && new URLSearchParams(location.search).has('register')) {
          try { await finishVerification(); } catch(error) { showVerification(error.message); }
        } else if(!pending) {
          const state=await api.request('club/registration');
          if(state.application) showReceipt(state.application.receipt,state.application.publicId,state.application.shortId);
          else { $('handle').value='@'+state.handle; $('handle').readOnly=false; }
        }
      }
      if(pending && new URLSearchParams(location.search).has('signin')) showVerification('Your application is saved. You can try X confirmation again whenever you’re ready.');
    }catch(error){ registrationStatus.textContent='You can enter your details now. We’ll check the connection when you save.'; }
    finally{
      if(new URLSearchParams(location.search).has('register'))history.replaceState(null,'',location.pathname+'#apply');
      opening=false;
    }
  }
  if(dialog){
    document.querySelectorAll('[data-open-adoption]').forEach(button=>button.addEventListener('click',openApplication));
    $('close-adoption').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>document.documentElement.classList.remove('adoption-is-open'));
    dialog.addEventListener('click',event=>{const bounds=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))dialog.close();});
  }
  let submission = null;
  try { submission = JSON.parse(sessionStorage.getItem('alldogs-application-attempt')); } catch (_) {}
  const validShortId = value => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 10000;
  function showReceipt(receipt, publicId, shortId) {
    verification.hidden = true; $('adoption-dialog-title').textContent = 'You’re on the list.';
    $('receipt-code').textContent = receipt;
    $('receipt').hidden = false;
    $('application-form').hidden = true;
    $('submit-application').hidden = true;
    $('form-status').textContent = '';
    for (const input of $('application-form').querySelectorAll('input, textarea, select')) input.disabled = true;
    window.AllDogsApplicationEmail?.show(receipt, publicId);
    focusStep();
    try { sessionStorage.setItem('alldogs-application-receipt', receipt); } catch (_) {}
    if (/^[A-Za-z0-9_-]{24}$/.test(publicId || '')) {
      const url = validShortId(shortId) ? 'https://alldogs.wtf/vouch/' + Number(shortId) : 'https://alldogs.wtf/dog-pound/application/?id=' + publicId;
      if (!$('wishlist-invitation')) {
        const invite = document.createElement('section'); invite.id = 'wishlist-invitation'; invite.className = 'wishlist-invite';
        const title = document.createElement('h4'); title.textContent = 'Meet the dogs.';
        const copy = document.createElement('p'); copy.textContent = 'Choose up to three favourites in the Pound. Put them in order, change your mind, come back for another look.';
        const enter = document.createElement('a'); enter.className = 'button primary'; enter.href = '/dog-pound/'; enter.textContent = 'Make my wishlist ↗';
        invite.append(title,copy,enter); $('reopen-email').after(invite);
      }
      $('share-application').hidden = false;
      $('view-application').href = url;
      $('share-on-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('I applied to adopt a dog from All Dogs. If you own one and are eligible to vouch, would you vouch for me?') + '&url=' + encodeURIComponent(url);
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

  $('copy-receipt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('receipt-code').textContent); $('copy-receipt').textContent = 'Private receipt copied'; }
    catch (_) { $('copy-receipt').textContent = 'Select and copy the receipt above'; }
  });
  $('application-form').addEventListener('submit', async event => {
    event.preventDefault();
    if ($('submit-application').disabled || $('submit-application').hidden) return;
    if (!$('application-form').reportValidity()) return;
    const values = {handle: $('handle').value.trim(), wallet: choice.value === 'existing' ? $('wallet').value.trim() : '', walletChoice: choice.value, applicationFlow: 'waitlist-first-v4', website: $('website').value};
    if (/^0x0{40}$/i.test(values.wallet)) {
      $('form-status').className = 'error'; $('form-status').textContent = 'Enter your own Ethereum wallet address. The all-zero address is not accepted.'; return;
    }
    const fingerprint = JSON.stringify(values);
    if (!submission || submission.fingerprint !== fingerprint) submission = {fingerprint, requestId: crypto.randomUUID()};
    try { sessionStorage.setItem('alldogs-application-attempt', JSON.stringify(submission)); } catch (_) {}
    const submit = $('submit-application'); submit.disabled = true; submit.textContent = 'Saving your application…';
    $('form-status').className = ''; $('form-status').textContent = '';
    try {
      const result = await api.request('club/registration-draft',{...values,requestId:submission.requestId,...(pending ? {amend:{receipt:pending.receipt,publicId:pending.publicId}} : {})});
      if (!/^DOG-[A-F0-9]{16}$/.test(result.receipt || '')) throw Error('We could not confirm your receipt. Please try again.');
      if (!/^[A-Za-z0-9_-]{24}$/.test(result.publicId || '')) throw Error('We could not confirm your application link. Submit the same details again.');
      pending = {...result, handle: values.handle.replace(/^@/, '').toLowerCase(), walletChoice: values.walletChoice, wallet: values.wallet};
      try { sessionStorage.setItem('alldogs-pending-application', JSON.stringify(pending)); } catch (_) {}
      showVerification();
    } catch (error) {
      $('form-status').className = 'error';
      $('form-status').textContent = error.name === 'AbortError' || error instanceof TypeError ? 'We could not confirm whether your application was saved. Submit the same details again; this will not create a duplicate.' : error.message;
    } finally { submit.disabled = false; submit.textContent = 'Save my place →'; }
  });
  if(!dialog||['#apply','#drop'].includes(location.hash)||new URLSearchParams(location.search).has('register'))openApplication();
})();
