import { Router } from 'express'
import { config, hasArkKey, hasChatKey, hasDrawKey, hasImageProvider } from '../config.js'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'xiaomi-server',
    drawConfigured: hasDrawKey(),
    arkConfigured: hasArkKey(),
    chatConfigured: hasChatKey(),
    drawBaseUrl: config.drawBaseUrl,
    chatBaseUrl: config.chatBaseUrl,
    models: {
      drawImage: config.drawImageModel,
      drawVideo: config.drawVideoModel,
      seedream: config.seedreamModel,
      seedance: config.seedanceModel,
      chat: config.chatModel,
    },
    mockAvatar: !hasImageProvider() && config.allowMockAvatar,
  })
})
