import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiSplashPage.module.scss'

export function PaiSplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = window.setTimeout(() => navigate('/paimomo/login', { replace: true }), 1800)
    return () => window.clearTimeout(t)
  }, [navigate])

  return (
    <div className={styles.page}>
      <button type="button" className={styles.skip} onClick={() => navigate('/paimomo')}>
        跳过
      </button>
      <div className={styles.mascot}>
        <img src="/images/paimomo/splash.jpg" alt="" />
      </div>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <span className={styles.pai}>P<span>^</span>i</span>
          <span className={styles.momo}>Momo</span>
        </div>
        <p>你的宠物, 另一个世界</p>
      </div>
    </div>
  )
}
