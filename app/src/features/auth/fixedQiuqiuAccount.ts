/**
 * 固定演示账号：小林 × 秋秋
 * 形象素材来自本机成功生成流水线，落在 public/images/fixed/qiuqiu/
 */
import type { Measurement, PersonaId } from '@/domain/types'
import {
  readCompanionChatCache,
  seedCompanionWelcome,
  welcomeNeedsSync,
  buildPersonalizedWelcome,
} from '@/features/home/companionChatCache'
import { SEED_MEASUREMENTS } from '@/services/mock/seed'
import type { UserAccount } from '@/features/settings/useUserAccount'
import {
  readAvatarForUser,
  readCatStoreForUser,
  writeAvatarForUser,
  writeCatStoreForUser,
  type WorkspaceCatAvatar,
} from './accountWorkspace'

/** 秋秋演示用「今日体重」 */
const TODAY_WEIGHT_KG = 4.5

/** 保证秋秋最新一条称重为今日 4.5 kg（newest first） */
function withQiuqiuTodayWeight(base: Measurement[]): Measurement[] {
  const source = (base.length > 0 ? base : SEED_MEASUREMENTS).map((m) => ({ ...m }))
  const day = new Date().toISOString().slice(0, 10)
  const rest = source
    .filter((m) => !m.lockedAt.startsWith(day) && m.sessionId !== `qiuqiu-${day}`)
    .sort((a, b) => b.lockedAt.localeCompare(a.lockedAt))
  const prevKg = rest[0]?.weightKg ?? 4.45
  const today: Measurement = {
    sessionId: `qiuqiu-${day}`,
    weightKg: TODAY_WEIGHT_KG,
    deltaKg: Number((TODAY_WEIGHT_KG - prevKg).toFixed(2)),
    lockedAt: `${day}T10:00:00.000Z`,
    source: 'mock',
  }
  return [today, ...rest]
}

export const FIXED_QIUQIU_USER_ID = '33801'

export const FIXED_QIUQIU_ACCOUNT: UserAccount = {
  userId: FIXED_QIUQIU_USER_ID,
  displayName: '小林',
  callAs: '小林',
  phone: '13800033801',
  email: '',
  notifyPush: true,
  notifyWeigh: true,
  deltaFirst: true,
  localPrivacy: true,
}

const CAT_NAME = '秋秋'
const BREED = '中华田园猫'
const BIRTHDAY = '2024-05-18'
const PERSONA_ID: PersonaId = 'gentle'
const CALL_AS = '小林'

/** v3：用户 3D 秋秋主图 → 家居静帧 + 身份锁定循环（不用漂色的 Seedance） */
const ASSET_VER = 'v3'
const STILL = `/images/fixed/qiuqiu/scene-still.jpg?${ASSET_VER}`
const CUTOUT = `/images/fixed/qiuqiu/cutout.png?${ASSET_VER}`
const LOOP = `/images/fixed/qiuqiu/scene-loop.mp4?${ASSET_VER}`

const ONBOARD_KEY = 'xiaomi.onboarding.v1'
const ANSWERS_KEY = 'xiaomi.onboardingAnswers.v1'
const ACCOUNTS_KEY = 'xiaomi.userAccounts.v2'

export function isFixedQiuqiuUserId(userId: string | null | undefined): boolean {
  return userId === FIXED_QIUQIU_USER_ID
}

