// Public entrance checks: no network, private records, or account mutations.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('gate.js', 'utf8');
for (const phrase of ['A dog of your own.', 'Come in.', 'Open the gate', 'Your invitation', 'From the collection', 'You make the record anyway.']) assert.ok(html.includes(phrase), phrase);
for (const phrase of ['Private design study', 'Invitation preview', 'noindex', 'prototype', 'This study', 'data-open-adoption', '<form']) assert.ok(!html.includes(phrase), phrase);
for (const route of ['/viewing-room/', '/my-dog/', '/about/', '/adoption/']) {
  assert.ok(html.includes('href="'+route+'"'), route);
  assert.ok(fs.existsSync('.'+route+'index.html'), route);
}
for (const match of html.matchAll(/(?:src|href)="(\/(?:assets|collection)\/[^"?]+)"/g)) assert.ok(fs.existsSync('.'+match[1]), match[1]);
assert.ok(html.includes('id="viewing" aria-labelledby="viewing-title" hidden'));
assert.ok(html.includes('aria-controls="viewing"'));
assert.ok(html.includes('rel="canonical" href="https://alldogs.wtf/"'));
assert.ok(!/fetch\(|localStorage|sessionStorage|\.innerHTML\s*=/.test(script), 'Entrance must not fetch or store private data');
assert.ok(script.includes("'#apply':'/welcome/#apply'"));
assert.ok(script.includes("'#game':'/adoption/#game'"));
assert.ok(script.includes("'#why':'/about/#why'"));
assert.ok(fs.readFileSync('welcome/index.html','utf8').includes('id="application-form"'));
assert.ok(fs.readFileSync('viewing-room/index.html','utf8').includes('account/account-api.js'));
assert.ok(fs.readFileSync('viewing-room/index.html','utf8').includes('data-account-page="viewing-room"'));
console.log('Gate checks passed: public copy, real invitation/account links, artwork files, no private data access, existing application route and canonical metadata.');
