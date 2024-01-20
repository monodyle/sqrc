import qrGenerator from 'qrcode-generator'
import { createCanvas, Canvas, SKRSContext2D, Image } from '@napi-rs/canvas'

export type QREyeColor = string | QRInnerOuterEyeColor
export type QRInnerOuterEyeColor = {
  inner: string
  outer: string
}

export type QREyeCornerRadius =
  | number
  | [number, number, number, number]
  | QREyesInnerOuterRadius
export type QREyesInnerOuterRadius = {
  inner: number | [number, number, number, number]
  outer: number | [number, number, number, number]
}

export type QRLogoOptions = {
  url: string
  width?: number
  height?: number
  padding?: number
  opacity?: number
  emptyBackground?: boolean
  style?: 'square' | 'circle'
}

export type QREyesOptions = {
  radius?:
    | QREyeCornerRadius
    | [QREyeCornerRadius, QREyeCornerRadius, QREyeCornerRadius]
  color?: QREyeColor | [QREyeColor, QREyeColor, QREyeColor]
}

export type QROptions = {
  ecLevel?: ErrorCorrectionLevel
  size?: number
  quietZone?: number
  foreground?: string
  background?: string
  logo?: QRLogoOptions
  eyes?: QREyesOptions
  moduleStyle?: 'squares' | 'dots'
}

export type QRCoordinates = {
  row: number
  col: number
}

export class QRCode {
  private canvas: Canvas
  public content: string
  private contentSize: number
  private static defaultOptions = {
    ecLevel: 'M',
    size: 150,
    quietZone: 10,
    foreground: '#000',
    background: '#fff',
    moduleStyle: 'squares',
  }
  private options: QROptions = { ...(QRCode.defaultOptions as QROptions) }

  constructor (
    content: string,
    { size = QRCode.defaultOptions.size, ...options }: QROptions
  ) {
    this.options = { ...(QRCode.defaultOptions as QROptions), ...options, size }
    this.content = content
    this.contentSize =
      size - (options?.quietZone ?? QRCode.defaultOptions.quietZone) * 2
    this.canvas = createCanvas(size, size)
  }

