import type { Vec2 } from '../sketch/domain/geometry'

/**
 * 2D affine transforms in the SVG convention:
 * `x' = a·x + c·y + e`, `y' = b·x + d·y + f`.
 */
export interface Matrix2D {
  readonly a: number
  readonly b: number
  readonly c: number
  readonly d: number
  readonly e: number
  readonly f: number
}

export const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

/** `outer` applied after `inner` — the order SVG nests transforms in. */
export function multiply(outer: Matrix2D, inner: Matrix2D): Matrix2D {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  }
}

export function applyMatrix(matrix: Matrix2D, point: Vec2): Vec2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

/** Transforms a direction — the translation is left out. */
export function applyMatrixVector(matrix: Matrix2D, point: Vec2): Vec2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y,
    y: matrix.b * point.x + matrix.d * point.y,
  }
}

export function determinant(matrix: Matrix2D): number {
  return matrix.a * matrix.d - matrix.b * matrix.c
}

/**
 * Whether the matrix scales every direction equally — a rotation, a reflection
 * and a uniform scale, in any combination. Circles stay circles only then.
 */
export function isUniformMatrix(matrix: Matrix2D, tolerance = 1e-9): boolean {
  const columnX = matrix.a * matrix.a + matrix.b * matrix.b
  const columnY = matrix.c * matrix.c + matrix.d * matrix.d
  const skew = matrix.a * matrix.c + matrix.b * matrix.d
  return Math.abs(columnX - columnY) <= tolerance && Math.abs(skew) <= tolerance
}

/** The factor a uniform matrix multiplies lengths by. */
export function uniformScaleOf(matrix: Matrix2D): number {
  return Math.hypot(matrix.a, matrix.b)
}

export function translation(x: number, y: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y }
}

export function scaling(x: number, y = x): Matrix2D {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }
}

export function rotation(radians: number): Matrix2D {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
}

const TRANSFORM_PATTERN = /([a-zA-Z]+)\s*\(([^)]*)\)/g

/**
 * Parses an SVG `transform` attribute. Functions compose left to right, so the
 * leftmost is applied last — the same rule as nested groups.
 */
export function parseTransform(source: string): Matrix2D {
  let matrix = IDENTITY
  TRANSFORM_PATTERN.lastIndex = 0

  let match = TRANSFORM_PATTERN.exec(source)
  while (match) {
    const name = (match[1] ?? '').toLowerCase()
    const args = (match[2] ?? '')
      .split(/[\s,]+/)
      .filter((token) => token.length > 0)
      .map(Number)
      .filter((value) => Number.isFinite(value))
    matrix = multiply(matrix, transformFunction(name, args))
    match = TRANSFORM_PATTERN.exec(source)
  }
  return matrix
}

function transformFunction(name: string, args: readonly number[]): Matrix2D {
  const arg = (index: number, fallback = 0): number => args[index] ?? fallback

  switch (name) {
    case 'translate':
      return translation(arg(0), arg(1))
    case 'scale':
      return scaling(arg(0, 1), args.length > 1 ? arg(1, 1) : arg(0, 1))
    case 'rotate': {
      const spin = rotation((arg(0) * Math.PI) / 180)
      if (args.length < 3) return spin
      // rotate(a, cx, cy) spins about a point rather than the origin.
      return multiply(multiply(translation(arg(1), arg(2)), spin), translation(-arg(1), -arg(2)))
    }
    case 'matrix':
      return { a: arg(0, 1), b: arg(1), c: arg(2), d: arg(3, 1), e: arg(4), f: arg(5) }
    case 'skewx':
      return { a: 1, b: 0, c: Math.tan((arg(0) * Math.PI) / 180), d: 1, e: 0, f: 0 }
    case 'skewy':
      return { a: 1, b: Math.tan((arg(0) * Math.PI) / 180), c: 0, d: 1, e: 0, f: 0 }
    default:
      return IDENTITY
  }
}
