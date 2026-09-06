import type { Bounds, FillSpec } from './color'
import { type LogoMetrics, type LogoOptions, computeLogoMetrics, logoKnockoutRange } from './logo'

type QRCodeMatrixValue = 0 | 1
export type QRCodeMatrix = Array<Array<QRCodeMatrixValue>>

export type BaseShapeOptions = 'square' | 'circle' | 'rounded' | 'diamond'

// circle/diamond modules always leave their corners unfilled, even where
// neighbors touch, so a finder pattern rendered in either shape never forms
// the solid black region jsQR (and QR scanners generally) need to detect
// it. Eyes are restricted to the shapes that stay solid.
export type EyeShapeOptions = 'square' | 'rounded'

type ShapeOptions = {
  shape?: BaseShapeOptions
  eyePatternShape?: EyeShapeOptions
  gap?: number
  eyePatternGap?: number
}
type ColorOptions = {
  foreground?: FillSpec
  background?: FillSpec
  // A single value colors all 3 finder eyes; a tuple assigns them
  // individually in the order [top-left, top-right, bottom-left].
  eyeColor?: FillSpec | [FillSpec, FillSpec, FillSpec]
}
export type TransformOptions = ShapeOptions &
  ColorOptions & { logo?: LogoOptions }

export type PathCommand =
  | { op: 'move'; x: number; y: number }
  | { op: 'line'; x: number; y: number }
  | { op: 'quad'; cx: number; cy: number; x: number; y: number }
  | { op: 'circle'; cx: number; cy: number; r: number }
  | { op: 'rect'; x: number; y: number; width: number; height: number }
  | { op: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { op: 'close' }

export type PathGroup = {
  commands: PathCommand[]
  fill: FillSpec
  bounds: Bounds
}

// QR versions 2+ carry an alignment pattern in addition to the 3 corner
// finder eyes - a smaller calibration square scanners rely on the same way.
// Left unstyled, it hits the same "circle/diamond never solid" problem as
// the eyes, so it must be detected and rendered with eyePatternShape too.
// Coordinates follow ISO/IEC 18004 Annex E (ported from the `qrcode`
// package's internal alignment-pattern module, which isn't public API).
function getAlignmentPatternCenters(
  version: number,
  size: number,
): Array<[number, number]> {
  if (version === 1) return []

  const posCount = Math.floor(version / 7) + 2
  const intervals =
    size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2
  const positions = [size - 7]
  for (let i = 1; i < posCount - 1; i++) {
    positions[i] = positions[i - 1] - intervals
  }
  positions.push(6)
  positions.reverse()

  const centers: Array<[number, number]> = []
  const n = positions.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const overlapsFinder =
        (i === 0 && j === 0) ||
        (i === 0 && j === n - 1) ||
        (i === n - 1 && j === 0)
      if (overlapsFinder) continue

      centers.push([positions[i], positions[j]])
    }
  }
  return centers
}

type CellGeometry = {
  cellCenter: { x: number; y: number }
  corners: Record<
    'q1' | 'q2' | 'q3' | 'q4' | 'd1' | 'd2' | 'd3' | 'd4',
    { x: number; y: number }
  >
  effectiveCellSize: number
  neighbors: { top: boolean; right: boolean; bottom: boolean; left: boolean }
}

