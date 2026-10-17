export type CompanionChatRole = 'user' | 'assistant'

export type CompanionHistoryItem = {
  role: CompanionChatRole
  content: string
}

export type CompanionChatProfile = {
  ownerName?: string
  ownerCallAs?: string
  catName?: string
  breed?: string
  birthday?: string
  personaId?: string
  personaLabel?: string
  mood?: string
  energy?: number
  bond?: number
  streakDays?: number
  latestWeightKg?: number | null
  weekDeltaKg?: number | null
  idealMinKg?: number
  idealMaxKg?: number
  healthInsight?: string
  lifestyleLines?: string[]
}

export type CompanionChatResponse = {
  ok: boolean
  reply?: string
  mood?: 'calm' | 'curious' | 'sleepy' | 'playful' | 'hungry'
  reaction?: 'listen' | 'nuzzle' | 'stretch' | 'blink' | 'purr'
  memoryNote?: string
  model?: string
  provider?: string
  mock?: boolean
  error?: string
}

import { apiUrl, getApiBase } from '@/shared/lib/apiBase'
import { scopedUserId } from '@/shared/lib/deviceId'

export async function chatWithCompanion(input: {
  userId: string
  message: string
  history?: CompanionHistoryItem[]
  profile?: CompanionChatProfile
}): Promise<CompanionChatResponse> {
  let res: Response
  try {
    res = await fetch(apiUrl('/api/companion/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        // 公网多用户：按「本机设备 + 账号」隔离服务端 Memory
        userId: scopedUserId(input.userId),
      }),
    })
  } catch {
    const base = getApiBase()
    throw new Error(
      base
        ? `连不上陪伴 API（${base}）。请确认后端已启动且 CORS 允许当前站点。`
        : '连不上陪伴 API。本地请启动 server（8787）；上线请配置 VITE_API_BASE 指向后端。',
    )
  }

  let data: CompanionChatResponse
  try {
    data = (await res.json()) as CompanionChatResponse
  } catch {
    throw new Error(
      `陪伴接口返回异常（HTTP ${res.status}）。多为未配置后端，请求打到了静态站。`,
    )
  }
  if (!res.ok || !data.ok || !data.reply) {
    throw new Error(data.error || `对话失败（HTTP ${res.status}）`)
  }
  return data
}
