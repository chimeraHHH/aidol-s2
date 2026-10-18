import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDisplayFullscreen } from '../src/fullscreen.js';
test('fullscreen request starts immediately within the user click and keeps the display container',async()=>{
  const doc={fullscreenElement:null};let calls=0;
  const display={requestFullscreen(){calls++;doc.fullscreenElement=this;return Promise.resolve();}};
  const result=requestDisplayFullscreen(display,doc);
  assert.equal(calls,1);assert.equal(await result,true);
  assert.equal(await requestDisplayFullscreen(display,doc),true);assert.equal(calls,1);
});
test('webkit fallback and browser rejection are handled without interrupting playback',async()=>{
  const doc={webkitFullscreenElement:null};const display={webkitRequestFullscreen(){doc.webkitFullscreenElement=this;}};
  assert.equal(await requestDisplayFullscreen(display,doc),true);
  assert.equal(await requestDisplayFullscreen({requestFullscreen(){return Promise.reject(Error('Denied'));}},{}),false);
  assert.equal(await requestDisplayFullscreen({},{}),false);
});
