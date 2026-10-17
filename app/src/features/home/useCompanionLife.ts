import { useCallback, useEffect, useRef, useState } from 'react'

export type CatMood = 'idle' | 'sleep' | 'eat'

export type CompanionLife = {
  mood: CatMood
  blinking: boolean
  earTwitch: boolean
  micro: 'none' | 'yawn' | 'lick'
  look: { x: number; y: number }
  setLook: (x: number, y: number) => void
  resetLook: () => void
  feed: () => void
  putToSleep: () => void
  wake: () => void
  pet: () => void
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function isNightHour(h = new Date().getHours()) {
  return h >= 23 || h < 6
}

export function useCompanionLife(): CompanionLife {
  const [mood, setMood] = useState<CatMood>(() => (isNightHour() ? 'sleep' : 'idle'))
  const [blinking, setBlinking] = useState(false)
  const [earTwitch, setEarTwitch] = useState(false)
  const [micro, setMicro] = useState<'none' | 'yawn' | 'lick'>('none')
  const [look, setLookState] = useState({ x: 0, y: 0 })
  const moodRef = useRef(mood)
  const eatTimer = useRef<number | null>(null)
  const microTimer = useRef<number | null>(null)

  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  const clearEat = () => {
    if (eatTimer.current != null) {
      window.clearTimeout(eatTimer.current)
      eatTimer.current = null
    }
  }

  const feed = useCallback(() => {
    if (moodRef.current === 'eat') return
    clearEat()
    setMood('eat')
    setMicro('none')
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(12)
    }
    eatTimer.current = window.setTimeout(() => {
      setMood(isNightHour() ? 'sleep' : 'idle')
      eatTimer.current = null
    }, 4200)
  }, [])

  const putToSleep = useCallback(() => {
    clearEat()
    setMood('sleep')
    setMicro('none')
  }, [])

  const wake = useCallback(() => {
    clearEat()
    setMood('idle')
    setMicro('none')
  }, [])

  const pet = useCallback(() => {
    if (moodRef.current === 'sleep') {
      setMood('idle')
      return
    }
    if (moodRef.current === 'eat') return
    setEarTwitch(true)
    window.setTimeout(() => setEarTwitch(false), 320)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8)
    }
  }, [])

  const setLook = useCallback((x: number, y: number) => {
    setLookState({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    })
  }, [])

  const resetLook = useCallback(() => setLookState({ x: 0, y: 0 }), [])

  // 随机眨眼：2~5s，闭眼 ~0.15s；睡觉时不闪
  useEffect(() => {
    let cancelled = false
    let timer = 0

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return
        if (moodRef.current !== 'sleep') {
          setBlinking(true)
          window.setTimeout(() => {
            if (!cancelled) setBlinking(false)
          }, 150)
        }
        schedule()
      }, rand(2000, 5000))
    }

    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  // 偶发耳朵抖
  useEffect(() => {
    let cancelled = false
    let timer = 0

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return
        if (moodRef.current === 'idle') {
          setEarTwitch(true)
          window.setTimeout(() => {
            if (!cancelled) setEarTwitch(false)
          }, 280)
        }
        schedule()
      }, rand(8000, 16000))
    }

    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  // 每 20~40s 哈欠 / 舔爪（仅 idle）
  useEffect(() => {
    let cancelled = false
    let timer = 0

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return
        if (moodRef.current === 'idle') {
          const kind = Math.random() > 0.45 ? 'yawn' : 'lick'
          setMicro(kind)
          if (microTimer.current != null) window.clearTimeout(microTimer.current)
          microTimer.current = window.setTimeout(() => {
            if (!cancelled) setMicro('none')
          }, kind === 'yawn' ? 1600 : 1200)
        }
        schedule()
      }, rand(20000, 40000))
    }

    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (microTimer.current != null) window.clearTimeout(microTimer.current)
    }
  }, [])

  // 晚上 23 点后自动睡觉；白天从睡觉切回（用户手动叫醒除外，这里只自动进睡）
  useEffect(() => {
    const tick = () => {
      if (isNightHour() && moodRef.current === 'idle') {
        setMood('sleep')
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => () => clearEat(), [])

  return {
    mood,
    blinking,
    earTwitch,
    micro,
    look,
    setLook,
    resetLook,
    feed,
    putToSleep,
    wake,
    pet,
  }
}
