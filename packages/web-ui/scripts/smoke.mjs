// Boots the built studio under a real headless Chromium and asserts the app
// wires up end to end: the QR renders, ZXing reads it back (the same decode
// verification the core test suite relies on), the preset options mount, and the
// console stays clean. Run via `pnpm --filter @sqrc/web-ui test:smoke`.
import { preview } from 'vite'
import { chromium } from 'playwright'

const server = await preview({
  logLevel: 'error',
  preview: { port: 0, strictPort: false },
})
const baseUrl = server.resolvedUrls?.local?.[0]
if (!baseUrl) {
  console.error('vite preview did not report a local URL')
  process.exit(2)
}

let exitCode = 1
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 })

  // The opening render lands an SVG inside one of the crossfade layers.
  await page.waitForSelector('#stage-frame svg', { timeout: 15000 })

  // The decode badge must settle on a successful scan, proving the canvas
  // path (toCanvas -> ZXing) works against the aliased core source.
  await page.waitForFunction(
    () =>
      document.querySelector('#decode-badge')?.textContent?.includes('scans'),
    null,
    { timeout: 20000 },
  )

  const presetCount = await page
    .locator('#preset-select [role="option"]:not([aria-disabled="true"])')
    .count()
  const codeLength = await page.evaluate(
    () => document.querySelector('#code-out')?.textContent?.length ?? 0,
  )
  const stats = await page.evaluate(() => ({
    bytes: document.querySelector('#stat-bytes')?.textContent,
    ms: document.querySelector('#stat-ms')?.textContent,
    ecc: document.querySelector('#stat-ecc')?.textContent,
  }))

  console.log('=== SMOKE RESULTS ===')
  console.log(JSON.stringify({ presetCount, codeLength, stats }, null, 2))
  console.log('=== PAGE ERRORS ===')
  console.log(pageErrors.length ? pageErrors.join('\n') : '(none)')
  console.log('=== CONSOLE ERRORS ===')
  console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')

  const ok =
    presetCount === 7 &&
    codeLength > 0 &&
    stats.bytes !== '—' &&
    stats.ecc === 'M' &&
    pageErrors.length === 0 &&
    consoleErrors.length === 0
  exitCode = ok ? 0 : 1
  console.log(ok ? '\nSMOKE TEST: PASS' : '\nSMOKE TEST: FAIL')
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}

process.exit(exitCode)
