// Isolated DOM and transport doubles. No live users, cookies, or submissions.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(page, signedIn, account={}, extra={}){
  class Node {
    constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.hidden=false;this.textContent='';this.value='';this.dataset={};}
    append(...values){this.children.push(...values);} replaceChildren(...values){this.children=values;}
    addEventListener(type,fn){this.events[type]=fn;}setAttribute(name,value){this[name]=value;}
    querySelectorAll(tag){return this.children.flatMap(n=>n instanceof Node?[...(n.tagName===tag?[n]:[]),...n.querySelectorAll(tag)]:[]);}
    showModal(){this.open=true;}close(){this.open=false;}
  }
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Node());return elements.get(id);};
  const calls=[];const data={handle:'fixture',owner:null,application:null,invitees:[],vouches:[],hasInvitation:false,...account};
  const identity={signedIn,handle:'fixture',csrf:'csrf',capabilities:{xLogin:false,email:false,minting:false},...extra.identity};
  const api={session:async()=>identity,signIn:()=>'/fixture-login',request:async(path,body)=>{
    calls.push({path,body});if(path==='club/account')return data;if(path==='club/waitlist')return extra.waitlist||{applications:[]};if(path==='club/room')return extra.room;return {ok:true};}};
  const context={document:{getElementById:get,createElement:tag=>new Node(tag),body:{dataset:{accountPage:page}}},window:{AllDogsAccount:api},sessionStorage:{getItem:()=>null},URLSearchParams,location:{search:'',pathname:'/'+page+'/'},Date};
  vm.runInNewContext(fs.readFileSync('account/account.js','utf8'),context);
  const text=n=>n.textContent+' '+n.children.map(x=>x instanceof Node?text(x):x).join(' ');
  return {get,calls,text:()=>text(get('account-content'))};
}
(async()=>{
  let tests=0;
  for(const page of ['lounge','my-dog','viewing-room','waitlist']){
    const h=ui(page,false);await settle();assert.equal(h.get('account-gate').hidden,false);assert.equal(h.get('account-login').hidden,true);assert.match(h.get('gate-copy').textContent,/not connected/);assert.ok(!h.calls.some(c=>c.path==='club/account'));tests++;
  }
  const claim=ui('lounge',true);await settle();assert.match(claim.text(),/private receipt/);const form=claim.get('account-content').querySelectorAll('form')[0];form.querySelectorAll('input')[0].value='DOG-1234567890ABCDEF';await form.events.submit({preventDefault(){}});await settle();assert.equal(claim.calls.find(c=>c.path==='club/claim').body.receipt,'DOG-1234567890ABCDEF');tests++;
  const emptyDog=ui('my-dog',true);await settle();assert.match(emptyDog.text(),/Your dog will be here/);assert.equal(emptyDog.get('account-content').querySelectorAll('img').length,0);tests++;
  const roomData={dogs:['1','2','3'].map(id=>({id,title:'Painting '+id,original:'/test'+id+'.jpg'})),note:'A note.',selectedDog:null,dogName:null,mintingReady:false};
  const room=ui('viewing-room',true,{hasInvitation:true},{room:roomData});await settle();assert.equal(room.get('account-content').querySelectorAll('img').length,1);assert.match(room.text(),/does not mint/);assert.match(room.text(),/Participation in ALL DOGS, a conceptual artwork by Wubbushi/);assert.match(room.text(),/You receive your dog first, then decide what the experience is worth to you/);assert.match(room.text(),/seven days from adoption/);assert.match(room.text(),/Nothing is due now/);
  const roomForm=room.get('account-content').querySelectorAll('form')[0];roomForm.querySelectorAll('input')[0].value='Rover';await roomForm.events.submit({preventDefault(){}});await settle();const saved=room.calls.find(c=>c.path==='club/choose');assert.equal(saved.body.dogId,'1');assert.equal(saved.body.name,'Rover');assert.ok(!room.calls.some(c=>/mint/.test(c.path)));tests++;
  const pending=ui('viewing-room',true);await settle();assert.match(pending.text(),/When Wubbushi invites/);assert.ok(!pending.calls.some(c=>c.path==='club/room'));tests++;
  const eligible=ui('waitlist',true,{owner:{vouch:{eligible:true,slots:3}}},{waitlist:{applications:[{handle:'person',shortId:2,status:'looking_for_vouch'}]}});await settle();assert.match(eligible.text(),/Review & vouch/);tests++;
  const sold=ui('waitlist',true,{owner:{vouch:{eligible:false,slots:0}}},{waitlist:{applications:[{handle:'person',shortId:2,status:'looking_for_vouch'}]}});await settle();assert.doesNotMatch(sold.text(),/Review & vouch/);tests++;
  const requests=[],ctx={window:{},location:{pathname:'/lounge/'},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({signedIn:true,csrf:'test-csrf'})};}};
  vm.runInNewContext(fs.readFileSync('account/account-api.js','utf8'),ctx);const api=ctx.window.AllDogsAccount;await api.session();await api.request('club/listing',{listed:true});await api.request('application?id=2');assert.equal(requests[0].options.credentials,'include');assert.equal(requests[1].options.headers['X-CSRF-Token'],'test-csrf');assert.equal(requests[2].options.credentials,'omit');tests++;
  console.log(tests+' account UI and transport cases passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