  private static utf16to8 (str: string): string {
    let out: string = '',
      i: number,
      c: number
    const len: number = str.length
    for (i = 0; i < len; i++) {
      c = str.charCodeAt(i)
      if (c >= 0x0001 && c <= 0x007f) {
        out += str.charAt(i)
      } else if (c > 0x07ff) {
        out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f))
        out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f))
        out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
      } else {
        out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f))
        out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
      }
    }
    return out
  }

  /**
   * Draw a rounded square in the canvas
   */
  private drawRoundedSquare (
    lineWidth: number,
    x: number,
    y: number,
    size: number,
    color: string,
    radii: number | number[],
    fill: boolean,
    ctx: SKRSContext2D
  ) {
    ctx.lineWidth = lineWidth
    ctx.fillStyle = color
    ctx.strokeStyle = color

    // Adjust coordinates so that the outside of the stroke is aligned to the edges
    y += lineWidth / 2
    x += lineWidth / 2
    size -= lineWidth

    if (!Array.isArray(radii)) {
      radii = [radii, radii, radii, radii]
    }

    // Radius should not be greater than half the size or less than zero
    radii = radii.map(r => {
      r = Math.min(r, size / 2)
      return r < 0 ? 0 : r
    })

    const rTopLeft = radii[0] || 0
    const rTopRight = radii[1] || 0
    const rBottomRight = radii[2] || 0
    const rBottomLeft = radii[3] || 0

    ctx.beginPath()

    ctx.moveTo(x + rTopLeft, y)

    ctx.lineTo(x + size - rTopRight, y)
    if (rTopRight) ctx.quadraticCurveTo(x + size, y, x + size, y + rTopRight)

    ctx.lineTo(x + size, y + size - rBottomRight)
    if (rBottomRight)
      ctx.quadraticCurveTo(
        x + size,
        y + size,
        x + size - rBottomRight,
        y + size
      )

    ctx.lineTo(x + rBottomLeft, y + size)
    if (rBottomLeft)
      ctx.quadraticCurveTo(x, y + size, x, y + size - rBottomLeft)

    ctx.lineTo(x, y + rTopLeft)
    if (rTopLeft) ctx.quadraticCurveTo(x, y, x + rTopLeft, y)

    ctx.closePath()

    ctx.stroke()
    if (fill) {
      ctx.fill()
    }
  }

  /**
   * Draw a single positional pattern eye.
   */
  private drawPositioningPattern (
    ctx: SKRSContext2D,
    cellSize: number,
    offset: number,
    row: number,
    col: number,
    color: QREyeColor,
    radius: QREyeCornerRadius = [0, 0, 0, 0]
  ) {
    const lineWidth = Math.ceil(cellSize)

    let radiiOuter: QREyeCornerRadius
    let radiiInner: QREyeCornerRadius
    if (typeof radius !== 'number' && !Array.isArray(radius)) {
      radiiOuter = radius.outer || 0
      radiiInner = radius.inner || 0
    } else {
      radiiOuter = radius as QREyeCornerRadius
      radiiInner = radiiOuter
    }

    let colorOuter
    let colorInner
    if (typeof color !== 'string') {
      colorOuter = color?.outer
      colorInner = color?.inner
    } else {
      colorOuter = color
      colorInner = color
    }

    let y = row * cellSize + offset
    let x = col * cellSize + offset
    let size = cellSize * 7

    // Outer box
    this.drawRoundedSquare(
      lineWidth,
      x,
      y,
      size,
      colorOuter,
      radiiOuter as number | number[],
      false,
      ctx
    )

    // Inner box
    size = cellSize * 3
    y += cellSize * 2
    x += cellSize * 2
    this.drawRoundedSquare(
      lineWidth,
      x,
      y,
      size,
      colorInner,
      radiiInner as number | number[],
      true,
      ctx
    )
  }

  /**
   * Is this dot inside a positional pattern zone.
   */
  private isInPositioninZone (col: number, row: number, zones: QRCoordinates[]) {
    return zones.some(
      zone =>
        row >= zone.row &&
        row <= zone.row + 7 &&
        col >= zone.col &&
        col <= zone.col + 7
    )
  }

  private transformPixelLengthIntoNumberOfCells (
    pixelLength: number,
    cellSize: number
  ) {
    return pixelLength / cellSize
  }

  private isCoordinateInImage (
    col: number,
    row: number,
    dWidthLogo: number,
    dHeightLogo: number,
    dxLogo: number,
    dyLogo: number,
    cellSize: number
  ) {
    const numberOfCellsMargin = 1
    const firstRowOfLogo = this.transformPixelLengthIntoNumberOfCells(
      dxLogo,
      cellSize
    )
    const firstColumnOfLogo = this.transformPixelLengthIntoNumberOfCells(
      dyLogo,
      cellSize
    )
    const logoWidthInCells =
      this.transformPixelLengthIntoNumberOfCells(dWidthLogo, cellSize) - 1
    const logoHeightInCells =
      this.transformPixelLengthIntoNumberOfCells(dHeightLogo, cellSize) - 1

    return (
      row >= firstRowOfLogo - numberOfCellsMargin &&
      row <= firstRowOfLogo + logoWidthInCells + numberOfCellsMargin && // check rows
      col >= firstColumnOfLogo - numberOfCellsMargin &&
      col <= firstColumnOfLogo + logoHeightInCells + numberOfCellsMargin
    )
  }

  private async update () {
    const defaultOptions = QRCode.defaultOptions as Required<QROptions>
    const {
      ecLevel = defaultOptions.ecLevel,
      foreground = defaultOptions.foreground,
      background = defaultOptions.background,
      logo,
      moduleStyle,
      eyes,
      quietZone = defaultOptions.quietZone
    } = this.options

    const size = this.contentSize

    const qrCode = qrGenerator(0, ecLevel)
    qrCode.addData(QRCode.utf16to8(this.content))
    qrCode.make()

    const canvas = this.canvas
    const ctx: SKRSContext2D = canvas.getContext('2d')

    const canvasSize = size + 2 * quietZone
    const length = qrCode.getModuleCount()
    const cellSize = size / length

    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    const offset = quietZone

    const positioningZones: QRCoordinates[] = [
      { row: 0, col: 0 },
      { row: 0, col: length - 7 },
      { row: length - 7, col: 0 }
    ]

    // Logo Position
    const dWidthLogo = logo?.width || size * 0.2
    const dHeightLogo = logo?.width || dWidthLogo
    const dxLogo = (size - dWidthLogo) / 2
    const dyLogo = (size - dHeightLogo) / 2
    const dWidthLogoPadding = dWidthLogo + 2 * (logo?.padding ?? 0)
    const dHeightLogoPadding = dHeightLogo + 2 * (logo?.padding ?? 0)
    const dxLogoPadding = dxLogo + offset - (logo?.padding ?? 0)
    const dyLogoPadding = dyLogo + offset - (logo?.padding ?? 0)

    ctx.strokeStyle = foreground
    ctx.fillStyle = foreground
    const radius = cellSize / 2

    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        if (this.isInPositioninZone(row, col, positioningZones)) {
          continue
        }
        if (
          logo?.emptyBackground &&
          this.isCoordinateInImage(
            col,
            row,
            dWidthLogo,
            dHeightLogo,
            dxLogo,
            dyLogo,
            cellSize
          )
        ) {
          continue
        }
        if (qrCode.isDark(row, col)) {
          if (moduleStyle === 'dots') {
            ctx.beginPath()
            ctx.arc(
              Math.round(col * cellSize) + radius + offset,
              Math.round(row * cellSize) + radius + offset,
              (radius / 100) * 75,
              0,
              2 * Math.PI,
              false
            )
            ctx.closePath()
            ctx.fill()
          } else {
            const mX = Math.round(col * cellSize) + offset
            const mY = Math.round(row * cellSize) + offset
            const w =
              Math.ceil((col + 1) * cellSize) - Math.floor(col * cellSize)
            const h =
              Math.ceil((row + 1) * cellSize) - Math.floor(row * cellSize)
            ctx.fillRect(mX, mY, w, h)
          }
        }
      }
    }

    // Draw positioning patterns
    for (let i = 0; i < 3; i++) {
      const { row, col } = positioningZones[i]

      let radii = eyes?.radius
      let color: QREyeColor = foreground

      if (Array.isArray(radii)) {
        radii = radii[i]
      }
      if (typeof radii == 'number') {
        radii = [radii, radii, radii, radii]
      }

      if (!eyes?.color) {
        // if not specified, eye color is the same as foreground,
        color = foreground
      } else {
        if (Array.isArray(eyes.color)) {
          // if array, we pass the single color
          color = eyes.color[i]
        } else {
          color = eyes.color as QREyeColor
        }
      }

      this.drawPositioningPattern(ctx, cellSize, offset, row, col, color, radii)
    }

    if (logo?.url) {
      const image = new Image()
      image.onload = () => {
        ctx.save()

        // padding
        if (logo.padding || (logo.emptyBackground && logo.padding)) {
          ctx.beginPath()
          ctx.strokeStyle = background
          ctx.fillStyle = background

          if (logo.style === 'circle') {
            const dxCenterLogoPadding = dxLogoPadding + dWidthLogoPadding / 2
            const dyCenterLogoPadding = dyLogoPadding + dHeightLogoPadding / 2
            ctx.ellipse(
              dxCenterLogoPadding,
              dyCenterLogoPadding,
              dWidthLogoPadding / 2,
              dHeightLogoPadding / 2,
              0,
              0,
              2 * Math.PI
            )
            ctx.stroke()
            ctx.fill()
          } else {
            ctx.fillRect(
              dxLogoPadding,
              dyLogoPadding,
              dWidthLogoPadding,
              dHeightLogoPadding
            )
          }
        }

        ctx.globalAlpha = logo.opacity
        ctx.drawImage(
          image,
          dxLogo + offset,
          dyLogo + offset,
          dWidthLogo,
          dHeightLogo
        )
        ctx.restore()
      }
      const arrayBuffer = await fetch(logo.url).then(r => r.arrayBuffer())
      const buffer = Buffer.alloc(arrayBuffer.byteLength)
      const view = new Uint8Array(arrayBuffer)
      for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i]
      }
      image.src = buffer
    }
  }

  async render () {
    await this.update()
    return this.canvas.encode('png')
  }
}
