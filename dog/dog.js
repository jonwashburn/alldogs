(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const RPC = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];
  const COLLECTION = '0x52F8867A805ac921c5b5339D775f1eE823305DA2';
  const RENDERER = '0xcfD9C964BC5639189A226c62f11E74e3a2ABeFFd';
  const word = n => BigInt(n).toString(16).padStart(64, '0');
  function note(text, error = false) { $('note').textContent = text; $('note').className = error ? 'chain-note error' : 'chain-note'; }
  async function call(to, data) {
    let last;
    for (const url of RPC) {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }) });
        const j = await r.json(); if (typeof j.result === 'string') return j.result; last = Error((j.error && j.error.message) || 'The chain reader refused the request.');
      } catch (e) { last = e; }
    }
    throw last;
  }
  function string(hex) {
    const b = hex.slice(2), len = parseInt(b.slice(64, 128), 16), bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = parseInt(b.substr(128 + 2 * i, 2), 16);
    return new TextDecoder().decode(bytes);
  }
  const b64 = s => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  async function metadata(id) {
    const own = string(await call(COLLECTION, '0xc87b56dd' + word(id)));
    if (own.startsWith('data:application/json;base64,')) return own;
    return string(await call(RENDERER, '0xe9dc6375' + word(COLLECTION) + word(id)));
  }
  (async () => {
    const id = parseInt((location.hash.match(/\d+/) || ['1'])[0], 10);
    const uri = await metadata(id);
    const meta = JSON.parse(b64(uri.slice(uri.indexOf(',') + 1)));
    document.title = meta.name + ' · painted from Ethereum · All Dogs';
    $('name').textContent = meta.name;
    const page = meta.animation_url || '';
    if (!page.startsWith('data:text/html;base64,')) throw Error('This dog does not have an on-chain painting yet.');
    const art = $('art'); art.srcdoc = b64(page.slice(page.indexOf(',') + 1)); art.hidden = false;
    note('Token ' + id + ' of the All Dogs collection on Ethereum. The painting takes a few minutes to arrive stroke by stroke.');
    for (const a of meta.attributes || []) {
      const d = document.createElement('div'), t = document.createElement('dt'), v = document.createElement('dd');
      t.textContent = a.trait_type; v.textContent = a.value; d.append(t, v); $('traits').append(d);
    }
  })().catch(e => { $('name').textContent = 'All Dogs'; note('Could not read this dog from Ethereum: ' + ((e && e.message) || e), true); });
})();
