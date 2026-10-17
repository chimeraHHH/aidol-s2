import { config, hasArkKey } from '../config.js'
import type { VideoGenerateInput, VideoGenerateResult, VideoGenerator } from './types.js'

type TaskCreateResponse = {
  id?: string
  error?: { message?: string }
}

type TaskQueryResponse = {
  id?: string
  status?: string
  content?: { video_url?: string }
  error?: { message?: string }
  message?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 火山方舟 Seedance：创建图生视频任务并轮询结果
 * POST /contents/generations/tasks
 * GET  /contents/generations/tasks/{id}
 */
export class SeedanceVideoGenerator implements VideoGenerator {
  async generate(input: VideoGenerateInput): Promise<VideoGenerateResult> {
    if (!hasArkKey()) {
      throw new Error('ARK_API_KEY 未配置，无法调用 Seedance')
    }
    if (!input.imageDataUrl) {
      throw new Error('Seedance 图生视频需要首帧图片')
    }

    const content: Array<Record<string, unknown>> = [
      { type: 'text', text: input.prompt },
      {
        type: 'image_url',
        image_url: { url: input.imageDataUrl },
        role: 'first_frame',
      },
    ]

    const createBody = {
      model: config.seedanceModel,
      content,
      duration: input.duration ?? 10,
      ratio: input.ratio ?? '9:16',
      watermark: false,
      generate_audio: input.generateAudio ?? false,
      camera_fixed: true,
    }

    const createRes = await fetch(`${config.arkImageBaseUrl}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.arkApiKey}`,
      },
      body: JSON.stringify(createBody),
    })

    const created = (await createRes.json()) as TaskCreateResponse
    if (!createRes.ok || !created.id) {
      throw new Error(created.error?.message || `Seedance 创建任务失败 HTTP ${createRes.status}`)
    }

    const taskId = created.id
    const deadline = Date.now() + config.seedanceTimeoutMs

    while (Date.now() < deadline) {
      await sleep(config.seedancePollMs)
      const qRes = await fetch(
        `${config.arkImageBaseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`,
        {
          headers: { Authorization: `Bearer ${config.arkApiKey}` },
        },
      )
      const q = (await qRes.json()) as TaskQueryResponse
      if (!qRes.ok) {
        throw new Error(q.error?.message || `Seedance 查询失败 HTTP ${qRes.status}`)
      }

      const status = (q.status || '').toLowerCase()
      if (status === 'succeeded') {
        const videoUrl = q.content?.video_url
        if (!videoUrl) throw new Error('Seedance 成功但未返回 video_url')
        return {
          taskId,
          videoUrl,
          status: 'succeeded',
          model: config.seedanceModel,
          raw: q,
        }
      }
      if (status === 'failed' || status === 'cancelled' || status === 'expired') {
        throw new Error(q.error?.message || q.message || `Seedance 任务失败：${status}`)
      }
    }

    throw new Error('Seedance 任务超时，请稍后在控制台查看任务状态')
  }
}
