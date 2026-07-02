import { describe, expect, test } from 'vitest'
import { Matrix } from '../src/matrix'

describe('generateMatrix', () => {
  test('should generate a matrix for a given value and error correction level', () => {
    const value = 'example'
    const matrix = new Matrix(value, 'M').getValue()

    // Check if the result is a 2D array
    expect(Array.isArray(matrix)).toBe(true)
    expect(Array.isArray(matrix[0])).toBe(true)

    // Check if all elements are either 0 or 1
    for (const row of matrix) {
      for (const cell of row) {
        expect(cell === 0 || cell === 1).toBe(true)
      }
    }

    // Check if the matrix is square
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

    // Check if the matrices are different
    expect(matrix1).not.toEqual(matrix2)
  })
})

describe('toPath quiet zone', () => {
  test('insets every drawn coordinate by a margin around the modules', () => {
    const size = 200
    const matrix = new Matrix('example', 'M')
    const moduleCount = matrix.getValue().length
    const { path, cellSize } = matrix.toPath(size)

    const coordinates = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
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
