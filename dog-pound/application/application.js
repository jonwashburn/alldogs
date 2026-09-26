(() => {
  'use strict';
  const $=id=>document.getElementById(id), api=window.AllDogsAccount;
  const reference=location.pathname.match(/^\/vouch\/([1-9][0-9]{0,4})\/?$/)?.[1] || new URLSearchParams(location.search).get('id');
  const signinFailed=new URLSearchParams(location.search).has('signin');
  // In-app browsers (X, Instagram, Facebook, Android WebView, iOS WKWebView without Safari) keep their own cookies, so the X sign-in cannot return to them.
  const ua=(typeof navigator!=='undefined'&&navigator.userAgent)||'';
  const inApp=/Twitter|FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|; wv\)/i.test(ua)||(/iPhone|iPad|iPod/.test(ua)&&!/Safari\//.test(ua));
  const why={weekly_limit:'You have used this week’s vouch.',disabled_by_artist:'Vouching is paused for your account.',sold_own_dog:'Owners who have sold their dog cannot vouch.',invitee_sold:'Someone you vouched for sold their dog, so vouching is closed for your account.',chain_syncing:'Your ownership record is updating. Try again in a few minutes.'};
  let id,identity,account,handle,pageUrl,busy=false;
  const say=text=>{$('wallet-status').textContent=text;};
  function help(show,text){
    $('browser-help').hidden=!show;
    if(show)$('browser-help-text').textContent=text;
  }
  async function load(){
    try{
      if(!/^[A-Za-z0-9_-]{24}$/.test(reference||'') && !(/^[1-9][0-9]{0,4}$/.test(reference||'') && Number(reference)<=10000))throw Error('This application link is incomplete. Ask the applicant to copy their link again.');
      const d=await api.request('application?id='+encodeURIComponent(reference));
      if(!/^[A-Za-z0-9_-]{24}$/.test(d.publicId||''))throw Error('We could not confirm this application. Please refresh.');
      id=d.publicId;handle=d.handle;$('public-application').hidden=false;$('applicant-handle').textContent='@'+d.handle;$('applicant-profile').href='https://x.com/'+encodeURIComponent(d.handle);$('application-status').textContent='Application by @'+d.handle;
      const labels={looking_for_vouch:'Looking for an eligible owner to vouch.',vouched:'Vouched for by @'+d.vouchedBy+'. Waiting for review by Wubbushi.',invited:'Invited into Wubbushi’s garden.',vouch_suspended:'The owner who vouched is no longer eligible. Wubbushi will review the application.',adopted:'This person has adopted their dog.'};
      $('vouch-state').textContent=labels[d.status]||'Awaiting review.';
      $('application-title').textContent=d.status==='looking_for_vouch'?'Will you vouch for me?':d.status==='adopted'?'Adoption complete.':'A step closer to a dog.';
      const shortPath=Number.isInteger(d.shortId)&&d.shortId>0&&d.shortId<=10000?'/vouch/'+d.shortId:null;
      pageUrl='https://alldogs.wtf'+(shortPath||'/dog-pound/application/?id='+id);
      const shareText='@'+d.handle+(d.status==='looking_for_vouch'?' is hoping to adopt an All Dogs dog. Can an eligible owner vouch for them?':' has an All Dogs adoption application.');
      $('share-application-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText)+'&url='+encodeURIComponent(pageUrl);
      if(shortPath&&(!location.pathname.startsWith('/vouch/')||location.search))history.replaceState(null,'',shortPath);
      $('copy-vouch-link').textContent='Copy this page’s link';
      $('sign-vouch').hidden=true;$('withdraw-vouch').hidden=true;$('connect-owner').hidden=true;$('switch-account').hidden=true;
      identity=await api.session();account=identity.signedIn?await api.request('club/account'):null;
      const open=d.status==='looking_for_vouch';
      $('connect-owner').href=api.signIn(shortPath||'/lounge/');
      $('connect-owner').textContent=signinFailed?'Try signing in with X again':'Sign in with X to vouch';
      $('connect-owner').hidden=identity.signedIn||!identity.capabilities.xLogin||!open;
      const owner=account?.owner, self=identity.signedIn&&d.handle===identity.handle;
      $('sign-vouch').textContent='Vouch for @'+d.handle;
      $('sign-vouch').hidden=!owner?.vouch.eligible||!open||self;
      if(!identity.signedIn){
        if(!open)say('');
        else if(!identity.capabilities.xLogin)say('Sign-in could not be started. Please try again. You can still share this application.');
        else if(signinFailed)say('Sign-in with X did not finish in this browser, so you are not signed in yet.');
        else say('Own a dog? Sign in with the X account on your adoption to vouch. No wallet connection.');
        if(open&&signinFailed)help(true,'This usually happens when the page was opened inside the X app, or X finished sign-in in a different browser. Copy the link, open it in Safari or Chrome, and sign in there.');
        else if(open&&inApp)help(true,'This page is open inside another app’s browser, which cannot keep you signed in. Tap the ••• or share menu and choose Open in Safari (or Open in browser), or copy the link and paste it into Safari or Chrome.');
        else help(false);
      }else{
        help(false);
        if(!owner){say('Signed in as @'+identity.handle+'. This X account is not on a confirmed adoption. Sign in with the X account that adopted your dog.');$('switch-account').hidden=!open;}
        else if(self)say('Signed in as @'+identity.handle+'. You cannot vouch for your own application.');
        else if(!open)say('Signed in as @'+identity.handle+'.');
        else if(owner.vouch.eligible)say('Signed in as @'+identity.handle+'. You have '+owner.vouch.slots+' of '+owner.vouch.weeklyLimit+(owner.vouch.weeklyLimit===1?' vouch':' vouches')+' available this week.');
        else{
          const next=owner.vouch.nextVouchAt?' Your next vouch opens '+new Date(owner.vouch.nextVouchAt*1000).toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})+'.':'';
          say('Signed in as @'+identity.handle+'. '+(why[owner.vouch.reason]||'Vouching is not available for your account right now.')+next);
        }
      }
    }catch(e){if(!id)$('public-application').hidden=true;$('application-status').textContent=e.message;}
  }
  async function vouch(action){
    if(busy||!id)return;busy=true;$('sign-vouch').disabled=true;$('withdraw-vouch').disabled=true;$('sign-vouch').textContent='Recording your vouch…';
    try{await api.request('club/'+action,{publicId:id});await load();say(action==='vouch'?'Your vouch for @'+handle+' is recorded. Wubbushi will review the application.':'Your vouch is withdrawn.');}
    catch(e){$('sign-vouch').textContent='Vouch for @'+handle;say(e.message);}
    finally{busy=false;$('sign-vouch').disabled=false;$('withdraw-vouch').disabled=false;}
  }
  async function copyLink(){
    const url=pageUrl||location.href;
    try{await navigator.clipboard.writeText(url);$('copy-vouch-link').textContent='Link copied. Paste it into Safari or Chrome.';}
    catch(_){$('copy-vouch-link').textContent=url;}
  }
  async function switchAccount(){
    try{await api.request('club/logout',{});}catch(_){}
    await load();say('Signed out. Sign in with the X account that adopted your dog. If X signs you straight back in, switch accounts in X first.');
  }
  $('sign-vouch').addEventListener('click',()=>vouch('vouch'));$('withdraw-vouch').addEventListener('click',()=>vouch('withdraw'));
  $('copy-vouch-link').addEventListener('click',copyLink);$('switch-account').addEventListener('click',switchAccount);load();
})();
