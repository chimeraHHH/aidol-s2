import { hasChatKey } from '../config.js'
import { ArkChatModel } from '../providers/chat.js'
import type { ChatMessage } from '../providers/types.js'
import { loadAgentDocs, renderUserDoc, type RuntimeProfile } from './loadAgentDocs.js'
import { retrieveKnowledge, type KbRetrieval } from './kbRetriever.js'
import {
  formatPersonaBlock,
  formatPersonaHardLock,
  resolvePersonaVoice,
} from './personaVoice.js'
import {
  appendNote,
  appendTurn,
  formatMemoryForPrompt,
  loadMemory,
} from './memoryStore.js'

export type CompanionChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type CompanionAgentInput = {
  userId: string
  message: string
  /** 前端传来的近期气泡（不含 system） */
  history?: CompanionChatMessage[]
  profile?: RuntimeProfile
  temperature?: number
}

export type CompanionAgentResult = {
  reply: string
  mood: 'calm' | 'curious' | 'sleepy' | 'playful' | 'hungry'
  reaction: 'listen' | 'nuzzle' | 'stretch' | 'blink' | 'purr'
  memoryNote: string
  model: string
  provider: string
  mock: boolean
  /** RAG 命中的知识条目 */
  knowledgeEntryIds?: string[]
  kbVersion?: string
}

const MOODS = new Set(['calm', 'curious', 'sleepy', 'playful', 'hungry'])
const REACTIONS = new Set(['listen', 'nuzzle', 'stretch', 'blink', 'purr'])

const chatModel = new ArkChatModel()

function buildSystemPrompt(
  profile: RuntimeProfile,
  userId: string,
  kb: KbRetrieval,
): string {
  const docs = loadAgentDocs()
  const userDoc = renderUserDoc(docs['USER.md'], profile)
  const memory = loadMemory(userId)
  const memoryDoc = formatMemoryForPrompt(memory)

  const persona = resolvePersonaVoice(profile.personaId)
  const personaBlock = formatPersonaBlock(profile.personaId, profile.catName)
  const callAs = profile.ownerCallAs || profile.ownerName || '你'
  const catName = profile.catName?.trim() || '咪酱'
  // 覆盖静态 IDENTITY，避免模型仍自称「小咪」
  const identityLive = [
    '# IDENTITY.md - Who Am I?（运行时）',
    `- **Name:** ${catName}`,
    `- **Creature:** 猫咪健康管理 Agent · 数字分身（垫子上的陪伴体）`,
    `- **Persona:** ${persona.label}（${persona.id}）— ${persona.summary}`,
    `- **Vibe:** 完全服从上方 Persona，不使用默认暖萌腔`,
    `- **对主人称呼:** ${callAs}`,
    '',
    `对外自称「${catName}」或「我」。禁止自称小咪，除非猫名就是小咪。`,
  ].join('\n')

  return [
    docs['AGENTS.md'],
    '',
    docs['SOUL.md'],
    '',
    identityLive,
    '',
    personaBlock,
    '',
    userDoc,
    '',
    memoryDoc,
    '',
    kb.promptBlock,
    '',
    '---',
    '现在开始陪伴对话。严格按 AGENTS.md 的 Output Contract 输出 JSON。',
    `硬性规则：你叫「${catName}」，称呼主人为「${callAs}」。禁止说「我是小咪」（除非猫名就是小咪）。`,
    formatPersonaHardLock(profile.personaId),
    '健康相关问题必须依据上方 Knowledge (RAG) 条目与安全规则，禁止编造品种固定胖瘦标准或诊断疾病。',
  ].join('\n')
}

function parseAgentJson(raw: string): CompanionAgentResult | null {
  const trimmed = raw.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fence?.[1]?.trim() || trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
    const reply = String(obj.reply ?? '').trim()
    if (!reply) return null
    const moodRaw = String(obj.mood ?? 'curious')
    const reactionRaw = String(obj.reaction ?? 'listen')
    const ids = Array.isArray(obj.knowledgeEntryIds)
      ? obj.knowledgeEntryIds.map((x) => String(x))
      : undefined
    return {
      reply,
      mood: (MOODS.has(moodRaw) ? moodRaw : 'curious') as CompanionAgentResult['mood'],
      reaction: (REACTIONS.has(reactionRaw)
        ? reactionRaw
        : 'listen') as CompanionAgentResult['reaction'],
      memoryNote: String(obj.memoryNote ?? '').trim(),
      knowledgeEntryIds: ids,
      model: '',
      provider: '',
      mock: false,
    }
  } catch {
    return null
  }
}

function fallbackFromPlainText(
  text: string,
  mock: boolean,
  model: string,
  provider: string,
): CompanionAgentResult {
  return {
    reply: text.trim() || '喵……我在听呢，你再说一遍好不好？',
    mood: 'curious',
    reaction: 'listen',
    memoryNote: '',
    model,
    provider,
    mock,
  }
}

