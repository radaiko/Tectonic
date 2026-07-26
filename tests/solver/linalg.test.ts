import { describe, expect, it } from 'vitest'
import { Matrix, rowEchelon, solveLinearSystem } from '../../src/solver/linalg'

describe('Matrix', () => {
  it('starts filled with zeros', () => {
    const m = new Matrix(2, 3)
    expect(m.rows).toBe(2)
    expect(m.cols).toBe(3)
    expect(m.get(1, 2)).toBe(0)
  })

  it('stores and reads values', () => {
    const m = new Matrix(2, 2)
    m.set(1, 0, 7)
    expect(m.get(1, 0)).toBe(7)
  })

  it('builds from rows and converts back', () => {
    const rows = [
      [1, 2],
      [3, 4],
    ]
    expect(Matrix.fromRows(rows).toRows()).toEqual(rows)
  })

  it('rejects out-of-range access', () => {
    const m = new Matrix(1, 1)
    expect(() => m.get(2, 0)).toThrow(RangeError)
    expect(() => m.set(0, 5, 1)).toThrow(RangeError)
  })
})

describe('solveLinearSystem', () => {
  it('solves a well-determined system', () => {
    const a = Matrix.fromRows([
      [2, 1],
      [1, 3],
    ])
    const solution = solveLinearSystem(a, [5, 10])
    expect(solution?.[0]).toBeCloseTo(1)
    expect(solution?.[1]).toBeCloseTo(3)
  })

  it('uses partial pivoting when the first pivot is zero', () => {
    const a = Matrix.fromRows([
      [0, 1],
      [1, 0],
    ])
    expect(solveLinearSystem(a, [2, 3])).toEqual([3, 2])
  })

  it('returns null for a singular system', () => {
    const a = Matrix.fromRows([
      [1, 2],
      [2, 4],
    ])
    expect(solveLinearSystem(a, [1, 2])).toBeNull()
  })

  it('rejects a right-hand side of the wrong size', () => {
    expect(() => solveLinearSystem(Matrix.fromRows([[1]]), [1, 2])).toThrow(/size/)
  })
})

describe('rowEchelon', () => {
  it('reports full rank for independent rows', () => {
    const result = rowEchelon(
      Matrix.fromRows([
        [1, 0],
        [0, 1],
      ]),
    )
    expect(result.rank).toBe(2)
    expect(result.pivotColumns).toEqual([0, 1])
  })

  it('detects a dependent row', () => {
    const result = rowEchelon(
      Matrix.fromRows([
        [1, 2],
        [2, 4],
      ]),
    )
    expect(result.rank).toBe(1)
    expect(result.pivotColumns).toEqual([0])
  })

  it('names the columns that stay free', () => {
    const result = rowEchelon(Matrix.fromRows([[0, 1, 0]]))
    expect(result.rank).toBe(1)
    expect(result.pivotColumns).toEqual([1])
  })

  it('handles an empty matrix', () => {
    expect(rowEchelon(new Matrix(0, 0))).toEqual({ rank: 0, pivotColumns: [] })
  })
})
