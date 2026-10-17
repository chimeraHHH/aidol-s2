import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PaiPetFormPage.module.scss'

const TRAITS = [
  '温柔乖巧',
  '活泼调皮',
  '高冷骨感',
  '粘人撒娇',
  '忠犬护主',
  '学霸坏坏',
  '神秘哲学家',
  '贪吃人象',
]

export function PaiPetFormPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<'狗狗' | '猫猫' | '其他'>('猫猫')
  const [name, setName] = useState('小咪')
  const [weight, setWeight] = useState('5.2')
  const [trait, setTrait] = useState('温柔乖巧')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)}>
          ‹
        </button>
        <h1>新建宠物档案</h1>
        <span />
      </header>

      <label className={styles.label}>Ta 是</label>
      <div className={styles.typeRow}>
        {(['狗狗', '猫猫', '其他'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.chip}${type === t ? ` ${styles.chipOn}` : ''}`}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <label className={styles.label}>名字</label>
      <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="给 Ta 起个名字" />

      <label className={styles.label}>体重 (千克，选填)</label>
      <input
        className={styles.input}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="例如 5.2"
        inputMode="decimal"
      />

      <label className={styles.label}>生日 (选填)</label>
      <div className={styles.dateField}>
        <span>📅</span>
        <input placeholder="YYYY / MM / DD" />
      </div>

      <label className={styles.label}>性格预设</label>
      <div className={styles.traits}>
        {TRAITS.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.trait}${trait === t ? ` ${styles.traitOn}` : ''}`}
            onClick={() => setTrait(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <button type="button" className={styles.cta} onClick={() => navigate('/paimomo/pet-image')}>
        继续
      </button>
    </div>
  )
}
