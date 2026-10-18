/**
 * Web Serial 连接封装（移植自 firmware/health-scale-51/web-client/dist/serial.js）。
 *
 * 为什么是 Web Serial 而不是 Web Bluetooth：JDY-31 是经典蓝牙 SPP 模块，
 * Web Bluetooth 只支持 BLE，连不上。macOS 系统蓝牙配对后会生成 /dev/cu.JDY-31-SPP，
 * Chrome 通过 Web Serial 打开它即可收发（2026-10-17 已实测）。
 * Chrome 117+ 也能通过 RFCOMM 直接列出经典蓝牙串口（allowedBluetoothServiceClassIds）。
 */

export const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'

export interface SerialOpenOptions {
  baudRate: number
  dataBits?: 7 | 8
  stopBits?: 1 | 2
  parity?: 'none' | 'even' | 'odd'
  flowControl?: 'none' | 'hardware'
  bufferSize?: number
}

export interface SerialPortInfoLike {
  usbVendorId?: number
  usbProductId?: number
  bluetoothServiceClassId?: string
}

export interface SerialPortLike {
  open(options: SerialOpenOptions): Promise<void>
  close(): Promise<void>
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  getInfo?(): SerialPortInfoLike
}

export interface SerialRequestOptions {
  filters?: Array<SerialPortInfoLike>
  allowedBluetoothServiceClassIds?: string[]
}

export interface SerialLike {
  requestPort(options?: SerialRequestOptions): Promise<SerialPortLike>
  getPorts(): Promise<SerialPortLike[]>
}

/** 小咪秤 / JDY-31 默认参数（已实测：9600、8-N-1、GBK） */
export const SCALE_SERIAL_OPTIONS: SerialOpenOptions = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
  bufferSize: 8192,
}

export function getSerialApi(): SerialLike | null {
  if (typeof navigator === 'undefined') return null
  const api = (navigator as Navigator & { serial?: SerialLike }).serial
  return api ?? null
}

/** 返回 null 表示可以连接；否则返回给用户看的原因。 */
export function serialSupportProblem(): string | null {
  if (typeof window === 'undefined') return '当前环境不支持串口'
  if (!window.isSecureContext) {
    return '需要在 http://localhost 或 HTTPS 页面打开才能连接实物秤'
  }
  if (!getSerialApi()) return '当前浏览器不支持 Web Serial，请用电脑版 Chrome / Edge 打开'
  const doc = document as Document & {
    permissionsPolicy?: { allowsFeature(f: string): boolean }
    featurePolicy?: { allowsFeature(f: string): boolean }
  }
  const policy = doc.permissionsPolicy ?? doc.featurePolicy
  if (policy?.allowsFeature && !policy.allowsFeature('serial')) {
    return '内嵌页面限制了串口权限，请在独立的 Chrome 标签页打开'
  }
  return null
}

/** 把浏览器异常翻译成用户能看懂的提示。 */
export function describeSerialError(error: unknown): string {
  const e = error as { name?: string; message?: string } | null
  const name = e?.name ?? ''
  if (name === 'NotFoundError') return '已取消选择，未连接设备'
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return '浏览器或系统未允许串口访问，请在独立 Chrome 标签页打开 localhost 页面，并检查蓝牙权限'
  }
  if (name === 'InvalidStateError') return '串口已被占用，请先关闭其他正在使用小咪的程序或网页'
  if (name === 'NetworkError') {
    return '打不开串口：请确认小咪已开机、已在系统蓝牙里配对，并且没有被其他程序占用'
  }
  if (name === 'BreakError' || name === 'FramingError' || name === 'ParityError' || name === 'BufferOverrunError') {
    return `串口数据出错（${name}），正在继续接收`
  }
  return e?.message ? `连接中断：${e.message}` : '连接中断，请重试'
}

export type SerialState = 'idle' | 'connecting' | 'connected' | 'closing'

