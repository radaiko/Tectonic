import type { MeshBounds } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { cross, normalize, scale, subtract } from '../domain/vec3'
import type { PerformanceComponent, Viewpoint } from './types'
import { resolveViewpoint, totalTriangles } from './types'

/**
 * Skipping what the camera cannot see.
 *
 * The cheapest optimisation in the directory and usually the largest win: in a
 * big assembly, most of the model is off-screen at any useful zoom level, and
 * a box-against-plane test is a few dozen arithmetic operations against the
 * thousands of triangles it avoids.
 *
 * Tests are conservative. A box that merely touches the frustum counts as
 * visible, because a false negative is a hole in the picture while a false
 * positive is only a few wasted triangles.
 */

/** A plane as `normal · p + constant = 0`, with the normal pointing inwards. */
export interface Plane {
  readonly normal: Vec3
  readonly constant: number
}

/** The six planes bounding what the camera can see. */
export interface Frustum {
  readonly near: Plane
  readonly far: Plane
  readonly left: Plane
  readonly right: Plane
  readonly top: Plane
  readonly bottom: Plane
}

/** The planes as a list, for iterating. */
export function frustumPlanes(frustum: Frustum): readonly Plane[] {
  return [frustum.near, frustum.far, frustum.left, frustum.right, frustum.top, frustum.bottom]
}

/** A plane through `point` facing `normal`, normalised. */
export function planeThrough(point: Vec3, normal: Vec3): Plane {
  const unit = normalize(normal)
  return {
    normal: unit,
    constant: -(unit.x * point.x + unit.y * point.y + unit.z * point.z),
  }
}

/** Signed distance from a plane to a point; positive is the inward side. */
export function distanceToPlane(plane: Plane, point: Vec3): number {
  return plane.normal.x * point.x + plane.normal.y * point.y + plane.normal.z * point.z + plane.constant
}

/**
 * The frustum a viewpoint sees.
 *
 * The side planes are built by tilting the camera's own axes by the half-angle
 * of the field of view, which keeps the maths in world space and avoids
 * needing a projection matrix at all. The horizontal half-angle follows from
 * the vertical one and the aspect ratio.
 */
export function frustumFromViewpoint(viewpoint: Viewpoint): Frustum {
  const view = resolveViewpoint(viewpoint)
  const forward = view.direction
  // Re-derive an exactly perpendicular basis; a caller's `up` rarely is one.
  const right = normalize(cross(forward, view.up))
  const up = cross(right, forward)

  const halfVertical = view.fov / 2
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * view.aspect)

  const nearCentre = add(view.position, scale(forward, view.near))
  const farCentre = add(view.position, scale(forward, view.far))

  return {
    near: planeThrough(nearCentre, forward),
    far: planeThrough(farCentre, scale(forward, -1)),
    left: planeThrough(view.position, tilt(forward, right, halfHorizontal)),
    right: planeThrough(view.position, tilt(forward, scale(right, -1), halfHorizontal)),
    bottom: planeThrough(view.position, tilt(forward, up, halfVertical)),
    top: planeThrough(view.position, tilt(forward, scale(up, -1), halfVertical)),
  }
}

