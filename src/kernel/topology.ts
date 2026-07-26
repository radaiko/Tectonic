import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from './IKernel'

/**
 * Recovers face, edge and vertex identity from a triangle soup.
 *
 * A B-Rep kernel hands out these identifiers for free; a tessellation engine has
 * to infer them. Coplanar triangles are gathered into a face, an edge is where
 * two faces meet (or where the mesh simply stops), and vertices are welded
 * positions. Identifiers are assigned in a canonical geometric order rather than
 * in mesh order, so the same solid always names its pieces the same way however
 * its triangles happen to be laid out.
 */

/** Positions closer than this in every axis are the same vertex. */
const WELD_TOLERANCE = 1e-6
/** Normals within this of each other lie on the same face. */
const NORMAL_TOLERANCE = 1e-4
/** Plane offsets within this of each other lie on the same face. */
const OFFSET_TOLERANCE = 1e-4

export interface TopologyVertex {
  readonly id: string
  readonly position: Vec3
}

export interface TopologyFace {
  readonly id: string
  readonly normal: Vec3
  /** Distance from the origin to the face's plane, along `normal`. */
  readonly offset: number
  /** Offsets into `mesh.indices` where this face's triangles begin. */
  readonly triangles: readonly number[]
  /** Welded vertex ids the face is built from. */
  readonly vertexIds: readonly string[]
}

export interface TopologyEdge {
  readonly id: string
  readonly vertexIds: readonly [string, string]
  /** The faces meeting here — one entry when the edge bounds an opening. */
  readonly faceIds: readonly string[]
}

export interface MeshTopology {
  readonly faces: readonly TopologyFace[]
  readonly edges: readonly TopologyEdge[]
  readonly vertices: readonly TopologyVertex[]
  /** Welded vertex id for every index in `mesh.positions`, by vertex number. */
  readonly vertexIdOf: readonly string[]
}

/** Derives the topology of a tessellated solid. */
export function meshTopology(mesh: MeshData): MeshTopology {
  const welds = weldVertices(mesh)
  const faces = groupFaces(mesh, welds)
  const edges = collectEdges(mesh, welds, faces)
  return { faces, edges, vertices: welds.vertices, vertexIdOf: welds.vertexIdOf }
}

/**
 * The named faces, in the order they were asked for. Ids that do not belong to
 * the shape are skipped, so a stale selection degrades rather than throws.
 */
export function facesById(
  topology: MeshTopology,
  faceIds: readonly string[],
): TopologyFace[] {
  const byId = new Map(topology.faces.map((face) => [face.id, face]))
  return faceIds
    .map((id) => byId.get(id))
    .filter((face): face is TopologyFace => face !== undefined)
}

/**
 * Welded vertex ids the named faces are built from. Working in welded ids — not
 * buffer positions — is what keeps a direct edit from tearing the mesh apart
 * along a seam where the same corner appears under two vertex numbers.
 */
export function faceVertexIds(
  topology: MeshTopology,
  faceIds: readonly string[],
): Set<string> {
  const found = new Set<string>()
  for (const face of facesById(topology, faceIds)) {
    for (const id of face.vertexIds) found.add(id)
  }
  return found
}

/* -------------------------------------------------------------------------- */

interface Welds {
  readonly vertices: TopologyVertex[]
  /** Welded vertex id per original vertex number. */
  readonly vertexIdOf: string[]
  /** Welded vertex ordinal per original vertex number. */
  readonly weldOf: number[]
  readonly positions: Vec3[]
}

function weldVertices(mesh: MeshData): Welds {
  const buckets = new Map<string, number[]>()
  const count = mesh.positions.length / 3

  for (let index = 0; index < count; index += 1) {
    const key = weldKey(
      mesh.positions[index * 3] as number,
      mesh.positions[index * 3 + 1] as number,
      mesh.positions[index * 3 + 2] as number,
    )
    const bucket = buckets.get(key)
    if (bucket) bucket.push(index)
    else buckets.set(key, [index])
  }

  // Canonical order: sorted by position, so ids do not depend on mesh order.
  const groups = [...buckets.values()].map((members) => ({
    members,
    position: positionAt(mesh, members[0] as number),
  }))
  groups.sort((a, b) => comparePoints(a.position, b.position))

  const vertices: TopologyVertex[] = []
  const vertexIdOf = new Array<string>(count)
  const weldOf = new Array<number>(count)
  const positions: Vec3[] = []

  groups.forEach((group, ordinal) => {
    const id = `vertex-${ordinal}`
    vertices.push({ id, position: group.position })
    positions.push(group.position)
    for (const member of group.members) {
      vertexIdOf[member] = id
      weldOf[member] = ordinal
    }
  })

  return { vertices, vertexIdOf, weldOf, positions }
}

interface FaceGroup {
  normal: Vec3
  offset: number
  readonly triangles: number[]
  readonly vertices: Set<number>
  /** Running triangle-area total, so the plane is a weighted average. */
  weight: number
}

