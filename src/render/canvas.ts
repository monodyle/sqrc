import {
  type Bounds,
  type FillSpec,
  computeLinearGradientCoords,
  computeRadialGradientCoords,
  isGradientSpec,
  toSquareBounds,
} from '../color'
import type { LogoMetrics } from '../logo'
import type { PathCommand, PathGroup } from '../paths'

export interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void
}

export interface Canvas2DContext {
  // `any` is an intentional escape hatch: DOM's CanvasRenderingContext2D and
  // @napi-rs/canvas's SKRSContext2D each declare their own incompatible
  // `CanvasPattern` type for this property, so a shared string|CanvasGradient
  // union can't satisfy both runtimes at once.
  fillStyle: any
  globalAlpha: number
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
  ): void
  closePath(): void
  fill(): void
  save(): void
  restore(): void
  clip(): void
  // The image type differs per runtime (HTMLImageElement in the browser, the
  // @napi-rs/canvas Image in node), so it stays an opaque handle here.
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): CanvasGradientLike
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradientLike
}

function resolveFill(
  ctx: Canvas2DContext,
  fill: FillSpec,
  bounds: Bounds,
): string | CanvasGradientLike {
  if (!isGradientSpec(fill)) return fill

  const squareBounds = toSquareBounds(bounds)

  if ((fill.type ?? 'linear') === 'radial') {
    const { cx, cy, r } = computeRadialGradientCoords(squareBounds)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    gradient.addColorStop(0, fill.from)
    gradient.addColorStop(1, fill.to)
    return gradient
  }

  const { x1, y1, x2, y2 } = computeLinearGradientCoords(
    squareBounds,
    fill.rotation,
  )
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
  gradient.addColorStop(0, fill.from)
  gradient.addColorStop(1, fill.to)
  return gradient
}

function drawCommands(ctx: Canvas2DContext, commands: PathCommand[]): void {
  for (const command of commands) {
    switch (command.op) {
      case 'move':
        ctx.moveTo(command.x, command.y)
        break
      case 'line':
        ctx.lineTo(command.x, command.y)
        break
      case 'quad':
        ctx.quadraticCurveTo(command.cx, command.cy, command.x, command.y)
        break
      case 'circle':
        ctx.moveTo(command.cx + command.r, command.cy)
        ctx.arc(command.cx, command.cy, command.r, 0, Math.PI * 2)
        break
      case 'ellipse':
        ctx.moveTo(command.cx + command.rx, command.cy)
        ctx.ellipse(
          command.cx,
          command.cy,
          command.rx,
          command.ry,
          0,
          0,
          Math.PI * 2,
        )
        break
      case 'rect':
        ctx.moveTo(command.x, command.y)
        ctx.lineTo(command.x + command.width, command.y)
        ctx.lineTo(command.x + command.width, command.y + command.height)
        ctx.lineTo(command.x, command.y + command.height)
        break
      case 'close':
        ctx.closePath()
        break
    }
  }
}

export function renderToCanvas(
  ctx: Canvas2DContext,
  groups: PathGroup[],
  logo?: { metrics: LogoMetrics; image: unknown },
): void {
  for (const group of groups) {
    if (group.commands.length === 0) continue

    ctx.beginPath()
    drawCommands(ctx, group.commands)
    ctx.fillStyle = resolveFill(ctx, group.fill, group.bounds)
    ctx.fill()
  }

  if (logo) drawLogo(ctx, logo.metrics, logo.image)
}

// The logo image is drawn last so it covers the center knockout. A circle
// style clips to an ellipse; opacity is applied via globalAlpha and restored
// afterward so it doesn't leak into anything drawn next.
function drawLogo(ctx: Canvas2DContext, metrics: LogoMetrics, image: unknown): void {
  ctx.save()

  if (metrics.opacity < 1) ctx.globalAlpha = metrics.opacity

  if (metrics.style === 'circle') {
    ctx.beginPath()
    ctx.ellipse(
      metrics.x + metrics.width / 2,
      metrics.y + metrics.height / 2,
      metrics.width / 2,
      metrics.height / 2,
      0,
      0,
      Math.PI * 2,
    )
    ctx.clip()
  }

  ctx.drawImage(image, metrics.x, metrics.y, metrics.width, metrics.height)
  ctx.restore()
}
