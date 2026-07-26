import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'

/** A triangle in world space, wound counter-clockwise seen from outside. */
export interface Triangle {
  readonly a: Vec3
  readonly b: Vec3
  readonly c: Vec3
}

export interface PointTarget {
  readonly kind: 'point'
  readonly position: Vec3
  readonly label?: string
}

/** A straight edge. Curved edges are measured as their chord. */
export interface EdgeTarget {
  readonly kind: 'edge'
  readonly start: Vec3
  readonly end: Vec3
  readonly label?: string
}

/**
 * A face. `origin` and `normal` give the plane it lies in; `triangles` bound it
 * when the tessellation is known, which is what makes a distance land on the
 * face rather than on its infinite plane.
 */
export interface FaceTarget {
  readonly kind: 'face'
  readonly origin: Vec3
  readonly normal: Vec3
  readonly triangles?: readonly Triangle[]
  readonly label?: string
}

export interface BodyTarget {
  readonly kind: 'body'
  readonly mesh: MeshData
  readonly label?: string
}

export type MeasureTarget = PointTarget | EdgeTarget | FaceTarget | BodyTarget

export function pointTarget(position: Vec3, label?: string): PointTarget {
  return label === undefined ? { kind: 'point', position } : { kind: 'point', position, label }
}

export function edgeTarget(start: Vec3, end: Vec3, label?: string): EdgeTarget {
  return label === undefined ? { kind: 'edge', start, end } : { kind: 'edge', start, end, label }
}

export function faceTarget(
  origin: Vec3,
  normal: Vec3,
  triangles?: readonly Triangle[],
  label?: string,
): FaceTarget {
  return {
    kind: 'face',
    origin,
    normal,
    ...(triangles ? { triangles } : {}),
    ...(label === undefined ? {} : { label }),
  }
}

export function bodyTarget(mesh: MeshData, label?: string): BodyTarget {
  return label === undefined ? { kind: 'body', mesh } : { kind: 'body', mesh, label }
}

/** A distance, with the two points it was measured between. */
export interface DistanceMeasurement {
  readonly distance: number
  readonly from: Vec3
  readonly to: Vec3
  /** `to − from`, so the panel can show the per-axis components. */
  readonly delta: Vec3
  /** True when the inputs never converge, i.e. the distance is constant. */
  readonly parallel: boolean
}

export interface AngleMeasurement {
  readonly radians: number
  readonly degrees: number
  /** The supplementary angle, which is often the one the user meant. */
  readonly supplementDegrees: number
  readonly parallel: boolean
  readonly perpendicular: boolean
}
