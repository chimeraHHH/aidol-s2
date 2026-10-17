import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiProfilePage.module.scss'

type PetId = 'momo' | 'xiaomi'

export function PaiProfilePage() {
  const navigate = useNavigate()
  const [active, setActive] = useState<PetId>('xiaomi')

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        <img src="/images/paimomo/profile-header.jpg?v=2" alt="" />
      </div>

      <section className={styles.card}>
        <div className={styles.avatarRing}>
          <img className={styles.avatar} src="/images/paimomo/dog-avatar.jpg" alt="" />
        </div>

        <h1>用户08645</h1>
        <p className={styles.handle}>@999507</p>

        <div className={styles.stats}>
          {[
            ['获赞', '0'],
            ['好友', '0'],
            ['粉丝', '0'],
            ['关注', '0'],
          ].map(([label, value]) => (
            <div key={label} className={styles.stat}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.edit}>
            编辑资料
          </button>
          <button type="button" className={styles.settings} aria-label="设置">
            <GearIcon />
          </button>
        </div>
      </section>

      <section className={styles.petsSection}>
        <div className={styles.sectionTitle}>
          <span>我的宠物档案</span>
        </div>

        <div className={styles.pets}>
          <article className={styles.pet}>
            <button
              type="button"
              className={`${styles.radio}${active === 'momo' ? ` ${styles.on}` : ''}`}
              onClick={() => setActive('momo')}
              aria-label="选择 momo"
            />
            <img className={styles.petThumb} src="/images/paimomo/dog-avatar.jpg" alt="" />
            <div className={styles.petInfo}>
              <strong>momo</strong>
              <span>狗狗</span>
            </div>
            <div className={styles.petBtns}>
              <button type="button" onClick={() => navigate('/paimomo/pet-form')}>
                查看信息
              </button>
              <button type="button">设置</button>
            </div>
          </article>

          <article className={styles.pet}>
            <button
              type="button"
              className={`${styles.radio}${active === 'xiaomi' ? ` ${styles.on}` : ''}`}
              onClick={() => setActive('xiaomi')}
              aria-label="选择小咪"
            />
            <img className={styles.petThumb} src="/images/paimomo/cat-hero.jpg" alt="" />
            <div className={styles.petInfo}>
              <strong>小咪</strong>
              <span>猫猫</span>
              {active === 'xiaomi' && <em>当前用于对话</em>}
            </div>
            <div className={styles.petBtns}>
              <button type="button" onClick={() => navigate('/paimomo/pet-form')}>
                查看信息
              </button>
              <button type="button" onClick={() => navigate('/paimomo/animation')}>
                设置
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 12a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1l-.4-2.6H9.2l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h5.6l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
