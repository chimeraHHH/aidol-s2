import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    child.stderr.on('data', (chunk) => {
      err += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg 压缩失败 (${code}): ${err.slice(-400)}`))
    })
  })
}

/**
 * 压到适合网关上传的 JPEG（最长边 1280），避免手机原图过大导致 fetch failed。
 */
export async function compressImageForDraw(
  buffer: Buffer,
  mimetype: string,
): Promise<{ buffer: Buffer; mimetype: string }> {
  // 已较小则跳过
  if (buffer.length <= 900_000 && !mimetype.includes('heic') && !mimetype.includes('heif')) {
    return { buffer, mimetype }
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'xm-img-'))
  const ext = mimetype.includes('png') ? 'png' : 'jpg'
  const input = path.join(tmp, `in.${ext}`)
  const output = path.join(tmp, 'out.jpg')

  try {
    await fs.writeFile(input, buffer)
    await run('ffmpeg', [
      '-y',
      '-i',
      input,
      '-vf',
      "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease",
      '-q:v',
      '5',
      output,
    ])
    const out = await fs.readFile(output)
    return { buffer: out, mimetype: 'image/jpeg' }
  } catch {
    // 无 ffmpeg 或失败时退回原图
    return { buffer, mimetype }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
  }
}

export function bufferToDataUrl(buffer: Buffer, mimetype: string): string {
  return `data:${mimetype};base64,${buffer.toString('base64')}`
}