function localMockReply(
  message: string,
  profile: RuntimeProfile,
  kb: KbRetrieval,
): CompanionAgentResult {
  const name = profile.catName || '咪酱'
  const owner = profile.ownerCallAs || profile.ownerName || '你'
  const persona = resolvePersonaVoice(profile.personaId)
  const kg = profile.latestWeightKg
  const lower = message.toLowerCase()
  const top = kb.hits[0]
  const pid = persona.id

  const byPersona = (gentle: string, sassy: string, cool: string) =>
    pid === 'sassy' ? sassy : pid === 'cool' ? cool : gentle

  let reply = byPersona(
    `呼噜……${owner}，我在垫子上听着呢。慢慢说。`,
    `${owner}？说话。我听着——别以为我会先软。`,
    `${owner}。在线。直接说需求。`,
  )
  let mood: CompanionAgentResult['mood'] = 'curious'
  let reaction: CompanionAgentResult['reaction'] = 'listen'
  let memoryNote = ''

  if (/累|难过|不开心|烦|压力|焦虑/.test(message)) {
    mood = 'sleepy'
    reaction = 'nuzzle'
    reply = byPersona(
      kg != null
        ? `那先摸摸我的头吧。体重 ${kg.toFixed(2)} kg 我帮你记着，此刻更重要的是你歇一会儿。`
        : `那先摸摸我的头吧。外面怎样都好，你回来我就在。`,
      kg != null
        ? `哼，别硬撑。体重 ${kg.toFixed(2)} kg 我记着——你先歇，才不是心疼。`
        : `行了别硬撑。回来就对了……我才没担心你。`,
      kg != null
        ? `建议先休息。体重 ${kg.toFixed(2)} kg 已记录；情绪优先于复盘。`
        : `建议先休息。需要复盘时再同步数据。`,
    )
    memoryNote = '主人今天情绪有点低落，需要对应人设的陪伴'
  } else if (top && /体重|称重|胖|瘦|BCS|体况|绝育|减肥|品种|英短|布偶|正常吗|健康|体脂|喂|干粮|老年|老猫/i.test(message)) {
    mood = 'calm'
    reaction = 'blink'
    const fact = kb.profileFacts.find((f) => f.includes('当前稳定体重')) || ''
    const core = top.answerCore.slice(0, 70)
    const trail = fact ? ` ${fact}。` : ''
    reply = byPersona(
      `${owner}，我翻了健康小册子（${top.id}）：${core}${trail}这只是趋势参考，不能替代兽医哦。`,
      `${owner}，听好了（${top.id}）：${core}${trail}别自己吓自己，要看就看趋势。`,
      `结论（${top.id}）：${core}${trail}仅供趋势参考，非诊断。`,
    )
  } else if (/玩|逗|球|嗨/.test(message)) {
    mood = 'playful'
    reaction = 'stretch'
    reply = byPersona(
      `要玩吗？尾巴已经准备好了——不过先喝口水，再闹腾五分钟就好。`,
      `想玩？行啊。别指望我会先求你——五分钟，到点收工。`,
      `可以短时互动。建议先补水，再玩不超过五分钟。`,
    )
  } else if (/饿|吃|粮|罐头/.test(message)) {
    mood = 'hungry'
    reaction = 'purr'
    reply = byPersona(
      `肚子在抗议吗？看看食盆，少量多餐比一次堆满更舒服。`,
      `又喊饿？食盆自己看——少喂几口，别惯坏我……也别惯坏你。`,
      `建议检查食盆。原则：少量多餐，避免一次堆满。`,
    )
  } else if (/睡|困|晚安|休息/.test(message)) {
    mood = 'sleepy'
    reaction = 'purr'
    reply = byPersona(
      `嗯……垫子好暖。你也早点歇，我守着窝。`,
      `困了就睡。我趴着——才不是陪你守夜。`,
      `收到。建议尽快休息。我保持待命。`,
    )
  } else if (/你好|嗨|在吗|小咪/.test(message) || lower.includes('hi')) {
    mood = 'playful'
    reaction = 'nuzzle'
    reply = byPersona(
      `在的在的。我是${name}。想晒太阳、撒娇，还是听你讲今天的事？`,
      `${owner}来了？我是${name}。有事快说——称重打卡了没？`,
      `${owner}。我是${name}。可查体重趋势，或简述事项。`,
    )
  }

  return {
    reply,
    mood,
    reaction,
    memoryNote,
    model: 'local-mock',
    provider: 'mock',
    mock: true,
    knowledgeEntryIds: kb.hits.map((h) => h.id),
    kbVersion: kb.version,
  }
}

export async function runCompanionAgent(input: CompanionAgentInput): Promise<CompanionAgentResult> {
  const userId = input.userId?.trim() || 'default'
  const message = input.message.trim()
  if (!message) throw new Error('message 不能为空')

  const profile = input.profile ?? {}
  const kb = retrieveKnowledge(message, profile, 3)

  let out: CompanionAgentResult

  if (!hasChatKey()) {
    out = localMockReply(message, profile, kb)
  } else {
    const system = buildSystemPrompt(profile, userId, kb)
    const history = (input.history ?? [])
      .filter((m) => m.content?.trim())
      .slice(-12)
      .map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content.trim(),
      }))

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: message },
    ]

    const result = await chatModel.chat({
      messages,
      temperature: input.temperature ?? 0.75,
    })

    const mock = result.provider === 'mock'
    const parsed = parseAgentJson(result.text)
    out = parsed
      ? {
          ...parsed,
          model: result.model,
          provider: result.provider,
          mock,
        }
      : fallbackFromPlainText(result.text, mock, result.model, result.provider)

    // 模型未回传条目时，附上本次检索命中
    if (!out.knowledgeEntryIds?.length) {
      out.knowledgeEntryIds = kb.hits.map((h) => h.id)
    }
    out.kbVersion = kb.version
  }

  appendTurn(userId, { role: 'user', content: message, at: new Date().toISOString() })
  appendTurn(userId, {
    role: 'assistant',
    content: out.reply,
    at: new Date().toISOString(),
  })
  if (out.memoryNote) {
    appendNote(userId, out.memoryNote, 'chat')
  }

  return out
}
