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
