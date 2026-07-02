import type { PathCommand } from '../paths'

export function serializePath(commands: PathCommand[]): string {
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
      case 'close':
        d += 'Z '
        break
    }
  }

  return d.trim()
}
