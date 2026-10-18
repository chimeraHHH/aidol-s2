import { build } from 'esbuild';
import fs from 'node:fs/promises';
await fs.mkdir('public/assets', { recursive: true });
await build({ entryPoints: ['src/control.js', 'src/screen.js'], outdir: 'public/assets', bundle: true, minify: true, format: 'esm', target: ['chrome100'] });
console.log('Built controller and screen.');
