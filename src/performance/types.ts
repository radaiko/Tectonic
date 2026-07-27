import type { MeshBounds } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { normalize, subtract } from '../domain/vec3'

/**
 * Shared vocabulary for the large-assembly optimisations.
 *
 * Every module in this directory answers the same question from a different
 * angle — "how little can we get away with drawing?" — and they all need the
 * same two inputs: what is in the scene, and where the camera is. Neither
 * carries geometry. A component here is the *description* of a body (how big
 * it is, how many triangles it would cost, whether another component is an
 * identical copy of it), which is what lets a ten-thousand-part assembly be
 * planned before a single mesh is fetched.
 *
 * All of it is opt-in. An assembly small enough not to need any of this should
 * pay nothing for it, so {@link DEFAULT_PERFORMANCE_SETTINGS} has every
 * optimisation switched off and the user turns on what they want.
 */

/** One drawable thing in the scene, described rather than loaded. */
export interface PerformanceComponent {
  readonly id: string
  readonly name?: string
  /** Extent in world space, after the instance's own placement. */
  readonly bounds: MeshBounds
  /** What drawing it in full would cost. */
  readonly triangleCount: number
  /**
   * Components with the same key have identical geometry and differ only in
   * placement — the precondition for merging them into one draw call.
   */
  readonly geometryKey?: string
  /** Kept at full detail and never culled, however far away it is. */
  readonly pinned?: boolean
}

/** Where the camera is and what it can see. */
export interface Viewpoint {
  readonly position: Vec3
  /** Unit direction the camera looks along. Normalised on use. */
  readonly direction: Vec3
  /** Which way is up on screen. Defaults to world Z. */
  readonly up?: Vec3
  /** Vertical field of view in radians. */
  readonly fov?: number
  /** Width over height. */
  readonly aspect?: number
  readonly near?: number
  readonly far?: number
}

export const DEFAULT_FOV = (50 * Math.PI) / 180
export const DEFAULT_ASPECT = 16 / 9
export const DEFAULT_NEAR = 0.1
export const DEFAULT_FAR = 100_000
const WORLD_UP: Vec3 = { x: 0, y: 0, z: 1 }

/** A viewpoint with every optional field filled in. */
export interface ResolvedViewpoint {
  readonly position: Vec3
  readonly direction: Vec3
  readonly up: Vec3
  readonly fov: number
  readonly aspect: number
  readonly near: number
  readonly far: number
}

/**
 * Fills in a viewpoint's defaults.
 *
 * A direction that is zero-length would make every downstream dot product
 * meaningless, so it falls back to looking along -Y — the front view — rather
 * than propagating NaN through the culling maths.
 */
export function resolveViewpoint(viewpoint: Viewpoint): ResolvedViewpoint {
  const direction = normalize(viewpoint.direction)
  const looking =
    direction.x === 0 && direction.y === 0 && direction.z === 0
      ? { x: 0, y: 1, z: 0 }
      : direction
  return {
    position: viewpoint.position,
    direction: looking,
    up: viewpoint.up ? normalize(viewpoint.up) : WORLD_UP,
    fov: viewpoint.fov ?? DEFAULT_FOV,
    aspect: viewpoint.aspect ?? DEFAULT_ASPECT,
    near: viewpoint.near ?? DEFAULT_NEAR,
    far: viewpoint.far ?? DEFAULT_FAR,
  }
}

/* -------------------------------------------------------------------------- */
/* Bounds arithmetic                                                           */
/* -------------------------------------------------------------------------- */

export function boundsCenter(bounds: MeshBounds): Vec3 {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  }
}

export function boundsSize(bounds: MeshBounds): Vec3 {
  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  }
}

/** Radius of the sphere around the box — the conservative one, so nothing pops. */
export function boundsRadius(bounds: MeshBounds): number {
  const size = boundsSize(bounds)
  return Math.hypot(size.x, size.y, size.z) / 2
}

/** Distance from a point to the nearest point of the box, or zero inside it. */
export function distanceToBounds(bounds: MeshBounds, point: Vec3): number {
  const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x)
  const dy = Math.max(bounds.min.y - point.y, 0, point.y - bounds.max.y)
  const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z)
  return Math.hypot(dx, dy, dz)
}

/** Distance from the camera to a component's centre. */
export function distanceToCamera(component: PerformanceComponent, viewpoint: Viewpoint): number {
  const centre = boundsCenter(component.bounds)
  return Math.hypot(
    centre.x - viewpoint.position.x,
    centre.y - viewpoint.position.y,
    centre.z - viewpoint.position.z,
  )
}

/**
 * How much of the screen's height a component covers, as a fraction in 0..1.
 *
 * This — not raw distance — is what should decide whether something is worth
 * drawing: a bolt at two metres and a building at two hundred are the same
 * number of pixels, and should get the same treatment. A component enclosing
 * the camera covers everything, so it comes back as 1.
 */
export function screenCoverage(
  component: PerformanceComponent,
  viewpoint: Viewpoint,
): number {
  const resolved = resolveViewpoint(viewpoint)
  const radius = boundsRadius(component.bounds)
  if (radius <= 0) return 0

  const distance = distanceToBounds(component.bounds, viewpoint.position)
  if (distance <= 0) return 1

  // Half the visible height at that distance, from the field of view.
  const halfHeight = Math.tan(resolved.fov / 2) * (distance + radius)
  if (halfHeight <= 0) return 1
  return Math.min(1, radius / halfHeight)
}

/** Whether a component sits behind the camera, and so cannot be on screen. */
export function isBehind(component: PerformanceComponent, viewpoint: Viewpoint): boolean {
  const resolved = resolveViewpoint(viewpoint)
  const toCentre = subtract(boundsCenter(component.bounds), resolved.position)
  const along =
    toCentre.x * resolved.direction.x +
    toCentre.y * resolved.direction.y +
    toCentre.z * resolved.direction.z
  return along + boundsRadius(component.bounds) < 0
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Which optimisations are on. All off by default: each one trades fidelity for
 * speed, and that is the user's call to make, not the renderer's.
 */
export interface PerformanceSettings {
  readonly levelOfDetail: boolean
  readonly frustumCulling: boolean
  readonly boundingBoxProxies: boolean
  readonly instanceMerging: boolean
  readonly selectiveLoading: boolean
  readonly progressiveLoading: boolean
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  levelOfDetail: false,
  frustumCulling: false,
  boundingBoxProxies: false,
  instanceMerging: false,
  selectiveLoading: false,
  progressiveLoading: false,
}

/** Everything on — what a user reaches for when an assembly will not turn. */
export const ALL_PERFORMANCE_SETTINGS: PerformanceSettings = {
  levelOfDetail: true,
  frustumCulling: true,
  boundingBoxProxies: true,
  instanceMerging: true,
  selectiveLoading: true,
  progressiveLoading: true,
}

/** The named optimisations, for building a settings panel. */
export const PERFORMANCE_OPTIONS: readonly (keyof PerformanceSettings)[] = [
  'levelOfDetail',
  'frustumCulling',
  'boundingBoxProxies',
  'instanceMerging',
  'selectiveLoading',
  'progressiveLoading',
]

/** Total triangles a set of components would cost drawn in full. */
export function totalTriangles(components: readonly PerformanceComponent[]): number {
  return components.reduce((total, component) => total + Math.max(0, component.triangleCount), 0)
}
