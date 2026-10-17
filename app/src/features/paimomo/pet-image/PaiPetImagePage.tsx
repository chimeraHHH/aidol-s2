import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiPetImagePage.module.scss'

export function PaiPetImagePage() {
  const navigate = useNavigate()
  const [sheet, setSheet] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [agreed, setAgreed] = useState(true)

  const startGenerate = () => {
    setPrivacy(false)
    setSheet(false)
    navigate('/paimomo/generating?kind=image')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1>为你的宠物制作专属形象</h1>
        <span />
      </header>

      <div className={styles.preview}>
        <img src="/images/paimomo/cat-ragdoll.jpg" alt="预览" />
      </div>

      <button type="button" className={styles.primary} onClick={() => setSheet(true)}>
        上传宠物照片
      </button>
      <button type="button" className={styles.secondary} onClick={() => navigate('/paimomo/animation')}>
        制作动效
      </button>

      {sheet && (
        <div className={styles.mask} onClick={() => setSheet(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            {[
              ['照片图库', '🖼'],
              ['拍照', '📷'],
              ['选取文件', '📁'],
            ].map(([label, icon]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSheet(false)
                  setPrivacy(true)
                }}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {privacy && (
        <div className={styles.mask}>
          <div className={styles.privacy}>
            <h2>AI 功能隐私说明</h2>
            <div className={styles.privacyBody}>
              <p>
                为启用对话与形象生成，应用会将部分信息发送至 AI 与语音技术服务商。我们将按最小必要原则处理数据。
              </p>
              <strong>可能发送的个人信息（最小必要）</strong>
              <ul>
                <li>您输入的文字，以及服务器上保存的近期对话摘要</li>
                <li>用于生成形象的宠物照片（处理后不长期用于训练）</li>
              </ul>
              <label className={styles.check}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  本人已阅读上文，并同意「缦宠/PaiMomo」按上述说明向所列第三方提供相应个人信息，以便我使用 AI
                  相关功能。
                </span>
              </label>
            </div>
            <button type="button" className={styles.primary} disabled={!agreed} onClick={startGenerate}>
              同意并继续
            </button>
            <button type="button" className={styles.secondary} onClick={() => setPrivacy(false)}>
              暂不使用
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
