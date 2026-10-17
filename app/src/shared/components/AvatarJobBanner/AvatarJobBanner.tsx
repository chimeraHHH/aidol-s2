import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAvatarGenerateJob } from '@/features/settings/useAvatarGenerateJob'
import styles from './AvatarJobBanner.module.scss'

/** 当前账号的生成进度条（按账号隔离，切号不串状态） */
export function AvatarJobBanner() {
  const navigate = useNavigate()
  const { job, dismissTip, clearError } = useAvatarGenerateJob()
  /** 本地强制隐藏：防止状态未同步时「关闭」点不动 */
  const [forceHidden, setForceHidden] = useState(false)

  const running = job.status === 'running'
  const failed = job.status === 'error'
  const ok = job.status === 'success'

  useEffect(() => {
    if (running) setForceHidden(false)
  }, [running, job.version])

  if (forceHidden && !running) return null
  if (!running && !failed && !ok) return null

  const hideBanner = () => {
    clearError()
    dismissTip()
    setForceHidden(true)
  }

  return (
    <div
      className={`${styles.banner}${running ? ` ${styles.running}` : ''}${failed ? ` ${styles.failed}` : ''}${ok ? ` ${styles.ok}` : ''}`}
      role="status"
    >
      <div className={styles.copy}>
        {running ? (
          <>
            <span className={styles.dot} aria-hidden />
            <span>猫形象生成中，可继续浏览其他页面…</span>
          </>
        ) : null}
        {ok ? <span>{job.tip || '生成完成，各页头像已更新'}</span> : null}
        {failed ? <span>{job.error || '生成失败'}</span> : null}
      </div>
      <div className={styles.actions}>
        {running || ok ? (
          <button type="button" className={styles.link} onClick={() => navigate('/settings')}>
            查看
          </button>
        ) : null}
        {failed ? (
          <button type="button" className={styles.closeBtn} onClick={hideBanner}>
            关闭
          </button>
        ) : null}
        {ok ? (
          <button type="button" className={styles.closeBtn} onClick={hideBanner}>
            知道了
          </button>
        ) : null}
      </div>
    </div>
  )
}
