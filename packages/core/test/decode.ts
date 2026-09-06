import { createCanvas, loadImage } from '@napi-rs/canvas'
import { Resvg } from '@resvg/resvg-js'
import { readBarcodes } from 'zxing-wasm/reader'

// ZXing is the engine behind most phone scanners, so its verdict is the one
// that matters for styled codes. Returns the decoded text, or null.
async function decodePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const results = await readBarcodes(
    { data, width, height },
    { formats: ['QRCode'], tryHarder: true },
  )
  return results[0]?.text ?? null
}

export function decodeSvg(svg: string) {
  const rendered = new Resvg(svg, { background: 'white' }).render()
  return decodePixels(
    new Uint8ClampedArray(rendered.pixels),
    rendered.width,
    rendered.height,
  )
}

export async function decodePng(png: Uint8Array, size: number) {
  const image = await loadImage(png)
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  const { data } = ctx.getImageData(0, 0, size, size)
  return decodePixels(data, size, size)
}
