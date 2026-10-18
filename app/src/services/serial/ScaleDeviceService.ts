import type {
  DeviceInfo,
  DeviceMode,
  LiveScaleReading,
  Measurement,
  PersonaId,
} from '@/domain/types'
import type {
  ConnectOptions,
  IDeviceService,
  WeighSessionCallbacks,
  WeighSessionOptions,
} from '@/services/interfaces/IDeviceService'
import { DemoScaleSource, type DemoScaleOptions } from './demoScaleSource'
import {
  PacketDecoder,
  ScaleFrameAssembler,
  StabilityDetector,
  type ScaleReading,
  type StabilityOptions,
} from './scaleProtocol'
import {
  SCALE_SERIAL_OPTIONS,
  SerialConnection,
  describeSerialError,
  getSerialApi,
  serialSupportProblem,
  type SerialLike,
  type SerialPortLike,
} from './webSerial'

const MODE_KEY = 'xm:device-mode'
const PORT_KEY = 'xm:device-port-info'

export interface ScaleDeviceServiceOptions {
  baseDevice: DeviceInfo
  /** 选一句 AI 人设台词（由组合根注入，避免这里依赖 mock 数据） */
  pickAiLine?: (persona: PersonaId) => string
  serialApi?: SerialLike | null
  supportProblem?: () => string | null
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  demo?: DemoScaleOptions
  stability?: Partial<StabilityOptions>
  /** 测试用：缩短锁定后的动画停顿 */
  phaseDelayMs?: { locked: number; ai: number }
  /** 构造后是否静默重连已授权的串口（浏览器里默认 true） */
  autoReconnect?: boolean
}

function safeStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function isLocalhost(): boolean {
  if (typeof location === 'undefined') return false
  return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
}

/**
 * 小咪猫窝秤设备服务。
 * - serial：实物，Chrome Web Serial 打开 macOS 配对后映射出的 cu.JDY-31-SPP（经典蓝牙 SPP）。
 * - demo：演示，生成固件同格式字节流，走同一条解析链路。
 * 两种模式产出的读数都经过 PacketDecoder → ScaleFrameAssembler → StabilityDetector。
 */
export class ScaleDeviceService implements IDeviceService {
  private info: DeviceInfo
  private listeners = new Set<(d: DeviceInfo) => void>()
  private readingListeners = new Set<(r: ScaleReading) => void>()
  private serial: SerialConnection | null = null
  private demo: DemoScaleSource
  private decoder!: PacketDecoder
  private assembler!: ScaleFrameAssembler
  private opts: ScaleDeviceServiceOptions
  private serialApi: SerialLike | null
  private storage: Pick<Storage, 'getItem' | 'setItem'> | null
  private connectTask: Promise<DeviceInfo> | null = null

  constructor(opts: ScaleDeviceServiceOptions) {
    this.opts = opts
    this.serialApi = opts.serialApi === undefined ? getSerialApi() : opts.serialApi
    this.storage = opts.storage === undefined ? safeStorage() : opts.storage
    const problem = (opts.supportProblem ?? serialSupportProblem)()
    const saved = this.storage?.getItem(MODE_KEY)
    const mode: DeviceMode =
      saved === 'serial' || saved === 'demo' ? saved : !problem && isLocalhost() ? 'serial' : 'demo'

    this.info = {
      ...opts.baseDevice,
      connection: 'disconnected',
      mode,
      transportLabel: mode === 'demo' ? '演示模式' : '蓝牙串口 · 未连接',
      lastError: null,
      supportProblem: problem,
      liveReading: null,
      rxBytes: 0,
    }
    this.resetParser()
    this.demo = new DemoScaleSource((b) => this.feed(b), opts.demo)

    if (mode === 'demo') {
      void this.connect({ interactive: false })
    } else if (opts.autoReconnect !== false) {
      void this.connect({ interactive: false }).catch(() => {})
    }
  }

  // —— IDeviceService ——

  async getDevice(): Promise<DeviceInfo> {
    return { ...this.info }
  }

