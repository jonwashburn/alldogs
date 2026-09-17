(() => {
  'use strict';
  const api=window.AllDogsAccount,$=id=>document.getElementById(id);let key='',busy=false;
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  async function action(body){if(busy)return;busy=true;try{await api.request('club/invite',body,key);await load();$('desk-message').textContent=body.action==='revoke'?'Invitation withdrawn. Its dogs are available again.':'Invitation saved. Send the applicant to https://alldogs.wtf/viewing-room/ using their verified X account. Automatic notifications are not connected yet.';}catch(e){$('desk-message').textContent=e.message;}finally{busy=false;}}
  async function load(){
    const data=await api.request('club/desk',undefined,key),root=$('desk-content');root.replaceChildren();$('desk-login').hidden=true;
    const close=node('button','Close desk');close.className='button';close.onclick=()=>{key='';root.replaceChildren();$('desk-login').hidden=false;$('desk-message').textContent='Desk closed.';};root.append(close);
    if(!data.capabilities.xLogin)root.append(node('p','X sign-in is not connected. Applicants must sign in and link their application before they can receive a private viewing.'));
    if(!data.applications.length)root.append(node('p','No linked applications yet. Applications still awaiting sign-in are in the application desk.'));
    for(const app of data.applications){const card=node('section');card.className='account-card';card.append(node('h2','@'+app.currentHandle),node('p',app.status.replaceAll('_',' ')));
      if(app.invitation&&app.invitation.status!=='revoked'){
        const inv=app.invitation;card.append(node('p',inv.status==='chosen'?'Saved choice: '+inv.dog_name:'Invitation open. No dog selected yet.'));
        const names=JSON.parse(inv.dogs).map(id=>data.dogs.find(d=>d.id===id)?.title||id);card.append(node('p',names.join(' · ')));
        const revoke=node('button','Withdraw this invitation');revoke.className='button';revoke.onclick=()=>{if(confirm('Withdraw this invitation and release its three dogs?'))action({publicId:app.publicId,action:'revoke'});};card.append(revoke);root.append(card);continue;
      }
      const form=node('form'),noteLabel=node('label','A note for this person'),note=node('textarea');note.maxLength=1000;note.rows=3;noteLabel.append(note);form.append(noteLabel);
      const foundingLabel=node('label'),founding=node('input');founding.type='checkbox';foundingLabel.append(founding,document.createTextNode(' Founding invitation (no owner vouch; explain in the note)'));form.append(foundingLabel);
      const count=node('p','Choose 3 paintings.'),grid=node('div');grid.className='desk-dogs';const checks=[];
      for(const dog of data.dogs){if(dog.reserved||dog.adopted)continue;const label=node('label'),input=node('input');input.type='checkbox';input.value=dog.id;checks.push(input);const img=node('img');img.loading='lazy';img.alt=dog.title;img.src=dog.variants?.[0]?.src||dog.original;label.append(img,input,document.createTextNode(' '+dog.title));grid.append(label);input.onchange=()=>{const n=checks.filter(c=>c.checked).length;count.textContent=n+' of 3 paintings selected.';for(const c of checks)c.disabled=n>=3&&!c.checked;};}
      const submit=node('button','Invite to this viewing');submit.className='button primary';submit.type='submit';form.append(count,grid,submit);form.onsubmit=e=>{e.preventDefault();const dogIds=checks.filter(c=>c.checked).map(c=>c.value);if(dogIds.length!==3){$('desk-message').textContent='Choose exactly three paintings.';return;}action({publicId:app.publicId,dogIds,note:note.value,founding:founding.checked});};card.append(form);root.append(card);
    }
  }
  $('desk-key-form').onsubmit=async e=>{e.preventDefault();key=$('desk-key').value.trim();$('desk-key').value='';try{await load();$('desk-message').textContent='Viewing desk open.';}catch(error){key='';$('desk-message').textContent=error.message;}};
})();
