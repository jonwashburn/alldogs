/* No card fields or wallet connection. Receipt confirmation belongs to the API. */
(() => {
  'use strict';
  const api = window.AllDogsAccount;
  function node(tag, text, cls) { const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n; }
  function button(text, action, cls='button') { const b=node('button',text,cls);b.type='button';b.addEventListener('click',action);return b; }
  function link(text, href) {const a=node('a',text,'text-link');a.href=href;return a;}
  function checkoutURL(value) {try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='checkout.stripe.com'?u.href:null;}catch{return null;}}
  window.AllDogsPayments = {mount(host) {
    let disposed=false,read=0,timer;
    const live=()=>!disposed&&host.isConnected;
    function dispose(){disposed=true;read++;clearTimeout(timer);}
    const title=node('h2','Your artwork.');
    const message=node('p','Opening your record…','account-message');message.setAttribute('role','status');
    host.append(title,message);
    async function render() {
      const ticket=++read;clearTimeout(timer);
      try {
        const data=await api.request('club/payment');
        if(!live()||ticket!==read)return;
        host.replaceChildren(title,message);message.textContent='';
        if(data.artistGift===true||data.adoptionKind==='artist_gift'){
          title.textContent='Artist gift';
          host.append(node('p',data.message||'This is a gift from Wubbushi. No payment is due.'));
          return;
        }
        const next=Math.min(...[data.deadline, data.crypto?.validUntil, data.cardOpen?data.deadline-1800:null].filter(n=>Number.isSafeInteger(n)&&n>Date.now()/1000));
        if(Number.isFinite(next))timer=setTimeout(render,Math.min(2147483647,Math.max(1,next*1000-Date.now())));
        title.textContent='The dog is yours. The value is yours to decide.';
        const deadline=new Date(data.deadline*1000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
        host.append(node('p','Your dog is home. If you’d like to pay Wubbushi, choose an amount below. Payments received by the deadline shown become your dog’s recorded value.'));
        host.append(node('p',(data.windowOpen?'Your valuation window closes ':'Your valuation window closed ')+deadline+'.','account-note'));
        const record=node('div',undefined,'payment-record');
        record.append(node('h3','Your dog’s recorded value'));
        if(data.values.length)for(const v of data.values)record.append(node('p',v.amount+' '+v.currency,'payment-total'));
        else record.append(node('p','No confirmed payment yet.'));
        record.append(node('p','Confirmed payments are added together. Refunds are deducted; disputed payments are excluded. Amounts are public. Card details and payment receipts stay private.','account-note'),link('Most valuable dogs ↗','/most-valuable/'));
        host.append(record);
        if(!data.windowOpen){host.append(node('p','Payments received after this deadline cannot change the initial valuation.'),button('Refresh payment status',render,'text-link'));return;}
        const rails=node('div',undefined,'payment-options');host.append(rails);
        const card=node('section');card.append(node('h3','Credit card'));
        if(data.cardReady){
          const pending=data.pendingCheckout;
          if(pending?.url&&checkoutURL(pending.url)){
            const resume=link('Continue your '+pending.amount+' USD checkout ↗',checkoutURL(pending.url));resume.className='button primary';
            card.append(resume,button('Close this checkout',async()=>{try{await api.request('club/payment-cancel',{});await render();}catch(e){message.textContent=e.message;}}));
          } else if(data.cardOpen) {
            const form=node('form'),label=node('label','Your amount (USD)'),input=node('input');
            input.name='amount';input.type='text';input.inputMode='decimal';input.required=true;input.maxLength=9;input.placeholder='Enter an amount';input.autocomplete='off';label.append(input);
            const submit=node('button','Pay by credit card ↗','button primary');submit.type='submit';form.append(label,submit);
            // Keep one retry id for this amount, including a network timeout.
            let lastAmount='',requestId='';
            form.addEventListener('submit',async event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;message.textContent='Opening secure checkout…';
              try{const amount=input.value.trim();if(amount!==lastAmount){requestId=crypto.randomUUID();lastAmount=amount;}
                const result=await api.request('club/payment-checkout',{amount,requestId});const url=checkoutURL(result.url);if(!url)throw Error('Checkout could not be verified. Please refresh.');if(live())location.assign(url);
              }catch(e){message.textContent=e.message;submit.disabled=false;}
            });card.append(form);
          } else card.append(node('p','New card checkouts close 30 minutes before your deadline so they can expire before your deadline.'));
          card.append(node('p','Card details go directly to Stripe. Card processing starts at $0.50; there is no set price for the artwork.','account-note'));
        } else card.append(node('p','Please contact Wubbushi to arrange your payment.'));
        rails.append(card);
        const cryptoPanel=node('section');cryptoPanel.append(node('h3','Ethereum'));
        if(data.cryptoReady&&data.crypto){const coin=data.crypto;
          cryptoPanel.append(node('p','Send '+coin.currency+' on '+coin.network+' by '+deadline+'. Once confirmed, it automatically appears as your dog’s value.'));
          const label=node('label','Pay Wubbushi at'),address=node('input');address.value=coin.address;address.readOnly=true;address.setAttribute('aria-label','Wubbushi payment address');label.append(address);cryptoPanel.append(label);
          cryptoPanel.append(button('Copy address',async()=>{try{await navigator.clipboard.writeText(coin.address);message.textContent='Address copied. Send ETH on Ethereum mainnet only.';}catch{address.select();message.textContent='Select and copy the address above.';}}));
          cryptoPanel.append(node('p','A direct ETH transfer from '+coin.fromAddress+' is matched automatically. If you send from a different wallet or an exchange, contact Wubbushi with the transaction hash so we can check it. Use Ethereum mainnet, and send ETH rather than a token.','account-note'));
          const details=node('details'),summary=node('summary','Already sent it? Check a transfer.');details.append(summary);
          const form=node('form'),txLabel=node('label','Transaction hash'),tx=node('input');tx.required=true;tx.maxLength=66;tx.placeholder='0x…';txLabel.append(tx);const check=node('button','Check transfer','button');check.type='submit';form.append(txLabel,check);
          form.addEventListener('submit',async event=>{event.preventDefault();check.disabled=true;try{const result=await api.request('club/payment-crypto',{transaction:tx.value.trim()});await render();if(!live())return;message.textContent=result.voided?'This receipt was removed from your dog’s value. Contact Wubbushi if you need help.':result.needsReview?'We found the transfer. Wubbushi needs to review it before it can count toward your dog’s value.':result.recorded?'Transfer confirmed. Your dog’s recorded value is updated.':'This transfer has not been added to your dog’s value.';}catch(e){message.textContent=e.message;check.disabled=false;}});details.append(form);cryptoPanel.append(details);
        }else cryptoPanel.append(node('p','Please contact Wubbushi for payment instructions. Do not send funds to an unverified address.'));
        rails.append(cryptoPanel);
        host.append(node('p','These values are recorded in the All Dogs website register.','account-note'));
        host.append(button('Refresh payment status',render,'text-link'));
        if(new URLSearchParams(location.search).get('payment')==='return')message.textContent='Welcome back. Your dog’s value will update when the payment is confirmed.';
      }catch(error){if(!live()||ticket!==read)return;message.textContent=error.message;host.replaceChildren(title,message,button('Try again',render,'text-link'));}
    }
    render();
    return {dispose,refresh:render};
  }};
})();
