// Actual payment UI with isolated DOM/provider doubles. Never makes payments.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const settle=()=>new Promise(r=>setImmediate(r));
function fixture(overrides={},options={}){
  class Node{
    constructor(tag){this.tagName=tag;this.children=[];this.events={};this.textContent='';this.value='';this.disabled=false;}
    append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}
    addEventListener(k,f){this.events[k]=f;}setAttribute(k,v){this[k]=v;}select(){}
    all(tag){return this.children.flatMap(n=>[...(n.tagName===tag?[n]:[]),...n.all(tag)]);}
    text(){return this.textContent+' '+this.children.map(n=>n.text()).join(' ');}
  }
  const host=new Node('section'),calls=[],redirects=[],state={deadline:2000000,windowOpen:true,values:[],cardReady:false,cardOpen:false,cryptoReady:false,crypto:null,pendingCheckout:null,...overrides};
  const ctx={document:{createElement:tag=>new Node(tag)},window:{AllDogsAccount:{request:async(path,body)=>{calls.push({path,body});if(path==='club/payment')return state;if(options.error)throw Error(options.error);return {url:options.url||'https://checkout.stripe.com/c/pay/fixture'};}}},URL,URLSearchParams,Date,crypto:{randomUUID:()=> 'fixture-request-12345678'},location:{search:options.search||'',assign:url=>redirects.push(url)},navigator:{clipboard:{writeText:async()=>{}}}};
  vm.runInNewContext(fs.readFileSync('account/payments.js','utf8'),ctx);
  return {host,calls,redirects,ready:ctx.window.AllDogsPayments.mount(host)};
}
(async()=>{
  let tests=0;
  let h=fixture();await h.ready;assert.match(h.host.text(),/The dog is yours\. The value is yours to decide/);assert.match(h.host.text(),/The painting\. The idea behind it\. What it means to you/);assert.match(h.host.text(),/You’ve already received your dog/);assert.match(h.host.text(),/pay Wubbushi what you believe the work is worth/);assert.match(h.host.text(),/seven days from adoption/);assert.match(h.host.text(),/Your valuation is part of the artwork/);assert.match(h.host.text(),/Card payments are being connected/);assert.equal(h.host.all('form').length,0);tests++;
  h=fixture({cardReady:true,cardOpen:true});await h.ready;let form=h.host.all('form')[0];form.all('input')[0].value='12.34';await form.events.submit({preventDefault(){}});assert.equal(h.calls[1].body.amount,'12.34');assert.equal(h.calls[1].body.requestId,'fixture-request-12345678');assert.equal(h.redirects.length,1);assert.equal(h.host.all('input').length,1);tests++;
  h=fixture({cardReady:true,cardOpen:true},{url:'https://evil.invalid/'});await h.ready;form=h.host.all('form')[0];form.all('input')[0].value='12';await form.events.submit({preventDefault(){}});assert.equal(h.redirects.length,0);assert.match(h.host.text(),/could not be verified/);tests++;
  h=fixture({cardReady:true,cardOpen:true},{error:'A network timeout. Refresh before retrying.'});await h.ready;form=h.host.all('form')[0];form.all('input')[0].value='12';await form.events.submit({preventDefault(){}});assert.equal(form.all('button')[0].disabled,false);assert.match(h.host.text(),/network timeout/);tests++;
  h=fixture({values:[{currency:'USD',amount:'12.34'}]},{search:'?payment=return'});await h.ready;assert.match(h.host.text(),/12.34 USD/);assert.match(h.host.text(),/return is not a payment receipt/);tests++;
  h=fixture({windowOpen:false,cardReady:true,cardOpen:true});await h.ready;assert.equal(h.host.all('form').length,0);assert.match(h.host.text(),/window closed/);tests++;
  h=fixture({cardReady:true,cardOpen:false});await h.ready;assert.match(h.host.text(),/30 minutes/);assert.equal(h.host.all('form').length,0);tests++;
  h=fixture({cardReady:true,cardOpen:true,pendingCheckout:{url:'https://checkout.stripe.com/c/pay/fixture',amount:'12.34'}});await h.ready;assert.equal(h.host.all('form').length,0);assert.match(h.host.text(),/Continue your 12.34 USD/);tests++;
  h=fixture({cryptoReady:true,crypto:{currency:'ETH',network:'Ethereum mainnet',address:'0x'+'ab'.repeat(20),fromAddress:'0x'+'11'.repeat(20)}});await h.ready;assert.match(h.host.text(),/original adoption wallet/);assert.match(h.host.text(),/Do not send from an exchange/);assert.equal(h.host.all('input')[0].readOnly,true);tests++;
  console.log(tests+' payment UI cases passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
