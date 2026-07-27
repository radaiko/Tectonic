import type { MeshData } from '../domain/MeshData'
import { faceNormal, positionAt, triangleAt, triangleCount } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { normalize } from '../domain/vec3'
import { triangleArea } from '../analysis/primitives'

/**
 * Recovering faces from a triangle soup.
 *
 * A body arrives here tessellated: the kernel's faces are gone and all that is
 * left is triangles. Comparing two bodies triangle by triangle would be useless
 * — retessellating the same unchanged solid can produce a different triangle
 * count — so the triangles are grouped back into the faces they came from
 * first, and the comparison runs on those.
 *
 * The grouping is a flood fill over shared edges that stops at creases: two
 * triangles belong to the same face when they share an edge and their normals
 * differ by less than the crease angle. That merges a tessellated cylinder into
 * one face, which is what the kernel had, and keeps the six sides of a box
 * apart, which it also had.
 *
 * Vertices are welded by position first. Exporters and tessellators routinely
 * duplicate a vertex per triangle, and without welding no two triangles would
 * appear to share anything at all.
 */

/** One recovered face: which triangles it owns and what it measures. */
export interface MeshFace {
  /** Index of the face within its mesh, in discovery order. */
  readonly index: number
  /** Indices into the mesh's triangle list. */
  readonly triangles: readonly number[]
  readonly area: number
  /** Area-weighted centroid. */
  readonly centroid: Vec3
  /** Area-weighted unit normal. */
  readonly normal: Vec3
}

export interface FaceGroupOptions {
  /**
   * Largest angle between adjacent triangle normals that still counts as the
   * same face, in radians. The default keeps a coarse cylinder together while
   * splitting anything that reads as an edge.
   */
  readonly creaseAngle?: number
  /** Distance below which two vertices are treated as one. */
  readonly weldTolerance?: number
}

export const DEFAULT_CREASE_ANGLE = (30 * Math.PI) / 180
export const DEFAULT_WELD_TOLERANCE = 1e-6

/**
 * Groups a mesh's triangles into faces.
 *
 * Degenerate triangles — zero area, so no meaningful normal — are dropped
 * rather than seeded from, because a face grown from a random normal would
 * swallow whatever it touched.
 */
export function meshFaces(mesh: MeshData, options: FaceGroupOptions = {}): MeshFace[] {
  const creaseAngle = options.creaseAngle ?? DEFAULT_CREASE_ANGLE
  const total = triangleCount(mesh)
  if (total === 0) return []

  const welded = weldIndices(mesh, options.weldTolerance ?? DEFAULT_WELD_TOLERANCE)
  const normals = new Array<Vec3 | null>(total)
  const areas = new Array<number>(total).fill(0)

  for (let triangle = 0; triangle < total; triangle += 1) {
    const [a, b, c] = triangleAt(mesh, triangle)
    const area = triangleArea({ a, b, c })
    areas[triangle] = area
    const normal = faceNormal(a, b, c)
    normals[triangle] = area > 0 && (normal.x !== 0 || normal.y !== 0 || normal.z !== 0)
      ? normal
      : null
  }

  const neighbours = adjacency(mesh, welded, total)
  const minimumCosine = Math.cos(creaseAngle)
  const faceOf = new Array<number>(total).fill(-1)
  const faces: MeshFace[] = []

  for (let seed = 0; seed < total; seed += 1) {
    if (faceOf[seed] !== -1 || normals[seed] === null) continue

    const index = faces.length
    const members: number[] = []
    const queue = [seed]
    faceOf[seed] = index

    while (queue.length > 0) {
      const triangle = queue.pop() as number
      members.push(triangle)
      const normal = normals[triangle] as Vec3

      for (const neighbour of neighbours[triangle] ?? []) {
        if (faceOf[neighbour] !== -1) continue
        const other = normals[neighbour]
        if (other === null || other === undefined) continue
        // Compared neighbour to neighbour rather than to the seed, so a curved
        // surface stays whole however far it bends in total.
        if (normal.x * other.x + normal.y * other.y + normal.z * other.z < minimumCosine) continue
        faceOf[neighbour] = index
        queue.push(neighbour)
      }
    }

    faces.push(summarize(index, members, mesh, areas))
  }
  return faces
}

