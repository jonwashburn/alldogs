(() => {
  'use strict';
  const $=id=>document.getElementById(id), api=window.AllDogsAccount;
  let key='', data=null, selected=null, draft=null, dirty=false, busy=false, generation=0;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const btn=(text,fn,cls='')=>{const n=el('button',text,cls);n.type='button';n.onclick=fn;return n;};
  const date=n=>n?new Date(n*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
  const status=(text,error=false)=>{$('message').textContent=text;$('message').className=error?'error':'';};
  const person=()=>data?.applications.find(a=>(a.publicId||a.legacyId)===selected);
  const dogById=id=>person()?.gift?.dogs.find(d=>d.id===id)||data.dogs.find(d=>d.id===id);
  const privateImages=new Map();let imageGeneration=0;
  function clearImages(){imageGeneration++;for(const pending of privateImages.values())pending.then(url=>{if(url)URL.revokeObjectURL(url);});privateImages.clear();}
  function painting(dog){
    const img=el('img');img.alt=dog.title;
    const src=image(dog);
    if(!person()?.gift?.dogs.some(d=>d.id===dog.id)){img.src=src;return img;}
    const frame=el('div',undefined,'painting-preview'),message=el('span','Loading painting…','painting-message');
    img.hidden=true;frame.append(img,message);frame.setAttribute('aria-busy','true');
    const ticket=imageGeneration;
    const failed=()=>{if(ticket!==imageGeneration)return;frame.setAttribute('aria-busy','false');img.hidden=true;message.replaceChildren(el('span','Painting couldn’t load.'),btn('Try again',()=>{privateImages.get(src)?.then(url=>{if(url)URL.revokeObjectURL(url);});privateImages.delete(src);loadPainting();}));};
    img.onload=()=>{if(ticket!==imageGeneration)return;img.hidden=false;message.hidden=true;frame.setAttribute('aria-busy','false');};
    img.onerror=failed;
    function loadPainting(){
      message.hidden=false;message.textContent='Loading painting…';frame.setAttribute('aria-busy','true');
      if(!/^https:\/\/api[.]alldogs[.]wtf\/collection-api\/club\/art\/[a-f0-9]{64}\/wide[.]png$/.test(src)){failed();return;}
      if(!privateImages.has(src)){
        const options={headers:{Authorization:'Bearer '+key},credentials:'omit',cache:'no-store',redirect:'error'};
        privateImages.set(src,fetch(src.replace('/wide.png','/preview.webp'),options).then(async response=>{
          // Older gifts may not yet have a small preview. Their original stays available.
          if([404,503].includes(response.status))response=await fetch(src,options);
          if(!response.ok)throw Error('Preview unavailable');
          const blob=await response.blob();if(ticket!==imageGeneration)return null;
          return URL.createObjectURL(blob);
        }).catch(()=>null));
      }
      privateImages.get(src).then(url=>{if(ticket!==imageGeneration)return;if(url)img.src=url;else failed();});
    }
    loadPainting();return frame;
  }
  const image=dog=>dog.variants?.[0]?.src||dog.original;
  const invited=a=>a.viewing&&['invited','claimed'].includes(a.viewing.status)||a.invitation&&a.invitation.status!=='revoked';
  function label(a){if(a.status==='awaiting_verification')return 'Awaiting X verification';if(a.status==='adopted'||a.gift?.status==='accepted')return 'Adopted';if(['rejected','withdrawn'].includes(a.status))return a.status;if(a.mail&&['unknown','failed'].includes(a.mail.status)&&invited(a))return 'Email needs attention';if(invited(a))return a.invitation?.dogName?'Dog chosen':'Invited';if(a.viewing?.status==='draft')return 'Draft';return a.vouch?.valid?'Ready to invite':'Awaiting a vouch';}
  function markDirty(){dirty=true;const hint=$('draft-hint');if(hint)hint.textContent=person()?.gift?'Unsaved changes · these paintings are reserved for this gift.':'Unsaved changes · dogs are reserved when you send.';}
  function field(labelText,input){const group=el('div',undefined,'form-section'),label=el('label',labelText);label.htmlFor=input.id;group.append(label,input);return group;}
  function badge(text,kind=''){return el('span',text,'badge '+kind);}
  function resetDraft(a){draft={publicId:a.publicId,dogIds:[...(a.viewing?.dogIds||[])],note:a.viewing?.note||'',email:a.viewing?.email||a.email||'',founding:a.viewing?.founding||false,revision:a.viewing?.revision||0};dirty=false;}
  function lock(){generation++;clearImages();key='';data=null;selected=null;draft=null;dirty=false;$('people').replaceChildren();$('detail').replaceChildren();$('stats').replaceChildren();$('vouch-controls').replaceChildren();$('preview-body').replaceChildren();$('preview').close();$('workspace').hidden=true;$('login').hidden=false;$('close').hidden=true;$('refresh').hidden=true;$('key').value='';status('Desk locked.');$('key').focus();}
  async function load(){const ticket=++generation;const fresh=await api.request('club/desk',undefined,key);if(ticket!==generation)return;data=fresh;$('login').hidden=true;$('workspace').hidden=false;$('close').hidden=false;$('refresh').hidden=false;if(!person())selected=data.applications[0]?.publicId||data.applications[0]?.legacyId||null;if(person())resetDraft(person());render();}
  function render(){
    const counts=[['On the list',data.applications.length],['Current vouches',data.applications.filter(a=>a.vouch?.valid).length],['Drafts',data.applications.filter(a=>a.viewing?.status==='draft').length],['Invited',data.applications.filter(invited).length]];
    $('stats').replaceChildren(...counts.map(([label,n])=>{const div=el('div',undefined,'stat');div.append(el('strong',String(n)),el('span',label));return div;}));
    renderPeople();renderDetail();renderVouchControls();
  }
  async function controlVouches(body, message){
    if(dirty){status('Save your invitation draft before changing vouching controls.',true);return;}
    await run(async()=>{await api.request('club/admin-vouch',body,key);await load();status(message);});
  }
  function renderVouchControls(){
    const root=$('vouch-controls');root.replaceChildren();
    root.append(el('p','Your vouches are unlimited. Everyone else uses a rolling seven-day allowance. Issued vouches never expire.'));
    const form=el('form'),label=el('label','Vouches per person per week'),input=el('input');input.type='number';input.min='1';input.max='1000';input.required=true;input.value=data.vouchPolicy.weeklyLimit;label.append(input);
    const save=el('button','Save allowance');save.type='submit';form.append(label,save);form.onsubmit=event=>{event.preventDefault();controlVouches({weeklyLimit:Number(input.value)},'Weekly vouch allowance updated.');};root.append(form);
    root.append(el('p','Disabling someone stops new vouches. Their existing vouches stay valid. Restoring access still applies the sale rules.','muted'));
    for(const owner of data.vouchers){const row=el('div',undefined,'vouch-permission'),info=el('div');info.append(el('strong','@'+owner.handle),el('span',owner.disabled?'Disabled':owner.reason==='sold_own_dog'?'Unavailable: sold their dog':owner.reason==='invitee_sold'?'Unavailable: an invitee sold their dog':owner.reason==='chain_syncing'?'Checking the latest dog transfers':owner.slots+' available this week','muted'));row.append(info,btn(owner.disabled?'Restore vouching':'Disable vouching',()=>controlVouches({ownerId:owner.ownerId,disabled:!owner.disabled},'Vouching permission updated.')));root.append(row);}
    if(!data.vouchers.length)root.append(el('p','Confirmed adopters will appear here.','muted'));
  }
  function renderPeople(){
    const q=$('search').value.trim().toLowerCase(),filter=$('filter').value;
    const apps=data.applications.filter(a=>[a.handle,a.currentHandle,a.email,a.viewing?.email,a.claimedVoucher,a.vouch?.handle].filter(Boolean).join(' ').toLowerCase().includes(q)).filter(a=>filter==='all'||filter==='waiting'&&!invited(a)&&!['adopted','rejected','withdrawn'].includes(a.status)||filter==='vouched'&&a.vouch?.valid||filter==='draft'&&a.viewing?.status==='draft'||filter==='invited'&&invited(a)||filter==='attention'&&invited(a)&&['failed','unknown'].includes(a.mail?.status));
    $('list-count').textContent=apps.length+' of '+data.applications.length+' people';
    $('people').replaceChildren(...apps.map(a=>{const id=a.publicId||a.legacyId,b=btn('',()=>{if(busy)return;if(dirty&&!confirm('Leave these unsaved changes?'))return;selected=id;resetDraft(a);renderPeople();renderDetail();});b.className='person';b.setAttribute('aria-pressed',String(selected===id));b.append(el('strong','@'+(a.currentHandle||a.handle)),el('small',a.vouch?'Vouched by @'+a.vouch.handle+(a.vouch.valid?'':' · '+a.vouch.status):a.claimedVoucher?'Referral claimed: @'+a.claimedVoucher:'No verified vouch'),badge(label(a),a.vouch?.valid?'good':a.mail&&['unknown','failed'].includes(a.mail.status)?'warn':''));return b;}));
    if(!apps.length)$('people').append(el('p','No people match this view.','empty'));
  }
  function fact(title,text){const n=el('div',undefined,'fact');n.append(el('p',title,'eyebrow'),el('p',text));return n;}
  function renderNFTDelivery(root,d){
    if(!d)return;
    const card=el('section',undefined,'nft-delivery');card.setAttribute('aria-label','NFT delivery');
    card.append(el('h3','NFT delivered'),el('p',d.dogName+' · adopted '+date(d.adoptedAt)));
    const facts=el('div',undefined,'facts');facts.append(fact('Original adoption wallet',d.wallet),fact('NFT',(({1:'Ethereum',11155111:'Ethereum Sepolia'})[d.chainId]||'Network '+d.chainId)+' · token '+d.tokenId),fact('Collection',d.collection));
    const h=d.ownership,validAddress=v=>typeof v==='string'&&/^0x[0-9a-f]{40}$/i.test(v);
    const verified=h?.status==='verified'&&validAddress(h.currentWallet)&&validAddress(h.originalWallet)&&h.originalWallet.toLowerCase()===d.wallet.toLowerCase()&&h.tokenId===d.tokenId&&Number.isSafeInteger(h.asOfBlock)&&h.asOfBlock>=0&&Number.isSafeInteger(h.checkedAt)&&Date.now()/1000-h.checkedAt>=0&&Date.now()/1000-h.checkedAt<=300;
    if(verified){facts.append(fact('Confirmed holder',h.currentWallet));card.append(facts,el('p','Holder at finalized block '+h.asOfBlock+' · checked '+new Date(h.checkedAt*1000).toLocaleString()+'. Refresh the desk to check again.','muted'));}
    else{facts.append(fact('Current holder','Checking the latest confirmed record.'));card.append(facts);}
    card.append(el('p','The original adopter stays on the record when the dog moves to another wallet.','muted'));root.append(card);
  }
  function renderDetail(){
    const root=$('detail'),a=person();root.replaceChildren();if(!a){root.append(el('p','The next good person will appear here.','empty'));return;}
    const header=el('div',undefined,'detail-header'),heading=el('div');heading.append(el('p','Application · '+date(a.createdAt),'eyebrow'),el('h2','@'+(a.currentHandle||a.handle)),el('p',a.identityVerified?'X account verified':'Awaiting X verification — details are self-reported.','muted'));header.append(heading,badge(label(a),a.vouch?.valid?'good':''));root.append(header);
    const facts=el('div',undefined,'facts');
    facts.append(fact('Wallet preference', ({existing:'Existing wallet',new:'Needs a wallet',help:'Would like help',later:'Will provide later'})[a.walletChoice] || 'Not recorded'),fact('Wallet supplied on application',a.wallet ? a.wallet + ' · self-reported' : 'Not provided'),fact('Who vouched',a.vouch?'@'+a.vouch.handle+' · '+(a.vouch.valid?'Current vouch':a.vouch.status)+(a.vouch.expiresAt?' · '+(a.vouch.valid?'expires ':'expired ')+date(a.vouch.expiresAt):''):a.claimedVoucher?'@'+a.claimedVoucher+' was named by the applicant. No verified vouch is recorded.':'No verified vouch is recorded.'),fact('Their wishlist',a.wishlist.length?a.wishlist.map(id=>dogById(id)?.title||id).join(' · '):'They haven’t saved any favorites yet.'));root.append(facts);if(a.status==='awaiting_verification'){root.append(el('p','Their application is saved. They can confirm X from the waitlist form; invitation controls will appear afterward.','muted'));return;}
    renderNFTDelivery(root,a.delivery);
    if(a.note)root.append(el('p',a.note,'note'));
    if(a.publicId&&['awaiting_vouch','vouched'].includes(a.status)&&!a.vouch?.valid)root.append(btn('Vouch for @'+(a.currentHandle||a.handle),()=>controlVouches({publicId:a.publicId},'Your permanent vouch is recorded. You have unlimited vouches.'),'primary'));

    if(!a.publicId||['adopted','rejected','withdrawn'].includes(a.status)){root.append(el('p',!a.publicId?'This older application needs a current application before a private viewing can be assigned.':'This application is closed.','muted'));return;}
    if(a.gift?.status==='accepted'){root.append(el('h3','Adopted'),dogPreview([a.gift.selectedDog]),fact('Her dog’s name',a.gift.dogName));return;}
    if(a.gift?.status==='revoked'){root.append(el('p','This artist gift has been withdrawn.','muted'));return;}
    if(invited(a)){renderSent(root,a);return;}
    if(a.gift)root.append(el('h3','A personal gift for '+a.gift.greeting),el('p','Her paintings are reserved. The invitation opens her private viewing directly.','muted'));
    const email=el('input');email.type='email';email.id='recipient';email.autocomplete='off';email.placeholder='person@example.com';email.value=draft.email;email.maxLength=254;email.oninput=()=>{draft.email=email.value;markDirty();};const emailField=field('Invitation email',email);emailField.append(el('p',a.emailVerified?'Applicant-verified address.':a.email?'Provided by the applicant; address not verified.':'Add the recipient’s email address to send their invitation.','muted email-note'));root.append(emailField);
    const note=el('textarea');note.id='personal-note';note.rows=3;note.maxLength=1000;note.placeholder='A personal note from you…';note.value=draft.note;note.oninput=()=>{draft.note=note.value;markDirty();};root.append(field('A note from Wubbushi',note));
    if(!a.gift){
    const override=el('label',undefined,'override'),check=el('input');check.type='checkbox';check.id='founding';check.checked=draft.founding;check.onchange=()=>{draft.founding=check.checked;markDirty();};override.append(check,document.createTextNode('Founding invitation — invite directly without a vouch. Explain why in your personal note.'));root.append(override);
    }
    if(a.gift){root.append(dogPreview(draft.dogIds));}else{
    const section=el('section',undefined,'form-section'),headingRow=el('div',undefined,'section-heading');headingRow.append(el('h3','Choose their dogs'),el('span','','selection-count'));headingRow.lastChild.id='selection-count';section.append(headingRow,el('p','Choose one, two, or three. Wishlist favorites appear first.','muted'));
    const search=el('input');search.type='search';search.id='dog-search';search.className='dog-search';search.placeholder='Find a painting…';search.setAttribute('aria-label','Find a painting');search.oninput=()=>renderDogs();const chips=el('div',undefined,'chosen-strip');chips.id='chosen';const grid=el('div',undefined,'dogs');grid.id='dogs';section.append(search,chips,grid);root.append(section);
    }
    const actions=el('div',undefined,'actions');actions.append(btn('Save draft',()=>run(async()=>{await saveDraft();status('Draft saved. No email has been sent.');})),btn('Review invitation →',()=>run(async()=>{await saveDraft();openPreview();}),'primary'));root.append(actions);const hint=el('p',a.gift?'These paintings are reserved for her. Saving a draft does not send an email.':draft.revision?'Draft saved · dogs are reserved when you send.':'Dogs are reserved when you send. Saving a draft does not send an email.','draft-hint');hint.id='draft-hint';root.append(hint);
    if(!data.capabilities.email)root.append(el('p','Email sending is not configured yet. You can save drafts.','muted'));
    if(!a.gift)renderDogs();
  }
  function renderDogs(){
    const q=$('dog-search').value.toLowerCase(),a=person();$('selection-count').textContent=draft.dogIds.length+' / 3 selected';$('chosen').replaceChildren(...draft.dogIds.map((id,i)=>{const b=btn((i+1)+'. '+(dogById(id)?.title||id)+' ×',()=>{draft.dogIds=draft.dogIds.filter(d=>d!==id);markDirty();renderDogs();},'chosen-chip');b.setAttribute('aria-label','Remove '+(dogById(id)?.title||id));return b;}));
    const dogs=[...data.dogs].sort((x,y)=>(a.wishlist.includes(y.id)?1:0)-(a.wishlist.includes(x.id)?1:0));
    $('dogs').replaceChildren(...dogs.filter(d=>d.title.toLowerCase().includes(q)).map(d=>{const index=draft.dogIds.indexOf(d.id),selected=index>=0,blocked=d.adopted||Boolean(d.reservedBy);const b=btn('',()=>{if(selected)draft.dogIds.splice(index,1);else if(draft.dogIds.length<3)draft.dogIds.push(d.id);markDirty();renderDogs();},'dog');b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',(selected?'Remove ':'Select ')+d.title);b.disabled=blocked||!selected&&draft.dogIds.length>=3;const img=el('img');img.src=image(d);img.alt=d.title;img.loading='lazy';b.append(img,el('span',d.title,'dog-title'));if(selected)b.append(el('span',String(index+1),'dog-number'));if(a.wishlist.includes(d.id))b.append(el('span','On their wishlist','wish'));if(blocked)b.append(el('span',d.adopted?'Adopted':'Reserved for another viewing','dog-state'));return b;}));
    if(!$('dogs').children.length)$('dogs').append(el('p','No paintings match that search.','muted'));
  }
  function dogPreview(ids){const list=el('div',undefined,'preview-dogs'+(person()?.gift?' gift-dogs':''));for(const id of ids){const dog=dogById(id);if(!dog)continue;const card=el('div'),img=painting(dog);card.append(img,el('p',dog.title));list.append(card);}return list;}
  function renderSent(root,a){
    root.append(el('h3','Their private viewing'),dogPreview(a.viewing?.dogIds||a.invitation?.dogIds||[]));if(a.viewing?.note)root.append(el('p',a.viewing.note,'note'));
    const choice=a.gift||a.invitation;if(choice?.dogName)root.append(fact('Their saved choice',choice.dogName+' · '+(dogById(choice.selectedDog)?.title||choice.selectedDog)));
    const delivery=el('div',undefined,'delivery'),mail=a.mail;
    if(mail){delivery.append(el('h3',mail.status==='accepted'?'Invitation accepted by Resend':mail.status==='sending'?'Sending invitation…':'Invitation email needs attention'),el('p','To: '+mail.recipient));if(mail.status==='accepted')delivery.append(el('p','Sent '+date(mail.sent_at)+'. Inbox delivery is not confirmed here.'));if(mail.error)delivery.append(el('p',mail.error,'error'));if(mail.provider_id){const link=el('a','View this message in Resend ↗');link.href='https://resend.com/emails/'+encodeURIComponent(mail.provider_id);link.target='_blank';link.rel='noopener noreferrer';delivery.append(link);}if(mail.status!=='accepted')delivery.append(btn('Retry this email',()=>run(async()=>{const result=await api.request('club/admin-send',{publicId:a.publicId,revision:a.viewing.revision},key);await load();status(result.mail?.status==='accepted'?'Invitation accepted by Resend.':result.mail?.error||'This email is still being processed.',result.mail?.status==='failed'||result.mail?.status==='unknown');})));}
    else delivery.append(el('h3','Viewing exists · no email recorded'),el('p','This invitation was created in the old desk. Withdraw it below to prepare an email invitation.'));
    root.append(delivery,el('p',a.viewing?.status==='claimed'?'They opened their private invitation.':a.identityVerified||a.gift?'Their email link opens the private viewing directly.':'The private email link opens only this viewing. This older application has not verified X.','muted'));
    root.append(btn('Withdraw invitation',()=>{if(confirm('Withdraw this invitation and release its dogs? Its private link will stop working. An email already sent cannot be recalled.'))run(async()=>{await api.request('club/admin-revoke',{publicId:a.publicId},key);await load();status('Invitation withdrawn. Its dogs are available again.');});},'danger'));
  }
  async function saveDraft(){if(!draft.dogIds.length)throw Error('Choose at least one dog.');const result=await api.request('club/admin-save',draft,key);draft.revision=result.revision;await load();}
  function openPreview(){const a=person();if(!draft.email)throw Error('Add the recipient’s email address.');if(!a.gift&&!a.vouch?.valid&&!draft.founding)throw Error('A current vouch is needed, or choose a founding invitation with a personal note.');if(draft.founding&&!draft.note.trim())throw Error('Add a personal note explaining the founding invitation.');if(!data.capabilities.email)throw Error('Email sending is not configured yet. Your draft is saved.');const body=$('preview-body');body.replaceChildren(el('p','To: '+draft.email,'preview-to'),el('p','X account: @'+a.handle,'preview-to'),dogPreview(a.gift?[a.gift.coverDogId]:draft.dogIds));const letter=el('div',undefined,'preview-letter');letter.append(el('p','From Wubbushi <wubbushi@alldogs.wtf>','muted'),el('h2','A dog, just for you.'),el('p',(a.gift?.greeting||'@'+a.handle)+','),el('p',draft.note||'I chose '+draft.dogIds.length+' '+(draft.dogIds.length===1?'dog':'dogs')+' for you to meet.'),el('p',a.gift?'Love,\nWubbushi':'Wubbushi'),el('p','The private email link opens their viewing directly. They won’t need to sign in again.','muted'));body.append(letter);$('send-message').textContent='';$('send').textContent='Send to '+draft.email;$('preview').showModal();}
  async function run(fn){if(busy)return;busy=true;$('detail').inert=true;$('detail').setAttribute('aria-busy','true');$('send').disabled=true;$('close').disabled=true;$('refresh').disabled=true;try{await fn();}catch(e){status(e.message,true);if($('preview').open)$('send-message').textContent=e.message;}finally{busy=false;$('detail').inert=false;$('detail').removeAttribute('aria-busy');$('send').disabled=false;$('close').disabled=false;$('refresh').disabled=false;}}
  $('key-form').onsubmit=e=>{e.preventDefault();if(busy)return;key=$('key').value.trim();$('key').value='';run(async()=>{try{await load();status(data.applications.length+' people on your private waitlist.');}catch(e){key='';throw e;}});};
  $('search').oninput=renderPeople;$('filter').onchange=renderPeople;
  $('refresh').onclick=()=>{if(dirty&&!confirm('Refresh and discard unsaved changes?'))return;run(async()=>{await load();status('Waitlist refreshed.');});};
  $('close').onclick=()=>{if(dirty&&!confirm('Lock the desk and discard unsaved changes?'))return;lock();};
  for(const id of ['preview-close','preview-back'])$(id).onclick=()=>{if(!busy)$('preview').close();};
  $('preview').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('send').onclick=()=>run(async()=>{const a=person();$('send-message').textContent='Sending your invitation…';const result=await api.request('club/admin-send',{publicId:a.publicId,revision:draft.revision},key);$('preview').close();await load();status(result.mail?.status==='accepted'?'Invitation accepted by Resend. The viewing is ready.':result.mail?.error||'Sending is in progress. Refresh for the result.',result.mail?.status==='failed'||result.mail?.status==='unknown');});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',lock);
})();
