// Isolated DOM doubles: no browser, wallet access, network, or live submissions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const publicId = 'Rtju0IVQRFdELy3r0GN-pycj';
const receipt = 'DOG-1234567890ABCDEF';
const response = {publicId,shortId:2,handle:'test_dog',status:'looking_for_vouch',vouchedBy:null};
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness(file, path, search, stored = {}, opts = {}) {
  const elements = new Map(), calls = [], storage = new Map(Object.entries(stored));
  let replaced, copied;
  const makeElement = () => {
    const node = {hidden:false,disabled:false,value:'',events:{},style:{},children:[],
      addEventListener(name, fn) {this.events[name] = fn;},querySelector:()=>({after(){}}),querySelectorAll:()=>[],reportValidity:()=>true,
      append(...children) {this.children.push(...children);}, before() {}, after() {},
      closest() {return element(this.id+'-label');}, setAttribute(name,value) {this[name]=value;}};
    Object.defineProperty(node,'id',{get(){return this._id;},set(value){this._id=value;elements.set(value,this);}});
    return node;
  };
  const element = id => {
    if (!elements.has(id)) makeElement().id=id;
    return elements.get(id);
  };
  const context = {document:{getElementById:id=>id==='adoption-dialog'||(id==='wishlist-invitation'&&!elements.has(id))?null:element(id),createElement:makeElement},
    location:{pathname:path,search},history:{replaceState:(_,__,value)=>{replaced=value;}},
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    navigator:{userAgent:opts.ua||'',clipboard:{writeText:async value=>{copied=value;}}},
    window:{},URLSearchParams,AbortController,setTimeout,clearTimeout,TextEncoder,
    crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789012'},
    fetch:async (url, options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('adoption-applications')?{...response,receipt}:response};}};
  context.window.AllDogsAccount={request:async (path,body)=>{calls.push({url:path,options:{body:JSON.stringify(body)}});return path==='club/account'&&opts.account?opts.account:path==='club/registration'?{handle:'test_dog',application:stored['alldogs-application-receipt']?{...response,receipt}:null}:path==='club/registration-draft'?{...response,receipt,status:'awaiting_verification',shortId:null}:path==='club/registration-verify'?{...response,receipt}:response;},session:async()=>opts.session||({signedIn:file.includes('adoption-form'),authMethod:'x',handle:'test_dog',capabilities:{xLogin:true}}),signIn:path=>path};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  return {element,calls,storage,get replaced(){return replaced;},get copied(){return copied;}};
}

