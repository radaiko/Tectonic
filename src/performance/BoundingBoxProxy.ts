import type { MeshBounds, MeshData } from '../domain/MeshData'
import { recomputeNormals } from '../domain/MeshData'
import type { PerformanceComponent, Viewpoint } from './types'
import { boundsCenter, boundsSize, screenCoverage, totalTriangles } from './types'

/**
 * Standing in a box for a component too small to make out.
 *
 * Below a couple of dozen pixels a part is a smudge, and a smudge costs the
 * same to draw whether it is twelve triangles or forty thousand. Swapping in
 * the bounding box keeps the smudge in the right place, at the right size and
 * in the right colour, for a fixed twelve triangles — and unlike culling it
 * outright, the assembly still looks complete.
 *
 * The box is the last rung of the ladder in {@link DEFAULT_LOD_LEVELS}: level
 * of detail thins a mesh out, and when thinning stops being worth it, this
 * takes over.
 */

/** Triangles in a box. Fixed, which is the entire point of the exercise. */
export const PROXY_TRIANGLES = 12

export interface ProxyOptions {
  /**
   * Screen coverage below which a component is replaced by its box. Matches
   * the bottom rung of the default level-of-detail ladder.
   */
  readonly maxCoverage?: number
  /**
   * Never proxy a component already cheaper than this — the box would cost as
   * much as the part.
   */
  readonly minTriangles?: number
}

export const DEFAULT_MAX_COVERAGE = 0.02
export const DEFAULT_MIN_TRIANGLES = 24

/** Whether this component is better drawn as a box from here. */
export function shouldUseProxy(
  component: PerformanceComponent,
  viewpoint: Viewpoint,
  options: ProxyOptions = {},
): boolean {
  if (component.pinned === true) return false
  if (component.triangleCount <= (options.minTriangles ?? DEFAULT_MIN_TRIANGLES)) return false
  return screenCoverage(component, viewpoint) < (options.maxCoverage ?? DEFAULT_MAX_COVERAGE)
}

/** A component's stand-in. */
export interface BoundingBoxProxy {
  readonly id: string
  readonly name: string
  readonly mesh: MeshData
  readonly triangleCount: number
  /** What the component would have cost drawn properly. */
  readonly replacedTriangles: number
}

export function boxProxy(component: PerformanceComponent): BoundingBoxProxy {
  return {
    id: component.id,
    name: `${component.name ?? component.id} (box)`,
    mesh: boundsMesh(component.bounds),
    triangleCount: PROXY_TRIANGLES,
    replacedTriangles: component.triangleCount,
  }
}

/** Which components get boxed and which are drawn properly. */
export interface ProxyPlan {
  readonly proxied: readonly BoundingBoxProxy[]
  readonly drawn: readonly PerformanceComponent[]
  readonly before: number
  readonly after: number
  readonly saved: number
}

export function planProxies(
  components: readonly PerformanceComponent[],
  viewpoint: Viewpoint,
  options: ProxyOptions = {},
): ProxyPlan {
  const proxied: BoundingBoxProxy[] = []
  const drawn: PerformanceComponent[] = []

  for (const component of components) {
    if (shouldUseProxy(component, viewpoint, options)) proxied.push(boxProxy(component))
    else drawn.push(component)
  }

  const before = totalTriangles(components)
  const after =
    totalTriangles(drawn) + proxied.reduce((total, proxy) => total + proxy.triangleCount, 0)
  return { proxied, drawn, before, after, saved: before > 0 ? 1 - after / before : 0 }
}

/**
 * A closed box mesh for an extent, wound outwards.
 *
 * A degenerate box — a flat plate, a component whose bounds collapsed on one
 * axis — is given a sliver of thickness rather than being left with zero-area
 * sides, which would render as nothing at all and defeat the purpose.
 */
export function boundsMesh(bounds: MeshBounds): MeshData {
  const size = boundsSize(bounds)
  const centre = boundsCenter(bounds)
  const thickness = Math.max(size.x, size.y, size.z, 1) * 1e-3
  const half = {
    x: Math.max(size.x, thickness) / 2,
    y: Math.max(size.y, thickness) / 2,
    z: Math.max(size.z, thickness) / 2,
  }

  const corners: readonly (readonly [number, number, number])[] = [
    [centre.x - half.x, centre.y - half.y, centre.z - half.z],
    [centre.x + half.x, centre.y - half.y, centre.z - half.z],
    [centre.x + half.x, centre.y + half.y, centre.z - half.z],
    [centre.x - half.x, centre.y + half.y, centre.z - half.z],
    [centre.x - half.x, centre.y - half.y, centre.z + half.z],
    [centre.x + half.x, centre.y - half.y, centre.z + half.z],
    [centre.x + half.x, centre.y + half.y, centre.z + half.z],
    [centre.x - half.x, centre.y + half.y, centre.z + half.z],
  ]
  const faces: readonly (readonly [number, number, number, number])[] = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
  ]

  const positions: number[] = []
  const indices: number[] = []
  for (const face of faces) {
    const base = positions.length / 3
    for (const corner of face) {
      const point = corners[corner] as readonly [number, number, number]
      positions.push(point[0], point[1], point[2])
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return recomputeNormals({ positions, normals: [], indices })
}
