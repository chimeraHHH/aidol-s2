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

export async function chatWithCompanion(input: {
  userId: string
  message: string
  history?: CompanionHistoryItem[]
  profile?: CompanionChatProfile
}): Promise<CompanionChatResponse> {
  const res = await fetch('/api/companion/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data = (await res.json()) as CompanionChatResponse
  if (!res.ok || !data.ok || !data.reply) {
    throw new Error(data.error || `对话失败（HTTP ${res.status}）`)
  }
  return data
}
