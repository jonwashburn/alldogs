(() => {
 'use strict';
 const $=id=>document.getElementById(id),picture=$('garden-dog'),image=$('garden-dog-image');
 let generation=0,selected=null,subjectsPromise;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const word=(key,alt)=>{const img=node('img');img.src='/viewing-room/garden/'+key+'.webp';img.alt=alt;return img;};
 const original=dog=>dog.original||dog.variants?.at(-1)?.src;
 const full=dog=>(dog.variants?.find(v=>v.width===4000)||dog.variants?.at(-1))?.src||original(dog);
 function clear(){
  generation++;selected=null;picture.hidden=true;image.removeAttribute('src');image.alt='';
  document.body.dataset.gardenState='waiting';
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
 async function mount(content,data,change){
  const room=++generation;let index=-1,requested=Math.max(0,data.dogs.findIndex(d=>d.id===data.selectedDog)),request=0;
  const drafts=new Map();if(data.selectedDog)drafts.set(data.selectedDog,data.dogName||'');
  const controls=node('div',undefined,'room-controls'),caption=node('div',undefined,'room-caption');
  const title=node('h2'),count=node('p');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');caption.append(title,count);
  const previous=node('button'),next=node('button');
  for(const [button,key,label] of [[previous,'previous','Previous dog'],[next,'next','Next dog']]){
   button.type='button';button.setAttribute('aria-label',label);button.setAttribute('aria-controls','garden-dog');
   const arrow=node('img');arrow.src='/painting/'+key+'.webp';arrow.alt='';button.append(arrow);
  }
  controls.append(previous,caption,next);content.append(controls);
  const closer=node('button',undefined,'garden-original');closer.type='button';closer.append(word('gardenOriginal','See the original'));closer.addEventListener('click',openOriginal);content.append(closer);
  if(data.note)content.append(node('p',data.note,'garden-personal-note'));
  const form=node('form',undefined,'room-form'),heading=node('h2','What would you call this dog?');
  const label=node('label','A name from you.'),name=node('input');name.required=true;name.maxLength=32;name.name='dog-name';name.autocomplete='off';label.append(name);
  const save=node('button',undefined,'garden-save');save.type='submit';save.disabled=true;save.append(word('gardenChoose','This is my dog'));
  const note=node('p','Save your choice and name. Nothing is due now.','account-note');
  const details=node('details');details.append(node('summary','About taking your dog home'),node('p','This saves your choice and name. It does not mint or transfer the artwork.'),node('p','After adoption, you’ll be asked to pay Wubbushi the value you choose within seven days. Nothing is due now.'));
  const status=node('p','', 'account-message');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  form.append(heading,label,save,note,details,status);content.append(form);
  const mats=await subjects();
  async function show(i){
   if(room!==generation)return;
   if(index>=0)drafts.set(data.dogs[index].id,name.value);
   requested=(i+data.dogs.length)%data.dogs.length;const dog=data.dogs[requested],candidate=requested,serial=++request;
   save.disabled=true;status.textContent='Meeting '+dog.title+'…';picture.setAttribute('aria-busy','true');
   const matte=mats?.dogs?.[dog.id];
   const mapped=matte&&matte.original===dog.original;
   try{
    await Promise.all([loadImage(original(dog)),...(mapped?[loadImage(matte.mask)]:[])]);
    if(room!==generation||serial!==request)return;
    const bounds=mapped?matte.bounds:[0,0,1000,1000],w=bounds[2]-bounds[0],h=bounds[3]-bounds[1];
    image.src=original(dog);image.alt=dog.title+', painted by Wubbushi, in the garden.';
    if(mapped){
     image.style.maskImage=image.style.webkitMaskImage='url("'+matte.mask+'")';
     image.style.width=100000/w+'%';image.style.height=100000/h+'%';image.style.left=-bounds[0]/w*100+'%';image.style.top=-bounds[1]/h*100+'%';
    }else{image.style.maskImage=image.style.webkitMaskImage='none';image.style.left=image.style.top='0';image.alt=dog.title+', the original painting by Wubbushi.';}
    picture.dataset.presentation=mapped?'garden':'original';picture.style.setProperty('--dog-ratio',w/h);
    // Fit tall characters as well as long dogs without stretching their drawing.
    picture.style.setProperty('--dog-width',Math.min(43,34*w/h)+'%');
    picture.style.setProperty('--dog-mobile-width',Math.min(43,40*w/h)+'%');
    picture.setAttribute('aria-label','See the original '+dog.title+' painting');picture.hidden=false;
    selected=dog;index=candidate;name.value=drafts.get(dog.id)||'';title.textContent=dog.title;
    count.textContent=(candidate+1)+' of '+data.dogs.length+' · Chosen for you';
    heading.textContent=data.selectedDog===dog.id?'Your dog has a name.':'What would you call this dog?';
    note.textContent=data.selectedDog===dog.id?'Your choice is saved. You can revisit it here.':'Save your choice and name. Nothing is due now.';
    document.body.dataset.gardenState='invited';
    status.textContent=mapped?'':'Your original painting is here.';save.disabled=false;
   }catch(error){if(room===generation&&serial===request){status.textContent='The painting could not load. Try another dog, or try again.';if(index>=0)save.disabled=false;}}
   finally{if(room===generation&&serial===request)picture.setAttribute('aria-busy','false');}
  }
  previous.addEventListener('click',()=>show(requested-1));next.addEventListener('click',()=>show(requested+1));
  form.addEventListener('submit',event=>{
   event.preventDefault();if(index<0||save.disabled||room!==generation)return;
   const value=name.value.trim();if(!value){name.setCustomValidity('Give your dog a name.');name.reportValidity();return;}name.setCustomValidity('');
   change('choose',{dogId:data.dogs[index].id,name:value},'Your choice and name are saved. Nothing is due now.');
  });
  name.addEventListener('input',()=>name.setCustomValidity(''));
  controls.addEventListener('keydown',event=>{
   if(event.target.closest('input,textarea,select,details')||document.querySelector('dialog[open]')||event.altKey||event.ctrlKey||event.metaKey)return;
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(requested+(event.key==='ArrowLeft'?-1:1));}
  });
  await show(requested);
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
