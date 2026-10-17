import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/** 对话优先用 CHAT_*；未配时回退方舟 ARK_CHAT_* / ARK_API_KEY */
const chatApiKey =
  process.env.CHAT_API_KEY?.trim() ||
  process.env.OPENAI_API_KEY?.trim() ||
  process.env.ARK_API_KEY?.trim() ||
  ''

const chatBaseUrlRaw =
  process.env.CHAT_BASE_URL?.trim() ||
  process.env.OPENAI_BASE_URL?.trim() ||
  process.env.ARK_CHAT_BASE_URL?.trim() ||
  'https://ark.cn-beijing.volces.com/api/v3'

const chatModel =
  process.env.CHAT_MODEL?.trim() ||
  process.env.ARK_CHAT_MODEL?.trim() ||
  'gpt-4o-mini'

/** GPT 生图 / 视频网关（draw.openai-next.com，OpenAI 兼容） */
const drawApiKey =
  process.env.DRAW_API_KEY?.trim() ||
  process.env.OPENAI_DRAW_API_KEY?.trim() ||
  ''

const drawBaseUrlRaw =
  process.env.DRAW_BASE_URL?.trim() ||
  process.env.OPENAI_DRAW_BASE_URL?.trim() ||
  'https://draw.openai-next.com/v1'

export const config = {
  port: Number(process.env.PORT || 8787),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  arkApiKey: process.env.ARK_API_KEY?.trim() || '',
  arkImageBaseUrl:
    process.env.ARK_IMAGE_BASE_URL?.trim() ||
    'https://ark.cn-beijing.volces.com/api/v3',
  seedreamModel:
    process.env.ARK_SEEDREAM_MODEL?.trim() || 'doubao-seedream-4-5-251128',
  seedanceModel:
    process.env.ARK_SEEDANCE_MODEL?.trim() || 'doubao-seedance-1-5-pro-251215',
  /** draw.openai-next.com */
  drawApiKey,
  drawBaseUrl: trimSlash(drawBaseUrlRaw),
  drawImageModel: process.env.DRAW_IMAGE_MODEL?.trim() || 'gpt-image-1',
  drawImageSize: process.env.DRAW_IMAGE_SIZE?.trim() || '1024x1536',
  /** 实测可用；sora-2-hd 当前价目未配置会 403 */
  drawVideoModel:
    process.env.DRAW_VIDEO_MODEL?.trim() || 'doubao-seedance-2-0-mini-260615',
  drawVideoSize: process.env.DRAW_VIDEO_SIZE?.trim() || '720x1280',
  /** 陪伴对话（OpenAI 兼容 /chat/completions） */
  chatApiKey,
  chatBaseUrl: trimSlash(chatBaseUrlRaw),
  chatModel,
  allowMockAvatar: (process.env.ALLOW_MOCK_AVATAR || 'true').toLowerCase() !== 'false',
  /** Vercel Serverless 仅 /tmp 可写；本地仍用仓库内目录 */
  uploadsDir: process.env.VERCEL
    ? path.join('/tmp', 'xiaomi-uploads')
    : path.join(rootDir, 'uploads'),
  generatedDir: process.env.VERCEL
    ? path.join('/tmp', 'xiaomi-generated')
    : path.join(rootDir, 'generated'),
  /** 仓库内现成的 3D 风格参考图（Mock / 风格锚定） */
  styleRefPath: path.resolve(rootDir, '../app/public/images/companion/mijiang-nest-greenscreen-poster.png'),
  /** 陪伴页家居坐垫背景（用户提供，用于图生图合成） */
  homeRoomCushionPath: path.resolve(rootDir, 'assets/home-room-cushion.jpg'),
  /** 视频任务轮询 */
  seedancePollMs: Number(process.env.SEEDANCE_POLL_MS || 4000),
  /** 云端视频最多等这么久，超时则静帧 + ffmpeg 兜底，避免前端代理 502 */
  seedanceTimeoutMs: Number(process.env.SEEDANCE_TIMEOUT_MS || 3 * 60 * 1000),
  /** 原片时长（秒），无缝循环约为 2× */
  companionVideoDurationSec: Number(process.env.COMPANION_VIDEO_DURATION_SEC || 5),
}

export function hasArkKey(): boolean {
  return Boolean(config.arkApiKey)
}

export function hasDrawKey(): boolean {
  return Boolean(config.drawApiKey)
}

export function hasChatKey(): boolean {
  return Boolean(config.chatApiKey)
}

/** 形象生成优先用 draw（GPT），否则方舟，否则 Mock */
export function hasImageProvider(): boolean {
  return hasDrawKey() || hasArkKey()
}
