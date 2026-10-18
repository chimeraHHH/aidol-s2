/**
 * 小咪猫窝秤（JDY-31 经典蓝牙串口）文本协议。
 *
 * 移植自 firmware/health-scale-51/web-client/dist/protocol.js，保持相同的解析规则：
 *   - 串口参数 9600 8-N-1，文本为 GBK 编码，CR/LF 分行。
 *   - 一帧约 90 字节、每 1–1.5 秒一帧，例如：
 *       "身高:1.70m 体重:3.2Kg \r\nBMI值:--.-\r\n\r\n"
 *   - 也兼容旧版 "H:0.06m G:963.9Kg"、"W:3200g"、"重量：0.0kg"、"距离：0.06m"。
 *   - 设备给出的数值原样展示，不在前端重新标定；"--.-" 表示设备空值。
 *
 * 本文件只用相对导入 / 类型导入，便于 scripts/test-serial.mjs 在 Node 里直接测试。
 */

const NUM = '-?\\d+(?:\\.\\d+)?'
const EMPTY = '--(?:\\.-)?'

const FIELDS: ReadonlyArray<readonly [FieldKey, RegExp]> = [
  ['height', new RegExp('(?:身高|距离|\\bH)\\s*[:：]\\s*(' + NUM + '|' + EMPTY + ')\\s*(cm|mm|m)?', 'i')],
  ['weight', new RegExp('(?:体重|重量|\\b[GW])\\s*[:：]\\s*(' + NUM + '|' + EMPTY + ')\\s*(kg|g)?', 'i')],
  ['bmi', new RegExp('\\bBMI\\s*(?:值)?\\s*[:：]\\s*(' + NUM + '|' + EMPTY + ')', 'i')],
]

export type FieldKey = 'height' | 'weight' | 'bmi'

export interface FieldValue {
  /** 设备原始数字字符串；设备空值（--.-）为 null */
  raw: string | null
  unit: string
}

export interface ParsedLine {
  values: Partial<Record<FieldKey, FieldValue>>
  acknowledgement: boolean
}

export function parseLine(line: string): ParsedLine {
  const values: Partial<Record<FieldKey, FieldValue>> = {}
  for (const [key, pattern] of FIELDS) {
    const match = pattern.exec(line)
    if (match) {
      const raw = match[1]!
      values[key] = {
        raw: raw.startsWith('--') ? null : raw,
        unit: match[2]?.toLowerCase() ?? '',
      }
    }
  }
  return { values, acknowledgement: /Test\s+Ok!/i.test(line) }
}

/** 字节流 → 完整文本行。能处理任意位置断开的分包（包括 GBK 汉字被拆成两半）。 */
export class PacketDecoder {
  private decoder: TextDecoder
  private partial = ''
  private onLine: (line: string) => void
  private onOverflow: () => void

  constructor(
    encoding = 'gbk',
    onLine: (line: string) => void = () => {},
    onOverflow: () => void = () => {},
  ) {
    this.decoder = new TextDecoder(encoding)
    this.onLine = onLine
    this.onOverflow = onOverflow
  }

  push(bytes: Uint8Array): string {
    const text = this.decoder.decode(bytes, { stream: true })
    this.consume(text)
    return text
  }

  finish(): string {
    const tail = this.decoder.decode()
    this.consume(tail)
    if (this.partial) this.onLine(this.partial)
    this.partial = ''
    return tail
  }

  private consume(text: string) {
    for (const ch of text) {
      if (ch === '\r' || ch === '\n') {
        if (this.partial) {
          this.onLine(this.partial)
          this.partial = ''
        }
      } else {
        this.partial += ch
        // 没有换行的长噪声不能无限占内存
        if (this.partial.length > 4096) {
          this.partial = ''
          this.onOverflow()
        }
      }
    }
  }
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase()
}

export function fromHex(text: string): Uint8Array {
  const compact = text.replace(/\s+/g, '')
  if (!compact || compact.length % 2 || !/^[\da-f]+$/i.test(compact)) {
    throw new Error('HEX 需要完整的字节，例如 2A 25 23')
  }
  return Uint8Array.from(compact.match(/../g)!, (p) => parseInt(p, 16))
}

/** 一次解析出的秤读数（App 内统一用 kg）。 */
export interface ScaleReading {
  /** 换算成 kg 的体重；设备空值或异常值为 null */
  weightKg: number | null
  /** 设备原始体重字符串与单位，便于排查 */
  rawWeight: string | null
  rawUnit: string
  /** 设备附带的距离/身高（米），猫窝场景一般无意义，仅透传 */
  heightM: number | null
  /** 设备 BMI 原始值（人体公式，不用于猫咪健康判断） */
  bmiRaw: string | null
  /** 原始行文本 */
  line: string
  at: string
}

