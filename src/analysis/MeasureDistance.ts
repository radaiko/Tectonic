import type { Vec3 } from '../domain/vec3'
import { dot, normalize, scale, subtract } from '../domain/vec3'
import { minimumDistanceBetweenTriangles } from './MinimumDistance'
import type { ClosestPair } from './primitives'
import {
  closestPointOnSegment,
  closestPointsOnSegments,
  meshTriangles,
  pair,
  pointTriangleDistance,
  segmentTriangleDistance,
} from './primitives'
import type { DistanceMeasurement, MeasureTarget, Triangle } from './types'

/**
 * What a target reduces to for the distance solver. A face with a known
 * tessellation becomes triangles; one without becomes its infinite plane, so a
 * datum plane can still be measured against.
 */
type Primitive =
  | { readonly kind: 'point'; readonly point: Vec3 }
  | { readonly kind: 'segment'; readonly start: Vec3; readonly end: Vec3 }
  | { readonly kind: 'plane'; readonly origin: Vec3; readonly normal: Vec3 }
  | { readonly kind: 'mesh'; readonly triangles: readonly Triangle[] }

function primitiveOf(target: MeasureTarget): Primitive {
  switch (target.kind) {
    case 'point':
      return { kind: 'point', point: target.position }
    case 'edge':
      return { kind: 'segment', start: target.start, end: target.end }
    case 'face':
      return target.triangles && target.triangles.length > 0
        ? { kind: 'mesh', triangles: target.triangles }
        : { kind: 'plane', origin: target.origin, normal: normalize(target.normal) }
    case 'body':
      return { kind: 'mesh', triangles: meshTriangles(target.mesh) }
  }
}

/**
 * Distance between any two selections: points, edges, faces or whole bodies.
 * The result carries the two points it was measured between, so the viewport can
 * draw the measurement where the user is looking.
 */
export function measureDistance(first: MeasureTarget, second: MeasureTarget): DistanceMeasurement {
  const closest = solve(primitiveOf(first), primitiveOf(second))
  return {
    distance: closest.distance,
    from: closest.from,
    to: closest.to,
    delta: subtract(closest.to, closest.from),
    parallel: areParallel(first, second),
  }
}

/** Straight-line distance between two points, the most common measurement. */
export function measurePointDistance(from: Vec3, to: Vec3): DistanceMeasurement {
  const closest = pair(from, to)
  return { ...closest, delta: subtract(to, from), parallel: false }
}

function solve(first: Primitive, second: Primitive): ClosestPair {
  // An empty body has nothing to measure to, so there is no meaningful answer;
  // report the anchors rather than an infinite distance.
  if (isEmpty(first) || isEmpty(second)) return pair(anchor(first), anchor(second))

  // Solved for one ordering only; the flipped case reuses it with the endpoints
  // swapped so every pair of kinds is covered by a single implementation.
  const forward = solveOrdered(first, second)
  if (forward) return forward
  const backward = solveOrdered(second, first)
  if (backward) return { distance: backward.distance, from: backward.to, to: backward.from }
  return pair(anchor(first), anchor(second))
}

function solveOrdered(first: Primitive, second: Primitive): ClosestPair | null {
  if (first.kind === 'point') {
    switch (second.kind) {
      case 'point':
        return pair(first.point, second.point)
      case 'segment':
        return pair(first.point, closestPointOnSegment(first.point, second.start, second.end))
      case 'plane':
        return pair(first.point, projectOnPlane(first.point, second.origin, second.normal))
      case 'mesh':
        return nearestOverTriangles(second.triangles, (triangle) =>
          pointTriangleDistance(first.point, triangle),
        )
    }
  }

  if (first.kind === 'segment') {
    switch (second.kind) {
      case 'segment':
        return closestPointsOnSegments(first.start, first.end, second.start, second.end)
      case 'plane':
        return segmentPlaneDistance(first.start, first.end, second.origin, second.normal)
      case 'mesh':
        return nearestOverTriangles(second.triangles, (triangle) =>
          segmentTriangleDistance(first.start, first.end, triangle),
        )
      default:
        return null
    }
  }

  if (first.kind === 'plane') {
    switch (second.kind) {
      case 'plane':
        return planePlaneDistance(first, second)
      case 'mesh':
        return meshPlaneDistance(second.triangles, first.origin, first.normal)
      default:
        return null
    }
  }

  if (first.kind === 'mesh' && second.kind === 'mesh') {
    return minimumDistanceBetweenTriangles(first.triangles, second.triangles)
  }
  return null
}

