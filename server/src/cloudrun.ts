import { createApp } from './createApp.js'

const port = Number(process.env.PORT || 8787)
const app = createApp()

app.listen(port, '0.0.0.0', () => {
  console.log(`[xiaomi-server] CloudBase/CloudRun listening on ${port}`)
})
