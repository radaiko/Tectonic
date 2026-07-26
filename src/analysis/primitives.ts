import type { MeshData } from '../domain/MeshData'
import { triangleAt, triangleCount } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { add, cross, dot, length, normalize, scale, subtract } from '../domain/vec3'
import type { Triangle } from './types'

/** Two points and the distance between them — the result every solver returns. */
export interface ClosestPair {
  readonly distance: number
  readonly from: Vec3
  readonly to: Vec3
}

export function pair(from: Vec3, to: Vec3): ClosestPair {
  return { distance: length(subtract(to, from)), from, to }
}

export function meshTriangles(mesh: MeshData): Triangle[] {
  const triangles: Triangle[] = []
  for (let index = 0; index < triangleCount(mesh); index += 1) {
    const [a, b, c] = triangleAt(mesh, index)
    triangles.push({ a, b, c })
  }
  return triangles
}

export function triangleNormal(triangle: Triangle): Vec3 {
  return normalize(cross(subtract(triangle.b, triangle.a), subtract(triangle.c, triangle.a)))
}

export function triangleArea(triangle: Triangle): number {
  return (
    length(cross(subtract(triangle.b, triangle.a), subtract(triangle.c, triangle.a))) / 2
  )
}

/** The point of segment `a`–`b` closest to `point`, clamped to the ends. */
export function closestPointOnSegment(point: Vec3, a: Vec3, b: Vec3): Vec3 {
  const direction = subtract(b, a)
  const lengthSquared = dot(direction, direction)
  if (lengthSquared < 1e-24) return a
  const t = Math.min(1, Math.max(0, dot(subtract(point, a), direction) / lengthSquared))
  return add(a, scale(direction, t))
}

/**
 * Closest points on two segments. Uses the standard clamped-parameter solution;
 * parallel segments fall back to clamping one end against the other segment,
 * which lands on a valid pair even though the answer is not unique.
 */
export function closestPointsOnSegments(a1: Vec3, a2: Vec3, b1: Vec3, b2: Vec3): ClosestPair {
  const d1 = subtract(a2, a1)
  const d2 = subtract(b2, b1)
  const r = subtract(a1, b1)
  const squared1 = dot(d1, d1)
  const squared2 = dot(d2, d2)
  const f = dot(d2, r)

  if (squared1 < 1e-24 && squared2 < 1e-24) return pair(a1, b1)
  if (squared1 < 1e-24) return pair(a1, closestPointOnSegment(a1, b1, b2))
  if (squared2 < 1e-24) return pair(closestPointOnSegment(b1, a1, a2), b1)

  const c = dot(d1, r)
  const b = dot(d1, d2)
  const denominator = squared1 * squared2 - b * b

  let s = denominator > 1e-18 ? clamp01((b * f - c * squared2) / denominator) : 0
  let t = (b * s + f) / squared2

  if (t < 0) {
    t = 0
    s = clamp01(-c / squared1)
  } else if (t > 1) {
    t = 1
    s = clamp01((b - c) / squared1)
  }

  return pair(add(a1, scale(d1, s)), add(b1, scale(d2, t)))
}

/** The point of a triangle closest to `point`, including its edges and corners. */
export function closestPointOnTriangle(point: Vec3, triangle: Triangle): Vec3 {
  const { a, b, c } = triangle
  const ab = subtract(b, a)
  const ac = subtract(c, a)
  const ap = subtract(point, a)

  const d1 = dot(ab, ap)
  const d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return a

  const bp = subtract(point, b)
  const d3 = dot(ab, bp)
  const d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return b

  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const denominator = d1 - d3
    return add(a, scale(ab, denominator === 0 ? 0 : d1 / denominator))
  }

  const cp = subtract(point, c)
  const d5 = dot(ab, cp)
  const d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return c

  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const denominator = d2 - d6
    return add(a, scale(ac, denominator === 0 ? 0 : d2 / denominator))
  }

  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const denominator = d4 - d3 + (d5 - d6)
    const w = denominator === 0 ? 0 : (d4 - d3) / denominator
    return add(b, scale(subtract(c, b), w))
  }

  const denominator = va + vb + vc
  if (denominator === 0) return a
  return add(add(a, scale(ab, vb / denominator)), scale(ac, vc / denominator))
}