function markOnboardingDone(userId: string) {
  try {
    const raw = localStorage.getItem(ONBOARD_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    map[userId] = true
    localStorage.setItem(ONBOARD_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function saveOnboardingAnswers(userId: string) {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    map[userId] = {
      catName: CAT_NAME,
      breed: BREED,
      birthday: BIRTHDAY,
      personaId: PERSONA_ID,
      callUserAs: CALL_AS,
      ownerNickname: '小林',
    }
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function ensureAccountInStore() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    const store = raw
      ? (JSON.parse(raw) as {
          activeId?: string
          accounts?: UserAccount[]
        })
      : { activeId: FIXED_QIUQIU_USER_ID, accounts: [] as UserAccount[] }
    const accounts = Array.isArray(store.accounts) ? [...store.accounts] : []
    const idx = accounts.findIndex((a) => a.userId === FIXED_QIUQIU_USER_ID)
    const nextAcc: UserAccount = { ...FIXED_QIUQIU_ACCOUNT }
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        ...nextAcc,
        // 保留用户可能改过的通知开关
        notifyPush: accounts[idx]!.notifyPush,
        notifyWeigh: accounts[idx]!.notifyWeigh,
        deltaFirst: accounts[idx]!.deltaFirst,
        localPrivacy: accounts[idx]!.localPrivacy,
        displayName: '小林',
        callAs: accounts[idx]!.callAs?.trim() || CALL_AS,
      }
    } else {
      accounts.unshift(nextAcc)
    }
    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify({
        activeId: store.activeId || FIXED_QIUQIU_USER_ID,
        accounts,
      }),
    )
  } catch {
    /* ignore */
  }
}

function seedCatWorkspace() {
  const existing = readCatStoreForUser(FIXED_QIUQIU_USER_ID)
  const already =
    existing.profile.name === CAT_NAME && existing.companion.personaId === PERSONA_ID
  writeCatStoreForUser(FIXED_QIUQIU_USER_ID, {
    profile: {
      ...existing.profile,
      id: 'cat-qiuqiu',
      name: CAT_NAME,
      breed: BREED,
      birthday: BIRTHDAY,
      avatarTone: 'cream',
    },
    companion: {
      ...existing.companion,
      personaId: PERSONA_ID,
      greeting: `窝里暖暖的，${CALL_AS}回来啦。`,
      mood: existing.companion.mood || 'curious',
      energy: existing.companion.energy || 78,
      level: existing.companion.level || 1,
      streakDays: existing.companion.streakDays || 3,
      bond: existing.companion.bond || 72,
    },
    // 固定账号始终带一份可演示的称重曲线，并锁定今日体重 4.5 kg
    measurements: withQiuqiuTodayWeight(
      existing.measurements?.length > 0 ? existing.measurements : [...SEED_MEASUREMENTS],
    ),
  })
  return !already
}

function seedAvatar() {
  const avatar: WorkspaceCatAvatar = {
    imageUrl: STILL,
    videoUrl: LOOP,
    cutoutUrl: CUTOUT,
    appliedAt: new Date().toISOString(),
    provider: 'fixed-qiuqiu',
    mock: false,
  }
  const prev = readAvatarForUser(FIXED_QIUQIU_USER_ID)
  // 路径含版本号；不一致则强制覆写，避免本地仍用旧形象
  if (
    prev?.imageUrl === STILL &&
    prev?.videoUrl === LOOP &&
    prev?.cutoutUrl === CUTOUT
  ) {
    return false
  }
  writeAvatarForUser(FIXED_QIUQIU_USER_ID, avatar)
  return true
}

/**
 * 启动时确保「小林 / 秋秋」固定账号存在，并写入档案、形象、欢迎语。
 * 可重复调用；不会覆盖其他账号。
 */
export function ensureFixedQiuqiuAccount(): void {
  if (typeof localStorage === 'undefined') return
  ensureAccountInStore()
  seedCatWorkspace()
  seedAvatar()
  markOnboardingDone(FIXED_QIUQIU_USER_ID)
  saveOnboardingAnswers(FIXED_QIUQIU_USER_ID)
  const welcome = buildPersonalizedWelcome({
    catName: CAT_NAME,
    callUserAs: CALL_AS,
    personaId: PERSONA_ID,
  })
  const chat = readCompanionChatCache(FIXED_QIUQIU_USER_ID, welcome)
  if (welcomeNeedsSync(chat.msgs, CAT_NAME, welcome.text)) {
    seedCompanionWelcome(FIXED_QIUQIU_USER_ID, {
      catName: CAT_NAME,
      callUserAs: CALL_AS,
      personaId: PERSONA_ID,
    })
  }
  window.dispatchEvent(new CustomEvent('xm:user-account-changed'))
  window.dispatchEvent(new CustomEvent('xm:cat-avatar-changed'))
}
