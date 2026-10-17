import { Router } from 'express'
import { z } from 'zod'
import { runCompanionAgent } from '../agent/companionAgent.js'
import { retrieveKnowledge } from '../agent/kbRetriever.js'
import { loadMemory } from '../agent/memoryStore.js'

export const companionRouter = Router()

const profileSchema = z
  .object({
    ownerName: z.string().optional(),
    ownerCallAs: z.string().optional(),
    catName: z.string().optional(),
    breed: z.string().optional(),
    birthday: z.string().optional(),
    personaId: z.string().optional(),
    personaLabel: z.string().optional(),
    mood: z.string().optional(),
    energy: z.number().optional(),
    bond: z.number().optional(),
    streakDays: z.number().optional(),
    latestWeightKg: z.number().nullable().optional(),
    weekDeltaKg: z.number().nullable().optional(),
    idealMinKg: z.number().optional(),
    idealMaxKg: z.number().optional(),
    healthInsight: z.string().optional(),
    lifestyleLines: z.array(z.string()).optional(),
  })
  .optional()

const chatSchema = z.object({
  userId: z.string().min(1).max(64).default('default'),
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(40)
    .optional(),
  profile: profileSchema,
  temperature: z.number().min(0).max(2).optional(),
})

/** POST /api/companion/chat —— 小猫健康 Agent 对话 */
companionRouter.post('/chat', async (req, res) => {
  try {
    const body = chatSchema.parse(req.body)
    const result = await runCompanionAgent(body)
    res.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'companion chat failed'
    res.status(400).json({ ok: false, error: message })
  }
})

/** GET /api/companion/memory?userId= — 查看当前 Memory（调试用） */
companionRouter.get('/memory', (req, res) => {
  const userId = String(req.query.userId || 'default')
  const mem = loadMemory(userId)
  res.json({ ok: true, memory: mem })
})

/** GET /api/companion/kb/search?q= — 调试知识库检索 */
companionRouter.get('/kb/search', (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) {
    res.status(400).json({ ok: false, error: 'q 必填' })
    return
  }
  const breed = req.query.breed ? String(req.query.breed) : undefined
  const birthday = req.query.birthday ? String(req.query.birthday) : undefined
  const latestWeightKg = req.query.weight != null ? Number(req.query.weight) : undefined
  const result = retrieveKnowledge(
    q,
    {
      breed,
      birthday,
      latestWeightKg: Number.isFinite(latestWeightKg) ? latestWeightKg : null,
      catName: '咪酱',
    },
    5,
  )
  res.json({
    ok: true,
    version: result.version,
    hits: result.hits,
    profileFacts: result.profileFacts,
  })
})
