// DOM/transport doubles exercise the actual page script without a browser or real applicants.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
function harness(stored=false){
  const nodes=new Map(),calls=[],state={ids:[],revision:0,failAfterSave:false},storage=new Map();
  if(stored)storage.set('alldogs-application-receipt','DOG-1234567890ABCDEF');
  class Node{
    constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.hidden=false;this.disabled=false;this.textContent='';this.dataset={};this.value='';this.className='';this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x))};}
    append(...values){for(const value of values){if(value.tagName==='fragment')this.append(...value.children);else{this.children.push(value);value.parent=this;}}}
    replaceChildren(...values){this.children=[];this.append(...values);}
    setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}
    addEventListener(type,fn){this.events[type]=fn;}
    closest(selector){if(selector==='[data-drag]'&&this.dataset.drag!==undefined)return this;if(selector==='.wish-slot'&&this.className==='wish-slot')return this;return this.parent?.closest(selector)||null;}
    querySelector(selector){return this.all().find(n=>selector==='button:not(:disabled)'?n.tagName==='button'&&!n.disabled:false)||null;}
    all(){return this.children.flatMap(n=>[n,...n.all()]);}
    focus(){document.activeElement=this;}setPointerCapture(){}contains(node){return node===this||this.all().includes(node);}
    showModal(){this.open=true;}close(){this.open=false;this.events.close?.();}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
  for(const id of ['pound-content','leave-pound','retry-wishlist'])get(id).hidden=true;
  let pointerTarget=null;
  const document={getElementById:get,createElement:tag=>new Node(tag),createDocumentFragment:()=>new Node('fragment'),documentElement:new Node('html'),addEventListener(){},elementFromPoint:()=>pointerTarget,activeElement:null};
  const context={document,window:{AllDogsWishlist:require('../../dog-pound/wishlist-model.js')},URL,AbortSignal,Map,Set,Image:class{decode(){return Promise.resolve();}},
    sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    fetch:async(url,options)=>{
      const body=JSON.parse(options.body);calls.push({url,options,body});
      if(body.action==='save'){
        state.ids=body.dogIds.slice();state.revision++;
        if(state.failAfterSave){state.failAfterSave=false;throw Error('Reply lost');}
      }
      return{ok:true,json:async()=>({dogIds:state.ids.slice(),revision:state.revision,handle:'fixture',publicId:'a'.repeat(24),shortId:1,
        items:['a','b','c','d'].map(id=>({id,title:'Dog '+id,state:'living',curation:'loved',variants:[{src:'/wide/'+id+'.jpg'}]}))})};
    }};
  vm.runInNewContext(fs.readFileSync('dog-pound/wishlist.js','utf8'),context);
  const slots=()=>get('wish-holders').children;
  const control=(position,text)=>slots()[position].all().find(n=>n.tagName==='button'&&n.textContent===text);
  return{get,calls,state,slots,control,point:node=>{pointerTarget=node;}};
}
(async()=>{
  let tests=0;
  const h=harness();await settle();assert.equal(h.calls.length,0);assert.equal(h.get('pound-content').hidden,true);tests++;
  h.get('entry-receipt').value='DOG-1234567890ABCDEF';h.get('pound-entry').events.submit({preventDefault(){}});await settle();
  assert.equal(h.get('pound-content').hidden,false);assert.equal(h.slots().length,3);assert.equal(h.get('spotlight-title').textContent,'Dog d');tests++;
  for(let i=0;i<3;i++){h.get('add-wish').events.click();await settle();if(i<2){h.get('spotlight-next').events.click();await settle();}}
  assert.deepEqual(h.state.ids,['d','c','b']);assert.equal(h.get('add-wish').disabled,true);assert.equal(h.slots().every(n=>n.all().some(x=>x.tagName==='img')),true);tests++;
  const root=h.get('wish-holders'),handle=h.control(2,'↕');
  root.events.pointerdown({target:handle,button:0,pointerId:1,preventDefault(){}});
  h.point(h.slots()[0]);root.events.pointermove({pointerId:1,clientX:1,clientY:1});root.events.pointerup({pointerId:1,type:'pointerup'});await settle();
  assert.deepEqual(h.state.ids,['b','d','c']);tests++;
  root.events.pointerdown({target:h.control(0,'↕'),button:0,pointerId:2,preventDefault(){}});
  h.point(h.slots()[2]);root.events.pointermove({pointerId:2,clientX:2,clientY:2});root.events.pointercancel({pointerId:2,type:'pointercancel'});await settle();
  assert.deepEqual(h.state.ids,['b','d','c']);tests++;
  h.control(0,'→').events.click();await settle();assert.deepEqual(h.state.ids,['d','b','c']);tests++;
  h.control(1,'Release').events.click();await settle();assert.deepEqual(h.state.ids,['d','c']);assert.equal(h.slots()[2].all().some(n=>n.tagName==='img'),false);tests++;
  h.get('spotlight-open').events.click();assert.equal(h.get('dog-dialog').open,true);h.get('close-dialog').events.click();assert.equal(h.get('dog-dialog').open,false);tests++;
  h.state.failAfterSave=true;h.control(0,'Release').events.click();await settle();
  assert.equal(h.get('retry-wishlist').hidden,false);assert.equal(h.get('add-wish').disabled,true);assert.match(h.get('wishlist-status').textContent,/could not confirm/);tests++;
  h.get('retry-wishlist').events.click();await settle();assert.deepEqual(h.state.ids,['c']);assert.match(h.get('wishlist-status').textContent,/saved/);assert.equal(h.get('retry-wishlist').hidden,true);tests++;
  h.get('leave-pound').events.click();assert.equal(h.get('pound-content').hidden,true);tests++;
  const restored=harness(true);await settle();assert.equal(restored.get('pound-content').hidden,false);tests++;
  for(const call of h.calls){assert.equal(new URL(call.url).search,'');assert.equal(call.options.credentials,'omit');assert.equal(call.options.cache,'no-store');}tests++;
  console.log(tests+' wishlist UI interaction cases passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
