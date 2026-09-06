// Proves the BUILT browser bundle works on a plain static web server with pure
// JS - no bundler, no dev server, no transform. A minimal node:http server
// serves the repo as-is (so /dist/browser/* resolves exactly as it would on a
// static host), Playwright loads the page, and the canvas-rendered QR codes are
// decoded back with ZXing to prove they actually scan.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'
import { readBarcodes } from 'zxing-wasm/reader'

const ROOT = process.cwd()
const MIME = {
  '.html': 'text/html',
  '.mjs': 'text/javascript',
  '.js': 'application/javascript',
}

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  const filePath = normalize(join(ROOT, urlPath))
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  try {
    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})
await new Promise((resolve) => server.listen(0, resolve))
const port = server.address().port
const base = `http://localhost:${port}`

let exitCode = 1
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  await page.goto(`${base}/test/browser-static/index.html`, {
    waitUntil: 'load',
    timeout: 30000,
  })
  await page.waitForFunction(() => window.__SQRC_STATIC__ !== undefined, null, {
    timeout: 30000,
  })
  const payload = await page.evaluate(() => window.__SQRC_STATIC__)

  if (payload.fatal) {
    console.log('=== FATAL (page threw) ===')
    console.log(JSON.stringify(payload, null, 2))
    console.log('\nSTATIC BROWSER TEST: FAIL')
    process.exit(1)
  }

  const { value, results } = payload

  // Decode each canvas-rendered QR back to its source value.
  const decoded = {}
  let allDecode = true
  for (const [name, px] of Object.entries(results.cases)) {
    const [res] = await readBarcodes(
      { data: new Uint8ClampedArray(px.data), width: px.width, height: px.height },
      { formats: ['QRCode'], tryHarder: true },
    )
    decoded[name] = res ? res.text : null
    if (!res || res.text !== value) allDecode = false
  }

  console.log('=== META ===')
  console.log(JSON.stringify(results.meta, null, 2))
  console.log(`=== DECODE (expected: ${value}) ===`)
  console.log(JSON.stringify(decoded, null, 2))
  console.log('=== PAGE ERRORS (uncaught) ===')
  console.log(pageErrors.length ? pageErrors.join('\n') : '(none)')
  console.log('=== CONSOLE ERRORS ===')
  console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')

  const metaOk =
    results.meta.svgIsString === true &&
    results.meta.svgWellFormed === true &&
    results.meta.svgHasPath === true &&
    results.meta.toPngRejected === true

  const ok = metaOk && allDecode && pageErrors.length === 0
  exitCode = ok ? 0 : 1
  console.log(
    ok ? '\nSTATIC BROWSER TEST: PASS' : '\nSTATIC BROWSER TEST: FAIL',
  )
} finally {
  await browser.close()
  server.close()
}
process.exit(exitCode)
