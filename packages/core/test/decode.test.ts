import { describe, expect, test } from 'vitest'
import { QRCode } from '../src'
import { decodePng, decodeSvg } from './decode'

describe('QRCode.toSvg decode', () => {
  test.each([
    ['Hello, world!', 'M'],
    ['https://github.com/monodyle/sqrc', 'M'],
    ['12345678901234567890', 'H'],
    ['A', 'L'],
  ] as const)(
    'decodes back to the input for %s (ECC %s)',
    async (value, errorCorrectionLevel) => {
      const svg = await new QRCode(value, { errorCorrectionLevel }).toSvg(512)
      expect(await decodeSvg(svg)).toBe(value)
    },
  )

  test('defaults to ECC M when only version is given', async () => {
    const svg = await new QRCode('sqrc', { version: 5 }).toSvg(512)
    expect(await decodeSvg(svg)).toBe('sqrc')
  })

  test('still decodes at a small render size with the quiet zone in place', async () => {
    const svg = await new QRCode('sqrc', { errorCorrectionLevel: 'L' }).toSvg(
      128,
    )
    expect(await decodeSvg(svg)).toBe('sqrc')
  })

  test.each([['square'], ['circle'], ['rounded'], ['diamond']] as const)(
    'decodes with body shape %s (eye pattern stays solid)',
    async (shape) => {
      const svg = await new QRCode('https://github.com/monodyle/sqrc', {
        errorCorrectionLevel: 'M',
      }).toSvg(512, { shape })

      expect(await decodeSvg(svg)).toBe('https://github.com/monodyle/sqrc')
    },
  )
})

describe('QRCode.toPng decode', () => {
  test.each([
    ['Hello, world!', 'M'],
    ['https://github.com/monodyle/sqrc', 'M'],
    ['12345678901234567890', 'H'],
    ['A', 'L'],
  ] as const)(
    'decodes back to the input for %s (ECC %s)',
    async (value, errorCorrectionLevel) => {
      const png = await new QRCode(value, { errorCorrectionLevel }).toPng(512)
      expect(await decodePng(png, 512)).toBe(value)
    },
  )

  test.each([['square'], ['circle'], ['rounded'], ['diamond']] as const)(
    'decodes with body shape %s (eye pattern stays solid)',
    async (shape) => {
      const qr = new QRCode('https://github.com/monodyle/sqrc', {
        errorCorrectionLevel: 'M',
      })
      const png = await qr.toPng(512, { shape })

      expect(await decodePng(png, 512)).toBe(
        'https://github.com/monodyle/sqrc',
      )
    },
  )

  test.each([['square'], ['rounded']] as const)(
    'decodes with eye pattern shape %s',
    async (eyePatternShape) => {
      const qr = new QRCode('https://github.com/monodyle/sqrc', {
        errorCorrectionLevel: 'M',
      })
      const png = await qr.toPng(512, { eyePatternShape })

      expect(await decodePng(png, 512)).toBe(
        'https://github.com/monodyle/sqrc',
      )
    },
  )
})

describe('QRCode.toSvg color and gradient decode', () => {
  test('solid custom foreground/background still decodes', async () => {
    const svg = await new QRCode('sqrc colors', {
      errorCorrectionLevel: 'M',
    }).toSvg(512, { foreground: '#1a1a2e', background: '#f4f4f4' })

    expect(await decodeSvg(svg)).toBe('sqrc colors')
  })

  test('linear gradient foreground decodes and keeps the eyes visible', async () => {
    const svg = await new QRCode('sqrc gradient', {
      errorCorrectionLevel: 'M',
    }).toSvg(512, {
      foreground: {
        from: '#0f0f2d',
        to: '#00040a',
        type: 'linear',
        rotation: Math.PI / 4,
      },
    })

    expect(await decodeSvg(svg)).toBe('sqrc gradient')
  })

  test('radial gradient foreground decodes', async () => {
    const svg = await new QRCode('sqrc radial', {
      errorCorrectionLevel: 'M',
    }).toSvg(512, {
      foreground: { from: '#111111', to: '#000000', type: 'radial' },
    })

    expect(await decodeSvg(svg)).toBe('sqrc radial')
  })

  test('eyeColor override decodes independently of a gradient body', async () => {
    const svg = await new QRCode('sqrc eyes', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, {
      foreground: { from: '#1a1a2e', to: '#0d0d17' },
      eyeColor: '#00274d',
    })

    expect(await decodeSvg(svg)).toBe('sqrc eyes')
  })

  test('eyeColor array applies a distinct color per eye and still decodes', async () => {
    const svg = await new QRCode('sqrc eye array', {
      errorCorrectionLevel: 'H',
    }).toSvg(512, { eyeColor: ['#7f0000', '#004d00', '#00004d'] })

    expect(await decodeSvg(svg)).toBe('sqrc eye array')
  })
})

describe('QRCode.toPng color and gradient decode', () => {
  test('gradient foreground decodes the same as the SVG path', async () => {
    const png = await new QRCode('sqrc png gradient', {
      errorCorrectionLevel: 'M',
    }).toPng(512, { foreground: { from: '#0f0f2d', to: '#00040a' } })

    expect(await decodePng(png, 512)).toBe('sqrc png gradient')
  })

  test('eyeColor override decodes the same as the SVG path', async () => {
    const png = await new QRCode('sqrc png eyes', {
      errorCorrectionLevel: 'H',
    }).toPng(512, { eyeColor: '#7f0000' })

    expect(await decodePng(png, 512)).toBe('sqrc png eyes')
  })
})
