import type { PlaneFrame, Vec3 } from '../../kernel/IKernel'
import type { SketchPlane } from '../../sketch/domain/SketchModel'
import {
  addVec3,
  cross,
  dotVec3,
  frameNormal,
  lengthVec3,
  negateVec3,
  normalize,
  offsetFrame,
  planeFrame,
  scaleVec3,
  subtractVec3,
} from './plane'

/**
 * Construction geometry: the planes, axes, points and coordinate systems a model
 * is positioned against but that are not themselves part of the solid.
 *
 * Everything here is a pure function over world-space data, returning plain
 * values a feature can store in its parameters and hand straight to the kernel.
 * Nothing holds state, so a reference plane is always exactly as good as the
 * inputs it was derived from — recompute it and it moves with them.
 */

/** An infinite line: a point on it plus a unit direction. */
export interface ReferenceAxis {
  readonly origin: Vec3
  readonly direction: Vec3
}

/** A right-handed frame of reference, used to place features off the origin. */
export interface CoordinateSystem {
  readonly origin: Vec3
  readonly xAxis: Vec3
  readonly yAxis: Vec3
  readonly zAxis: Vec3
}

/** Directions closer to parallel than this cannot define a plane between them. */
const PARALLEL_TOLERANCE = 1e-9

/* -------------------------------------------------------------------------- */
/* Planes                                                                      */
/* -------------------------------------------------------------------------- */

/** One of the three planes every document starts with. */
export function basePlane(plane: SketchPlane): PlaneFrame {
  return planeFrame(plane)
}

/** A plane parallel to `base`, `distance` along its normal. */
export function offsetPlane(base: PlaneFrame, distance: number): PlaneFrame {
  return offsetFrame(base, distance)
}

/**
 * `base` rotated about `axis` by `angle` degrees, hinged on the axis. The axis
 * is normally an edge lying in the plane, which is what makes this the "plane at
 * an angle to a face through an edge" construction.
 */
export function planeAtAngle(base: PlaneFrame, axis: ReferenceAxis, angle: number): PlaneFrame {
  const direction = normalize(axis.direction)
  if (lengthVec3(direction) === 0) {
    throw new ReferenceGeometryError('An angled plane needs a hinge axis with a direction')
  }
  const radians = (angle * Math.PI) / 180
  return {
    origin: axis.origin,
    xAxis: rotateAbout(base.xAxis, direction, radians),
    yAxis: rotateAbout(base.yAxis, direction, radians),
  }
}

/**
 * The plane halfway between two others. Parallel planes give the plane midway
 * along their shared normal; converging ones give the bisector through the line
 * where they meet.
 */
export function midPlane(first: PlaneFrame, second: PlaneFrame): PlaneFrame {
  const a = frameNormal(first)
  // Flip the second normal towards the first so the bisector splits the acute
  // angle rather than the reflex one.
  const b = dotVec3(a, frameNormal(second)) < 0 ? negateVec3(frameNormal(second)) : frameNormal(second)

  const bisector = addVec3(a, b)
  if (lengthVec3(bisector) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('Those planes face opposite ways and have no mid-plane')
  }

  const line = planeIntersectionAxis(first, second)
  if (line) return frameFromNormal(line.origin, normalize(bisector), line.direction)

  // Parallel: the mid-plane sits midway along the shared normal.
  const midpointOffset = (dotVec3(a, first.origin) + dotVec3(a, second.origin)) / 2
  return frameFromNormal(scaleVec3(a, midpointOffset), a, first.xAxis)
}

/** The plane through three points, oriented so `a`→`b` is its X axis. */
export function planeThroughPoints(a: Vec3, b: Vec3, c: Vec3): PlaneFrame {
  const along = subtractVec3(b, a)
  const normal = cross(along, subtractVec3(c, a))
  if (lengthVec3(normal) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('Those three points are in a line and define no plane')
  }
  return frameFromNormal(a, normalize(normal), along)
}

/** The plane containing an axis and a point off it. */
export function planeThroughLine(axis: ReferenceAxis, point: Vec3): PlaneFrame {
  const direction = normalize(axis.direction)
  const offset = subtractVec3(point, axis.origin)
  const normal = cross(direction, offset)
  if (lengthVec3(normal) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('That point lies on the line, so no plane is defined')
  }
  return frameFromNormal(axis.origin, normalize(normal), direction)
}

