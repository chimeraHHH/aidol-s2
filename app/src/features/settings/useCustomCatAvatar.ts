import { useCallback, useEffect, useState } from 'react'
import {
  getActiveUserId,
  readAvatarForUser,
  writeAvatarForUser,
} from '@/features/auth/accountWorkspace'
import { mediaUrl } from '@/shared/lib/apiBase'

export type CustomCatAvatar = {
  /** 家居全景静帧 / 陪伴 poster（猫坐垫上） */
  imageUrl: string
  /** 无缝循环陪伴背景视频（优先） */
  videoUrl?: string
  /** 透明抠图猫层：首页 hero */
  cutoutUrl?: string
  appliedAt: string
  provider?: string
  mock?: boolean
}

/** 展示时把 /generated/... 接到当前 API 域名（本地代理或 VITE_API_BASE） */
function withMediaHost(a: CustomCatAvatar | null): CustomCatAvatar | null {
  if (!a) return null
  return {
    ...a,
    imageUrl: mediaUrl(a.imageUrl) || a.imageUrl,
    videoUrl: a.videoUrl ? mediaUrl(a.videoUrl) : undefined,
    cutoutUrl: a.cutoutUrl ? mediaUrl(a.cutoutUrl) : undefined,
  }
}

function read(): CustomCatAvatar | null {
  return withMediaHost(readAvatarForUser(getActiveUserId()))
}

function write(value: CustomCatAvatar | null) {
  writeAvatarForUser(getActiveUserId(), value)
}

export function getCustomCatAvatar(): CustomCatAvatar | null {
  return read()
}

const DEFAULT_CAT_FACE = '/images/paimomo/cat-avatar.jpg'
const DEFAULT_CUTOUT = '/images/companion-cat-layer.png?v=7'

/** 圆头像：优先抠图，其次全景 */
export function getCatFaceUrl(fallback = DEFAULT_CAT_FACE): string {
  const a = read()
  return a?.cutoutUrl || a?.imageUrl || fallback
}

/** 首页悬浮猫：必须透明抠图层 */
export function getCatCutoutUrl(fallback = DEFAULT_CUTOUT): string {
  return read()?.cutoutUrl || fallback
}

export function useCustomCatAvatar() {
  const [avatar, setAvatar] = useState<CustomCatAvatar | null>(() => read())

  useEffect(() => {
    const sync = () => setAvatar(read())
    window.addEventListener('storage', sync)
    window.addEventListener('xm:cat-avatar-changed', sync)
    window.addEventListener('xm:user-account-changed', sync)
    window.addEventListener('xm:workspace-migrated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('xm:cat-avatar-changed', sync)
      window.removeEventListener('xm:user-account-changed', sync)
      window.removeEventListener('xm:workspace-migrated', sync)
    }
  }, [])

  const save = useCallback((next: CustomCatAvatar) => {
    write(next)
    setAvatar(next)
  }, [])

  const clear = useCallback(() => {
    write(null)
    setAvatar(null)
  }, [])

  return { avatar, save, clear }
}
