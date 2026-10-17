import fs from 'node:fs'
import path from 'node:path'
import { agentRootDir } from './paths.js'

const DOC_NAMES = ['AGENTS.md', 'SOUL.md', 'IDENTITY.md', 'USER.md'] as const

export type AgentDocs = Record<(typeof DOC_NAMES)[number], string>

export function loadAgentDocs(): AgentDocs {
  const docs = {} as AgentDocs
  for (const name of DOC_NAMES) {
    const fp = path.join(agentRootDir, name)
    docs[name] = fs.existsSync(fp)
      ? fs.readFileSync(fp, 'utf8')
      : `# ${name}\n（缺失）\n`
  }
  return docs
}

export type RuntimeProfile = {
  ownerName?: string
  ownerCallAs?: string
  catName?: string
  breed?: string
  birthday?: string
  personaId?: string
  personaLabel?: string
  mood?: string
  energy?: number
  bond?: number
  streakDays?: number
  latestWeightKg?: number | null
  weekDeltaKg?: number | null
  idealMinKg?: number
  idealMaxKg?: number
  healthInsight?: string
  lifestyleLines?: string[]
}

const PERSONA_LABEL: Record<string, string> = {
  gentle: '温柔陪聊',
  sassy: '傲娇吐槽',
  cool: '冷静管家',
}

/** 把运行时档案拼进 USER.md 的「动态档案」区 */
export function renderUserDoc(baseUserMd: string, profile: RuntimeProfile): string {
  const persona = profile.personaId || 'gentle'
  const personaLabel = profile.personaLabel || PERSONA_LABEL[persona] || persona
  const lines = [
    `- **主人昵称:** ${profile.ownerName || '铲屎官'}`,
    `- **怎么叫主人:** ${profile.ownerCallAs || profile.ownerName || '你'}（对话里必须用这个称呼）`,
    `- **猫咪名:** ${profile.catName || '咪酱'}（你就是TA的数字分身，自称可用此名）`,
    `- **品种:** ${profile.breed || '未知'}`,
    `- **生日:** ${profile.birthday || '未知'}`,
    `- **登录页人设:** ${persona}（${personaLabel}）← 语气/风格必须严格按此人设，不可混用`,
    `- **当前情绪:** ${profile.mood || 'curious'} · 精力 ${profile.energy ?? '—'} · 亲密度 ${profile.bond ?? '—'} · 连续陪伴 ${profile.streakDays ?? 0} 天`,
    `- **最近体重:** ${
      profile.latestWeightKg != null ? `${profile.latestWeightKg.toFixed(2)} kg` : '暂无'
    }`,
    `- **近一周差值:** ${
      profile.weekDeltaKg != null
        ? `${profile.weekDeltaKg >= 0 ? '+' : ''}${profile.weekDeltaKg.toFixed(2)} kg`
        : '暂无'
    }`,
    `- **理想区间:** ${profile.idealMinKg ?? 4.2}–${profile.idealMaxKg ?? 4.6} kg`,
    `- **健康洞察:** ${profile.healthInsight || '暂无'}`,
  ]
  if (profile.lifestyleLines?.length) {
    lines.push('- **生活指标:**')
    for (const l of profile.lifestyleLines) lines.push(`  - ${l}`)
  }

  const dynamicBlock = `## 动态档案\n\n${lines.join('\n')}\n`
  if (baseUserMd.includes('## 动态档案')) {
    return baseUserMd.replace(/## 动态档案[\s\S]*?(?=\n## |\n*$)/, `${dynamicBlock}\n`)
  }
  return `${baseUserMd.trim()}\n\n${dynamicBlock}`
}
