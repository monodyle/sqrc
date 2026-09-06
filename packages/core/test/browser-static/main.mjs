// Pure-JS browser test that imports the BUILT, self-contained browser bundle
// (no bundler, no TypeScript, no transform) and exercises the public API.
import { QRCode } from '/dist/browser/index.mjs'

const VALUE = 'https://github.com/monodyle/sqrc'
const SIZE = 300

const results = { cases: {}, meta: {} }

async function renderPixels(qr, options) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  await qr.toCanvas(ctx, SIZE, options)
  const { data, width, height } = ctx.getImageData(0, 0, SIZE, SIZE)
  return { data: Array.from(data), width, height }
}

try {
  const qr = new QRCode(VALUE, { errorCorrectionLevel: 'M' })
  const qrH = new QRCode(VALUE, { errorCorrectionLevel: 'H' })

  // SVG path: must return a well-formed SVG string with zero native deps.
  const svg = await qr.toSvg(SIZE)
  results.meta.svgIsString = typeof svg === 'string'
  results.meta.svgWellFormed = svg.startsWith('<svg') && svg.endsWith('</svg>')
  results.meta.svgHasPath = svg.includes('<path')

  // Canvas path across module shapes + colors; each is decoded back in Node.
  const cases = [
    ['default', qr, undefined],
    ['square', qr, { shape: 'square' }],
    ['circle', qr, { shape: 'circle' }],
    ['diamond', qr, { shape: 'diamond' }],
    ['gradient', qr, { foreground: { from: '#0f0f2d', to: '#00040a' } }],
    ['eyeColor', qrH, { eyeColor: ['#7f0000', '#004d00', '#00004d'] }],
  ]

  for (const [name, instance, options] of cases) {
    results.cases[name] = await renderPixels(instance, options)
  }

  // toPng is Node-only; in a browser the native dynamic import must reject
  // cleanly rather than crash the page.
  try {
    await qr.toPng(SIZE)
    results.meta.toPngRejected = false
  } catch (err) {
    results.meta.toPngRejected = true
    results.meta.toPngMessage = String(err && err.message)
  }

  window.__SQRC_STATIC__ = { value: VALUE, results }
} catch (err) {
  window.__SQRC_STATIC__ = {
    value: VALUE,
    fatal: true,
    message: String(err && err.message),
    stack: err && err.stack,
  }
}
