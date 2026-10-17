import { useNavigate } from 'react-router-dom'
import styles from './PaiHeader.module.scss'

interface PaiHeaderProps {
  onPlus?: () => void
  toast?: string | null
}

export function PaiHeader({ onPlus, toast }: PaiHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <button type="button" className={styles.avatarBtn} onClick={() => navigate('/paimomo/me')}>
        <img src="/images/paimomo/cat-avatar.jpg" alt="" className={styles.avatar} />
      </button>
      {toast ? <span className={styles.toast}>{toast}</span> : <span />}
      <div className={styles.actions}>
        <button type="button" className={styles.round} aria-label="通知">
          <BellIcon />
        </button>
        <button type="button" className={styles.round} aria-label="更多" onClick={onPlus}>
          <PlusIcon />
        </button>
      </div>
    </header>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.2 1.8H5.3l1.2-1.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10.2 19.5a1.8 1.8 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}
