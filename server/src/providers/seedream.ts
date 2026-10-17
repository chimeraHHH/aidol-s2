import { config, hasArkKey } from '../config.js'
import type { ImageGenerateInput, ImageGenerateResult, ImageGenerator } from './types.js'

/**
 * 火山方舟 Seedream 图片生成（含图生图）
 * POST {ARK_IMAGE_BASE_URL}/images/generations
 *
 * 说明：用户口语里的「Seedance」是视频模型；静态 3D 猫形象应对接 Seedream。
 */
export class SeedreamImageGenerator implements ImageGenerator {
  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    if (!hasArkKey()) {
      throw new Error('ARK_API_KEY 未配置，无法调用 Seedream')
    }

    const images =
      input.imageDataUrls && input.imageDataUrls.length > 0
        ? input.imageDataUrls
        : input.imageDataUrl
          ? [input.imageDataUrl]
          : undefined
    if (!images?.length) {
      throw new Error('Seedream 需要至少一张参考图')
    }

    const body = {
      model: config.seedreamModel,
      prompt: input.prompt,
      image: images.length === 1 ? images[0] : images,
      size: input.size || '2K',
      response_format: 'url',
      watermark: input.watermark ?? false,
      sequential_image_generation: 'disabled',
    }

    const res = await fetch(`${config.arkImageBaseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.arkApiKey}`,
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json()) as {
      error?: { message?: string; code?: string }
      data?: Array<{ url?: string; b64_json?: string }>
      model?: string
    }

    if (!res.ok) {
      const msg = json.error?.message || `Seedream HTTP ${res.status}`
      throw new Error(msg)
    }

    const first = json.data?.[0]
    if (!first?.url && !first?.b64_json) {
      throw new Error('Seedream 未返回图片数据')
    }

    return {
      imageUrl: first.url || '',
      b64Json: first.b64_json,
      model: json.model || config.seedreamModel,
      provider: 'seedream',
      raw: json,
    }
  }
}