  subscribe(listener: (d: DeviceInfo) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** 每一帧解析出的读数（WeighPage 等需要逐帧数据时使用） */
  subscribeReadings(listener: (r: ScaleReading) => void): () => void {
    this.readingListeners.add(listener)
    return () => this.readingListeners.delete(listener)
  }

  async setMode(mode: DeviceMode): Promise<DeviceInfo> {
    if (mode === this.info.mode) return { ...this.info }
    await this.disconnect()
    this.storage?.setItem(MODE_KEY, mode)
    this.patch({
      mode,
      lastError: null,
      liveReading: null,
      transportLabel: mode === 'demo' ? '演示模式' : '蓝牙串口 · 未连接',
    })
    if (mode === 'demo') return this.connect({ interactive: false })
    return { ...this.info }
  }

  async connect(options: ConnectOptions = {}): Promise<DeviceInfo> {
    const interactive = options.interactive ?? true
    if (this.info.connection === 'connected') return { ...this.info }
    if (this.connectTask) {
      // 静默重连还在进行时用户点了「连接」：等它结束，没连上再弹选择器
      try {
        return await this.connectTask
      } catch (error) {
        if (!interactive) throw error
      }
      if ((this.info.connection as DeviceInfo['connection']) === 'connected') return { ...this.info }
    }
    const task = this.doConnect(interactive).finally(() => {
      if (this.connectTask === task) this.connectTask = null
    })
    this.connectTask = task
    return task
  }

  async disconnect(): Promise<void> {
    this.demo.stop()
    // 先标记为主动断开，避免串口 idle 回调把它当成意外掉线
    this.patch({
      connection: 'disconnected',
      lastError: null,
      transportLabel: this.info.mode === 'demo' ? '演示模式' : '蓝牙串口 · 未连接',
    })
    if (this.serial) await this.serial.disconnect()
    this.decoder.finish()
  }

  startWeighSession(callbacks: WeighSessionCallbacks, options: WeighSessionOptions = {}): () => void {
    let cancelled = false
    let locked = false
    const timers: Array<ReturnType<typeof setTimeout>> = []
    const cleanups: Array<() => void> = []
    const detector = new StabilityDetector(this.opts.stability)
    const delay = this.opts.phaseDelayMs ?? { locked: 600, ai: 900 }
    let phase: string = 'idle'
    const setPhase = (p: Parameters<WeighSessionCallbacks['onPhase']>[0]) => {
      if (phase === p) return
      phase = p
      callbacks.onPhase(p)
    }
    const stop = () => {
      cancelled = true
      for (const t of timers) clearTimeout(t)
      for (const c of cleanups.splice(0)) c()
    }

    const onReading = (r: ScaleReading) => {
      if (cancelled || locked) return
      const st = detector.push(r.weightKg)
      if (st.kind === 'empty') {
        callbacks.onNotice?.(null)
        setPhase('waiting')
        return
      }
      if (st.kind === 'outOfRange') {
        callbacks.onNotice?.(`读数 ${st.kg.toFixed(1)} kg 超出猫咪范围，请检查秤是否去皮 / 窝里有没有杂物`)
        setPhase('waiting')
        return
      }
      callbacks.onNotice?.(null)
      setPhase('fluctuating')
      callbacks.onLiveWeight?.(Number(st.kg.toFixed(2)))
      if (st.kind !== 'stable') return

      locked = true
      for (const c of cleanups.splice(0)) c()
      const prev = options.previousKg
      const measurement: Measurement = {
        sessionId: `s-${Date.now().toString(36)}`,
        weightKg: st.kg,
        deltaKg: prev == null ? null : Number((st.kg - prev).toFixed(2)),
        lockedAt: new Date().toISOString(),
        source: this.info.mode === 'serial' ? 'serial' : 'mock',
      }
      setPhase('locked')
      callbacks.onLocked(measurement)
      timers.push(
        setTimeout(() => {
          if (cancelled) return
          setPhase('ai')
          const line = this.opts.pickAiLine?.(options.personaId ?? 'gentle')
          if (line) callbacks.onAiLine?.(line)
          timers.push(
            setTimeout(() => {
              if (!cancelled) setPhase('done')
            }, delay.ai),
          )
        }, delay.locked),
      )
    }

    void (async () => {
      try {
        if (this.info.connection !== 'connected') {
          setPhase('connecting')
          await this.connect({ interactive: false })
        }
        if (cancelled) return
        if (this.info.mode === 'demo') this.demo.restart()
        setPhase('waiting')
        cleanups.push(this.subscribeReadings(onReading))
        cleanups.push(
          this.subscribe((d) => {
            if (!locked && !cancelled && d.connection !== 'connected') {
              stop()
              setPhase('idle')
              callbacks.onError?.(d.lastError || '小咪断开了连接，请重新连接后再称')
            }
          }),
        )
      } catch (error) {
        if (cancelled) return
        setPhase('idle')
        callbacks.onError?.(error instanceof Error ? error.message : describeSerialError(error))
      }
    })()

    return stop
  }

  // —— internals ——

  private resetParser() {
    this.decoder = new PacketDecoder(
      'gbk',
      (line) => this.assembler.pushLine(line),
      () => {},
    )
    this.assembler = new ScaleFrameAssembler((r) => this.onReading(r))
  }

  private feed(bytes: Uint8Array) {
    this.info = { ...this.info, rxBytes: (this.info.rxBytes ?? 0) + bytes.length }
    try {
      this.decoder.push(bytes)
    } catch {
      /* 解码异常不应该打断接收 */
    }
  }

  private onReading(r: ScaleReading) {
    const live: LiveScaleReading = {
      weightKg: r.weightKg,
      rawWeight: r.rawWeight,
      rawUnit: r.rawUnit,
      heightM: r.heightM,
      bmiRaw: r.bmiRaw,
      at: r.at,
    }
    const recovered = this.info.connection === 'connected' && this.info.lastError ? { lastError: null } : {}
    this.patch({ liveReading: live, lastSeenAt: r.at, ...recovered })
    for (const l of [...this.readingListeners]) l(r)
  }

  private patch(p: Partial<DeviceInfo>) {
    this.info = { ...this.info, ...p }
    const snap = { ...this.info }
    for (const l of [...this.listeners]) l(snap)
  }

  private async doConnect(interactive: boolean): Promise<DeviceInfo> {
    this.resetParser()
    this.patch({ rxBytes: 0, lastError: null })

    if (this.info.mode === 'demo') {
      this.patch({ connection: 'connecting' })
      this.demo.start()
      this.patch({
        connection: 'connected',
        transportLabel: '演示模式 · 模拟数据',
        lastSeenAt: new Date().toISOString(),
      })
      return { ...this.info }
    }

    const problem = this.info.supportProblem ?? null
    if (problem || !this.serialApi) {
      const message = problem ?? '当前浏览器不支持 Web Serial'
      this.patch({ connection: 'error', lastError: message })
      throw new Error(message)
    }

    let port: SerialPortLike | undefined
    if (!interactive) {
      port = await this.pickGrantedPort()
      if (!port) {
        this.patch({ connection: 'disconnected' })
        throw new Error('请先点「连接小咪」，在弹窗里选择 cu.JDY-31-SPP')
      }
    }

    if (!this.serial) {
      this.serial = new SerialConnection(this.serialApi, {
        data: (b) => this.feed(b),
        status: (s) => {
          if (s === 'connecting') this.patch({ connection: 'connecting' })
          if (s === 'idle' && this.info.mode === 'serial' && this.info.connection === 'connected') {
            this.decoder.finish()
            this.patch({
              connection: 'disconnected',
              transportLabel: '蓝牙串口 · 已断开',
              lastError: this.info.lastError ?? '小咪断开了连接（关机、走远或被其他程序占用）',
            })
          }
        },
        error: (e) =>
          this.patch({
            lastError:
              (e as { name?: string } | null)?.name === 'NetworkError'
                ? '小咪断开了连接：蓝牙掉线、秤关机或离得太远，请靠近后重新连接'
                : describeSerialError(e),
          }),
      })
    }

    this.patch({ connection: 'connecting' })
    try {
      const opened = await this.serial.connect(SCALE_SERIAL_OPTIONS, port)
      if (opened) this.rememberPort(opened)
      this.patch({
        connection: 'connected',
        lastError: null,
        transportLabel: `蓝牙串口 · ${SCALE_SERIAL_OPTIONS.baudRate}`,
        lastSeenAt: new Date().toISOString(),
      })
      return { ...this.info }
    } catch (error) {
      const message = describeSerialError(error)
      const cancelledPick = (error as { name?: string })?.name === 'NotFoundError'
      this.patch({ connection: cancelledPick ? 'disconnected' : 'error', lastError: message })
      throw new Error(message)
    }
  }

  private async pickGrantedPort(): Promise<SerialPortLike | undefined> {
    const ports = await this.serialApi!.getPorts().catch(() => [] as SerialPortLike[])
    if (!ports.length) return undefined
    const saved = this.storage?.getItem(PORT_KEY)
    if (saved) {
      const hit = ports.find((p) => JSON.stringify(p.getInfo?.() ?? {}) === saved)
      if (hit) return hit
    }
    return ports.length === 1 ? ports[0] : undefined
  }

  private rememberPort(port: SerialPortLike) {
    try {
      this.storage?.setItem(PORT_KEY, JSON.stringify(port.getInfo?.() ?? {}))
    } catch {
      /* ignore */
    }
  }
}
