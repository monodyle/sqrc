import generator from 'qrcode-generator'
import { createCanvas, Canvas, SKRSContext2D, Image } from '@napi-rs/canvas'
import {
  DrawModuleOptions,
  QRColorGradientType,
  QRCoordinates,
  QREyeColor,
  QREyeCornerRadius,
  QROptions,
  QROptionsWithDefaultValue,
  RotateModuleOptions
} from './types'

const defaultOptions: QROptionsWithDefaultValue = {
  ecc: 'H',
  version: 0,
  size: 150,
  quietZone: 10,
  foreground: '#000',
  background: '#fff',
  moduleStyle: 'square'
}

export class QRCode {
  public canvas: Canvas
  private context: SKRSContext2D
  public content: string

  private _size: number
  private _encoded: ReturnType<typeof generator>
  private _positionZones: [QRCoordinates, QRCoordinates, QRCoordinates]
  private _options: QROptions = defaultOptions
  private _logoMetrics: {
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
    this._options = { ...defaultOptions, ...options }
    this.content = content
    this._size = this._options.size - this._options.quietZone * 2
    this._encoded = generator(this._options.version, this._options.ecc)
    this._encoded.addData(utf16to8(this.content))
    this._encoded.make()

    const length = this._encoded.getModuleCount()
    this._positionZones = [
      { row: 0, col: 0 },
      { row: 0, col: length - 7 },
      { row: length - 7, col: 0 }
    ]

    const logo = this._options.logo
    const dWidthLogo = logo?.width || this._size * 0.2
    const dHeightLogo = logo?.width || dWidthLogo
    const dxLogo = (this._size - dWidthLogo) / 2
    const dyLogo = (this._size - dHeightLogo) / 2
    const logoPadding = logo?.padding ?? 0
    const dWidthLogoPadding = dWidthLogo + 2 * logoPadding
    const dHeightLogoPadding = dHeightLogo + 2 * logoPadding
    const dxLogoPadding = dxLogo + this._options.quietZone - logoPadding
    const dyLogoPadding = dyLogo + this._options.quietZone - logoPadding

    this._logoMetrics = {
      dWidthLogo,
      dHeightLogo,
      dxLogo,
      dyLogo,
      dWidthLogoPadding,
      dHeightLogoPadding,
      dxLogoPadding,
      dyLogoPadding
    }

    this.canvas = createCanvas(this._options.size, this._options.size)
    this.context = this.canvas.getContext('2d')
  }

