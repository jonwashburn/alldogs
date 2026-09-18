'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const manifest=JSON.parse(fs.readFileSync('viewing-room/garden/subjects.json'));
const pool=JSON.parse(fs.readFileSync('dog-pound/dogs.json'));
const dogs=Array.isArray(pool)?pool:pool.items;
for(const dog of dogs){
 const item=manifest.dogs[dog.id];assert(item,`Missing garden presentation for ${dog.title}`);assert.equal(item.original,dog.original);
 assert(item.mask.startsWith('/viewing-room/garden/subjects/'));const mask=fs.readFileSync('.'+item.mask);assert.equal(mask.subarray(1,4).toString(),'PNG');assert.equal(mask.readUInt32BE(16),1000);assert.equal(mask.readUInt32BE(20),1000);
 const [x0,y0,x1,y1]=item.bounds;assert(x0>=0&&y0>=0&&x1<=1000&&y1<=1000&&x1>x0&&y1>y0);
}
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('painting/paintkit.js')).digest('hex'),'555d6d735595c30921f1c283874135d361c62dfa38e1f48a4e9c1d9957d60a87');
const html=fs.readFileSync('viewing-room/index.html','utf8');assert(html.includes('content="noindex,nofollow"'));assert(html.includes('content="no-referrer"'));
for(const key of ['ground','foreground','gardenTitle','gardenInvitation','gardenChoose','gardenOriginal','gardenWaiting'])assert(fs.statSync('viewing-room/garden/'+key+'.webp').size>100);
console.log(`Garden: ${dogs.length} original paintings covered; native brush and private-page protections verified.`);