(async () => {
  let tests = 0;
  for (const [path,search] of [['/vouch/2',''],['/vouch/2/',''],['/dog-pound/application/','?id='+publicId]]) {
    const h = harness('dog-pound/application/application.js',path,search);
    await settle();
    assert.equal(h.element('applicant-handle').textContent,'@test_dog');
    assert.equal(new URL(h.element('share-application-x').href).searchParams.get('url'),'https://alldogs.wtf/vouch/2');
    assert.equal(h.calls.length,1);
    assert.ok(h.calls[0].url.endsWith('id='+(path.startsWith('/vouch/')?'2':publicId)));
    if (search) assert.equal(h.replaced,'/vouch/2');
    tests++;
  }
  for (const path of ['/vouch/0','/vouch/01','/vouch/10001']) {
    const h = harness('dog-pound/application/application.js',path,'');
    await settle();
    assert.equal(h.calls.length,0);
    assert.equal(h.element('public-application').hidden,true);
    tests++;
  }
  {
    const h = harness('dog-pound/application/application.js','/vouch/2','?signin=unavailable');
    await settle();
    assert.equal(h.element('browser-help').hidden,false);
    assert.equal(h.element('connect-owner').hidden,false);
    assert.equal(h.element('connect-owner').textContent,'Try signing in with X again');
    assert.match(h.element('browser-help-text').textContent,/did not finish/);
    assert.equal(h.replaced,'/vouch/2');
    await h.element('copy-vouch-link').events.click();
    assert.equal(h.copied,'https://alldogs.wtf/vouch/2');
    tests++;
  }
  for (const [ua,inApp] of [['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/11.0',true],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 TwitterAndroid',true],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',false]]) {
    const h = harness('dog-pound/application/application.js','/vouch/2','',{},{ua});
    await settle();
    assert.equal(h.element('browser-help').hidden,!inApp);
    assert.equal(h.element('connect-owner').hidden,false);
    tests++;
  }
  {
    const vouch={eligible:true,reason:'eligible',slots:1,weeklyLimit:1,nextVouchAt:null};
    const h = harness('dog-pound/application/application.js','/vouch/2','',{},{session:{signedIn:true,handle:'owner_dog',csrf:'x',capabilities:{xLogin:true}},account:{owner:{vouch},vouches:[]}});
    await settle();
    assert.equal(h.element('sign-vouch').hidden,false);
    assert.equal(h.element('sign-vouch').textContent,'Vouch for @test_dog');
    assert.equal(h.element('connect-owner').hidden,true);
    assert.equal(h.element('browser-help').hidden,true);
    assert.match(h.element('wallet-status').textContent,/1 of 1 vouch available/);
    tests++;
  }
  {
    const h = harness('dog-pound/application/application.js','/vouch/2','',{},{session:{signedIn:true,handle:'someone_else',csrf:'x',capabilities:{xLogin:true}},account:{owner:null,vouches:[]}});
    await settle();
    assert.equal(h.element('sign-vouch').hidden,true);
    assert.equal(h.element('switch-account').hidden,false);
    assert.match(h.element('wallet-status').textContent,/not on a confirmed adoption/);
    tests++;
  }
  for (const storedId of [undefined,'2']) {
    const stored = {'alldogs-application-receipt':receipt,'alldogs-application-public-id':publicId};
    if (storedId) stored['alldogs-application-short-id'] = storedId;
    const h = harness('dog-pound/adoption-form.js','/','',stored);
    await settle();
    assert.equal(h.element('wishlist-invitation').children[2].href,'/dog-pound/');
    assert.equal(h.element('view-application').href,'https://alldogs.wtf/vouch/2');
    assert.equal(new URL(h.element('share-on-x').href).searchParams.get('url'),'https://alldogs.wtf/vouch/2');
    await h.element('copy-application').onclick();
    assert.equal(h.copied,'https://alldogs.wtf/vouch/2');
    assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'club/registration');
    tests++;
  }
  for (const choice of ['existing','new','later']) {
    const h = harness('dog-pound/adoption-form.js','/','');
    await settle();
    assert.equal(h.element('wallet').disabled,true);
    assert.equal(h.element('wallet-help').hidden,true);
    assert.equal(JSON.stringify(h.element('wallet-choice').children.map(option=>[option.value,option.textContent])),JSON.stringify([
      ['', 'Choose an option'], ['existing', 'I have a wallet'], ['new', 'I don’t have a wallet'], ['later', 'I’ll provide my wallet later']
    ]));
    h.element('wallet-choice').value=choice;h.element('wallet-choice').events.change();
    assert.equal(h.element('wallet').disabled,choice!=='existing');
    assert.equal(h.element('wallet').required,choice==='existing');
    assert.equal(h.element('wallet-label').hidden,choice!=='existing');
    assert.equal(h.element('wallet-help').hidden,choice==='existing');
    assert.equal(h.element('wallet-help').textContent,({existing:'',new:'No worries, we’ll get you set up with one.',later:'Got it. We’ll ask again on adoption day.'})[choice]);
    h.element('handle').value='test_dog';h.element('wallet').value='0x'+'12'.repeat(20);h.element('website').value='';
    await h.element('application-form').events.submit({preventDefault(){}});
    assert.equal(h.element('application-verification').hidden,false);
    assert.equal(h.calls.length,2);assert.equal(h.calls[1].url,'club/registration-draft');
    const payload=JSON.parse(h.calls[1].options.body);
    assert.equal(payload.applicationFlow,'waitlist-first-v4');assert.equal(payload.walletChoice,choice);
    assert.equal(payload.wallet,choice==='existing'?'0x'+'12'.repeat(20):'');
    tests++;
  }
  console.log(`${tests} isolated frontend short-link and wallet-help cases passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
