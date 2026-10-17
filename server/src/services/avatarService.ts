import { generateCompanionSceneFromUpload } from './companionSceneService.js'

/**
 * 拍照上传入口：识别猫主体 → 坐垫合成静帧 → Seedance 原片 → ffmpeg 无缝循环
 * （兼容旧前端字段 imageUrl，并额外返回 videoUrl）
 */
export async function generateCatAvatarFromUpload(file: {
  buffer: Buffer
  mimetype: string
}): Promise<{
  imageUrl: string
  videoUrl: string
  originalVideoUrl?: string
  model: string
  provider: string
  mock: boolean
  stages: string[]
}> {
  return generateCompanionSceneFromUpload(file)
}
