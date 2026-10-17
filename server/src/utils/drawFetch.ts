/** 统一包装对 draw 网关的 fetch，带重试与可读错误 */

export function formatFetchError(err: unknown, label: string): Error {
  if (!(err instanceof Error)) return new Error(`${label}失败`)
  const cause = 'cause' in err ? (err as Error & { cause?: unknown }).cause : undefined
  let detail = ''
  if (cause instanceof Error) detail = cause.message
  else if (cause && typeof cause === 'object' && 'code' in cause) {
    detail = String((cause as { code?: string }).code || '')
  } else if (cause) detail = String(cause)

  const msg = err.message === 'fetch failed'
    ? `无法连接生图服务（${label}）。请检查网络，或稍后重试`
    : `${label}：${err.message}`
  return new Error(detail ? `${msg}（${detail}）` : msg)
}

export async function drawFetch(
  url: string,
  init: RequestInit,
  label: string,
  retries = 2,
): Promise<Response> {
  let last: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(5 * 60 * 1000),
      })
      return res
    } catch (err) {
      last = err
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)))
        continue
      }
    }
  }
  throw formatFetchError(last, label)
}