export function pointTriangleDistance(point: Vec3, triangle: Triangle): ClosestPair {
  return pair(point, closestPointOnTriangle(point, triangle))
}

const TRIANGLE_EDGES: readonly (readonly ['a' | 'b' | 'c', 'a' | 'b' | 'c'])[] = [
  ['a', 'b'],
  ['b', 'c'],
  ['c', 'a'],
]

/**
 * Closest points between a segment and a triangle. Checks the segment against
 * every triangle edge, then both segment ends against the triangle interior —
 * between them those cases cover every way two disjoint convex sets can touch.
 */
export function segmentTriangleDistance(start: Vec3, end: Vec3, triangle: Triangle): ClosestPair {
  // A segment that pierces the triangle has both ends off it, so the edge and
  // corner tests below would miss the crossing; check for it first.
  const crossing = segmentTriangleIntersection(start, end, triangle)
  if (crossing) return { distance: 0, from: crossing, to: crossing }

  const candidates: ClosestPair[] = [
    pointTriangleDistance(start, triangle),
    pointTriangleDistance(end, triangle),
  ]
  for (const [from, to] of TRIANGLE_EDGES) {
    candidates.push(closestPointsOnSegments(start, end, triangle[from], triangle[to]))
  }
  return nearest(candidates)
}

/** The closest of a set of candidate pairs. The set is never empty by construction. */
function nearest(candidates: readonly ClosestPair[]): ClosestPair {
  let best = candidates[0] as ClosestPair
  for (const candidate of candidates) {
    if (candidate.distance < best.distance) best = candidate
  }
  return best
}

/** Where a segment pierces a triangle, or null when it misses (Möller–Trumbore). */
export function segmentTriangleIntersection(
  start: Vec3,
  end: Vec3,
  triangle: Triangle,
): Vec3 | null {
  const direction = subtract(end, start)
  const edge1 = subtract(triangle.b, triangle.a)
  const edge2 = subtract(triangle.c, triangle.a)
  const h = cross(direction, edge2)
  const determinant = dot(edge1, h)
  if (Math.abs(determinant) < 1e-12) return null

  const inverse = 1 / determinant
  const s = subtract(start, triangle.a)
  const u = inverse * dot(s, h)
  if (u < 0 || u > 1) return null

  const q = cross(s, edge1)
  const v = inverse * dot(direction, q)
  if (v < 0 || u + v > 1) return null

  const t = inverse * dot(edge2, q)
  if (t < 0 || t > 1) return null
  return add(start, scale(direction, t))
}

export function triangleTriangleDistance(first: Triangle, second: Triangle): ClosestPair {
  const candidates: ClosestPair[] = []
  for (const [from, to] of TRIANGLE_EDGES) {
    const forward = segmentTriangleDistance(first[from], first[to], second)
    if (forward.distance === 0) return forward
    candidates.push(forward)

    const backward = segmentTriangleDistance(second[from], second[to], first)
    if (backward.distance === 0) return { distance: 0, from: backward.to, to: backward.from }
    candidates.push({ distance: backward.distance, from: backward.to, to: backward.from })
  }
  return nearest(candidates)
}

/** Axis-aligned bounds of a triangle, used to prune distance searches. */
export interface Bounds {
  readonly min: Vec3
  readonly max: Vec3
}

export function triangleBounds(triangle: Triangle): Bounds {
  return {
    min: {
      x: Math.min(triangle.a.x, triangle.b.x, triangle.c.x),
      y: Math.min(triangle.a.y, triangle.b.y, triangle.c.y),
      z: Math.min(triangle.a.z, triangle.b.z, triangle.c.z),
    },
    max: {
      x: Math.max(triangle.a.x, triangle.b.x, triangle.c.x),
      y: Math.max(triangle.a.y, triangle.b.y, triangle.c.y),
      z: Math.max(triangle.a.z, triangle.b.z, triangle.c.z),
    },
  }
}

/** A lower bound on the distance between two boxes — zero when they overlap. */
export function boundsGap(first: Bounds, second: Bounds): number {
  const dx = Math.max(0, first.min.x - second.max.x, second.min.x - first.max.x)
  const dy = Math.max(0, first.min.y - second.max.y, second.min.y - first.max.y)
  const dz = Math.max(0, first.min.z - second.max.z, second.min.z - first.max.z)
  return Math.hypot(dx, dy, dz)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
