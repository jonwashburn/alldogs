export const slot = (area, id) => area + '/' + id;
export const emptyState = () => ({version:2,cursor:0,records:{},drafts:{},outbox:[]});
export function current(state, area, id) { const key=slot(area,id); return state.drafts[key]?.value ?? state.records[key]?.value ?? null; }
export function edit(state, area, id, value, uuid=()=>crypto.randomUUID()) {
  const key=slot(area,id), old=state.drafts[key];
  state.drafts[key]={area,id,value,eventId:uuid(),baseSeq:old?.baseSeq ?? state.records[key]?.seq ?? 0,conflict:old?.conflict ?? false};
}
export function mergeRecords(state, records) {
  for(const r of records) { const key=slot(r.area,r.id); if(r.seq>(state.records[key]?.seq??0))state.records[key]=r; }
}
export function batch(state) {
  if(!state.outbox.length)state.outbox=Object.values(state.drafts).filter(d=>!d.conflict).slice(0,100).map(d=>({token:d.eventId,event:{eventId:d.eventId,area:d.area,id:d.id,baseSeq:d.baseSeq,value:structuredClone(d.value)}}));
  return state.outbox.map(x=>x.event);
}
export function acknowledge(state, receipts) {
  for(const r of receipts){ const key=slot(r.area,r.id), sent=state.outbox.find(x=>x.event.eventId===r.eventId); if(!sent)continue;
    mergeRecords(state,[r]); const draft=state.drafts[key];
    if(draft?.eventId===sent.token)delete state.drafts[key];
    else if(draft){draft.baseSeq=r.seq;draft.conflict=false;}
  }
  const ids=new Set(receipts.map(x=>x.eventId));state.outbox=state.outbox.filter(x=>!ids.has(x.event.eventId));
}
export function conflicts(state, records){mergeRecords(state,records);for(const r of records){const d=state.drafts[slot(r.area,r.id)];if(d)d.conflict=true;}state.outbox=[];}
export function resolve(state,key,mine,uuid=()=>crypto.randomUUID()){const d=state.drafts[key];if(!d)return;if(mine&&d.area==='choices'&&d.value.undone)return false;if(mine){d.baseSeq=state.records[key]?.seq??0;d.eventId=uuid();d.conflict=false;}else delete state.drafts[key];}
export function nextTrial(trials,state,skipped=new Set(),previous=null,random=Math.random){
  let pool=trials.filter(t=>{const v=current(state,'choices',t.id);return (!v||v.undone)&&!skipped.has(t.id);});
  if(!pool.length)return null;
  if(previous){const fresh=pool.filter(t=>![t.left,t.right].some(x=>x===previous.left||x===previous.right));if(fresh.length)pool=fresh;}
  const t={...pool[Math.floor(random()*pool.length)]};if(random()<.5)[t.left,t.right]=[t.right,t.left];return t;
}
