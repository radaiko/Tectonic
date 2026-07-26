/**
 * Minimal 3D vector maths shared by the view, analysis and section code.
 *
 * Structurally identical to {@link MeshPoint} and the kernel's `Vec3`, so any of
 * them can be passed here without a conversion. Every function is pure and
 * returns a fresh vector — nothing here mutates its arguments.
 */
export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const ZERO: Vec3 = { x: 0, y: 0, z: 0 }
export const UNIT_X: Vec3 = { x: 1, y: 0, z: 0 }
export const UNIT_Y: Vec3 = { x: 0, y: 1, z: 0 }
export const UNIT_Z: Vec3 = { x: 0, y: 0, z: 1 }

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scale(a: Vec3, factor: number): Vec3 {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor }
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z)
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** Unit vector in the same direction, or the zero vector when `a` has no length. */
export function normalize(a: Vec3): Vec3 {
  const magnitude = length(a)
  return magnitude === 0 ? ZERO : scale(a, 1 / magnitude)
}

export function negate(a: Vec3): Vec3 {
  return { x: -a.x, y: -a.y, z: -a.z }
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return lerp(a, b, 0.5)
}

export function equals(a: Vec3, b: Vec3, tolerance = 1e-9): boolean {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.z - b.z) <= tolerance
  )
}

/**
 * Angle between two directions in radians, in [0, π]. Zero-length inputs give
 * zero rather than NaN so callers do not have to guard every measurement.
 */
export function angleBetween(a: Vec3, b: Vec3): number {
  const magnitude = length(a) * length(b)
  if (magnitude === 0) return 0
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b) / magnitude)))
}

/** Rotates `point` about a unit `axis` through the origin (Rodrigues' formula). */
export function rotateAbout(point: Vec3, axis: Vec3, radians: number): Vec3 {
  const unit = normalize(axis)
  if (unit === ZERO) return point
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return add(
    add(scale(point, cos), scale(cross(unit, point), sin)),
    scale(unit, dot(unit, point) * (1 - cos)),
  )
}

/** Any unit vector perpendicular to `a`, chosen to stay numerically stable. */
export function perpendicular(a: Vec3): Vec3 {
  const unit = normalize(a)
  const helper = Math.abs(unit.z) < 0.9 ? UNIT_Z : UNIT_X
  return normalize(cross(unit, helper))
}
