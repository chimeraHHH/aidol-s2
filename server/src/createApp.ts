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
    fs.mkdirSync(dir, { recursive: true })
  }

  const app = express()
  app.use(
    cors({
      origin: config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
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
