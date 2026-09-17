/* Session cookies stay on the API host. Never store credentials in web storage. */
(() => {
  'use strict';
  const base = 'https://api.alldogs.wtf/collection-api/';
  let identity = null;
  async function request(path, body, key) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 18000);
    const headers = {};
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = identity?.csrf || ''; }
    if (key) headers.Authorization = 'Bearer ' + key;
    try {
      const response = await fetch(base + path, {method: body === undefined ? 'GET' : 'POST', headers,
        credentials: path.startsWith('club/') ? 'include' : 'omit', cache: 'no-store', signal: controller.signal,
        body: body === undefined ? undefined : JSON.stringify(body)});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'That did not go through. Please refresh and try again.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw Error('We could not confirm the result. Refresh before trying again.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  window.AllDogsAccount = {
    request,
    async session() { identity = await request('club/session'); return identity; },
    signIn(path = location.pathname) { return base + 'auth/start?return=' + encodeURIComponent(path); }
  };
})();