function groupFaces(mesh: MeshData, welds: Welds): TopologyFace[] {
  const groups: FaceGroup[] = []

  for (let start = 0; start + 2 < mesh.indices.length; start += 3) {
    const a = welds.positions[welds.weldOf[mesh.indices[start] as number] as number] as Vec3
    const b = welds.positions[welds.weldOf[mesh.indices[start + 1] as number] as number] as Vec3
    const c = welds.positions[welds.weldOf[mesh.indices[start + 2] as number] as number] as Vec3

    const raw = cross(subtract(b, a), subtract(c, a))
    const area = length(raw) / 2
    // A degenerate triangle has no plane of its own; it joins whichever face
    // already claims its vertices, or is dropped when none does.
    if (area <= 0) continue

    const normal = scale(raw, 1 / (area * 2))
    const offset = dot(normal, a)
    const group = groups.find(
      (candidate) =>
        Math.abs(candidate.offset - offset) <= OFFSET_TOLERANCE &&
        Math.abs(candidate.normal.x - normal.x) <= NORMAL_TOLERANCE &&
        Math.abs(candidate.normal.y - normal.y) <= NORMAL_TOLERANCE &&
        Math.abs(candidate.normal.z - normal.z) <= NORMAL_TOLERANCE,
    )

    if (group) {
      // Re-average so a curved surface's face plane does not drift with the
      // first triangle that happened to land in it.
      const total = group.weight + area
      group.normal = normalize(
        add(scale(group.normal, group.weight / total), scale(normal, area / total)),
      )
      group.offset = (group.offset * group.weight + offset * area) / total
      group.weight = total
      group.triangles.push(start)
      for (let corner = 0; corner < 3; corner += 1) {
        group.vertices.add(welds.weldOf[mesh.indices[start + corner] as number] as number)
      }
      continue
    }

    const created: FaceGroup = {
      normal,
      offset,
      triangles: [start],
      vertices: new Set<number>(),
      weight: area,
    }
    for (let corner = 0; corner < 3; corner += 1) {
      created.vertices.add(welds.weldOf[mesh.indices[start + corner] as number] as number)
    }
    groups.push(created)
  }

  groups.sort(
    (a, b) => comparePoints(a.normal, b.normal) || compareNumbers(a.offset, b.offset),
  )

  return groups.map((group, ordinal) => ({
    id: `face-${ordinal}`,
    normal: group.normal,
    offset: group.offset,
    triangles: group.triangles,
    vertexIds: [...group.vertices]
      .sort((a, b) => a - b)
      .map((weld) => (welds.vertices[weld] as TopologyVertex).id),
  }))
}

function collectEdges(mesh: MeshData, welds: Welds, faces: readonly TopologyFace[]): TopologyEdge[] {
  const faceOfTriangle = new Map<number, string>()
  for (const face of faces) {
    for (const start of face.triangles) faceOfTriangle.set(start, face.id)
  }

  interface Side {
    readonly low: number
    readonly high: number
    readonly faceIds: Set<string>
    triangles: number
  }

  const sides = new Map<string, Side>()
  for (let start = 0; start + 2 < mesh.indices.length; start += 3) {
    const faceId = faceOfTriangle.get(start)
    if (faceId === undefined) continue

    for (let corner = 0; corner < 3; corner += 1) {
      const from = welds.weldOf[mesh.indices[start + corner] as number] as number
      const to = welds.weldOf[mesh.indices[start + ((corner + 1) % 3)] as number] as number
      if (from === to) continue

      const low = Math.min(from, to)
      const high = Math.max(from, to)
      const key = `${low}:${high}`
      const side = sides.get(key)
      if (side) {
        side.faceIds.add(faceId)
        side.triangles += 1
      } else {
        sides.set(key, { low, high, faceIds: new Set([faceId]), triangles: 1 })
      }
    }
  }

  // Two triangles of the same face share a side only because the face had to be
  // triangulated; that is not an edge of the solid. What counts is a seam
  // between two faces, or a side the mesh simply stops at.
  const edges = [...sides.values()].filter(
    (side) => side.faceIds.size >= 2 || side.triangles === 1,
  )
  edges.sort((a, b) => compareNumbers(a.low, b.low) || compareNumbers(a.high, b.high))

  return edges.map((side, ordinal) => ({
    id: `edge-${ordinal}`,
    vertexIds: [
      (welds.vertices[side.low] as TopologyVertex).id,
      (welds.vertices[side.high] as TopologyVertex).id,
    ] as [string, string],
    faceIds: [...side.faceIds].sort(),
  }))
}

function weldKey(x: number, y: number, z: number): string {
  return `${quantize(x)}:${quantize(y)}:${quantize(z)}`
}

function quantize(value: number): number {
  // `+ 0` turns -0 into 0 so mirrored geometry welds against its original.
  return Math.round(value / WELD_TOLERANCE) + 0
}

function positionAt(mesh: MeshData, index: number): Vec3 {
  return {
    x: mesh.positions[index * 3] as number,
    y: mesh.positions[index * 3 + 1] as number,
    z: mesh.positions[index * 3 + 2] as number,
  }
}

function comparePoints(a: Vec3, b: Vec3): number {
  return compareNumbers(a.x, b.x) || compareNumbers(a.y, b.y) || compareNumbers(a.z, b.z)
}

function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function scale(vector: Vec3, factor: number): Vec3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function length(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z)
}

function normalize(vector: Vec3): Vec3 {
  const magnitude = length(vector)
  return magnitude === 0 ? vector : scale(vector, 1 / magnitude)
}
