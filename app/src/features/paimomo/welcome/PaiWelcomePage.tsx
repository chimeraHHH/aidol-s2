import { useNavigate } from 'react-router-dom'
import styles from './PaiWelcomePage.module.scss'

export function PaiWelcomePage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1>欢迎来到 PaiMomo</h1>
        <p>
          先为毛孩子建一份档案，聊天、地图等功能会更贴心。也可以稍后在「设置 -&gt; 宠物档案」里补建。
        </p>
      </div>
      <button type="button" className={styles.cta} onClick={() => navigate('/paimomo/pet-form')}>
        制作宠物档案
      </button>
      <button type="button" className={styles.later} onClick={() => navigate('/paimomo')}>
        稍后再说
      </button>
    </div>
  )
}
