/**
 * The small dense linear algebra the constraint solver needs. Everything is
 * row-major `Float64Array` so a Gauss-Newton step stays allocation-light.
 */
export class Matrix {
  readonly rows: number
  readonly cols: number
  private readonly data: Float64Array

  constructor(rows: number, cols: number) {
    this.rows = rows
    this.cols = cols
    this.data = new Float64Array(rows * cols)
  }

  static fromRows(rows: readonly (readonly number[])[]): Matrix {
    const cols = rows[0]?.length ?? 0
    const matrix = new Matrix(rows.length, cols)
    rows.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => matrix.set(rowIndex, colIndex, value))
    })
    return matrix
  }

  private offset(row: number, col: number): number {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      throw new RangeError(`Matrix index (${row}, ${col}) is outside ${this.rows}x${this.cols}`)
    }
    return row * this.cols + col
  }

  get(row: number, col: number): number {
    return this.data[this.offset(row, col)] as number
  }

  set(row: number, col: number, value: number): void {
    this.data[this.offset(row, col)] = value
  }

  toRows(): number[][] {
    return Array.from({ length: this.rows }, (_unused, row) =>
      Array.from({ length: this.cols }, (_unusedCol, col) => this.get(row, col)),
    )
  }
}

/**
 * Solves `A x = b` by Gaussian elimination with partial pivoting. Returns
 * `null` when `A` is singular to working precision.
 */
export function solveLinearSystem(
  matrix: Matrix,
  rhs: readonly number[],
  tolerance = 1e-12,
): number[] | null {
  const n = matrix.rows
  if (rhs.length !== n) {
    throw new Error(`Right-hand side size ${rhs.length} does not match ${n} rows`)
  }

  const augmented = matrix.toRows().map((row, index) => [...row, rhs[index] as number])

  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot
    for (let row = pivot + 1; row < n; row += 1) {
      const candidate = Math.abs((augmented[row] as number[])[pivot] as number)
      if (candidate > Math.abs((augmented[best] as number[])[pivot] as number)) best = row
    }
    if (Math.abs((augmented[best] as number[])[pivot] as number) < tolerance) return null

    const temp = augmented[pivot] as number[]
    augmented[pivot] = augmented[best] as number[]
    augmented[best] = temp

    const pivotRow = augmented[pivot] as number[]
    const pivotValue = pivotRow[pivot] as number
    for (let row = pivot + 1; row < n; row += 1) {
      const target = augmented[row] as number[]
      const factor = (target[pivot] as number) / pivotValue
      if (factor === 0) continue
      for (let col = pivot; col <= n; col += 1) {
        target[col] = (target[col] as number) - factor * (pivotRow[col] as number)
      }
    }
  }

  const solution = new Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row -= 1) {
    const current = augmented[row] as number[]
    let sum = current[n] as number
    for (let col = row + 1; col < n; col += 1) {
      sum -= (current[col] as number) * (solution[col] as number)
    }
    solution[row] = sum / (current[row] as number)
  }
  return solution
}

export interface EchelonResult {
  /** Number of linearly independent rows. */
  readonly rank: number
  /** Columns that carry a pivot — the variables the equations determine. */
  readonly pivotColumns: number[]
}

/**
 * Row-reduces a copy of the matrix. Non-pivot columns are the free variables,
 * which is exactly what the sketch reports as remaining degrees of freedom.
 */
export function rowEchelon(matrix: Matrix, tolerance = 1e-9): EchelonResult {
  const rows = matrix.toRows()
  const pivotColumns: number[] = []
  let pivotRow = 0

  for (let col = 0; col < matrix.cols && pivotRow < matrix.rows; col += 1) {
    let best = pivotRow
    for (let row = pivotRow + 1; row < matrix.rows; row += 1) {
      if (
        Math.abs((rows[row] as number[])[col] as number) >
        Math.abs((rows[best] as number[])[col] as number)
      ) {
        best = row
      }
    }
    if (Math.abs((rows[best] as number[])[col] as number) < tolerance) continue

    const temp = rows[pivotRow] as number[]
    rows[pivotRow] = rows[best] as number[]
    rows[best] = temp

    const current = rows[pivotRow] as number[]
    const pivotValue = current[col] as number
    for (let row = pivotRow + 1; row < matrix.rows; row += 1) {
      const target = rows[row] as number[]
      const factor = (target[col] as number) / pivotValue
      if (factor === 0) continue
      for (let column = col; column < matrix.cols; column += 1) {
        target[column] = (target[column] as number) - factor * (current[column] as number)
      }
    }

    pivotColumns.push(col)
    pivotRow += 1
  }

  return { rank: pivotColumns.length, pivotColumns }
}
