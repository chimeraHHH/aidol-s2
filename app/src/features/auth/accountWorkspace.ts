import {
  SEED_COMPANION,
  SEED_MEASUREMENTS,
  SEED_PROFILE,
} from '@/services/mock/seed'
import type { CatProfile, CompanionState, Measurement } from '@/domain/types'

/** 与 fixedQiuqiuAccount 对齐，避免循环依赖 */
const FIXED_QIUQIU_USER_ID = '33801'

/** 与 settings/useCustomCatAvatar 对齐，避免循环依赖 */
export type WorkspaceCatAvatar = {
  imageUrl: string
  videoUrl?: string
  cutoutUrl?: string
  appliedAt: string
  provider?: string
  mock?: boolean
}

const ACCOUNTS_KEY = 'xiaomi.userAccounts.v2'
const CAT_BY_USER_KEY = 'xiaomi.cat.store.byUser.v1'
const AVATAR_BY_USER_KEY = 'xiaomi.customCatAvatar.byUser.v1'
const LEGACY_CAT_KEY = 'xiaomi.cat.store.v3'
const LEGACY_AVATAR_KEYS = [
  'xiaomi.customCatAvatar.v3',
  'xiaomi.customCatAvatar.v2',
  'xiaomi.customCatAvatar.v1',
] as const
/** v2：强制再跑一次迁移，把非 Daisy 账号打回默认 */
const MIGRATED_FLAG = 'xiaomi.workspace.byUser.v2.migrated'

export type CatStoreShape = {
  profile: CatProfile
  companion: CompanionState
  measurements: Measurement[]
}

type CatByUser = Record<string, CatStoreShape>
type AvatarByUser = Record<string, WorkspaceCatAvatar>

function seedCatStore(): CatStoreShape {
  return {
    profile: { ...SEED_PROFILE },
    companion: { ...SEED_COMPANION },
    measurements: [...SEED_MEASUREMENTS],
  }
}

function readAccountsRaw(): { activeId: string; accounts: Array<{ userId: string; displayName?: string; callAs?: string }> } {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return { activeId: '', accounts: [] }
    const parsed = JSON.parse(raw) as {
      activeId?: string
      accounts?: Array<{ userId?: string; displayName?: string; callAs?: string }>
    }
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts
          .filter((a) => typeof a?.userId === 'string' && a.userId)
          .map((a) => ({
            userId: a.userId!,
            displayName: a.displayName,
            callAs: a.callAs,
          }))
      : []
    const activeId =
      typeof parsed.activeId === 'string' && accounts.some((a) => a.userId === parsed.activeId)
        ? parsed.activeId
        : accounts[0]?.userId ?? ''
    return { activeId, accounts }
  } catch {
    return { activeId: '', accounts: [] }
  }
}

/** 当前活跃账号；无账号时回退演示默认 id，避免读写崩溃 */
export function getActiveUserId(): string {
  const { activeId } = readAccountsRaw()
  return activeId || '08645'
}

function isDaisyAccount(name?: string, callAs?: string): boolean {
  const blob = `${name || ''} ${callAs || ''}`.trim()
  return /daisy/i.test(blob)
}

export function findDaisyUserId(): string | null {
  const { accounts } = readAccountsRaw()
  const hit = accounts.find((a) => isDaisyAccount(a.displayName, a.callAs))
  return hit?.userId ?? null
}

