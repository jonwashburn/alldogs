(() => {
  'use strict';
  const api = window.AllDogsAccount, $ = id => document.getElementById(id);
  const page = document.body.dataset.accountPage;
  const content = $('account-content');
  let identity, account, busy = false;
  const words = {looking_for_vouch:'Looking for a vouch',vouched:'Vouched for. Waiting for Wubbushi.',vouch_suspended:'Vouch needs review',invited:'Your private viewing is ready',adopted:'Adopted',active:'Open',expired:'Expired',cancelled:'Withdrawn'};
  const reason = {eligible:'You can vouch.',three_outstanding:'All three vouches are in use.',sold_own_dog:'You sold your dog, so you can no longer vouch.',invitee_sold:'Someone you vouched for sold their dog, so you can no longer vouch.'};
  function node(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
  function link(text, href, cls='text-link') { const n=node('a',text,cls);n.href=href;return n; }
  function button(text, fn, cls='button') { const n=node('button',text,cls);n.type='button';n.addEventListener('click',fn);return n; }
  function card(title) { const n=node('section',undefined,'account-card');n.append(node('h2',title));content.append(n);return n; }
  function message(text) { $('account-message').textContent=text; }
  const date = seconds => new Date(seconds*1000).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const share = app => '/vouch/'+app.shortId;
  const artSrc = dog => (dog.variants?.find(v=>v.width===4000)||dog.variants?.at(-1))?.src || dog.original;
  async function change(action, body, success) {
    if (busy) return;
    busy=true;
    for(const b of content.querySelectorAll('button')) b.disabled=true;
    try { await api.request('club/'+action,body);await loadContent();message(success); }
    catch(error) {message(error.message);}
    finally {busy=false;for(const b of content.querySelectorAll('button')) b.disabled=false;}
  }
  function vouchesCard() {
    if (!account.owner) return;
    const c=card('A place for your people.');
    c.append(node('p',reason[account.owner.vouch.reason]||'Eligibility is being reviewed.'),node('p',`${account.owner.vouch.slots} of 3 vouches available.`));
    c.append(node('p','A new vouch lasts five days. If Wubbushi invites the person within that time, it stays open until they adopt or the invitation is withdrawn. There is no lifetime limit.'),link('Meet the waitlist ↗','/waitlist/'));
    if(account.vouches.length){const list=node('ul',undefined,'account-list');for(const v of account.vouches){const li=node('li'),info=node('div');info.append(link('@'+v.handle,share(v)),node('small',(words[v.status]||v.status)+(v.expiresAt?' · '+date(v.expiresAt):v.status==='active'?' · Private viewing':'')));li.append(info);if(v.status==='active'&&v.expiresAt)li.append(button('Withdraw vouch',()=>change('withdraw',{publicId:v.publicId},'Your vouch is withdrawn.')));list.append(li);}c.append(list);}
  }
  function peopleCard() {
    const c=card('The dogs you helped home.');
    if(!account.invitees.length){c.append(node('p','When someone you vouch for adopts, you’ll find them and their dog here.'));return;}
    const list=node('ul',undefined,'account-list');
    for(const person of account.invitees){const li=node('li'),info=node('div');info.append(node('strong',person.dogName),link('@'+person.handle,'https://x.com/'+encodeURIComponent(person.handle)),node('small',person.dogStatus+(person.soldAt?' · Sold':' · No sale recorded')));li.append(info);list.append(li);}c.append(list);
  }
  function lounge() {
    const app=account.application;
    if(account.owner){const c=card('Hello, @'+identity.handle+'.');c.append(node('p',account.owner.dogName+' is in your account.'),link('Go to my dog ↗','/my-dog/'));vouchesCard();return;}
    if(!app){const c=card('Already applied?');c.append(node('p','Link your application with its private receipt. Sign in with the same X account you used to apply.'));
      const form=node('form'),label=node('label','Private application receipt'),input=node('input');input.name='receipt';input.placeholder='DOG-…';input.required=true;input.maxLength=20;input.autocomplete='off';input.value=sessionStorage.getItem('alldogs-application-receipt')||'';label.append(input);const submit=node('button','Link my application','button primary');submit.type='submit';form.append(label,submit);form.addEventListener('submit',event=>{event.preventDefault();change('claim',{receipt:input.value.trim().toUpperCase()},'Your application is linked.');});c.append(form,link('Not applied yet? Start here ↗','/#apply'));return;}
    const c=card('Your application.');c.append(node('p',words[app.status]||'Under review','account-status'));
    if(app.vouchedBy)c.append(node('p','Vouched for by @'+app.vouchedBy+(app.expiresAt?'. Expires '+date(app.expiresAt)+'.':'.')));
    if(account.hasInvitation)c.append(link('Step into your private viewing ↗','/viewing-room/','button primary'));
    else c.append(node('p','Wubbushi reviews each application personally. Your invitation will appear here.'));
    const links=node('div',undefined,'account-links');links.append(link('My shareable application ↗',share(app)),link('My wishlist ↗','/dog-pound/'));c.append(links);
    const listed=card('Looking for someone to vouch?');listed.append(node('p','Put your X handle and application on the public waitlist so eligible owners can find you. Your wallet address and private receipt stay private.'));
    listed.append(button(app.listed?'Remove me from the waitlist':'Add me to the waitlist',()=>change('listing',{listed:!app.listed},app.listed?'You are no longer listed. Your application is still saved.':'You are on the public waitlist.'),'button primary'));
  }
  function myDog() {
    const dog=account.owner;
    if(!dog){const c=card('Your dog will be here.');c.append(node('p','Once your adoption is complete, this becomes your dog’s page: its name, status, and the people you helped into the pack.'),link(account.hasInvitation?'Enter your private viewing ↗':'Check my application ↗',account.hasInvitation?'/viewing-room/':'/lounge/'));return;}
    const c=card(dog.dogName);if(dog.painting){const img=node('img');img.src=artSrc(dog.painting);img.alt=dog.dogName+', '+dog.dogStatus;img.className='account-dog';c.append(img);}
    c.append(node('p',dog.dogStatus,'account-status'),node('p','Adopted '+date(dog.adoptedAt)),node('p','First adopter: @'+dog.handle),node('p',dog.vouchedBy?'Vouched for by @'+dog.vouchedBy:'Founding adoption'),node('p',dog.soldAt?'Sale recorded '+date(dog.soldAt):'No sale recorded.'),node('p','These details come from the confirmed adoption register, maintained by Wubbushi.','account-note'));
    vouchesCard();peopleCard();
  }
  async function waitlist() {
    const data=await api.request('club/waitlist');
    const c=card('Hoping to find their dog.');
    if(!data.applications.length){c.append(node('p','No one has chosen to appear here yet. Applied already? Sign in to the lounge and add your application.'),link('Go to the lounge ↗','/lounge/'));return;}
    const list=node('ul',undefined,'account-list');
    for(const app of data.applications){const li=node('li'),info=node('div');info.append(link('@'+app.handle,'https://x.com/'+encodeURIComponent(app.handle)),node('small',words[app.status]||'Awaiting review'));li.append(info);const actions=node('div',undefined,'account-links');actions.append(link('Meet the applicant ↗',share(app)));if(account?.owner?.vouch.eligible&&app.status==='looking_for_vouch'&&app.handle!==identity.handle)actions.append(link('Review & vouch ↗',share(app),'button'));li.append(actions);list.append(li);}c.append(list);
  }
  async function room() {
    if(!account.hasInvitation){const c=card('Your invitation will appear here.');c.append(node('p','When Wubbushi invites you, three hand-picked dogs will be waiting here. After applying, you can make or revisit your wishlist in the Pound. Keep your private receipt handy.'),link('My wishlist ↗','/dog-pound/'));return;}
    const data=await api.request('club/room');
    if(data.dogs.length!==3)throw Error('Your viewing needs a little attention from Wubbushi. Your choice has not changed.');
    if(data.note)content.append(node('p',data.note,'intro account-message'));
    let index=Math.max(0,data.dogs.findIndex(d=>d.id===data.selectedDog));
    const stage=node('div',undefined,'room-stage'),picture=button('',()=>{const d=data.dogs[index];$('large-painting').src=artSrc(d);$('large-painting').alt=d.title;$('painting-lightbox').showModal();},'room-picture'),img=node('img');picture.setAttribute('aria-label','Take a closer look at this painting');picture.append(img);stage.append(picture);content.append(stage);
    const controls=node('div',undefined,'room-controls'),caption=node('div',undefined,'room-caption'),title=node('h2'),count=node('p');caption.append(title,count);const prev=button('←',()=>show((index+2)%3)),next=button('→',()=>show((index+1)%3));prev.setAttribute('aria-label','Previous dog');next.setAttribute('aria-label','Next dog');controls.append(prev,caption,next);content.append(controls);
    const form=node('form',undefined,'room-form account-card'),heading=node('h2','Could this be your dog?'),label=node('label','What would you call them?'),name=node('input');name.required=true;name.maxLength=32;name.name='dog-name';name.autocomplete='off';label.append(name);const save=node('button','Save this dog and name','button primary');save.type='submit';form.append(heading,label,save,node('p','This saves your choice. It does not mint or transfer the artwork. Final adoption will open here when minting is connected.','account-note'),node('p','After you receive your dog, you have seven days to pay Wubbushi what you think the artwork is worth. Nothing is due now.','account-note'));content.append(form);
    function show(i){index=i;const d=data.dogs[i];img.src=artSrc(d);img.alt=d.title;title.textContent=d.title;count.textContent=`${i+1} of 3 · Click the painting for a closer look`;name.value=data.selectedDog===d.id?data.dogName||'':'';heading.textContent=data.selectedDog===d.id?'Your saved choice.':'Could this be your dog?';}
    form.addEventListener('submit',event=>{event.preventDefault();change('choose',{dogId:data.dogs[index].id,name:name.value.trim()},'Your choice is saved. The artwork has not been minted or transferred.');});show(index);
  }
  async function loadContent() {
    content.replaceChildren();
    account=identity.signedIn?await api.request('club/account'):null;
    if(page==='waitlist')await waitlist();
    else if(identity.signedIn){if(page==='lounge')lounge();if(page==='my-dog')myDog();if(page==='viewing-room')await room();}
  }
  async function start() {
    try {
      identity=await api.session();
      $('account-gate').hidden=identity.signedIn;$('account-logout').hidden=!identity.signedIn;
      if(!identity.signedIn){$('account-login').hidden=!identity.capabilities.xLogin;$('account-login').href=api.signIn();$('gate-title').textContent=identity.capabilities.xLogin?'Come on in.':'We’re getting the lounge ready.';$('gate-copy').textContent=identity.capabilities.xLogin?'Sign in with the X account you used to apply. Your dog, invitations, and vouches stay together here.':'X sign-in is not connected yet. Your application is safe, and you can still apply or share its link. Private viewings will open after sign-in is connected.';}
      message(new URLSearchParams(location.search).has('signin')?'Sign-in did not finish. Please try again once X sign-in is available.':identity.signedIn?'Signed in as @'+identity.handle+'.':'');
      await loadContent();
    }catch(error){message(error.message);}
  }
  $('account-logout').addEventListener('click',async()=>{try{await api.request('club/logout',{});await start();message('You’re signed out.');}catch(error){message(error.message);}});
  $('close-painting').addEventListener('click',()=>$('painting-lightbox').close());
  start();
})();
