import { Router } from 'express'
import multer from 'multer'
import { generateCatAvatarFromUpload } from '../services/avatarService.js'

export const avatarRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('仅支持图片文件'))
      return
    }
    cb(null, true)
  },
})

/**
 * POST /api/avatar/generate
 * multipart field: photo
 * → 静帧合成 + Seedance 原片 + ffmpeg 无缝循环
 */
avatarRouter.post('/generate', (req, res) => {
  // 视频生成可能较久
  req.setTimeout(15 * 60 * 1000)
  res.setTimeout(15 * 60 * 1000)

  upload.single('photo')(req, res, async (err) => {
    if (err) {
      res.status(400).json({ ok: false, error: err.message || '上传失败' })
      return
    }
    if (!req.file) {
      res.status(400).json({ ok: false, error: '请上传字段名为 photo 的猫咪照片' })
      return
    }

    try {
      const result = await generateCatAvatarFromUpload({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      })
      const stages = result.stages || []
      const ranCloudVideo =
        stages.includes('draw-seedance') || stages.includes('ark-seedance')
      const videoFallback = stages.includes('video-fallback-ffmpeg')
      let tip: string
      if (result.mock) {
        tip =
          '当前为 Mock 演示。配置 DRAW_API_KEY 后可生成真实静帧 + Seedance 动态视频。'
      } else if (ranCloudVideo) {
        tip =
          '已完成：家居静帧 → Seedance 动态视频 → 无缝循环。请打开「陪伴」页查看会动的背景。'
      } else if (videoFallback) {
        tip =
          '静帧与抠图已生成，但云端视频失败，已用静帧做成循环底片（几乎不动）。请重试生成以拉 Seedance。'
      } else if (result.cutoutUrl) {
        tip = '已完成家居静帧与循环视频，已应用到陪伴/首页等。'
      } else {
        tip = '已完成家居静帧与循环视频；抠图未成功时首页暂用全景图。'
      }

      res.json({
        ok: true,
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        originalVideoUrl: result.originalVideoUrl,
        cutoutUrl: result.cutoutUrl,
        model: result.model,
        provider: result.provider,
        mock: result.mock,
        stages,
        tip,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成失败'
      console.error('[avatar/generate] failed:', message)
      if (!res.headersSent) {
        res.status(502).json({ ok: false, error: message })
      }
    }
  })
})