function nearestOverTriangles(
  triangles: readonly Triangle[],
  measure: (triangle: Triangle) => ClosestPair,
): ClosestPair {
  let best: ClosestPair | undefined
  for (const triangle of triangles) {
    const candidate = measure(triangle)
    if (!best || candidate.distance < best.distance) best = candidate
    if (best.distance === 0) break
  }
  return best ?? pair({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })
}

function projectOnPlane(point: Vec3, origin: Vec3, normal: Vec3): Vec3 {
  return subtract(point, scale(normal, dot(subtract(point, origin), normal)))
}

function segmentPlaneDistance(start: Vec3, end: Vec3, origin: Vec3, normal: Vec3): ClosestPair {
  const startSide = dot(subtract(start, origin), normal)
  const endSide = dot(subtract(end, origin), normal)

  // Crossing the plane means the distance is zero, at the crossing point.
  if ((startSide > 0 && endSide < 0) || (startSide < 0 && endSide > 0)) {
    const t = startSide / (startSide - endSide)
    const crossing = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    }
    return { distance: 0, from: crossing, to: crossing }
  }

  const nearer = Math.abs(startSide) <= Math.abs(endSide) ? start : end
  return pair(nearer, projectOnPlane(nearer, origin, normal))
}

function planePlaneDistance(
  first: { origin: Vec3; normal: Vec3 },
  second: { origin: Vec3; normal: Vec3 },
): ClosestPair {
  // Planes that are not parallel intersect, so their distance is zero. The
  // reported point is arbitrary but has to lie on both, so use the projection.
  if (Math.abs(Math.abs(dot(first.normal, second.normal)) - 1) > 1e-9) {
    const point = projectOnPlane(first.origin, second.origin, second.normal)
    return { distance: 0, from: point, to: point }
  }
  return pair(first.origin, projectOnPlane(first.origin, second.origin, second.normal))
}

function meshPlaneDistance(
  triangles: readonly Triangle[],
  origin: Vec3,
  normal: Vec3,
): ClosestPair {
  return nearestOverTriangles(triangles, (triangle) => {
    const edges: readonly (readonly [Vec3, Vec3])[] = [
      [triangle.a, triangle.b],
      [triangle.b, triangle.c],
      [triangle.c, triangle.a],
    ]
    let best: ClosestPair | undefined
    for (const [from, to] of edges) {
      const candidate = segmentPlaneDistance(from, to, origin, normal)
      if (!best || candidate.distance < best.distance) best = candidate
    }
    return best as ClosestPair
  })
}

function isEmpty(primitive: Primitive): boolean {
  return primitive.kind === 'mesh' && primitive.triangles.length === 0
}

function anchor(primitive: Primitive): Vec3 {
  switch (primitive.kind) {
    case 'point':
      return primitive.point
    case 'segment':
      return primitive.start
    case 'plane':
      return primitive.origin
    case 'mesh':
      return primitive.triangles[0]?.a ?? { x: 0, y: 0, z: 0 }
  }
}

/** Direction a target runs along, for the parallel test. Null when it has none. */
function directionOf(target: MeasureTarget): Vec3 | null {
  if (target.kind === 'edge') return normalize(subtract(target.end, target.start))
  if (target.kind === 'face') return normalize(target.normal)
  return null
}

/**
 * Whether the distance between two targets is constant. Two edges are parallel
 * when their directions match; an edge and a face when the edge lies along the
 * face; two faces when their normals match.
 */
export function areParallel(first: MeasureTarget, second: MeasureTarget, tolerance = 1e-6): boolean {
  const a = directionOf(first)
  const b = directionOf(second)
  if (!a || !b) return false

  const alignment = Math.abs(dot(a, b))
  const bothFaces = first.kind === 'face' && second.kind === 'face'
  const bothEdges = first.kind === 'edge' && second.kind === 'edge'
  if (bothFaces || bothEdges) return Math.abs(alignment - 1) <= tolerance
  // One of each: the edge is parallel to the face when it is perpendicular to
  // the face's normal.
  return alignment <= tolerance
}
