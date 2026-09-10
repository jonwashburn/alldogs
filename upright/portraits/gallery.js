import {groupPortraits,emptyState,normalizeState,mergeState,orderedIds,primaryId,rotatedId,moveId,nextStamp,payload} from './state.js?v=2';
const $=s=>document.querySelector(s), KEY='upright-character-gallery-v1', API='https://api.alldogs.wtf/upright-api/gallery';
let groups=[], state=emptyState(), storageOK=true, connected=false, syncing=false, resync=false, revision=0, syncTimer, drag=null, frame=0, latestRoundId='';
const previews=new Map(), cards=new Map();
const fingerprint=s=>JSON.stringify({primaries:Object.fromEntries(Object.entries(s.primaries).sort(([a],[b])=>a.localeCompare(b))),order:s.order});
function token(){try{return localStorage.getItem('upright_connection_disabled')?'':(localStorage.getItem('upright_token')||localStorage.getItem('alldogs_token')||'').trim();}catch{return '';}}
function status(message){$('#save-status').textContent=message;}
function announce(message){$('#announce').textContent=message;}
function readLocal(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{storageOK=false;return null;}}
function writeLocal(){try{const serialized=JSON.stringify({version:1,primaries:Object.fromEntries(Object.entries(state.primaries).sort(([a],[b])=>a.localeCompare(b))),order:state.order});if(localStorage.getItem(KEY)!==serialized)localStorage.setItem(KEY,serialized);storageOK=true;}catch{storageOK=false;}}
function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,450);}
function save(){revision++;writeLocal();status(storageOK?(connected?'Saving your collection…':'Saved in this browser. Connect to save across devices.'):'Browser storage unavailable. Connect to save your collection.');if(connected)queueSync();}
async function request(method='GET', body){
  const key=token();if(!key)throw Error('Connect with your review key to save across devices.');
  const response=await fetch(API,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(response.status===403?'That review key was not accepted.':response.status===400?'The collection changed. Reload and try again.':'Could not reach your saved collection.');
  const result=await response.json();if(result.version!==1||!result.primaries||!result.order)throw Error('Could not read your saved collection.');return result;
}
async function sync(){
  if(!connected||!token())return;
  if(syncing){resync=true;return;}
  syncing=true;const sentRevision=revision;
  try{
    const remote=await request('POST',payload(state));
    state=mergeState(state,remote,groups);writeLocal();if(!drag)render();
    if(sentRevision===revision)status('Primary portraits and order saved.');else resync=true;
  }catch(error){status((storageOK?'Saved in this browser. ':'')+error.message+' Use Connect to retry.');}
  finally{syncing=false;if(resync){resync=false;queueSync();}}
}
async function connect(){
  const remote=await request();state=mergeState(state,remote,groups);connected=true;
  $('#connect').textContent='Collection connected';writeLocal();if(!drag)render();
  if(fingerprint(state)!==fingerprint(normalizeState(remote,groups)))await sync();else status('Primary portraits and order saved.');
}
async function refresh(){
  if(!groups.length||drag||syncing||!token())return;
  try{await connect();}catch(error){status((storageOK?'Saved in this browser. ':'')+error.message);}
}
function currentId(group){return previews.get(group.id)||primaryId(state,group);}
function choosePreview(group,id){previews.set(group.id,id);updateCard(group);announce(group.name+': '+group.portraits.find(p=>p.id===id).title.split(' · ').slice(1).join(', '));}
function setPrimary(group){const portraitId=currentId(group);state.primaries[group.id]={portraitId,updatedAt:nextStamp(state)};previews.delete(group.id);save();updateCard(group);announce(group.name+' primary portrait saved.');}
function applyOrder(ids){if(ids.join('|')===orderedIds(state,groups).join('|'))return;state.order={ids,updatedAt:nextStamp(state)};save();render();}
function createCard(group){
  const card=document.createElement('article');card.className='portrait-card';card.dataset.character=group.id;
  card.innerHTML='<div class="card-heading"><span class="position" aria-hidden="true"></span><h2></h2><button class="drag-handle" type="button"><span class="grip" aria-hidden="true">⠿</span></button></div><a class="image-link" target="_blank" rel="noopener"><img class="portrait-image" width="1000" height="1000" loading="lazy" draggable="false"><span class="image-error" hidden>Image unavailable. Try another look.</span></a><div class="carousel"><button class="previous" type="button">←</button><select class="look-picker"></select><button class="next" type="button">→</button></div><div class="card-footer"><span class="look-count"></span><button class="primary-return" type="button">Back to primary</button><button class="primary-button" type="button">Set primary</button></div>';
  card.querySelector('h2').textContent=group.name;
  const handle=card.querySelector('.drag-handle');handle.setAttribute('aria-label','Move '+group.name+'. Drag or use arrow keys.');
  handle.addEventListener('pointerdown',e=>startDrag(e,group,handle));
  handle.addEventListener('keydown',e=>{
    if(drag)return;
    const ids=orderedIds(state,groups), index=ids.indexOf(group.id);
    let to;
    if(['ArrowLeft','ArrowUp'].includes(e.key))to=index-1;
    else if(['ArrowRight','ArrowDown'].includes(e.key))to=index+1;
    else if(e.key==='Home')to=0;else if(e.key==='End')to=ids.length-1;else return;
    e.preventDefault();const moved=moveId(ids,group.id,to);applyOrder(moved);handle.focus();announce(group.name+' moved to position '+(moved.indexOf(group.id)+1)+' of '+groups.length+'.');
  });
  const select=card.querySelector('.look-picker');select.setAttribute('aria-label','Choose a look for '+group.name);
  const latest=group.portraits.filter(p=>latestRoundId&&p.roundId===latestRoundId);
  const addOptions=(portraits,parent)=>portraits.forEach(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.title.split(' · ').slice(1).join(' · ')||p.title;parent.append(option);});
  if(latest.length){
    for(const [label,portraits] of [['Latest round',latest],['Earlier looks',group.portraits.filter(p=>!latest.includes(p))]]){
      if(!portraits.length)continue;const section=document.createElement('optgroup');section.label=label;addOptions(portraits,section);select.append(section);
    }
  }else addOptions(group.portraits,select);
  select.addEventListener('change',()=>choosePreview(group,select.value));
  card.querySelector('.previous').setAttribute('aria-label','Previous look for '+group.name);
  card.querySelector('.next').setAttribute('aria-label','Next look for '+group.name);
  card.querySelector('.previous').onclick=()=>choosePreview(group,rotatedId(group,currentId(group),-1));
  card.querySelector('.next').onclick=()=>choosePreview(group,rotatedId(group,currentId(group),1));
  card.querySelector('.primary-button').onclick=()=>setPrimary(group);
  card.querySelector('.primary-return').onclick=()=>{previews.delete(group.id);updateCard(group);};
  const img=card.querySelector('img');img.onload=()=>{img.classList.remove('loading');card.querySelector('.image-error').hidden=true;};
  img.onerror=()=>{img.classList.remove('loading');card.querySelector('.image-error').hidden=false;};
  return card;
}
function updateCard(group){
  const card=cards.get(group.id), id=currentId(group), portrait=group.portraits.find(p=>p.id===id)||group.portraits[0], image='../'+portrait.image;
  const img=card.querySelector('img');if(img.getAttribute('src')!==image){img.classList.add('loading');card.querySelector('.image-error').hidden=true;img.src=image;}img.alt=portrait.title;
  card.querySelector('.image-link').href=image;card.querySelector('.image-link').setAttribute('aria-label','Open '+portrait.title+' at full size');
  card.querySelector('select').value=portrait.id;
  for(const control of card.querySelectorAll('.previous,.next,select'))control.disabled=group.portraits.length<2;
  const isPrimary=portrait.id===primaryId(state,group), explicit=!!state.primaries[group.id];
  const button=card.querySelector('.primary-button');button.textContent=isPrimary&&explicit?'✓ Primary':'Set primary';button.disabled=isPrimary&&explicit;button.classList.toggle('is-primary',isPrimary&&explicit);button.setAttribute('aria-label',isPrimary&&explicit?group.name+' primary portrait':'Set this look as '+group.name+' primary');
  card.querySelector('.primary-return').hidden=isPrimary;
  card.querySelector('.primary-return').textContent=explicit?'Back to primary':'Back to first look';
  card.querySelector('.look-count').textContent=(group.portraits.findIndex(p=>p.id===portrait.id)+1)+' / '+group.portraits.length+' '+(group.portraits.length===1?'look':'looks');
}
function render(){
  const grid=$('#grid'), ids=drag?.active?drag.ids:orderedIds(state,groups);
  groups.forEach(group=>{if(!cards.has(group.id))cards.set(group.id,createCard(group));updateCard(group);});
  ids.forEach((id,i)=>{const card=cards.get(id);card.querySelector('.position').textContent=String(i+1).padStart(2,'0');if(grid.children[i]!==card)grid.insertBefore(card,grid.children[i]||null);});
  if(drag?.active&&!drag.handle.hasPointerCapture(drag.pointerId)){try{drag.handle.setPointerCapture(drag.pointerId);}catch{}}
}
function startDrag(e,group,handle){
  if(e.button!==0||drag)return;
  drag={id:group.id,name:group.name,handle,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,ids:orderedIds(state,groups),active:false,ghost:null};
  handle.setPointerCapture(e.pointerId);
}
function dragTarget(){
  if(!drag?.active)return;
  const hit=document.elementFromPoint(drag.x,drag.y)?.closest('.portrait-card');
  if(hit&&hit.dataset.character!==drag.id&&cards.has(hit.dataset.character)){
    drag.ids=moveId(drag.ids,drag.id,drag.ids.indexOf(hit.dataset.character));render();
  }
}
function dragScroll(){
  if(!drag?.active)return;
  const edge=85, speed=drag.y<edge?-Math.ceil((edge-drag.y)/5):drag.y>innerHeight-edge?Math.ceil((drag.y-innerHeight+edge)/5):0;
  if(speed){window.scrollBy(0,Math.max(-22,Math.min(22,speed)));dragTarget();}
  frame=requestAnimationFrame(dragScroll);
}
document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;
  if(!drag.active&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;
  e.preventDefault();
  if(!drag.active){
    drag.active=true;const source=cards.get(drag.id);drag.ghost=source.cloneNode(true);drag.ghost.classList.add('drag-ghost');drag.ghost.setAttribute('aria-hidden','true');drag.ghost.querySelectorAll('button,select,a').forEach(el=>el.tabIndex=-1);document.body.append(drag.ghost);source.classList.add('is-dragging');document.body.classList.add('drag-active');frame=requestAnimationFrame(dragScroll);
  }
  drag.ghost.style.left=Math.min(innerWidth-290,e.clientX+14)+'px';drag.ghost.style.top=(e.clientY+14)+'px';dragTarget();
},{passive:false});
function endDrag(commit){
  if(!drag)return;const finished=drag;drag=null;cancelAnimationFrame(frame);finished.ghost?.remove();cards.get(finished.id).classList.remove('is-dragging');document.body.classList.remove('drag-active');
  if(finished.handle.hasPointerCapture(finished.pointerId))finished.handle.releasePointerCapture(finished.pointerId);
  if(finished.active&&commit){applyOrder(finished.ids);announce(finished.name+' moved to position '+(finished.ids.indexOf(finished.id)+1)+' of '+groups.length+'.');}else render();
  finished.handle.focus({preventScroll:true});
}
document.addEventListener('pointerup',e=>{if(drag?.pointerId===e.pointerId)endDrag(true);});
document.addEventListener('pointercancel',e=>{if(drag?.pointerId===e.pointerId)endDrag(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();endDrag(false);}});
$('#connect').onclick=()=>{$('#connect-status').textContent='';$('#review-key').value=token();$('#connection').showModal();};
$('#close-connect').onclick=()=>$('#connection').close();
$('#connect-form').onsubmit=async e=>{
  e.preventDefault();$('#connect-status').textContent='Connecting…';
  try{localStorage.setItem('upright_token',$('#review-key').value.trim());localStorage.removeItem('upright_connection_disabled');await connect();$('#connection').close();}catch(error){$('#connect-status').textContent=error.message;}
};
$('#disconnect').onclick=()=>{try{localStorage.setItem('upright_connection_disabled','1');}catch{}connected=false;clearTimeout(syncTimer);$('#connect').textContent='Connect to save';status('Saved in this browser. Disconnected.');$('#connection').close();};
window.addEventListener('storage',e=>{
  if(!groups.length)return; // Startup reads the latest storage after the catalog is ready.
  if(e.key===KEY){try{state=mergeState(state,JSON.parse(e.newValue),groups);writeLocal();if(!drag)render();if(connected)queueSync();}catch{}}
  if(['upright_token','alldogs_token','upright_connection_disabled'].includes(e.key)){
    if(!token()){connected=false;clearTimeout(syncTimer);$('#connect').textContent='Connect to save';status('Saved in this browser. Disconnected.');}else refresh();
  }
});
window.addEventListener('online',refresh);window.addEventListener('focus',refresh);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
try{
  const response=await fetch('../catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('The portrait collection could not load. Please reload.');
  const catalog=await response.json();latestRoundId=catalog.reviewRound?.id||'';groups=groupPortraits(catalog.portraits);if(!groups.length)throw Error('No portraits are available yet.');
  state=normalizeState(readLocal(),groups);render();$('#grid').setAttribute('aria-busy','false');$('#count').textContent=groups.length+' characters · '+groups.reduce((n,g)=>n+g.portraits.length,0)+' portraits';
  if(catalog.reviewRound?.title){$('#latest-round').hidden=false;$('#latest-round a').textContent='Review the latest round: '+catalog.reviewRound.title+' →';}
  status(storageOK?'Saved in this browser. Connect to save across devices.':'Connect to save your collection.');if(token())await refresh();
}catch(error){$('#error').hidden=false;$('#error').textContent=error.message;$('#grid').setAttribute('aria-busy','false');status('Collection unavailable.');}
