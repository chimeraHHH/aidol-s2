import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** server/agent — 数字分身源文件（AGENTS / SOUL / USER / IDENTITY） */
export const agentRootDir = path.resolve(__dirname, '../../agent')

/**
 * Memory 持久化目录。
 * Vercel Serverless 仅 /tmp 可写；本地仍用仓库内 data/memory。
 */
export const memoryRootDir = process.env.VERCEL
  ? path.join('/tmp', 'xiaomi-memory')
  : path.resolve(__dirname, '../../data/memory')
