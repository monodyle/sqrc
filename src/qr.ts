import {
  Matrix,
  type TransformOptions,
  type QRCodeErrorCorrectionLevelType,
} from './matrix'
import { renderToCanvas, type Canvas2DContext } from './render/canvas'
import { serializeGroups } from './render/svg'

export type QRCodeOptions = {
  errorCorrectionLevel?: QRCodeErrorCorrectionLevelType
  version?: number
}

export class QRCode {
  public value: string
  private _matrix: Matrix

  constructor(value: string, options?: QRCodeOptions) {
    this.value = value

    const { errorCorrectionLevel = 'M', version } = options ?? {}
    this._matrix = new Matrix(value, errorCorrectionLevel, version)
  }

  toSvg(size: number, options?: TransformOptions) {
    const { groups } = this._matrix.toPath(size, options)
    return serializeGroups(groups, size)
  }

  toCanvas(ctx: Canvas2DContext, size: number, options?: TransformOptions) {
    const { groups } = this._matrix.toPath(size, options)
    renderToCanvas(ctx, groups)
  }

  async toPng(size: number, options?: TransformOptions): Promise<Buffer> {
    const { createCanvas } = await import('@napi-rs/canvas')
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    this.toCanvas(ctx, size, options)

    return canvas.toBuffer('image/png')
  }
}
