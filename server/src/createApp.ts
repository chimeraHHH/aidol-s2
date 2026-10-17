import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import { config } from './config.js'
import { avatarRouter } from './routes/avatar.js'
import { companionRouter } from './routes/companion.js'
import { healthRouter } from './routes/health.js'
import { llmRouter } from './routes/llm.js'

export function createApp() {
  for (const dir of [config.uploadsDir, config.generatedDir]) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch (err) {
      console.warn('[createApp] mkdir failed:', dir, err instanceof Error ? err.message : err)
    }
  }

  const app = express()
  const allowedOrigins = config.corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  app.use(
    cors({
      origin(origin, callback) {
        // 无 Origin（同源 / curl）或显式 * → 放行
        if (!origin || allowedOrigins.includes('*')) {
          callback(null, true)
          return
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        // 本地 Vite / 常见 Vercel 预览与生产域名
        try {
          const host = new URL(origin).hostname
          if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host.endsWith('.vercel.app')
          ) {
            callback(null, true)
            return
          }
        } catch {
          /* ignore */
        }
        callback(new Error(`CORS blocked: ${origin}`))
      },
    }),
  )
  app.use(express.json({ limit: '16mb' }))

  app.use('/generated', express.static(config.generatedDir))
  app.use('/uploads', express.static(config.uploadsDir))

  app.use('/api', healthRouter)
  app.use('/api/llm', llmRouter)
  app.use('/api/companion', companionRouter)
  app.use('/api/avatar', avatarRouter)

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'server error'
    res.status(500).json({ ok: false, error: message })
  })

  return app
}
