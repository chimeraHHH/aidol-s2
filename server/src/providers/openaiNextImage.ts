import { config, hasDrawKey } from '../config.js'
import { drawFetch } from '../utils/drawFetch.js'
import type { ImageGenerateInput, ImageGenerateResult, ImageGenerator } from './types.js'

function dataUrlToBlobParts(dataUrl: string): { buffer: Buffer; mime: string; filename: string } {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl)
  if (!m) throw new Error('仅支持 data URL 作为参考图')
  const mime = m[1] || 'image/png'
  const buffer = Buffer.from(m[2], 'base64')
  const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'
  return { buffer, mime, filename: `ref.${ext}` }
}

/**
 * openai-next / draw 网关：GPT 生图（OpenAI Images 兼容）
 * - 文生图：POST /v1/images/generations
 * - 图生图：POST /v1/images/edits（multipart）
 */
export class OpenAINextImageGenerator implements ImageGenerator {
  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    if (!hasDrawKey()) {
      throw new Error('DRAW_API_KEY 未配置，无法调用 GPT 生图')
    }

    const refs =
      input.imageDataUrls && input.imageDataUrls.length > 0
        ? input.imageDataUrls
        : input.imageDataUrl
          ? [input.imageDataUrl]
          : []

    const model = config.drawImageModel
    const size = input.size || config.drawImageSize

    let res: Response
    if (refs.length === 0) {
      res = await drawFetch(
        `${config.drawBaseUrl}/images/generations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.drawApiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt: input.prompt,
            size,
            n: 1,
          }),
        },
        'GPT 文生图',
      )
    } else {
      // 只用前两张，且优先猫照+家居；过大时由上游压缩
      const useRefs = refs.slice(0, 2)
      const form = new FormData()
      form.append('model', model)
      form.append('prompt', input.prompt)
      form.append('size', size)
      form.append('n', '1')
      useRefs.forEach((url, idx) => {
        const { buffer, mime, filename } = dataUrlToBlobParts(url)
        const blob = new Blob([new Uint8Array(buffer)], { type: mime })
        if (idx === 0) form.append('image', blob, filename)
        else form.append(`image${idx}`, blob, `ref-${idx}.${filename.split('.').pop()}`)
      })
      res = await drawFetch(
        `${config.drawBaseUrl}/images/edits`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.drawApiKey}`,
          },
          body: form,
        },
        'GPT 图生图',
      )
    }

    let json: {
      error?: { message?: string }
      data?: Array<{ url?: string; b64_json?: string }>
      model?: string
    }
    try {
      json = (await res.json()) as typeof json
    } catch {
      throw new Error(`GPT 生图返回无法解析（HTTP ${res.status}）`)
    }

    if (!res.ok) {
      throw new Error(json.error?.message || `GPT 生图 HTTP ${res.status}`)
    }

    const first = json.data?.[0]
    if (!first?.url && !first?.b64_json) {
      throw new Error('GPT 生图未返回图片数据')
    }

    return {
      imageUrl: first.url || '',
      b64Json: first.b64_json,
      model: json.model || model,
      provider: 'openai-next-image',
      raw: json,
    }
  }
}
