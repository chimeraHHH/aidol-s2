import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config.js'
import type { ImageGenerateInput, ImageGenerateResult, ImageGenerator } from './types.js'

/**
 * 无 API Key 时的本地 Mock：复制现成 3D 风格海报，便于打通上传 → 预览 → 应用全链路。
 */
export class MockImageGenerator implements ImageGenerator {
  async generate(_input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const id = `mock-${Date.now()}`
    const destName = `${id}.png`
    const destPath = path.join(config.generatedDir, destName)

    try {
      await fs.copyFile(config.styleRefPath, destPath)
    } catch {
      await fs.writeFile(
        destPath,
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      )
    }

    return {
      imageUrl: `/generated/${destName}`,
      model: 'mock-local',
      provider: 'mock',
    }
  }
}
