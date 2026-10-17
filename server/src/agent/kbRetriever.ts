import fs from 'node:fs'
import path from 'node:path'
import { agentRootDir } from './paths.js'
import type { RuntimeProfile } from './loadAgentDocs.js'

type KgRange = { min: number; max: number } | null

type KnowledgeEntry = {
  id: string
  topic: string
  title: string
  question_examples?: string[]
  required_fields?: string[]
  optional_fields?: string[]
  answer_core: string
  rules?: string[]
  missing_data_prompt?: string
  prohibited_claims?: string[]
  safety?: string
  source_ids?: string[]
}

type BreedRef = {
  breed: string
  female_kg: KgRange
  male_kg: KgRange
  maturity_note: string
  usage: string
}

type LifeStage = {
  id: string
  min_months: number
  max_months_exclusive: number | null
  name: string
  focus: string
}

type KbDoc = {
  metadata: { name: string; version: string; default_disclaimer?: string }
  enums: { breed: Record<string, string> }
  life_stages: LifeStage[]
  breed_references: BreedRef[]
  bcs_reference: Array<{
    scores: number[]
    status: string
    estimated_overweight_pct: number | null
  }>
  field_priority: string[]
  knowledge_entries: KnowledgeEntry[]
  global_safety_rules: string[]
  default_disclaimer: string
}

export type KbHit = {
  id: string
  title: string
  topic: string
  score: number
  answerCore: string
  safety?: string
  missingPrompt?: string
  prohibited?: string[]
  sourceIds?: string[]
}

export type KbRetrieval = {
  version: string
  hits: KbHit[]
  profileFacts: string[]
  safetyRules: string[]
  disclaimer: string
  /** 供调试 / 前端展示 */
  promptBlock: string
}

let cached: KbDoc | null = null

function loadKb(): KbDoc {
  if (cached) return cached
  const fp = path.join(agentRootDir, 'knowledge', 'kb.json')
  cached = JSON.parse(fs.readFileSync(fp, 'utf8')) as KbDoc
  return cached
}

/** 把中文档案品种映射到 KB 枚举 */
export function mapBreedCode(breedText?: string): string {
  const t = (breedText || '').toLowerCase()
  if (!t || t.includes('未知') || t.includes('不确定')) return 'UNKNOWN'
  if (/英短|英国短毛|british/.test(t)) return 'BRITISH_SHORTHAIR'
  if (/布偶|ragdoll/.test(t)) return 'RAGDOLL'
  if (/暹罗|siamese/.test(t)) return 'SIAMESE'
  if (/田园|土猫|中华|domestic/.test(t)) return 'DOMESTIC_CHINESE'
  if (/其他|other/.test(t)) return 'OTHER'
  return 'OTHER'
}

function ageMonths(birthday?: string): number | null {
  if (!birthday) return null
  const birth = Date.parse(birthday)
  if (Number.isNaN(birth)) return null
  const ms = Date.now() - birth
  if (ms < 0) return null
  return Math.floor(ms / (30.44 * 24 * 60 * 60 * 1000))
}

function lifeStageFor(months: number | null, stages: LifeStage[]): LifeStage | null {
  if (months == null) return null
  return (
    stages.find(
      (s) =>
        months >= s.min_months &&
        (s.max_months_exclusive == null || months < s.max_months_exclusive),
    ) ?? null
  )
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  const parts = lower
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const grams: string[] = []
  const cjk = lower.replace(/[^\u4e00-\u9fff]/g, '')
  for (let i = 0; i < cjk.length - 1; i++) grams.push(cjk.slice(i, i + 2))
  for (let i = 0; i < cjk.length - 2; i++) grams.push(cjk.slice(i, i + 3))
  return [...parts, ...grams]
}

