/**
 * 本机原生 JDY-31 桥接客户端。
 *
 * 数据路径：PhysicalScaleReader（SPP/RFCOMM）→ JSONL → python start_viewer.py（SSE）
 * → 本模块 → ScaleDeviceService 协议解析。
 *
 * 经 Vite 代理访问同源 `/jdy-bridge/events`，避免 18765 的 Host/Origin 限制。
 */

export const NATIVE_BRIDGE_EVENTS_PATH = '/jdy-bridge/events'
export const NATIVE_BRIDGE_PAGE_PATH = '/jdy-bridge/'

export interface NativeBridgePacket {
  hex: string
  time: number
  bytes: number
}

export interface NativeBridgeHandlers {
  data: (bytes: Uint8Array) => void
  status?: (state: 'connecting' | 'open' | 'closed' | 'error') => void
  error?: (message: string) => void
}

function hexToBytes(hex: string): Uint8Array | null {
  const compact = hex.replace(/\s+/g, '')
  if (!compact || compact.length % 2 || !/^[\da-f]+$/i.test(compact)) return null
  const out = new Uint8Array(compact.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** 探测本机桥接页是否可用（PhysicalScaleReader + start_viewer.py 需已启动）。 */
export async function probeNativeBridge(timeoutMs = 1200): Promise<boolean> {
  if (typeof fetch === 'undefined') return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(NATIVE_BRIDGE_PAGE_PATH, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 订阅桥接 SSE。返回断开函数。
 * 首包或首次 heartbeat 即视为 open（心跳说明服务在线，随后会有 receive）。
 */
export function connectNativeBridge(handlers: NativeBridgeHandlers): () => void {
  handlers.status?.('connecting')
  const source = new EventSource(NATIVE_BRIDGE_EVENTS_PATH)
  let opened = false
  let closed = false

  const markOpen = () => {
    if (opened || closed) return
    opened = true
    handlers.status?.('open')
  }

  source.onopen = () => markOpen()

  source.onmessage = (ev) => {
    markOpen()
    try {
      const packet = JSON.parse(ev.data) as NativeBridgePacket
      if (!packet?.hex || typeof packet.bytes !== 'number') return
      const bytes = hexToBytes(packet.hex)
      if (!bytes || bytes.length !== packet.bytes) return
      handlers.data(bytes)
    } catch {
      /* ignore malformed */
    }
  }

  source.onerror = () => {
    if (closed) return
    // EventSource 会自动重连；若从未 open 过，报告错误供上层回退
    if (!opened) {
      handlers.error?.(
        '本机蓝牙桥接未就绪：请先打开 PhysicalScaleReader，并运行 python3 start_viewer.py',
      )
      handlers.status?.('error')
      source.close()
      closed = true
    }
  }

  return () => {
    if (closed) return
    closed = true
    source.close()
    handlers.status?.('closed')
  }
}
