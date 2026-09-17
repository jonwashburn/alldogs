// Isolated email preferences: no network, real receipts, or messages.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const identity={receipt:'DOG-1234567890ABCDEF',publicId:'Rtju0IVQRFdELy3r0GN-pycj'};
function harness(contact=null){
  const elements=new Map(),calls=[];let failed=false,current=contact;
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,disabled:false,value:'',checked:false,events:{},reportValidity:()=>true,focus(){this.focused=true;},addEventListener(name,fn){this.events[name]=fn;}});return elements.get(id);};
  const context={window:{},document:{getElementById:element},AbortController,setTimeout,clearTimeout,
    fetch:async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,options,body});
      if(failed)return{ok:false,json:async()=>({error:'Email storage unavailable. Your application is safe.'})};
      if(body.action==='save')current={email:body.email,artUpdates:body.artUpdates,verified:false};
      if(body.action==='remove')current=null;
      return{ok:true,json:async()=>({contact:current,deliveryReady:false})};}};
  vm.runInNewContext(fs.readFileSync('dog-pound/application-email.js','utf8'),context);
  return{element,calls,show:()=>context.window.AllDogsApplicationEmail.show(identity.receipt,identity.publicId),fail:()=>{failed=true;}};
}
(async()=>{
  let tests=0;
  for(const art of [false,true]){
    const h=harness();assert.equal(h.calls.length,0);await h.show();
    assert.equal(h.element('application-email').hidden,false);assert.equal(h.element('art-updates').checked,false);
    h.element('notification-email').value=' collector@example.com ';h.element('art-updates').checked=art;
    await h.element('application-email-form').events.submit({preventDefault(){}});
    const saved=h.calls[1];assert.equal(saved.body.email,'collector@example.com');assert.equal(saved.body.artUpdates,art);
    assert.equal(saved.body.receipt,identity.receipt);assert.equal(saved.body.publicId,identity.publicId);
    assert.equal(saved.body.consentVersion,'invitation-and-art-v1');assert.equal(saved.options.credentials,'omit');
    assert.equal(saved.options.cache,'no-store');assert.equal(new URL(saved.url).search,'');
    assert.match(h.element('email-status').textContent,art?/other Wubbushi art/:/invitation only/);tests++;
  }
  const restore=harness({email:'saved@example.com',artUpdates:true,verified:false});await restore.show();await restore.show();
  assert.equal(restore.calls.length,1);assert.equal(restore.element('notification-email').value,'saved@example.com');
  assert.equal(restore.element('art-updates').checked,true);assert.equal(restore.element('remove-email').hidden,false);tests++;
  const skip=harness();await skip.show();skip.element('skip-email').events.click();assert.equal(skip.element('application-email').hidden,true);
  assert.equal(skip.calls.length,1);skip.element('reopen-email').events.click();assert.equal(skip.element('application-email').hidden,false);tests++;
  const remove=harness({email:'saved@example.com',artUpdates:true});await remove.show();await remove.element('remove-email').events.click();
  assert.equal(remove.calls[1].body.action,'remove');assert.equal(remove.element('notification-email').value,'');
  assert.equal(remove.element('art-updates').checked,false);assert.equal(remove.element('remove-email').hidden,true);tests++;
  const failure=harness();await failure.show();failure.fail();failure.element('notification-email').value='collector@example.com';
  await failure.element('application-email-form').events.submit({preventDefault(){}});
  assert.equal(failure.element('email-status').className,'error');assert.equal(failure.element('save-email').disabled,false);
  assert.equal(failure.element('notification-email').value,'collector@example.com');assert.doesNotMatch(failure.element('email-status').textContent,/Email saved/);tests++;
  for(const file of ['index.html','dog-pound/index.html']){
    const html=fs.readFileSync(file,'utf8');const mainForm=html.indexOf('<form id="application-form">');
    const endMain=html.indexOf('</form>',mainForm),emailForm=html.indexOf('<form id="application-email-form">');
    assert.ok(endMain<emailForm);assert.ok(html.indexOf('application-email.js')<html.indexOf('adoption-form.js'));
    assert.match(html,/<input id="art-updates"[^>]*>/);assert.doesNotMatch(html.match(/<input id="art-updates"[^>]*>/)[0],/checked/);
    assert.ok(html.includes('Email invitations are not sending yet.'));tests++;
  }
  console.log(`${tests} isolated frontend email preference cases passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