function scoreEntry(queryTokens: Set<string>, entry: KnowledgeEntry): number {
  const bag = [
    entry.id,
    entry.topic,
    entry.title,
    entry.answer_core,
    ...(entry.question_examples ?? []),
    ...(entry.rules ?? []),
    entry.safety ?? '',
  ].join(' ')
  const entryTokens = tokenize(bag)
  let score = 0
  for (const t of entryTokens) {
    if (queryTokens.has(t)) {
      // 问法例句与标题加权更高
      score += t.length >= 2 ? 1.2 : 0.4
    }
  }
  // 主题关键词强匹配
  const topicBoosts: Array<[RegExp, number]> = [
    [/bcs|体况|胖不胖|肥胖|超重|偏瘦/, entry.topic === 'bcs' || entry.topic === 'weight_normality' ? 8 : 0],
    [/品种|英短|布偶|暹罗|田园/, entry.topic === 'breed_weight' ? 8 : 0],
    [/绝育/, entry.topic === 'neuter_weight' ? 10 : 0],
    [/减肥|减重计划|掉多少/, entry.topic === 'weight_loss_plan' ? 10 : 0],
    [/一直胖|长胖|增重|变重/, entry.topic === 'weight_gain' ? 10 : 0],
    [/掉体重|变轻|瘦了|减重(?!计划)/, entry.topic === 'weight_loss' ? 10 : 0],
    [/老年|老猫|十几岁/, entry.topic === 'senior_weight_loss' || entry.topic === 'age_weight' ? 10 : 0],
    [/干粮|湿粮|喂|零食|自由采食/, entry.topic === 'diet_weight' ? 10 : 0],
    [/运动|不爱动|活动/, entry.topic === 'activity_weight' ? 8 : 0],
    [/体脂|能测|传感器|猫窝/, entry.topic === 'device_capability' ? 10 : 0],
    [/两只|多猫|分清/, entry.topic === 'multi_cat' ? 10 : 0],
    [/正常吗|健康吗|太胖|太瘦|多重/, entry.topic === 'weight_normality' ? 6 : 0],
  ]
  const q = [...queryTokens].join('')
  for (const [re, boost] of topicBoosts) {
    if (boost && re.test(q)) score += boost
  }
  return score
}

function formatRange(r: KgRange): string {
  if (!r) return '不设固定范围'
  return `${r.min}–${r.max} kg`
}

function buildProfileFacts(profile: RuntimeProfile, kb: KbDoc): string[] {
  const facts: string[] = []
  const breedCode = mapBreedCode(profile.breed)
  const breedLabel = kb.enums.breed[breedCode] || profile.breed || '未知'
  const months = ageMonths(profile.birthday)
  const stage = lifeStageFor(months, kb.life_stages)
  const ref = kb.breed_references.find((b) => b.breed === breedCode)

  facts.push(`品种映射: ${profile.breed || '未知'} → ${breedCode}（${breedLabel}）`)
  if (months != null) {
    facts.push(`估算月龄: ${months} 个月` + (stage ? ` · 生命阶段: ${stage.name}（${stage.focus}）` : ''))
  } else {
    facts.push('月龄: 未知（缺少可靠出生日期）')
  }

  if (ref) {
    facts.push(
      `品种成年参考(群体): 母猫 ${formatRange(ref.female_kg)}；公猫 ${formatRange(ref.male_kg)}；${ref.maturity_note}。用法: ${ref.usage}`,
    )
  }

  if (profile.latestWeightKg != null) {
    facts.push(`当前稳定体重约: ${profile.latestWeightKg.toFixed(2)} kg`)
  }
  if (profile.weekDeltaKg != null) {
    const pct =
      profile.latestWeightKg && profile.latestWeightKg > 0
        ? ((profile.weekDeltaKg / profile.latestWeightKg) * 100).toFixed(1)
        : null
    facts.push(
      `近一周差值: ${profile.weekDeltaKg >= 0 ? '+' : ''}${profile.weekDeltaKg.toFixed(2)} kg` +
        (pct ? `（约 ${pct}%）` : ''),
    )
  }

  facts.push(`判断优先级: ${kb.field_priority.join(' > ')}`)
  facts.push(
    `BCS 速查: ${kb.bcs_reference.map((b) => `${b.scores.join('-')}=${b.status}`).join('，')}`,
  )
  return facts
}

function isHealthQuery(message: string): boolean {
  return /体重|称重|胖|瘦|公斤|kg|BCS|体况|绝育|减肥|减重|增重|掉体重|品种|英短|布偶|暹罗|喂|干粮|湿粮|活动|老年|老猫|正常吗|健康|体脂|多猫|肋骨|腰线/i.test(
    message,
  )
}