function readCatMap(): CatByUser {
  try {
    const raw = localStorage.getItem(CAT_BY_USER_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CatByUser
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCatMap(map: CatByUser) {
  localStorage.setItem(CAT_BY_USER_KEY, JSON.stringify(map))
}

function readAvatarMap(): AvatarByUser {
  try {
    const raw = localStorage.getItem(AVATAR_BY_USER_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as AvatarByUser
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAvatarMap(map: AvatarByUser) {
  localStorage.setItem(AVATAR_BY_USER_KEY, JSON.stringify(map))
}

function readLegacyCat(): CatStoreShape | null {
  try {
    const raw = localStorage.getItem(LEGACY_CAT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CatStoreShape
  } catch {
    return null
  }
}

function readLegacyAvatar(): WorkspaceCatAvatar | null {
  for (const key of LEGACY_AVATAR_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      return JSON.parse(raw) as WorkspaceCatAvatar
    } catch {
      /* try next */
    }
  }
  return null
}

function clearLegacyGlobals() {
  try {
    localStorage.removeItem(LEGACY_CAT_KEY)
    for (const key of LEGACY_AVATAR_KEYS) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * 一次性迁移：全局猫咪档案 / 形象 → 按账号分桶。
 * Daisy 账号保留原全局数据；其余账号写入默认种子。
 * 若尚无 Daisy，则把全局数据归到当前 activeId，其余仍重置为默认。
 */
export function ensureWorkspaceMigrated(): void {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(MIGRATED_FLAG) === '1') return

  const { activeId, accounts } = readAccountsRaw()
  const daisyId = findDaisyUserId()
  const keepId = daisyId || activeId

  const legacyCat = readLegacyCat()
  const legacyAvatar = readLegacyAvatar()
  const existingCat = readCatMap()
  const existingAvatar = readAvatarMap()

  const nextCat: CatByUser = { ...existingCat }
  const nextAvatar: AvatarByUser = { ...existingAvatar }

  const ids = new Set<string>([
    ...accounts.map((a) => a.userId),
    ...Object.keys(existingCat),
    ...Object.keys(existingAvatar),
  ])
  if (keepId) ids.add(keepId)

  for (const id of ids) {
    const preserve = Boolean(keepId && id === keepId)
    if (preserve && legacyCat) {
      nextCat[id] = legacyCat
    } else if (!nextCat[id] || !preserve) {
      // 非保留账号：强制默认；保留账号若无 legacy 则保留已有分桶或种子
      if (!preserve) nextCat[id] = seedCatStore()
      else if (!nextCat[id]) nextCat[id] = seedCatStore()
    }

    if (preserve && legacyAvatar) {
      nextAvatar[id] = legacyAvatar
    } else if (!preserve) {
      delete nextAvatar[id]
    }
  }

  writeCatMap(nextCat)
  writeAvatarMap(nextAvatar)
  clearLegacyGlobals()
  localStorage.setItem(MIGRATED_FLAG, '1')
  window.dispatchEvent(new CustomEvent('xm:cat-avatar-changed'))
  window.dispatchEvent(new CustomEvent('xm:workspace-migrated'))
}

/** 将除 Daisy 外所有已知账号的工作区重置为默认（可重复调用） */
export function resetNonDaisyAccountsToDefaults(): void {
  ensureWorkspaceMigrated()
  const daisyId = findDaisyUserId()
  const { activeId, accounts } = readAccountsRaw()
  const catMap = readCatMap()
  const avatarMap = readAvatarMap()

  for (const a of accounts) {
    if (daisyId && a.userId === daisyId) continue
    if (a.userId === FIXED_QIUQIU_USER_ID) continue
    // 无 Daisy 时：不要清掉当前正在用的、刚从全局迁过来的那份
    if (!daisyId && a.userId === activeId) continue
    catMap[a.userId] = seedCatStore()
    delete avatarMap[a.userId]
  }

  writeCatMap(catMap)
  writeAvatarMap(avatarMap)
  window.dispatchEvent(new CustomEvent('xm:cat-avatar-changed'))
}

export function readCatStoreForUser(userId: string): CatStoreShape {
  ensureWorkspaceMigrated()
  const map = readCatMap()
  if (!map[userId]) {
    map[userId] = seedCatStore()
    writeCatMap(map)
  }
  return {
    profile: { ...map[userId].profile },
    companion: { ...map[userId].companion },
    measurements: [...map[userId].measurements],
  }
}

export function writeCatStoreForUser(userId: string, store: CatStoreShape): void {
  ensureWorkspaceMigrated()
  const map = readCatMap()
  map[userId] = {
    profile: { ...store.profile },
    companion: { ...store.companion },
    measurements: [...store.measurements],
  }
  writeCatMap(map)
}

export function readAvatarForUser(userId: string): WorkspaceCatAvatar | null {
  ensureWorkspaceMigrated()
  const map = readAvatarMap()
  return map[userId] ? { ...map[userId] } : null
}

export function writeAvatarForUser(userId: string, value: WorkspaceCatAvatar | null): void {
  ensureWorkspaceMigrated()
  const map = readAvatarMap()
  if (!value) delete map[userId]
  else map[userId] = value
  writeAvatarMap(map)
  window.dispatchEvent(new CustomEvent('xm:cat-avatar-changed'))
}

export function resetUserWorkspaceToDefaults(userId: string): void {
  if (userId === FIXED_QIUQIU_USER_ID) return
  ensureWorkspaceMigrated()
  const catMap = readCatMap()
  catMap[userId] = seedCatStore()
  writeCatMap(catMap)
  writeAvatarForUser(userId, null)
}

export function purgeUserWorkspace(userId: string): void {
  if (userId === FIXED_QIUQIU_USER_ID) return
  ensureWorkspaceMigrated()
  const catMap = readCatMap()
  delete catMap[userId]
  writeCatMap(catMap)
  writeAvatarForUser(userId, null)
}
