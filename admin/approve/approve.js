(() => {
  'use strict';
  const $=id=>document.getElementById(id), api=window.AllDogsAccount;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const chains={1:'Ethereum',11155111:'the Sepolia test network'};
  let key='', busy=false;
  function status(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
  function row(label,value,mono=false){const p=el('p',undefined,'approve-row');p.append(el('span',label,'approve-label'),el('span',value,mono?'approve-value mono':'approve-value'));return p;}
  // Several wallet extensions can claim window.ethereum; ask each installed wallet to announce itself (EIP-6963)
  // and prefer MetaMask, where the approval wallet lives.
  function announced(){return new Promise(resolve=>{const found=[];
    const on=event=>{const d=event.detail;if(d&&d.provider&&d.info&&!found.some(w=>w.info.uuid===d.info.uuid))found.push(d);};
    window.addEventListener('eip6963:announceProvider',on);window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(()=>{window.removeEventListener('eip6963:announceProvider',on);resolve(found);},500);});}
  async function wallet(){
    const found=await announced(),metamask=found.find(w=>w.info.rdns==='io.metamask');
    const chosen=metamask?metamask.provider:found.length===1?found[0].provider:window.ethereum;
    if(!chosen)throw Error('No wallet found here. Use MetaMask on a computer, or open this page in your wallet app’s browser.');
    return chosen;
  }
  async function signer(eth,chainId){
    const [account]=await eth.request({method:'eth_requestAccounts'});
    const current=parseInt(await eth.request({method:'eth_chainId'}),16);
    if(current!==chainId)throw Error('Switch your wallet to '+(chains[chainId]||'chain '+chainId)+', then try again.');
    return account;
  }
  async function approve(item,button){
    if(busy)return;busy=true;button.disabled=true;
    try{
      const typed=JSON.parse(JSON.stringify(item.guardianTypedData));
      typed.domain.chainId=Number(typed.domain.chainId);
      const eth=await wallet(),account=await signer(eth,typed.domain.chainId);
      status('Check the request in your wallet, then sign.');
      const signature=await eth.request({method:'eth_signTypedData_v4',params:[account,JSON.stringify(typed)]});
      await api.request('club/admin-guardian-signature',{reservationId:item.reservationId,signature},key);
      status(item.dogName+' is approved. The relay sends it next.');
      await load();
    }catch(error){status(error.message||String(error),true);button.disabled=false;}
    finally{busy=false;}
  }
  function card(item){
    const c=el('article',undefined,'approve-card');
    if(item.error){c.append(el('h2','A delivery needs review'),el('p',item.error));return c;}
    c.append(el('h2',item.dogName));
    c.append(row('For','@'+item.handle),row(item.artistGift?'A gift to':'Adopted by',item.recipient,true));
    if(item.linkedWallet)c.append(row('Second wallet',item.linkedWallet,true));
    c.append(row('Painting',item.contentHash.slice(0,10)+'…'+item.contentHash.slice(-8),true));
    c.append(row('Sign by',new Date(item.deadline*1000).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})));
    const b=el('button','Approve with my wallet','primary');b.type='button';b.onclick=()=>approve(item,b);c.append(b);
    return c;
  }
  async function load(){
    const data=await api.request('club/guardian-approvals',undefined,key);
    $('login').hidden=true;$('queue').hidden=false;$('close').hidden=false;$('refresh').hidden=false;
    const q=$('queue');q.replaceChildren();
    if(!data.mintingEnabled){q.append(el('p','Delivery is not switched on for this collection yet.','muted'));return;}
    if(!data.approvals.length){q.append(el('p','Nothing is waiting for you.','muted'));return;}
    for(const item of data.approvals)q.append(card(item));
  }
  $('key-form').onsubmit=async event=>{event.preventDefault();key=$('key').value;$('key').value='';
    try{status('');await load();}catch(error){key='';status(/review key|password/i.test(error.message||'')?'That password didn’t work. Use your desk password.':(error.message||String(error)),true);}};
  $('refresh').onclick=()=>load().catch(error=>status(error.message||String(error),true));
  $('close').onclick=()=>{key='';$('queue').replaceChildren();$('queue').hidden=true;$('login').hidden=false;$('close').hidden=true;$('refresh').hidden=true;status('');};
})();