/** 轻量 RAG：关键词 + 主题加权检索 Top-K，并附档案事实 */
export function retrieveKnowledge(
  message: string,
  profile: RuntimeProfile,
  topK = 3,
): KbRetrieval {
  const kb = loadKb()
  const queryTokens = new Set(tokenize(message))
  // 档案词也参与检索（品种/年龄相关条目更容易命中）
  for (const t of tokenize([profile.breed, profile.catName, profile.healthInsight].filter(Boolean).join(' '))) {
    queryTokens.add(t)
  }

  const scored = kb.knowledge_entries
    .map((e) => ({ entry: e, score: scoreEntry(queryTokens, e) }))
    .sort((a, b) => b.score - a.score)

  let picks = scored.filter((s) => s.score > 0).slice(0, topK)

  // 健康相关但没命中时，默认给「是否正常」+ 设备能力
  if (picks.length === 0 && isHealthQuery(message)) {
    const fallbackIds = ['KB-WEIGHT-002', 'KB-WEIGHT-013', 'KB-WEIGHT-006']
    picks = scored.filter((s) => fallbackIds.includes(s.entry.id)).slice(0, topK)
  }

  // 若问品种/正常且有品种，确保带上品种条目
  if (/品种|英短|布偶|暹罗|田园|正常吗|多重/.test(message)) {
    const breedEntry = scored.find((s) => s.entry.id === 'KB-WEIGHT-001')
    if (breedEntry && !picks.some((p) => p.entry.id === 'KB-WEIGHT-001')) {
      picks = [breedEntry, ...picks].slice(0, topK)
    }
  }

  const hits: KbHit[] = picks.map(({ entry, score }) => ({
    id: entry.id,
    title: entry.title,
    topic: entry.topic,
    score: Number(score.toFixed(2)),
    answerCore: entry.answer_core,
    safety: entry.safety,
    missingPrompt: entry.missing_data_prompt,
    prohibited: entry.prohibited_claims,
    sourceIds: entry.source_ids,
  }))

  const profileFacts = buildProfileFacts(profile, kb)
  const safetyRules = kb.global_safety_rules
  const disclaimer = kb.default_disclaimer || kb.metadata.default_disclaimer || ''

  const promptBlock = formatRetrievalForPrompt({
    version: kb.metadata.version,
    hits,
    profileFacts,
    safetyRules,
    disclaimer,
    promptBlock: '',
  })

  return {
    version: kb.metadata.version,
    hits,
    profileFacts,
    safetyRules,
    disclaimer,
    promptBlock,
  }
}

export function formatRetrievalForPrompt(r: Omit<KbRetrieval, 'promptBlock'> & { promptBlock?: string }): string {
  if (r.hits.length === 0) {
    return [
      '# Knowledge (RAG)',
      `kb_version: ${r.version}`,
      '（本次问题未命中专项条目；仍须遵守全局安全规则）',
      '',
      '## 档案推导事实',
      ...r.profileFacts.map((f) => `- ${f}`),
      '',
      '## 全局安全规则',
      ...r.safetyRules.map((s) => `- ${s}`),
      '',
      `免责声明: ${r.disclaimer}`,
    ].join('\n')
  }

  const entryBlocks = r.hits.map((h, i) => {
    const lines = [
      `### [${i + 1}] ${h.id} · ${h.title} (score=${h.score})`,
      `- 核心: ${h.answerCore}`,
    ]
    if (h.safety) lines.push(`- 风险边界: ${h.safety}`)
    if (h.missingPrompt) lines.push(`- 数据不足时可追问: ${h.missingPrompt}`)
    if (h.prohibited?.length) lines.push(`- 禁止表达: ${h.prohibited.join('；')}`)
    if (h.sourceIds?.length) lines.push(`- 来源: ${h.sourceIds.join(', ')}`)
    return lines.join('\n')
  })

  return [
    '# Knowledge (RAG)',
    `kb_version: ${r.version}`,
    '以下为检索到的知识条目与档案事实。回答必须遵循条目核心与安全规则；用小猫口吻转述，不要逐条念 ID。',
    '',
    '## 档案推导事实',
    ...r.profileFacts.map((f) => `- ${f}`),
    '',
    '## 命中条目',
    ...entryBlocks,
    '',
    '## 全局安全规则',
    ...r.safetyRules.map((s) => `- ${s}`),
    '',
    `免责声明: ${r.disclaimer}`,
  ].join('\n')
}
