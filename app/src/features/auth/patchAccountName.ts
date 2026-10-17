import type { UserAccount } from '@/features/settings/useUserAccount'

const KEY = 'xiaomi.userAccounts.v2'

type AccountStore = {
  activeId: string
  accounts: UserAccount[]
}

export function patchAccountDisplayName(
  userId: string,
  displayName: string,
  callAs?: string,
): void {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const store = JSON.parse(raw) as AccountStore
    const name = displayName.trim()
    const call = (callAs ?? displayName).trim()
    if (!name && !call) return
    store.accounts = store.accounts.map((a) =>
      a.userId === userId
        ? {
            ...a,
            displayName: name || a.displayName,
            callAs: call || a.callAs || name || a.displayName,
          }
        : a,
    )
    localStorage.setItem(KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent('xm:user-account-changed'))
  } catch {
    /* ignore */
  }
}
