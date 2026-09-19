// Public entrance checks: no network, private records, or account mutations.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('gate.js', 'utf8');
for (const phrase of ['A dog of your own.', 'Come in.', 'Open the gate', 'Join Waitlist', 'Display only. Not available for adoption.', 'You make the record anyway.']) assert.ok(html.includes(phrase), phrase);
for (const phrase of ['Private design study', 'Invitation preview', 'noindex', 'prototype', 'This study']) assert.ok(!html.includes(phrase), phrase);
for (const route of ['/viewing-room/', '/my-dog/', '/adoption/']) {
  assert.ok(html.includes('href="'+route+'"'), route);
  assert.ok(fs.existsSync('.'+route+'index.html'), route);
}
for (const match of html.matchAll(/(?:src|href)="(\/(?:assets|collection)\/[^"?]+)"/g)) assert.ok(fs.existsSync('.'+match[1]), match[1]);
assert.ok(html.includes('id="viewing" aria-labelledby="viewing-title" hidden'));
assert.ok(html.includes('aria-controls="viewing"'));
for (const id of ['dog-image', 'dog-name', 'close-viewing', 'previous-dog', 'next-dog', 'gallery-status']) assert.ok(html.includes('id="'+id+'"'), id);
assert.ok(html.includes('hero_faithful_62_2400.jpg') && html.includes('width="2400" height="1200"'));
assert.ok(html.includes('/home-rotation.js?'), 'Use the existing curated public paintings');
assert.ok(html.includes('rel="canonical" href="https://alldogs.wtf/"'));
assert.ok(!/fetch\(|localStorage|sessionStorage|\.innerHTML\s*=/.test(script), 'Entrance must not fetch or store private data');
assert.ok(html.includes('data-open-adoption'));
assert.ok(!html.includes('href="/about/'));
assert.ok(script.includes("'#game':'/adoption/#game'"));
const existingForm=fs.readFileSync('welcome/index.html','utf8').match(/<dialog class="adoption-dialog"[\s\S]*?<\/dialog>/)[0];
assert.ok(html.includes(existingForm), 'Reuse the existing complete application form and receipt');
assert.ok(html.includes('/dog-pound/adoption-form.js') && html.includes('/dog-pound/application-email.js'));
const existingFilm=fs.readFileSync('about/index.html','utf8').match(/<figure class="paint-film">[\s\S]*?<\/figure>/)[0];
assert.ok(html.includes(existingFilm.replace('<figure class="paint-film">', '<figure class="paint-film" id="medium">')));
assert.ok(!html.includes('From the collection'));
assert.ok(!html.includes('id="reading"') && !html.includes('data-open="note"'));
assert.equal((html.match(/A note from Wubbushi/g) || []).length, 1);
assert.ok(html.includes('href="#why"') && html.includes('id="why"'));
assert.ok(fs.readFileSync('welcome/index.html','utf8').includes('id="application-form"'));
assert.ok(fs.readFileSync('viewing-room/index.html','utf8').includes('account/account-api.js'));
assert.ok(fs.readFileSync('viewing-room/index.html','utf8').includes('data-account-page="viewing-room"'));
console.log('Gate checks passed: public copy, real invitation/account links, artwork files, no private data access, existing application form and canonical metadata.');
