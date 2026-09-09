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
// Metadata screens the quick-choice queue only; the archive and saved answers
// retain every study. New portraits without metadata can still be compared.
export function comparable(a,b,attribute){
  if(a.id===b.id || (a.image && a.image===b.image))return false;
  const x=a.comparison,y=b.comparison;
  if(x?.fingerprint && x.fingerprint===y?.fingerprint)return false;
  return !x?.indistinct?.[attribute]?.includes(b.id) && !y?.indistinct?.[attribute]?.includes(a.id);
}
function resembles(a,b){
  return a.id===b.id || (a.image && a.image===b.image) ||
    (a.comparison?.fingerprint && a.comparison.fingerprint===b.comparison?.fingerprint) ||
    a.comparison?.similar?.includes(b.id) || b.comparison?.similar?.includes(a.id);
}
export function nextTrial(portraits, answers={}, displayed=new Set(), previous=null, random=Math.random, schedule=null){
  const pending=[], byId=Object.fromEntries(portraits.map(p=>[p.id,p]));
  const allowed=schedule===null?null:new Map(schedule.map(t=>[trialKey(t.attribute,t.left,t.right),t]));
  for(const q of QUESTIONS) for(let i=0;i<portraits.length;i++) for(let j=i+1;j<portraits.length;j++){
    if(!comparable(portraits[i],portraits[j],q.id))continue;
    const left=portraits[i].id,right=portraits[j].id,key=trialKey(q.id,left,right);
    if(allowed&&!allowed.has(key))continue;
    if(!answers[key]||answers[key].undone) pending.push({key,attribute:q.id,left,right,...(allowed?.get(key)?.question?{question:allowed.get(key).question}:{})});
  }
  if(!pending.length)return null;
  const prefer=(pool,predicate)=>{const selected=pool.filter(predicate);return selected.length?selected:pool;};
  let pool=pending;
  if(previous){
    const old=[previous.left,previous.right];
    // Both portraits must change whenever any unanswered disjoint pair remains.
    pool=prefer(pool,t=>!old.includes(t.left)&&!old.includes(t.right));
    pool=prefer(pool,t=>[t.left,t.right].every(id=>old.every(prior=>!byId[prior]||!resembles(byId[id],byId[prior]))));
    pool=prefer(pool,t=>t.attribute!==previous.attribute);
    pool=prefer(pool,t=>[t.left,t.right].sort().join('|')!==old.slice().sort().join('|'));
  }
  pool=prefer(pool,t=>!displayed.has(t.key));
  const t={...pool[Math.floor(random()*pool.length)]};
  if(random()<.5)[t.left,t.right]=[t.right,t.left];
  return t;
}
export function summarizeChoices(answers,byId){
  const rows=Object.values(answers).filter(v=>!v.undone&&byId[v.left]&&byId[v.right]).sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!rows.length)return ['No attribute comparisons yet.'];
  return [`${rows.length} comparisons recorded. Showing the latest ${Math.min(rows.length,60)}; the export retains all choices.`,...rows.slice(0,60).map(v=>{
    const attribute=v.question||QUESTIONS.find(q=>q.id===v.attribute)?.label||v.attribute;
    const left=byId[v.left].title,right=byId[v.right].title;
    if(v.choice==='tie')return `${attribute}: ${left} and ${right} about equal.`;
    if(v.choice==='neither')return `${attribute}: neither ${left} nor ${right}.`;
    return `${attribute}: prefer ${v.choice==='left'?left:right} over ${v.choice==='left'?right:left}.`;
  })];
}
