(() => {
  'use strict';
  const $=id=>document.getElementById(id), api=window.AllDogsAccount;
  const reference=location.pathname.match(/^\/vouch\/([1-9][0-9]{0,4})\/?$/)?.[1] || new URLSearchParams(location.search).get('id');
  let id,identity,account,busy=false;
  async function load(){
    try{
      if(!/^[A-Za-z0-9_-]{24}$/.test(reference||'') && !(/^[1-9][0-9]{0,4}$/.test(reference||'') && Number(reference)<=10000))throw Error('This application link is incomplete. Ask the applicant to copy their link again.');
      const d=await api.request('application?id='+encodeURIComponent(reference));
      if(!/^[A-Za-z0-9_-]{24}$/.test(d.publicId||''))throw Error('We could not confirm this application. Please refresh.');
      id=d.publicId;$('public-application').hidden=false;$('applicant-handle').textContent='@'+d.handle;$('applicant-profile').href='https://x.com/'+encodeURIComponent(d.handle);$('application-status').textContent='Application by @'+d.handle;
      const labels={looking_for_vouch:'Looking for an eligible owner to vouch.',vouched:'Vouched for by @'+d.vouchedBy+'. Waiting for review by Wubbushi.',invited:'Invited into Wubbushi’s garden.',vouch_suspended:'The owner who vouched is no longer eligible. Wubbushi will review the application.',adopted:'This person has adopted their dog.'};
      $('vouch-state').textContent=labels[d.status]||'Awaiting review.';
      $('application-title').textContent=d.status==='looking_for_vouch'?'Will you vouch for me?':d.status==='adopted'?'Adoption complete.':'A step closer to a dog.';
      const shortPath=Number.isInteger(d.shortId)&&d.shortId>0&&d.shortId<=10000?'/vouch/'+d.shortId:null;
      const shareText='@'+d.handle+(d.status==='looking_for_vouch'?' is hoping to adopt an All Dogs dog. Can an eligible owner vouch for them?':' has an All Dogs adoption application.');
      $('share-application-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText)+'&url='+encodeURIComponent('https://alldogs.wtf'+(shortPath||'/dog-pound/application/?id='+id));
      if(shortPath&&!location.pathname.startsWith('/vouch/'))history.replaceState(null,'',shortPath);
      $('sign-vouch').hidden=true;$('withdraw-vouch').hidden=true;$('connect-owner').hidden=true;
      identity=await api.session();account=identity.signedIn?await api.request('club/account'):null;
      $('connect-owner').href=api.signIn(shortPath||'/lounge/');
      $('connect-owner').hidden=identity.signedIn||!identity.capabilities.xLogin||['adopted','invited'].includes(d.status);
      const mine=account?.vouches.find(v=>v.publicId===id&&v.status==='active');
      $('sign-vouch').hidden=!account?.owner?.vouch.eligible||d.status!=='looking_for_vouch'||d.handle===identity.handle;
      $('withdraw-vouch').hidden=!mine||['adopted','invited'].includes(d.status);
      if(!identity.signedIn)$('wallet-status').textContent=identity.capabilities.xLogin?'Sign in with X to vouch. No wallet connection.':'Sign-in could not be started. Please try again. You can still share this application.';
      else if(!account.owner)$('wallet-status').textContent='Signed in as @'+identity.handle+'. Only confirmed dog owners can vouch.';
      else $('wallet-status').textContent='Signed in as @'+identity.handle+'. '+account.owner.vouch.slots+' of 3 vouches available.';
    }catch(e){if(!id)$('public-application').hidden=true;$('application-status').textContent=e.message;}
  }
  async function vouch(action){
    if(busy||!id)return;busy=true;$('sign-vouch').disabled=true;$('withdraw-vouch').disabled=true;
    try{await api.request('club/'+action,{publicId:id});await load();$('wallet-status').textContent=action==='vouch'?'Your vouch is recorded for five days. Wubbushi will review the application.':'Your vouch is withdrawn.';}
    catch(e){$('wallet-status').textContent=e.message;}
    finally{busy=false;$('sign-vouch').disabled=false;$('withdraw-vouch').disabled=false;}
  }
  $('sign-vouch').addEventListener('click',()=>vouch('vouch'));$('withdraw-vouch').addEventListener('click',()=>vouch('withdraw'));load();
})();