/** Area-weighted centroid, normal and total area of a group of triangles. */
function summarize(
  index: number,
  triangles: readonly number[],
  mesh: MeshData,
  areas: readonly number[],
): MeshFace {
  let area = 0
  let cx = 0
  let cy = 0
  let cz = 0
  let nx = 0
  let ny = 0
  let nz = 0

  for (const triangle of triangles) {
    const weight = areas[triangle] ?? 0
    const [a, b, c] = triangleAt(mesh, triangle)
    const normal = faceNormal(a, b, c)
    area += weight
    cx += ((a.x + b.x + c.x) / 3) * weight
    cy += ((a.y + b.y + c.y) / 3) * weight
    cz += ((a.z + b.z + c.z) / 3) * weight
    nx += normal.x * weight
    ny += normal.y * weight
    nz += normal.z * weight
  }

  const centroid =
    area > 0 ? { x: cx / area, y: cy / area, z: cz / area } : { x: 0, y: 0, z: 0 }
  return {
    index,
    triangles: [...triangles].sort((left, right) => left - right),
    area,
    centroid,
    normal: normalize({ x: nx, y: ny, z: nz }),
  }
}

/**
 * Canonical vertex index per mesh vertex, with vertices closer than
 * `tolerance` collapsed onto one. Snapping to a grid makes this a single pass
 * rather than an all-pairs comparison; two points either side of a cell
 * boundary stay apart, which for welding duplicated vertices — they are exactly
 * equal — costs nothing.
 */
export function weldIndices(mesh: MeshData, tolerance: number): number[] {
  const step = tolerance > 0 ? tolerance : DEFAULT_WELD_TOLERANCE
  const canonical = new Map<string, number>()
  const vertices = mesh.positions.length / 3
  const out = new Array<number>(vertices)

  for (let vertex = 0; vertex < vertices; vertex += 1) {
    const point = positionAt(mesh, vertex)
    const key = `${Math.round(point.x / step)},${Math.round(point.y / step)},${Math.round(point.z / step)}`
    const existing = canonical.get(key)
    if (existing === undefined) {
      canonical.set(key, vertex)
      out[vertex] = vertex
    } else {
      out[vertex] = existing
    }
  }
  return out
}

/**
 * Triangles sharing an edge, keyed by triangle index.
 *
 * An edge is keyed on its welded endpoints in sorted order, so the two
 * triangles either side of it — wound in opposite directions — land on the same
 * key. An edge shared by more than two triangles (a non-manifold seam) simply
 * links all of them.
 */
function adjacency(mesh: MeshData, welded: readonly number[], total: number): number[][] {
  const byEdge = new Map<string, number[]>()

  for (let triangle = 0; triangle < total; triangle += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const from = welded[mesh.indices[triangle * 3 + corner] ?? 0] ?? 0
      const to = welded[mesh.indices[triangle * 3 + ((corner + 1) % 3)] ?? 0] ?? 0
      if (from === to) continue
      const key = from < to ? `${from}:${to}` : `${to}:${from}`
      const owners = byEdge.get(key)
      if (owners === undefined) byEdge.set(key, [triangle])
      else owners.push(triangle)
    }
  }

  const neighbours: number[][] = Array.from({ length: total }, () => [])
  for (const owners of byEdge.values()) {
    if (owners.length < 2) continue
    for (const triangle of owners) {
      for (const other of owners) {
        if (other !== triangle) (neighbours[triangle] as number[]).push(other)
      }
    }
  }
  return neighbours
}

/** The triangles a face owns, as points — what the diff hands to the renderer. */
export function faceMesh(mesh: MeshData, face: MeshFace): MeshData {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  for (const triangle of face.triangles) {
    const [a, b, c] = triangleAt(mesh, triangle)
    const normal = faceNormal(a, b, c)
    const base = positions.length / 3
    for (const point of [a, b, c]) positions.push(point.x, point.y, point.z)
    for (let corner = 0; corner < 3; corner += 1) normals.push(normal.x, normal.y, normal.z)
    indices.push(base, base + 1, base + 2)
  }
  return { positions, normals, indices }
}