/**
 * The plane touching a cylinder along the side nearest `towards` — how a flat is
 * placed on a round boss before it is milled.
 */
export function tangentPlane(axis: ReferenceAxis, radius: number, towards: Vec3): PlaneFrame {
  if (!(radius > 0)) {
    throw new ReferenceGeometryError('A tangent plane needs a positive radius')
  }
  const direction = normalize(axis.direction)
  const offset = subtractVec3(towards, axis.origin)
  const radial = subtractVec3(offset, scaleVec3(direction, dotVec3(offset, direction)))
  if (lengthVec3(radial) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('That point is on the axis, so no tangent side is defined')
  }

  const outward = normalize(radial)
  const contact = addVec3(
    addVec3(axis.origin, scaleVec3(direction, dotVec3(offset, direction))),
    scaleVec3(outward, radius),
  )
  return frameFromNormal(contact, outward, direction)
}

/** The plane crossing an axis square-on at a point along it. */
export function planeNormalToAxis(axis: ReferenceAxis, distance = 0): PlaneFrame {
  const direction = normalize(axis.direction)
  if (lengthVec3(direction) === 0) {
    throw new ReferenceGeometryError('That axis has no direction')
  }
  return frameFromNormal(pointOnAxis(axis, distance), direction)
}

/* -------------------------------------------------------------------------- */
/* Axes                                                                        */
/* -------------------------------------------------------------------------- */

/** The axis running from `a` to `b` — the "axis through two points" case, and
 * equally the axis along an edge given its endpoints. */
export function axisThroughPoints(a: Vec3, b: Vec3): ReferenceAxis {
  const direction = subtractVec3(b, a)
  if (lengthVec3(direction) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('Those two points coincide, so no axis is defined')
  }
  return { origin: a, direction: normalize(direction) }
}

/** The axis of a cylindrical face, given its centre and the direction it runs. */
export function cylinderAxis(center: Vec3, direction: Vec3): ReferenceAxis {
  if (lengthVec3(direction) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('A cylinder axis needs a direction')
  }
  return { origin: center, direction: normalize(direction) }
}

/** The axis perpendicular to a plane, through a point on it. */
export function planeNormalAxis(plane: PlaneFrame, origin?: Vec3): ReferenceAxis {
  return { origin: origin ?? plane.origin, direction: frameNormal(plane) }
}

/**
 * Where two planes meet, or `null` when they are parallel. The origin returned
 * is the point on the line closest to the world origin, so the same pair of
 * planes always yields the same anchor.
 */
export function planeIntersectionAxis(
  first: PlaneFrame,
  second: PlaneFrame,
): ReferenceAxis | null {
  const a = frameNormal(first)
  const b = frameNormal(second)
  const direction = cross(a, b)
  const magnitude = lengthVec3(direction)
  if (magnitude < PARALLEL_TOLERANCE) return null

  const da = dotVec3(a, first.origin)
  const db = dotVec3(b, second.origin)
  const squared = magnitude * magnitude
  const origin = scaleVec3(
    addVec3(scaleVec3(cross(direction, b), da), scaleVec3(cross(a, direction), db)),
    1 / squared,
  )
  return { origin, direction: scaleVec3(direction, 1 / magnitude) }
}

/* -------------------------------------------------------------------------- */
/* Points                                                                      */
/* -------------------------------------------------------------------------- */

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scaleVec3(addVec3(a, b), 0.5)
}

/** The point `distance` along an axis from its origin. */
export function pointOnAxis(axis: ReferenceAxis, distance: number): Vec3 {
  return addVec3(axis.origin, scaleVec3(normalize(axis.direction), distance))
}

/** The centre of the circle through three points — an arc's centre, given its
 * ends and any point on it. */
export function circleCenter(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = subtractVec3(b, a)
  const ac = subtractVec3(c, a)
  const normal = cross(ab, ac)
  const squared = dotVec3(normal, normal)
  if (squared < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('Those three points are in a line and lie on no circle')
  }

  const toCenter = scaleVec3(
    addVec3(
      scaleVec3(cross(normal, ab), dotVec3(ac, ac)),
      scaleVec3(cross(ac, normal), dotVec3(ab, ab)),
    ),
    1 / (2 * squared),
  )
  return addVec3(a, toCenter)
}

