import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        timeout: 900_000,
        proxyTimeout: 900_000,
      },
      '/generated': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      // 本机原生 JDY 桥接：PhysicalScaleReader → start_viewer.py(:18765)
      '/jdy-bridge': {
        target: 'http://127.0.0.1:18765',
        changeOrigin: true,
        rewrite: (path) => {
          const rest = path.replace(/^\/jdy-bridge/, '')
          return rest === '' ? '/' : rest
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.setHeader('host', '127.0.0.1:18765')
          })
        },
      },
    },
  },
})
