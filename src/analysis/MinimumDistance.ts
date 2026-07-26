import type { MeshData } from '../domain/MeshData'
import type { ClosestPair } from './primitives'
import {
  boundsGap,
  meshTriangles,
  pair,
  triangleBounds,
  triangleTriangleDistance,
} from './primitives'
import type { Triangle } from './types'

export interface MinimumDistanceResult extends ClosestPair {
  /** True when the two bodies touch or overlap, so the distance is zero. */
  readonly touching: boolean
}

const NO_DISTANCE: MinimumDistanceResult = {
  distance: Number.POSITIVE_INFINITY,
  from: { x: 0, y: 0, z: 0 },
  to: { x: 0, y: 0, z: 0 },
  touching: false,
}

/**
 * Closest approach between two triangle sets.
 *
 * Every triangle pair is a candidate, which is O(n·m) in the worst case, so each
 * triangle's bounding box is compared against the best distance found so far and
 * the pair is skipped when the boxes are already further apart than that. On
 * separated bodies that prunes almost everything after the first few pairs.
 */
export function minimumDistanceBetweenTriangles(
  first: readonly Triangle[],
  second: readonly Triangle[],
): MinimumDistanceResult {
  if (first.length === 0 || second.length === 0) return NO_DISTANCE

  const firstBounds = first.map(triangleBounds)
  const secondBounds = second.map(triangleBounds)

  let best: ClosestPair = pair(first[0]?.a as never, second[0]?.a as never)

  for (let i = 0; i < first.length; i += 1) {
    const boundsA = firstBounds[i] as never
    for (let j = 0; j < second.length; j += 1) {
      if (boundsGap(boundsA, secondBounds[j] as never) >= best.distance) continue
      const candidate = triangleTriangleDistance(first[i] as Triangle, second[j] as Triangle)
      if (candidate.distance < best.distance) {
        best = candidate
        if (best.distance === 0) return { ...best, touching: true }
      }
    }
  }

  return { ...best, touching: best.distance === 0 }
}

/** Closest approach between two bodies. */
export function minimumDistance(first: MeshData, second: MeshData): MinimumDistanceResult {
  return minimumDistanceBetweenTriangles(meshTriangles(first), meshTriangles(second))
}

/** Whether two bodies interfere, i.e. whether any of their triangles touch. */
export function bodiesInterfere(first: MeshData, second: MeshData): boolean {
  return minimumDistance(first, second).touching
}