/** Where an axis crosses a plane, or `null` when it runs parallel to it. */
export function axisPlaneIntersection(axis: ReferenceAxis, plane: PlaneFrame): Vec3 | null {
  const normal = frameNormal(plane)
  const direction = normalize(axis.direction)
  const along = dotVec3(normal, direction)
  if (Math.abs(along) < PARALLEL_TOLERANCE) return null

  const gap = dotVec3(normal, subtractVec3(plane.origin, axis.origin))
  return addVec3(axis.origin, scaleVec3(direction, gap / along))
}

/** The point on a plane directly under `point` — a point projected onto a face. */
export function projectOntoPlane(point: Vec3, plane: PlaneFrame): Vec3 {
  const normal = frameNormal(plane)
  const gap = dotVec3(normal, subtractVec3(point, plane.origin))
  return subtractVec3(point, scaleVec3(normal, gap))
}

/* -------------------------------------------------------------------------- */
/* Coordinate systems                                                          */
/* -------------------------------------------------------------------------- */

/** The world frame: the origin, with the axes every document starts from. */
export function worldCoordinateSystem(): CoordinateSystem {
  return {
    origin: { x: 0, y: 0, z: 0 },
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 1, z: 0 },
    zAxis: { x: 0, y: 0, z: 1 },
  }
}

/**
 * A right-handed system built from an origin, a direction for X and a hint for
 * Z. The hint only has to be roughly right: it is squared up against X, which is
 * what lets a user pick two rough edges and still get an orthonormal frame.
 */
export function coordinateSystem(origin: Vec3, xAxis: Vec3, zHint: Vec3): CoordinateSystem {
  const x = normalize(xAxis)
  if (lengthVec3(x) === 0) {
    throw new ReferenceGeometryError('A coordinate system needs an X direction')
  }

  const y = cross(normalize(zHint), x)
  if (lengthVec3(y) < PARALLEL_TOLERANCE) {
    throw new ReferenceGeometryError('The X and Z directions are parallel')
  }
  const yAxis = normalize(y)
  return { origin, xAxis: x, yAxis, zAxis: cross(x, yAxis) }
}

/** The system's XY plane, ready to place a sketch or a feature on. */
export function coordinateSystemPlane(system: CoordinateSystem): PlaneFrame {
  return { origin: system.origin, xAxis: system.xAxis, yAxis: system.yAxis }
}

/** A plane read back as a coordinate system, with Z along its normal. */
export function planeCoordinateSystem(plane: PlaneFrame): CoordinateSystem {
  return {
    origin: plane.origin,
    xAxis: normalize(plane.xAxis),
    yAxis: normalize(plane.yAxis),
    zAxis: frameNormal(plane),
  }
}

/* -------------------------------------------------------------------------- */

/** Raised when the inputs to a construction do not determine one. */
export class ReferenceGeometryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReferenceGeometryError'
  }
}

/**
 * A frame with the given normal. `xHint` picks which way "right" points on the
 * plane; when it is parallel to the normal — or missing — any perpendicular will
 * do, chosen so the result stays stable for a given normal.
 */
export function frameFromNormal(origin: Vec3, normal: Vec3, xHint?: Vec3): PlaneFrame {
  const unitNormal = normalize(normal)
  if (lengthVec3(unitNormal) === 0) {
    throw new ReferenceGeometryError('A plane needs a normal')
  }

  const hint = xHint ?? (Math.abs(unitNormal.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 })
  let xAxis = subtractVec3(hint, scaleVec3(unitNormal, dotVec3(hint, unitNormal)))
  if (lengthVec3(xAxis) < PARALLEL_TOLERANCE) {
    const fallback = Math.abs(unitNormal.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
    xAxis = subtractVec3(fallback, scaleVec3(unitNormal, dotVec3(fallback, unitNormal)))
  }

  const x = normalize(xAxis)
  return { origin, xAxis: x, yAxis: cross(unitNormal, x) }
}

/** Rodrigues' rotation of `vector` about a unit `axis`, in radians. */
function rotateAbout(vector: Vec3, axis: Vec3, radians: number): Vec3 {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return addVec3(
    addVec3(scaleVec3(vector, cos), scaleVec3(cross(axis, vector), sin)),
    scaleVec3(axis, dotVec3(axis, vector) * (1 - cos)),
  )
}
