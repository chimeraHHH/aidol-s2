import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiLoginPage.module.scss'

export function PaiLoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('13609516942')
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [agreed, setAgreed] = useState(true)

  const sendCode = () => {
    if (seconds > 0) return
    setSeconds(55)
    const timer = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1>手机号登录</h1>
        <p className={styles.sub}>验证码登录，新号码将自动注册</p>

        <div className={styles.box}>
          <div className={styles.row}>
            <button type="button" className={styles.cc}>
              +86 ▾
            </button>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>
          <div className={styles.row}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="验证码 6位数字"
              inputMode="numeric"
            />
            <button type="button" className={styles.codeBtn} onClick={sendCode}>
              {seconds > 0 ? `${seconds}s` : '获得验证码'}
            </button>
          </div>
        </div>

        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            我已阅读 <a href="#user">《用户协议》</a>
            <a href="#privacy">《隐私协议》</a>
          </span>
        </label>

        <button
          type="button"
          className={styles.primary}
          disabled={!agreed}
          onClick={() => navigate('/paimomo/welcome')}
        >
          立即登录
        </button>
        <button type="button" className={styles.secondary} onClick={() => navigate('/paimomo/welcome')}>
          密码登录
        </button>
        <button type="button" className={styles.lang}>
          Language
        </button>
      </div>
    </div>
  )
}
