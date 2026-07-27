import type { Vec2 } from '../../sketch/domain/geometry'

/**
 * The flat-geometry vocabulary the drawing views are built out of: segments,
 * boxes and the handful of clipping operations a view needs. Pure functions on
 * plain objects — nothing here knows about meshes or sheets.
 */

export interface Segment2 {
  readonly a: Vec2
  readonly b: Vec2
}

export interface Bounds2 {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export const EMPTY_BOUNDS: Bounds2 = { minX: 0, minY: 0, maxX: 0, maxY: 0 }

export function boundsOf(segments: readonly Segment2[]): Bounds2 {
  if (segments.length === 0) return EMPTY_BOUNDS

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const segment of segments) {
    for (const point of [segment.a, segment.b]) {
      if (point.x < minX) minX = point.x
      if (point.y < minY) minY = point.y
      if (point.x > maxX) maxX = point.x
      if (point.y > maxY) maxY = point.y
    }
  }
  return { minX, minY, maxX, maxY }
}

export function unionBounds(a: Bounds2, b: Bounds2): Bounds2 {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

export function boundsWidth(bounds: Bounds2): number {
  return bounds.maxX - bounds.minX
}

export function boundsHeight(bounds: Bounds2): number {
  return bounds.maxY - bounds.minY
}

export function boundsCenter(bounds: Bounds2): Vec2 {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
}

export function isEmptyBounds(bounds: Bounds2): boolean {
  return !(bounds.maxX > bounds.minX) && !(bounds.maxY > bounds.minY)
}

export function expandBounds(bounds: Bounds2, amount: number): Bounds2 {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  }
}

export function boundsOverlap(a: Bounds2, b: Bounds2): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY
}

export function segmentLength(segment: Segment2): number {
  return Math.hypot(segment.b.x - segment.a.x, segment.b.y - segment.a.y)
}

export function pointOnSegment(segment: Segment2, t: number): Vec2 {
  return {
    x: segment.a.x + (segment.b.x - segment.a.x) * t,
    y: segment.a.y + (segment.b.y - segment.a.y) * t,
  }
}

export function translateSegment(segment: Segment2, offset: Vec2): Segment2 {
  return {
    a: { x: segment.a.x + offset.x, y: segment.a.y + offset.y },
    b: { x: segment.b.x + offset.x, y: segment.b.y + offset.y },
  }
}

export function scaleSegment(segment: Segment2, factor: number, about: Vec2 = { x: 0, y: 0 }): Segment2 {
  return { a: scalePoint(segment.a, factor, about), b: scalePoint(segment.b, factor, about) }
}

export function scalePoint(point: Vec2, factor: number, about: Vec2 = { x: 0, y: 0 }): Vec2 {
  return {
    x: about.x + (point.x - about.x) * factor,
    y: about.y + (point.y - about.y) * factor,
  }
}

export function rotatePoint(point: Vec2, radians: number, about: Vec2 = { x: 0, y: 0 }): Vec2 {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - about.x
  const dy = point.y - about.y
  return { x: about.x + dx * cos - dy * sin, y: about.y + dx * sin + dy * cos }
}

export function rotateSegment(segment: Segment2, radians: number, about: Vec2 = { x: 0, y: 0 }): Segment2 {
  return { a: rotatePoint(segment.a, radians, about), b: rotatePoint(segment.b, radians, about) }
}

/**
 * Where two segments cross, as parameters along each. Returns null when they
 * are parallel or when the crossing falls outside either segment.
 */
export function segmentIntersection(
  first: Segment2,
  second: Segment2,
  epsilon = 1e-12,
): { readonly t: number; readonly u: number } | null {
  const r = { x: first.b.x - first.a.x, y: first.b.y - first.a.y }
  const s = { x: second.b.x - second.a.x, y: second.b.y - second.a.y }
  const denominator = r.x * s.y - r.y * s.x
  if (Math.abs(denominator) < epsilon) return null

  const qp = { x: second.a.x - first.a.x, y: second.a.y - first.a.y }
  const t = (qp.x * s.y - qp.y * s.x) / denominator
  const u = (qp.x * r.y - qp.y * r.x) / denominator
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { t, u }
}

/**
 * The part of `segment` inside the circle. Returns null when it misses; the
 * detail view uses this to trim its parent's line work to the detail circle.
 */
