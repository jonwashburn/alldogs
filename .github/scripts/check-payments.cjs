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
  const issuedDeadline=new Date(2000000*1000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  let h=fixture();await h.ready;assert.match(h.host.text(),/The dog is yours\. The value is yours to decide/);assert.match(h.host.text(),/Your dog is home/);assert.match(h.host.text(),/pay Wubbushi, choose an amount below/);assert.ok(h.host.text().includes('Your valuation window closes '+issuedDeadline));assert.match(h.host.text(),/Payments received by the deadline shown become your dog’s recorded value/);assert.doesNotMatch(h.host.text(),/one day from adoption/);assert.doesNotMatch(h.host.children.slice(2,5).map(n=>n.text()).join(' '),/NFT/i);assert.match(h.host.text(),/Please contact Wubbushi to arrange your payment/);assert.equal(h.host.all('form').length,0);tests++;
  h=fixture({cardReady:true,cardOpen:true});await h.ready;let form=h.host.all('form')[0];form.all('input')[0].value='12.34';await form.events.submit({preventDefault(){}});assert.equal(h.calls[1].body.amount,'12.34');assert.equal(h.calls[1].body.requestId,'fixture-request-12345678');assert.equal(h.redirects.length,1);assert.equal(h.host.all('input').length,1);tests++;
  h=fixture({cardReady:true,cardOpen:true},{url:'https://evil.invalid/'});await h.ready;form=h.host.all('form')[0];form.all('input')[0].value='12';await form.events.submit({preventDefault(){}});assert.equal(h.redirects.length,0);assert.match(h.host.text(),/could not be verified/);tests++;
  h=fixture({cardReady:true,cardOpen:true},{error:'A network timeout. Refresh before retrying.'});await h.ready;form=h.host.all('form')[0];form.all('input')[0].value='12';await form.events.submit({preventDefault(){}});assert.equal(form.all('button')[0].disabled,false);assert.match(h.host.text(),/network timeout/);tests++;
  h=fixture({values:[{currency:'USD',amount:'12.34'}]},{search:'?payment=return'});await h.ready;assert.match(h.host.text(),/12.34 USD/);assert.match(h.host.text(),/return is not a payment receipt/);tests++;
  h=fixture({windowOpen:false,cardReady:true,cardOpen:true});await h.ready;assert.equal(h.host.all('form').length,0);assert.match(h.host.text(),/window closed/);tests++;
  h=fixture({cardReady:true,cardOpen:false});await h.ready;assert.match(h.host.text(),/30 minutes/);assert.equal(h.host.all('form').length,0);tests++;
  h=fixture({cardReady:true,cardOpen:true,pendingCheckout:{url:'https://checkout.stripe.com/c/pay/fixture',amount:'12.34'}});await h.ready;assert.equal(h.host.all('form').length,0);assert.match(h.host.text(),/Continue your 12.34 USD/);tests++;
  h=fixture({cryptoReady:true,crypto:{currency:'ETH',network:'Ethereum mainnet',address:'0x'+'ab'.repeat(20),fromAddress:'0x'+'11'.repeat(20)}});await h.ready;assert.ok(h.host.text().includes('Send ETH on Ethereum mainnet by '+issuedDeadline));assert.doesNotMatch(h.host.text(),/within one day of adoption/);assert.match(h.host.text(),/Once confirmed, it automatically appears as your dog’s value/);assert.match(h.host.text(),/original adoption wallet/);assert.match(h.host.text(),/Do not send from an exchange/);assert.equal(h.host.all('input')[0].readOnly,true);tests++;
  h=fixture({adoptionKind:'artist_gift',cardReady:true,cardOpen:true,cryptoReady:true,windowOpen:true,pendingCheckout:{url:'https://checkout.stripe.com/c/pay/fixture',amount:'10.00'}});await h.ready;assert.match(h.host.text(),/Artist gift/);assert.match(h.host.text(),/No payment is due/);assert.doesNotMatch(h.host.text(),/one day|seven days|Credit card|Crypto|confirmed payment|checkout|USD/);assert.equal(h.host.all('form').length,0);assert.equal(h.calls.length,1);tests++;
  console.log(tests+' payment UI cases passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
