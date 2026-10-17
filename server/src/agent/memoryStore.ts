import fs from 'node:fs'
import path from 'node:path'
import { memoryRootDir } from './paths.js'

export type MemoryEntry = {
  id: string
  at: string
  text: string
  source: 'chat' | 'system'
}

export type SessionTurn = {
  role: 'user' | 'assistant'
  content: string
  at: string
}

export type UserMemory = {
  userId: string
  updatedAt: string
  /** 跨会话长期记忆（从 memoryNote 累积） */
  notes: MemoryEntry[]
  /** 近期对话摘要（服务端滚动维护） */
  recentSummary: string
  /** 最近若干轮原文，供拼进上下文 */
  recentTurns: SessionTurn[]
}

const MAX_NOTES = 40
const MAX_TURNS = 24

function safeUserId(userId: string): string {
  const cleaned = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return cleaned || 'default'
}

function filePath(userId: string): string {
  return path.join(memoryRootDir, `${safeUserId(userId)}.json`)
}

function emptyMemory(userId: string): UserMemory {
  return {
    userId: safeUserId(userId),
    updatedAt: new Date().toISOString(),
    notes: [],
    recentSummary: '',
    recentTurns: [],
  }
}

export function loadMemory(userId: string): UserMemory {
  fs.mkdirSync(memoryRootDir, { recursive: true })
  const fp = filePath(userId)
  if (!fs.existsSync(fp)) return emptyMemory(userId)
  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8')) as Partial<UserMemory>
    return {
      ...emptyMemory(userId),
      ...raw,
      userId: safeUserId(userId),
      notes: Array.isArray(raw.notes) ? raw.notes : [],
      recentTurns: Array.isArray(raw.recentTurns) ? raw.recentTurns : [],
      recentSummary: typeof raw.recentSummary === 'string' ? raw.recentSummary : '',
    }
  } catch {
    return emptyMemory(userId)
  }
}

export function saveMemory(mem: UserMemory): void {
  fs.mkdirSync(memoryRootDir, { recursive: true })
  const next = {
    ...mem,
    userId: safeUserId(mem.userId),
    updatedAt: new Date().toISOString(),
    notes: mem.notes.slice(-MAX_NOTES),
    recentTurns: mem.recentTurns.slice(-MAX_TURNS),
  }
  fs.writeFileSync(filePath(next.userId), JSON.stringify(next, null, 2), 'utf8')
}

export function appendNote(userId: string, text: string, source: MemoryEntry['source'] = 'chat'): UserMemory {
  const trimmed = text.trim()
  const mem = loadMemory(userId)
  if (!trimmed) return mem
  // 去重：相同文本不重复记
  if (mem.notes.some((n) => n.text === trimmed)) return mem
  mem.notes.push({
    id: `n-${Date.now()}`,
    at: new Date().toISOString(),
    text: trimmed,
    source,
  })
  saveMemory(mem)
  return mem
}

export function appendTurn(
  userId: string,
  turn: SessionTurn,
): UserMemory {
  const mem = loadMemory(userId)
  mem.recentTurns.push(turn)
  // 简易摘要：拼最近用户侧要点
  const userBits = mem.recentTurns
    .filter((t) => t.role === 'user')
    .slice(-6)
    .map((t) => t.content.slice(0, 40))
  mem.recentSummary = userBits.length ? `近期主人提到：${userBits.join(' / ')}` : mem.recentSummary
  saveMemory(mem)
  return mem
}

export function formatMemoryForPrompt(mem: UserMemory): string {
  const notes =
    mem.notes.length === 0
      ? '（暂无长期记忆）'
      : mem.notes
          .slice(-16)
          .map((n) => `- ${n.text}`)
          .join('\n')
  const summary = mem.recentSummary || '（暂无摘要）'
  return `# Memory\n\n## 长期记忆\n${notes}\n\n## 近期摘要\n${summary}\n`
}
