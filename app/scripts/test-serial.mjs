// 小咪蓝牙串口接入的自测：协议解析、分包/噪声容错、稳定锁定、Web Serial 连接与断开、演示模式。
// 运行：npm run test:serial（只用 Node 内置测试器 + 项目已有的 typescript，无需额外依赖）
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '../src/services/serial')
const out = mkdtempSync(join(tmpdir(), 'xm-serial-'))
for (const name of ['scaleProtocol', 'webSerial', 'nativeBridge', 'demoScaleSource', 'ScaleDeviceService']) {
  const code = ts.transpileModule(readFileSync(join(srcDir, `${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true },
  }).outputText.replace(/from '\.\/(\w+)'/g, "from './$1.js'")
  writeFileSync(join(out, `${name}.js`), code)
}
process.on('exit', () => rmSync(out, { recursive: true, force: true }))
const load = (n) => import(pathToFileURL(join(out, `${n}.js`)).href)
const P = await load('scaleProtocol')
const { ScaleDeviceService } = await load('ScaleDeviceService')

// 固件联调分支里的真实格式样本（firmware/health-scale-51/web-client/dist/fixtures.json）
const fixturesPath = join(here, '../../firmware/health-scale-51/web-client/dist/fixtures.json')
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function collect() {
  const readings = []
  const asm = new P.ScaleFrameAssembler((r) => readings.push(r))
  const dec = new P.PacketDecoder('gbk', (l) => asm.pushLine(l))
  return { readings, dec }
}

test('固件样本：任意位置拆包（含 GBK 汉字被切开）都能解析出 3.2 kg', () => {
  const bytes = P.fromHex(fixtures[0].waiting)
  for (let split = 0; split <= bytes.length; split++) {
    const { readings, dec } = collect()
    dec.push(bytes.slice(0, split)); dec.push(bytes.slice(split)); dec.finish()
    assert.equal(readings.length, 1)
    assert.equal(readings[0].weightKg, 3.2)
    assert.equal(readings[0].heightM, 1.7)
    assert.equal(readings[0].rawWeight, '3.2')
  }
})

test('所有固件样本逐字节输入，读数顺序正确，BMI 空值为 null', () => {
  const { readings, dec } = collect()
  for (const f of fixtures) for (const b of P.fromHex(f.waiting)) dec.push(Uint8Array.of(b))
  assert.deepEqual(readings.map((r) => r.weightKg), [3.2, 3.3, 3.2, 3.4, 3.3, 3.2, 3.1, 3.2])
  assert.equal(readings[0].bmiRaw, null)
})

test('噪声字节、半行、旧格式、g 单位、负值与超长值', () => {
  const { readings, dec } = collect()
  dec.push(Uint8Array.of(0xff, 0x00, 0x7e))
  dec.push(new TextEncoder().encode('garbage\r\nW:3200g\nG:-0.4Kg\r\nG:99999999999999.0kg\r\nW:4.'))
  assert.deepEqual(readings.map((r) => r.weightKg), [3.2, -0.4, null])
  dec.push(new TextEncoder().encode('3Kg\r\n'))
  assert.equal(readings.at(-1).weightKg, 4.3)
})

test('encodeFirmwareFrame 生成的字节与固件样本完全一致', () => {
  assert.equal(P.toHex(P.encodeFirmwareFrame(3.2)), P.toHex(P.fromHex(fixtures[0].waiting)))
})

test('稳定判定：空窝 → 波动 → 连续 3 帧差 ≤0.1kg 锁定中位数', () => {
  const d = new P.StabilityDetector()
  assert.equal(d.push(0).kind, 'empty')
  assert.equal(d.push(2.1).kind, 'fluctuating')
  assert.equal(d.push(4.6).kind, 'fluctuating')
  assert.equal(d.push(4.3).kind, 'fluctuating')
  assert.equal(d.push(4.4).kind, 'fluctuating')
  assert.deepEqual(d.push(4.3), { kind: 'stable', kg: 4.3 })
  assert.equal(d.push(963.9).kind, 'outOfRange')
  assert.equal(d.push(null).kind, 'empty')
})

// —— 假的 Web Serial：可控地往流里推字节，模拟断开 ——
function fakeSerial({ granted = [] } = {}) {
  const ports = []
  const makePort = () => {
    let controller
    const port = {
      opened: false, closed: false,
      readable: null, writable: new WritableStream({ write() {} }),
      async open(opts) { this.opts = opts; this.opened = true; this.readable = new ReadableStream({ start(c) { controller = c } }) },
      async close() { this.closed = true },
      getInfo: () => ({}),
      push: (bytes) => controller.enqueue(bytes),
      unplug: () => { const e = new Error('The device has been lost.'); e.name = 'NetworkError'; controller.error(e) },
    }
    ports.push(port)
    return port
  }
  const grantedPorts = granted.map(() => makePort())
  return {
    ports,
    api: {
      requested: 0,
      async requestPort(opts) { this.lastRequest = opts; this.requested++; return makePort() },
      async getPorts() { return grantedPorts },
    },
  }
}

const base = { id: 'xiaomi-pod-01', name: '小咪', firmware: 't', connection: 'connected', batteryPercent: null, lastSeenAt: null }
function makeService(extra = {}) {
  const store = new Map([['xm:device-mode', 'serial']])
  return new ScaleDeviceService({
    baseDevice: base,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    supportProblem: () => null,
    pickAiLine: () => '稳稳的。',
    phaseDelayMs: { locked: 5, ai: 5 },
    ...extra,
  })
}

test('实物模式：选择串口 → 9600 8N1 → 分包数据流 → 锁定体重并带 serial 来源', async () => {
  const fs = fakeSerial()
  const svc = makeService({ serialApi: fs.api })
  await sleep(5)
  const info = await svc.connect({ interactive: true })
  assert.equal(info.connection, 'connected')
  assert.equal(fs.api.requested, 1)
  assert.deepEqual(fs.api.lastRequest.allowedBluetoothServiceClassIds, ['00001101-0000-1000-8000-00805f9b34fb'])
  const port = fs.ports[0]
  assert.equal(port.opts.baudRate, 9600); assert.equal(port.opts.dataBits, 8); assert.equal(port.opts.parity, 'none')

  const phases = []; const lives = []; let locked = null; let ai = null
  svc.startWeighSession({
    onPhase: (p) => phases.push(p), onLiveWeight: (k) => lives.push(k),
    onLocked: (m) => { locked = m }, onAiLine: (l) => { ai = l }, onError: (e) => assert.fail(e),
  }, { previousKg: 4.5 })
  await sleep(5)
  for (const kg of [0, 1.8, 4.6, 4.3, 4.4, 4.3]) {
    const bytes = P.encodeFirmwareFrame(kg)
    port.push(bytes.slice(0, 3)); port.push(Uint8Array.of(0xff)); port.push(bytes.slice(3, 20)); port.push(bytes.slice(20))
    await sleep(2)
  }
  await sleep(30)
  assert.ok(locked, '应锁定')
  assert.equal(locked.weightKg, 4.3); assert.equal(locked.deltaKg, -0.2); assert.equal(locked.source, 'serial')
  assert.deepEqual(phases, ['waiting', 'fluctuating', 'locked', 'ai', 'done'])
  assert.deepEqual(lives, [1.8, 4.6, 4.3, 4.4, 4.3])
  assert.equal(ai, '稳稳的。')
  const d = await svc.getDevice()
  assert.equal(d.liveReading.weightKg, 4.3)
  assert.equal(d.rxBytes, 6 * (P.encodeFirmwareFrame(1).length + 1))
  await svc.disconnect()
  assert.equal(port.closed, true)
  assert.equal((await svc.getDevice()).connection, 'disconnected')
  assert.equal((await svc.getDevice()).lastError, null)
})

test('实物模式：称重中蓝牙断开 → 会话报错、状态变为未连接并给出原因', async () => {
  const fs = fakeSerial()
  const svc = makeService({ serialApi: fs.api })
  await svc.connect()
  let err = null; const phases = []
  svc.startWeighSession({ onPhase: (p) => phases.push(p), onLocked: () => assert.fail('不应锁定'), onError: (e) => { err = e } })
  await sleep(5)
  fs.ports[0].push(P.encodeFirmwareFrame(4.2))
  await sleep(5)
  fs.ports[0].unplug()
  await sleep(20)
  const d = await svc.getDevice()
  assert.equal(d.connection, 'disconnected')
  assert.match(d.lastError, /断开/)
  assert.ok(err)
  assert.equal(phases.at(-1), 'idle')
  assert.equal(fs.ports[0].closed, true)
})

test('实物模式：没有授权过的串口时，静默重连给出「点连接小咪」提示；有授权时自动连上', async () => {
  const none = makeService({ serialApi: fakeSerial().api })
  await assert.rejects(none.connect({ interactive: false }), /连接小咪/)
  let err = null
  none.startWeighSession({ onPhase: () => {}, onLocked: () => {}, onError: (e) => { err = e } })
  await sleep(10)
  assert.match(err, /cu\.JDY-31-SPP/)

  const fs = fakeSerial({ granted: [1] })
  const auto = makeService({ serialApi: fs.api })
  await sleep(10)
  assert.equal((await auto.getDevice()).connection, 'connected')
  assert.equal(fs.api.requested, 0)
  await auto.disconnect()
})

test('实物模式：用户在选择器里点取消 → 未连接 + 友好提示', async () => {
  const api = { async requestPort() { const e = new Error('No port selected'); e.name = 'NotFoundError'; throw e }, async getPorts() { return [] } }
  const svc = makeService({ serialApi: api })
  await assert.rejects(svc.connect(), /已取消选择/)
  assert.equal((await svc.getDevice()).connection, 'disconnected')
})

test('演示模式：模拟数据流走同一解析链路，完整跑完称重流程', async () => {
  const store = new Map([['xm:device-mode', 'demo']])
  const svc = new ScaleDeviceService({
    baseDevice: base, serialApi: null, supportProblem: () => '不支持',
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    demo: { intervalMs: 5, baseKg: 4.4 }, phaseDelayMs: { locked: 5, ai: 5 }, pickAiLine: () => 'hi',
  })
  await sleep(5)
  assert.equal((await svc.getDevice()).connection, 'connected')
  const phases = []; let locked = null
  svc.startWeighSession({ onPhase: (p) => phases.push(p), onLocked: (m) => { locked = m } })
  for (let i = 0; i < 100 && !phases.includes('done'); i++) await sleep(10)
  assert.ok(locked)
  assert.ok(Math.abs(locked.weightKg - 4.4) <= 0.1, `锁定值 ${locked.weightKg}`)
  assert.equal(locked.source, 'mock')
  assert.deepEqual(phases.slice(0, 2), ['waiting', 'fluctuating'])
  assert.equal(phases.at(-1), 'done')
  await svc.setMode('serial')
  const d = await svc.getDevice()
  assert.equal(d.mode, 'serial'); assert.equal(d.connection, 'disconnected'); assert.equal(store.get('xm:device-mode'), 'serial')
})
