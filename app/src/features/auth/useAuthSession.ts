import { useCallback, useEffect, useState } from 'react'

const KEY = 'xiaomi.authSession.v1'

type AuthSession = {
  loggedIn: boolean
  /** 最近一次登录手机号（展示用） */
  lastPhone?: string
}

function readSession(): AuthSession {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // 兼容旧用户：未写过会话时视为已登录
      return { loggedIn: true }
    }
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    return {
      loggedIn: Boolean(parsed.loggedIn),
      lastPhone: typeof parsed.lastPhone === 'string' ? parsed.lastPhone : undefined,
    }
  } catch {
    return { loggedIn: true }
  }
}

function writeSession(session: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(session))
  window.dispatchEvent(new CustomEvent('xm:auth-changed'))
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession>(() => readSession())

  useEffect(() => {
    const sync = () => setSession(readSession())
    window.addEventListener('storage', sync)
    window.addEventListener('xm:auth-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('xm:auth-changed', sync)
    }
  }, [])

  const login = useCallback((phone?: string) => {
    const next: AuthSession = {
      loggedIn: true,
      lastPhone: phone?.replace(/\D/g, '').slice(0, 11) || session.lastPhone,
    }
    writeSession(next)
    setSession(next)
  }, [session.lastPhone])

  const logout = useCallback(() => {
    const next: AuthSession = {
      loggedIn: false,
      lastPhone: session.lastPhone,
    }
    writeSession(next)
    setSession(next)
  }, [session.lastPhone])

  return {
    isLoggedIn: session.loggedIn,
    lastPhone: session.lastPhone,
    login,
    logout,
  }
}
