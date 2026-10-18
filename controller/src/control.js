import QRCode from 'qrcode';
import { MEDIA, defaultState } from '../lib/media.js';
const $ = id => document.getElementById(id);
let room = null, state = defaultState(), busy = false, polling = false, creating = false, toastTimer, commandEpoch = 0;
try { room = JSON.parse(localStorage.getItem('wozhi-room') || 'null'); } catch { /* empty storage */ }
function notify(text) { $('message').textContent = text; $('message').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('message').hidden = true, 6000); }
async function api(path, options = {}) {
  const res = await fetch(`/api/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(room ? { Authorization: `Bearer ${room.controlToken}` } : {}) }, signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  if (!res.ok) { const error = new Error(data.error || '连接失败'); error.status = res.status; throw error; }
  return data;
}
function enableControls() {
  for (const id of ['pause','reset','fit','rotation','sound']) $(id).disabled = !room || busy;
  document.querySelectorAll('.media-card').forEach(el => el.disabled = busy || creating);
}
function render() {
  const media = MEDIA.find(m => m.id === state.media);
  $('preview-label').textContent = media.name;
  const video = $('preview');
  if (video.dataset.media !== media.id) { video.dataset.media = media.id; video.src = media.src; video.poster = media.poster; }
  video.style.objectFit = state.fit;
  video.style.transform = `rotate(${state.rotation}deg)`;
  if (state.paused) video.pause(); else video.play().catch(() => {});
  $('pause').textContent = state.paused ? '▶ 继续播放' : 'Ⅱ 暂停';
  $('fit').value = state.fit; $('rotation').value = String(state.rotation); $('sound').checked = !state.muted;
  $('loop-label').textContent = state.paused ? '已暂停' : '循环播放';
  document.querySelectorAll('.media-card').forEach(el => { const selected = el.dataset.id === state.media; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed',String(selected)); });
  enableControls();
}
for (const media of MEDIA) {
  const button = document.createElement('button'); button.className = 'media-card'; button.dataset.id = media.id;
  button.innerHTML = `<img src="${media.poster}" alt="${media.name}画面" loading="lazy"><span class="card-check" aria-hidden="true">✓</span><span class="card-content"><span class="card-tag">${media.tag}</span><span class="card-title">${media.name}</span><span class="card-description">${media.description}</span></span>`;
  button.addEventListener('click', async () => {
    if (!room) { notify('先点击「连接手机」，扫码配对显示屏。'); return; }
    await command({ media: media.id, paused: false });
  });
  $(media.group === 'state' ? 'states' : 'games').append(button);
}
function showPairing() {
  if (!room) return;
  const link = `${location.origin}/screen#room=${room.id}&token=${room.screenToken}`;
  $('screen-url').value = link;
  QRCode.toCanvas($('qr'),link,{width:180,margin:2,color:{dark:'#243c2c',light:'#ffffff'}}).catch(() => notify('二维码生成失败，请复制链接打开。'));
  $('pairing').hidden = false; $('create').innerHTML = '重新配对 <span>↗</span>';
}
async function command(patch) {
  if (!room || busy) return;
  busy = true; commandEpoch++; enableControls();
  try {
    const result = await api(`rooms/${room.id}/state`,{method:'PUT',body:JSON.stringify({...state,...patch})});
    state = result.state; render(); $('playback-label').textContent = '指令已发送'; $('screen-status').textContent = '等待手机确认播放…';
  } catch (error) { notify(error.message || '切换失败，请重试。'); }
  finally { busy = false; render(); }
}
async function poll() {
  if (!room || polling || busy || creating) return;
  polling = true; const epoch = commandEpoch;
  try {
    const result = await api(`rooms/${room.id}`);
    // A request that began before a click must not overwrite the new command.
    if (busy || epoch !== commandEpoch) return;
    state = result.state; render();
    $('connection').textContent = result.online ? '手机已连接' : '等待手机上线';
    $('connection').classList.toggle('online',result.online);
    const screen = result.screen;
    const applied = result.online && screen?.version === state.version;
    const playing = applied && screen.status === 'playing';
    $('ack-dot').classList.toggle('online',playing);
    $('playback-label').textContent = !result.online ? '等待手机' : !applied ? '正在切换' : ({playing:'手机正在播放',paused:'手机已暂停',loading:'手机正在加载',blocked:'手机需要点按',error:'手机播放失败',hidden:'手机已切到后台'}[screen.status] || '等待确认');
    $('screen-status').textContent = !result.online ? '请用安卓手机扫描下方二维码，点击开始播放。' : screen.error || (applied ? `${screen.fullscreen ? '全屏中' : '尚未全屏'} · ${MEDIA.find(m => m.id === screen.media)?.name || '显示屏'}${!screen.fullscreen ? ' · 请在手机端点「恢复全屏」' : ''}` : '指令已送达服务端，等待手机加载并确认。');
  } catch (error) {
    $('connection').textContent = '同步连接中断'; $('connection').classList.remove('online'); $('ack-dot').classList.remove('online');
    $('screen-status').textContent = error.message || '网络不可用，正在自动重连。';
    if ([401,403,404].includes(error.status)) { room = null; try {localStorage.removeItem('wozhi-room');} catch {} $('pairing').hidden = true; $('create').textContent = '重新连接手机'; enableControls(); }
  } finally { polling = false; }
}
$('create').onclick = async () => {
  if (creating) return;
  if (room && !confirm('创建新连接后，请让手机扫描新的二维码。继续吗？')) return;
  creating = true; $('create').disabled = true; enableControls();
  try { room = await api('rooms',{method:'POST'}); commandEpoch++; state = room.state; try {localStorage.setItem('wozhi-room',JSON.stringify(room));} catch {notify('浏览器禁止保存连接，刷新后需重新配对。');} showPairing(); render(); notify('连接已创建。请用安卓手机扫码，点一次开始播放。'); }
  catch(error) { notify(error.message || '创建连接失败，请重试。'); }
  finally { creating = false; $('create').disabled = false; enableControls(); poll(); }
};
$('copy').onclick = async () => { try { await navigator.clipboard.writeText($('screen-url').value); notify('配对链接已复制'); } catch { $('screen-url').select(); notify('请长按或按 Ctrl+C 复制链接'); } };
$('pause').onclick = () => command({paused:!state.paused});
$('reset').onclick = () => command({media:'sleep',paused:false});
$('fit').onchange = () => command({fit:$('fit').value});
$('rotation').onchange = () => command({rotation:Number($('rotation').value)});
$('sound').onchange = () => command({muted:!$('sound').checked});
$('embed').onclick = () => { $('link-code').value = `<a href="${location.origin}/" target="_blank" rel="noopener">窝知遥控台</a>`; $('frame-code').value = `<iframe src="${location.origin}/" title="窝知遥控台" width="100%" height="900" allow="clipboard-write; fullscreen" style="border:0;border-radius:16px"></iframe>`; $('embed-dialog').showModal(); };
$('close-embed').onclick = () => $('embed-dialog').close();
showPairing(); render(); poll(); setInterval(poll,1800);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
