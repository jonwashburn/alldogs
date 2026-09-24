(() => {
  'use strict';
  const api=window.AllDogsAccount;
  const address=value=>typeof value==='string'&&/^0x[0-9a-f]{40}$/i.test(value)&&!/^0x0{40}$/i.test(value);
  const hash=value=>typeof value==='string'&&/^0x[0-9a-f]{64}$/i.test(value);
  const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
  const uint=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value)&&BigInt(value)<2n**256n;
  const chainName=value=>({'1':'Ethereum','11155111':'Ethereum Sepolia'}[String(BigInt(value))]||'Network '+BigInt(value));
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const short=value=>value.slice(0,6)+'…'+value.slice(-4);
  const when=value=>new Date(value*1000).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  const now=()=>Math.floor(Date.now()/1000);
  const reviewFields=['reservationId','dogId','dogName','receivingAddress','linkedAddress','chainId','collection'];
  const payload=a=>Object.fromEntries(reviewFields.map(key=>[key,a[key]]));
  const fingerprint=a=>JSON.stringify({...payload(a),deadline:a.deadline,originalURI:a.originalURI});
  function reviewValid(a,expected){
    if(!a||!hash(a.reservationId)||!['prepared','issued'].includes(a.status)||
       !address(a.receivingAddress)||!(a.linkedAddress===null||address(a.linkedAddress)&&!same(a.linkedAddress,a.receivingAddress))||!address(a.collection)||!uint(a.chainId)||BigInt(a.chainId)===0n||
       !Number.isSafeInteger(a.deadline)||a.deadline<=0||a.dogId!==expected.dogId||a.dogName!==expected.dogName||
       typeof a.originalURI!=='string'||!a.originalURI.startsWith('ipfs://')&&!a.originalURI.startsWith('ar://')||
       a.confirmationRequired!==(a.status==='prepared')||'transaction' in a||'typedData' in a){
      throw Error('The delivery details could not be verified. Reopen your invitation to check them.');
    }
    return a;
  }
  function mount(host,initial,options={}){
    let state=initial,disposed=false,busy=false,checking=false,checked=true,timer,note='',receiving='',second='',readNumber=0,paymentController=null;
    const expected={dogId:options.dogId||initial.delivery?.dogId||initial.approval?.dogId,dogName:options.dogName||initial.delivery?.dogName||initial.approval?.dogName};
    const invitation=initial.invitationId;
    const shell=node('section',undefined,'mint-card'),body=node('div'),status=node('p','','mint-status');
    const paymentPanel=node('div',undefined,'payment-card');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');shell.append(body,status);host.append(shell);
    let legacyPending=false;
    try{const saved=JSON.parse(localStorage.getItem('alldogs-transaction:'+invitation)||'null');legacyPending=saved?.kind==='mint'&&saved.invitationId===invitation;}catch{}
    const live=()=>!disposed&&host.isConnected;
    function check(){if(!live())throw Error('This invitation has been closed.');}
    function lock(){options.onLock?.(Boolean(state.approval||state.delivery||legacyPending||!checked));}
    async function fresh(background=false){
      const serial=++readNumber,next=await api.request('club/mint-state');check();
      if(serial!==readNumber||background&&busy)return;
      if(next.invitationId!==invitation)throw Error('Reopen your own invitation before continuing.');
      state=next;checked=true;lock();
    }
    async function run(action){
      if(busy||!live())return;busy=true;note='';readNumber++;render();
      try{await action();}
      catch(error){if(live()){note=String(error?.message||'We could not check your delivery. Please try again.');checked=false;lock();}}
      finally{busy=false;if(live())render();}
    }
    function button(text,action,cls='mint-button'){
      const b=node('button',text,cls);b.type='button';b.disabled=busy;b.addEventListener('click',()=>run(action));return b;
    }
    function reviewView(a){
      const waiting=a.status==='issued';
      body.append(node('h2',waiting?'Your address is confirmed.':'One last look.'));
      body.append(node('p',waiting?'We’ll update this page when '+expected.dogName+' has arrived. You can close it and return through your invitation.':'We’ll send '+expected.dogName+' to this address. Please check the whole address before confirming.'));
      const details=node('dl',undefined,'mint-review');
      const rows=[['Your dog',a.dogName,''],['Network',chainName(a.chainId),''],['Receiving address',a.receivingAddress,'mint-receiving-address']];
      if(a.linkedAddress)rows.push(['Your second wallet',a.linkedAddress,'mint-receiving-address']);
      for(const [label,value,cls] of rows){
        details.append(node('dt',label),node('dd',value,cls));
      }
      body.append(details);
      if(a.linkedAddress)body.append(node('p','Moving '+expected.dogName+' between these two wallets won’t count as a sale.'));
      const record=node('details');record.append(node('summary','Collection details'),node('p',a.collection,'mint-address'));body.append(record);
      if(waiting){body.append(button('Check delivery',()=>fresh()));return;}
      if(!checked||!state.mintingReady||state.awaitingExpiryConfirmation||a.deadline<=now()){
        body.append(node('p','We’re checking your saved address before you continue.'),button('Check again',()=>fresh()));return;
      }
      const reviewed=fingerprint(a),confirmedPayload=payload(a);
      body.append(button('Send '+expected.dogName+' to this address',async()=>{
        await fresh();
        if(state.delivery)return;
        const current=reviewValid(state.approval,expected);
        if(fingerprint(current)!==reviewed)throw Error('Your delivery details changed. Please review them again.');
        if(current.status==='issued')return;
        if(!state.mintingReady||state.awaitingExpiryConfirmation||current.deadline<=now())throw Error('Please check the saved address again before confirming.');
        const result=reviewValid(await api.request('club/mint-confirm',{invitationId:invitation,...confirmedPayload}),expected);check();
        if(fingerprint(result)!==reviewed||result.status!=='issued')throw Error('We could not confirm these delivery details. Check the latest record before trying again.');
        state={...state,approval:result};lock();
      }));
      body.append(button('Change address',async()=>{
        const result=await api.request('club/mint-address-change',{invitationId:invitation,reservationId:a.reservationId});check();
        if(result.released!==true||result.reservationId!==a.reservationId)throw Error('We could not reopen this address. Check the latest record.');
        receiving=a.receivingAddress;second=a.linkedAddress||'';await fresh();
      },'mint-button mint-secondary'));
    }
    function deliveredView(){
      const d=state.delivery,p=state.payment;
      if(!address(d.wallet)||!address(d.collection)||!uint(d.chainId)||!uint(d.tokenId)||!uint(d.tipWei)||!Number.isSafeInteger(d.tipClosesAt))throw Error('The delivery record could not be verified.');
      const holder=d.ownership;
      const verified=holder?.status==='verified' && address(holder.currentWallet) && same(holder.originalWallet,d.wallet) && holder.tokenId===d.tokenId && uint(holder.saleCount) && Number.isSafeInteger(holder.asOfBlock) && holder.asOfBlock>=0 && Number.isSafeInteger(holder.checkedAt) && now()-holder.checkedAt>=0 && now()-holder.checkedAt<=300;
      const atHome=verified && same(holder.currentWallet,d.wallet);
      body.append(node('h2',atHome?d.dogName+' is yours.':'Your adoption of '+d.dogName+'.'),node('p','First delivered to '+short(d.wallet)+' on '+chainName(d.chainId)+'.'));
      const ownership=node('div',undefined,'mint-ownership');
      if(verified){
        ownership.append(node('p',atHome?'Held in your adoption wallet.':'Now held in another wallet.'),node('p',holder.currentWallet,'mint-address'),node('p','Confirmed through block '+holder.asOfBlock+' · checked '+when(holder.checkedAt)+'.','mint-help'));
        if(!atHome)ownership.append(node('p','Your place as the original adopter stays with this dog.'));
      }else ownership.append(node('p','Checking the current holder. Your original adoption record is saved.'));
      body.append(ownership);
      const detail=node('details'),summary=node('summary','NFT record');detail.append(summary,node('p','Original adoption wallet: '+d.wallet,'mint-address'),node('p','Collection: '+d.collection,'mint-address'),node('p','Token '+d.tokenId));if(verified)detail.append(node('p','Recorded wallet moves: '+holder.saleCount));body.append(detail);
      if(d.artistGift){body.append(node('p','We hope you love '+d.dogName+'. This is a gift from Wubbushi. No payment is due.'));return;}
      if(state.externalPayment!==true||!window.AllDogsPayments){body.append(node('p','Your payment details are being prepared. Please check back shortly.'));return;}
      body.append(paymentPanel);
      if(!paymentController)paymentController=window.AllDogsPayments.mount(paymentPanel);

    }
    function render(){
      if(!live())return;
      const focused=body.contains(document.activeElement)&&document.activeElement.name==='receiving-address';
      const selection=focused?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null;
      body.replaceChildren();shell.hidden=!state.mintingReady&&!state.approval&&!state.delivery&&!state.message&&checked;
      status.textContent=note;shell.setAttribute('aria-busy',String(busy));
      try{
        if(state.delivery){deliveredView();return;}
        if(legacyPending||state.recipientAuthorization!=='account'){
          if(!shell.hidden)body.append(node('h2','Your dog is saved.'),node('p','Delivery details are being prepared. Please check back here shortly.'));
          return;
        }
        if(state.approval){reviewView(reviewValid(state.approval,expected));return;}
        if(!checked||!state.mintingReady){
          if(!shell.hidden)body.append(node('h2','Your dog is saved.'),node('p',state.message||'Delivery details are being checked. Please try again shortly.'),button('Check again',()=>fresh()));return;
        }
        if(typeof expected.dogId!=='string'||typeof expected.dogName!=='string'||!expected.dogName)throw Error('Choose and name your dog before delivery.');
        body.append(node('h2','Where should '+expected.dogName+' live?'),node('p','Add the address where you’d like to receive your dog. You’ll review it before we send the painting.'));
        const form=node('form'),label=node('label','NFT receiving address'),input=node('input');
        input.name='receiving-address';input.type='text';input.autocomplete='off';input.spellcheck=false;input.autocapitalize='none';input.required=true;input.maxLength=42;input.value=receiving;input.placeholder='0x…';input.disabled=busy;
        input.addEventListener('input',()=>{receiving=input.value;});label.append(input);form.append(label);
        const label2=node('label','Your second wallet (optional)'),input2=node('input');
        input2.name='linked-address';input2.type='text';input2.autocomplete='off';input2.spellcheck=false;input2.autocapitalize='none';input2.maxLength=42;input2.value=second;input2.placeholder='0x…';input2.disabled=busy;
        input2.addEventListener('input',()=>{second=input2.value;});label2.append(input2);form.append(label2,node('p','If you keep your dog in more than one wallet you own, such as a hardware wallet, add it here. Moving your dog between these two wallets won’t count as a sale. This can only be set before your dog is sent.','mint-hint'));
        const submit=node('button','Review address','mint-button');submit.type='submit';submit.disabled=busy;form.append(submit);
        form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
          const chosen=receiving.trim();if(!address(chosen))throw Error('Copy a complete receiving address starting with 0x.');
          const linked=second.trim();if(linked&&!address(linked))throw Error('Copy your complete second wallet address starting with 0x, or leave it empty.');
          if(linked&&same(linked,chosen))throw Error('Your second wallet must be different from the receiving address.');
          await fresh();if(state.delivery||state.approval)return;
          if(!state.mintingReady||state.recipientAuthorization!=='account')throw Error('Delivery is being checked. Please try again shortly.');
          const result=reviewValid(await api.request('club/mint-address',{invitationId:invitation,receivingAddress:chosen,linkedAddress:linked||null}),expected);check();
          if(!same(result.receivingAddress,chosen)||(linked?!same(result.linkedAddress||'',linked):result.linkedAddress!==null))throw Error('The saved address differs from the one you entered. Please reopen your invitation.');
          state={...state,approval:result};lock();
        });});body.append(form);
        const help=node('details');help.append(node('summary','I don’t have a receiving address yet.'),node('p','Your dog is saved. You can return through your invitation once you have an address, or ask Wubbushi for help.'));body.append(help);
      }catch(error){body.replaceChildren(node('h2','Your dog is saved.'),node('p',error.message),button('Check again',()=>fresh()));}
      finally{
        status.textContent=note;
        if(focused){const input=body.querySelector('[name="receiving-address"]');if(input&&!input.disabled){input.focus({preventScroll:true});input.setSelectionRange(...selection);}}
      }
    }
    async function refresh(){
      if(!live()||busy||checking||document.hidden)return;checking=true;
      try{const before=JSON.stringify(state),wasChecked=checked;await fresh(true);if(!busy&&(before!==JSON.stringify(state)||!wasChecked||state.approval?.deadline<=now()||state.delivery?.ownership?.checkedAt<=now()-300))render();}
      catch{if(live()){note='We could not check the latest record. Please try again.';checked=false;state={...state,mintingReady:false,delivery:state.delivery?{...state.delivery,ownership:null}:undefined};lock();render();}}
      finally{checking=false;}
    }
    function schedule(){clearTimeout(timer);if(live())timer=setTimeout(async()=>{await refresh();schedule();},8000);}
    const visibility=()=>{if(!document.hidden)refresh();};
    function dispose(){paymentController?.dispose();disposed=true;readNumber++;clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',dispose);}
    lock();render();schedule();document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',dispose);
    return {dispose,refresh};
  }
  window.AllDogsMint={mount};
})();
