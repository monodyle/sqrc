import generator from 'qrcode-generator'
import { createCanvas, Canvas, SKRSContext2D, Image } from '@napi-rs/canvas'
import {
  QRColorGradientType,
  QRCoordinates,
  QREyeColor,
  QREyeCornerRadius,
  QROptions,
  QROptionsWithDefaultValue
} from './types'

const defaultOptions: QROptionsWithDefaultValue = {
  ecc: 'M',
  version: 0,
  size: 150,
  quietZone: 10,
  foreground: '#000',
  background: '#fff',
  moduleStyle: 'squares'
}

export class QRCode {
  public canvas: Canvas
  private context: SKRSContext2D
  public content: string

  private size: number
  private encoded: ReturnType<typeof generator>
  private positionZones: [QRCoordinates, QRCoordinates, QRCoordinates]
  private options: QROptions = defaultOptions
  private logoMetrics: {
    dWidthLogo: number
    dHeightLogo: number
    dxLogo: number
    dyLogo: number
    dWidthLogoPadding: number
    dHeightLogoPadding: number
    dxLogoPadding: number
    dyLogoPadding: number
  }

  constructor (content: string, options: Partial<QROptions> = defaultOptions) {
    this.options = { ...defaultOptions, ...options }
    this.content = content
    this.size = this.options.size - this.options.quietZone * 2
    this.encoded = generator(this.options.version, this.options.ecc)
    this.encoded.addData(utf16to8(this.content))
    this.encoded.make()

    const length = this.encoded.getModuleCount()
    this.positionZones = [
      { row: 0, col: 0 },
      { row: 0, col: length - 7 },
      { row: length - 7, col: 0 }
    ]

    const logo = this.options.logo
    const dWidthLogo = logo?.width || this.size * 0.2
    const dHeightLogo = logo?.width || dWidthLogo
    const dxLogo = (this.size - dWidthLogo) / 2
    const dyLogo = (this.size - dHeightLogo) / 2
    const logoPadding = logo?.padding ?? 0
    const dWidthLogoPadding = dWidthLogo + 2 * logoPadding
    const dHeightLogoPadding = dHeightLogo + 2 * logoPadding
    const dxLogoPadding = dxLogo + this.options.quietZone - logoPadding
    const dyLogoPadding = dyLogo + this.options.quietZone - logoPadding

    this.logoMetrics = {
      dWidthLogo,
      dHeightLogo,
      dxLogo,
      dyLogo,
      dWidthLogoPadding,
      dHeightLogoPadding,
      dxLogoPadding,
      dyLogoPadding
    }

    this.canvas = createCanvas(this.options.size, this.options.size)
    this.context = this.canvas.getContext('2d')
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
    fill: boolean
  ) {
    const ctx = this.context
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

  private drawBackground () {
    const ctx = this.context
    const canvasSize = this.size + 2 * this.options.quietZone
    ctx.fillStyle = this.options.background
    ctx.fillRect(0, 0, canvasSize, canvasSize)
  }

  private drawPositions () {
    for (let i = 0; i < 3; i++) {
      const { row, col } = this.positionZones[i]

      let radius = this.options.eyes?.radius ?? [0, 0, 0, 0]
      let color: QREyeColor =
        typeof this.options.foreground === 'string'
          ? this.options.foreground
          : typeof this.options.eyes?.color === 'string'
          ? this.options.eyes.color
          : '#000'

      if (Array.isArray(radius)) {
        radius = radius[i]
      } else if (typeof radius == 'number') {
        radius = [radius, radius, radius, radius]
      }

      if (!this.options.eyes?.color) {
        // if not specified, eye color is the same as foreground,
        if (typeof this.options.foreground === 'string') {
          color = this.options.foreground
        } else {
          //
        }
      } else {
        if (Array.isArray(this.options.eyes.color)) {
          // if array, we pass the single color
          color = this.options.eyes.color[i]
        } else {
          color = this.options.eyes.color
        }
      }

      const length = this.encoded.getModuleCount()
      const cellSize = this.size / length

      const lineWidth = Math.ceil(cellSize)

      const offset = this.options.quietZone

      let radiiOuter: QREyeCornerRadius
      let radiiInner: QREyeCornerRadius
      if (typeof radius !== 'number' && !Array.isArray(radius)) {
        radiiOuter = radius.outer || 0
        radiiInner = radius.inner || 0
      } else {
        radiiOuter = radius
        radiiInner = radiiOuter
      }

      let colorOuter
      let colorInner
      if (typeof color !== 'string') {
        colorOuter = color.outer
        colorInner = color.inner
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
        radiiOuter,
        false
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
        radiiInner,
        true
      )
    }
  }

  private async drawLogo () {
    const {
      dxLogoPadding,
      dyLogoPadding,
      dWidthLogoPadding,
      dHeightLogoPadding,
      dxLogo,
      dyLogo,
      dWidthLogo,
      dHeightLogo
    } = this.logoMetrics
    const ctx = this.context
    const logo = this.options.logo
    const offset = this.options.quietZone
    if (logo?.url) {
      const image = new Image()
      image.onload = () => {
        ctx.save()

        // padding
        if (logo.padding || (logo.emptyBackground && logo.padding)) {
          ctx.beginPath()
          ctx.strokeStyle = this.options.background
          ctx.fillStyle = this.options.background

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
        if (logo.style === 'circle') {
          ctx.save()
          ctx.beginPath()
          ctx.arc(
            dxLogo + offset + dWidthLogo / 2,
            dyLogo + offset + dWidthLogo / 2,
            dWidthLogo / 2,
            0,
            2 * Math.PI,
            false
          )
          ctx.clip()
          ctx.closePath()
        }
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

  private createGradient (
    type: QRColorGradientType,
    {
      x,
      y,
      size,
      additionalRotation
    }: { x: number; y: number; size: number; additionalRotation: number }
  ): any {
    let gradient
    if (type === 'radial') {
      gradient = this.context.createRadialGradient(
        x + size / 2,
        y + size / 2,
        0,
        x + size / 2,
        y + size / 2,
        size / 2
      )
    } else {
      const rotation = additionalRotation % (2 * Math.PI)
      const positiveRotation = (rotation + 2 * Math.PI) % (2 * Math.PI)
      let x0 = x + size / 2
      let y0 = y + size / 2
      let x1 = x + size / 2
      let y1 = y + size / 2
      if (
        (positiveRotation >= 0 && positiveRotation <= 0.25 * Math.PI) ||
        (positiveRotation > 1.75 * Math.PI && positiveRotation <= 2 * Math.PI)
      ) {
        x0 = x0 - size / 2
        y0 = y0 - (size / 2) * Math.tan(rotation)
        x1 = x1 + size / 2
        y1 = y1 + (size / 2) * Math.tan(rotation)
      } else if (
        positiveRotation > 0.25 * Math.PI &&
        positiveRotation <= 0.75 * Math.PI
      ) {
        y0 = y0 - size / 2
        x0 = x0 - size / 2 / Math.tan(rotation)
        y1 = y1 + size / 2
        x1 = x1 + size / 2 / Math.tan(rotation)
      } else if (
        positiveRotation > 0.75 * Math.PI &&
        positiveRotation <= 1.25 * Math.PI
      ) {
        x0 = x0 + size / 2
        y0 = y0 + (size / 2) * Math.tan(rotation)
        x1 = x1 - size / 2
        y1 = y1 - (size / 2) * Math.tan(rotation)
      } else if (
        positiveRotation > 1.25 * Math.PI &&
        positiveRotation <= 1.75 * Math.PI
      ) {
        y0 = y0 + size / 2
        x0 = x0 + size / 2 / Math.tan(rotation)
        y1 = y1 - size / 2
        x1 = x1 - size / 2 / Math.tan(rotation)
      }

      gradient = this.context.createLinearGradient(
        Math.round(x0),
        Math.round(y0),
        Math.round(x1),
        Math.round(y1)
      )
    }

    return gradient
  }

  private drawModules () {
    const ctx = this.context
    const logo = this.options.logo
    const length = this.encoded.getModuleCount()
    const cellSize = this.size / length
    const radius = cellSize / 2
    const offset = this.options.quietZone

    const xBeginning = Math.floor((this.size - length * cellSize) / 2)
    const yBeginning = Math.floor((this.size - length * cellSize) / 2)

    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        if (this.isInPositioninZone(row, col, this.positionZones)) {
          continue
        }
        if (
          logo?.emptyBackground &&
          this.isCoordinateInImage(
            col,
            row,
            this.logoMetrics.dWidthLogo,
            this.logoMetrics.dHeightLogo,
            this.logoMetrics.dxLogo,
            this.logoMetrics.dyLogo,
            cellSize
          )
        ) {
          continue
        }
        if (this.encoded.isDark(row, col)) {
          if (this.options.moduleStyle === 'dots') {
            ctx.arc(
              col * cellSize + radius + offset,
              row * cellSize + radius + offset,
              (radius / 100) * 75,
              0,
              2 * Math.PI
            )
          } else if (this.options.moduleStyle === 'squares') {
            const mX = col * cellSize + offset
            const mY = row * cellSize + offset
            const w = (col + 1) * cellSize - col * cellSize
            const h = (row + 1) * cellSize - row * cellSize
            ctx.rect(mX, mY, w, h)
          }
          ctx.closePath()
        }
      }
    }

    if (typeof this.options.foreground === 'string') {
      ctx.fillStyle = ctx.strokeStyle = this.options.foreground
    } else if (this.options.foreground) {
      const gradient = this.createGradient(
        this.options.foreground.type ?? 'linear',
        {
          additionalRotation: 0,
          x: xBeginning,
          y: yBeginning,
          size: length * cellSize
        }
      )
      gradient.addColorStop(0, this.options.foreground.from)
      gradient.addColorStop(1, this.options.foreground.to)
      ctx.fillStyle = ctx.strokeStyle = gradient
    }

    ctx.fill('evenodd')
  }

  private async draw () {
    this.drawBackground()
    this.drawModules()
    this.drawPositions()
    await this.drawLogo()
  }

  async render () {
    await this.draw()
    return this.canvas.encode('png')
  }
}

function utf16to8 (str: string): string {
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