  /**
   * Draw a rounded square in the canvas
   */
  private _drawRoundedSquare (
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

    const [rTopLeft, rTopRight, rBottomRight, rBottomLeft] = radii

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
  private _isInPositioninZone (
    col: number,
    row: number,
    zones: QRCoordinates[]
  ) {
    return zones.some(
      zone =>
        row >= zone.row &&
        row <= zone.row + 7 &&
        col >= zone.col &&
        col <= zone.col + 7
    )
  }

  private _isCoordinateInImage (col: number, row: number, cellSize: number) {
    const { dWidthLogo, dHeightLogo, dxLogo, dyLogo } = this._logoMetrics
    const numberOfCellsMargin = 1
    const firstRowOfLogo = dxLogo / cellSize
    const firstColumnOfLogo = dyLogo / cellSize
    const logoWidthInCells = dWidthLogo / cellSize - 1
    const logoHeightInCells = dHeightLogo / cellSize - 1

    return (
      row >= firstRowOfLogo - numberOfCellsMargin &&
      row <= firstRowOfLogo + logoWidthInCells + numberOfCellsMargin &&
      col >= firstColumnOfLogo - numberOfCellsMargin &&
      col <= firstColumnOfLogo + logoHeightInCells + numberOfCellsMargin
    )
  }

  private _drawBackground () {
    const ctx = this.context
    const canvasSize = this._size + 2 * this._options.quietZone
    ctx.fillStyle = this._options.background
    ctx.fillRect(0, 0, canvasSize, canvasSize)
  }

  private _drawPositions () {
    for (let i = 0; i < 3; i++) {
      const { row, col } = this._positionZones[i]

      let radius = this._options.eyes?.radius ?? [0, 0, 0, 0]
      let color: QREyeColor =
        typeof this._options.foreground === 'string'
          ? this._options.foreground
          : typeof this._options.eyes?.color === 'string'
          ? this._options.eyes.color
          : {
              outer: '',
              inner: ''
            }

      if (Array.isArray(radius)) {
        radius = radius[i]
      } else if (typeof radius == 'number') {
        radius = [radius, radius, radius, radius]
      }

      if (!this._options.eyes?.color) {
        // if not specified, eye color is the same as foreground,
        if (typeof this._options.foreground === 'string') {
          color = this._options.foreground
        } else {
          //
        }
      } else {
        if (Array.isArray(this._options.eyes.color)) {
          // if array, we pass the single color
          color = this._options.eyes.color[i]
        } else {
          color = this._options.eyes.color
        }
      }

      const length = this._encoded.getModuleCount()
      const cellSize = this._size / length

      const lineWidth = Math.ceil(cellSize)

      const offset = this._options.quietZone

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
      this._drawRoundedSquare(
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
      this._drawRoundedSquare(
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

  private async _drawLogo () {
    const {
      dxLogoPadding,
      dyLogoPadding,
      dWidthLogoPadding,
      dHeightLogoPadding,
      dxLogo,
      dyLogo,
      dWidthLogo,
      dHeightLogo
    } = this._logoMetrics
    const ctx = this.context
    const logo = this._options.logo
    const offset = this._options.quietZone
    if (logo?.url) {
      const image = new Image()
      image.onload = () => {
        ctx.save()

        // padding
        if (logo.padding || (logo.emptyBackground && logo.padding)) {
          ctx.beginPath()
          ctx.strokeStyle = this._options.background
          ctx.fillStyle = this._options.background

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

  private _getModuleOffset (
    row: number,
    col: number,
    xOffset: number,
    yOffset: number
  ): boolean {
    const length = this._encoded.getModuleCount()
    if (
      row + xOffset < 0 ||
      col + yOffset < 0 ||
      row + xOffset >= length ||
      col + yOffset >= length
    ) {
      return false
    }
    const cellSize = this._size / length
    if (
      this._options.logo?.emptyBackground &&
      this._isCoordinateInImage(col, row, cellSize)
    ) {
      return false
    }
    return this._encoded.isDark(row + xOffset, col + yOffset)
  }

  private _createGradient (
    type: QRColorGradientType,
    {
      rotate,
      x,
      y,
      size,
      additionalRotation
    }: {
      rotate?: number
      x: number
      y: number
      size: number
      additionalRotation: number
    }
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
      const rotation = ((rotate ?? 0) + additionalRotation) % (2 * Math.PI)
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

  private _rotateModule ({
    row,
    col,
    rotation = 0,
    draw,
    size
  }: RotateModuleOptions) {
    const ctx = this.context
    const offset = this._options.quietZone

    const cx = row * size + offset + size / 2
    const cy = col * size + offset + size / 2

    ctx.translate(cx, cy)
    rotation && ctx.rotate(rotation)
    draw()
    ctx.closePath()
    rotation && ctx.rotate(-rotation)
    ctx.translate(-cx, -cy)
  }

  private _drawClassyModule (opts: DrawModuleOptions) {
    const { row, col, size } = opts
    const leftNeighbor = +this._getModuleOffset(row, col, -1, 0)
    const rightNeighbor = +this._getModuleOffset(row, col, 1, 0)
    const topNeighbor = +this._getModuleOffset(row, col, 0, -1)
    const bottomNeighbor = +this._getModuleOffset(row, col, 0, 1)
    const neighborsCount =
      leftNeighbor + rightNeighbor + topNeighbor + bottomNeighbor

    if (neighborsCount === 0) {
      return this._drawBasicCornersRounded({ row, col, size, rotation: 90 })
    }

    if (!leftNeighbor && !topNeighbor) {
      return this._drawBasicCornerRounded({
        row,
        col,
        size,
        rotation: -90
      })
    }

    if (!rightNeighbor && !bottomNeighbor) {
      return this._drawBasicCornerRounded({ row, col, size, rotation: 90 })
    }

    this._drawSquareModule({ row, col, size })
  }

  private _drawBasicCornersRounded (opts: DrawModuleOptions) {
    const ctx = this.context
    const { size } = opts
    this._rotateModule({
      ...opts,
      draw: () => {
        ctx.arc(0, 0, size / 2, -Math.PI / 2, 0)
        ctx.lineTo(size / 2, size / 2)
        ctx.lineTo(0, size / 2)
        ctx.arc(0, 0, size / 2, Math.PI / 2, Math.PI)
        ctx.lineTo(-size / 2, -size / 2)
        ctx.lineTo(0, -size / 2)
      }
    })
  }

  private _drawBasicCornerExtraRounded (opts: DrawModuleOptions) {
    const ctx = this.context
    const { size } = opts
    this._rotateModule({
      ...opts,
      draw () {
        ctx.arc(-size / 2, size / 2, size, -Math.PI / 2, 0)
        ctx.lineTo(-size / 2, size / 2)
        ctx.lineTo(-size / 2, -size / 2)
      }
    })
  }

  private _drawBasicCornerRounded (opts: DrawModuleOptions) {
    const ctx = this.context
    const { size } = opts

    this._rotateModule({
      ...opts,
      draw () {
        ctx.arc(0, 0, size / 2, -Math.PI / 2, 0)
        ctx.lineTo(size / 2, size / 2)
        ctx.lineTo(-size / 2, size / 2)
        ctx.lineTo(-size / 2, -size / 2)
        ctx.lineTo(0, -size / 2)
      }
    })
  }

  private _drawRoundedModule (opts: DrawModuleOptions) {
    const { row, col, size } = opts
    const leftNeighbor = +this._getModuleOffset(row, col, -1, 0)
    const rightNeighbor = +this._getModuleOffset(row, col, 1, 0)
    const topNeighbor = +this._getModuleOffset(row, col, 0, -1)
    const bottomNeighbor = +this._getModuleOffset(row, col, 0, 1)
    const neighborsCount =
      leftNeighbor + rightNeighbor + topNeighbor + bottomNeighbor

    if (neighborsCount === 0) {
      return this._drawCircleModule({ row, col, size })
    }
    if (
      neighborsCount > 2 ||
      (leftNeighbor && rightNeighbor) ||
      (topNeighbor && bottomNeighbor)
    ) {
      return this._drawSquareModule({ row, col, size })
    }
    if (neighborsCount === 2) {
      let rotation = 0

      if (leftNeighbor && topNeighbor) {
        rotation = 90
      } else if (topNeighbor && rightNeighbor) {
        rotation = 180
      } else if (rightNeighbor && bottomNeighbor) {
        rotation = -90
      }

      return this._drawBasicCornerRounded({ ...opts, rotation })
    }

    if (neighborsCount === 1) {
      let rotation = 0

      if (topNeighbor) {
        rotation = 90
      } else if (rightNeighbor) {
        rotation = 180
      } else if (bottomNeighbor) {
        rotation = -90
      }

      this._drawBasicCornerRounded({ ...opts, rotation })
      return
    }
  }

  private _drawExtraRoundedModule (opts: DrawModuleOptions) {
    const { row, col, size } = opts
    const leftNeighbor = +this._getModuleOffset(row, col, -1, 0)
    const rightNeighbor = +this._getModuleOffset(row, col, 1, 0)
    const topNeighbor = +this._getModuleOffset(row, col, 0, -1)
    const bottomNeighbor = +this._getModuleOffset(row, col, 0, 1)
    const neighborsCount =
      leftNeighbor + rightNeighbor + topNeighbor + bottomNeighbor

    if (neighborsCount === 0) {
      return this._drawCircleModule({ row, col, size })
    }

    if (
      neighborsCount > 2 ||
      (leftNeighbor && rightNeighbor) ||
      (topNeighbor && bottomNeighbor)
    ) {
      return this._drawSquareModule({ row, col, size })
    }

    if (neighborsCount === 2) {
      let rotation = 0

      if (leftNeighbor && topNeighbor) {
        rotation = 90
      } else if (topNeighbor && rightNeighbor) {
        rotation = 180
      } else if (rightNeighbor && bottomNeighbor) {
        rotation = -90
      }

      return this._drawBasicCornerExtraRounded({ row, col, size, rotation })
    }

    if (neighborsCount === 1) {
      let rotation = 0

      if (topNeighbor) {
        rotation = 90
      } else if (rightNeighbor) {
        rotation = 180
      } else if (bottomNeighbor) {
        rotation = -90
      }

      return this._drawBasicCornerExtraRounded({ row, col, size, rotation })
    }
  }

  private _drawCircleModule (opts: DrawModuleOptions) {
    const ctx = this.context
    const { size } = opts
    let moduleScale = 1
    if (this._options.moduleScale && this._options.moduleStyle === 'dots') {
      moduleScale = this._options.moduleScale
    }

    this._rotateModule({
      ...opts,
      draw () {
        ctx.arc(0, 0, (size * moduleScale) / 2, 0, 2 * Math.PI)
      }
    })
  }

  private _drawSquareModule (opts: DrawModuleOptions) {
    const ctx = this.context
    const { size } = opts
    let moduleScale = 1
    if (this._options.moduleScale && this._options.moduleStyle === 'square') {
      moduleScale = this._options.moduleScale
    }
    const scaledSize = size * moduleScale

    this._rotateModule({
      ...opts,
      draw () {
        ctx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize)
      }
    })
  }

  private _drawModules () {
    const ctx = this.context
    const logo = this._options.logo
    const length = this._encoded.getModuleCount()
    const cellSize = this._size / length

    const xBeginning = Math.floor((this._size - length * cellSize) / 2)
    const yBeginning = Math.floor((this._size - length * cellSize) / 2)

    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        if (this._isInPositioninZone(row, col, this._positionZones)) {
          continue
        }
        if (
          logo?.emptyBackground &&
          this._isCoordinateInImage(col, row, cellSize)
        ) {
          continue
        }
        if (this._encoded.isDark(row, col)) {
          let drawFunc
          switch (this._options.moduleStyle) {
            case 'dots':
              drawFunc = this._drawCircleModule
              break
            case 'square':
              drawFunc = this._drawSquareModule
              break
            case 'rounded':
              drawFunc = this._drawRoundedModule
              break
            case 'extraRounded':
              drawFunc = this._drawExtraRoundedModule
              break
            case 'classy':
              drawFunc = this._drawClassyModule
              break
            default:
              break
          }
          drawFunc?.call(this, { row, col, size: cellSize })
          ctx.closePath()
        }
      }
    }

    if (typeof this._options.foreground === 'string') {
      ctx.fillStyle = ctx.strokeStyle = this._options.foreground
    } else if (this._options.foreground) {
      const gradient = this._createGradient(
        this._options.foreground.type ?? 'linear',
        {
          rotate: this._options.foreground.rotation,
          additionalRotation: 0,
          x: xBeginning,
          y: yBeginning,
          size: length * cellSize
        }
      )
      gradient.addColorStop(0, this._options.foreground.from)
      gradient.addColorStop(1, this._options.foreground.to)
      ctx.fillStyle = ctx.strokeStyle = gradient
    }

    ctx.fill('evenodd')
  }

  private async _draw () {
    this._drawBackground()
    this._drawModules()
    this._drawPositions()
    await this._drawLogo()
  }

  async render () {
    await this._draw()
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
