import assert from 'node:assert/strict';
import { MEDIA, defaultState } from '../lib/media.js';
const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
async function call(path, method='GET', token, data) {
  const response = await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:data?JSON.stringify(data):undefined});
  return {code:response.status,data:await response.json()};
}
const created=await call('rooms','POST');assert.equal(created.code,201,JSON.stringify(created.data));
const room=created.data;
assert.equal((await call(`rooms/${room.id}`)).code,401);
assert.equal((await call(`rooms/${room.id}`,'GET','a'.repeat(32))).code,403);
assert.equal((await call(`rooms/${room.id}/state`,'PUT',room.screenToken,defaultState())).code,403);
for(const media of MEDIA){
  const write=await call(`rooms/${room.id}/state`,'PUT',room.controlToken,{...defaultState(),media:media.id});assert.equal(write.code,200);
  const read=await call(`rooms/${room.id}`,'GET',room.screenToken);assert.equal(read.data.state.media,media.id);assert.equal(read.data.state.version,write.data.state.version);
}
assert.equal((await call(`rooms/${room.id}/state`,'PUT',room.controlToken,{...defaultState(),media:'external-url'})).code,400);
const settings={...defaultState(),media:'wake',paused:true,muted:false,fit:'cover',rotation:90};
const update=await call(`rooms/${room.id}/state`,'PUT',room.controlToken,settings);assert.equal(update.code,200);
const report=await call(`rooms/${room.id}/heartbeat`,'POST',room.screenToken,{version:update.data.state.version,status:'paused',media:'wake',fullscreen:true});assert.equal(report.code,200);
const control=await call(`rooms/${room.id}`,'GET',room.controlToken);assert.equal(control.data.online,true);assert.equal(control.data.screen.version,update.data.state.version);assert.equal(control.data.screen.status,'paused');
const second=await call('rooms','POST');assert.equal(second.code,201);
assert.equal((await call(`rooms/${second.data.id}`,'GET',room.controlToken)).code,403);
for(const media of MEDIA){const asset=await fetch(base+media.src,{headers:{Range:'bytes=0-255'}});assert.equal(asset.status,206);assert.equal((await asset.arrayBuffer()).byteLength,256);}
console.log('PASS: seven media switches; role and room isolation; invalid input; playback settings; heartbeat acknowledgement; seven video range requests.');
