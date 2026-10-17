import { Router } from 'express'
import { z } from 'zod'
import { ArkChatModel } from '../providers/chat.js'
import { SeedanceVideoGenerator } from '../providers/seedance.js'

export const llmRouter = Router()
const chat = new ArkChatModel()
const seedance = new SeedanceVideoGenerator()

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1),
  temperature: z.number().min(0).max(2).optional(),
})

/** POST /api/llm/chat —— 对话大模型预留 */
llmRouter.post('/chat', async (req, res) => {
  try {
    const body = chatSchema.parse(req.body)
    const result = await chat.chat(body)
    res.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chat failed'
    res.status(400).json({ ok: false, error: message })
  }
})

/** POST /api/llm/video —— Seedance 视频预留 */
llmRouter.post('/video', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    if (!prompt) {
      res.status(400).json({ ok: false, error: 'prompt 必填' })
      return
    }
    const result = await seedance.generate({
      prompt,
      imageDataUrl: req.body?.imageDataUrl,
      duration: req.body?.duration,
    })
    res.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'video failed'
    res.status(400).json({ ok: false, error: message })
  }
})
