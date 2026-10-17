import fs from 'node:fs/promises'
import path from 'node:path'
import { config, hasArkKey, hasDrawKey, hasImageProvider } from '../config.js'
import {
  COMPANION_STILL_PROMPT,
  COMPANION_VIDEO_PROMPT,
} from '../prompts/companionScene.js'
import { MockImageGenerator } from '../providers/mockImage.js'
import { OpenAINextImageGenerator } from '../providers/openaiNextImage.js'
import { OpenAINextVideoGenerator } from '../providers/openaiNextVideo.js'
import { SeedanceVideoGenerator } from '../providers/seedance.js'
import { SeedreamImageGenerator } from '../providers/seedream.js'
import { makeSeamlessLoop, stillToMockOriginalThenLoop } from '../utils/ffmpegLoop.js'
import { bufferToDataUrl, compressImageForDraw } from '../utils/imageCompress.js'
import { rembgCutout } from '../utils/rembgCutout.js'

export type CompanionSceneResult = {
  /** 家居全景静帧（陪伴 poster） */
  imageUrl: string
  videoUrl: string
  originalVideoUrl?: string
  /** 透明底猫层（首页 hero 用） */
  cutoutUrl?: string
  model: string
  provider: string
  mock: boolean
  stages: string[]
}

async function fileToDataUrl(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}: ${url.slice(0, 80)}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(destPath, buf)
}

