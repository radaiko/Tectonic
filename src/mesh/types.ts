/**
 * Connectivity for a triangle soup.
 *
 * A {@link MeshData} is positions and indices and nothing else — which is all a
 * renderer needs and nowhere near enough to edit. Everything in `mesh/` works
 * off the adjacency built here: which triangles share an edge answers manifold,
 * closed and boundary questions; which triangles touch a vertex answers smoothing
 * and welding; the boundary loops answer hole filling and bridging.
 *
 * The topology is derived, never stored. It is cheap to rebuild and impossible
 * to leave stale, which matters because every edit changes the connectivity.
 */

import type { MeshData } from '../domain/MeshData'
import { triangleAt, triangleCount, vertexCount } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { cross, length, subtract } from '../domain/vec3'

/** Raised when a mesh cannot be read, repaired or edited as asked. */
export class MeshError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MeshError'
  }
}

/** What a click in the mesh editor can land on. */
export const MESH_ELEMENTS = ['vertex', 'edge', 'face'] as const
export type MeshElement = (typeof MESH_ELEMENTS)[number]

/**
 * An undirected edge, written `low:high`. Keying on the sorted pair is what
 * makes two triangles that traverse the edge in opposite directions — which is
 * what consistent winding means — agree that it is the same edge.
 */
export type EdgeKey = string

export function edgeKey(a: number, b: number): EdgeKey {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

export function parseEdgeKey(key: EdgeKey): readonly [number, number] {
  const separator = key.indexOf(':')
  return [Number(key.slice(0, separator)), Number(key.slice(separator + 1))]
}

export interface MeshTopology {
  readonly vertexCount: number
  readonly triangleCount: number
  /** Triangles on each undirected edge: one is a boundary, three-plus is non-manifold. */
  readonly edgeTriangles: ReadonlyMap<EdgeKey, readonly number[]>
  readonly vertexTriangles: ReadonlyMap<number, readonly number[]>
  readonly vertexNeighbors: ReadonlyMap<number, readonly number[]>
  /** Unit normal of each triangle, indexed by triangle. */
  readonly faceNormals: readonly Vec3[]
  /** Twice the area of each triangle — cheap, and zero exactly when degenerate. */
  readonly doubleAreas: readonly number[]
}

export function buildTopology(mesh: MeshData): MeshTopology {
  const triangles = triangleCount(mesh)
  const edgeTriangles = new Map<EdgeKey, number[]>()
  const vertexTriangles = new Map<number, number[]>()
  const vertexNeighbors = new Map<number, Set<number>>()
  const faceNormals: Vec3[] = []
  const doubleAreas: number[] = []

  for (let triangle = 0; triangle < triangles; triangle += 1) {
    const corners = cornersOf(mesh, triangle)
    const [a, b, c] = corners

    for (const [from, to] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = edgeKey(from, to)
      const owners = edgeTriangles.get(key)
      if (owners) owners.push(triangle)
      else edgeTriangles.set(key, [triangle])

      neighbours(vertexNeighbors, from).add(to)
      neighbours(vertexNeighbors, to).add(from)
    }

    for (const corner of corners) {
      const owners = vertexTriangles.get(corner)
      if (owners) owners.push(triangle)
      else vertexTriangles.set(corner, [triangle])
    }

    const [p, q, r] = triangleAt(mesh, triangle)
    const normalVector = cross(subtract(q, p), subtract(r, p))
    const magnitude = length(normalVector)
    doubleAreas.push(magnitude)
    faceNormals.push(
      magnitude === 0
        ? { x: 0, y: 0, z: 0 }
        : {
            x: normalVector.x / magnitude,
            y: normalVector.y / magnitude,
            z: normalVector.z / magnitude,
          },
    )
  }

  return {
    vertexCount: vertexCount(mesh),
    triangleCount: triangles,
    edgeTriangles,
    vertexTriangles,
    vertexNeighbors: new Map(
      [...vertexNeighbors].map(([vertex, set]) => [vertex, [...set]] as const),
    ),
    faceNormals,
    doubleAreas,
  }
}

/** The three vertex indices of a triangle. */
export function cornersOf(mesh: MeshData, triangle: number): readonly [number, number, number] {
  return [
    mesh.indices[triangle * 3] ?? 0,
    mesh.indices[triangle * 3 + 1] ?? 0,
    mesh.indices[triangle * 3 + 2] ?? 0,
  ]
}

/** Edges used by exactly one triangle: the rim of any opening in the mesh. */
export function boundaryEdges(topology: MeshTopology): EdgeKey[] {
  const open: EdgeKey[] = []
  for (const [key, owners] of topology.edgeTriangles) {
    if (owners.length === 1) open.push(key)
  }
  return open
}

/** Edges shared by three or more triangles — the mesh pinches or self-touches. */
export function nonManifoldEdges(topology: MeshTopology): EdgeKey[] {
  const bad: EdgeKey[] = []
  for (const [key, owners] of topology.edgeTriangles) {
    if (owners.length > 2) bad.push(key)
  }
  return bad
}

/**
 * The boundary edges chained into loops, each an ordered ring of vertices.
 *
 * A vertex where several boundary edges meet — the pinch point between two holes
 * that touch — is walked one edge at a time, so the loops come out separate
 * rather than merged into one figure of eight.
 */
export function boundaryLoops(topology: MeshTopology): number[][] {
  const remaining = new Map<number, number[]>()
  const link = (from: number, to: number): void => {
    const existing = remaining.get(from)
    if (existing) existing.push(to)
    else remaining.set(from, [to])
  }
  for (const key of boundaryEdges(topology)) {
    const [a, b] = parseEdgeKey(key)
    link(a, b)
    link(b, a)
  }

  /** Walks one boundary edge away from `from`, consuming it in both directions. */
  const take = (from: number): number | undefined => {
    const options = remaining.get(from)
    const next = options?.shift()
    if (next === undefined) return undefined
    const back = remaining.get(next)
    if (back) {
      const mirror = back.indexOf(from)
      if (mirror >= 0) back.splice(mirror, 1)
    }
    return next
  }

  const loops: number[][] = []
  for (const start of [...remaining.keys()]) {
    while ((remaining.get(start)?.length ?? 0) > 0) {
      const loop = [start]
      let current = take(start)
      while (current !== undefined && current !== start) {
        loop.push(current)
        current = take(current)
      }
      // A chain that never came back is not a loop; drop it rather than
      // pretending an open strip of boundary encloses a hole.
      if (current === start && loop.length >= 3) loops.push(loop)
    }
  }
  return loops
}

function neighbours(map: Map<number, Set<number>>, vertex: number): Set<number> {
  const existing = map.get(vertex)
  if (existing) return existing
  const created = new Set<number>()
  map.set(vertex, created)
  return created
}