export function clipSegmentToCircle(
  segment: Segment2,
  center: Vec2,
  radius: number,
): Segment2 | null {
  const d = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y }
  const f = { x: segment.a.x - center.x, y: segment.a.y - center.y }
  const a = d.x * d.x + d.y * d.y
  if (a === 0) {
    return Math.hypot(f.x, f.y) <= radius ? segment : null
  }

  const b = 2 * (f.x * d.x + f.y * d.y)
  const c = f.x * f.x + f.y * f.y - radius * radius
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return null

  const root = Math.sqrt(discriminant)
  const enter = Math.max((-b - root) / (2 * a), 0)
  const exit = Math.min((-b + root) / (2 * a), 1)
  if (exit <= enter) return null
  return { a: pointOnSegment(segment, enter), b: pointOnSegment(segment, exit) }
}

/** The part of `segment` inside the box, or null when it falls outside. */
export function clipSegmentToBounds(segment: Segment2, bounds: Bounds2): Segment2 | null {
  // Liang–Barsky: shrink the parameter range against each of the four edges.
  let enter = 0
  let exit = 1
  const dx = segment.b.x - segment.a.x
  const dy = segment.b.y - segment.a.y

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0
    const r = q / p
    if (p < 0) {
      if (r > exit) return false
      if (r > enter) enter = r
    } else {
      if (r < enter) return false
      if (r < exit) exit = r
    }
    return true
  }

  if (!clip(-dx, segment.a.x - bounds.minX)) return null
  if (!clip(dx, bounds.maxX - segment.a.x)) return null
  if (!clip(-dy, segment.a.y - bounds.minY)) return null
  if (!clip(dy, bounds.maxY - segment.a.y)) return null
  if (exit <= enter) return null
  return { a: pointOnSegment(segment, enter), b: pointOnSegment(segment, exit) }
}

/** Whether a point lies inside a closed polygon, by the even-odd rule. */
export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i] as Vec2
    const b = polygon[j] as Vec2
    const straddles = a.y > point.y !== b.y > point.y
    if (!straddles) continue
    const x = a.x + ((point.y - a.y) / (b.y - a.y)) * (b.x - a.x)
    if (point.x < x) inside = !inside
  }
  return inside
}

/** Signed area of a closed polygon; positive when wound counter-clockwise. */
export function polygonArea(polygon: readonly Vec2[]): number {
  let total = 0
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i] as Vec2
    const b = polygon[j] as Vec2
    total += (b.x + a.x) * (b.y - a.y)
  }
  return total / 2
}

/**
 * Chains loose segments into closed loops by walking from each end to the
 * nearest matching one. Segments that never close simply come back as an open
 * chain, which a section boundary drawn from a leaky mesh will do.
 */
export function chainSegments(segments: readonly Segment2[], tolerance = 1e-6): Vec2[][] {
  const remaining = segments.filter((segment) => segmentLength(segment) > tolerance)
  const key = (point: Vec2): string =>
    `${Math.round(point.x / tolerance)},${Math.round(point.y / tolerance)}`

  // Index every segment by both of its ends so the walk is a lookup, not a scan.
  const byEnd = new Map<string, number[]>()
  remaining.forEach((segment, index) => {
    for (const point of [segment.a, segment.b]) {
      const bucket = byEnd.get(key(point))
      if (bucket) bucket.push(index)
      else byEnd.set(key(point), [index])
    }
  })

  const used = new Array<boolean>(remaining.length).fill(false)
  const loops: Vec2[][] = []

  for (let start = 0; start < remaining.length; start += 1) {
    if (used[start]) continue
    const first = remaining[start] as Segment2
    used[start] = true

    const points: Vec2[] = [first.a, first.b]
    let head = first.b
    for (;;) {
      const candidates = byEnd.get(key(head)) ?? []
      const next = candidates.find((index) => !used[index])
      if (next === undefined) break
      const segment = remaining[next] as Segment2
      used[next] = true
      const forward = key(segment.a) === key(head)
      head = forward ? segment.b : segment.a
      points.push(head)
      if (key(head) === key(points[0] as Vec2)) break
    }
    if (points.length >= 2) loops.push(points)
  }
  return loops
}

/** Whether a chain came back to where it started. */
export function isClosedLoop(points: readonly Vec2[], tolerance = 1e-6): boolean {
  if (points.length < 3) return false
  const first = points[0] as Vec2
  const last = points[points.length - 1] as Vec2
  return Math.hypot(last.x - first.x, last.y - first.y) <= tolerance
}

/** A closed loop as the segments that make it up. */
export function loopSegments(points: readonly Vec2[]): Segment2[] {
  const segments: Segment2[] = []
  for (let index = 0; index + 1 < points.length; index += 1) {
    segments.push({ a: points[index] as Vec2, b: points[index + 1] as Vec2 })
  }
  if (!isClosedLoop(points) && points.length >= 3) {
    segments.push({ a: points[points.length - 1] as Vec2, b: points[0] as Vec2 })
  }
  return segments
}
