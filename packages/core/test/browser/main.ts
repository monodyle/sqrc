import { QRCode } from '../../src/index.ts'

type Results = Record<string, unknown>

const results: Results = {}
const consoleErrors: string[] = []

const originalError = console.error
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map(String).join(' '))
  originalError(...args)
}

function setStatus(text: string): void {
  const el = document.getElementById('status')
  if (el) el.textContent = text
}

// 1x1 red PNG, reused as a logo source so the browser test stays network-free.
const LOGO_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function countDarkPixels(data: Uint8ClampedArray): number {
  let dark = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r < 128 && g < 128 && b < 128) dark++
  }
  return dark
}

async function run(): Promise<void> {
  const qr = new QRCode('https://github.com/monodyle/sqrc', {
    errorCorrectionLevel: 'M',
  })

  // 1. toSvg returns a well-formed SVG string with no native deps.
  const svg = await qr.toSvg(256)
  results.svgIsString = typeof svg === 'string'
  results.svgHasRoot = svg.startsWith('<svg') && svg.endsWith('</svg>')
  results.svgHasPath = svg.includes('<path')
  results.svgHasBackground = svg.includes('fill="#fff"')

  // 2. toSvg honors shape + solid colors.
  const svgCircle = await qr.toSvg(256, {
    shape: 'circle',
    foreground: '#1a1a2e',
    background: '#f4f4f4',
  })
  results.svgCircleColor = svgCircle.includes('fill="#1a1a2e"')
  results.svgCircleBg = svgCircle.includes('fill="#f4f4f4"')

  // 3. toSvg renders a gradient as a <defs> gradient (the browser path that
  //    used to produce invisible eyes must stay readable).
  const svgGrad = await qr.toSvg(256, {
    foreground: {
      from: '#0f0f2d',
      to: '#00040a',
      type: 'linear',
      rotation: Math.PI / 4,
    },
  })
  results.svgGradientDef = svgGrad.includes('<linearGradient')
  results.svgGradientRef = svgGrad.includes('fill="url(#sqrc-grad-0)"')

  // 4. toSvg splits per-eye colors into separate fills.
  const svgEyes = await qr.toSvg(256, {
    eyeColor: ['#7f0000', '#004d00', '#00004d'],
  })
  results.svgEye0 = svgEyes.includes('fill="#7f0000"')
  results.svgEye1 = svgEyes.includes('fill="#004d00"')
  results.svgEye2 = svgEyes.includes('fill="#00004d"')

  // 5. toSvg with a data-URL logo embeds it as a base64 <image>.
  const svgLogo = await qr.toSvg(256, {
    errorCorrectionLevel: 'H',
    logo: { url: LOGO_DATA_URL, width: 40, height: 40 },
  } as Parameters<typeof qr.toSvg>[1])
  results.svgLogoImage = svgLogo.includes('<image href="data:image/png;base64,')

  // 6. toCanvas replays the geometry into a real DOM 2D context.
  const canvas = document.getElementById('canvas')
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('test harness: #canvas is missing or not a canvas element')
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (ctx === null) {
    throw new Error('test harness: could not acquire a 2D context')
  }
  await qr.toCanvas(ctx, 256, { shape: 'rounded' })
  const imageData = ctx.getImageData(0, 0, 256, 256)
  results.canvasDrewModules = countDarkPixels(imageData.data) > 100

  // 7. toCanvas with a gradient fill does not throw on a DOM context.
  ctx.clearRect(0, 0, 256, 256)
  await qr.toCanvas(ctx, 256, {
    foreground: { from: '#0f0f2d', to: '#00040a' },
  })
  results.canvasGradientDrew =
    countDarkPixels(ctx.getImageData(0, 0, 256, 256).data) > 100

  // Render one SVG into the page so a human (or a screenshot) can eyeball it.
  const container = document.getElementById('svg-container')
  if (container) container.innerHTML = svgEyes

  // Snapshot here so the expected @napi-rs/canvas failure in step 8 does not
  // pollute the SVG/canvas cleanliness check in step 9.
  const consoleErrorCountBeforePng = consoleErrors.length

  // 8. toPng is the Node-only path; in a browser the dynamic import of
  //    @napi-rs/canvas must fail cleanly rather than crash the page.
  try {
    await qr.toPng(256)
    results.toPngRejected = false
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    results.toPngRejected = true
    results.toPngErrorMessage = message
    // The native peer cannot load in a browser, so toPng must reject with the
    // actionable message the library throws, not a cryptic native error.
    results.toPngErrorIsActionable =
      /node|browser|@napi-rs|peer|not support/i.test(message)
  }

  // 9. The SVG/canvas paths must not have logged any errors (a stray Node-only
  //    reference would surface here as an uncaught/console error).
  results.noConsoleErrorsOnSvgCanvas = consoleErrorCountBeforePng === 0
  results.consoleErrors = consoleErrors

  const booleans = Object.entries(results).filter(
    ([, v]) => typeof v === 'boolean',
  )
  const failed = booleans.filter(([, v]) => v === false).map(([k]) => k)
  results.allGreen = failed.length === 0
  results.failedChecks = failed

  setStatus(JSON.stringify(results, null, 2))
  ;(window as unknown as Record<string, unknown>).__SQRC_RESULTS__ = results
}

run().catch((err: unknown) => {
  const payload = {
    fatal: true,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    consoleErrors,
  }
  setStatus('FATAL: ' + JSON.stringify(payload, null, 2))
  ;(window as unknown as Record<string, unknown>).__SQRC_RESULTS__ = payload
})
