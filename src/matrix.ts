import QRCode from 'qrcode'

export type QRCodeErrorCorrectionLevelType = 'L' | 'H' | 'Q' | 'M'
type QRCodeMatrixValue = 0 | 1
type QRCodeMatrix = Array<Array<QRCodeMatrixValue>>

type BaseShapeOptions = 'square' | 'circle' | 'rounded' | 'diamond'
type ShapeOptions = {
  shape?: BaseShapeOptions
  eyePatternShape?: BaseShapeOptions
  gap?: number
  eyePatternGap?: number
}
export type TransformOptions = ShapeOptions & { logoSize?: number }

const QUIET_ZONE = 4

export class Matrix {
  protected value: QRCodeMatrix

  constructor(
    value: string,
    ecc: QRCodeErrorCorrectionLevelType,
    version?: number,
  ) {
    const matrix = Array.from(
      QRCode.create(value, { errorCorrectionLevel: ecc, version }).modules.data,
    ) as Array<QRCodeMatrixValue>

    const size = Math.sqrt(matrix.length)

    this.value = matrix.reduce((rows, key, index) => {
      if (index % size === 0) rows.push([key])
      else rows[rows.length - 1].push(key)

      return rows
    }, [] as QRCodeMatrix)
  }

  getValue() {
    return this.value
  }

  toPath(
    size: number,
    options: TransformOptions = {
      shape: 'rounded',
      eyePatternShape: 'rounded',
      gap: 0,
      eyePatternGap: 0,
      logoSize: 0,
    },
  ) {
    const {
      shape = 'rounded',
      eyePatternShape = 'rounded',
      gap = 0,
      eyePatternGap = 0,
      logoSize = 0,
    } = options
    const cellSize = size / (this.value.length + QUIET_ZONE * 2)
    let path = ''

    this.value.forEach((row, i) => {
      row.forEach((cell, j) => {
        const center = Math.floor(this.value.length / 2)
        const logoRadius = Math.floor(logoSize / cellSize / 2)
        const isLogoArea =
          logoSize !== 0 &&
          i >= center - logoRadius &&
          i <= center + logoRadius &&
          j >= center - logoRadius &&
          j <= center + logoRadius

        if (cell === 1 && !isLogoArea) {
          const isDetectionPattern =
            (i < 7 && j < 7) ||
            (i < 7 && j >= this.value.length - 7) ||
            (i >= this.value.length - 7 && j < 7)

          const padding = (isDetectionPattern ? eyePatternGap : gap) / 2
          const effectiveCellSize =
            cellSize - (isDetectionPattern ? eyePatternGap : gap)
          const offset = effectiveCellSize / 2

          /* Get corners */
          const x = (j + QUIET_ZONE) * cellSize
          const y = (i + QUIET_ZONE) * cellSize
          const center = { x: x + cellSize / 2, y: y + cellSize / 2 }
          const corners = {
            q1: { x: x + cellSize - padding, y: y + padding },
            q2: { x: x + cellSize - padding, y: y + cellSize - padding },
            q3: { x: x + padding, y: y + cellSize - padding },
            q4: { x: x + padding, y: y + padding },
            d1: { x: x + cellSize - padding - offset, y: y + padding },
            d2: {
              x: x + cellSize - padding,
              y: y + cellSize - padding - offset,
            },
            d3: { x: x + padding + offset, y: y + cellSize - padding },
            d4: { x: x + padding, y: y + padding + offset },
            center,
          }

          /* neighbors */
          const neighbors = {
            top: i > 0 && this.value[i - 1]?.[j] === 1,
            right: j < this.value.length - 1 && this.value[i]?.[j + 1] === 1,
            bottom: i < this.value.length - 1 && this.value[i + 1]?.[j] === 1,
            left: j > 0 && this.value[i]?.[j - 1] === 1,
          }

          /* draw path */
          const { q1, q2, q3, q4 } = corners
          const currentShape = isDetectionPattern ? eyePatternShape : shape
          if (currentShape === 'circle') {
            path += `M${center.x} ${center.y} m-${effectiveCellSize / 2}, 0 a${effectiveCellSize / 2},${effectiveCellSize / 2} 0 1,0 ${effectiveCellSize},0 a${effectiveCellSize / 2},${effectiveCellSize / 2} 0 1,0 -${effectiveCellSize},0`
          } else if (currentShape === 'rounded') {
            const { d1, d2, d3, d4 } = corners
            const useRadius = true
            const d1d2 =
              neighbors.top || neighbors.right || !useRadius
                ? `L${q1.x} ${q1.y} L${d2.x} ${d2.y}`
                : `L${d1.x} ${d1.y} Q${q1.x} ${q1.y} ${d2.x} ${d2.y}`
            const d2d3 =
              neighbors.right || neighbors.bottom || !useRadius
                ? `L${q2.x} ${q2.y} L${d3.x} ${d3.y}`
                : `L${d2.x} ${d2.y} Q${q2.x} ${q2.y} ${d3.x} ${d3.y}`
            const d3d4 =
              neighbors.bottom || neighbors.left || !useRadius
                ? `L${q3.x} ${q3.y} L${d4.x} ${d4.y}`
                : `L${d3.x} ${d3.y} Q${q3.x} ${q3.y} ${d4.x} ${d4.y}`
            const d4d1 =
              neighbors.left || neighbors.top || !useRadius
                ? `L${q4.x} ${q4.y} L${d1.x} ${d1.y}`
                : `L${d4.x} ${d4.y} Q${q4.x} ${q4.y} ${d1.x} ${d1.y}`
            path += `M${d1.x} ${d1.y} ${d1d2} ${d2d3} ${d3d4} ${d4d1}`
          } else if (currentShape === 'diamond') {
            path += `M${center.x} ${q4.y} L${q1.x} ${center.y} L${center.x} ${q2.y} L${q3.x} ${center.y} Z`
          } else {
            path += `M${q4.x} ${q4.y} H${q1.x} V${q2.y} H${q3.x} Z`
          }
        }
      })
    })

    return {
      cellSize,
      path,
    }
  }
}
