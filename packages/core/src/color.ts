export type GradientType = 'linear' | 'radial'

export type GradientSpec = {
  type?: GradientType
  from: string
  to: string
  rotation?: number
}

export type FillSpec = string | GradientSpec

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export function isGradientSpec(fill: FillSpec): fill is GradientSpec {
  return typeof fill !== 'string'
}

export type LinearGradientCoords = {
  x1: number
  y1: number
  x2: number
  y2: number
}
export type RadialGradientCoords = { cx: number; cy: number; r: number }

export type SquareBounds = { x: number; y: number; size: number }

export function toSquareBounds(bounds: Bounds): SquareBounds {
  if (bounds.width !== bounds.height) {
    throw new Error(
      `Gradient bounds must be square, got width=${bounds.width} height=${bounds.height}`,
    )
  }
  return { x: bounds.x, y: bounds.y, size: bounds.width }
}

export function computeLinearGradientCoords(
  bounds: SquareBounds,
  rotation = 0,
): LinearGradientCoords {
  const { x, y, size } = bounds
  const cx = x + size / 2
  const cy = y + size / 2
  const positiveRotation =
    ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

  let x1 = cx
  let y1 = cy
  let x2 = cx
  let y2 = cy

  if (
    (positiveRotation >= 0 && positiveRotation <= 0.25 * Math.PI) ||
    (positiveRotation > 1.75 * Math.PI && positiveRotation <= 2 * Math.PI)
  ) {
    x1 -= size / 2
    y1 -= (size / 2) * Math.tan(rotation)
    x2 += size / 2
    y2 += (size / 2) * Math.tan(rotation)
  } else if (
    positiveRotation > 0.25 * Math.PI &&
    positiveRotation <= 0.75 * Math.PI
  ) {
    y1 -= size / 2
    x1 -= size / 2 / Math.tan(rotation)
    y2 += size / 2
    x2 += size / 2 / Math.tan(rotation)
  } else if (
    positiveRotation > 0.75 * Math.PI &&
    positiveRotation <= 1.25 * Math.PI
  ) {
    x1 += size / 2
    y1 += (size / 2) * Math.tan(rotation)
    x2 -= size / 2
    y2 -= (size / 2) * Math.tan(rotation)
  } else if (
    positiveRotation > 1.25 * Math.PI &&
    positiveRotation <= 1.75 * Math.PI
  ) {
    y1 += size / 2
    x1 += size / 2 / Math.tan(rotation)
    y2 -= size / 2
    x2 -= size / 2 / Math.tan(rotation)
  }

  return { x1, y1, x2, y2 }
}

export function computeRadialGradientCoords(
  bounds: SquareBounds,
): RadialGradientCoords {
  const { x, y, size } = bounds
  return { cx: x + size / 2, cy: y + size / 2, r: size / 2 }
}
