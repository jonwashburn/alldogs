(() => {
  'use strict';
  const $=id=>document.getElementById(id),base='https://api.alldogs.wtf/collection-api/';
  const reference=location.pathname.match(/^\/vouch\/([1-9][0-9]{0,4})\/?$/)?.[1] || new URLSearchParams(location.search).get('id');
  let id=null,wallet=null,busy=false;
  async function api(path,body) {
    const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
    try{const r=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'omit',cache:'no-store',signal:c.signal});const d=await r.json();if(!r.ok)throw Error(d.error||'We could not confirm the request. Refresh this page before trying again.');return d;}finally{clearTimeout(t);}
  }
  async function load(){
    try{
      if(!/^[A-Za-z0-9_-]{24}$/.test(reference||'') && !(/^[1-9][0-9]{0,4}$/.test(reference||'') && Number(reference)<=10000))throw Error('This application link is incomplete. Ask the applicant to copy their link again.');
      const d=await api('application?id='+encodeURIComponent(reference));
      if(!/^[A-Za-z0-9_-]{24}$/.test(d.publicId||''))throw Error('We could not confirm this application. Please refresh.');
      id=d.publicId;
      $('public-application').hidden=false;$('applicant-handle').textContent='@'+d.handle;$('applicant-profile').href='https://x.com/'+encodeURIComponent(d.handle);
      $('application-status').textContent='Application by @'+d.handle;
      const labels={looking_for_vouch:'Looking for an eligible owner to vouch.',vouched:'Vouched for by @'+d.vouchedBy+'. Waiting for review by Wubbushi.',vouch_suspended:'The owner who vouched is no longer eligible. Wubbushi will review the application.',adopted:'This person has adopted their dog.'};
      $('vouch-state').textContent=labels[d.status]||'Awaiting review.';
      const titles={looking_for_vouch:'Will you vouch for me?',vouched:'An owner has vouched.',vouch_suspended:'Application under review.',adopted:'Adoption complete.'};
      $('application-title').textContent=titles[d.status]||'Adoption application.';
      $('sign-vouch').hidden=!wallet||d.status!=='looking_for_vouch';
      $('withdraw-vouch').hidden=!wallet||!['vouched','vouch_suspended'].includes(d.status);
      $('connect-owner').hidden=!!wallet||d.status==='adopted';
      const shareText=d.status==='looking_for_vouch'?'@'+d.handle+' is hoping to adopt an ALL DOGS dog. Can an eligible owner vouch for them?':d.status==='adopted'?'@'+d.handle+' has adopted a dog from ALL DOGS.':'Follow the ALL DOGS adoption application from @'+d.handle+'.';
      const shortPath=Number.isInteger(d.shortId)&&d.shortId>0&&d.shortId<=10000?'/vouch/'+d.shortId:null;
      $('share-application-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText)+'&url='+encodeURIComponent('https://alldogs.wtf'+(shortPath||'/dog-pound/application/?id='+id));
      if(shortPath && !location.pathname.startsWith('/vouch/')) history.replaceState(null,'',shortPath);
    }catch(e){$('public-application').hidden=true;$('application-status').textContent=e.name==='AbortError'?'The application took too long to load. Please refresh.':e.message;}
  }
  $('connect-owner').addEventListener('click',async()=>{
    if(busy)return;busy=true;$('connect-owner').disabled=true;
    try{if(!window.ethereum?.request)throw Error('Open this link in your Ethereum wallet browser, or use a browser with your Ethereum wallet extension installed.');const accounts=await window.ethereum.request({method:'eth_requestAccounts'});if(!accounts[0])throw Error('No wallet selected. Connect your owner wallet to continue.');wallet=accounts[0];$('wallet-status').textContent='Connected '+wallet.slice(0,6)+'…'+wallet.slice(-4)+'. Eligibility is checked when you vouch.';await load();}
    catch(e){$('wallet-status').textContent=e.code===4001?'Wallet connection cancelled.':e.message;}finally{busy=false;$('connect-owner').disabled=false;}
  });
  async function sign(action){
    if(busy||!wallet||!id)return;busy=true;$('sign-vouch').disabled=true;$('withdraw-vouch').disabled=true;
    try{
      const accounts=await window.ethereum.request({method:'eth_accounts'});
      if(!accounts[0]||accounts[0].toLowerCase()!==wallet.toLowerCase())throw Error('Your selected wallet changed. Refresh this page, then connect your owner wallet again.');
      const challenge=await api('vouch-challenge',{publicId:id,wallet,action});
      $('wallet-status').textContent='Review and sign the message in your wallet. This does not send a transaction or payment.';
      const hex='0x'+Array.from(new TextEncoder().encode(challenge.message),b=>b.toString(16).padStart(2,'0')).join('');
      const signature=await window.ethereum.request({method:'personal_sign',params:[hex,wallet]});
      await api('vouch',{challengeId:challenge.challengeId,signature});
      $('wallet-status').textContent=action==='vouch'?'Your vouch is recorded. Wubbushi will review the application.':'Your vouch is withdrawn. You have a free slot again.';
      await load();
    }catch(e){$('wallet-status').textContent=e.code===4001?'Signing cancelled. Nothing was changed.':e.name==='AbortError'?'We could not confirm the result. Refresh the application before trying again.':e.message;}
    finally{busy=false;$('sign-vouch').disabled=false;$('withdraw-vouch').disabled=false;}
  }
  $('sign-vouch').addEventListener('click',()=>sign('vouch'));$('withdraw-vouch').addEventListener('click',()=>sign('withdraw'));
  if(window.ethereum?.on)window.ethereum.on('accountsChanged',()=>{wallet=null;$('wallet-status').textContent='Wallet changed. Please reconnect.';load();});
  load();
})();
