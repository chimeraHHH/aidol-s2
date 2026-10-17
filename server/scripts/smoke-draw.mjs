/**
 * 本地冒烟：验证 DRAW_* 密钥与 GPT 生图（不打印完整 key）
 * node scripts/smoke-draw.mjs
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

const key = process.env.DRAW_API_KEY || ''
const base = (process.env.DRAW_BASE_URL || 'https://draw.openai-next.com/v1').replace(/\/+$/, '')
const model = process.env.DRAW_IMAGE_MODEL || 'gpt-image-1'

if (!key) {
  console.error('DRAW_API_KEY missing')
  process.exit(1)
}

console.log('base', base)
console.log('model', model)
console.log('key', `${key.slice(0, 6)}…${key.slice(-4)}`)

const res = await fetch(`${base}/images/generations`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    prompt: 'cute cream kitten, 3D fluffy, soft light, simple test',
    size: '1024x1024',
    n: 1,
  }),
})

const json = await res.json()
console.log('status', res.status)
console.log('url', json?.data?.[0]?.url || json?.error || json)

if (!res.ok) process.exit(2)

const outDir = path.resolve('generated')
fs.mkdirSync(outDir, { recursive: true })
const imgRes = await fetch(json.data[0].url)
const buf = Buffer.from(await imgRes.arrayBuffer())
const out = path.join(outDir, `smoke-gpt-${Date.now()}.png`)
fs.writeFileSync(out, buf)
console.log('saved', out)
