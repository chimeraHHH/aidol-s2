import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MEDIA, defaultState, validateState } from '../lib/media.js';
test('three confirmed states and four supplied games have playable files',()=>{
  assert.equal(MEDIA.filter(x=>x.group==='state').length,3);assert.equal(MEDIA.filter(x=>x.group==='game').length,4);
  assert.equal(MEDIA.find(x=>x.id==='sleep').duration,5);
  assert.equal(MEDIA.find(x=>x.id==='wake').duration,8.8);
  assert.equal(MEDIA.find(x=>x.id==='weigh').duration,4.2);
  for(const m of MEDIA){assert.ok(fs.statSync('public'+m.src).size>1000);assert.ok(fs.statSync('public'+m.poster).size>100);}
});
test('remote can only select curated media and supported settings',()=>{
  assert.ok(validateState(defaultState()));
  assert.equal(validateState({...defaultState(),media:'https://evil.test/x.mp4'}),null);
  assert.equal(validateState({...defaultState(),rotation:1}),null);
  assert.equal(validateState({...defaultState(),paused:'false'}),null);
  assert.deepEqual(Object.keys(validateState({...defaultState(),secret:'hidden'})),['media','paused','muted','fit','rotation']);
});
