import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(rootDir, 'public')

// Source du favicon : le P Pedagogia Drive avec la route, sur fond noir.
const markPng = path.join(publicDir, 'brand/pedagogia-drive-p-road.png')
const fullLogo = path.join(publicDir, 'brand/pedagogia-drive-logo.png')

const rasterIcons = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon-48x48.png', 48],
  ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
]

async function renderMarkPng(size, { rounded = false } = {}) {
  let pipeline = sharp(markPng).resize(size, size)

  if (rounded && size >= 180) {
    const radius = Math.round(size * 0.18)
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`,
    )
    pipeline = pipeline.composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
  }

  return pipeline.png().toBuffer()
}

async function generateFromMark() {
  if (!existsSync(markPng)) {
    throw new Error(`Symbole favicon introuvable : ${markPng}`)
  }

  for (const [filename, size] of rasterIcons) {
    const buffer = await renderMarkPng(size, { rounded: size >= 180 })
    writeFileSync(path.join(publicDir, filename), buffer)
  }

  const icoBuffer = await toIco([
    await renderMarkPng(16),
    await renderMarkPng(32),
    await renderMarkPng(48),
  ])
  writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer)
}

async function generateOgImage() {
  if (!existsSync(fullLogo)) {
    console.warn('[favicons] Logo complet introuvable — og-image.png non régénéré.')
    return
  }

  await sharp(fullLogo)
    .resize(1200, 630, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(publicDir, 'og-image.png'))
}

await generateFromMark()
await generateOgImage()

console.log('[favicons] Icônes Pedagogia Drive générées depuis brand/pedagogia-drive-p-road.png')
