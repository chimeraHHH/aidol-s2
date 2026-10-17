import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
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
      else reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`))
    })
  })
}

/** 原片 + 倒放拼接 → 无缝循环（首尾天然衔接） */
export async function makeSeamlessLoop(inputMp4: string, outputMp4: string): Promise<void> {
  const dir = path.dirname(outputMp4)
  const reversePath = path.join(dir, `${path.basename(outputMp4, '.mp4')}.reverse.tmp.mp4`)
  await fs.mkdir(dir, { recursive: true })

  try {
    await run('ffmpeg', [
      '-y',
      '-i',
      inputMp4,
      '-vf',
      'reverse',
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      reversePath,
    ])
    await run('ffmpeg', [
      '-y',
      '-i',
      inputMp4,
      '-i',
      reversePath,
      '-filter_complex',
      '[0:v][1:v]concat=n=2:v=1:a=0',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputMp4,
    ])
  } finally {
    await fs.unlink(reversePath).catch(() => undefined)
  }
}

/** Mock：静帧拉成约 5s 原片（几乎静止），再无缝循环 */
export async function stillToMockOriginalThenLoop(
  stillPath: string,
  originalMp4: string,
  loopMp4: string,
  seconds = 5,
): Promise<void> {
  await run('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-i',
    stillPath,
    '-t',
    String(seconds),
    '-vf',
    'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p',
    '-r',
    '24',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-movflags',
    '+faststart',
    originalMp4,
  ])
  await makeSeamlessLoop(originalMp4, loopMp4)
}
