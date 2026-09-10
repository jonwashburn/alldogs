const aliases = new Map([['alan','alan-garner'],['damon','damon-salvatore']]);
const names = new Map([['alan-garner','Alan Garner'],['damon-salvatore','Damon Salvatore']]);
export const canonicalCharacterId = id => aliases.get(id) || id;
export function characterId(p) {
  return canonicalCharacterId(p.characterId || (p.characterName || p.title.split(' · ')[0]).normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
}
export function groupPortraits(portraits) {
  const groups = new Map();
  for (const p of portraits) {
    const id = characterId(p);
    if (!groups.has(id)) groups.set(id, {id, name:names.get(id) || p.characterName || p.title.split(' · ')[0], portraits:[]});
    const group = groups.get(id);
    if (!group.portraits.some(q => q.id === p.id || (p.comparison?.fingerprint && q.comparison?.fingerprint === p.comparison.fingerprint))) group.portraits.push(p);
  }
  return [...groups.values()];
}
export const emptyState = () => ({version:1, primaries:{}, order:{ids:[], updatedAt:0}});
const stampOK = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function normalizeState(raw, groups) {
  const state = emptyState(), byId = new Map(groups.map(g => [g.id,g]));
  if (!raw || raw.version !== 1) return state;
  for (const [legacyId,p] of Object.entries(raw.primaries || {})) {
    const id = canonicalCharacterId(legacyId);
    if (byId.get(id)?.portraits.some(q => q.id === p?.portraitId) && stampOK(p.updatedAt)) state.primaries[id] = later(state.primaries[id], {portraitId:p.portraitId,updatedAt:p.updatedAt});
  }
  if (Array.isArray(raw.order?.ids) && stampOK(raw.order.updatedAt)) {
    state.order = {ids:[...new Set(raw.order.ids.map(canonicalCharacterId).filter(id => byId.has(id)))], updatedAt:raw.order.updatedAt};
  }
  return state;
}
const rank = (record, order=false) => order ? record.ids.join('\x1f') : record.portraitId;
function later(a,b,order=false) {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt || (b.updatedAt === a.updatedAt && rank(b,order) > rank(a,order)) ? b : a;
}
export function mergeState(local, remote, groups) {
  const a=normalizeState(local,groups), b=normalizeState(remote,groups), result=emptyState();
  for (const id of new Set([...Object.keys(a.primaries),...Object.keys(b.primaries)])) result.primaries[id]=later(a.primaries[id],b.primaries[id]);
  result.order=later(a.order,b.order,true);
  return result;
}
export function orderedIds(state, groups) {
  return [...new Set([...normalizeState(state,groups).order.ids, ...groups.map(g=>g.id)])];
}
export function primaryId(state, group) {return state.primaries[group.id]?.portraitId || group.portraits[0].id;}
export function rotatedId(group, current, direction) {
  const index=Math.max(0,group.portraits.findIndex(p=>p.id===current));
  return group.portraits[(index+direction+group.portraits.length)%group.portraits.length].id;
}
export function moveId(ids, id, to) {
  const next=ids.filter(x=>x!==id); if (!ids.includes(id)) return [...ids];
  next.splice(Math.max(0,Math.min(next.length,to)),0,id); return next;
}
export function nextStamp(state, now=Date.now()) {
  return Math.max(now,state.order.updatedAt+1,...Object.values(state.primaries).map(p=>p.updatedAt+1));
}
export function payload(state) {
  return {version:1,primaries:state.primaries,...(state.order.updatedAt>0?{order:state.order}:{})};
}
