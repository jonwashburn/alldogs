(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const RPC = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];
  const COLLECTION = '0x52F8867A805ac921c5b5339D775f1eE823305DA2';
  const TIMELOCK = '0x72eC2Bc4331A595b31c3a4560D48ffC5a0A2d6Fb';
  const RENDERER = '0xcfD9C964BC5639189A226c62f11E74e3a2ABeFFd';
  const PROPOSER = '0x02b165144c45f30452ccbbda356de42316b89626';
  // TimelockController calls for setRenderer(RENDERER) on COLLECTION, predecessor 0, salt keccak256("All Dogs renderer 1").
  const TAIL = '00000000000000000000000052f8867a805ac921c5b5339d775f1ee823305da2' + '0'.repeat(64);
  const CALL = '0000000000000000000000000000000000000000000000000000000000000000602b8cf9ed9eb98efa8715cb174d5b6dc39539baa991b6dbe3d9fa63b89f9ea8';
  const INNER = '000000000000000000000000000000000000000000000000000000000000002456d3163d000000000000000000000000cfd9c964bc5639189a226c62f11e74e3a2abeffd00000000000000000000000000000000000000000000000000000000';
  const SCHEDULE = '0x01d5062a' + TAIL + '00000000000000000000000000000000000000000000000000000000000000c0' + CALL + '000000000000000000000000000000000000000000000000000000000002a300' + INNER;
  const EXECUTE = '0x134008d3' + TAIL + '00000000000000000000000000000000000000000000000000000000000000a0' + CALL + INNER;
  const GET_TIMESTAMP = '0xd45c4435de0e8d698e3cdf219e097366bef90a292b48200696d37022f5764e45f9632488';
  let busy = false;

  function say(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; }
  async function rpc(method, params) {
    let last;
    for (const url of RPC) {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
        const j = await r.json(); if (typeof j.result === 'string') return j.result; last = Error('The chain reader refused the request.');
      } catch (e) { last = e; }
    }
    throw last;
  }
  const call = (to, data) => rpc('eth_call', [{ to, data }, 'latest']);
  function announced() { return new Promise(resolve => { const found = [];
    const on = event => { const d = event.detail; if (d && d.provider && d.info && !found.some(w => w.info.uuid === d.info.uuid)) found.push(d); };
    window.addEventListener('eip6963:announceProvider', on); window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => { window.removeEventListener('eip6963:announceProvider', on); resolve(found); }, 500); }); }
  async function wallet() {
    const found = await announced(), metamask = found.find(w => w.info.rdns === 'io.metamask');
    const eth = metamask ? metamask.provider : found.length === 1 ? found[0].provider : window.ethereum;
    if (!eth) throw Error('No wallet found here. Use MetaMask on a computer, or open this page in your wallet app’s browser.');
    const [account] = await eth.request({ method: 'eth_requestAccounts' });
    if (parseInt(await eth.request({ method: 'eth_chainId' }), 16) !== 1) {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
    }
    return { eth, account: account.toLowerCase() };
  }
  async function send(data, needProposer) {
    if (busy) return; busy = true; $('act').disabled = true;
    try {
      const { eth, account } = await wallet();
      if (needProposer && account !== PROPOSER) throw Error('Switch MetaMask to your main wallet, 0x02B1…9626. Only it can schedule changes.');
      say('Confirm the transaction in MetaMask.');
      const hash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: account, to: TIMELOCK, data, value: '0x0' }] });
      say('Sent. Waiting for Ethereum to include it: ' + hash);
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const receipt = await eth.request({ method: 'eth_getTransactionReceipt', params: [hash] }).catch(() => null);
        if (receipt) { if (receipt.status !== '0x1') throw Error('The transaction was included but reverted: ' + hash); break; }
      }
      await refresh();
    } catch (e) { say((e && e.message) || String(e), true); }
    finally { busy = false; $('act').disabled = false; }
  }
  async function refresh() {
    const [code, stamp, current] = await Promise.all([rpc('eth_getCode', [RENDERER, 'latest']), call(TIMELOCK, GET_TIMESTAMP), call(COLLECTION, '0x8ada6b0f')]);
    const at = parseInt(stamp, 16), act = $('act');
    act.hidden = true; act.onclick = null;
    if (current.slice(-40).toLowerCase() === RENDERER.slice(2).toLowerCase()) {
      $('step').textContent = 'Switched on.'; $('state').textContent = 'The collection now takes each recorded dog’s page from its own contract.';
      say('Done. Marketplaces pick up the change as they refresh their copies.'); return;
    }
    if (code.length <= 2) { $('step').textContent = 'Waiting for the renderer.'; $('state').textContent = 'The renderer contract is not on Ethereum yet.'; say(''); return; }
    if (at === 0) {
      $('step').textContent = 'Schedule the change.'; $('state').textContent = 'Not scheduled. Signing starts the 48-hour notice period.';
      act.textContent = 'Schedule with MetaMask →'; act.hidden = false; act.onclick = () => send(SCHEDULE, true); say('Ready for your signature.'); return;
    }
    const when = new Date(at * 1000), now = Date.now() / 1000;
    if (now < at) {
      $('step').textContent = 'Scheduled.'; $('state').textContent = 'It can be switched on after ' + when.toLocaleString() + '.';
      say('Nothing to sign now. The change waits out its notice period.'); return;
    }
    $('step').textContent = 'Ready to switch on.'; $('state').textContent = 'The notice period ended ' + when.toLocaleString() + '. Any wallet can send this.';
    act.textContent = 'Switch it on →'; act.hidden = false; act.onclick = () => send(EXECUTE, false); say('Ready.');
  }
  refresh().catch(e => say('Could not read Ethereum: ' + ((e && e.message) || e), true));
})();
