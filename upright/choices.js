export const QUESTIONS = [
  {id:'eyes', label:'Eyes', question:'Which portrait’s eyes do you prefer?'},
  {id:'mouth', label:'Mouth', question:'Which portrait’s mouth do you prefer?'},
  {id:'expression', label:'Expression', question:'Which facial expression do you prefer?'},
  {id:'brushwork', label:'Brushwork', question:'Which portrait’s brushwork do you prefer?'},
  {id:'color', label:'Color', question:'Which use of color do you prefer?'},
  {id:'hair', label:'Hair', question:'Which treatment of the hair do you prefer?'},
  {id:'posture', label:'Posture', question:'Which portrait’s posture do you prefer?'},
  {id:'deconstruction', label:'Deconstruction', question:'Which way of breaking up the face do you prefer?'}
];
export function trialKey(attribute,a,b){return [attribute,...[a,b].sort()].join('|');}
export function nextTrial(portraits, answers={}, displayed=new Set(), previous=null, random=Math.random){
  const pending=[];
  for(const q of QUESTIONS) for(let i=0;i<portraits.length;i++) for(let j=i+1;j<portraits.length;j++){
    const left=portraits[i].id,right=portraits[j].id,key=trialKey(q.id,left,right);
    if(!answers[key]||answers[key].undone) pending.push({key,attribute:q.id,left,right});
  }
  if(!pending.length)return null;
  const unseen=pending.filter(t=>!displayed.has(t.key));
  const available=unseen.length?unseen:pending;
  const different=available.filter(t=>!previous||(t.attribute!==previous.attribute&&[t.left,t.right].sort().join('|')!==[previous.left,previous.right].sort().join('|')));
  const pool=different.length?different:available;
  const t={...pool[Math.floor(random()*pool.length)]};
  if(random()<.5)[t.left,t.right]=[t.right,t.left];
  return t;
}
export function summarizeChoices(answers,byId){
  const rows=Object.values(answers).filter(v=>!v.undone&&byId[v.left]&&byId[v.right]).sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!rows.length)return ['No attribute comparisons yet.'];
  return [`${rows.length} comparisons recorded. Showing the latest ${Math.min(rows.length,60)}; the export retains all choices.`,...rows.slice(0,60).map(v=>{
    const attribute=QUESTIONS.find(q=>q.id===v.attribute)?.label||v.attribute;
    const left=byId[v.left].title,right=byId[v.right].title;
    if(v.choice==='tie')return `${attribute}: ${left} and ${right} about equal.`;
    if(v.choice==='neither')return `${attribute}: neither ${left} nor ${right}.`;
    return `${attribute}: prefer ${v.choice==='left'?left:right} over ${v.choice==='left'?right:left}.`;
  })];
}
