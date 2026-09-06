import { describe, expect, test } from 'vitest'
import { Matrix } from '../src/matrix'

describe('generateMatrix', () => {
  test('should generate a matrix for a given value and error correction level', () => {
    const value = 'example'
    const matrix = new Matrix(value, 'M').getValue()

    expect(Array.isArray(matrix)).toBe(true)
    expect(Array.isArray(matrix[0])).toBe(true)

    for (const row of matrix) {
      for (const cell of row) {
        expect(cell === 0 || cell === 1).toBe(true)
      }
    }

    const size = matrix.length
    for (const row of matrix) {
      expect(row.length).toBe(size)
    }
  })

  test('should generate different matrices for different values', () => {
    const value1 = 'example 1'
    const value2 = 'example 2'

    const matrix1 = new Matrix(value1, 'M').getValue()
    const matrix2 = new Matrix(value2, 'M').getValue()

    expect(matrix1).not.toEqual(matrix2)
  })
})

function bodyCommands(groups: ReturnType<Matrix['toPath']>['groups']) {
  return groups[groups.length - 1].commands
}

describe('toPath quiet zone', () => {
  test('insets every drawn coordinate by a margin around the modules', () => {
    const size = 200
    const matrix = new Matrix('example', 'M')
    const moduleCount = matrix.getValue().length
    const { groups, cellSize } = matrix.toPath(size)

    const coordinates: number[] = []
    for (const command of bodyCommands(groups)) {
      if (command.op === 'move' || command.op === 'line') {
        coordinates.push(command.x, command.y)
      } else if (command.op === 'quad') {
        coordinates.push(command.cx, command.cy, command.x, command.y)
      } else if (command.op === 'circle') {
        coordinates.push(command.cx, command.cy)
      }
    }
    expect(coordinates.length).toBeGreaterThan(0)

    // Margin implied by cellSize vs. the raw module count, not a hardcoded
    // constant, so this stays correct if the quiet zone size ever changes.
    const margin = (size - moduleCount * cellSize) / 2
    expect(margin).toBeGreaterThan(cellSize * 3)

    for (const coordinate of coordinates) {
      expect(coordinate).toBeGreaterThanOrEqual(margin - 0.01)
      expect(coordinate).toBeLessThanOrEqual(size - margin + 0.01)
    }
  })
})

describe('toPath path model', () => {
  test('returns fill groups with structured commands rather than a serialized string', () => {
    const matrix = new Matrix('example', 'M')
    const { groups } = matrix.toPath(200)

    expect(Array.isArray(groups)).toBe(true)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(typeof group.fill).not.toBe('undefined')
      for (const command of group.commands) {
        expect(typeof command.op).toBe('string')
      }
    }
  })

  test('defaults to a black-on-white fill so output scans on any surface', () => {
    const matrix = new Matrix('example', 'M')
    const { groups } = matrix.toPath(200)

    expect(groups[0].fill).toBe('#fff')
    expect(groups[groups.length - 1].fill).toBe('#000')
  })

  test('each body shape produces commands consumable by a canvas-style replayer', () => {
    const matrix = new Matrix('example', 'H')
    const shapes = ['square', 'circle', 'rounded', 'diamond'] as const

    for (const shape of shapes) {
      const commands = bodyCommands(matrix.toPath(200, { shape }).groups)
      expect(commands.length).toBeGreaterThan(0)
      expect(commands.every((c) => c.op !== undefined)).toBe(true)
    }
  })

  test('each eye pattern shape produces commands consumable by a canvas-style replayer', () => {
    const matrix = new Matrix('example', 'H')
    const eyePatternShapes = ['square', 'rounded'] as const

    for (const eyePatternShape of eyePatternShapes) {
      const commands = bodyCommands(
        matrix.toPath(200, { eyePatternShape }).groups,
      )
      expect(commands.length).toBeGreaterThan(0)
      expect(commands.every((c) => c.op !== undefined)).toBe(true)
    }
  })
})

describe('toPath eyeColor override', () => {
  test('splits the 3 finder eyes into their own fill groups', () => {
    const matrix = new Matrix('example', 'H')
    const { groups } = matrix.toPath(200, { eyeColor: '#f00' })

    // background + 3 eyes + body
    expect(groups.length).toBe(5)
    for (const group of groups.slice(1, 4)) {
      expect(group.fill).toBe('#f00')
    }
    expect(groups[groups.length - 1].fill).toBe('#000')
  })

  test('applies distinct colors per eye when given an array of 3', () => {
    const matrix = new Matrix('example', 'H')
    const { groups } = matrix.toPath(200, {
      eyeColor: ['#f00', '#0f0', '#00f'],
    })

    expect(groups[1].fill).toBe('#f00')
    expect(groups[2].fill).toBe('#0f0')
    expect(groups[3].fill).toBe('#00f')
  })
})
