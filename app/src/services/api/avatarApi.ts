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
    res = await fetch('/api/avatar/generate', {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new Error(
      '连不上本地后端（8787）。请确认已在 server 目录执行 npm run start，且前端走 Vite 代理。',
    )
  }

  let data: AvatarGenerateResponse
  try {
    data = (await res.json()) as AvatarGenerateResponse
  } catch {
    throw new Error(`生成接口返回异常（HTTP ${res.status}）`)
  }
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `生成失败（HTTP ${res.status}）`)
  }
  return data
}
