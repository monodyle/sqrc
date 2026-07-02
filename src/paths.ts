type QRCodeMatrixValue = 0 | 1
export type QRCodeMatrix = Array<Array<QRCodeMatrixValue>>

export type BaseShapeOptions = 'square' | 'circle' | 'rounded' | 'diamond'
type ShapeOptions = {
  shape?: BaseShapeOptions
  eyePatternShape?: BaseShapeOptions
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

export function generatePath(
  matrix: QRCodeMatrix,
  quietZone: number,
  size: number,
  options: TransformOptions = DEFAULT_OPTIONS,
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

      const isDetectionPattern =
        (i < 7 && j < 7) ||
        (i < 7 && j >= matrix.length - 7) ||
        (i >= matrix.length - 7 && j < 7)

      const padding = (isDetectionPattern ? eyePatternGap : gap) / 2
      const effectiveCellSize =
        cellSize - (isDetectionPattern ? eyePatternGap : gap)
      const offset = effectiveCellSize / 2

      /* Get corners */
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

      /* neighbors */
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
