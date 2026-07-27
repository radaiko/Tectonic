import type { PerformanceComponent, Viewpoint } from '../../src/performance/types'

/**
 * Builders for the performance tests. A component there is a description
 * rather than geometry, so these make one from a centre and a size instead of
 * from a mesh.
 */

export interface ComponentInit {
  readonly size?: number
  readonly triangleCount?: number
  readonly geometryKey?: string
  readonly pinned?: boolean
  readonly name?: string
}

/** A cube-shaped component of `size` centred on `centre`. */
export function componentAt(
  id: string,
  centre: readonly [number, number, number],
  init: ComponentInit = {},
): PerformanceComponent {
  const half = (init.size ?? 1) / 2
  return {
    id,
    ...(init.name === undefined ? {} : { name: init.name }),
    bounds: {
      min: { x: centre[0] - half, y: centre[1] - half, z: centre[2] - half },
      max: { x: centre[0] + half, y: centre[1] + half, z: centre[2] + half },
    },
    triangleCount: init.triangleCount ?? 1000,
    ...(init.geometryKey === undefined ? {} : { geometryKey: init.geometryKey }),
    ...(init.pinned === undefined ? {} : { pinned: init.pinned }),
  }
}

/** A camera at the origin looking down +X, which most cases below want. */
export function cameraAt(
  position: readonly [number, number, number] = [0, 0, 0],
  direction: readonly [number, number, number] = [1, 0, 0],
  extra: Omit<Viewpoint, 'position' | 'direction'> = {},
): Viewpoint {
  return {
    position: { x: position[0], y: position[1], z: position[2] },
    direction: { x: direction[0], y: direction[1], z: direction[2] },
    ...extra,
  }
}
