import type { MeshData } from '../domain/MeshData'
import { meshBounds } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { dot, cross, subtract } from '../domain/vec3'
import { meshTriangles } from './primitives'
import type { Triangle } from './types'

/**
 * Six times the signed volume of the tetrahedron between a triangle and the
 * origin. Summing this over a closed mesh gives six times the enclosed volume —
 * the divergence theorem, with the origin as the apex.
 */
export function signedTetrahedronVolume6(triangle: Triangle): number {
  return dot(triangle.a, cross(triangle.b, triangle.c))
}

/**
 * Volume enclosed by a closed mesh. The sign follows the winding, so a mesh
 * turned inside out reports a negative volume rather than silently agreeing
 * with a correct one.
 */
export function signedVolume(mesh: MeshData): number {
  let total = 0
  for (const triangle of meshTriangles(mesh)) total += signedTetrahedronVolume6(triangle)
  return total / 6
}

/** Enclosed volume as a magnitude, which is what a measurement reports. */
export function measureVolume(mesh: MeshData): number {
  return Math.abs(signedVolume(mesh))
}

/** Whether the mesh is wound outwards, i.e. whether its signed volume is positive. */
export function isOutwardWound(mesh: MeshData): boolean {
  return signedVolume(mesh) >= 0
}

/** Volume of the axis-aligned box the mesh sits in — its bounding-box volume. */
export function measureBoundingVolume(mesh: MeshData): number {
  const bounds = meshBounds(mesh)
  return (
    Math.max(0, bounds.max.x - bounds.min.x) *
    Math.max(0, bounds.max.y - bounds.min.y) *
    Math.max(0, bounds.max.z - bounds.min.z)
  )
}

/** Volume of a single tetrahedron, used by the mass-property decomposition. */
export function tetrahedronVolume(apex: Vec3, triangle: Triangle): number {
  return (
    Math.abs(
      dot(
        subtract(triangle.a, apex),
        cross(subtract(triangle.b, apex), subtract(triangle.c, apex)),
      ),
    ) / 6
  )
}
