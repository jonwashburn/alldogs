const $=s=>document.querySelector(s),picture=$('#painting'),viewport=$('#viewport');
const points={whole:[.5,.5],face:[.46,.36],hand:[.44,.75]};
const versions={new:{preview:'assets/bowie-preview.jpg',native:'assets/bowie-native.jpg'},earlier:{preview:'assets/earlier-preview.jpg',native:'assets/earlier-native.jpg'}};
const nativeLoads={};
let mode='whole',zoom=1,version='new';
function buttonState(){for(const id of ['whole','face','hand','scale'])$('#'+id).setAttribute('aria-pressed',String(id===mode));}
function layout(point=points[mode]||points.whole){
  const base=Math.max(1,Math.min(viewport.clientWidth,viewport.clientHeight));
  const size=Math.round(base*zoom),inset=Math.max(0,(viewport.clientHeight-size)/2);
  picture.style.width=size+'px';picture.style.height=size+'px';picture.style.marginTop=inset+'px';picture.style.marginBottom=inset+'px';
  viewport.scrollTo({left:Math.max(0,point[0]*size-viewport.clientWidth/2),top:Math.max(0,inset+point[1]*size-viewport.clientHeight/2)});
  $('#zoom').value=String(zoom);$('#zoom-label').textContent=zoom.toFixed(1).replace('.0','')+'×';
}
function nativeImage(){
  const requested=version;
  if(!nativeLoads[requested]){
    $('#image-status').textContent='Loading full-resolution paint…';
    const entry={ready:false,promise:null};nativeLoads[requested]=entry;
    entry.promise=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{entry.ready=true;if(version===requested){picture.src=im.src;$('#image-status').textContent='Full-resolution paint loaded';}resolve();};im.onerror=()=>{delete nativeLoads[requested];if(version===requested)$('#image-status').textContent='Could not load full resolution. Try again or use the image link below.';reject(new Error('Native image unavailable'));};im.src=versions[requested].native;});
  }
  return nativeLoads[requested].promise;
}
function setVersion(next){
  version=next;const selected=versions[version],ready=nativeLoads[version]?.ready;
  for(const id of ['new','earlier'])$('#version-'+id).setAttribute('aria-pressed',String(id===version));
  picture.src=ready?selected.native:selected.preview;
  $('#native-link').href=selected.native;$('#scale-painting').setAttribute('href',selected.preview);
  $('#image-status').textContent=ready?'Full-resolution paint loaded':version==='new'?'New study':'Earlier study';
  if(mode!=='scale'&&zoom>1)nativeImage().catch(()=>{});
}
for(const id of ['new','earlier'])$('#version-'+id).addEventListener('click',()=>setVersion(id));
function select(next){mode=next;buttonState();$('#scale-panel').hidden=mode!=='scale';$('#painting-panel').hidden=mode==='scale';if(mode==='scale')return;zoom=mode==='whole'?1:mode==='face'?2.6:3.5;layout();if(zoom>1)nativeImage().catch(()=>{});}
for(const id of ['whole','face','hand','scale'])$('#'+id).addEventListener('click',()=>select(id));
$('#zoom').addEventListener('input',e=>{zoom=Number(e.target.value);layout();if(zoom>1)nativeImage().catch(()=>{});});
if(!$('#painting-panel').requestFullscreen)$('#fullscreen').hidden=true;
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#painting-panel').requestFullscreen();}catch{$('#image-status').textContent='Full screen is unavailable in this browser.';}});
document.addEventListener('fullscreenchange',()=>{layout();$('#fullscreen').textContent=document.fullscreenElement?'Leave full screen':'Fill screen';});
new ResizeObserver(()=>{if(mode!=='scale')layout();}).observe(viewport);
picture.addEventListener('error',()=>{$('#error').hidden=false;$('#error').textContent='The painting could not load. Please reload or open the full-resolution image.';});
picture.addEventListener('load',()=>{$('#error').hidden=true;});
fetch('manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();}).then(m=>{$('#resolution').textContent=`Both studies rendered natively at ${m.width.toLocaleString()} × ${m.height.toLocaleString()} pixels. Proposed height: 7 ft. These development masters provide ${Math.round(m.height/84)} pixels per inch at that size.`;}).catch(()=>{$('#resolution').textContent='Proposed height: 7 ft. Inspect the full-resolution painting before choosing a fabrication size.';});
layout();