function toNumber(raw: string | null): number | null {
  if (raw === null || raw.length > 12) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * 行 → 读数。体重和 BMI 在固件里分两行发送：
 * 收到带体重的行时立即产出一条读数（实时性优先），随后的 BMI 行只补充到最近一条读数上。
 */
export class ScaleFrameAssembler {
  private last: ScaleReading | null = null
  private onReading: (r: ScaleReading) => void
  private onAck: () => void
  private now: () => Date

  constructor(
    onReading: (r: ScaleReading) => void,
    onAck: () => void = () => {},
    now: () => Date = () => new Date(),
  ) {
    this.onReading = onReading
    this.onAck = onAck
    this.now = now
  }

  pushLine(line: string) {
    const { values, acknowledgement } = parseLine(line)
    if (acknowledgement) this.onAck()
    const w = values.weight
    if (w) {
      const n = toNumber(w.raw)
      const kg = n === null ? null : w.unit === 'g' ? n / 1000 : n
      const h = values.height
      const hn = h ? toNumber(h.raw) : null
      const heightM =
        hn === null ? null : h!.unit === 'cm' ? hn / 100 : h!.unit === 'mm' ? hn / 1000 : hn
      const reading: ScaleReading = {
        weightKg: kg === null ? null : Number(kg.toFixed(3)),
        rawWeight: w.raw,
        rawUnit: w.unit || 'kg',
        heightM,
        bmiRaw: values.bmi?.raw ?? null,
        line,
        at: this.now().toISOString(),
      }
      this.last = reading
      this.onReading(reading)
      return
    }
    if (values.bmi && this.last) {
      this.last = { ...this.last, bmiRaw: values.bmi.raw }
    }
  }
}

/** 稳定判定参数：猫在窝里会动，连续几帧读数足够接近才锁定。 */
export interface StabilityOptions {
  /** 低于此重量视为窝里没猫（kg） */
  minKg: number
  /** 高于此重量视为异常读数（kg） */
  maxKg: number
  /** 需要连续多少帧 */
  windowSize: number
  /** 窗口内最大最小差不超过（kg） */
  toleranceKg: number
}

export const DEFAULT_STABILITY: StabilityOptions = {
  minKg: 0.3,
  maxKg: 30,
  windowSize: 3,
  toleranceKg: 0.1,
}

export type StabilityState =
  | { kind: 'empty' }
  | { kind: 'outOfRange'; kg: number }
  | { kind: 'fluctuating'; kg: number }
  | { kind: 'stable'; kg: number }

/** 连续读数 → 空窝 / 波动中 / 稳定（取窗口中位数作为锁定值）。 */
export class StabilityDetector {
  private window: number[] = []
  private opts: StabilityOptions

  constructor(opts: Partial<StabilityOptions> = {}) {
    this.opts = { ...DEFAULT_STABILITY, ...opts }
  }

  reset() {
    this.window = []
  }

  push(kg: number | null): StabilityState {
    if (kg === null || kg < this.opts.minKg) {
      this.window = []
      return { kind: 'empty' }
    }
    if (kg > this.opts.maxKg) {
      this.window = []
      return { kind: 'outOfRange', kg }
    }
    this.window.push(kg)
    if (this.window.length > this.opts.windowSize) this.window.shift()
    if (this.window.length < this.opts.windowSize) return { kind: 'fluctuating', kg }
    const min = Math.min(...this.window)
    const max = Math.max(...this.window)
    if (max - min > this.opts.toleranceKg + 1e-9) return { kind: 'fluctuating', kg }
    const sorted = [...this.window].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]!
    return { kind: 'stable', kg: Number(median.toFixed(2)) }
  }
}

// —— 演示用：生成与固件同格式的 GBK 字节帧 ——

const GBK_HEIGHT = [0xc9, 0xed, 0xb8, 0xdf, 0x3a] // "身高:"
const GBK_WEIGHT = [0xcc, 0xe5, 0xd6, 0xd8, 0x3a] // "体重:"
const GBK_BMI = [0x42, 0x4d, 0x49, 0xd6, 0xb5, 0x3a] // "BMI值:"

function ascii(text: string): number[] {
  return Array.from(text, (c) => c.charCodeAt(0) & 0x7f)
}

/** 生成一帧固件报文字节，例如 "身高:1.70m 体重:3.2Kg \r\nBMI值:--.-\r\n\r\n" */
export function encodeFirmwareFrame(weightKg: number, heightM = 1.7, bmi: string | null = null): Uint8Array {
  return Uint8Array.from([
    ...GBK_HEIGHT,
    ...ascii(`${heightM.toFixed(2)}m `),
    ...GBK_WEIGHT,
    ...ascii(`${weightKg.toFixed(1)}Kg \r\n`),
    ...GBK_BMI,
    ...ascii(`${bmi ?? '--.-'}\r\n\r\n`),
  ])
}
