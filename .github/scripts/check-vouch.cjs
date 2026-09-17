// Isolated DOM doubles: no browser, wallet access, network, or live submissions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const publicId = 'Rtju0IVQRFdELy3r0GN-pycj';
const receipt = 'DOG-1234567890ABCDEF';
const response = {publicId,shortId:2,handle:'test_dog',status:'looking_for_vouch',vouchedBy:null};
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness(file, path, search, stored = {}) {
  const elements = new Map(), calls = [], storage = new Map(Object.entries(stored));
  let replaced, copied;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {hidden:false,disabled:false,events:{},
      addEventListener(name, fn) {this.events[name] = fn;},querySelectorAll:()=>[],reportValidity:()=>true});
    return elements.get(id);
  };
  const context = {document:{getElementById:id=>id==='adoption-dialog'?null:element(id)},
    location:{pathname:path,search},history:{replaceState:(_,__,value)=>{replaced=value;}},
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    navigator:{clipboard:{writeText:async value=>{copied=value;}}},
    window:{},URLSearchParams,AbortController,setTimeout,clearTimeout,TextEncoder,
    crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789012'},
    fetch:async (url, options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('adoption-applications')?{...response,receipt}:response};}};
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
  for (const storedId of [undefined,'2']) {
    const stored = {'alldogs-application-receipt':receipt,'alldogs-application-public-id':publicId};
    if (storedId) stored['alldogs-application-short-id'] = storedId;
    const h = harness('dog-pound/adoption-form.js','/','',stored);
    await settle();
    assert.equal(h.element('view-application').href,'https://alldogs.wtf/vouch/2');
    assert.equal(new URL(h.element('share-on-x').href).searchParams.get('url'),'https://alldogs.wtf/vouch/2');
    await h.element('copy-application').onclick();
    assert.equal(h.copied,'https://alldogs.wtf/vouch/2');
    assert.equal(h.calls.length,storedId?0:1);
    tests++;
  }
  const h = harness('dog-pound/adoption-form.js','/','');
  h.element('handle').value='test_dog';h.element('wallet').value='0x'+'12'.repeat(20);h.element('website').value='';
  await h.element('application-form').events.submit({preventDefault(){}});
  assert.equal(h.element('view-application').href,'https://alldogs.wtf/vouch/2');
  assert.equal(h.calls.length,1);
  assert.equal(JSON.parse(h.calls[0].options.body).applicationFlow,'share-page-v2');
  tests++;
  console.log(`${tests} isolated frontend short-link cases passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
