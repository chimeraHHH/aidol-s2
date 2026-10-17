/** 每台手机 / 浏览器一份，用于服务端 Memory 等与其它用户隔离 */
const KEY = 'xiaomi.deviceId.v1'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 本机设备 ID（localStorage，清站点数据会重置） */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY)?.trim()
    if (existing) return existing
    const next = createId()
    localStorage.setItem(KEY, next)
    return next
  } catch {
    return 'anonymous'
  }
}

/**
 * 发给后端的用户键：设备 + 账号，避免演示账号 userId 在公网撞车。
 * 例：`<deviceId>:10288`
 */
export function scopedUserId(accountUserId: string): string {
  const id = (accountUserId || 'guest').trim() || 'guest'
  return `${getDeviceId()}:${id}`.slice(0, 64)
}