export interface SerialHandlers {
  data: (bytes: Uint8Array) => void
  status: (state: SerialState) => void
  error: (error: unknown) => void
}

export class SerialConnection {
  state: SerialState = 'idle'
  private api: SerialLike
  private handlers: SerialHandlers
  private port: SerialPortLike | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readTask: Promise<void> | null = null
  private writeTask: Promise<void> = Promise.resolve()
  private generation = 0

  constructor(api: SerialLike, handlers: SerialHandlers) {
    this.api = api
    this.handlers = handlers
  }

  private setState(state: SerialState) {
    this.state = state
    this.handlers.status(state)
  }

  /**
   * port 不传时弹出 Chrome 设备选择器（必须由用户点击触发）；
   * 传入 getPorts() 返回的已授权端口时可静默重连。
   */
  async connect(options: SerialOpenOptions, port?: SerialPortLike): Promise<SerialPortLike | undefined> {
    if (this.state !== 'idle') throw new Error('请先断开当前连接')
    const generation = ++this.generation
    this.setState('connecting')
    let chosen: SerialPortLike | undefined
    try {
      chosen =
        port ??
        (await this.api.requestPort({ allowedBluetoothServiceClassIds: [SPP_UUID] }))
      if (generation !== this.generation) return undefined
      await chosen.open(options)
      if (generation !== this.generation) {
        await chosen.close().catch(() => {})
        return undefined
      }
      this.port = chosen
      this.writer = chosen.writable?.getWriter() ?? null
      this.setState('connected')
      this.readTask = this.readLoop(generation)
      return chosen
    } catch (error) {
      if (chosen?.readable && chosen !== this.port) await chosen.close().catch(() => {})
      if (generation === this.generation) {
        await this.disconnect()
        throw error
      }
      return undefined
    }
  }

  private async readLoop(generation: number) {
    const NON_FATAL = new Set(['BreakError', 'FramingError', 'ParityError', 'BufferOverrunError'])
    try {
      // 非致命错误（帧错误 / 校验错误等）后 port.readable 会换成新流，继续读即可
      outer: while (this.state === 'connected' && generation === this.generation && this.port?.readable) {
        this.reader = this.port.readable.getReader()
        try {
          for (;;) {
            const { value, done } = await this.reader.read()
            if (done) break outer
            if (value?.length) this.handlers.data(value)
          }
        } catch (error) {
          if (this.state === 'connected') this.handlers.error(error)
          const name = (error as { name?: string } | null)?.name ?? ''
          if (!NON_FATAL.has(name)) break
        } finally {
          try {
            this.reader?.releaseLock()
          } catch {
            /* already released */
          }
          this.reader = null
        }
      }
    } finally {
      // 拔出 / 蓝牙断开 / 流结束：同样释放写锁并关闭端口
      if (this.state === 'connected' && generation === this.generation) {
        this.setState('closing')
        await this.writeTask.catch(() => {})
        try {
          this.writer?.releaseLock()
        } catch {
          /* ignore */
        }
        this.writer = null
        await this.port?.close().catch(() => {})
        this.port = null
        this.setState('idle')
      }
    }
  }

  send(bytes: Uint8Array): Promise<void> {
    if (this.state !== 'connected' || !this.writer) return Promise.reject(new Error('请先连接设备'))
    const writer = this.writer
    this.writeTask = this.writeTask.catch(() => {}).then(() => writer.write(bytes))
    return this.writeTask
  }

  async disconnect(): Promise<void> {
    ++this.generation
    const port = this.port
    if (this.state === 'idle') return
    this.setState('closing')
    try {
      await this.reader?.cancel().catch(() => {})
      await this.readTask?.catch(() => {})
      await this.writeTask.catch(() => {})
      try {
        this.writer?.releaseLock()
      } catch {
        /* ignore */
      }
      this.writer = null
      if (port) await port.close().catch(() => {})
    } finally {
      this.port = null
      this.reader = null
      this.readTask = null
      this.setState('idle')
    }
  }
}
