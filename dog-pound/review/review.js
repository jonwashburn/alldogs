(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let key = '', sequence = 0;
  function text(tag, value) { const el=document.createElement(tag);el.textContent=value;return el; }
  async function refresh() {
    const ticket=++sequence;
    $('review-status').textContent='Loading private applications…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('https://api.alldogs.wtf/collection-api/adoption-applications', {headers:{Authorization:'Bearer '+key},credentials:'omit',cache:'no-store',signal:controller.signal});
      if (!response.ok) throw Error(response.status===403?'The review key was not accepted.':'The application desk is temporarily unavailable.');
      const data=await response.json();
      if (ticket!==sequence) return;
      if (!Array.isArray(data.applications)) throw Error('The application list could not be read.');
      const fragment=document.createDocumentFragment();
      for (const item of data.applications) {
        const card=document.createElement('article');card.className='application-card';
        const heading=document.createElement('h2'),link=text('a','@'+item.handle);link.href='https://x.com/'+encodeURIComponent(item.handle);link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
        card.append(heading,text('p',item.voucher?(item.public_id?'Vouch recorded from @':'Legacy, unverified voucher claim: @')+item.voucher:'No vouch yet'),text('p',new Date(item.created_at*1000).toLocaleString()+' · '+item.status));
        const wallet=text('code',item.wallet||({'help':'Wallet help requested','new':'Needs a new wallet','later':'Will provide a wallet on adoption day'}[item.wallet_choice]||'Wallet not supplied on this legacy application'));wallet.className='private-wallet';card.append(wallet);
        if(item.wallet){const copyWallet=text('button','Copy ETH address');copyWallet.type='button';copyWallet.className='text-link';copyWallet.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(item.wallet);copyWallet.textContent='Address copied';}catch(_){copyWallet.textContent='Select and copy the address above';}});card.append(copyWallet);}
        if(item.public_id){const publicLink=text('a','Open shareable application ↗');publicLink.href='/dog-pound/application/?id='+encodeURIComponent(item.public_id);publicLink.target='_blank';publicLink.rel='noopener noreferrer';const p=document.createElement('p');p.append(publicLink);card.append(p);}
        if(item.note) card.append(text('p',item.note));
        card.append(text('code',item.receipt));
        const copy=text('button','Copy receipt');copy.type='button';copy.className='text-link';
        copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(item.receipt);copy.textContent='Copied';}catch(_){copy.textContent='Select and copy the code above';}});
        card.append(copy);fragment.append(card);
      }
      $('applications').replaceChildren(fragment);$('review-panel').hidden=false;$('review-login').hidden=true;
      $('review-status').textContent=data.applications.length ? data.applications.length+' applications shown.' : 'No applications yet. The desk is ready.';
    } catch(error) {if(ticket===sequence)$('review-status').textContent=error.name==='AbortError'?'The request timed out. Please try again.':error.message;}
    finally {clearTimeout(timer);}
  }
  $('review-login').addEventListener('submit',event=>{event.preventDefault();key=$('review-key').value.trim();$('review-key').value='';if(key)refresh();});
  $('refresh').addEventListener('click',refresh);
  $('signout').addEventListener('click',()=>{sequence++;key='';$('applications').replaceChildren();$('review-panel').hidden=true;$('review-login').hidden=false;$('review-status').textContent='Private desk closed.';});
})();
