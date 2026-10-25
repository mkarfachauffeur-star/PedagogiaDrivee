import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { isRequestPathServed } from './src/lib/publicPaths.js'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

function sendHtml404(res, html) {
  res.statusCode = 404
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Robots-Tag', 'noindex')
  res.end(html)
}

function spa404Plugin() {
  return {
    name: 'spa-404',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const pathname = (req.url ?? '/').split('?')[0]
        if (isRequestPathServed(pathname, { dev: true })) return next()
        if (req.method === 'HEAD') {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('X-Robots-Tag', 'noindex')
          res.end()
          return
        }
        try {
          const raw = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8')
          const html = await server.transformIndexHtml(req.url ?? '/', raw)
          sendHtml404(res, html)
        } catch (error) {
          next(error)
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const pathname = (req.url ?? '/').split('?')[0]
        if (isRequestPathServed(pathname)) return next()
        if (req.method === 'HEAD') {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('X-Robots-Tag', 'noindex')
          res.end()
          return
        }
        try {
          const html = fs.readFileSync(path.join(projectRoot, 'dist', 'index.html'), 'utf8')
          sendHtml404(res, html)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

export default defineConfig({
  // '/' pour Vercel (routes profondes). './' uniquement pour le build Capacitor iOS.
  base: process.env.VITE_CAPACITOR === '1' ? './' : '/',
  // NEXT_PUBLIC_* : convention Next.js / Vercel (ex. GA4)
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [spa404Plugin(), react(), tailwindcss()],
  build: {
    target: 'es2020',
  },
})
