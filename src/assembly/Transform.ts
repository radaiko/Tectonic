import type { PlaneFrame, Vec3 } from '../kernel/IKernel'
import {
  addVec3,
  dotVec3,
  frameNormal,
  lengthVec3,
  scaleVec3,
  subtractVec3,
} from '../features/geometry/plane'
import { AssemblyError } from './types'

const DEG = Math.PI / 180

/** Below this a quaternion is treated as degenerate rather than very small. */
const MIN_NORM = 1e-12

/** Rotation as a unit quaternion — no gimbal lock, and cheap to interpolate. */
export interface Quaternion {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly w: number
}

/**
 * Rigid placement of a component in its parent's space: rotate about the
 * component's own origin, then translate.
 */
export interface ComponentTransform {
  readonly position: Vec3
  readonly rotation: Quaternion
}

export interface ComponentTransformInit {
  readonly position?: Vec3
  readonly rotation?: Quaternion
}

/** A rotation matrix, row-major: `[m00, m01, m02, m10, …]`. */
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 }
export const IDENTITY_ROTATION: Quaternion = { x: 0, y: 0, z: 0, w: 1 }
export const IDENTITY_TRANSFORM: ComponentTransform = {
  position: ORIGIN,
  rotation: IDENTITY_ROTATION,
}

/** A transform with its rotation normalised, so composition stays rigid. */
export function createTransform(init: ComponentTransformInit = {}): ComponentTransform {
  return {
    position: init.position ? { x: init.position.x, y: init.position.y, z: init.position.z } : ORIGIN,
    rotation: init.rotation ? normalizeQuaternion(init.rotation) : IDENTITY_ROTATION,
  }
}

/** A pure translation. */
export function translation(position: Vec3): ComponentTransform {
  return createTransform({ position })
}

/**
 * A rotation of `angle` degrees about the line through `origin` along `axis`.
 * The translation that keeps that line still is worked out here, so callers
 * never have to compose the "move to origin, rotate, move back" sandwich.
 */
export function rotationAbout(axis: Vec3, angle: number, origin: Vec3 = ORIGIN): ComponentTransform {
  const rotation = quaternionFromAxisAngle(axis, angle)
  const offset = rotateVector(rotation, scaleVec3(origin, -1))
  return { position: addVec3(origin, offset), rotation }
}

export function quaternionFromAxisAngle(axis: Vec3, angle: number): Quaternion {
  const length = lengthVec3(axis)
  if (!(length > 0)) throw new AssemblyError('A rotation needs an axis with a direction')
  const half = (angle * DEG) / 2
  const scale = Math.sin(half) / length
  return { x: axis.x * scale, y: axis.y * scale, z: axis.z * scale, w: Math.cos(half) }
}

/** The axis and angle a rotation turns through. Identity reports the +Z axis. */
export function axisAngleOf(rotation: Quaternion): { readonly axis: Vec3; readonly angle: number } {
  const q = normalizeQuaternion(rotation)
  const sine = Math.hypot(q.x, q.y, q.z)
  if (sine < MIN_NORM) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 }
  const angle = (2 * Math.atan2(sine, q.w)) / DEG
  return { axis: { x: q.x / sine, y: q.y / sine, z: q.z / sine }, angle }
}

export function normalizeQuaternion(rotation: Quaternion): Quaternion {
  const norm = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w)
  if (!(norm > MIN_NORM)) throw new AssemblyError('A rotation cannot be the zero quaternion')
  return {
    x: rotation.x / norm,
    y: rotation.y / norm,
    z: rotation.z / norm,
    w: rotation.w / norm,
  }
}

/** `a` then `b` read right to left: the rotation `b` followed by `a`. */
export function multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  }
}

/** The inverse of a unit quaternion. */
export function conjugateQuaternion(rotation: Quaternion): Quaternion {
  return { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w }
}

