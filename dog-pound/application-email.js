/* Private, optional preferences after a successful application. No emails sent here. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('application-email-form')) return;
  let identity = null, busy = false, loaded = false;
  function status(message, error = false) { $('email-status').textContent = message; $('email-status').className = error ? 'error' : ''; }
  function lock(value) {
    busy = value;
    for (const id of ['save-email', 'remove-email', 'notification-email', 'art-updates']) $(id).disabled = value;
  }
  async function request(action, values = {}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.alldogs.wtf/collection-api/application-contact', {
        method: 'POST', credentials: 'omit', cache: 'no-store', headers: {'Content-Type': 'application/json'},
        signal: controller.signal, body: JSON.stringify({...identity, action, ...values})
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not save your email. Please try again.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw Error('We could not confirm the change. Your application is safe. Please try again.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function fill(contact) {
    $('notification-email').value = contact?.email || '';
    $('art-updates').checked = contact?.artUpdates === true;
    $('remove-email').hidden = !contact;
    $('save-email').textContent = contact ? 'Update preferences' : 'Save email';
  }
  window.AllDogsApplicationEmail = {
    async show(receipt, publicId) {
      if (loaded || !/^DOG-[A-F0-9]{16}$/.test(receipt || '') || !/^[A-Za-z0-9_-]{24}$/.test(publicId || '')) return;
      loaded = true; identity = {receipt, publicId}; $('application-email').hidden = false;
      lock(true);
      try { const result = await request('get'); fill(result.contact); if (result.contact) status('Your email preferences are saved.'); }
      catch (error) { status(error.message, true); }
      finally { lock(false); }
    }
  };
  $('application-email-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!identity || busy || !$('application-email-form').reportValidity()) return;
    lock(true); status('Saving your email…');
    try {
      const result = await request('save', {email: $('notification-email').value.trim(), artUpdates: $('art-updates').checked, consentVersion: 'invitation-and-art-v1'});
      fill(result.contact); status('Email saved. '+(result.contact?.artUpdates ? 'You’ve also asked for updates on other Wubbushi art.' : 'For your adoption invitation only.'));
    } catch (error) { status(error.message, true); }
    finally { lock(false); }
  });
  $('remove-email').addEventListener('click', async () => {
    if (!identity || busy) return;
    lock(true);
    try { await request('remove'); fill(null); status('Email removed from your application. Wubbushi can still reach you on X.'); }
    catch (error) { status(error.message, true); }
    finally { lock(false); }
  });
  $('skip-email').addEventListener('click', () => { $('application-email').hidden = true; $('reopen-email').hidden = false; });
  $('reopen-email').addEventListener('click', () => { $('application-email').hidden = false; $('reopen-email').hidden = true; $('notification-email').focus(); });
})();
