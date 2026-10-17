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
      res.json({
        ok: true,
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        originalVideoUrl: result.originalVideoUrl,
        cutoutUrl: result.cutoutUrl,
        model: result.model,
        provider: result.provider,
        mock: result.mock,
        stages: result.stages,
        tip: result.mock
          ? '当前为 Mock 演示场景。配置 DRAW_API_KEY 后生成真实家居坐垫全景 + 首页抠图。'
          : result.cutoutUrl
            ? '已完成：9:16 家居坐垫全景 → 首页抠图猫层 → 循环视频，已应用到陪伴/首页等。'
            : '已完成家居坐垫全景与循环视频；抠图未成功时首页暂用全景图。',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成失败'
      res.status(502).json({ ok: false, error: message })
    }
  })
})
