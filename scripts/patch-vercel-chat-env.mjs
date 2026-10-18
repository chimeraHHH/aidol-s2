#!/usr/bin/env node
/**
 * Sync CHAT_* env vars on aidol-s2-api to production/preview/development.
 * Reads values from server/.env — does not print secrets.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const envPath = path.join(root, 'server', '.env')
const authPath = path.join(
  process.env.HOME,
  'Library/Application Support/com.vercel.cli/auth.json',
)

const TEAM = 'team_0auZhXXAEzmITHdg2e1rcKx0'
const PROJECT = 'aidol-s2-api'
const TARGETS = ['production', 'preview', 'development']

function parseEnv(file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}

const token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token
const local = parseEnv(envPath)

async function api(method, urlPath, body) {
  const res = await fetch(`https://api.vercel.com${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${text.slice(0, 500)}`)
  }
  return json
}

const list = await api(
  'GET',
  `/v10/projects/${PROJECT}/env?teamId=${TEAM}`,
)

const wanted = {
  CHAT_API_KEY: { value: local.CHAT_API_KEY, type: 'encrypted' },
  CHAT_BASE_URL: {
    value: local.CHAT_BASE_URL || 'https://api.openai-next.com',
    type: 'plain',
  },
  CHAT_MODEL: { value: local.CHAT_MODEL || 'gpt-4o-mini', type: 'plain' },
}

for (const [key, cfg] of Object.entries(wanted)) {
  if (!cfg.value) {
    console.log(`skip ${key}: empty local value`)
    continue
  }
  const existing = (list.envs || []).find((e) => e.key === key)
  if (existing) {
    await api(
      'PATCH',
      `/v9/projects/${PROJECT}/env/${existing.id}?teamId=${TEAM}`,
      { value: cfg.value, target: TARGETS, type: cfg.type },
    )
    console.log(`patched ${key} id=${existing.id} targets=${TARGETS.join(',')}`)
  } else {
    await api('POST', `/v10/projects/${PROJECT}/env?teamId=${TEAM}`, {
      key,
      value: cfg.value,
      type: cfg.type,
      target: TARGETS,
    })
    console.log(`created ${key} targets=${TARGETS.join(',')}`)
  }
}

console.log('done')
