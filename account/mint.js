(() => {
  'use strict';
  const api = window.AllDogsAccount;
  const address = value => typeof value === 'string' && /^0x[0-9a-f]{40}$/i.test(value);
  const hash = value => typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value);
  const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
  const uint = value => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) < 2n ** 256n;
  const hexChain = value => { if (!uint(String(value)) || BigInt(value) === 0n) throw Error('The network could not be verified.'); return '0x' + BigInt(value).toString(16); };
  const chainName = value => ({'1':'Ethereum', '11155111':'Ethereum Sepolia'}[String(BigInt(value))] || 'Network ' + BigInt(value));
  const node = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  const short = value => value.slice(0,6) + '…' + value.slice(-4);
  const when = value => new Date(value * 1000).toLocaleString(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'});
  const now = () => Math.floor(Date.now()/1000);
  const weiText = value => { if(!uint(value))throw Error('The recorded value could not be verified.'); const padded=value.padStart(19,'0'); return padded.slice(0,-18)+(padded.slice(-18).replace(/0+$/,'') ? '.'+padded.slice(-18).replace(/0+$/,'') : ''); };
  const weiInput = value => { if(!/^(0|[1-9][0-9]{0,59})(\.[0-9]{1,18})?$/.test(value))throw Error('Enter an ETH amount with up to 18 decimal places.'); const [whole, fraction='']=value.split('.'); const amount=BigInt(whole)*10n**18n+BigInt(fraction.padEnd(18,'0')); if(amount<=0n||amount>=2n**256n)throw Error('Enter an amount above zero, or simply leave the value at zero.'); return amount; };
  const fields = ['adoptionId','personId','artworkId','contentHash','voucherId','recipient','founding','artistGift','nameHash','uriHash','nonce','deadline','signerEpoch'];
  const fieldTypes = ['bytes32','bytes32','bytes32','bytes32','bytes32','address','bool','bool','bytes32','bytes32','uint256','uint256','uint256'];
  const schema = fields.map((name,i)=>({name,type:fieldTypes[i]}));
  const domainSchema = [['name','string'],['version','string'],['chainId','uint256'],['verifyingContract','address']].map(([name,type])=>({name,type}));
  const exactKeys = (value, keys) => value && !Array.isArray(value) && typeof value==='object' && Object.keys(value).sort().join() === [...keys].sort().join();
  const sameSchema = (actual, expected) => Array.isArray(actual) && actual.length===expected.length && actual.every((field,i)=>exactKeys(field,['name','type']) && field.name===expected[i].name && field.type===expected[i].type);
  function approvalValid(a, expected) {
    const t=a?.typedData, m=t?.message, d=t?.domain;
    if(!a || !['prepared','issued'].includes(a.status) || !hash(a.reservationId) || !address(a.wallet) ||
       !Number.isSafeInteger(a.deadline) || !d || d.name!=='All Dogs' || d.version!=='1' || !address(d.verifyingContract) || !uint(d.chainId) ||
       t.primaryType!=='Adoption' || !exactKeys(t.types,['EIP712Domain','Adoption']) || !sameSchema(t.types.EIP712Domain,domainSchema) || !sameSchema(t.types.Adoption,schema) ||
       Object.keys(d).sort().join()!=='chainId,name,verifyingContract,version' || Object.keys(m||{}).sort().join()!==[...fields].sort().join() ||
       fields.some((key,i)=>fieldTypes[i]==='bytes32'?!hash(m[key]):fieldTypes[i]==='address'?!address(m[key]):fieldTypes[i]==='bool'?typeof m[key]!=='boolean':!uint(m[key])) ||
       !same(m.adoptionId,a.reservationId) || !same(m.recipient,a.wallet) || m.deadline!==String(a.deadline) ||
       a.dogId!==expected.dogId || a.dogName!==expected.dogName || typeof a.originalURI!=='string' || a.originalURI.length>4096) {
      throw Error('The adoption details could not be verified. Refresh your invitation before continuing.');
    }
    hexChain(d.chainId);
    return a;
  }
  // Verify the entire adopt ABI envelope against the exact consent and displayed
  // name/original. Nothing supplied by the API can add approvals, value or calls.
  function mintTransaction(a) {
    const tx=a.transaction, domain=a.typedData.domain, m=a.typedData.message;
    if(!tx || !same(tx.to,domain.verifyingContract) || !same(tx.from,a.wallet) || tx.value!=='0x0' ||
       tx.chainId!==hexChain(domain.chainId) || typeof tx.data!=='string' || !/^0x122dbb71[0-9a-f]+$/i.test(tx.data) || tx.data.length>40000)throw Error('The mint transaction could not be verified.');
    const raw=tx.data.slice(10).toLowerCase(), word=i=>raw.slice(i*64,(i+1)*64);
    const wordValue=v=>BigInt(v).toString(16).padStart(64,'0');
    fields.forEach((key,i)=>{const type=fieldTypes[i],v=m[key];const encoded=type==='bytes32'?v.slice(2).toLowerCase():type==='address'?v.slice(2).toLowerCase().padStart(64,'0'):type==='bool'?wordValue(v?1:0):wordValue(v);if(word(i)!==encoded)throw Error('The transaction differs from your adoption approval.');});
    let offset=17*32;
    for(let i=0;i<4;i++){
      if(word(13+i)!==wordValue(offset))throw Error('The mint transaction could not be verified.');
      const length=Number(BigInt('0x'+raw.slice(offset*2,offset*2+64)));
      if(!Number.isSafeInteger(length)||length<0||length>8192)throw Error('The mint transaction could not be verified.');
      const bytes=raw.slice(offset*2+64,offset*2+64+length*2),padded=Math.ceil(length/32)*64;
      if(bytes.length!==length*2 || !/^0*$/.test(raw.slice(offset*2+64+length*2,offset*2+64+padded)))throw Error('The mint transaction could not be verified.');
      if(i<2){const expected=Array.from(new TextEncoder().encode(i===0?a.dogName:a.originalURI),n=>n.toString(16).padStart(2,'0')).join('');if(bytes!==expected)throw Error('The transaction names a different dog or original.');}
      else if(length===0)throw Error('The adoption approval is incomplete.');
      offset+=32+padded/2;
    }
    if(offset*2!==raw.length)throw Error('The mint transaction could not be verified.');
    return {from:a.wallet,to:domain.verifyingContract,chainId:tx.chainId,value:'0x0',data:tx.data};
  }

  const wallets=[], subscribers=new Set();
  window.addEventListener('eip6963:announceProvider',event=>{
    const d=event.detail;
    if(!d?.provider || typeof d.provider.request!=='function' || !d.info || typeof d.info.name!=='string' || wallets.some(w=>w.provider===d.provider))return;
    wallets.push({provider:d.provider,name:d.info.name.slice(0,80)});
    subscribers.forEach(update=>update());
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  const availableWallets = () => wallets.length ? wallets : window.ethereum?.request ? [{provider:window.ethereum,name:'Browser wallet'}] : [];

  function mount(host, initial, options={}) {
    let state=initial, provider=null, wallet='', epoch=0, disposed=false, busy=false, checking=false, timer, note='', amount='', storageError=false, readNumber=0;
    let pending=null;
    const expected={dogId:options.dogId||initial.delivery?.dogId||initial.approval?.dogId, dogName:options.dogName||initial.delivery?.dogName||initial.approval?.dogName};
    const key='alldogs-transaction:'+state.invitationId;
    const shell=node('section',undefined,'mint-card'),body=node('div'),status=node('p','','mint-status');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');shell.append(body,status);host.append(shell);
    function live(){return !disposed && host.isConnected;}
    function check(ticket){if(!live()||ticket!==epoch)throw Error('Your wallet changed. Reconnect before continuing.');}
    function loadPending(){
      try{const saved=JSON.parse(localStorage.getItem(key)||'null');pending=saved&&['mint','tip'].includes(saved.kind)&&saved.invitationId===state.invitationId?saved:null;}
      catch{storageError=true;pending=null;}
      if(pending?.kind==='mint' && (state.delivery || (!state.approval&&state.mintingReady) || (state.approval && pending.reservationId!==state.approval.reservationId)))savePending(null);
      const confirmed=state.payment?.confirmedTransaction;
      if(pending?.kind==='tip' && hash(pending.hash) && same(confirmed?.hash,pending.hash) && uint(confirmed?.creditedWei) && uint(pending.value) && BigInt(confirmed.creditedWei)>=BigInt(pending.value))savePending(null);
    }
    function savePending(value){
      try{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);pending=value;}
      catch{storageError=true;throw Error('Allow storage in this browser before sending. It keeps a refresh from sending twice.');}
    }
    const changed=()=>{epoch++;wallet='';note='Your wallet changed. Reconnect before continuing.';render();};
    function detach(){if(provider?.removeListener)for(const e of ['accountsChanged','chainChanged','disconnect'])provider.removeListener(e,changed);}
    function watch(p){detach();provider=p;if(provider.on)for(const e of ['accountsChanged','chainChanged','disconnect'])provider.on(e,changed);}
    async function fresh(ticket,background=false){const read=++readNumber,query=pending?.kind==='tip'&&hash(pending.hash)?'?paymentTransaction='+encodeURIComponent(pending.hash):'',next=await api.request('club/mint-state'+query);check(ticket);if(read!==readNumber||(background&&busy))return state;if(next.invitationId!==state.invitationId)throw Error('Reopen your invitation before continuing.');state=next;loadPending();options.onLock?.(Boolean(state.approval||state.delivery));return state;}
    async function walletMatches(ticket, required, chain){
      if(!provider||!wallet)throw Error('Connect your wallet before continuing.');
      const accounts=await provider.request({method:'eth_accounts'});check(ticket);
      const network=await provider.request({method:'eth_chainId'});check(ticket);
      if(!Array.isArray(accounts)||!same(accounts[0],required)||!same(wallet,required))throw Error('Choose wallet '+short(required)+' to continue.');
      if(typeof network!=='string'||!/^0x[0-9a-f]+$/i.test(network)||BigInt(network)!==BigInt(chain))throw Error('Switch your wallet to '+chainName(chain)+', then reconnect.');
    }
    async function run(fn){
      if(busy||!live())return;busy=true;note='';const ticket=epoch;render();
      try{await fn(ticket);}
      catch(error){if(live())note=error?.code===4001?'You cancelled in your wallet. Your dog is still saved.':error?.code===-32002?'Your wallet already has a request open. Open it to continue.':error?.message?.startsWith('Your wallet changed')?error.message: error?.code?'The wallet could not finish. Check it before trying again.':String(error?.message||'Please refresh and try again.');}
      finally{busy=false;if(live())render();}
    }
    function button(text,action,cls='mint-button'){const b=node('button',text,cls);b.type='button';b.disabled=busy;b.addEventListener('click',()=>run(action));return b;}
    function connectButtons(parent){
      const choices=availableWallets();
      if(!choices.length){parent.append(node('p','Open this private invitation in your wallet’s browser, or use a browser with your wallet installed.','mint-help'));return;}
      const list=node('div',undefined,'mint-wallets');
      for(const choice of choices)list.append(button('Connect '+choice.name,async ticket=>{
        detach();provider=null;wallet='';
        const accounts=await choice.provider.request({method:'eth_requestAccounts'});check(ticket);
        if(!Array.isArray(accounts)||!address(accounts[0]))throw Error('Your wallet did not share an account.');
        watch(choice.provider);wallet=accounts[0];note='Wallet connected.';
      }));
      parent.append(list);
    }
    function walletSummary(parent){parent.append(node('p','Wallet: '+wallet,'mint-address'));}
    async function broadcast(ticket, kind, tx, extra){
      if(!navigator.locks?.request)throw Error('Use a current browser with wallet support to send this transaction.');
      await navigator.locks.request(key,{ifAvailable:true},async lock=>{
        check(ticket);if(!lock)throw Error('This invitation has a wallet request open in another tab.');
        loadPending();if(storageError)throw Error('Your saved transaction record could not be read. Check your wallet activity before continuing.');if(pending)throw Error('A transaction may already be on its way. Check its progress first.');
        // Persist before opening the wallet; an ambiguous response is never retried automatically.
        const record={kind,invitationId:state.invitationId,...extra,hash:null,createdAt:now()};savePending(record);
        try{
          const result=await provider.request({method:'eth_sendTransaction',params:[tx]});
          if(!hash(result))throw Error('Check your wallet: it did not return a transaction reference.');
          // Preserve the result even if the user changed accounts while the wallet was open.
          savePending({...record,hash:result});
          check(ticket);note='Sent. We’re waiting for the confirmed record.';
        }catch(error){if(error?.code===4001)savePending(null);throw error;}
      });
    }
    function pendingView(){
      body.append(node('h2',pending.kind==='mint'?'Your dog is on the way.':'Your payment is on the way.'));
      body.append(node('p','We’ll update this page when the confirmed record arrives. You can close it and return through your invitation.'));
      if(pending.hash)body.append(node('p','Transaction: '+pending.hash,'mint-address'));
      else body.append(node('p','The wallet did not return a transaction reference. Check its activity before doing anything else. Your request will not be sent again automatically.'));
      body.append(button('Check progress',ticket=>fresh(ticket)));
      // A hash can be checked without trusting a success receipt as NFT delivery.
      if(pending.hash && wallet)body.append(button('Check wallet transaction',async ticket=>{
        await walletMatches(ticket,pending.wallet,pending.chainId);
        const receipt=await provider.request({method:'eth_getTransactionReceipt',params:[pending.hash]});check(ticket);
        if(receipt && same(receipt.transactionHash,pending.hash) && receipt.status==='0x0'){
          savePending(null);note='The transaction failed. Your dog and its recorded value have not changed. You can try again.';
        }else note=receipt?'The transaction was mined. We’re waiting for its confirmed record.':'Your wallet transaction is still pending.';
      }));
      if(!wallet)connectButtons(body);
    }
    function deliveredView(){
      const d=state.delivery,p=state.payment;
      if(!address(d.wallet)||!address(d.collection)||!uint(d.chainId)||!uint(d.tokenId)||!uint(d.tipWei)||!Number.isSafeInteger(d.tipClosesAt))throw Error('The delivery record could not be verified.');
      body.append(node('h2',d.dogName+' is yours.'),node('p','Delivered to '+short(d.wallet)+' on '+chainName(d.chainId)+'.'));
      const detail=node('details'),summary=node('summary','Your NFT');detail.append(summary,node('p','Wallet: '+d.wallet,'mint-address'),node('p','Collection: '+d.collection,'mint-address'),node('p','Token '+d.tokenId));body.append(detail);
      if(d.artistGift){body.append(node('p','We hope you love '+d.dogName+'. This is genuinely a gift from Wubbushi. No payment is due.'));return;}
      body.append(node('h3','A little something for the artist?'),node('p','Entirely up to you. Zero is welcome.'));
      body.append(node('p','Recorded value: '+weiText(d.tipWei)+' ETH','mint-value'));
      if(d.tipFinalized || now()>=d.tipClosesAt){body.append(node('p',d.tipFinalized?'The payment window is closed. This recorded value is permanent.':'The payment window is closed. We’re checking the final recorded value.'));return;}
      body.append(node('p','Send ETH by '+when(d.tipClosesAt)+'. It will automatically become your dog’s recorded value.'));
      if(storageError){body.append(node('p','Your saved transaction record could not be read. Check your wallet activity before continuing.'));return;}
      if(pending){pendingView();return;}
      if(!p?.available){body.append(node('p','Payment details are being checked. Please check back shortly.'));return;}
      if(!same(p.fromWallet,d.wallet)||p.chainId!==d.chainId||!address(p.address)||p.currency!=='ETH'||p.closesAt!==d.tipClosesAt)throw Error('The payment details could not be verified.');
      const details=node('details'),summaryPay=node('summary','Send from your wallet app');details.append(summaryPay,node('p','Use '+chainName(p.chainId)+' and send from the wallet that adopted your dog. Transfers from another wallet or after the deadline cannot count toward its value.'),node('p','To: '+p.address,'mint-address'),node('p','From: '+p.fromWallet,'mint-address'));body.append(details);
      if(!wallet){connectButtons(body);return;}walletSummary(body);
      const label=node('label','Amount in ETH'),input=node('input');input.type='text';input.inputMode='decimal';input.autocomplete='off';input.value=amount;input.placeholder='0.01';input.disabled=busy;input.addEventListener('input',()=>{amount=input.value;});label.append(input);body.append(label);
      body.append(button('Send optional payment',async ticket=>{
        const value=weiInput(amount.trim()),previous=state.payment;
        await fresh(ticket);const pay=state.payment;
        const d=state.delivery;
        if(!d || d.artistGift || d.tipFinalized || !pay?.available||!Number.isSafeInteger(pay.closesAt)||now()>=pay.closesAt)throw Error('The payment window is closed or its details are being checked.');
        if(!uint(d.tipWei)||!same(pay.address,previous.address)||pay.chainId!==previous.chainId||!same(pay.fromWallet,previous.fromWallet)||!same(pay.fromWallet,d.wallet)||pay.chainId!==d.chainId||pay.currency!=='ETH'||pay.closesAt!==d.tipClosesAt)throw Error('The payment details changed. Review them before sending.');
        await walletMatches(ticket,pay.fromWallet,pay.chainId);
        await broadcast(ticket,'tip',{from:pay.fromWallet,to:pay.address,value:'0x'+value.toString(16),data:'0x',chainId:hexChain(pay.chainId)},{wallet:pay.fromWallet,chainId:pay.chainId,before:d.tipWei,value:String(value)});
      }));
    }
    function render(){
      if(!live())return;body.replaceChildren();shell.hidden=!state.mintingReady&&!state.approval&&!state.delivery&&!state.message;status.textContent=note;shell.setAttribute('aria-busy',String(busy));
      try{
        if(state.delivery){deliveredView();return;}
        if(state.approval)approvalValid(state.approval,expected);
        if(pending){pendingView();return;}
        if(!state.mintingReady){if(!shell.hidden)body.append(node('h2','Your dog is saved.'),node('p',state.awaitingExpiryConfirmation?'We’re checking the last approval before you continue.':state.message||'NFT delivery is being checked. Please try again shortly.'));return;}
        const a=state.approval;
        body.append(node('h2','Bring '+expected.dogName+' to your wallet.'));
        if(storageError){body.append(node('p','Allow storage in this browser, then refresh before continuing.'));return;}
        if(a){body.append(node('p',chainName(a.typedData.domain.chainId)+' · Reserved until '+when(a.deadline)),node('p','Receiving wallet: '+a.wallet,'mint-address'));
          if(a.deadline<=now()){body.append(node('p','This approval has ended. We’re checking its chain record before you continue.'));return;}}
        else body.append(node('p','Use a wallet you plan to keep. Your dog and name will be reserved while you confirm.'));
        if(!wallet){connectButtons(body);return;}walletSummary(body);
        if(!a){body.append(button('Use this wallet',async ticket=>{
          const accounts=await provider.request({method:'eth_accounts'});check(ticket);
          if(!same(accounts?.[0],wallet))throw Error('Your wallet changed. Reconnect before continuing.');
          await fresh(ticket);if(!state.mintingReady||state.delivery)throw Error('Review the latest delivery details before continuing.');
          const prepared=await api.request('club/mint-prepare',{invitationId:state.invitationId,wallet});check(ticket);approvalValid(prepared,expected);
          state={...state,approval:prepared};options.onLock?.(true);
        }));return;}
        if(a.status==='prepared')body.append(button('Approve adoption',async ticket=>{
          await fresh(ticket);const current=approvalValid(state.approval,expected);
          if(!state.mintingReady||state.awaitingExpiryConfirmation||current.deadline<=now())throw Error('Your approval is being checked. Please try again shortly.');
          await walletMatches(ticket,current.wallet,current.typedData.domain.chainId);
          const signature=await provider.request({method:'eth_signTypedData_v4',params:[current.wallet,JSON.stringify(current.typedData)]});check(ticket);
          await walletMatches(ticket,current.wallet,current.typedData.domain.chainId);
          if(typeof signature!=='string'||!/^0x(?:[0-9a-f]{2}){1,8192}$/i.test(signature))throw Error('Your wallet did not return an adoption approval.');
          const issued=await api.request('club/mint-issue',{invitationId:state.invitationId,reservationId:current.reservationId,signature});check(ticket);approvalValid(issued,expected);mintTransaction(issued);
          state={...state,approval:issued};note='Approved. You can now mint your dog.';
        }));
        else {body.append(node('p','Your wallet will show the network fee before you confirm.'));
          body.append(button('Mint '+expected.dogName,async ticket=>{
            await fresh(ticket);const current=approvalValid(state.approval,expected);
            if(!state.mintingReady||state.awaitingExpiryConfirmation||current.deadline<=now())throw Error('Your approval has ended or is being checked.');
            const tx=mintTransaction(current);await walletMatches(ticket,current.wallet,current.typedData.domain.chainId);
            await broadcast(ticket,'mint',tx,{reservationId:current.reservationId,wallet:current.wallet,chainId:current.typedData.domain.chainId});
          }));}
      }catch(error){body.replaceChildren(node('h2','Your dog is saved.'),node('p',error.message));}
      finally{status.textContent=note;}
    }
    async function refresh(){
      if(!live()||busy||checking||document.hidden)return;checking=true;const ticket=epoch;
      try{const before=JSON.stringify(state);await fresh(ticket,true);if(!busy&&(before!==JSON.stringify(state)||state.approval?.deadline<=now()||state.delivery?.tipClosesAt<=now()))render();}
      catch{if(live()){note='We could not check the latest record. Please try again.';state={...state,mintingReady:false,payment:state.payment?{...state.payment,available:false}:undefined};render();}}
      finally{checking=false;}
    }
    function schedule(){clearTimeout(timer);if(!live())return;timer=setTimeout(async()=>{await refresh();schedule();},8000);}
    const storageChanged=e=>{if(e.key===key){loadPending();render();}};
    const visibility=()=>{if(!document.hidden)refresh();};
    function dispose(){disposed=true;epoch++;clearTimeout(timer);detach();subscribers.delete(render);window.removeEventListener('storage',storageChanged);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',dispose);}
    loadPending();render();schedule();subscribers.add(render);window.addEventListener('storage',storageChanged);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',dispose);
    return {dispose,refresh};
  }
  window.AllDogsMint={mount};
})();
