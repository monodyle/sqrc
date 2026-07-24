import {
  Matrix,
  type TransformOptions,
  type QRCodeErrorCorrectionLevelType,
} from './matrix'
import { type LogoOptions, resolveLogoSource } from './logo'
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

  // The methods are async (rather than only when a logo is present) so the
  // signature is stable: adding a logo later doesn't turn a sync call site
  // into a type error. The awaited value resolves immediately when there's no
  // logo to decode.

  async toSvg(size: number, options?: TransformOptions): Promise<string> {
    const { groups, logoMetrics } = this._matrix.toPath(size, options)

    const logo = options?.logo
    if (!logo || !logoMetrics) return serializeGroups(groups, size)

    const source = resolveLogoSource(logo)
    return serializeGroups(groups, size, { metrics: logoMetrics, source })
  }

  // `logoImage` is the decoded image handle for the configured logo. Because
  // image decoding is runtime-specific (HTMLImageElement in the browser, the
  // @napi-rs/canvas Image in node), the caller supplies it; `toPng` handles
  // the decode internally for node.
  async toCanvas(
    ctx: Canvas2DContext,
    size: number,
    options?: TransformOptions,
    logoImage?: unknown,
  ): Promise<void> {
    const { groups, logoMetrics } = this._matrix.toPath(size, options)

    const logo = options?.logo
    renderToCanvas(
      ctx,
      groups,
      logo && logoMetrics && logoImage !== undefined
        ? { metrics: logoMetrics, image: logoImage }
        : undefined,
    )
  }

  async toPng(size: number, options?: TransformOptions): Promise<Buffer> {
    const { createCanvas, loadImage } = await import('@napi-rs/canvas')
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    const logo = options?.logo
    const logoImage = logo ? await loadImage(resolveLogoSource(logo).bytes) : undefined

    await this.toCanvas(ctx, size, options, logoImage)

    return canvas.toBuffer('image/png')
  }
}

export type { LogoOptions }
