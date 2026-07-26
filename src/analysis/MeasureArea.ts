import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { add, normalize, scale } from '../domain/vec3'
import { meshTriangles, triangleArea, triangleNormal } from './primitives'
import type { FaceTarget, Triangle } from './types'

export interface AreaMeasurement {
  readonly area: number
  /** Area-weighted centre of the triangles, i.e. where a label should sit. */
  readonly centroid: Vec3
  /** Area-weighted average normal, unit length. */
  readonly normal: Vec3
}

export function measureTriangleArea(triangle: Triangle): number {
  return triangleArea(triangle)
}

/**
 * Area of a set of triangles, with the centroid and average normal that go with
 * it. Degenerate triangles contribute nothing and cannot skew the average.
 */
export function measureTriangleSetArea(triangles: readonly Triangle[]): AreaMeasurement {
  let area = 0
  let weightedCentroid: Vec3 = { x: 0, y: 0, z: 0 }
  let weightedNormal: Vec3 = { x: 0, y: 0, z: 0 }

  for (const triangle of triangles) {
    const triangleWeight = triangleArea(triangle)
    if (triangleWeight === 0) continue
    area += triangleWeight
    const center = scale(add(add(triangle.a, triangle.b), triangle.c), 1 / 3)
    weightedCentroid = add(weightedCentroid, scale(center, triangleWeight))
    weightedNormal = add(weightedNormal, scale(triangleNormal(triangle), triangleWeight))
  }

  if (area === 0) return { area: 0, centroid: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 } }
  return {
    area,
    centroid: scale(weightedCentroid, 1 / area),
    normal: normalize(weightedNormal),
  }
}

/**
 * Area of a face. A face with no tessellation has no bounded area to report, so
 * the measurement comes back zero rather than guessing at the plane's extent.
 */
export function measureArea(face: FaceTarget): AreaMeasurement {
  if (!face.triangles || face.triangles.length === 0) {
    return { area: 0, centroid: face.origin, normal: normalize(face.normal) }
  }
  return measureTriangleSetArea(face.triangles)
}

/** Total surface area of a body. */
export function measureSurfaceArea(mesh: MeshData): number {
  return measureTriangleSetArea(meshTriangles(mesh)).area
}
