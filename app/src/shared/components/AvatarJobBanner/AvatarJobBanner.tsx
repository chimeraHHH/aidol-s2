import { useNavigate } from 'react-router-dom'
import { useAvatarGenerateJob } from '@/features/settings/useAvatarGenerateJob'
import styles from './AvatarJobBanner.module.scss'

/** 全局悬浮条：生成在后台跑时，切任何页面都能看到进度 */
export function AvatarJobBanner() {
  const navigate = useNavigate()
  const { job, dismissTip, clearError } = useAvatarGenerateJob()

  const running = job.status === 'running'
  const failed = job.status === 'error'
  const ok = job.status === 'success'
  if (!running && !failed && !ok) return null

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
          <button type="button" className={styles.link} onClick={() => clearError()}>
            关闭
          </button>
        ) : null}
        {ok ? (
          <button type="button" className={styles.link} onClick={() => dismissTip()}>
            知道了
          </button>
        ) : null}
      </div>
    </div>
  )
}
