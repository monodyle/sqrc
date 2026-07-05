import {
  type Bounds,
  type GradientSpec,
  computeLinearGradientCoords,
  computeRadialGradientCoords,
  isGradientSpec,
  toSquareBounds,
} from '../color'
import type { PathCommand, PathGroup } from '../paths'

// Color/gradient values come from library callers and can end up holding
// arbitrary strings (e.g. forwarded straight from untrusted user input).
// Escaping them keeps a value like `"><script>...` from breaking out of the
// attribute it's placed in when this SVG string is inlined into a page.
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function serializeCommands(commands: PathCommand[]): string {
  let d = ''

  for (const command of commands) {
    switch (command.op) {
      case 'move':
        d += `M${command.x} ${command.y} `
        break
      case 'line':
        d += `L${command.x} ${command.y} `
        break
      case 'quad':
        d += `Q${command.cx} ${command.cy} ${command.x} ${command.y} `
        break
      case 'circle': {
        const { cx, cy, r } = command
        d += `M${cx - r} ${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 `
        break
      }
      case 'rect': {
        const { x, y, width, height } = command
        d += `M${x} ${y} L${x + width} ${y} L${x + width} ${y + height} L${x} ${y + height} Z `
        break
      }
      case 'close':
        d += 'Z '
        break
    }
  }

  return d.trim()
}

function serializeGradientDef(
  id: string,
  spec: GradientSpec,
  bounds: Bounds,
): string {
  const stops = `<stop offset="0" stop-color="${escapeAttr(spec.from)}"/><stop offset="1" stop-color="${escapeAttr(spec.to)}"/>`
  const squareBounds = toSquareBounds(bounds)

  if ((spec.type ?? 'linear') === 'radial') {
    const { cx, cy, r } = computeRadialGradientCoords(squareBounds)
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops}</radialGradient>`
  }

  const { x1, y1, x2, y2 } = computeLinearGradientCoords(
    squareBounds,
    spec.rotation,
  )
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`
}

export function serializeGroups(groups: PathGroup[], size: number): string {
  let defs = ''
  let body = ''
  let gradientId = 0

  for (const group of groups) {
    if (group.commands.length === 0) continue
    const d = serializeCommands(group.commands)

    let fillAttr: string
    if (isGradientSpec(group.fill)) {
      const id = `sqrc-grad-${gradientId++}`
      defs += serializeGradientDef(id, group.fill, group.bounds)
      fillAttr = `url(#${id})`
    } else {
      fillAttr = escapeAttr(group.fill)
    }

    body += `<path d="${d}" fill="${fillAttr}"/>`
  }

  const defsBlock = defs ? `<defs>${defs}</defs>` : ''
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${defsBlock}${body}</svg>`
}
