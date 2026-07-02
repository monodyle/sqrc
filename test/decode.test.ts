import { Resvg } from '@resvg/resvg-js'
import jsQR from 'jsqr'
import { describe, expect, test } from 'vitest'
import { QRCode } from '../src'

function decode(svg: string) {
  const rendered = new Resvg(svg, { background: 'white' }).render()
  return jsQR(
    new Uint8ClampedArray(rendered.pixels),
    rendered.width,
    rendered.height,
  )
}

describe('QRCode.toSvg decode', () => {
  test.each([
    ['Hello, world!', 'M'],
    ['https://github.com/monodyle/sqrc', 'M'],
    ['12345678901234567890', 'H'],
    ['A', 'L'],
  ] as const)(
    'decodes back to the input for %s (ECC %s)',
    (value, errorCorrectionLevel) => {
      const svg = new QRCode(value, { errorCorrectionLevel }).toSvg(512)
      expect(decode(svg)?.data).toBe(value)
    },
  )

  test('defaults to ECC M when only version is given', () => {
    const svg = new QRCode('sqrc', { version: 5 }).toSvg(512)
    expect(decode(svg)?.data).toBe('sqrc')
  })

  test('still decodes at a small render size with the quiet zone in place', () => {
    const svg = new QRCode('sqrc', { errorCorrectionLevel: 'L' }).toSvg(128)
    expect(decode(svg)?.data).toBe('sqrc')
  })
})
