import { generateCatAvatar } from '@/services/api/avatarApi'
import type { CustomCatAvatar } from '@/features/settings/useCustomCatAvatar'
import { getActiveUserId, writeAvatarForUser } from '@/features/auth/accountWorkspace'

export type AvatarJobStatus = 'idle' | 'running' | 'success' | 'error'

export type AvatarJobState = {
  /** 该任务所属账号；便于 UI 判断是否属于当前用户 */
  userId: string | null
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

type MutableJob = {
  status: AvatarJobStatus
  previewUrl: string | null
  tip: string | null
  error: string | null
  startedAt: number | null
  version: number
  previewObjectUrl: string | null
  inflight: Promise<void> | null
}

const idleJob = (): MutableJob => ({
  status: 'idle',
  previewUrl: null,
  tip: null,
  error: null,
  startedAt: null,
  version: 0,
  previewObjectUrl: null,
  inflight: null,
})

/** 按账号隔离的生成任务状态 */
const jobsByUser = new Map<string, MutableJob>()

function jobFor(userId: string): MutableJob {
  let job = jobsByUser.get(userId)
  if (!job) {
    job = idleJob()
    jobsByUser.set(userId, job)
  }
  return job
}

function toPublic(userId: string, job: MutableJob): AvatarJobState {
  return {
    userId,
    status: job.status,
    previewUrl: job.previewUrl,
    tip: job.tip,
    error: job.error,
    startedAt: job.startedAt,
    version: job.version,
  }
}

function emit(userId: string) {
  const job = jobFor(userId)
  job.version += 1
  window.dispatchEvent(
    new CustomEvent(JOB_EVENT, {
      detail: toPublic(userId, job),
    }),
  )
}

function setJob(userId: string, patch: Partial<MutableJob>) {
  const job = jobFor(userId)
  Object.assign(job, patch)
  emit(userId)
}

function revokePreview(userId: string) {
  const job = jobFor(userId)
  if (job.previewObjectUrl) {
    URL.revokeObjectURL(job.previewObjectUrl)
    job.previewObjectUrl = null
  }
}

function persistAvatar(userId: string, next: CustomCatAvatar) {
  writeAvatarForUser(userId, next)
}

/** 当前活跃账号的任务视图 */
export function getAvatarJobState(): AvatarJobState {
  const userId = getActiveUserId()
  return toPublic(userId, jobFor(userId))
}

export function subscribeAvatarJob(listener: (s: AvatarJobState) => void): () => void {
  const onJob = () => listener(getAvatarJobState())
  const onAccount = () => listener(getAvatarJobState())
  window.addEventListener(JOB_EVENT, onJob)
  window.addEventListener('xm:user-account-changed', onAccount)
  return () => {
    window.removeEventListener(JOB_EVENT, onJob)
    window.removeEventListener('xm:user-account-changed', onAccount)
  }
}

/** 当前账号是否正在生成（其他账号的任务不影响） */
export function isAvatarJobRunning(): boolean {
  const userId = getActiveUserId()
  const job = jobFor(userId)
  return job.status === 'running' || job.inflight != null
}

/**
 * 启动后台生成。同一账号已有任务在跑时忽略；不同账号互不影响。
 */
export function startAvatarGenerateJob(file: File): boolean {
  const ownerId = getActiveUserId()
  const job = jobFor(ownerId)
  if (job.inflight) return false

  revokePreview(ownerId)
  const previewObjectUrl = URL.createObjectURL(file)
  job.previewObjectUrl = previewObjectUrl

  setJob(ownerId, {
    status: 'running',
    previewUrl: previewObjectUrl,
    tip: '正在后台生成：静帧 → Seedance 视频（可能需几分钟）→ 无缝循环。可继续浏览…',
    error: null,
    startedAt: Date.now(),
  })

  job.inflight = (async () => {
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

      setJob(ownerId, {
        status: 'success',
        previewUrl: result.imageUrl,
        tip: result.tip || '已生成并应用到陪伴 / 首页 / 健康 / 我的',
        error: null,
      })

      window.setTimeout(() => {
        const current = jobFor(ownerId)
        if (current.status === 'success') {
          setJob(ownerId, { tip: null, status: 'idle' })
        }
      }, 6000)
    } catch (e) {
      setJob(ownerId, {
        status: 'error',
        tip: null,
        error: e instanceof Error ? e.message : '生成失败',
      })
    } finally {
      const current = jobFor(ownerId)
      current.inflight = null
      revokePreview(ownerId)
      if (current.status === 'running') {
        setJob(ownerId, { status: 'idle', previewUrl: null })
      } else if (current.previewUrl?.startsWith('blob:')) {
        setJob(ownerId, { previewUrl: null })
      }
    }
  })()

  return true
}

/** 仅清除当前账号的失败态（始终可点关闭） */
export function clearAvatarGenerateError() {
  const userId = getActiveUserId()
  const job = jobFor(userId)
  // 不依赖 status 判断：避免状态不同步导致「关闭」无效
  if (job.status === 'running' && job.inflight) {
    setJob(userId, { error: null })
    return
  }
  setJob(userId, { status: 'idle', error: null, tip: null })
}

/** 关闭当前账号的提示条（成功 / 失败均可） */
export function dismissAvatarJobTip() {
  const userId = getActiveUserId()
  const job = jobFor(userId)
  if (job.status === 'running' && job.inflight) {
    setJob(userId, { tip: null, error: null })
    return
  }
  setJob(userId, {
    tip: null,
    error: null,
    status: 'idle',
  })
}

/** 恢复默认形象时：清掉当前账号任务提示 */
export function resetAvatarJobUi() {
  const userId = getActiveUserId()
  revokePreview(userId)
  setJob(userId, {
    status: 'idle',
    previewUrl: null,
    tip: null,
    error: null,
    startedAt: null,
  })
}

/** 删除账号时清掉其任务槽位 */
export function purgeAvatarJobForUser(userId: string) {
  const job = jobsByUser.get(userId)
  if (!job) return
  if (job.previewObjectUrl) {
    URL.revokeObjectURL(job.previewObjectUrl)
  }
  jobsByUser.delete(userId)
  window.dispatchEvent(new CustomEvent(JOB_EVENT))
}