async function persistStillFromGenerator(result: {
  imageUrl: string
  b64Json?: string
}): Promise<{ localUrl: string; absolutePath: string }> {
  const id = `scene-still-${Date.now()}`
  let buf: Buffer
  let ext = 'png'

  if (result.b64Json) {
    buf = Buffer.from(result.b64Json, 'base64')
  } else if (result.imageUrl.startsWith('/generated/')) {
    return {
      localUrl: result.imageUrl,
      absolutePath: path.join(config.generatedDir, path.basename(result.imageUrl)),
    }
  } else if (result.imageUrl.startsWith('http')) {
    const res = await fetch(result.imageUrl)
    if (!res.ok) throw new Error(`下载合成图失败 HTTP ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg'
    else if (ct.includes('webp')) ext = 'webp'
    buf = Buffer.from(await res.arrayBuffer())
  } else {
    throw new Error('无法解析合成图数据')
  }

  const filename = `${id}.${ext}`
  const absolutePath = path.join(config.generatedDir, filename)
  await fs.writeFile(absolutePath, buf)
  return { localUrl: `/generated/${filename}`, absolutePath }
}

/**
 * 完整流水线：
 * 1) 静帧：优先 GPT（draw.openai-next）图生图；否则方舟 Seedream
 * 2) 视频：优先 draw 网关 Seedance（/v1/videos）；否则方舟 Seedance；否则 Mock
 * 3) ffmpeg：原片 + 倒放 → 无缝循环
 */
export async function generateCompanionSceneFromUpload(file: {
  buffer: Buffer
  mimetype: string
}): Promise<CompanionSceneResult> {
  const stages: string[] = []
  const stamp = Date.now()
  const compressed = await compressImageForDraw(
    file.buffer,
    file.mimetype || 'image/jpeg',
  )
  const catDataUrl = bufferToDataUrl(compressed.buffer, compressed.mimetype)
  if (compressed.buffer.length < file.buffer.length) {
    stages.push('compress-upload')
  }

  await fs.mkdir(config.generatedDir, { recursive: true })

  // —— 1) 静帧：猫坐在家居垫子上 ——
  stages.push('still')
  let stillLocalUrl: string
  let stillAbsPath: string
  let stillModel = 'mock-local'
  let provider = 'mock'
  let mock = true
  /** 远端静帧 URL（视频接口更稳，避免再传巨型 data URL） */
  let stillRemoteUrl: string | undefined

  if (hasImageProvider()) {
    const roomDataUrl = await fileToDataUrl(config.homeRoomCushionPath)
    // 猫照在前（身份锁定），家居在后（场景构图）——避免生成「另一只猫」
    const stillResult = hasDrawKey()
      ? await new OpenAINextImageGenerator().generate({
          imageDataUrls: [catDataUrl, roomDataUrl],
          prompt: COMPANION_STILL_PROMPT,
          size: config.drawImageSize,
        })
      : await new SeedreamImageGenerator().generate({
          imageDataUrls: [catDataUrl, roomDataUrl],
          prompt: COMPANION_STILL_PROMPT,
          size: '2K',
          watermark: false,
        })
    const saved = await persistStillFromGenerator(stillResult)
    stillLocalUrl = saved.localUrl
    stillAbsPath = saved.absolutePath
    stillRemoteUrl = stillResult.imageUrl.startsWith('http') ? stillResult.imageUrl : undefined
    stillModel = stillResult.model
    provider = hasDrawKey() ? 'gpt-image+seedance' : 'seedream+seedance'
    mock = false
    stages.push(hasDrawKey() ? 'gpt-still' : 'seedream-still')
  } else {
    if (!config.allowMockAvatar) {
      throw new Error('未配置 DRAW_API_KEY / ARK_API_KEY，且 ALLOW_MOCK_AVATAR=false')
    }
    const mockGen = new MockImageGenerator()
    const mockStill = await mockGen.generate({
      imageDataUrl: catDataUrl,
      prompt: COMPANION_STILL_PROMPT,
    })
    try {
      const dest = path.join(config.generatedDir, `scene-still-mock-${stamp}.jpg`)
      await fs.copyFile(config.homeRoomCushionPath, dest)
      stillLocalUrl = `/generated/${path.basename(dest)}`
      stillAbsPath = dest
    } catch {
      const saved = await persistStillFromGenerator(mockStill)
      stillLocalUrl = saved.localUrl
      stillAbsPath = saved.absolutePath
    }
    stages.push('mock-still')
  }

  // —— 2) 首页猫层抠图（透明 PNG）——
  let cutoutUrl: string | undefined
  const cutoutPath = path.join(config.generatedDir, `scene-cutout-${stamp}.png`)
  try {
    stages.push('rembg-cutout')
    await rembgCutout(stillAbsPath, cutoutPath)
    cutoutUrl = `/generated/${path.basename(cutoutPath)}`
  } catch (cutErr) {
    console.warn('[companionScene] rembg failed:', cutErr)
    stages.push('rembg-skipped')
  }

  // —— 3) 原片视频 ——
  stages.push('video-original')
  const originalPath = path.join(config.generatedDir, `scene-original-${stamp}.mp4`)
  const loopPath = path.join(config.generatedDir, `scene-loop-${stamp}.mp4`)

  const finishWithLoop = async (opts: {
    provider: string
    mock: boolean
    ranCloudVideo: boolean
  }): Promise<CompanionSceneResult> => {
    if (!opts.ranCloudVideo) {
      await stillToMockOriginalThenLoop(
        stillAbsPath,
        originalPath,
        loopPath,
        Math.min(5, config.companionVideoDurationSec),
      )
      stages.push(opts.mock ? 'mock-video+ffmpeg-loop' : 'video-fallback-ffmpeg')
    } else {
      stages.push('ffmpeg-seamless-loop')
      await makeSeamlessLoop(originalPath, loopPath)
    }
    return {
      imageUrl: stillLocalUrl,
      videoUrl: `/generated/${path.basename(loopPath)}`,
      originalVideoUrl: `/generated/${path.basename(originalPath)}`,
      cutoutUrl,
      model: stillModel,
      provider: opts.provider,
      mock: opts.mock,
      stages,
    }
  }

  if (!mock && (hasDrawKey() || hasArkKey())) {
    try {
      const stillForVideo =
        stillRemoteUrl ||
        (() => {
          throw new Error('缺少远端静帧 URL，跳过云端视频')
        })()
      const videoResult = hasDrawKey()
        ? await new OpenAINextVideoGenerator().generate({
            prompt: COMPANION_VIDEO_PROMPT,
            imageDataUrl: stillForVideo,
            duration: config.companionVideoDurationSec,
            ratio: '9:16',
            generateAudio: false,
          })
        : await new SeedanceVideoGenerator().generate({
            prompt: COMPANION_VIDEO_PROMPT,
            imageDataUrl: stillForVideo,
            duration: config.companionVideoDurationSec,
            ratio: '9:16',
            generateAudio: false,
          })
      if (!videoResult.videoUrl) throw new Error('视频未返回地址')
      await downloadToFile(videoResult.videoUrl, originalPath)
      stillModel = `${stillModel}+${videoResult.model}`
      stages.push(hasDrawKey() ? 'draw-seedance' : 'ark-seedance')
      return finishWithLoop({ provider, mock: false, ranCloudVideo: true })
    } catch (videoErr) {
      console.warn('[companionScene] video failed, fallback ffmpeg loop:', videoErr)
      return finishWithLoop({
        provider: `${provider}+video-fallback`,
        mock: false,
        ranCloudVideo: false,
      })
    }
  }

  return finishWithLoop({ provider: 'mock', mock: true, ranCloudVideo: false })
}
