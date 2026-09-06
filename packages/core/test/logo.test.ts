import { describe, expect, test } from 'vitest'
import {
  computeLogoMetrics,
  logoKnockoutRange,
  resolveLogoSource,
} from '../src/logo'

describe('computeLogoMetrics', () => {
  test('defaults width to 20% of the canvas and height to width', () => {
    const metrics = computeLogoMetrics({ url: 'x' }, 500)

    expect(metrics.width).toBe(100)
    expect(metrics.height).toBe(100)
    expect(metrics.x).toBe(200)
    expect(metrics.y).toBe(200)
  })

  test('honors an explicit height independently of width', () => {
    const metrics = computeLogoMetrics({ url: 'x', width: 80, height: 40 }, 500)

    expect(metrics.width).toBe(80)
    expect(metrics.height).toBe(40)
    // Centered: (500 - 80) / 2, (500 - 40) / 2
    expect(metrics.x).toBe(210)
    expect(metrics.y).toBe(230)
  })

  test('expands the padding box by the padding on every side', () => {
    const metrics = computeLogoMetrics(
      { url: 'x', width: 100, height: 100, padding: 10 },
      500,
    )

    expect(metrics.padX).toBe(metrics.x - 10)
    expect(metrics.padY).toBe(metrics.y - 10)
    expect(metrics.padWidth).toBe(120)
    expect(metrics.padHeight).toBe(120)
  })

  test('rejects a logo large enough to outrun error correction', () => {
    expect(() =>
      computeLogoMetrics({ url: 'x', width: 400 }, 500),
    ).toThrow(/too large to scan/)
  })
})

describe('logoKnockoutRange', () => {
  // 21-module QR, cellSize 10, quietZone 4 -> content spans cells 0..20.
  test('removes the center cells plus a one-cell margin', () => {
    const metrics = computeLogoMetrics({ url: 'x', width: 60, height: 60 }, 290)
    const range = logoKnockoutRange(metrics, 10, 4, 21)

    expect(range.rowStart).toBeLessThan(10)
    expect(range.rowEnd).toBeGreaterThan(10)
    expect(range.colStart).toBeLessThan(10)
    expect(range.colEnd).toBeGreaterThan(10)
    // Margin keeps the knockout from spilling past the matrix edge.
    expect(range.rowStart).toBeGreaterThanOrEqual(0)
    expect(range.colEnd).toBeLessThanOrEqual(20)
  })

  test('uses the padded box when emptyBackground is set', () => {
    const padded = computeLogoMetrics(
      { url: 'x', width: 60, height: 60, padding: 20, emptyBackground: true },
      290,
    )
    const bare = computeLogoMetrics(
      { url: 'x', width: 60, height: 60 },
      290,
    )

    const paddedRange = logoKnockoutRange(padded, 10, 4, 21)
    const bareRange = logoKnockoutRange(bare, 10, 4, 21)

    expect(paddedRange.rowStart).toBeLessThan(bareRange.rowStart)
    expect(paddedRange.rowEnd).toBeGreaterThan(bareRange.rowEnd)
  })
})

describe('resolveLogoSource', () => {
  test('reads PNG dimensions from the header when none are given', () => {
    // 1x1 red PNG
    const png = base64ToBytes(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    )
    const resolved = resolveLogoSource({ url: png })

    expect(resolved.contentType).toBe('image/png')
    expect(resolved.width).toBe(1)
    expect(resolved.height).toBe(1)
    expect(resolved.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
  })

  test('honors explicit dimensions over the intrinsic size', () => {
    const png = base64ToBytes(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    )
    const resolved = resolveLogoSource({ url: png, width: 48, height: 24 })

    expect(resolved.width).toBe(48)
    expect(resolved.height).toBe(24)
  })

  test('passes through an existing base64 data URL unchanged', () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const resolved = resolveLogoSource({ url: dataUrl })

    expect(resolved.dataUrl).toBe(dataUrl)
    expect(resolved.contentType).toBe('image/png')
  })

  test('throws for a non-data-URL string (no implicit network fetch)', () => {
    expect(() => resolveLogoSource({ url: 'https://example.com/logo.png' })).toThrow(
      /data: URL/,
    )
  })

  test('returns undefined dimensions for formats whose headers are not parsed', () => {
    // JPEG magic bytes, but no dimension parsing for JPEG.
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
    const resolved = resolveLogoSource({ url: jpeg })

    expect(resolved.contentType).toBe('image/jpeg')
    expect(resolved.width).toBeUndefined()
    expect(resolved.height).toBeUndefined()
  })
})

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
