import { apiUrl } from '@/shared/lib/apiBase'

export type AvatarGenerateResponse = {
  ok: boolean
  imageUrl?: string
  videoUrl?: string
  originalVideoUrl?: string
  /** 透明底猫层，首页 hero 用 */
  cutoutUrl?: string
  model?: string
  provider?: string
  mock?: boolean
  tip?: string
  error?: string
  stages?: string[]
}

/** 上传猫照 → 坐垫合成静帧 + 无缝循环陪伴背景视频 */
export async function generateCatAvatar(file: File): Promise<AvatarGenerateResponse> {
  const form = new FormData()
  form.append('photo', file)

  let res: Response
  try {
    res = await fetch(apiUrl('/api/avatar/generate'), {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new Error(
      '连不上生成服务。本地请启动 server（8787）；上线请配置 VITE_API_BASE 指向后端。',
    )
  }

  const raw = await res.text()
  let data: AvatarGenerateResponse
  try {
    data = JSON.parse(raw) as AvatarGenerateResponse
  } catch {
    if (res.status === 502 || res.status === 504) {
      throw new Error(
        '生成中断（代理 502/504）。常见原因：后端重启、云端生图/视频超时。请确认 server 在跑后重试；静帧通常仍可成功。',
      )
    }
    throw new Error(
      `生成接口返回异常（HTTP ${res.status}）${raw.trim() ? `：${raw.slice(0, 120)}` : ''}`,
    )
  }
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `生成失败（HTTP ${res.status}）`)
  }
  return data
}
