import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** server/agent — 数字分身源文件（AGENTS / SOUL / USER / IDENTITY） */
export const agentRootDir = path.resolve(__dirname, '../../agent')

/** server/data/memory — 按用户持久化的 Memory */
export const memoryRootDir = path.resolve(__dirname, '../../data/memory')
