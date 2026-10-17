import type { PersonaId } from '@/domain/types'
import { seedCompanionWelcome } from '@/features/home/companionChatCache'
import { createServices } from '@/services/createServices'
import {
  createAccountStandalone,
  findAccountByPhone,
  switchAccountStandalone,
  type UserAccount,
} from '@/features/settings/useUserAccount'
import { patchAccountDisplayName } from './patchAccountName'
import { resetWorkspaceForNewAccount } from './resetNewAccountDefaults'

const ONBOARD_KEY = 'xiaomi.onboarding.v1'
const ANSWERS_KEY = 'xiaomi.onboardingAnswers.v1'

export type OnboardingAnswers = {
  catName: string
  breed: string
  birthday: string
  personaId: PersonaId
  /** 希望猫怎么叫用户 */
  callUserAs: string
  /** 注册页填写的用户昵称 */
  ownerNickname?: string
}

const PERSONA_LABEL: Record<PersonaId, string> = {
  gentle: '温柔陪聊',
  sassy: '傲娇吐槽',
  cool: '冷静管家',
}

function readDoneMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ONBOARD_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function isOnboardingDone(userId: string): boolean {
  return Boolean(readDoneMap()[userId])
}

export function markOnboardingDone(userId: string): void {
  const map = readDoneMap()
  map[userId] = true
  localStorage.setItem(ONBOARD_KEY, JSON.stringify(map))
}

function saveAnswers(userId: string, answers: OnboardingAnswers): void {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, OnboardingAnswers>) : {}
    map[userId] = answers
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getOnboardingAnswers(userId: string): OnboardingAnswers | null {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, OnboardingAnswers>
    return map[userId] ?? null
  } catch {
    return null
  }
}

/** 与 seed 对齐的默认陪伴数值（人设/问候由问答覆盖） */
const SEED_COMPANION_DEFAULTS = {
  mood: 'curious' as const,
  energy: 78,
  level: 1,
  streakDays: 0,
  bond: 60,
}

export async function applyOnboardingAnswers(
  userId: string,
  answers: OnboardingAnswers,
): Promise<void> {
  // 先切到目标账号，再只重置该账号工作区，避免写进其他用户
  switchAccountStandalone(userId)
  resetWorkspaceForNewAccount(userId)

  const services = createServices()
  const callAs = answers.callUserAs.trim() || answers.ownerNickname?.trim() || '铲屎官'
  const ownerNick = answers.ownerNickname?.trim() || callAs
  const catName = answers.catName.trim() || '咪酱'
  const breed = answers.breed.trim() || '英短蓝猫'
  const birthday = answers.birthday || '2024-03-12'
  const personaId = answers.personaId || 'gentle'

  const normalized: OnboardingAnswers = {
    catName,
    breed,
    birthday,
    personaId,
    callUserAs: callAs,
    ownerNickname: ownerNick,
  }

  await services.cat.updateProfile({
    name: catName,
    breed,
    birthday,
    avatarTone: 'cream',
  })
  await services.cat.updateCompanion({
    ...SEED_COMPANION_DEFAULTS,
    personaId,
    greeting: `窝里暖暖的，${callAs}回来啦。`,
  })

  // App「我的」昵称 = 注册昵称；callAs = 问答里「怎么称呼你」→ Agent / 欢迎语
  patchAccountDisplayName(userId, ownerNick, callAs)
  saveAnswers(userId, normalized)
  markOnboardingDone(userId)

  // 陪伴页欢迎语 / Agent 上下文用的称呼与人设
  seedCompanionWelcome(userId, { catName, callUserAs: callAs, personaId })

  // 便于调试与后续扩展
  window.dispatchEvent(
    new CustomEvent('xm:onboarding-applied', {
      detail: { userId, answers: normalized, personaLabel: PERSONA_LABEL[personaId] },
    }),
  )
}

export function ensureAccountForRegister(input: {
  displayName: string
  phone: string
}): UserAccount {
  const existing = findAccountByPhone(input.phone)
  if (existing) {
    switchAccountStandalone(existing.userId)
    return existing
  }
  return createAccountStandalone({
    displayName: input.displayName.trim() || `铲屎官${input.phone.slice(-4)}`,
    phone: input.phone,
  })
}
