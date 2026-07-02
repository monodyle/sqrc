import type { PathCommand } from '../paths'

export interface Canvas2DContext {
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
  closePath(): void
  fill(): void
}

export function renderToCanvas(
  ctx: Canvas2DContext,
  commands: PathCommand[],
): void {
  ctx.beginPath()

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
      case 'close':
        ctx.closePath()
        break
    }
  }

  ctx.fill()
}
