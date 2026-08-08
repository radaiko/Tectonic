import type { MeshData } from '../domain/MeshData'
import { meshTopology } from '../kernel/topology'

/**
 * Turning a pointer event into something the scene can be asked about.
 *
 * Two things here are easy to get wrong and are the reason this is its own
 * module rather than a few lines inside the viewport: the coordinate conversion
 * has to work in CSS pixels, and a click has to be told apart from an orbit.
 */

/** Just the part of a `DOMRect` the conversion needs. */
export interface PointerRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface Ndc {
  readonly x: number
  readonly y: number
}

/**
 * A pointer position in normalised device coordinates, or null when it is
 * outside the canvas or the canvas has not been laid out yet.
 *
 * The rect is the element's *CSS* box, which is what pointer events are already
 * measured in — so device pixel ratio never enters into it. Using the canvas
 * `width`/`height` attributes instead would be the bug this guards against:
 * those are the backing store, and on a 2× display every pick would land at
 * half the distance from the top left that the user aimed at.
 */
export function pointerNdc(rect: PointerRect, clientX: number, clientY: number): Ndc | null {
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x: x * 2 - 1, y: -(y * 2) + 1 }
}

/**
 * How far a pointer may travel between press and release and still count as a
 * click. Orbiting starts on the same button, so without a threshold every
 * release from a drag would also select whatever it happened to end over.
 */
export const CLICK_SLOP_PX = 4

export function isClick(
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  slop: number = CLICK_SLOP_PX,
): boolean {
  return Math.abs(to.x - from.x) <= slop && Math.abs(to.y - from.y) <= slop
}

/**
 * Topology is derived per mesh and reused, because a pick happens on every
 * pointer move and re-deriving it there would walk the whole triangle soup each
 * time. Keyed weakly: a mesh dropped by a rebuild takes its entry with it.
 */
const faceIdsByMesh = new WeakMap<MeshData, readonly (string | undefined)[]>()

/**
 * The id of the planar face a triangle belongs to, or null when the triangle is
 * not part of the mesh.
 *
 * `triangleIndex` is three.js's `faceIndex` — the ordinal of the triangle in the
 * geometry's index buffer. {@link toBufferGeometry} sets that buffer straight
 * from `mesh.indices` without reordering or grouping, so the ordinal means the
 * same thing on both sides, and {@link meshTopology} is the same derivation the
 * support resolver runs. An id picked here therefore names the face a sketch
 * will actually be placed on.
 */
export function faceIdAtTriangle(mesh: MeshData, triangleIndex: number): string | null {
  return faceIdLookup(mesh)[triangleIndex] ?? null
}

/**
 * The index buffer for just one face of a mesh, or null when the mesh has no
 * such face — enough to draw the face on its own as a hover highlight.
 */
export function faceIndices(mesh: MeshData, faceId: string): number[] | null {
  const face = meshTopology(mesh).faces.find((candidate) => candidate.id === faceId)
  if (!face) return null
  const indices: number[] = []
  for (const offset of face.triangles) {
    indices.push(
      mesh.indices[offset] as number,
      mesh.indices[offset + 1] as number,
      mesh.indices[offset + 2] as number,
    )
  }
  return indices
}

/**
 * A mesh's edges as one flat line list, plus the id of each segment.
 *
 * `positions` holds the two endpoints of every edge back to back, which is what
 * a `LineSegments` geometry wants. `edgeIds` is parallel to the *segments*, so
 * the ordinal three.js reports for a hit — the index of the segment's first
 * vertex, halved — names the edge that was hit.
 *
 * The edges come from {@link meshTopology}, the same derivation that hands out
 * the ids a fillet or a chamfer stores, so picking an edge here names the edge
 * the kernel will round.
 */
export interface EdgeLines {
  readonly positions: number[]
  readonly edgeIds: string[]
}

const edgeLinesByMesh = new WeakMap<MeshData, EdgeLines>()

export function edgeLines(mesh: MeshData): EdgeLines {
  const cached = edgeLinesByMesh.get(mesh)
  if (cached) return cached

  const topology = meshTopology(mesh)
  const positions: number[] = []
  const edgeIds: string[] = []
  const at = new Map(topology.vertices.map((vertex) => [vertex.id, vertex.position]))

  for (const edge of topology.edges) {
    const from = at.get(edge.vertexIds[0])
    const to = at.get(edge.vertexIds[1])
    if (!from || !to) continue
    positions.push(from.x, from.y, from.z, to.x, to.y, to.z)
    edgeIds.push(edge.id)
  }

  const lines = { positions, edgeIds }
  edgeLinesByMesh.set(mesh, lines)
  return lines
}

/** The id of the edge a line-segment hit landed on, or null when it is not one. */
export function edgeIdAtSegment(mesh: MeshData, vertexIndex: number): string | null {
  return edgeLines(mesh).edgeIds[Math.floor(vertexIndex / 2)] ?? null
}

/** The two endpoints of one named edge, or null when the mesh has no such edge. */
export function edgePositions(mesh: MeshData, edgeId: string): number[] | null {
  const lines = edgeLines(mesh)
  const index = lines.edgeIds.indexOf(edgeId)
  if (index === -1) return null
  return lines.positions.slice(index * 6, index * 6 + 6)
}

function faceIdLookup(mesh: MeshData): readonly (string | undefined)[] {
  const cached = faceIdsByMesh.get(mesh)
  if (cached) return cached

  const lookup: (string | undefined)[] = new Array(mesh.indices.length / 3)
  for (const face of meshTopology(mesh).faces) {
    // `triangles` holds offsets into `mesh.indices`; three counts triangles.
    for (const offset of face.triangles) lookup[offset / 3] = face.id
  }
  faceIdsByMesh.set(mesh, lookup)
  return lookup
}
