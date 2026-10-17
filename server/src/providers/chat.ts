import { config, hasChatKey } from '../config.js'
import type { ChatInput, ChatModel, ChatResult } from './types.js'

function chatCompletionsUrl(): string {
  const base = config.chatBaseUrl
  if (base.endsWith('/chat/completions')) return base
  if (base.endsWith('/v1')) return `${base}/chat/completions`
  // openai-next 等兼容站：根域名需补 /v1
  if (!base.includes('/api/')) return `${base}/v1/chat/completions`
  // 火山方舟等已含 /api/v3
  return `${base}/chat/completions`
}

/** OpenAI 兼容对话（openai-next / 方舟 chat/completions） */
export class ArkChatModel implements ChatModel {
  async chat(input: ChatInput): Promise<ChatResult> {
    if (!hasChatKey()) {
      return {
        text: '（Mock）喵～我在听呢。配置 CHAT_API_KEY 后即可接入真实对话模型。',
        model: 'mock',
        provider: 'mock',
      }
    }

    const res = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.chatApiKey}`,
      },
      body: JSON.stringify({
        model: config.chatModel,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      }),
    })

    const json = (await res.json()) as {
      error?: { message?: string; code?: string }
      choices?: Array<{ message?: { content?: string | null } }>
      model?: string
    }

    if (!res.ok) {
      throw new Error(json.error?.message || `Chat HTTP ${res.status}`)
    }

    const text = json.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('对话模型未返回内容')

    const provider = config.chatBaseUrl.includes('openai-next')
      ? 'openai-next'
      : config.chatBaseUrl.includes('volces')
        ? 'ark-chat'
        : 'openai-compat'

    return {
      text,
      model: json.model || config.chatModel,
      provider,
      raw: json,
    }
  }
}
