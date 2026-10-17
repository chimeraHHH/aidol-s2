import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppData } from '@/app/providers/AppDataProvider'
import { getOnboardingAnswers } from '@/features/auth/applyOnboarding'
import { useUserAccount } from '@/features/settings/useUserAccount'
import { buildHealthSnapshot } from '@/features/trends/healthMock'
import { SIM_ANALYSIS, SIM_IDEAL } from '@/features/trends/data/kittenSim'
import {
  chatWithCompanion,
  type CompanionHistoryItem,
} from '@/services/api/companionApi'
import type { CompanionMood, PersonaId } from '@/domain/types'
import {
  buildPersonalizedWelcome,
  readCompanionChatCache,
  syncWelcomeWithProfile,
  writeCompanionChatCache,
  type ChatBubble,
} from './companionChatCache'

const PERSONA_IDS = new Set<PersonaId>(['gentle', 'sassy', 'cool'])

function resolvePersonaId(
  companionPersona: string | undefined,
  userId: string,
): PersonaId {
  if (companionPersona && PERSONA_IDS.has(companionPersona as PersonaId)) {
    return companionPersona as PersonaId
  }
  const fromOnboard = getOnboardingAnswers(userId)?.personaId
  if (fromOnboard && PERSONA_IDS.has(fromOnboard)) return fromOnboard
  return 'gentle'
}

export type { ChatBubble }

function weekDeltaFromMeasurements(
  weights: { lockedAt: string; weightKg: number }[],
): number | null {
  if (weights.length < 2) return null
  const sorted = [...weights].sort((a, b) => a.lockedAt.localeCompare(b.lockedAt))
  const latest = sorted[sorted.length - 1]!
  const latestMs = Date.parse(latest.lockedAt)
  const weekAgo = latestMs - 7 * 24 * 60 * 60 * 1000
  let baseline = sorted[0]!
  for (const m of sorted) {
    if (Date.parse(m.lockedAt) <= weekAgo) baseline = m
  }
  if (baseline.lockedAt === latest.lockedAt) {
    return sorted.length >= 2
      ? Number((latest.weightKg - sorted[sorted.length - 2]!.weightKg).toFixed(2))
      : null
  }
  return Number((latest.weightKg - baseline.weightKg).toFixed(2))
}

function toHistory(msgs: ChatBubble[]): CompanionHistoryItem[] {
  return msgs
    .filter((m) => !m.pending && m.id !== 'm0')
    .slice(-12)
    .map((m) => ({
      role: m.role === 'cat' ? 'assistant' : 'user',
      content: m.text,
    }))
}

export function useCompanionChat() {
  const { profile, companion, measurements, setCompanion } = useAppData()
  const { account } = useUserAccount()
  const userId = account.userId

  const catName = profile?.name?.trim() || '咪酱'
  const callAs = account.callAs?.trim() || account.displayName || '你'
  const personaId = resolvePersonaId(companion?.personaId, userId)

  const initialWelcome = buildPersonalizedWelcome({
    catName,
    callUserAs: callAs,
    personaId,
  })
  const initial = readCompanionChatCache(userId, initialWelcome)
  const [msgs, setMsgs] = useState<ChatBubble[]>(initial.msgs)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastReaction, setLastReaction] = useState<string | null>(initial.lastReaction)

  // 账号切换 / 建档后：用档案猫名同步欢迎语（修「我是小咪」）
  useEffect(() => {
    const welcome = buildPersonalizedWelcome({
      catName,
      callUserAs: callAs,
      personaId,
    })
    const cached = readCompanionChatCache(userId, welcome)
    const synced = syncWelcomeWithProfile(userId, {
      catName,
      callUserAs: callAs,
      personaId,
    })
    setMsgs(synced ?? cached.msgs)
    setLastReaction(cached.lastReaction)
    setSending(false)
    setError(null)
  }, [userId, catName, callAs, personaId])

  useEffect(() => {
    writeCompanionChatCache(userId, { msgs, lastReaction })
  }, [userId, msgs, lastReaction])

  const healthProfile = useMemo(() => {
    const latestKg = measurements[0]?.weightKg ?? SIM_ANALYSIS.latest.weightKg
    const weekDelta =
      weekDeltaFromMeasurements(measurements) ?? SIM_ANALYSIS.stats.weekDeltaKg
    const snap = buildHealthSnapshot({
      name: profile?.name ?? SIM_ANALYSIS.catName,
      latestKg,
      weekDelta,
      energy: companion?.energy ?? 78,
      mood: companion?.mood ?? 'curious',
    })
    const personaLabel =
      personaId === 'sassy' ? '傲娇吐槽' : personaId === 'cool' ? '冷静管家' : '温柔陪聊'
    return {
      ownerName: account.displayName,
      ownerCallAs: callAs,
      catName,
      breed: profile?.breed,
      birthday: profile?.birthday,
      personaId,
      personaLabel,
      mood: companion?.mood,
      energy: companion?.energy,
      bond: companion?.bond,
      streakDays: companion?.streakDays,
      latestWeightKg: latestKg,
      weekDeltaKg: weekDelta,
      idealMinKg: snap.idealRange.min ?? SIM_IDEAL.min,
      idealMaxKg: snap.idealRange.max ?? SIM_IDEAL.max,
      healthInsight: snap.insight,
      lifestyleLines: snap.lifestyle.map(
        (m) => `${m.label} ${m.value}${m.unit}（${m.hint}）`,
      ),
    }
  }, [account.displayName, callAs, catName, companion, measurements, personaId, profile])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      const userMsg: ChatBubble = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
      }
      const pendingId = `c-pending-${Date.now()}`

      let history: CompanionHistoryItem[] = []
      setMsgs((prev) => {
        history = toHistory(prev)
        const next = [
          ...prev,
          userMsg,
          { id: pendingId, role: 'cat' as const, text: '呼噜……在想', pending: true },
        ]
        writeCompanionChatCache(userId, { msgs: next })
        return next
      })
      setSending(true)
      setError(null)

      try {
        const result = await chatWithCompanion({
          userId,
          message: trimmed,
          history,
          profile: healthProfile,
        })

        setMsgs((prev) => {
          const next = prev.map((m) =>
            m.id === pendingId
              ? {
                  id: `c-${Date.now()}`,
                  role: 'cat' as const,
                  text: result.reply!,
                  tts: true,
                  reaction: result.reaction,
                }
              : m,
          )
          writeCompanionChatCache(userId, {
            msgs: next,
            lastReaction: result.reaction ?? null,
          })
          return next
        })
        setLastReaction(result.reaction ?? null)

        if (result.mood) {
          void setCompanion({ mood: result.mood as CompanionMood })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '对话失败'
        setError(message)
        setMsgs((prev) => {
          const next = prev.map((m) =>
            m.id === pendingId
              ? {
                  id: `c-err-${Date.now()}`,
                  role: 'cat' as const,
                  text: '喵……信号有点糊，你再发一次好不好？',
                  tts: true,
                }
              : m,
          )
          writeCompanionChatCache(userId, { msgs: next })
          return next
        })
      } finally {
        setSending(false)
      }
    },
    [healthProfile, sending, setCompanion, userId],
  )

  return {
    msgs,
    sending,
    error,
    lastReaction,
    send,
  }
}
