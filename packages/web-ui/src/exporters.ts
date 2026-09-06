import { QRCode } from 'sqrc'
import { downloadBlob, loadImage } from './lib/dom'
import { buildOptions } from './lib/options'
import { store } from './state'

// Exports re-render at the selected export size so downloaded files match
// the on-screen design exactly (the preview itself renders at a fixed
// internal resolution).

async function renderSvg(): Promise<string> {
  const state = store.get()
  const qr = new QRCode(state.value.trim(), { errorCorrectionLevel: state.ecc })
  return qr.toSvg(state.exportSize, buildOptions(state, state.exportSize))
}

async function renderPng(): Promise<Blob> {
  const state = store.get()
  const size = state.exportSize
  const qr = new QRCode(state.value.trim(), { errorCorrectionLevel: state.ecc })

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas unavailable')

  const options = buildOptions(state, size)
  const logoUrl = state.logo.dataUrl
  const logoImage = logoUrl ? await loadImage(logoUrl) : undefined
  await qr.toCanvas(context, size, options, logoImage)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('png encode failed')
  return blob
}

export async function copySvg(): Promise<void> {
  await navigator.clipboard.writeText(await renderSvg())
}

export async function downloadSvg(): Promise<void> {
  const svg = await renderSvg()
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'sqrc.svg')
}

export async function downloadPng(): Promise<void> {
  downloadBlob(await renderPng(), 'sqrc.png')
}
