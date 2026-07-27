import type { MeshData } from '../domain/MeshData'
import { triangleCount } from '../domain/MeshData'
import { dot } from '../domain/vec3'
import type { IKernel, ShapeHandle } from '../kernel/IKernel'
import type { MeshValidation } from './MeshImport'
import { repairMesh, validateMesh } from './MeshImport'
import type { EdgeKey, MeshTopology } from './types'
import { MeshError, buildTopology, cornersOf, edgeKey, parseEdgeKey } from './types'

/**
 * Turning an imported mesh into something the feature tree can model on.
 *
 * The conversion is a facet approximation: every triangle becomes a planar face
 * of the resulting shape, so the solid is exactly the mesh rather than a fitted
 * approximation of it. That keeps the operation honest — nothing is invented —
 * at the cost of a face count equal to the triangle count, which is why the
 * facet groups below matter: coplanar neighbours are reported together so a
 * caller can merge them and a later fillet has a real face to grip.
 *
 * A mesh that is not watertight cannot bound a volume, so it cannot become a
 * solid. It is repaired first when asked, and refused otherwise.
 */

export interface MeshToSolidOptions {
  /** Repair the mesh first when it is not watertight. On by default. */
  readonly repair?: boolean
  /** Refuse rather than convert an open mesh. On by default. */
  readonly requireWatertight?: boolean
  /** Dihedral angle, in degrees, above which an edge counts as a sharp feature. */
  readonly sharpAngle?: number
  readonly name?: string
}

export interface MeshToSolidResult {
  readonly shape: ShapeHandle
  /** The mesh actually handed to the kernel — repaired, if repair was needed. */
  readonly mesh: MeshData
  readonly name: string
  readonly watertight: boolean
  readonly repaired: boolean
  /** Edges the conversion should preserve as real edges, not smooth them over. */
  readonly sharpEdges: readonly EdgeKey[]
  /** Triangles grouped into the planar faces they make up. */
  readonly facetGroups: readonly (readonly number[])[]
  readonly validation: MeshValidation
}

export const DEFAULT_SHARP_ANGLE = 30

/**
 * Adopts a mesh as a kernel shape.
 *
 * The kernel's own `createFromMesh` does the adoption; everything here is about
 * making sure what it is handed actually bounds a volume, and about reporting
 * the structure a mesh has but a triangle soup does not express.
 */
export async function meshToSolid(
  kernel: IKernel,
  mesh: MeshData,
  options: MeshToSolidOptions = {},
): Promise<MeshToSolidResult> {
  if (triangleCount(mesh) === 0) throw new MeshError('An empty mesh cannot become a solid')

  let working = mesh
  let repaired = false
  let validation = validateMesh(mesh)

  if (!isWatertight(validation) && options.repair !== false) {
    const report = repairMesh(mesh)
    working = report.mesh
    repaired = true
    validation = validateMesh(working)
  }

  if (!isWatertight(validation) && options.requireWatertight !== false) {
    throw new MeshError(
      `Mesh is not watertight: ${validation.boundaryEdgeCount} open edges, ` +
        `${validation.nonManifoldEdges.length} non-manifold edges`,
    )
  }

  const topology = buildTopology(working)
  const angle = options.sharpAngle ?? DEFAULT_SHARP_ANGLE

  return {
    shape: await kernel.createFromMesh(working),
    mesh: working,
    name: options.name ?? 'Converted mesh',
    watertight: isWatertight(validation),
    repaired,
    sharpEdges: sharpFeatureEdges(topology, angle),
    facetGroups: facetGroups(working, topology, angle),
    validation,
  }
}

/** Whether the mesh encloses a volume: closed, manifold and consistently wound. */
export function isWatertight(validation: MeshValidation): boolean {
  return validation.closed && validation.manifold && validation.invertedTriangles.length === 0
}

/**
 * Edges where the surface creases.
 *
 * The test is the angle between the two face normals. A boundary edge is always
 * sharp — there is nothing on the other side to be smooth with — and so is a
 * non-manifold one, because whatever meets there is a real feature of the shape.
 */
export function sharpFeatureEdges(
  topology: MeshTopology,
  angleDegrees = DEFAULT_SHARP_ANGLE,
): EdgeKey[] {
  const threshold = Math.cos((Math.max(0, angleDegrees) * Math.PI) / 180)
  const sharp: EdgeKey[] = []

  for (const [key, owners] of topology.edgeTriangles) {
    if (owners.length !== 2) {
      sharp.push(key)
      continue
    }
    const first = topology.faceNormals[owners[0] as number]
    const second = topology.faceNormals[owners[1] as number]
    if (!first || !second) continue
    if (dot(first, second) < threshold) sharp.push(key)
  }
  return sharp.sort()
}

/**
 * Triangles gathered into the flat faces they tile.
 *
 * Two triangles join the same group when the edge between them is not sharp, so
 * the groups are exactly the regions a sharp-edge network divides the surface
 * into — the faces a B-Rep would have had if the geometry had not been through a
 * mesh on the way here.
 */
export function facetGroups(
  mesh: MeshData,
  topology: MeshTopology,
  angleDegrees = DEFAULT_SHARP_ANGLE,
): number[][] {
  const sharp = new Set(sharpFeatureEdges(topology, angleDegrees))
  const group = new Map<number, number>()
  const groups: number[][] = []

  for (let seed = 0; seed < topology.triangleCount; seed += 1) {
    if (group.has(seed)) continue
    const members: number[] = []
    const queue = [seed]
    group.set(seed, groups.length)

    while (queue.length > 0) {
      const triangle = queue.pop() as number
      members.push(triangle)
      const corners = cornersOf(mesh, triangle)

      for (let corner = 0; corner < 3; corner += 1) {
        const key = edgeKey(corners[corner] as number, corners[(corner + 1) % 3] as number)
        if (sharp.has(key)) continue
        for (const other of topology.edgeTriangles.get(key) ?? []) {
          if (other === triangle || group.has(other)) continue
          group.set(other, groups.length)
          queue.push(other)
        }
      }
    }
    groups.push(members.sort((a, b) => a - b))
  }
  return groups
}

/**
 * The sharp edges as vertex pairs, for drawing the feature lines the conversion
 * found. Handy for a preview: the user can see what will survive as an edge
 * before committing to the conversion.
 */
export function sharpEdgeSegments(edges: readonly EdgeKey[]): (readonly [number, number])[] {
  return edges.map((key) => parseEdgeKey(key))
}
