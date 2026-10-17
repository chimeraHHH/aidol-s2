import { useNavigate } from 'react-router-dom'
import { usePaiUnreadCount } from '../notifications/paiNotificationsStore'
import styles from './PaiHeader.module.scss'

interface PaiHeaderProps {
  onPlus?: () => void
  onSearch?: () => void
  toast?: string | null
  title?: string
  subtitle?: string
}

export function PaiHeader({ onPlus, onSearch, toast, title, subtitle }: PaiHeaderProps) {
  const navigate = useNavigate()
  const unreadCount = usePaiUnreadCount()
  const hasBrand = Boolean(title)

  return (
    <header className={`${styles.header}${hasBrand ? ` ${styles.headerBrand}` : ''}`}>
      {hasBrand ? (
        <div className={styles.brand}>
          <div className={styles.brandTitle}>{title}</div>
          {subtitle ? <div className={styles.brandSub}>{subtitle}</div> : null}
        </div>
      ) : toast ? (
        <span className={styles.toast}>{toast}</span>
      ) : (
        <span />
      )}

      <div className={styles.actions}>
        {onSearch ? (
          <button type="button" className={styles.round} aria-label="搜索" onClick={onSearch}>
            <SearchIcon />
          </button>
        ) : null}
        <button
          type="button"
          className={styles.round}
          aria-label={unreadCount > 0 ? `通知，${unreadCount}条未读` : '通知'}
          onClick={() => navigate('/notifications')}
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span className={styles.badge} aria-hidden>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={styles.round}
          aria-label="添加"
          onClick={() => {
            if (onPlus) onPlus()
            else navigate('/compose')
          }}
        >
          <PlusIcon />
        </button>
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
