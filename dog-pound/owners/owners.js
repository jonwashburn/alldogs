(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let owners = [], loaded = false;
  const reasons = {eligible:'Eligible to vouch',weekly_limit:'Weekly allowance used',disabled_by_artist:'Vouching disabled by Wubbushi',sold_own_dog:'Not eligible: sold their dog',invitee_sold:'Not eligible: someone they directly vouched for sold their dog'};
  function text(tag,value) {const e=document.createElement(tag);e.textContent=value;return e;}
  function render() {
    if (!loaded) return;
    const term=$('owner-search').value.trim().toLowerCase().replace(/^@/,'');
    const shown=owners.filter(o=>(o.handle+' '+o.dogName).toLowerCase().includes(term));
    const fragment=document.createDocumentFragment();
    for(const owner of shown) {
      const card=document.createElement('article');card.className='owner-card';
      const heading=text('h2',owner.dogName),person=text('a','@'+owner.handle);person.href='https://x.com/'+encodeURIComponent(owner.handle);person.target='_blank';person.rel='noopener noreferrer';
      const state=text('span',owner.dogStatus);state.className='status-tag';
      const eligibility=text('p',reasons[owner.vouch.reason]||'Eligibility unavailable');eligibility.className=owner.vouch.eligible?'eligibility yes':'eligibility';
      card.append(state,heading,person,eligibility,text('p',owner.vouch.slots+' of '+owner.vouch.weeklyLimit+' vouches available this week · '+owner.vouch.outstanding+' permanent vouches pending'));
      card.append(text('p','Adopted '+new Date(owner.adoptedAt*1000).toLocaleDateString()));
      if(owner.vouchedBy)card.append(text('p','Vouched for by @'+owner.vouchedBy));
      if(owner.hasSold)card.append(text('p','Original adopter · dog has been sold'));
      fragment.append(card);
    }
    $('owners-list').replaceChildren(fragment);
    $('owners-status').textContent=!owners.length?'No confirmed adoptions yet. Wubbushi will invite the founding owners. You can apply now and find an owner to vouch for you later.':shown.length+' of '+owners.length+' adopters'+(!shown.length?' · no matches':'');
  }
  async function load(){
    $('refresh-owners').disabled=true;$('owners-status').textContent='Refreshing confirmed adoptions…';
    const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
    try {const r=await fetch('https://api.alldogs.wtf/collection-api/owners',{cache:'no-store',signal:c.signal});if(!r.ok)throw Error();const d=await r.json();if(!Array.isArray(d.owners))throw Error();owners=d.owners;loaded=true;render();}
    catch(_){loaded=false;$('owners-list').replaceChildren();$('owners-status').textContent='The adoption register could not load. Please refresh to try again.';}
    finally{clearTimeout(t);$('refresh-owners').disabled=false;}
  }
  $('owner-search').addEventListener('input',render);$('refresh-owners').addEventListener('click',load);load();
})();
