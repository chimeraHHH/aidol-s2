import { useCallback, useEffect, useMemo, useState } from 'react'
import { clearCompanionChatCache } from '@/features/home/companionChatCache'
import { purgeAccountLocalData } from '@/features/auth/purgeAccountData'
import { resetWorkspaceForNewAccount } from '@/features/auth/resetNewAccountDefaults'

const KEY = 'xiaomi.userAccounts.v2'
const LEGACY_KEY = 'xiaomi.userAccount.v1'

export type UserAccount = {
  userId: string
  displayName: string
  /** 希望猫猫称呼用户的名字（登录问答）；缺省回退 displayName */
  callAs?: string
  /** 完整手机号，界面展示时脱敏 */
  phone: string
  email: string
  /** 推送与提醒 */
  notifyPush: boolean
  notifyWeigh: boolean
  /** 差值优先 / 本地隐私 —— 与偏好开关同步 */
  deltaFirst: boolean
  localPrivacy: boolean
}

type AccountStore = {
  activeId: string
  accounts: UserAccount[]
}

export const DEFAULT_USER_ACCOUNT: UserAccount = {
  userId: '08645',
  displayName: '铲屎官小鱼',
  phone: '13800108645',
  email: '',
  notifyPush: true,
  notifyWeigh: true,
  deltaFirst: true,
  localPrivacy: true,
}

/** 演示用可切换账号 */
export const DEMO_ACCOUNTS: UserAccount[] = [
  DEFAULT_USER_ACCOUNT,
  {
    userId: '10288',
    displayName: '团团家长',
    phone: '15900010288',
    email: 'tuantuan@example.com',
    notifyPush: true,
    notifyWeigh: false,
    deltaFirst: true,
    localPrivacy: true,
  },
  {
    userId: '22017',
    displayName: '灰灰的管家',
    phone: '18600022017',
    email: '',
    notifyPush: false,
    notifyWeigh: true,
    deltaFirst: false,
    localPrivacy: true,
  },
]

function seedStore(seed?: UserAccount): AccountStore {
  const accounts = DEMO_ACCOUNTS.map((a) => ({ ...a }))
  if (seed) {
    const idx = accounts.findIndex((a) => a.userId === seed.userId)
    if (idx >= 0) accounts[idx] = { ...accounts[idx], ...seed }
    else accounts.unshift({ ...DEFAULT_USER_ACCOUNT, ...seed })
  }
  return {
    activeId: seed?.userId ?? DEFAULT_USER_ACCOUNT.userId,
    accounts,
  }
}

function readLegacy(): UserAccount | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    return { ...DEFAULT_USER_ACCOUNT, ...(JSON.parse(raw) as Partial<UserAccount>) }
  } catch {
    return null
  }
}

function readStore(): AccountStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AccountStore>
      // 允许空列表（删光账号后）；勿自动回种演示账号
      const accounts = Array.isArray(parsed.accounts)
        ? parsed.accounts.map((a) => ({ ...DEFAULT_USER_ACCOUNT, ...a }))
        : seedStore().accounts
      const activeId =
        typeof parsed.activeId === 'string' && accounts.some((a) => a.userId === parsed.activeId)
          ? parsed.activeId
          : accounts[0]?.userId ?? ''
      return { activeId, accounts }
    }
  } catch {
    /* fall through */
  }
  const legacy = readLegacy()
  const store = seedStore(legacy ?? undefined)
  writeStore(store)
  if (legacy) localStorage.removeItem(LEGACY_KEY)
  return store
}

function writeStore(store: AccountStore) {
  localStorage.setItem(KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('xm:user-account-changed'))
}

function nextUserId(accounts: UserAccount[]): string {
  const used = new Set(accounts.map((a) => a.userId))
  for (let i = 0; i < 80; i++) {
    const id = String(30000 + Math.floor(Math.random() * 60000))
    if (!used.has(id)) return id
  }
  let n = 90000
  while (used.has(String(n))) n += 1
  return String(n)
}

