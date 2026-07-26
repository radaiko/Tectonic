import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../kernel/IKernel'

/**
 * The surface environment models sheets rather than solids: geometry that has an
 * area but no enclosed volume until it is thickened or stitched.
 *
 * A surface is carried as a triangle mesh plus the open boundaries around it.
 * That is deliberately the same currency the kernel and the exporters speak, so
 * a surface can be rendered, trimmed, knitted and turned into a solid without a
 * B-Rep behind it. Everything here is pure TypeScript.
 */

/** A curve as a world-space polyline. Closed curves do not repeat their first point. */
export type Curve3 = readonly Vec3[]

/** Points closer than this are the same point everywhere in `surface/`. */
export const SURFACE_TOLERANCE = 1e-6

/** An unbounded plane, given by a point on it and its unit normal. */
export interface SurfacePlane {
  readonly origin: Vec3
  readonly normal: Vec3
}

export interface SurfaceBody {
  readonly id: string
  readonly name: string
  readonly mesh: MeshData
  /** Open boundary loops, in world space. Empty when the sheet is watertight. */
  readonly boundaries: readonly Curve3[]
  /** Whether every edge is shared by two triangles, i.e. the sheet encloses a volume. */
  readonly closed: boolean
  /**
   * The mesh as it stood before the last trim, so an untrim can put it back.
   * Null on a surface that has never been trimmed.
   */
  readonly untrimmed: MeshData | null
}

/** Which side of a cutting plane an operation keeps — the normal points "front". */
export const TRIM_KEEPS = ['front', 'back'] as const
export type TrimKeep = (typeof TRIM_KEEPS)[number]

/** Where a surface extension stops. */
export const EXTEND_MODES = ['distance', 'to-plane'] as const
export type ExtendMode = (typeof EXTEND_MODES)[number]

/** Which way a thicken grows relative to the surface normal. */
export const THICKEN_SIDES = ['normal', 'reverse', 'symmetric'] as const
export type ThickenSide = (typeof THICKEN_SIDES)[number]

/** How a swept surface orients its profile along the path. */
export const SURFACE_SWEEP_ORIENTATIONS = ['follow-path', 'perpendicular'] as const
export type SurfaceSweepOrientation = (typeof SURFACE_SWEEP_ORIENTATIONS)[number]

/** Raised when a surface operation cannot produce geometry from its inputs. */
export class SurfaceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SurfaceError'
  }
}

/** Naming for a freshly built surface. Ids are caller-supplied so rebuilds are stable. */
export interface SurfaceNaming {
  readonly id?: string
  readonly name?: string
}
