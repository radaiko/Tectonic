/**
 * Planar geometry helpers shared by the solver, snap system, renderer and tools.
 * Pure functions on plain objects — nothing here knows about entities.
 */

export interface Vec2 {
  readonly x: number
  readonly y: number
}

export const TAU = Math.PI * 2

/** Distances below this are treated as zero throughout the sketch system. */
export const EPSILON = 1e-9

export function vec(x: number, y: number): Vec2 {
  return { x, y }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(a: Vec2, factor: number): Vec2 {
  return { x: a.x * factor, y: a.y * factor }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

/** 2D cross product — the z component of the 3D cross of the lifted vectors. */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y)
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function normalize(a: Vec2): Vec2 {
  const len = length(a)
  return len < EPSILON ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len }
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x)
}

/** Wraps any angle into `[0, 2pi)`. */
export function normalizeAngle(angle: number): number {
  const wrapped = angle % TAU
  return wrapped < 0 ? wrapped + TAU : wrapped
}

/** Unsigned angle between two directions, in `[0, pi]`. */
export function angleBetween(a: Vec2, b: Vec2): number {
  const cosine = dot(normalize(a), normalize(b))
  return Math.acos(Math.min(1, Math.max(-1, cosine)))
}

export function pointOnCircle(center: Vec2, radius: number, angle: number): Vec2 {
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
}

export function closestPointOnSegment(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const along = sub(b, a)
  const lengthSquared = dot(along, along)
  if (lengthSquared < EPSILON) return a
  const t = Math.min(1, Math.max(0, dot(sub(point, a), along) / lengthSquared))
  return add(a, scale(along, t))
}

export function distanceToSegment(point: Vec2, a: Vec2, b: Vec2): number {
  return distance(point, closestPointOnSegment(point, a, b))
}

/**
 * Intersection of the lines through `a1..a2` and `b1..b2`. With
 * `segmentsOnly` the hit must lie within both segments.
 */
export function lineLineIntersection(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
  segmentsOnly = false,
): Vec2 | null {
  const dirA = sub(a2, a1)
  const dirB = sub(b2, b1)
  const denominator = cross(dirA, dirB)
  if (Math.abs(denominator) < EPSILON) return null

  const offset = sub(b1, a1)
  const t = cross(offset, dirB) / denominator
  const u = cross(offset, dirA) / denominator
  if (segmentsOnly && (t < 0 || t > 1 || u < 0 || u > 1)) return null

  return add(a1, scale(dirA, t))
}

/** Crossings of the infinite line `a..b` with a circle. Tangency yields one hit. */
export function lineCircleIntersections(
  a: Vec2,
  b: Vec2,
  center: Vec2,
  radius: number,
): Vec2[] {
  const direction = sub(b, a)
  const lengthSquared = dot(direction, direction)
  if (lengthSquared < EPSILON) return []

  const toStart = sub(a, center)
  const half = dot(toStart, direction) / lengthSquared
  const constant = (dot(toStart, toStart) - radius * radius) / lengthSquared
  const discriminant = half * half - constant
  if (discriminant < -EPSILON) return []
  if (discriminant <= EPSILON) return [add(a, scale(direction, -half))]

  const root = Math.sqrt(discriminant)
  return [add(a, scale(direction, -half - root)), add(a, scale(direction, -half + root))]
}

export function circleCircleIntersections(
  center1: Vec2,
  radius1: number,
  center2: Vec2,
  radius2: number,
): Vec2[] {
  const between = sub(center2, center1)
  const separation = length(between)
  if (separation < EPSILON) return []
  if (separation > radius1 + radius2 + EPSILON) return []
  if (separation < Math.abs(radius1 - radius2) - EPSILON) return []

  const along = (separation * separation - radius2 * radius2 + radius1 * radius1) / (2 * separation)
  const heightSquared = radius1 * radius1 - along * along
  const base = add(center1, scale(between, along / separation))
  if (heightSquared <= EPSILON) return [base]

  const height = Math.sqrt(heightSquared)
  const perpendicular = { x: -between.y / separation, y: between.x / separation }
  return [add(base, scale(perpendicular, height)), add(base, scale(perpendicular, -height))]
}

/** Whether `angle` lies on the sweep from `startAngle` to `endAngle`. */
export function arcContainsAngle(
  startAngle: number,
  endAngle: number,
  clockwise: boolean,
  angle: number,
): boolean {
  const sweep = clockwise
    ? normalizeAngle(startAngle - endAngle)
    : normalizeAngle(endAngle - startAngle)
  const offset = clockwise
    ? normalizeAngle(startAngle - angle)
    : normalizeAngle(angle - startAngle)
  return offset <= sweep + 1e-6
}
