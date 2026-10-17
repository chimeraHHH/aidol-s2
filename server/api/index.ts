/**
 * Vercel Serverless 入口：导出 Express app。
 * 动态 import 便于启动失败时返回可读错误，而不是 FUNCTION_INVOCATION_FAILED。
 */
let app: any

try {
  const mod = await import('../src/createApp.js')
  app = mod.createApp()
} catch (err) {
  const message = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
  console.error('[api/index] createApp failed:', message)
  app = (_req: any, res: any) => {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: 'bootstrap_failed',
        detail: message.slice(0, 2000),
      }),
    )
  }
}

export default app
