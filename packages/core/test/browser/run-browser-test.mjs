// Drives a real headless Chromium against the library served by Vite, so the
// "works in the browser" claim is proven end to end: qrcode is bundled for the
// browser, toSvg returns a string, toCanvas draws into a real DOM 2D context,
// and the Node-only toPng path fails cleanly instead of crashing the page.
//
// Run from the project root with `node test/browser/run-browser-test.mjs`, or
// via `pnpm test:browser`. `playwright` is a devDependency; the Chromium binary
// lives in the Playwright cache (run `pnpm exec playwright install chromium` if
// it is ever missing).
import { createServer } from 'vite'
import { chromium } from 'playwright'

const root = process.cwd()
let exitCode = 1

const server = await createServer({
  root,
  logLevel: 'error',
  // @napi-rs/canvas is a native Node module; keep Vite from pre-bundling it
  // (which would crash the dep optimizer) and let the dynamic import 404 at
  // runtime in the browser, exactly as it would for a real browser consumer
  // that never installed the optional peer.
  optimizeDeps: { exclude: ['@napi-rs/canvas'] },
  server: { port: 0, strictPort: false },
})

await server.listen()
const baseUrl = server.resolvedUrls?.local?.[0]
if (!baseUrl) {
  console.error('vite did not report a local URL after listen()')
  process.exit(2)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const pageErrors = []
  const browserConsole = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))
  page.on('console', (msg) =>
    browserConsole.push(`[${msg.type()}] ${msg.text()}`),
  )

  await page.goto(baseUrl + 'test/browser/index.html', {
    waitUntil: 'load',
    timeout: 30000,
  })
  await page.waitForFunction(
    () => window.__SQRC_RESULTS__ !== undefined,
    null,
    { timeout: 30000 },
  )
  const data = await page.evaluate(() => window.__SQRC_RESULTS__)

  console.log('=== BROWSER RESULTS ===')
  console.log(JSON.stringify(data, null, 2))
  console.log('=== PAGE ERRORS (uncaught) ===')
  console.log(pageErrors.length ? pageErrors.join('\n') : '(none)')
  console.log('=== BROWSER CONSOLE (last 30) ===')
  console.log(browserConsole.slice(-30).join('\n') || '(none)')

  const ok =
    data !== null &&
    typeof data === 'object' &&
    data.allGreen === true &&
    data.fatal !== true &&
    pageErrors.length === 0
  exitCode = ok ? 0 : 1
  console.log(ok ? '\nBROWSER TEST: PASS' : '\nBROWSER TEST: FAIL')
} finally {
  await browser.close()
  await server.close()
}

process.exit(exitCode)
