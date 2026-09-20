(() => {
 'use strict';
 const $=id=>document.getElementById(id),picture=$('garden-dog'),image=$('garden-dog-image');
 let generation=0,selected=null,subjectsPromise;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const word=(key,alt)=>{const img=node('img');img.src='/viewing-room/garden/'+key+'.webp';img.alt=alt;return img;};
 const original=dog=>dog.original||dog.variants?.at(-1)?.src;
 const full=dog=>dog.variants?.reduce((best,v)=>!best||v.width>best.width?v:best,null)?.src||dog.artwork||original(dog);
 function customSubject(dog){
  const g=dog.garden;if(!g||g.original!==dog.original)return null;
  const {width,height,bounds}=g;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192)return null;
  if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite))return null;
  const [x0,y0,x1,y1]=bounds;if(x0<0||y0<0||x1<=x0||y1<=y0||x1>width||y1>height)return null;
  try{const url=new URL(g.cutout,location.href);
   if(url.protocol!=='https:'&&url.origin!==location.origin)return null;
   if(url.username||url.password)return null;
   return {source:url.href,bounds,width,height,ceremony:g.presentation==='ceremony',canopy:g.framing==='canopy'};
  }catch{return null;}
 }
 function clear(){
  generation++;selected=null;delete document.body.dataset.customGarden;delete document.body.dataset.ceremony;delete document.body.dataset.ceremonyCanopy;picture.hidden=true;image.removeAttribute('src');image.alt='';
  document.body.dataset.gardenState='waiting';
  $('garden-choice-below')?.remove();
  $('large-painting').removeAttribute('src');$('large-painting').alt='';
  if($('painting-lightbox').open)$('painting-lightbox').close();
 }
 function openOriginal(){
  if(!selected)return;
  $('large-painting').src=full(selected);$('large-painting').alt=selected.title+', the original painting by Wubbushi.';
  $('painting-lightbox').setAttribute('aria-label',selected.title+', the original painting');
  $('painting-lightbox').showModal();
 }
 picture.addEventListener('click',openOriginal);
 function loadImage(src){
  const img=new Image();img.src=src;let timer;
  return Promise.race([img.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The painting is taking a little longer. Try again.')),15000);})]).finally(()=>clearTimeout(timer));
 }
 function subjects(){
  if(!subjectsPromise)subjectsPromise=fetch('/viewing-room/garden/subjects.json?v=20260918-garden1',{credentials:'omit',signal:AbortSignal.timeout(15000)})
   .then(response=>{if(!response.ok)throw Error('Garden unavailable');return response.json();}).catch(()=>null);
  return subjectsPromise;
 }
 async function mount(content,data,change,mintState=null){
  const artistGift=data.adoptionKind==='artist_gift';
  const accepted=artistGift&&['accepted','delivered'].includes(data.status);
  const delivered=data.nftDelivery==='delivered';let mintLocked=Boolean(mintState?.approval||mintState?.unavailable||delivered);
  if(accepted||delivered){const chosen=data.dogs.find(d=>d.id===data.selectedDog);if(!chosen)throw Error('Your saved dog could not be found. Please refresh.');data={...data,dogs:[chosen]};}
  const room=++generation;let index=-1,requested=Math.max(0,data.dogs.findIndex(d=>d.id===data.selectedDog)),request=0;
  let committing=false;
  const drafts=new Map();if(data.selectedDog)drafts.set(data.selectedDog,data.dogName||'');
  const controls=node('div',undefined,'room-controls'),caption=node('div',undefined,'room-caption');
  const title=node('h2'),count=node('p');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');caption.append(title,count);
  const previous=node('button'),next=node('button');
  for(const [button,key,label] of [[previous,'previous','Previous dog'],[next,'next','Next dog']]){
   button.type='button';button.setAttribute('aria-label',label);button.setAttribute('aria-controls','garden-dog');
   const arrow=node('img');arrow.src='/painting/'+key+'.webp';arrow.alt='';button.append(arrow);
  }
  const options=[],toggle=data.dogs.length===2;
  let switcher;
  if(toggle){
   switcher=node('fieldset',undefined,'garden-options');switcher.append(node('legend','Choose your scene'));
   data.dogs.forEach((dog,i)=>{
    const label=node('label'),input=node('input'),text=node('span',dog.optionLabel||dog.title);
    input.type='radio';input.name='garden-option';input.value=dog.id;input.setAttribute('aria-controls','garden-dog');
    input.addEventListener('change',()=>{if(input.checked&&!mintLocked)show(i);});label.append(input,text);switcher.append(label);options.push(input);
   });content.append(switcher);controls.classList.add('room-controls-toggle');
  }
  if(data.dogs.length===1)controls.classList.add('room-controls-single');
  controls.append(previous,caption,next);content.append(controls);previous.hidden=next.hidden=data.dogs.length===1||toggle;
  async function commit(action,body,message){
   if(committing||room!==generation)return;committing=true;if(switcher)switcher.disabled=true;
   try{await change(action,body,message);}finally{committing=false;if(room===generation&&switcher)switcher.disabled=mintLocked;}
  }
  function choiceButton(cls){
   const b=node('button',undefined,'garden-choice '+cls);b.type='button';b.disabled=true;
   b.addEventListener('click',()=>{if(index<0||committing||mintLocked)return;form.hidden=false;name.focus({preventScroll:true});form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});});return b;
  }
  const topChoice=choiceButton('garden-choice-top'),belowChoice=choiceButton('garden-choice-below');belowChoice.id='garden-choice-below';
  // Keep the same choice directly beneath the scene and beneath its toggle.
  content.insertBefore(topChoice,controls);$('garden-stage').append(belowChoice);
  const closer=node('button',undefined,'garden-original');closer.type='button';closer.append(word('gardenOriginal','See the original'));closer.addEventListener('click',openOriginal);content.append(closer);
  if(data.note&&!data.isTest&&!accepted)content.append(node('p',data.note,'garden-personal-note'));
  const form=node('form',undefined,'room-form'),heading=node('h2','What would you call your dog?');form.hidden=true;
  const label=node('label','A name from you.'),name=node('input');name.required=true;name.maxLength=32;name.name='dog-name';name.autocomplete='off';label.append(name);
  const save=node('button',artistGift?'Adopt my dog':'Save my choice','button primary');save.type='submit';save.disabled=true;
  const cancel=node('button','Keep looking','text-button');cancel.type='button';cancel.addEventListener('click',()=>{form.hidden=true;topChoice.focus();});
  form.append(heading,label,save,cancel);content.append(form);
  const status=node('p','', 'account-message');status.setAttribute('role','status');status.setAttribute('aria-live','polite');content.append(status);
  if(accepted||delivered){
   topChoice.hidden=belowChoice.hidden=true;
   const home=node('a','Visit my dog ↗','button primary');home.href='/my-dog/';content.append(home);
   if(artistGift&&!mintState?.mintingReady&&!mintState?.delivery)content.append(node('p','We hope you love '+data.dogName+'. This is genuinely a gift from Wubbushi. No payment is due.','garden-personal-note'));
  }
  function setChoice(button,dog){
   const text='I choose '+dog.title;button.setAttribute('aria-label',text);button.replaceChildren();
   const key=dog.id==='studio-7cd6a1127ac6d4b816a5'?'chooseSupa':dog.id==='studio-f7886d58c0adfd8bdf43'?'chooseRep':'chooseDog';
   button.append(word(key,key==='chooseDog'?'I choose this dog':text));
   if(key==='chooseSupa'){const star=node('span','⭐','choice-star');star.setAttribute('aria-hidden','true');button.append(star);}
  }
  const mats=data.dogs.some(dog=>!customSubject(dog))?await subjects():null;
  async function show(i,restoreChoice=false){
   if(room!==generation||committing||(mintLocked&&!restoreChoice))return;
   if(index>=0)drafts.set(data.dogs[index].id,name.value);
   requested=(i+data.dogs.length)%data.dogs.length;const dog=data.dogs[requested],candidate=requested,serial=++request;
   save.disabled=true;topChoice.disabled=belowChoice.disabled=true;status.textContent='Meeting '+dog.title+'…';picture.setAttribute('aria-busy','true');
   const custom=customSubject(dog),matte=mats?.dogs?.[dog.id];
   const mapped=custom||(matte&&matte.original===dog.original);
   const source=custom?.source||original(dog);
   let useCustom=Boolean(custom),useMatte=Boolean(mapped&&!custom),fallback=false;
   try{
    try{await Promise.all([loadImage(source),...(useMatte?[loadImage(matte.mask)]:[])]);}
    catch(error){
     if(room!==generation||serial!==request)return;
     if(!custom)throw error;
     // A missing ceremony asset must never hide the recipient's official art.
     await loadImage(original(dog));useCustom=false;useMatte=false;fallback=true;
    }
    if(room!==generation||serial!==request)return;
    const bounds=useCustom?custom.bounds:useMatte?matte.bounds:[0,0,1000,1000],w=bounds[2]-bounds[0],h=bounds[3]-bounds[1];
    image.src=useCustom?source:original(dog);image.alt=dog.title+', painted by Wubbushi, in the garden.';
    if(useCustom||useMatte){
     image.style.maskImage=image.style.webkitMaskImage=useCustom?'none':'url("'+matte.mask+'")';
     image.style.width=(custom?.width||1000)*100/w+'%';image.style.height=(custom?.height||1000)*100/h+'%';image.style.left=-bounds[0]/w*100+'%';image.style.top=-bounds[1]/h*100+'%';
    }else{image.style.width=image.style.height='100%';image.style.maskImage=image.style.webkitMaskImage='none';image.style.left=image.style.top='0';image.alt=dog.title+', the original painting by Wubbushi.';}
    document.body.dataset.customGarden=useCustom?'true':'false';
    const ceremony=useCustom&&custom.ceremony;document.body.dataset.ceremony=ceremony?'true':'false';document.body.dataset.ceremonyCanopy=ceremony&&custom.canopy?'true':'false';
    picture.dataset.presentation=ceremony?'ceremony':useCustom||useMatte?'garden':'original';picture.style.setProperty('--dog-ratio',w/h);
    // Fit tall characters as well as long dogs without stretching their drawing.
    picture.style.setProperty('--dog-width',Math.min(43,34*w/h)+'%');
    picture.style.setProperty('--dog-mobile-width',Math.min(43,40*w/h)+'%');
    picture.setAttribute('aria-label','See the original '+dog.title+' painting');picture.hidden=false;
    selected=dog;index=candidate;name.value=drafts.get(dog.id)||'';title.textContent=dog.title;
    count.textContent=accepted||mintLocked?'Chosen by you':toggle?'Two paintings, one dog for you.':data.dogs.length===1?'Chosen for you':(candidate+1)+' of '+data.dogs.length+' · Chosen for you';
    options.forEach((input,j)=>{input.checked=j===candidate;});
    setChoice(topChoice,dog);setChoice(belowChoice,dog);
    topChoice.disabled=belowChoice.disabled=accepted||mintLocked;topChoice.hidden=belowChoice.hidden=accepted||mintLocked;form.hidden=true;
    heading.textContent='What would you call your dog?';name.value=drafts.get(dog.id)||dog.title;
    save.textContent=artistGift?'Adopt '+dog.title:'Save my choice';
    if(accepted||delivered)title.textContent=data.dogName+' is home.';
    document.body.style.setProperty('--scene-ratio',w/h);
    document.body.dataset.gardenState='invited';
    status.textContent=fallback?'Your original painting is here. The garden scene is temporarily unavailable.':useCustom||useMatte?'':'Your original painting is here.';save.disabled=accepted||mintLocked;
   }catch(error){if(room===generation&&serial===request){status.textContent=mintLocked?'The painting could not load. Refresh to try again.':'The painting could not load. Try another dog, or try again.';options.forEach((input,j)=>{input.checked=j===index;});if(index>=0&&!accepted&&!mintLocked)save.disabled=false;if(index>=0&&!accepted&&!mintLocked)topChoice.disabled=belowChoice.disabled=false;}}
   finally{if(room===generation&&serial===request)picture.setAttribute('aria-busy','false');}
  }
  previous.addEventListener('click',()=>{if(!mintLocked)show(requested-1);});next.addEventListener('click',()=>{if(!mintLocked)show(requested+1);});
  form.addEventListener('submit',event=>{
   event.preventDefault();if(accepted||mintLocked||index<0||save.disabled||room!==generation)return;
   const value=name.value.trim();if(!value){name.setCustomValidity('Give your dog a name.');name.reportValidity();return;}name.setCustomValidity('');
   save.disabled=true;
   commit(artistGift?'adopt':'choose',{dogId:data.dogs[index].id,name:value,...(artistGift?{invitationId:data.invitationId,revision:data.revision}:{})},artistGift?'': 'Your choice and name are saved.').finally(()=>{if(room===generation)save.disabled=accepted||mintLocked;});
  });
  name.addEventListener('input',()=>name.setCustomValidity(''));
  controls.addEventListener('keydown',event=>{
   if(mintLocked||data.dogs.length===1||event.target.closest('input,textarea,select,details')||document.querySelector('dialog[open]')||event.altKey||event.ctrlKey||event.metaKey)return;
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(requested+(event.key==='ArrowLeft'?-1:1));}
  });
  await show(requested,true);
  function setMintLock(locked){
   if(room!==generation)return;const becameLocked=locked&&!mintLocked;mintLocked=locked;
   if(switcher)switcher.disabled=locked||committing;previous.disabled=next.disabled=locked||committing;
   topChoice.hidden=belowChoice.hidden=accepted||locked;topChoice.disabled=belowChoice.disabled=accepted||locked;
   save.disabled=accepted||locked||committing;name.disabled=locked;if(locked){form.hidden=true;const chosen=data.dogs.findIndex(d=>d.id===data.selectedDog);if(chosen>=0&&(becameLocked||index!==chosen))show(chosen,true);}
  }
  setMintLock(mintLocked);return {setMintLock};
 }
 window.AllDogsGarden={clear,mount};

 // Cached first frames appear immediately. One native painter repaints the
 // two layers off the interaction thread, using the same score and seed.
 if(window.Worker&&window.OffscreenCanvas&&!navigator.connection?.saveData){
  let worker,timer;const stop=()=>{clearTimeout(timer);worker?.terminate();};
  const start=()=>{try{worker=new Worker('/viewing-room/garden/worker.js?v=20260918-garden1');}catch{return;}
   const keys=['ground','foreground'];const next=()=>{clearTimeout(timer);const key=keys.shift();if(!key){stop();return;}timer=setTimeout(stop,45000);worker.postMessage({key});};
   worker.onmessage=({data})=>{if(data.bitmap){const piece=document.querySelector('[data-garden-paint="'+data.key+'"]'),canvas=piece.querySelector('canvas');canvas.width=data.bitmap.width;canvas.height=data.bitmap.height;canvas.getContext('2d').drawImage(data.bitmap,0,0);data.bitmap.close();piece.dataset.painted='true';}next();};worker.onerror=stop;next();};
  if('requestIdleCallback'in window)requestIdleCallback(start,{timeout:2500});else setTimeout(start,1200);
  window.addEventListener('pagehide',stop,{once:true});
 }
})();
