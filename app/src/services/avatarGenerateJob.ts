import { generateCatAvatar } from '@/services/api/avatarApi'
import type { CustomCatAvatar } from '@/features/settings/useCustomCatAvatar'
import { getActiveUserId, writeAvatarForUser } from '@/features/auth/accountWorkspace'

export type AvatarJobStatus = 'idle' | 'running' | 'success' | 'error'

export type AvatarJobState = {
  status: AvatarJobStatus
  /** 本地预览（object URL 或已生成图） */
  previewUrl: string | null
  tip: string | null
  error: string | null
  startedAt: number | null
  /** 递增，便于 UI 强制刷新 */
  version: number
}

const JOB_EVENT = 'xm:avatar-job-changed'

let state: AvatarJobState = {
  status: 'idle',
  previewUrl: null,
  tip: null,
  error: null,
  startedAt: null,
  version: 0,
}

/** 进行中的 Promise，切页不取消 */
let inflight: Promise<void> | null = null
let previewObjectUrl: string | null = null

function emit() {
  state = { ...state, version: state.version + 1 }
  window.dispatchEvent(new CustomEvent(JOB_EVENT, { detail: state }))
}

function setState(patch: Partial<AvatarJobState>) {
  state = { ...state, ...patch }
  emit()
}

function persistAvatar(userId: string, next: CustomCatAvatar) {
  writeAvatarForUser(userId, next)
}

function revokePreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
}

export function getAvatarJobState(): AvatarJobState {
  return state
}

export function subscribeAvatarJob(listener: (s: AvatarJobState) => void): () => void {
  const handler = () => listener(getAvatarJobState())
  window.addEventListener(JOB_EVENT, handler)
  return () => window.removeEventListener(JOB_EVENT, handler)
}

export function isAvatarJobRunning(): boolean {
  return state.status === 'running' || inflight != null
}

/**
 * 启动后台生成。已有任务在跑时忽略新请求（避免重复扣费）。
 * 与 React 生命周期无关：切 Tab / 卸载页面不会中断 fetch。
 */
export function startAvatarGenerateJob(file: File): boolean {
  if (inflight) return false

  // 绑定启动时的账号，避免生成过程中切号写到别人名下
  const ownerId = getActiveUserId()

  revokePreview()
  previewObjectUrl = URL.createObjectURL(file)

  setState({
    status: 'running',
    previewUrl: previewObjectUrl,
    tip: '正在后台生成场景（静帧 → 视频 → 循环），可自由切换页面…',
    error: null,
    startedAt: Date.now(),
  })

  inflight = (async () => {
    try {
      const result = await generateCatAvatar(file)
      if (!result.imageUrl) throw new Error('未返回合成图地址')

      const saved: CustomCatAvatar = {
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        cutoutUrl: result.cutoutUrl,
        appliedAt: new Date().toISOString(),
        provider: result.provider,
        mock: result.mock,
      }
      persistAvatar(ownerId, saved)

      setState({
        status: 'success',
        previewUrl: result.imageUrl,
        tip: result.tip || '已生成并应用到陪伴 / 首页 / 健康 / 我的',
        error: null,
      })

      // 成功提示保留一段时间后收起条，不影响 avatar 数据
      window.setTimeout(() => {
        if (state.status === 'success') {
          setState({ tip: null, status: 'idle' })
        }
      }, 6000)
    } catch (e) {
      setState({
        status: 'error',
        tip: null,
        error: e instanceof Error ? e.message : '生成失败',
      })
    } finally {
      inflight = null
      revokePreview()
      if (state.status === 'running') {
        setState({ status: 'idle' })
      }
    }
  })()

  return true
}

export function clearAvatarGenerateError() {
  if (state.status === 'error') {
    setState({ status: 'idle', error: null })
  }
}

export function dismissAvatarJobTip() {
  setState({ tip: null, error: null, status: state.status === 'running' ? 'running' : 'idle' })
}

/** 恢复默认形象时一并清掉任务提示 */
export function resetAvatarJobUi() {
  revokePreview()
  setState({
    status: 'idle',
    previewUrl: null,
    tip: null,
    error: null,
    startedAt: null,
  })
}