export function rotateVector(rotation: Quaternion, vector: Vec3): Vec3 {
  const { x, y, z, w } = rotation
  // t = 2 · (q × v); v' = v + w · t + q × t
  const tx = 2 * (y * vector.z - z * vector.y)
  const ty = 2 * (z * vector.x - x * vector.z)
  const tz = 2 * (x * vector.y - y * vector.x)
  return {
    x: vector.x + w * tx + y * tz - z * ty,
    y: vector.y + w * ty + z * tx - x * tz,
    z: vector.z + w * tz + x * ty - y * tx,
  }
}

/** The placement `inner` ends up with once `outer` is applied on top of it. */
export function composeTransforms(
  outer: ComponentTransform,
  inner: ComponentTransform,
): ComponentTransform {
  return {
    position: addVec3(outer.position, rotateVector(outer.rotation, inner.position)),
    rotation: multiplyQuaternions(outer.rotation, inner.rotation),
  }
}

export function invertTransform(transform: ComponentTransform): ComponentTransform {
  const rotation = conjugateQuaternion(transform.rotation)
  return { position: rotateVector(rotation, scaleVec3(transform.position, -1)), rotation }
}

/** Where `point`, given in the transform's own space, lands. */
export function applyTransform(transform: ComponentTransform, point: Vec3): Vec3 {
  return addVec3(transform.position, rotateVector(transform.rotation, point))
}

/** A direction under the transform: rotated, never translated. */
export function transformDirection(transform: ComponentTransform, direction: Vec3): Vec3 {
  return rotateVector(transform.rotation, direction)
}

/**
 * A placement part way between two others: straight line for the position,
 * shortest arc for the rotation. This is what drives mate animation.
 */
export function interpolateTransforms(
  from: ComponentTransform,
  to: ComponentTransform,
  fraction: number,
): ComponentTransform {
  const t = Math.min(1, Math.max(0, fraction))
  return {
    position: addVec3(from.position, scaleVec3(subtractVec3(to.position, from.position), t)),
    rotation: slerp(from.rotation, to.rotation, t),
  }
}

/** Shortest-arc interpolation between two rotations. */
export function slerp(from: Quaternion, to: Quaternion, fraction: number): Quaternion {
  const a = normalizeQuaternion(from)
  let b = normalizeQuaternion(to)
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w

  // q and −q are the same rotation; take whichever gives the short way round.
  if (dot < 0) {
    b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }
    dot = -dot
  }

  if (dot > 0.9995) {
    return normalizeQuaternion({
      x: a.x + (b.x - a.x) * fraction,
      y: a.y + (b.y - a.y) * fraction,
      z: a.z + (b.z - a.z) * fraction,
      w: a.w + (b.w - a.w) * fraction,
    })
  }

  const theta = Math.acos(dot)
  const sinTheta = Math.sin(theta)
  const scaleA = Math.sin((1 - fraction) * theta) / sinTheta
  const scaleB = Math.sin(fraction * theta) / sinTheta
  return {
    x: a.x * scaleA + b.x * scaleB,
    y: a.y * scaleA + b.y * scaleB,
    z: a.z * scaleA + b.z * scaleB,
    w: a.w * scaleA + b.w * scaleB,
  }
}

export function quaternionToMatrix(rotation: Quaternion): Matrix3 {
  const { x, y, z, w } = normalizeQuaternion(rotation)
  const xx = x * x
  const yy = y * y
  const zz = z * z
  return [
    1 - 2 * (yy + zz),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (xx + zz),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (xx + yy),
  ]
}

export function matrixToQuaternion(m: Matrix3): Quaternion {
  const trace = m[0] + m[4] + m[8]
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    return { x: (m[7] - m[5]) / s, y: (m[2] - m[6]) / s, z: (m[3] - m[1]) / s, w: 0.25 * s }
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2
    return { x: 0.25 * s, y: (m[1] + m[3]) / s, z: (m[2] + m[6]) / s, w: (m[7] - m[5]) / s }
  }
  if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2
    return { x: (m[1] + m[3]) / s, y: 0.25 * s, z: (m[5] + m[7]) / s, w: (m[2] - m[6]) / s }
  }
  const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2
  return { x: (m[2] + m[6]) / s, y: (m[5] + m[7]) / s, z: 0.25 * s, w: (m[3] - m[1]) / s }
}

