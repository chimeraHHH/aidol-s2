import { config, hasDrawKey } from '../config.js'
import { drawFetch, formatFetchError } from '../utils/drawFetch.js'
import type { VideoGenerateInput, VideoGenerateResult, VideoGenerator } from './types.js'

type CreateVideoResponse = {
  id?: string
  status?: string
  error?: { message?: string }
  message?: string
}

type TaskQueryResponse = {
  id?: string
  status?: string
  progress?: string
  fail_reason?: string
  data?: {
    video_url?: string
    url?: string
    output?: string | { url?: string }
  }
  error?: { message?: string }
  message?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function extractVideoUrl(q: TaskQueryResponse): string | undefined {
  const data = q.data
  if (!data) return undefined
  if (typeof data.video_url === 'string' && data.video_url) return data.video_url
  if (typeof data.url === 'string' && data.url) return data.url
  if (typeof data.output === 'string' && data.output) return data.output
  if (data.output && typeof data.output === 'object' && data.output.url) return data.output.url
  return undefined
}

/**
 * draw.openai-next.com 视频：
 * POST /v1/videos 创建任务
 * GET  /v1/tasks/{id} 轮询
 *
 * 可用模型含 doubao-seedance-*（已实测可创建）；sora-2-hd 当前价目未配置会 403。
 */
export class OpenAINextVideoGenerator implements VideoGenerator {
  async generate(input: VideoGenerateInput): Promise<VideoGenerateResult> {
    if (!hasDrawKey()) {
      throw new Error('DRAW_API_KEY 未配置，无法调用视频接口')
    }

    const seconds = String(input.duration ?? config.companionVideoDurationSec)
    const body: Record<string, unknown> = {
      model: config.drawVideoModel,
      prompt: input.prompt,
      seconds,
      size: config.drawVideoSize,
    }
    if (input.imageDataUrl) {
      // 网关同时认 image / image_url
      body.image = input.imageDataUrl
      body.image_url = input.imageDataUrl
    }

    let createRes: Response
    try {
      createRes = await drawFetch(
        `${config.drawBaseUrl}/videos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.drawApiKey}`,
          },
          body: JSON.stringify(body),
        },
        '视频创建',
        1,
      )
    } catch (err) {
      throw formatFetchError(err, '视频创建')
    }
    const created = (await createRes.json()) as CreateVideoResponse
    if (!createRes.ok || !created.id) {
      throw new Error(
        created.error?.message || created.message || `视频创建失败 HTTP ${createRes.status}`,
      )
    }

    const taskId = created.id
    const deadline = Date.now() + config.seedanceTimeoutMs
    const base = config.drawBaseUrl.replace(/\/v1\/?$/, '')

    while (Date.now() < deadline) {
      await sleep(config.seedancePollMs)
      let qRes: Response
      try {
        qRes = await drawFetch(
          `${base}/v1/tasks/${encodeURIComponent(taskId)}`,
          { headers: { Authorization: `Bearer ${config.drawApiKey}` } },
          '视频查询',
          1,
        )
      } catch (err) {
        throw formatFetchError(err, '视频查询')
      }
      const q = (await qRes.json()) as TaskQueryResponse
      if (!qRes.ok) {
        throw new Error(q.error?.message || q.message || `视频查询失败 HTTP ${qRes.status}`)
      }

      const status = (q.status || '').toUpperCase()
      if (status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'COMPLETED') {
        const videoUrl = extractVideoUrl(q)
        if (!videoUrl) throw new Error('视频任务成功但未返回 url')
        return {
          taskId,
          videoUrl,
          status: 'succeeded',
          model: config.drawVideoModel,
          raw: q,
        }
      }
      if (
        status === 'FAILURE' ||
        status === 'FAILED' ||
        status === 'CANCELLED' ||
        status === 'ERROR'
      ) {
        throw new Error(q.fail_reason || q.error?.message || q.message || `视频失败：${status}`)
      }
    }

    throw new Error('视频任务超时')
  }
}
