'use strict';
(()=>{const again=document.getElementById('again'),note=document.getElementById('note');
if(!window.Worker||!window.OffscreenCanvas){note.textContent='This browser cannot run the painter. A recent Chrome, Edge, Firefox or Safari can.';return;}
document.getElementById('stage').classList.add('running');begin();
const t=setInterval(()=>{if(window.__shown||window.__error){clearInterval(t);again.hidden=false;}},500);
again.addEventListener('click',()=>location.reload());
function begin(){


const q=new URLSearchParams(location.search),scale=Math.max(1,Math.min(2,Number(q.get('scale')||2)));
const view=document.getElementById('v'),vctx=view.getContext('2d'),status=document.getElementById('s'),t0=performance.now();
const worker=id=>new Worker('/render/'+(id==='rec-src'?'recorder':'painter')+'.js?v=20260923d');
const queue=[];let cur=null,nextAt=0,done=null,finished=false,played=0;
const lenOf=P=>{let L=0;for(let i=1;i<P.length;i++)L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);return L;};
function durOf(p){
  if(p.kind==='canvas')return 1100; if(p.kind==='wash')return 420; if(p.kind==='dab'||p.kind==='shape')return 110; if(p.kind==='fill'&&!p.path)return 300;
  const L=p.path&&p.path.length>1?lenOf(p.path):0; if(!L)return 160;
  return Math.max(90,Math.min(1300,L/(650+14*p.width)*1000));}
function gapOf(p){return p.kind==='wash'||p.kind==='canvas'?40:28+(p.seq%7)*11;}
function prep(p){const c=document.createElement('canvas');c.width=p.w;c.height=p.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(p.buf),p.w,p.h),0,0);p.img=c;p.buf=null;
  if(p.path&&p.path.length>1&&p.kind!=='dab'&&p.kind!=='shape'){p.cum=[0];for(let i=1;i<p.path.length;i++)p.cum.push(p.cum[i-1]+Math.hypot(p.path[i][0]-p.path[i-1][0],p.path[i][1]-p.path[i-1][1]));p.total=p.cum[p.cum.length-1];p.shown=0;p.r=Math.max(5,p.width*0.65+6);}
  return p;}
let backlog=0;
function rate(){const B=backlog/1000;let r=1+Math.max(0,B-2)/3;if(done)r=Math.max(r,B/6);return r;}
function at(p,d){let i=1;while(i<p.cum.length-1&&p.cum[i]<d)i++;const a=p.cum[i-1],f=Math.max(0,Math.min(1,(d-a)/Math.max(1e-6,p.cum[i]-a)));return [p.path[i-1][0]+(p.path[i][0]-p.path[i-1][0])*f,p.path[i-1][1]+(p.path[i][1]-p.path[i-1][1])*f];}
function reveal(p,t){
  if(!p.total){vctx.globalAlpha=Math.min(1,t*1.35);vctx.drawImage(p.img,p.x,p.y);vctx.globalAlpha=1;return;}
  const target=t*p.total;if(target<=p.shown&&p.shown>0)return;
  const r=p.r,step=Math.max(2,r*0.5);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;vctx.save();vctx.beginPath();
  for(let d=Math.max(0,p.shown-step);;d+=step){const q=at(p,Math.min(d,target));vctx.moveTo(q[0]+r,q[1]);vctx.arc(q[0],q[1],r,0,6.2832);
    if(q[0]-r<x0)x0=q[0]-r;if(q[1]-r<y0)y0=q[1]-r;if(q[0]+r>x1)x1=q[0]+r;if(q[1]+r>y1)y1=q[1]+r;if(d>=target)break;}
  vctx.clip();x0=Math.max(p.x,Math.floor(x0));y0=Math.max(p.y,Math.floor(y0));x1=Math.min(p.x+p.w,Math.ceil(x1));y1=Math.min(p.y+p.h,Math.ceil(y1));
  if(x1>x0&&y1>y0)vctx.drawImage(p.img,x0-p.x,y0-p.y,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);vctx.restore();p.shown=target;}
function loop(now){
  if(!cur&&queue.length&&now>=nextAt){const p=prep(queue.shift());backlog-=p.d+gapOf(p);cur={items:[p],t0:now,dur:p.d};
    if(p.kind==='wash'||p.kind==='canvas')while(queue.length&&queue[0].group===p.group){const o=prep(queue.shift());backlog-=o.d+gapOf(o);cur.items.push(o);}}
  if(cur){const r=rate(),t=Math.min(1,(now-cur.t0)*r/cur.dur);for(const p of cur.items)reveal(p,t);
    if(t>=1){for(const p of cur.items)vctx.drawImage(p.img,p.x,p.y);played+=cur.items.length;nextAt=now+gapOf(cur.items[0])/r;cur=null;}}
  if(!cur&&!queue.length&&done&&!finished){finished=true;const f=done;
    if(f.width!==view.width){view.width=f.width;view.height=f.height;}vctx.drawImage(f,0,0);window.__shown=true;
    status.textContent='Elliot · seed 131 · '+f.width+' × '+f.height+' · painted from its code in this browser in '+((now-t0)/1000).toFixed(0)+' s';return;}
  setTimeout(()=>loop(performance.now()),16);}
setTimeout(()=>loop(performance.now()),16);
const rec=worker('rec-src'),paint=worker('paint-src');
rec.onmessage=e=>{const m=e.data;if(m.type==='plan'){window.__plan=m.info;window.__wide=m.wide;paint.postMessage({wide:m.wide,scale});}
  else if(m.type==='error'){status.textContent='Drawing error: '+m.message.split('\n')[0];window.__error=m.message;}};
paint.onmessage=e=>{const m=e.data;
  if(m.type==='patch'||m.type==='batch'){for(const p of m.type==='batch'?m.items:[m]){p.d=durOf(p);backlog+=p.d+gapOf(p);queue.push(p);}}
  else if(m.type==='done'){const c=document.createElement('canvas');c.width=m.info.W;c.height=m.info.H;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.pixels),m.info.W,m.info.H),0,0);
    window.__final=c;window.__result=Object.assign({totalMs:Math.round(performance.now()-t0)},m.info);done=c;}
  else if(m.type==='error'){status.textContent='Painting error: '+m.message.split('\n')[0];window.__error=m.message;}};
window.__stats=()=>({queued:queue.length,played,backlog:Math.round(backlog),elapsed:Math.round(performance.now()-t0)});
rec.postMessage({live:false});

}})();
