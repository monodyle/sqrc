import {
  Matrix,
  type TransformOptions,
  type QRCodeErrorCorrectionLevelType,
} from './matrix'
import { renderToCanvas, type Canvas2DContext } from './render/canvas'
import { serializePath } from './render/svg'

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
    const { commands } = this._matrix.toPath(size, options)
    const path = serializePath(commands)
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`
  }

  toCanvas(ctx: Canvas2DContext, size: number, options?: TransformOptions) {
    const { commands } = this._matrix.toPath(size, options)
    renderToCanvas(ctx, commands)
  }

  async toPng(size: number, options?: TransformOptions): Promise<Buffer> {
    const { createCanvas } = await import('@napi-rs/canvas')
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = 'black'
    this.toCanvas(ctx, size, options)

    return canvas.toBuffer('image/png')
  }
}
