import { MEDIA } from '../lib/media.js';
import { fullscreenElement, requestDisplayFullscreen } from './fullscreen.js';
const $ = id => document.getElementById(id), video = $('player');
const params = new URLSearchParams(location.hash.slice(1));
let credentials = null;
try { credentials = JSON.parse(sessionStorage.getItem('wozhi-screen') || 'null'); } catch { /* empty storage */ }
if (params.get('room') && params.get('token')) { credentials = {id:params.get('room'),token:params.get('token')}; try {sessionStorage.setItem('wozhi-screen',JSON.stringify(credentials)); history.replaceState(null,'',location.pathname);} catch { /* Keep fragment if storage unavailable. */ } }
let state = null, started = false, status = 'loading', errorText = '', polling = false, heartbeatBusy = false, appliedVersion = '', wakeLock = null, connectionError = '', lastHeartbeat = 0, generation = 0;
async function api(path,options={}) {
  const response = await fetch(`/api/rooms/${credentials.id}${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${credentials.token}`},signal:AbortSignal.timeout(8000)});
  const data = await response.json(); if(!response.ok){const error=new Error(data.error||'连接失败');error.status=response.status;throw error;}return data;
}
function notice(text) { $('screen-notice').textContent=text; $('screen-notice').hidden=!text; }
async function keepAwake() { try { if ('wakeLock' in navigator && !document.hidden && started && (!wakeLock || wakeLock.released)) wakeLock = await navigator.wakeLock.request('screen'); } catch { /* Unsupported: user can extend phone screen timeout. */ } }
async function enterFullscreen() {
  await requestDisplayFullscreen($('display'));
  updateFullscreenUi();
  try { await screen.orientation.lock('landscape'); } catch { /* Rotation setting also available remotely. */ }
  keepAwake();
}
function updateFullscreenUi() {
  const full = Boolean(fullscreenElement());
  $('fullscreen-prompt').hidden = !started || full;
  $('fullscreen-prompt').textContent = document.fullscreenEnabled === false ? '轻点尝试全屏 · 建议用 Chrome 打开' : '⛶ 轻点进入全屏';
  if (full) $('screen-menu').hidden = true;
}
function layout() {
  if(!state)return;
  const sideways=state.rotation===90||state.rotation===270;
  video.style.width=sideways?'100dvh':'100vw';video.style.height=sideways?'100vw':'100dvh';
  video.style.transform=`translate(-50%,-50%) rotate(${state.rotation}deg)`;video.style.objectFit=state.fit;
}
async function heartbeat(force=false) {
  if(!credentials||!state||heartbeatBusy||(!force&&Date.now()-lastHeartbeat<2500))return;
  heartbeatBusy=true;lastHeartbeat=Date.now();
  try {await api('/heartbeat',{method:'POST',body:JSON.stringify({version:appliedVersion,status:document.hidden?'hidden':status,fullscreen:Boolean(fullscreenElement()),error:errorText,media:video.dataset.media||''})});}catch{/* Poll handles network status. */}finally{heartbeatBusy=false;}
}
async function playCurrent(myGeneration=generation) {
  if(!state||!started||myGeneration!==generation)return;
  video.muted=state.muted;
  if(state.paused){video.pause();status='paused';appliedVersion=state.version;errorText='';heartbeat(true);return;}
  try {await video.play();if(myGeneration!==generation)return;status='playing';errorText='';appliedVersion=state.version;notice('');$('start-overlay').hidden=true;}
  catch(error){if(myGeneration!==generation||error.name==='AbortError')return;status='blocked';errorText=state.muted?'请在手机上点一次开始播放。':'浏览器限制有声播放，请在手机右上角点击「允许视频声音」。';notice(errorText);}
  heartbeat(true);
}
function apply(next) {
  if(state?.version===next.version)return;
  const changed=state?.media!==next.media||Boolean(video.error);
  state=next;generation++;layout();
  if(changed){const media=MEDIA.find(m=>m.id===state.media);if(!media)return;status='loading';appliedVersion='';video.dataset.media=media.id;video.poster=media.poster;video.src=media.src;video.load();}
  if(started)playCurrent();
}
async function poll() {
  if(!credentials||polling)return;
  polling=true;
  try {const result=await api('');connectionError='';$('network-status').textContent='已连接电脑控制台';apply(result.state);if(!started)$('start-message').textContent='配对成功。点一次开始播放，然后在电脑上切换表情或游戏。';}
  catch(error){connectionError=error.message||'网络中断，正在重连';$('network-status').textContent=connectionError;if(!started)$('start-message').textContent=connectionError;if([401,403,404].includes(error.status)){notice('配对已过期或无效，请回电脑重新扫码。');}}
  finally{polling=false;heartbeat();}
}
$('start').onclick=()=>{started=true;$('start-overlay').hidden=true;enterFullscreen();if(state)playCurrent();else{notice('正在连接，加载后将自动播放…');poll();}};
$('fullscreen-prompt').onclick=()=>{enterFullscreen();if(started)playCurrent();};
video.addEventListener('playing',()=>{if(!state)return;status='playing';errorText='';appliedVersion=state.version;heartbeat(true);});
video.addEventListener('waiting',()=>{status='loading';heartbeat();});
video.addEventListener('error',()=>{status='error';errorText='视频加载失败，请检查网络后重新选择这个视频。';notice(errorText);heartbeat(true);});
$('screen-menu-toggle').onclick=()=>{$('screen-menu').hidden=!$('screen-menu').hidden;};
$('hide-menu').onclick=()=>{$('screen-menu').hidden=true;};
$('fullscreen').onclick=()=>enterFullscreen();
$('enable-audio').onclick=()=>{if(!state)return;started=true;video.muted=state.muted;playCurrent();};
for (const event of ['fullscreenchange','webkitfullscreenchange']) document.addEventListener(event,()=>{updateFullscreenUi();layout();heartbeat(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){keepAwake();updateFullscreenUi();poll();if(started)playCurrent();}else heartbeat(true);});
window.addEventListener('online',poll);
window.addEventListener('resize',layout);
if(!credentials){$('start').disabled=true;$('start-message').textContent='请先在电脑控制台点击「连接手机」，用这个手机扫描配对二维码。';$('network-status').textContent='尚未配对';}
else{poll();setInterval(poll,900);setInterval(()=>heartbeat(),2800);}
