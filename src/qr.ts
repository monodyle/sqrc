import {
  Matrix,
  type TransformOptions,
  type QRCodeErrorCorrectionLevelType,
} from './matrix'

export type QRCodeOptions = {
  errorCorrectionLevel: QRCodeErrorCorrectionLevelType
  version?: number
}

export class QRCode {
  public value: string
  private _matrix: Matrix

  constructor(value: string, options?: QRCodeOptions) {
    this.value = value

    const { errorCorrectionLevel, version } = options || {
      errorCorrectionLevel: 'M',
    }
    this._matrix = new Matrix(value, errorCorrectionLevel, version)
  }

  toSvg(size: number, options?: TransformOptions) {
    const { path } = this._matrix.toPath(size, options)
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`
  }
}