function pushCellShape(
  target: PathCommand[],
  shape: BaseShapeOptions | EyeShapeOptions,
  { cellCenter, corners, effectiveCellSize, neighbors }: CellGeometry,
) {
  const { q1, q2, q3, q4, d1, d2, d3, d4 } = corners

  if (shape === 'circle') {
    target.push({
      op: 'circle',
      cx: cellCenter.x,
      cy: cellCenter.y,
      r: effectiveCellSize / 2,
    })
  } else if (shape === 'rounded') {
    target.push({ op: 'move', x: d1.x, y: d1.y })
    if (neighbors.top || neighbors.right) {
      target.push({ op: 'line', x: q1.x, y: q1.y })
      target.push({ op: 'line', x: d2.x, y: d2.y })
    } else {
      target.push({ op: 'quad', cx: q1.x, cy: q1.y, x: d2.x, y: d2.y })
    }
    if (neighbors.right || neighbors.bottom) {
      target.push({ op: 'line', x: q2.x, y: q2.y })
      target.push({ op: 'line', x: d3.x, y: d3.y })
    } else {
      target.push({ op: 'quad', cx: q2.x, cy: q2.y, x: d3.x, y: d3.y })
    }
    if (neighbors.bottom || neighbors.left) {
      target.push({ op: 'line', x: q3.x, y: q3.y })
      target.push({ op: 'line', x: d4.x, y: d4.y })
    } else {
      target.push({ op: 'quad', cx: q3.x, cy: q3.y, x: d4.x, y: d4.y })
    }
    if (neighbors.left || neighbors.top) {
      target.push({ op: 'line', x: q4.x, y: q4.y })
      target.push({ op: 'line', x: d1.x, y: d1.y })
    } else {
      target.push({ op: 'quad', cx: q4.x, cy: q4.y, x: d1.x, y: d1.y })
    }
    target.push({ op: 'close' })
  } else if (shape === 'diamond') {
    target.push({ op: 'move', x: cellCenter.x, y: q4.y })
    target.push({ op: 'line', x: q1.x, y: cellCenter.y })
    target.push({ op: 'line', x: cellCenter.x, y: q2.y })
    target.push({ op: 'line', x: q3.x, y: cellCenter.y })
    target.push({ op: 'close' })
  } else {
    target.push({ op: 'move', x: q4.x, y: q4.y })
    target.push({ op: 'line', x: q1.x, y: q1.y })
    target.push({ op: 'line', x: q2.x, y: q2.y })
    target.push({ op: 'line', x: q3.x, y: q3.y })
    target.push({ op: 'close' })
  }
}