export function multiplyMatrices(a: Matrix3, b: Matrix3): Matrix3 {
  const value = (row: number, column: number): number =>
    (a[row * 3] as number) * (b[column] as number) +
    (a[row * 3 + 1] as number) * (b[3 + column] as number) +
    (a[row * 3 + 2] as number) * (b[6 + column] as number)
  return [
    value(0, 0),
    value(0, 1),
    value(0, 2),
    value(1, 0),
    value(1, 1),
    value(1, 2),
    value(2, 0),
    value(2, 1),
    value(2, 2),
  ]
}

/**
 * A placement reflected through a plane.
 *
 * A mirrored instance is not a rotated one — reflecting the orientation as well
 * as the position is what makes a mirrored bracket the opposite hand rather than
 * the same part turned round.
 */
export function mirrorTransform(
  transform: ComponentTransform,
  plane: PlaneFrame,
): ComponentTransform {
  const normal = unitNormal(plane)
  const offset = subtractVec3(transform.position, plane.origin)
  const distance = dotVec3(offset, normal)
  const position = subtractVec3(transform.position, scaleVec3(normal, 2 * distance))

  // M · R · M, with M the reflection. Two flips of handedness cancel, so the
  // result is a rotation again.
  const reflection = reflectionMatrix(normal)
  const rotated = multiplyMatrices(
    reflection,
    multiplyMatrices(quaternionToMatrix(transform.rotation), reflection),
  )
  return { position, rotation: normalizeQuaternion(matrixToQuaternion(rotated)) }
}

/** Where `point` lands when reflected through a plane. */
export function mirrorPoint(point: Vec3, plane: PlaneFrame): Vec3 {
  const normal = unitNormal(plane)
  const distance = dotVec3(subtractVec3(point, plane.origin), normal)
  return subtractVec3(point, scaleVec3(normal, 2 * distance))
}

export function transformsEqual(
  a: ComponentTransform,
  b: ComponentTransform,
  tolerance = 1e-6,
): boolean {
  if (
    Math.abs(a.position.x - b.position.x) > tolerance ||
    Math.abs(a.position.y - b.position.y) > tolerance ||
    Math.abs(a.position.z - b.position.z) > tolerance
  ) {
    return false
  }
  // q and −q describe the same orientation, so compare the absolute dot product.
  const dot =
    a.rotation.x * b.rotation.x +
    a.rotation.y * b.rotation.y +
    a.rotation.z * b.rotation.z +
    a.rotation.w * b.rotation.w
  return Math.abs(Math.abs(dot) - 1) <= tolerance
}

export function transformToJSON(transform: ComponentTransform): ComponentTransform {
  const { position, rotation } = transform
  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
  }
}

/** A transform read back from a file, with anything missing filled in. */
export function transformFromJSON(json: unknown): ComponentTransform {
  if (!json || typeof json !== 'object') return IDENTITY_TRANSFORM
  const record = json as { position?: Partial<Vec3>; rotation?: Partial<Quaternion> }
  const position = record.position ?? {}
  const rotation = record.rotation ?? {}
  return createTransform({
    position: {
      x: numberOr(position.x, 0),
      y: numberOr(position.y, 0),
      z: numberOr(position.z, 0),
    },
    rotation: {
      x: numberOr(rotation.x, 0),
      y: numberOr(rotation.y, 0),
      z: numberOr(rotation.z, 0),
      w: numberOr(rotation.w, 1),
    },
  })
}

function reflectionMatrix(normal: Vec3): Matrix3 {
  const { x, y, z } = normal
  return [
    1 - 2 * x * x,
    -2 * x * y,
    -2 * x * z,
    -2 * x * y,
    1 - 2 * y * y,
    -2 * y * z,
    -2 * x * z,
    -2 * y * z,
    1 - 2 * z * z,
  ]
}

function unitNormal(plane: PlaneFrame): Vec3 {
  const normal = frameNormal(plane)
  const length = lengthVec3(normal)
  if (!(length > 0)) throw new AssemblyError('A mirror plane needs two independent axes')
  return scaleVec3(normal, 1 / length)
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
