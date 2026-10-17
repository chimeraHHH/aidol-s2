/**
 * 生产环境可设 VITE_API_BASE=https://your-api.example.com
 * 开发环境留空，走 Vite 代理到本机 8787。
 */
export function getApiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || ''
  return raw.replace(/\/$/, '')
}

/** API 请求路径（如 /api/avatar/generate） */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

/** 展示用：把后端返回的 /generated/... 拼成可访问地址 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  return apiUrl(path)
}
