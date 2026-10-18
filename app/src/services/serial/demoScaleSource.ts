import { encodeFirmwareFrame } from './scaleProtocol'

/**
 * 演示模式：不连硬件，按固件的真实格式（GBK 文本、CR/LF）生成字节流，
 * 并故意随机拆包、混入噪声字节，走和实物完全相同的解析链路。
 *
 * 剧本循环：空窝 → 小猫进窝（读数爬升、晃动）→ 趴稳 → 离开。
 */
export interface DemoScaleOptions {
  intervalMs?: number
  /** 小猫体重中心值（kg），默认 4.35–4.5 随机 */
  baseKg?: number
  random?: () => number
}

export class DemoScaleSource {
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private script: number[] = []
  private onBytes: (bytes: Uint8Array) => void
  private opts: Required<Omit<DemoScaleOptions, 'baseKg'>> & { baseKg?: number }

  constructor(onBytes: (bytes: Uint8Array) => void, opts: DemoScaleOptions = {}) {
    this.onBytes = onBytes
    this.opts = { intervalMs: 450, random: Math.random, ...opts }
  }

  get running() {
    return this.timer !== null
  }

  start() {
    this.stop()
    this.restart()
    this.timer = setInterval(() => this.tick(), this.opts.intervalMs)
  }

  /** 从「空窝」重新开始剧本（开始称重时调用，保证能看到完整过程） */
  restart() {
    const r = this.opts.random
    const base = this.opts.baseKg ?? 4.35 + r() * 0.15
    const j = (amp: number) => (r() - 0.5) * 2 * amp
    this.script = [
      0, 0, 0.1,
      1.4 + j(0.3), 3.2 + j(0.4), base + 0.35 + j(0.1), base - 0.2 + j(0.1), base + 0.1,
      base, base + j(0.04), base + j(0.04), base, base + j(0.04), base, base, base,
      base + j(0.04), base, base, base, base,
      2.1 + j(0.3), 0.2, 0, 0, 0,
    ]
    this.step = 0
  }

  stop() {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
  }

  private tick() {
    const r = this.opts.random
    const kg = Math.max(0, this.script[this.step % this.script.length]!)
    this.step += 1
    const frame = encodeFirmwareFrame(kg)
    // 偶尔混入一点串口噪声，验证解析器的容错
    if (r() < 0.08) this.onBytes(Uint8Array.of(0xff, 0x00, 0x7e))
    // 随机拆成 1–3 包，可能把 GBK 汉字切成两半
    const cut1 = 1 + Math.floor(r() * (frame.length - 2))
    const cut2 = cut1 + Math.floor(r() * (frame.length - cut1))
    const parts = r() < 0.3 ? [frame] : [frame.slice(0, cut1), frame.slice(cut1, cut2), frame.slice(cut2)]
    for (const p of parts) if (p.length) this.onBytes(p)
  }
}
