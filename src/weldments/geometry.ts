import {
  addVec3,
  cross,
  dotVec3,
  lengthVec3,
  normalize,
  scaleVec3,
  subtractVec3,
} from '../features/geometry/plane'
import type { PlaneFrame, Vec3 } from '../kernel/IKernel'
import { WeldmentError } from './types'

const DEG = Math.PI / 180

/** Below this two directions count as parallel when choosing an up vector. */
const PARALLEL_LIMIT = 0.99

/**
 * The section plane a member is swept from: normal along the path, and an up
 * direction that stays as close to world +Z as the path allows so a beam laid
 * out in plan comes out the right way up without anyone saying so.
 *
 * `roll` turns the section about the path afterwards, in degrees.
 */
export function memberFrame(origin: Vec3, tangent: Vec3, roll = 0, up?: Vec3): PlaneFrame {
  const normal = normalize(tangent)
  if (lengthVec3(normal) === 0) {
    throw new WeldmentError('A member needs a path with a direction')
  }

  const reference = up ?? preferredUp(normal)
  const projected = subtractVec3(reference, scaleVec3(normal, dotVec3(normal, reference)))
  if (lengthVec3(projected) < 1e-9) {
    throw new WeldmentError('The up direction of a member cannot lie along its path')
  }

  const yAxis = normalize(projected)
  // cross(x, y) === normal, so the sweep runs along the path by construction.
  const xAxis = cross(yAxis, normal)
  return roll === 0 ? { origin, xAxis, yAxis } : { origin, ...rollAxes(xAxis, yAxis, roll) }
}

/** World +Z, unless the path is running up it, in which case world +Y. */
export function preferredUp(tangent: Vec3): Vec3 {
  return Math.abs(dotVec3(normalize(tangent), { x: 0, y: 0, z: 1 })) > PARALLEL_LIMIT
    ? { x: 0, y: 1, z: 0 }
    : { x: 0, y: 0, z: 1 }
}

/** Turns the two in-plane axes about their own normal, keeping the frame right-handed. */
function rollAxes(xAxis: Vec3, yAxis: Vec3, degrees: number): { xAxis: Vec3; yAxis: Vec3 } {
  const cos = Math.cos(degrees * DEG)
  const sin = Math.sin(degrees * DEG)
  return {
    xAxis: addVec3(scaleVec3(xAxis, cos), scaleVec3(yAxis, sin)),
    yAxis: addVec3(scaleVec3(yAxis, cos), scaleVec3(xAxis, -sin)),
  }
}

/** Turns a frame around so it faces the other way along its own normal. */
export function flipFrame(frame: PlaneFrame): PlaneFrame {
  return { origin: frame.origin, xAxis: frame.yAxis, yAxis: frame.xAxis }
}

/** A plane through `origin` whose normal is `direction`, with any two axes in it. */
export function planeAt(origin: Vec3, direction: Vec3): PlaneFrame {
  const normal = normalize(direction)
  if (lengthVec3(normal) === 0) throw new WeldmentError('A cutting plane needs a direction')

  const reference = preferredUp(normal)
  const yAxis = normalize(subtractVec3(reference, scaleVec3(normal, dotVec3(normal, reference))))
  return { origin, xAxis: cross(yAxis, normal), yAxis }
}

/** Total length of a polyline. Zero for fewer than two points. */
export function polylineLength(points: readonly Vec3[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += lengthVec3(subtractVec3(points[index] as Vec3, points[index - 1] as Vec3))
  }
  return total
}

/**
 * The direction a polyline leaves one of its ends in, pointing away from the
 * polyline — which is what a joint needs to bisect two members.
 */
export function endDirection(points: readonly Vec3[], end: 'start' | 'end'): Vec3 {
  if (points.length < 2) throw new WeldmentError('A path needs at least two points')

  if (end === 'start') {
    return normalize(subtractVec3(points[0] as Vec3, points[1] as Vec3))
  }
  const last = points.length - 1
  return normalize(subtractVec3(points[last] as Vec3, points[last - 1] as Vec3))
}

/** The direction the polyline runs in at one of its ends, start towards end. */
export function endTangent(points: readonly Vec3[], end: 'start' | 'end'): Vec3 {
  if (points.length < 2) throw new WeldmentError('A path needs at least two points')

  if (end === 'start') {
    return normalize(subtractVec3(points[1] as Vec3, points[0] as Vec3))
  }
  const last = points.length - 1
  return normalize(subtractVec3(points[last] as Vec3, points[last - 1] as Vec3))
}

/** Shortest distance from a point to a segment, and where on it that falls. */
export function closestOnSegment(
  point: Vec3,
  a: Vec3,
  b: Vec3,
): { readonly distance: number; readonly parameter: number; readonly point: Vec3 } {
  const along = subtractVec3(b, a)
  const lengthSquared = dotVec3(along, along)
  if (lengthSquared < 1e-18) {
    return { distance: lengthVec3(subtractVec3(point, a)), parameter: 0, point: a }
  }

  const raw = dotVec3(subtractVec3(point, a), along) / lengthSquared
  const parameter = Math.max(0, Math.min(1, raw))
  const closest = addVec3(a, scaleVec3(along, parameter))
  return { distance: lengthVec3(subtractVec3(point, closest)), parameter, point: closest }
}

/** Shortest distance from a point to a polyline, and the segment it lands on. */
export function closestOnPolyline(
  point: Vec3,
  points: readonly Vec3[],
): { readonly distance: number; readonly segment: number; readonly point: Vec3 } {
  let best = { distance: Infinity, segment: 0, point: points[0] ?? point }
  for (let index = 1; index < points.length; index += 1) {
    const hit = closestOnSegment(point, points[index - 1] as Vec3, points[index] as Vec3)
    if (hit.distance < best.distance) {
      best = { distance: hit.distance, segment: index - 1, point: hit.point }
    }
  }
  return best
}

/** Angle between two directions, in degrees, in the range [0, 180]. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const cosine = dotVec3(normalize(a), normalize(b))
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / DEG
}

export { addVec3, cross, dotVec3, lengthVec3, normalize, scaleVec3, subtractVec3 }
