import QRCode from 'qrcode'
import { generatePath, type QRCodeMatrix, type TransformOptions } from './paths'

export type QRCodeErrorCorrectionLevelType = 'L' | 'H' | 'Q' | 'M'
export type { PathCommand, TransformOptions } from './paths'

const QUIET_ZONE = 4

export class Matrix {
  protected value: QRCodeMatrix
  private version: number

  constructor(
    value: string,
    ecc: QRCodeErrorCorrectionLevelType,
    version?: number,
  ) {
    const created = QRCode.create(value, { errorCorrectionLevel: ecc, version })
    const matrix = Array.from(created.modules.data) as Array<0 | 1>

    this.version = created.version

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

  toPath(size: number, options?: TransformOptions) {
    return generatePath(this.value, QUIET_ZONE, size, options, this.version)
  }
}
