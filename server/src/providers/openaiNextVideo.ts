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
  data?: unknown
  result?: unknown
  content?: unknown
  error?: { message?: string }
  message?: string
  [key: string]: unknown
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function looksLikeVideoUrl(s: string): boolean {
  if (!/^https?:\/\//i.test(s)) return false
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(s)) return true
  if (/\/cdn\/|filesystem\.site|video/i.test(s)) return true
  return false
}

/** 网关成功态字段不稳定：递归捞第一个像视频的 URL */
function extractVideoUrl(q: unknown): string | undefined {
  const seen = new Set<unknown>()
  const stack: unknown[] = [q]
  while (stack.length) {
    const cur = stack.pop()
    if (!cur || seen.has(cur)) continue
    seen.add(cur)
    if (typeof cur === 'string') {
      if (looksLikeVideoUrl(cur)) return cur
      continue
    }
    if (Array.isArray(cur)) {
      for (const x of cur) stack.push(x)
      continue
    }
    if (typeof cur === 'object') {
      const obj = cur as Record<string, unknown>
      for (const key of [
        'video_url',
        'url',
        'output',
        'file_url',
        'download_url',
        'video',
      ]) {
        const v = obj[key]
        if (typeof v === 'string' && looksLikeVideoUrl(v)) return v
      }
      for (const v of Object.values(obj)) stack.push(v)
    }
  }
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