/** 供登录页等非 hook 场景使用 */
export function findAccountByPhone(phone: string): UserAccount | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return readStore().accounts.find((a) => a.phone.replace(/\D/g, '') === digits) ?? null
}

export function switchAccountStandalone(userId: string): void {
  const current = readStore()
  if (!current.accounts.some((a) => a.userId === userId)) return
  writeStore({ ...current, activeId: userId })
}

export function createAccountStandalone(input: {
  displayName: string
  phone?: string
  email?: string
}): UserAccount {
  const displayName = input.displayName.trim()
  if (!displayName) throw new Error('请填写昵称')
  const phone = (input.phone || '').replace(/\D/g, '').slice(0, 11)
  if (phone && phone.length !== 11) throw new Error('手机号需为 11 位')

  const current = readStore()
  const existing = phone ? findAccountByPhone(phone) : null
  if (existing) return existing

  const userId = nextUserId(current.accounts)
  const created: UserAccount = {
    ...DEFAULT_USER_ACCOUNT,
    userId,
    displayName,
    phone,
    email: (input.email || '').trim(),
    notifyPush: true,
    notifyWeigh: true,
    deltaFirst: true,
    localPrivacy: true,
  }
  // 新建账号：仅该账号默认背景/档案，不继承、不覆盖其他账号
  resetWorkspaceForNewAccount(userId)
  clearCompanionChatCache(userId)
  writeStore({
    activeId: userId,
    accounts: [...current.accounts, created],
  })
  return created
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone || '未绑定'
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`
}

export function formatUserLabel(account: UserAccount): string {
  return `用户${account.userId}`
}

export function useUserAccount() {
  const [store, setStore] = useState<AccountStore>(() => readStore())

  useEffect(() => {
    const sync = () => setStore(readStore())
    window.addEventListener('storage', sync)
    window.addEventListener('xm:user-account-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('xm:user-account-changed', sync)
    }
  }, [])

  const account = useMemo(() => {
    return (
      store.accounts.find((a) => a.userId === store.activeId) ??
      store.accounts[0] ??
      DEFAULT_USER_ACCOUNT
    )
  }, [store])

  const accounts = store.accounts

  const patch = useCallback((partial: Partial<UserAccount>) => {
    const current = readStore()
    const nextAccounts = current.accounts.map((a) =>
      a.userId === current.activeId ? { ...a, ...partial, userId: a.userId } : a,
    )
    const next = { ...current, accounts: nextAccounts }
    writeStore(next)
    setStore(next)
  }, [])

  const switchAccount = useCallback((userId: string) => {
    const current = readStore()
    if (!current.accounts.some((a) => a.userId === userId)) return
    const next = { ...current, activeId: userId }
    writeStore(next)
    setStore(next)
  }, [])

  const createAccount = useCallback(
    (input: { displayName: string; phone?: string; email?: string }) => {
      const created = createAccountStandalone(input)
      setStore(readStore())
      return created
    },
    [],
  )

  /**
   * 删除账号。
   * @returns `{ emptied: true }` 表示已无账号，调用方应退出登录
   */
  const removeAccount = useCallback((userId: string): { emptied: boolean; switchedTo?: string } => {
    const current = readStore()
    if (!current.accounts.some((a) => a.userId === userId)) {
      return { emptied: current.accounts.length === 0 }
    }

    purgeAccountLocalData(userId)
    const accounts = current.accounts.filter((a) => a.userId !== userId)

    if (accounts.length === 0) {
      const empty: AccountStore = { activeId: '', accounts: [] }
      writeStore(empty)
      setStore(empty)
      return { emptied: true }
    }

    const switched =
      current.activeId === userId ? accounts[0]!.userId : current.activeId
    const next = { activeId: switched, accounts }
    writeStore(next)
    setStore(next)
    return { emptied: false, switchedTo: switched }
  }, [])

  const reset = useCallback(() => {
    const next = seedStore()
    writeStore(next)
    setStore(next)
  }, [])

  return {
    account,
    accounts,
    activeId: store.activeId,
    patch,
    switchAccount,
    createAccount,
    removeAccount,
    reset,
  }
}
