/** 可插拔大模型能力抽象 —— 换厂商只改 provider 实现 */

export interface ImageGenerateInput {
  /** data URL 或 https URL（单图） */
  imageDataUrl?: string
  /** 多参考图：如 [用户猫照, 家居背景] */
  imageDataUrls?: string[]
  prompt: string
  size?: string
  watermark?: boolean
}

export interface ImageGenerateResult {
  /** 可访问的图片 URL（本地静态或方舟返回） */
  imageUrl: string
  /** 若方舟返回 base64，落盘后可为空 */
  b64Json?: string
  model: string
  provider: 'seedream' | 'openai-next-image' | 'mock'
  raw?: unknown
}

export interface ImageGenerator {
  generate(input: ImageGenerateInput): Promise<ImageGenerateResult>
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatInput {
  messages: ChatMessage[]
  temperature?: number
}

export interface ChatResult {
  text: string
  model: string
  provider: 'ark-chat' | 'openai-next' | 'openai-compat' | 'mock'
  raw?: unknown
}

export interface ChatModel {
  chat(input: ChatInput): Promise<ChatResult>
}

/** Seedance 图生视频 */
export interface VideoGenerateInput {
  prompt: string
  /** 首帧图 data URL 或 https URL */
  imageDataUrl?: string
  duration?: number
  ratio?: string
  generateAudio?: boolean
}

export interface VideoGenerateResult {
  taskId?: string
  videoUrl?: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_implemented'
  model: string
  message?: string
  raw?: unknown
}

export interface VideoGenerator {
  generate(input: VideoGenerateInput): Promise<VideoGenerateResult>
}
