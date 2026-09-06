import { readBarcodes } from 'zxing-wasm/reader'
import { QRCode } from 'sqrc'
import { $, loadImage } from './lib/dom'
import { buildOptions } from './lib/options'
import type { StudioState } from './lib/types'
import { store } from './state'

const PREVIEW_SIZE = 640
const DECODE_SIZE = 512

const layers = [$('#qr-a'), $('#qr-b')]
const badge = $<HTMLSpanElement>('#decode-badge')
const emptyState = $<HTMLDivElement>('#stage-empty')

const statPx = $<HTMLElement>('#stat-px')
const statBytes = $<HTMLElement>('#stat-bytes')
const statMs = $<HTMLElement>('#stat-ms')
const statEcc = $<HTMLElement>('#stat-ecc')

let activeLayer = 0
let renderToken = 0
let queued = false

export function requestRender(): void {
  if (queued) return
  queued = true
  // Coalesce bursts of state changes (scrub drags) into one render.
  queueMicrotask(() => {
    queued = false
    void render()
  })
}

async function render(): Promise<void> {
  const run = ++renderToken
  const state = store.get()
  const value = state.value.trim()

  if (!value) {
    showEmpty(true)
    setBadge('idle', 'idle')
    return
  }
  showEmpty(false)

  const started = performance.now()
  let qr: QRCode
  let svg: string
  try {
    qr = new QRCode(value, { errorCorrectionLevel: state.ecc })
    svg = await qr.toSvg(PREVIEW_SIZE, buildOptions(state, PREVIEW_SIZE))
  } catch {
    if (run !== renderToken) return
    setBadge('fail', 'too long')
    statBytes.textContent = '—'
    statMs.textContent = '—'
    return
  }
  if (run !== renderToken) return

  crossfade(svg)
  updateStats(svg, performance.now() - started, state)
  void verifyDecode(run, qr, state)
}

function crossfade(svg: string): void {
  const incoming = layers[(activeLayer + 1) % 2]
  const outgoing = layers[activeLayer]
  incoming.innerHTML = svg
  // The library emits a fixed-size SVG (width/height = size, no viewBox) so a
  // downloaded file is pixel-exact. A viewBox in the same coordinate space
  // lets the inline copy scale to the frame.
  const node = incoming.querySelector('svg')
  if (node) {
    node.setAttribute('viewBox', `0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`)
    node.setAttribute('width', '100%')
    node.setAttribute('height', '100%')
  }
  incoming.dataset.active = 'true'
  delete outgoing.dataset.active
  activeLayer = (activeLayer + 1) % 2
}

function showEmpty(empty: boolean): void {
  emptyState.hidden = !empty
  for (const layer of layers) layer.dataset.dimmed = empty ? 'true' : 'false'
}

function updateStats(svg: string, ms: number, state: StudioState): void {
  statPx.textContent = String(state.exportSize)
  statBytes.textContent = `${(svg.length / 1024).toFixed(1)} KB`
  statMs.textContent = `${ms.toFixed(1)} ms`
  statEcc.textContent = state.ecc
}

function setBadge(
  state: 'idle' | 'checking' | 'ok' | 'fail',
  label: string,
): void {
  badge.dataset.state = state
  badge.textContent = label
}

// The library's own golden rule: a styled code must still decode. Render the
// same options through the canvas path and read them back with ZXing.
async function verifyDecode(
  run: number,
  qr: QRCode,
  state: StudioState,
): Promise<void> {
  setBadge('checking', 'decoding')
  try {
    const canvas = document.createElement('canvas')
    canvas.width = DECODE_SIZE
    canvas.height = DECODE_SIZE
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    const options = buildOptions(state, DECODE_SIZE)
    const logoUrl = state.logo.dataUrl
    const logoImage = logoUrl ? await loadImage(logoUrl) : undefined
    await qr.toCanvas(context, DECODE_SIZE, options, logoImage)
    if (run !== renderToken) return

    const imageData = context.getImageData(0, 0, DECODE_SIZE, DECODE_SIZE)
    const results = await readBarcodes(imageData, {
      formats: ['QRCode'],
      tryHarder: true,
    })
    if (run !== renderToken) return
    const ok = results[0]?.text === state.value
    setBadge(ok ? 'ok' : 'fail', ok ? 'scans' : 'no read')
  } catch {
    if (run !== renderToken) return
    setBadge('fail', 'no read')
  }
}
