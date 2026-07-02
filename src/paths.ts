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
export type TransformOptions = ShapeOptions & { logoSize?: number }

export type PathCommand =
  | { op: 'move'; x: number; y: number }
  | { op: 'line'; x: number; y: number }
  | { op: 'quad'; cx: number; cy: number; x: number; y: number }
  | { op: 'circle'; cx: number; cy: number; r: number }
  | { op: 'close' }

const DEFAULT_OPTIONS: Required<TransformOptions> = {
  shape: 'rounded',
  eyePatternShape: 'rounded',
  gap: 0,
  eyePatternGap: 0,
  logoSize: 0,
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

export function generatePath(
  matrix: QRCodeMatrix,
  quietZone: number,
  size: number,
  options: TransformOptions = DEFAULT_OPTIONS,
  version = 1,
) {
  const {
    shape = 'rounded',
    eyePatternShape = 'rounded',
    gap = 0,
    eyePatternGap = 0,
    logoSize = 0,
  } = options
  const cellSize = size / (matrix.length + quietZone * 2)
  const commands: PathCommand[] = []
  const alignmentPatternCenters = getAlignmentPatternCenters(
    version,
    matrix.length,
  )

  matrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      const center = Math.floor(matrix.length / 2)
      const logoRadius = Math.floor(logoSize / cellSize / 2)
      const isLogoArea =
        logoSize !== 0 &&
        i >= center - logoRadius &&
        i <= center + logoRadius &&
        j >= center - logoRadius &&
        j <= center + logoRadius

      if (cell !== 1 || isLogoArea) return

      const isFinderPattern =
        (i < 7 && j < 7) ||
        (i < 7 && j >= matrix.length - 7) ||
        (i >= matrix.length - 7 && j < 7)
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

      const { q1, q2, q3, q4, d1, d2, d3, d4 } = corners
      const currentShape = isDetectionPattern ? eyePatternShape : shape

      if (currentShape === 'circle') {
        commands.push({
          op: 'circle',
          cx: cellCenter.x,
          cy: cellCenter.y,
          r: effectiveCellSize / 2,
        })
      } else if (currentShape === 'rounded') {
        commands.push({ op: 'move', x: d1.x, y: d1.y })
        if (neighbors.top || neighbors.right) {
          commands.push({ op: 'line', x: q1.x, y: q1.y })
          commands.push({ op: 'line', x: d2.x, y: d2.y })
        } else {
          commands.push({ op: 'quad', cx: q1.x, cy: q1.y, x: d2.x, y: d2.y })
        }
        if (neighbors.right || neighbors.bottom) {
          commands.push({ op: 'line', x: q2.x, y: q2.y })
          commands.push({ op: 'line', x: d3.x, y: d3.y })
        } else {
          commands.push({ op: 'quad', cx: q2.x, cy: q2.y, x: d3.x, y: d3.y })
        }
        if (neighbors.bottom || neighbors.left) {
          commands.push({ op: 'line', x: q3.x, y: q3.y })
          commands.push({ op: 'line', x: d4.x, y: d4.y })
        } else {
          commands.push({ op: 'quad', cx: q3.x, cy: q3.y, x: d4.x, y: d4.y })
        }
        if (neighbors.left || neighbors.top) {
          commands.push({ op: 'line', x: q4.x, y: q4.y })
          commands.push({ op: 'line', x: d1.x, y: d1.y })
        } else {
          commands.push({ op: 'quad', cx: q4.x, cy: q4.y, x: d1.x, y: d1.y })
        }
        commands.push({ op: 'close' })
      } else if (currentShape === 'diamond') {
        commands.push({ op: 'move', x: cellCenter.x, y: q4.y })
        commands.push({ op: 'line', x: q1.x, y: cellCenter.y })
        commands.push({ op: 'line', x: cellCenter.x, y: q2.y })
        commands.push({ op: 'line', x: q3.x, y: cellCenter.y })
        commands.push({ op: 'close' })
      } else {
        commands.push({ op: 'move', x: q4.x, y: q4.y })
        commands.push({ op: 'line', x: q1.x, y: q1.y })
        commands.push({ op: 'line', x: q2.x, y: q2.y })
        commands.push({ op: 'line', x: q3.x, y: q3.y })
        commands.push({ op: 'close' })
      }
    })
  })

  return { cellSize, commands }
}