/** `forward` rotated `angle` towards `side` — the inward normal of a side plane. */
function tilt(forward: Vec3, side: Vec3, angle: number): Vec3 {
  return normalize(add(scale(forward, Math.cos(angle)), scale(side, Math.sin(angle))))
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

/**
 * The frustum encoded in a projection-view matrix, by Gribb and Hartmann.
 *
 * Here so a three.js camera can be culled against directly: its
 * `projectionMatrix * matrixWorldInverse` goes straight in, and the planes
 * fall out of sums and differences of the matrix rows. The matrix is expected
 * column-major, which is what WebGL and three.js both use.
 */
export function frustumFromMatrix(matrix: readonly number[]): Frustum {
  const m = (row: number, column: number): number => matrix[column * 4 + row] ?? 0
  const rows = [0, 1, 2, 3].map((row) => [m(row, 0), m(row, 1), m(row, 2), m(row, 3)])
  const [x, y, z, w] = rows as [number[], number[], number[], number[]]

  const combine = (row: readonly number[], sign: number): Plane => {
    const normal = {
      x: (w[0] as number) + sign * (row[0] as number),
      y: (w[1] as number) + sign * (row[1] as number),
      z: (w[2] as number) + sign * (row[2] as number),
    }
    const constant = (w[3] as number) + sign * (row[3] as number)
    // Normalising keeps `distanceToPlane` a true distance rather than a
    // scaled one, which the sphere test below relies on.
    const magnitude = Math.hypot(normal.x, normal.y, normal.z) || 1
    return {
      normal: { x: normal.x / magnitude, y: normal.y / magnitude, z: normal.z / magnitude },
      constant: constant / magnitude,
    }
  }

  return {
    left: combine(x, 1),
    right: combine(x, -1),
    bottom: combine(y, 1),
    top: combine(y, -1),
    near: combine(z, 1),
    far: combine(z, -1),
  }
}

/** Where a box sits relative to the frustum. */
export type FrustumRelation = 'inside' | 'intersecting' | 'outside'

/**
 * Classifies a box against the frustum.
 *
 * Each plane is tested against the box corner furthest along its normal — if
 * even that one is outside, the whole box is, and the test can stop. The
 * opposite corner then says whether the box is wholly inside, which lets a
 * caller skip per-triangle work for something entirely on screen.
 */
export function classifyBounds(frustum: Frustum, bounds: MeshBounds): FrustumRelation {
  let fullyInside = true

  for (const plane of frustumPlanes(frustum)) {
    const positive = {
      x: plane.normal.x >= 0 ? bounds.max.x : bounds.min.x,
      y: plane.normal.y >= 0 ? bounds.max.y : bounds.min.y,
      z: plane.normal.z >= 0 ? bounds.max.z : bounds.min.z,
    }
    if (distanceToPlane(plane, positive) < 0) return 'outside'

    const negative = {
      x: plane.normal.x >= 0 ? bounds.min.x : bounds.max.x,
      y: plane.normal.y >= 0 ? bounds.min.y : bounds.max.y,
      z: plane.normal.z >= 0 ? bounds.min.z : bounds.max.z,
    }
    if (distanceToPlane(plane, negative) < 0) fullyInside = false
  }
  return fullyInside ? 'inside' : 'intersecting'
}

/** Whether any part of a box is visible. */
export function intersectsBounds(frustum: Frustum, bounds: MeshBounds): boolean {
  return classifyBounds(frustum, bounds) !== 'outside'
}

/** Whether a sphere is at least partly visible. */
export function intersectsSphere(frustum: Frustum, centre: Vec3, radius: number): boolean {
  return frustumPlanes(frustum).every((plane) => distanceToPlane(plane, centre) >= -radius)
}

/** What survived a cull and what did not. */
export interface CullResult {
  readonly visible: readonly PerformanceComponent[]
  readonly culled: readonly PerformanceComponent[]
  /** Triangles the cull avoided. */
  readonly trianglesCulled: number
  /** Fraction of the scene's triangles skipped, 0..1. */
  readonly saved: number
}

/** Splits components into what is worth drawing and what is not. */
export function cullComponents(
  components: readonly PerformanceComponent[],
  frustum: Frustum,
): CullResult {
  const visible: PerformanceComponent[] = []
  const culled: PerformanceComponent[] = []

  for (const component of components) {
    // A pinned component is drawn even off screen — an assembly origin marker
    // or a datum that a user has asked to always see.
    if (component.pinned === true || intersectsBounds(frustum, component.bounds)) {
      visible.push(component)
    } else {
      culled.push(component)
    }
  }

  const before = totalTriangles(components)
  const trianglesCulled = totalTriangles(culled)
  return {
    visible,
    culled,
    trianglesCulled,
    saved: before > 0 ? trianglesCulled / before : 0,
  }
}

/** The direction from the camera to a point — handy when building a viewpoint. */
export function lookDirection(from: Vec3, to: Vec3): Vec3 {
  return normalize(subtract(to, from))
}
