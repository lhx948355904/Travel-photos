import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { get as httpsGet } from 'node:https'

const COS_MEDIA_HOST = 'travel-1255378306.cos.ap-guangzhou.myqcloud.com'

const cosMediaDevProxy = (): Plugin => ({
  name: 'cos-media-dev-proxy',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const requestUrl = request.url || ''
      if (!requestUrl.startsWith('/cos-media/')) {
        next()
        return
      }

      const upstreamPath = requestUrl.slice('/cos-media'.length)
      const upstreamRequest = httpsGet(
        `https://${COS_MEDIA_HOST}${upstreamPath}`,
        {
          headers: {
            host: COS_MEDIA_HOST,
            'user-agent': 'TravelPhotoMap/1.0',
          },
        },
        (upstreamResponse) => {
          response.statusCode = upstreamResponse.statusCode || 502
          for (const header of ['content-type', 'content-length', 'etag', 'last-modified']) {
            const value = upstreamResponse.headers[header]
            if (value) response.setHeader(header, value)
          }
          response.setHeader('Cache-Control', 'public, max-age=2592000')
          upstreamResponse.pipe(response)
        },
      )
      upstreamRequest.on('error', () => {
        if (!response.headersSent) response.statusCode = 502
        response.end('Media proxy unavailable')
      })
    })
  },
})

export default defineConfig({
  plugins: [react(), cosMediaDevProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      '/ws': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
