import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { Resvg } from '@resvg/resvg-js'
import jsQR from 'jsqr'
import { describe, expect, test } from 'vitest'
import { QRCode } from '../src'

// A small high-contrast PNG so the logo reads clearly against the modules.
const logoBytes = readFileSync(join(import.meta.dirname, 'fixtures/logo.png'))
const logoDataUrl = `data:image/png;base64,${logoBytes.toString('base64')}`

function decodeSvg(svg: string) {
  const rendered = new Resvg(svg, { background: 'white' }).render()
  return jsQR(
    new Uint8ClampedArray(rendered.pixels),
    rendered.width,
    rendered.height,
  )
}

async function decodePng(png: Buffer, size: number) {
  const image = await loadImage(png)
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  const { data } = ctx.getImageData(0, 0, size, size)
  return jsQR(data, size, size)
}

describe('QRCode.toSvg with a logo decode', () => {
  test('a raster logo (data URL) still decodes via the embedded image', async () => {
    const svg = await new QRCode('https://github.com/monodyle/sqrc', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, { logo: { url: logoDataUrl, width: 96, height: 96 } })

    expect(svg).toContain('<image href="data:image/png;base64,')
    expect(decodeSvg(svg)?.data).toBe('https://github.com/monodyle/sqrc')
  })

  test('honors logo.height distinct from width and still decodes', async () => {
    const svg = await new QRCode('sqrc logo height', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, { logo: { url: logoDataUrl, width: 96, height: 64 } })

    expect(svg).toContain('height="64"')
    expect(decodeSvg(svg)?.data).toBe('sqrc logo height')
  })

  test('emptyBackground pads a clean field behind the logo and decodes', async () => {
    const svg = await new QRCode('sqrc logo pad', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, {
      logo: { url: logoDataUrl, width: 96, height: 96, padding: 16, emptyBackground: true },
    })

    expect(decodeSvg(svg)?.data).toBe('sqrc logo pad')
  })

  test('opacity < 1 still decodes', async () => {
    const svg = await new QRCode('sqrc logo opacity', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, {
      logo: { url: logoDataUrl, width: 96, height: 96, opacity: 0.8 },
    })

    expect(svg).toContain('opacity="0.8"')
    expect(decodeSvg(svg)?.data).toBe('sqrc logo opacity')
  })

  test('circle style clips the logo and still decodes', async () => {
    const svg = await new QRCode('sqrc logo circle', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, { logo: { url: logoDataUrl, width: 96, height: 96, style: 'circle' } })

    expect(svg).toContain('<clipPath id="sqrc-logo-clip">')
    expect(decodeSvg(svg)?.data).toBe('sqrc logo circle')
  })

  test('accepts raw bytes as a logo source', async () => {
    const svg = await new QRCode('sqrc logo bytes', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, { logo: { url: logoBytes, width: 96, height: 96 } })

    expect(decodeSvg(svg)?.data).toBe('sqrc logo bytes')
  })
})

describe('QRCode.toPng with a logo decode', () => {
  test('raster logo decodes identically to the SVG path', async () => {
    const png = await new QRCode('https://github.com/monodyle/sqrc', {
      errorCorrectionLevel: 'H',
    }).toPng(512, { logo: { url: logoDataUrl, width: 96, height: 96 } })

    expect((await decodePng(png, 512))?.data).toBe('https://github.com/monodyle/sqrc')
  })

  test('circle logo with empty background decodes', async () => {
    const png = await new QRCode('sqrc png logo circle', {
      errorCorrectionLevel: 'H',
    }).toPng(512, {
      logo: {
        url: logoDataUrl,
        width: 96,
        height: 96,
        padding: 16,
        style: 'circle',
        emptyBackground: true,
      },
    })

    expect((await decodePng(png, 512))?.data).toBe('sqrc png logo circle')
  })
})
