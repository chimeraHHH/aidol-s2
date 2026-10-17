import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * rembg 抠透明 PNG，并裁掉透明边（否则首页/头像里猫会显得过小）。
 */
export async function rembgCutout(inputPath: string, outputPath: string): Promise<void> {
  const cacheDir = path.join(os.tmpdir(), 'numba-cache-xm')
  const script = `
import os
os.environ.setdefault("NUMBA_CACHE_DIR", ${JSON.stringify(cacheDir)})
from rembg import remove
from pathlib import Path
from io import BytesIO
try:
    from PIL import Image
except ImportError:
    Image = None

inp = Path(${JSON.stringify(inputPath)})
out = Path(${JSON.stringify(outputPath)})
out.parent.mkdir(parents=True, exist_ok=True)
raw = remove(inp.read_bytes(), alpha_matting=False)

if Image is not None:
    im = Image.open(BytesIO(raw)).convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        # 略留边，避免毛发被切太狠
        pad = max(4, int(min(im.size) * 0.02))
        l, t, r, b = bbox
        l = max(0, l - pad)
        t = max(0, t - pad)
        r = min(im.width, r + pad)
        b = min(im.height, b + pad)
        im = im.crop((l, t, r, b))
    buf = BytesIO()
    im.save(buf, format="PNG")
    out.write_bytes(buf.getvalue())
else:
    out.write_bytes(raw)
print(out)
`
  await new Promise<void>((resolve, reject) => {
    const child = spawn('python3', ['-c', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NUMBA_CACHE_DIR: cacheDir,
      },
    })
    let err = ''
    child.stderr.on('data', (c) => {
      err += String(c)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`rembg 抠图失败 (${code}): ${err.slice(-600)}`))
    })
  })
  await fs.access(outputPath)
}
