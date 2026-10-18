import { PacketDecoder, parseLine, toHex, fromHex, encodeCommand, FirmwareCommandParser } from './protocol.js';
import { SerialConnection } from './serial.js';

const $ = id => document.getElementById(id);
const sources = { real: '设备接收', demo: '演示数据', replay: '报文回放' };
const state = { mode: 'real', source: 'real', session: 0, rx: 0, tx: 0, logs: [], samples: [], values: {},
  paused: false, truncated: false, connected: false, demoTimer: null, demoIndex: 0, demoBmi: false, busy: false };
let decoder, demoCommands = new FirmwareCommandParser(), toastTimer;
const clock = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });
function notify(text, error = false) { $('toast').textContent = text; $('toast').classList.toggle('error', error); $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, error ? 8500 : 4500); }
function log(direction, bytes, text) {
  state.logs.push({ time: new Date().toISOString(), clock: clock(), session: state.session,
    source: state.source, direction, hex: toHex(bytes), bytes: bytes.length, text });
  if (state.logs.length > 2000) { state.logs.shift(); state.truncated = true; }
  if (!state.paused) renderTerminal();
}
function system(text) { log('SYS', new Uint8Array(), text); }
function renderTerminal() {
  const terminal = $('terminal');
  const atEnd = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight < 65;
  terminal.replaceChildren();
  if (state.truncated) { const note = document.createElement('p'); note.textContent = '日志已达到 2000 条，仅保留最新内容；请及时导出。'; note.className = 'muted'; terminal.append(note); }
  for (const item of state.logs.slice(-350)) {
    const row = document.createElement('div'); row.className = 'log-row ' + item.direction.toLowerCase();
    const time = document.createElement('span'); time.className = 'log-time'; time.textContent = item.clock;
    const direction = document.createElement('span'); direction.className = 'log-direction'; direction.textContent = item.direction;
    const body = document.createElement('span'); body.className = 'log-text';
    if (item.source !== 'real' && item.direction !== 'SYS') { const tag = document.createElement('span'); tag.className = 'log-source'; tag.textContent = sources[item.source]; body.append(tag); }
    body.append(document.createTextNode($('view-mode').value === 'hex' && item.direction !== 'SYS' ? item.hex : item.text || '〔等待完整编码字符〕'));
    row.append(time, direction, body); terminal.append(row);
  }
  if (atEnd) terminal.scrollTop = terminal.scrollHeight;
}
function makeDecoder() {
  decoder = new PacketDecoder($('encoding').value, line => {
    const { values, acknowledgement } = parseLine(line);
    for (const [key, value] of Object.entries(values)) {
      state.values[key] = value; updateMetric(key, value);
      if (key === 'weight' && value.raw !== null && /^(kg|g)$/i.test(value.unit)) {
        const kg = Number(value.raw) / (value.unit === 'g' ? 1000 : 1);
        if (Number.isFinite(kg) && Math.abs(kg) <= 100000) {
          state.samples.push({ value: kg, time: clock() }); if (state.samples.length > 120) state.samples.shift(); drawChart();
        }
      }
    }
    if (acknowledgement) { $('ack').hidden = false; notify(state.source === 'real' ? '收到设备回执：Test Ok!' : '模拟 / 回放回执：Test Ok!（非实物验证）'); }
  }, () => system('单行超过 4096 字符，已重置行解析；原始接收日志仍保留。'));
}
function updateMetric(key, value) {
  const target = $(key); target.textContent = value.raw ?? '—';
  const bad = value.raw !== null && (!Number.isFinite(Number(value.raw)) || Number(value.raw) < 0 || value.raw.length > 12);
  target.classList.toggle('invalid', bad); target.classList.toggle('long-value', (value.raw?.length || 0) > 7);
  if ($(key + '-unit')) $(key + '-unit').textContent = value.unit || '设备值';
  $(key + '-note').textContent = value.raw === null ? '设备报文为等待 / 空值' : `${sources[state.source]} · ${clock()}${bad ? ' · 异常值原样保留' : ''}`;
}
function drawChart() {
  const data = state.samples; $('sample-count').textContent = `${data.length} 个样本`;
  $('chart-empty').hidden = !!data.length; $('chart-dot').hidden = !data.length;
  if (!data.length) { $('chart-path').setAttribute('d', ''); $('chart-area').setAttribute('d', ''); $('chart-axis').replaceChildren(); $('first-sample').textContent = '当前会话'; $('last-sample').textContent = '最近 120 个样本'; return; }
  const min = Math.min(...data.map(x => x.value)), max = Math.max(...data.map(x => x.value));
  const range = Math.max(max - min, .4); const low = min - range * .2; const high = max + range * .2;
  const points = data.map((p, i) => [50 + i / Math.max(data.length - 1, 1) * 830, 165 - (p.value - low) / (high - low) * 135]);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  $('chart-path').setAttribute('d', path); $('chart-area').setAttribute('d', `${path} L${points.at(-1)[0]},168 L50,168 Z`);
  $('chart-dot').setAttribute('cx', points.at(-1)[0]); $('chart-dot').setAttribute('cy', points.at(-1)[1]);
  $('chart-axis').replaceChildren();
  for (const [value, y] of [[high, 31], [(high + low) / 2, 98], [low, 168]]) {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text'); label.setAttribute('x', '3'); label.setAttribute('y', y); label.textContent = value.toFixed(1); $('chart-axis').append(label);
  }
  $('first-sample').textContent = data[0].time; $('last-sample').textContent = `${data.at(-1).time} · kg`;
}
function resetSession(source) {
  state.session++; state.source = source; state.rx = 0; state.tx = 0; state.samples = []; state.values = {}; state.demoBmi = false;
  $('rx-count').textContent = '0'; $('tx-count').textContent = '0'; $('last-received').textContent = '尚未接收'; $('ack').hidden = true;
  for (const key of ['weight', 'height', 'bmi']) { $(key).textContent = '—'; $(key).className = ''; $(key + '-note').textContent = source === 'real' ? '等待设备报文' : `${sources[source]} · 等待报文`; }
  $('weight-unit').textContent = 'kg'; $('height-unit').textContent = 'm';
  $('data-origin').textContent = source === 'real' ? '设备接收' : sources[source]; $('data-origin').className = 'origin ' + source;
  $('source-banner').hidden = source === 'real';
  $('source-banner').textContent = source === 'demo' ? '演示模式 · 当前读数由本页生成，用于测试界面、GBK 解码和收发逻辑，不是实物测量。' : '报文回放 · 当前读数来自你导入的文件，不表示设备已连接。';
  makeDecoder(); drawChart();
}
function receive(bytes, session = state.session) {
  if (session !== state.session) return;
  state.rx += bytes.length; $('rx-count').textContent = state.rx.toLocaleString(); $('last-received').textContent = `最近 ${clock()}`;
  const text = decoder.push(bytes); log('RX', bytes, text);
}
const serial = new SerialConnection(navigator.serial, {
  data: bytes => receive(bytes),
  status: status => {
    state.connected = status === 'connected'; updateControls();
    if (status === 'connected') { system('已连接。开始被动接收；没有自动发送任何命令。'); }
    if (status === 'idle' && state.source === 'real') { $('global-status').className = 'status-pill'; $('global-status').innerHTML = '<i></i> 未连接设备'; }
  },
  error: error => { system('接收结束：' + error.message); notify('串口接收中断：' + error.message, true); }
});
function support() {
  if (!window.isSecureContext) return '需要 HTTPS 或 localhost 才能连接真实设备。';
  if (!navigator.serial) return '当前浏览器未提供串口接口，请用新版 Chrome 打开。';
  const policy = document.permissionsPolicy || document.featurePolicy;
  if (policy?.allowsFeature && !policy.allowsFeature('serial')) return '内嵌页面限制了串口权限，请在独立 Chrome 标签页打开。';
  return null;
}
function updateControls() {
  const active = state.demoTimer !== null || state.connected;
  const waiting = serial.state === 'connecting' || serial.state === 'closing' || state.busy;
  $('connect').hidden = active;
  $('disconnect').hidden = !active;
  $('connect').disabled = waiting || (state.mode === 'real' && !!support());
  $('connect').textContent = waiting ? '正在处理连接…' : state.mode === 'demo' ? '启动演示测试' : '选择并连接设备';
  $('disconnect').textContent = state.demoTimer !== null ? '停止演示' : '断开连接';
  $('disconnect').disabled = waiting;
  for (const id of ['transport', 'baud', 'data-bits', 'stop-bits', 'parity', 'encoding']) $(id).disabled = active || waiting;
  for (const button of document.querySelectorAll('[data-command]')) button.disabled = !active || waiting;
  $('send').disabled = !active || waiting;
  for (const id of ['mode-real', 'mode-demo']) $(id).disabled = waiting;
  if (active) { $('global-status').className = 'status-pill ' + (state.demoTimer !== null ? 'demo' : 'connected'); $('global-status').innerHTML = `<i></i> ${state.demoTimer !== null ? '演示运行中' : '设备已连接'}`; }
}
async function stop() {
  if (state.demoTimer !== null) { clearInterval(state.demoTimer); state.demoTimer = null; }
  await serial.disconnect();
  decoder?.finish(); system('本次连接已停止，读数保留供查看；重新连接会清空指标。');
  $('global-status').className = 'status-pill'; $('global-status').innerHTML = '<i></i> 已停止'; updateControls();
}
async function setMode(mode) {
  if (state.mode === mode && state.source !== 'replay') return;
  await stop(); state.mode = mode;
  $('mode-real').classList.toggle('active', mode === 'real'); $('mode-real').setAttribute('aria-pressed', mode === 'real');
  $('mode-demo').classList.toggle('active', mode === 'demo'); $('mode-demo').setAttribute('aria-pressed', mode === 'demo');
  resetSession(mode);
  $('target-title').textContent = mode === 'real' ? 'JDY-31-SPP' : 'SIMULATED SCALE';
  $('target-kind').textContent = mode === 'real' ? '经典蓝牙串口 / SPP' : '模拟报文 · 不连接蓝牙设备';
  $('connection-note').textContent = mode === 'real' ? '先在系统蓝牙中配对 JDY-31-SPP，默认配对码为 1234。连接后先观察接收内容。' : '演示报文使用与固件相同的 GBK 格式。修复版 *% / *BM0# 命令可测试往返，原板 *BMI# 在演示中不产生虚构回执。';
  updateControls();
}
let fixtures;
async function demoPacket() {
  const session = state.session;
  const frame = fixtures[state.demoIndex++ % fixtures.length];
  // A deliberately split GBK stream also exercises multi-byte character buffering.
  const bytes = fromHex(state.demoBmi ? frame.bmi : frame.waiting);
  receive(bytes.slice(0, 1), session); receive(bytes.slice(1, 7), session); receive(bytes.slice(7), session);
}
async function startDemo() {
  if (!fixtures) { const response = await fetch('./fixtures.json'); if (!response.ok) throw new Error('演示报文文件加载失败'); fixtures = await response.json(); }
  resetSession('demo'); state.demoIndex = 0; demoCommands = new FirmwareCommandParser();
  state.demoTimer = setInterval(demoPacket, 1500); system('演示测试开始：非实物数据。'); demoPacket(); updateControls();
}
function connectionMessage(error) {
  if (error.name === 'NotFoundError') return '已取消选择，未连接设备。';
  if (error.name === 'SecurityError' || error.name === 'NotAllowedError') return '浏览器或系统未允许串口访问。请在独立 Chrome 标签页打开 HTTPS / localhost 页面，并检查蓝牙权限。';
  if (error.name === 'NetworkError') return '设备连接失败：请先系统配对 JDY-31-SPP，断开其他串口工具后重试。';
  return '连接失败：' + (error.message || String(error));
}
$('connect').addEventListener('click', async () => {
  state.busy = true; updateControls();
  try {
    if (state.mode === 'demo') await startDemo();
    else {
      resetSession('real'); system('等待选择 JDY-31-SPP 或指定串口。');
      await serial.connect({ transport: $('transport').value, baudRate: Number($('baud').value), dataBits: Number($('data-bits').value), stopBits: Number($('stop-bits').value), parity: $('parity').value });
    }
  } catch (error) { const message = connectionMessage(error); system(message); notify(message, error.name !== 'NotFoundError'); }
  finally { state.busy = false; updateControls(); }
});
$('disconnect').addEventListener('click', () => stop().catch(error => notify(error.message, true)));
$('mode-real').addEventListener('click', () => setMode('real'));
$('mode-demo').addEventListener('click', () => setMode('demo'));
async function sendCommand(bytes) {
  if (state.demoTimer === null && !state.connected) throw new Error('请先连接设备或启动演示。');
  if (state.connected) await serial.send(bytes);
  state.tx += bytes.length; $('tx-count').textContent = state.tx.toLocaleString();
  log('TX', bytes, new TextDecoder('ascii').decode(bytes));
  if (state.demoTimer !== null) {
    for (const event of demoCommands.push(bytes)) {
      if (event === 'test') receive(new TextEncoder().encode('Test Ok!\r\n\r\n'));
      if (event === 'bmi') { state.demoBmi = true; await demoPacket(); }
    }
  }
}
$('send-form').addEventListener('submit', async event => {
  event.preventDefault(); if (state.busy) return;
  try {
    const ending = { crlf: '\r\n', lf: '\n', cr: '\r', '': '' }[$('line-ending').value];
    const bytes = encodeCommand($('send-text').value, $('send-mode').value, ending);
    state.busy = true; updateControls(); await sendCommand(bytes);
  } catch (error) { notify(error.message, true); }
  finally { state.busy = false; updateControls(); }
});
for (const button of document.querySelectorAll('[data-command]')) button.addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true; updateControls();
  try { await sendCommand(encodeCommand(button.dataset.command)); } catch (error) { notify(error.message, true); }
  finally { state.busy = false; updateControls(); }
});
$('send-mode').addEventListener('change', () => $('send-text').placeholder = $('send-mode').value === 'hex' ? '例如 2A 25 23（完整字节）' : '输入命令，例如 *%#');
$('encoding').addEventListener('change', () => { makeDecoder(); system('接收编码已切换为 ' + $('encoding').value.toUpperCase()); });
$('view-mode').addEventListener('change', renderTerminal);
$('pause').addEventListener('click', () => { state.paused = !state.paused; $('pause').textContent = state.paused ? '继续显示' : '暂停显示'; $('pause').setAttribute('aria-pressed', state.paused); if (!state.paused) renderTerminal(); });
$('clear').addEventListener('click', () => { state.logs = []; state.truncated = false; renderTerminal(); system('终端已清空；接收、指标和曲线继续更新。'); });
$('export').addEventListener('click', () => {
  const metadata = { type: 'session_metadata', app: 'aidol-scale-lab', exported_at: new Date().toISOString(), log_truncated: state.truncated, current_source: state.source, hardware_verified: false };
  const text = [metadata, ...state.logs.map(({ clock, ...entry }) => entry)].map(x => JSON.stringify(x)).join('\n') + '\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `aidol-serial-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('报文回放文件请控制在 1 MB 内。');
    await stop(); resetSession('replay'); system(`开始回放：${file.name}，不是当前设备接收。`);
    const bytes = file.name.toLowerCase().endsWith('.hex') ? fromHex(await file.text()) : new Uint8Array(await file.arrayBuffer());
    for (let offset = 0; offset < bytes.length; offset += 1024) receive(bytes.slice(offset, offset + 1024));
    decoder.finish(); $('global-status').className = 'status-pill demo'; $('global-status').innerHTML = '<i></i> 回放完成'; updateControls();
  } catch (error) { notify(error.message, true); }
  finally { event.target.value = ''; }
});
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
const unsupported = support(); $('capability').classList.toggle('unsupported', !!unsupported); $('capability').querySelector('span').textContent = unsupported || '浏览器支持经典蓝牙 / Web Serial';
resetSession('real'); updateControls();
system('测试台已就绪。真实设备模式不会生成任何测量数值。');
window.addEventListener('pagehide', () => { if (state.demoTimer !== null) clearInterval(state.demoTimer); serial.disconnect().catch(() => {}); });
