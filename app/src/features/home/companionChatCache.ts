import type { PersonaId } from '@/domain/types'

export type ChatBubble = {
  id: string
  role: 'cat' | 'user'
  text: string
  tts?: boolean
  reaction?: string
  pending?: boolean
}

const STORAGE_KEY = 'xiaomi.companionChat.v1'

type ChatCache = {
  msgs: ChatBubble[]
  lastReaction: string | null
}

const memory = new Map<string, ChatCache>()

export function buildPersonalizedWelcome(input: {
  catName: string
  callUserAs: string
  personaId: PersonaId
}): ChatBubble {
  const cat = input.catName.trim() || '咪酱'
  const you = input.callUserAs.trim() || '你'
  let text = `Hi，${you}。我是${cat}，在窝里等你啦。想晒太阳、撒娇，还是听你讲今天的事？`
  if (input.personaId === 'sassy') {
    text = `${you}来了？我是${cat}。称重打卡了没——有事快说，别以为我会先软。`
  } else if (input.personaId === 'cool') {
    text = `${you}。我是${cat}。可查体重趋势，或简述今天事项。`
  }
  return { id: 'm0', role: 'cat', text, tts: true }
}

function readAll(): Record<string, ChatCache> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ChatCache>
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, ChatCache>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function loadUser(userId: string): ChatCache | null {
  if (memory.has(userId)) return memory.get(userId)!
  const all = readAll()
  const cached = all[userId]
  if (!cached) return null
  memory.set(userId, cached)
  return cached
}

function persistUser(userId: string, cache: ChatCache) {
  memory.set(userId, cache)
  const all = readAll()
  all[userId] = cache
  writeAll(all)
}

/** 首条欢迎语自称是否与档案猫名不一致 */
function welcomeClaimsWrongName(text: string, catName: string): boolean {
  const cat = catName.trim()
  if (!cat) return false
  if (text.includes(`我是${cat}`)) return false
  // 旧默认名 / 任意「我是某某」与档案不符
  if (/我是小咪|我是咪酱/.test(text)) return true
  const claimed = text.match(/我是([^\s，。,、！!？?]+)/)
  if (claimed?.[1] && claimed[1] !== cat && claimed[1].length <= 12) return true
  return false
}

/** 欢迎语是否仍是默认「小咪」或与当前猫名/人设不符 */
export function welcomeNeedsSync(
  msgs: ChatBubble[],
  catName: string,
  expectedWelcomeText?: string,
): boolean {
  if (msgs.length === 0) return true
  const first = msgs.find((m) => m.id === 'm0') ?? msgs[0]
  if (!first || first.role !== 'cat') return false
  const onlyWelcome = msgs.length === 1 && (first.id === 'm0' || first.role === 'cat')
  if (welcomeClaimsWrongName(first.text, catName)) return true
  // 仅欢迎语：猫名或人设文案与档案不一致时重写
  if (onlyWelcome) {
    if (expectedWelcomeText && first.text !== expectedWelcomeText) return true
    if (!first.text.includes(`我是${catName.trim()}`)) return true
  }
  return false
}

export function readCompanionChatCache(
  userId: string,
  fallbackWelcome?: ChatBubble,
): ChatCache {
  const cached = loadUser(userId)
  const welcome = fallbackWelcome ?? buildPersonalizedWelcome({
    catName: '咪酱',
    callUserAs: '你',
    personaId: 'gentle',
  })
  if (!cached) return { msgs: [welcome], lastReaction: null }
  const msgs = cached.msgs.filter((m) => !m.pending)
  return {
    msgs: msgs.length > 0 ? msgs : [welcome],
    lastReaction: cached.lastReaction,
  }
}

export function writeCompanionChatCache(
  userId: string,
  patch: Partial<ChatCache> & { msgs?: ChatBubble[] },
): void {
  const prev = readCompanionChatCache(userId)
  persistUser(userId, {
    msgs: patch.msgs ?? prev.msgs,
    lastReaction:
      patch.lastReaction !== undefined ? patch.lastReaction : prev.lastReaction,
  })
}

export function clearCompanionChatCache(userId: string): void {
  memory.delete(userId)
  const all = readAll()
  delete all[userId]
  writeAll(all)
}

/** 建档后写入个性化欢迎语（内存 + localStorage） */
export function seedCompanionWelcome(
  userId: string,
  input: { catName: string; callUserAs: string; personaId: PersonaId },
): void {
  persistUser(userId, {
    msgs: [buildPersonalizedWelcome(input)],
    lastReaction: null,
  })
}

/** 用档案修正欢迎语（保留其余聊天）。无需修改时返回 null */
export function syncWelcomeWithProfile(
  userId: string,
  input: { catName: string; callUserAs: string; personaId: PersonaId },
): ChatBubble[] | null {
  const welcome = buildPersonalizedWelcome(input)
  const prev = readCompanionChatCache(userId, welcome)
  if (!welcomeNeedsSync(prev.msgs, input.catName, welcome.text)) return null

  let msgs = prev.msgs
  if (msgs.length === 0) {
    msgs = [welcome]
  } else {
    const idx = msgs.findIndex((m) => m.id === 'm0')
    if (idx >= 0) {
      if (msgs[idx]!.text === welcome.text) return null
      msgs = msgs.map((m, i) => (i === idx ? welcome : m))
    } else if (msgs.length === 1 && msgs[0]!.role === 'cat') {
      // 旧缓存无 m0：整段替换为档案欢迎语
      msgs = [welcome]
    } else {
      msgs = [welcome, ...msgs]
    }
  }
  persistUser(userId, { msgs, lastReaction: prev.lastReaction })
  return msgs
}
