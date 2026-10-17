import { config } from './config.js'
import { createApp } from './createApp.js'

const app = createApp()

/** CloudBase / 云托管可直接 require 导出的 app */
export default app
export { app }

const isManagedRuntime =
  process.env.VERCEL === '1' ||
  process.env.TCB_RUN === '1' ||
  process.env.CLOUDBASE_RUN === '1'

if (!isManagedRuntime) {
  app.listen(config.port, () => {
    console.log(`[xiaomi-server] http://localhost:${config.port}`)
    console.log(`[xiaomi-server] health → GET /api/health`)
    console.log(`[xiaomi-server] avatar → POST /api/avatar/generate`)
    console.log(`[xiaomi-server] llm    → POST /api/llm/chat | /api/llm/video`)
    console.log(`[xiaomi-server] companion → POST /api/companion/chat | GET /api/companion/memory`)
  })
}