export function generatePath(
  matrix: QRCodeMatrix,
  quietZone: number,
  size: number,
  options: TransformOptions = {},
  version = 1,
): { cellSize: number; groups: PathGroup[]; logoMetrics?: LogoMetrics } {
  const {
    shape = 'rounded',
    eyePatternShape = 'rounded',
    gap = 0,
    eyePatternGap = 0,
    logo,
    foreground = '#000',
    background = '#fff',
    eyeColor,
  } = options
  const cellSize = size / (matrix.length + quietZone * 2)
  const logoMetrics = logo ? computeLogoMetrics(logo, size) : undefined
  const alignmentPatternCenters = getAlignmentPatternCenters(
    version,
    matrix.length,
  )
  const finderOrigins: Array<[number, number]> = [
    [0, 0],
    [0, matrix.length - 7],
    [matrix.length - 7, 0],
  ]
  const eyeColors =
    eyeColor === undefined
      ? null
      : Array.isArray(eyeColor)
        ? eyeColor
        : [eyeColor, eyeColor, eyeColor]

  // Index 0-2 collect the 3 finder eyes (only used when `eyeColor` is set,
  // so they can become their own fill group); index 3 is everything else -
  // body modules, alignment pattern, and eyes when there's no override.
  const BODY = 3
  const cellCommands: [
    PathCommand[],
    PathCommand[],
    PathCommand[],
    PathCommand[],
  ] = [[], [], [], []]

  // Cells hidden behind the logo (plus a one-cell margin) are skipped so the
  // logo never touches a live module; error correction recovers the rest.
  const knockout = logoMetrics
    ? logoKnockoutRange(logoMetrics, cellSize, quietZone, matrix.length)
    : undefined
  const isKnockedOut = (i: number, j: number) =>
    knockout !== undefined &&
    i >= knockout.rowStart &&
    i <= knockout.rowEnd &&
    j >= knockout.colStart &&
    j <= knockout.colEnd

  matrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell !== 1 || isKnockedOut(i, j)) return

      const finderIndex = finderOrigins.findIndex(
        ([r, c]) => i >= r && i < r + 7 && j >= c && j < c + 7,
      )
      const isFinderPattern = finderIndex !== -1
      const isAlignmentPattern = alignmentPatternCenters.some(
        ([r, c]) => Math.abs(i - r) <= 2 && Math.abs(j - c) <= 2,
      )
      const isDetectionPattern = isFinderPattern || isAlignmentPattern

      const padding = (isDetectionPattern ? eyePatternGap : gap) / 2
      const effectiveCellSize =
        cellSize - (isDetectionPattern ? eyePatternGap : gap)
      const offset = effectiveCellSize / 2

      const x = (j + quietZone) * cellSize
      const y = (i + quietZone) * cellSize
      const cellCenter = { x: x + cellSize / 2, y: y + cellSize / 2 }
      const corners = {
        q1: { x: x + cellSize - padding, y: y + padding },
        q2: { x: x + cellSize - padding, y: y + cellSize - padding },
        q3: { x: x + padding, y: y + cellSize - padding },
        q4: { x: x + padding, y: y + padding },
        d1: { x: x + cellSize - padding - offset, y: y + padding },
        d2: { x: x + cellSize - padding, y: y + cellSize - padding - offset },
        d3: { x: x + padding + offset, y: y + cellSize - padding },
        d4: { x: x + padding, y: y + padding + offset },
      }

      const neighbors = {
        top: i > 0 && matrix[i - 1]?.[j] === 1,
        right: j < matrix.length - 1 && matrix[i]?.[j + 1] === 1,
        bottom: i < matrix.length - 1 && matrix[i + 1]?.[j] === 1,
        left: j > 0 && matrix[i]?.[j - 1] === 1,
      }

      const currentShape = isDetectionPattern ? eyePatternShape : shape
      const target =
        cellCommands[isFinderPattern && eyeColors ? finderIndex : BODY]

      pushCellShape(target, currentShape, {
        cellCenter,
        corners,
        effectiveCellSize,
        neighbors,
      })
    })
  })

  const groups: PathGroup[] = [
    {
      commands: [{ op: 'rect', x: 0, y: 0, width: size, height: size }],
      fill: background,
      bounds: { x: 0, y: 0, width: size, height: size },
    },
  ]

  if (eyeColors) {
    finderOrigins.forEach(([r, c], idx) => {
      if (cellCommands[idx].length === 0) return
      groups.push({
        commands: cellCommands[idx],
        fill: eyeColors[idx],
        bounds: {
          x: (c + quietZone) * cellSize,
          y: (r + quietZone) * cellSize,
          width: 7 * cellSize,
          height: 7 * cellSize,
        },
      })
    })
  }

  groups.push({
    commands: cellCommands[BODY],
    fill: foreground,
    bounds: {
      x: quietZone * cellSize,
      y: quietZone * cellSize,
      width: matrix.length * cellSize,
      height: matrix.length * cellSize,
    },
  })

  // A background-colored field behind the logo so it doesn't sit directly on
  // live modules. Drawn after the body so it cleanly covers the knocked-out
  // center; the logo image itself is laid on top by the render adapter.
  if (logoMetrics) {
    const padCommand: PathCommand =
      logoMetrics.style === 'circle'
        ? {
            op: 'ellipse',
            cx: logoMetrics.padX + logoMetrics.padWidth / 2,
            cy: logoMetrics.padY + logoMetrics.padHeight / 2,
            rx: logoMetrics.padWidth / 2,
            ry: logoMetrics.padHeight / 2,
          }
        : {
            op: 'rect',
            x: logoMetrics.padX,
            y: logoMetrics.padY,
            width: logoMetrics.padWidth,
            height: logoMetrics.padHeight,
          }
    groups.push({
      commands: [padCommand],
      fill: background,
      bounds: {
        x: logoMetrics.padX,
        y: logoMetrics.padY,
        width: logoMetrics.padWidth,
        height: logoMetrics.padHeight,
      },
    })
  }

  return { cellSize, groups, logoMetrics }
}
