import type { MeshData } from '../../domain/MeshData'
import type { PlaneFrame, Vec3 } from '../../kernel/IKernel'
import type { MeshTopology, TopologyFace } from '../../kernel/topology'
import { meshTopology } from '../../kernel/topology'
import { buildPolygon } from './builders'
import type { Vec2 } from './geometry'
import type { SketchModel } from './SketchModel'

/**
 * Projecting the boundary of a support face into the sketch that sits on it.
 *
 * A sketch started on a planar face of a solid needs to know where that face
 * *ends* — otherwise the first thing a user does is guess at the outline they
 * are drawing inside. Every mainstream package answers this by projecting the
 * face's own boundary in as construction geometry, and this module is that
 * projection.
 *
 * Two properties matter more than anything else here:
 *
 * - **It is derived, never invented.** The loops come out of the support face's
 *   real topology — its boundary edges, chained through its own welded vertices
 *   — and are projected through the very frame the sketch is placed on. There is
 *   no fallback rectangle and no bounding box: geometry that is not the face's
 *   boundary would be worse than no geometry at all, because it looks right.
 * - **It reports failure.** When the boundary cannot be recovered — the face is
 *   not in this tessellation, or its edges do not close into loops — the result
 *   says so and carries nothing. The caller surfaces that; it does not draw
 *   something approximate and stay quiet about it.
 */

/** Points closer than this, in the sketch plane, are the same point. */
const WELD_TOLERANCE = 1e-6

/** One closed boundary loop of a face, in world space. */
export type BoundaryLoop = readonly Vec3[]

export type FaceBoundaryResult =
  | { readonly status: 'ok'; readonly loops: readonly BoundaryLoop[] }
  /**
   * The boundary could not be recovered from what this backend produced. Not an
   * error in the model — a limit of the data available — so it carries a reason
   * a user can act on rather than a stack trace.
   */
  | { readonly status: 'unavailable'; readonly reason: string }

/**
 * The closed boundary loops of one face of a tessellated solid, in world space.
 *
 * A face's boundary edges are the ones it shares with another face, plus any
 * where the mesh simply stops. The edges internal to the face — the seams its
 * triangulation left behind — are already excluded by {@link meshTopology},
 * which is what makes this the face's outline rather than its triangles.
 */
export function faceBoundaryLoops(mesh: MeshData, faceId: string): FaceBoundaryResult {
  const topology = meshTopology(mesh)
  const face = topology.faces.find((candidate) => candidate.id === faceId)
  if (!face) {
    return {
      status: 'unavailable',
      reason: `This body's tessellation has no face ${faceId} to take a boundary from`,
    }
  }
  return loopsOfFace(topology, face)
}

/** The same, when the caller already has the topology in hand. */
export function loopsOfFace(topology: MeshTopology, face: TopologyFace): FaceBoundaryResult {
  const positions = new Map(topology.vertices.map((vertex) => [vertex.id, vertex.position]))
  const owned = new Set(face.vertexIds)

  /** Boundary edges: this face's, and only where both ends belong to it. */
  const edges = topology.edges.filter(
    (edge) =>
      edge.faceIds.includes(face.id) &&
      owned.has(edge.vertexIds[0]) &&
      owned.has(edge.vertexIds[1]),
  )
  if (edges.length < 3) {
    return {
      status: 'unavailable',
      reason: `Face ${face.id} reports ${edges.length} boundary edges, which cannot close a loop`,
    }
  }

  // Which edges meet at each vertex. A well-formed planar face has exactly two
  // per vertex, and walking that adjacency is what turns a bag of edges into
  // ordered loops.
  const meeting = new Map<string, string[]>()
  const ends = new Map<string, readonly [string, string]>()
  for (const edge of edges) {
    ends.set(edge.id, edge.vertexIds)
    for (const vertexId of edge.vertexIds) {
      const list = meeting.get(vertexId)
      if (list) list.push(edge.id)
      else meeting.set(vertexId, [edge.id])
    }
  }

  const walked = new Set<string>()
  const loops: BoundaryLoop[] = []

  for (const seed of edges) {
    if (walked.has(seed.id)) continue
    const loop = walkLoop(seed.id, ends, meeting, walked)
    if (!loop) {
      return {
        status: 'unavailable',
        reason: `The boundary of face ${face.id} does not close into a loop`,
      }
    }
    const points = loop.map((vertexId) => positions.get(vertexId)).filter(isVec3)
    if (points.length !== loop.length) {
      return {
        status: 'unavailable',
        reason: `The boundary of face ${face.id} names a vertex the mesh does not hold`,
      }
    }
    if (points.length >= 3) loops.push(points)
  }

  if (loops.length === 0) {
    return {
      status: 'unavailable',
      reason: `Face ${face.id} has no closed boundary loop to project`,
    }
  }
  return { status: 'ok', loops }
}

/**
 * Walks one closed loop from a starting edge, marking every edge it uses.
 *
 * Returns the loop's vertices in order, or null when the walk runs into a dead
 * end or a junction — either of which means these edges do not describe a simple
 * boundary and nothing honest can be projected from them.
 */
function walkLoop(
  seedId: string,
  ends: ReadonlyMap<string, readonly [string, string]>,
  meeting: ReadonlyMap<string, readonly string[]>,
  walked: Set<string>,
): string[] | null {
  const seed = ends.get(seedId)
  if (!seed) return null

  const start = seed[0]
  const vertices: string[] = [start]
  let currentEdge = seedId
  let current = seed[1]
  walked.add(seedId)

  while (current !== start) {
    vertices.push(current)
    const candidates = (meeting.get(current) ?? []).filter(
      (edgeId) => edgeId !== currentEdge && !walked.has(edgeId),
    )
    // Exactly one way on. Zero is a dead end; more than one is a vertex where
    // three boundary edges meet, and choosing between them would be a guess.
    if (candidates.length !== 1) return null
    const nextId = candidates[0] as string
    const next = ends.get(nextId)
    if (!next) return null
    walked.add(nextId)
    currentEdge = nextId
    current = next[0] === current ? next[1] : next[0]
  }

  return vertices
}

function isVec3(value: Vec3 | undefined): value is Vec3 {
  return value !== undefined
}

/** A world-space point in the sketch plane's own 2D coordinates. */
export function toSketchPoint(frame: PlaneFrame, point: Vec3): Vec2 {
  const dx = point.x - frame.origin.x
  const dy = point.y - frame.origin.y
  const dz = point.z - frame.origin.z
  return {
    x: dx * frame.xAxis.x + dy * frame.xAxis.y + dz * frame.xAxis.z,
    y: dx * frame.yAxis.x + dy * frame.yAxis.y + dz * frame.yAxis.z,
  }
}

export type ProjectionResult =
  | {
      readonly status: 'ok'
      /** The construction entities added, outermost loop first. */
      readonly entityIds: readonly string[]
    }
  | { readonly status: 'unavailable'; readonly reason: string }

/**
 * Adds the support face's boundary to a sketch as construction geometry.
 *
 * Construction is the whole point of the flag here, not decoration: profile
 * extraction already ignores construction entities, so the projected outline can
 * never be mistaken for something to extrude. It is serialised with the sketch
 * like any other entity, so the outline is there again when the file is
 * reopened, and it can be selected, dimensioned and snapped to.
 */
export function projectFaceBoundary(
  sketch: SketchModel,
  mesh: MeshData,
  faceId: string,
  frame: PlaneFrame,
): ProjectionResult {
  const boundary = faceBoundaryLoops(mesh, faceId)
  if (boundary.status !== 'ok') return boundary

  const entityIds: string[] = []
  // Largest first, so the outer boundary is the first thing in the sketch and a
  // hole in the face reads as nested inside it.
  const ordered = [...boundary.loops]
    .map((loop) => loop.map((point) => toSketchPoint(frame, point)))
    .map((loop) => weld(loop))
    .filter((loop) => loop.length >= 3)
    .sort((a, b) => Math.abs(loopArea(b)) - Math.abs(loopArea(a)))

  if (ordered.length === 0) {
    return {
      status: 'unavailable',
      reason: 'The support face collapses to nothing in the sketch plane',
    }
  }

  for (const loop of ordered) {
    entityIds.push(buildPolygon(sketch, loop, { isConstruction: true, closed: true }).id)
  }
  return { status: 'ok', entityIds }
}

/** Drops consecutive duplicates, including the wrap from the last point to the first. */
function weld(points: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = []
  for (const point of points) {
    const previous = result[result.length - 1]
    if (previous && samePoint(previous, point)) continue
    result.push({ x: point.x, y: point.y })
  }
  const first = result[0]
  const last = result[result.length - 1]
  if (result.length > 1 && first && last && samePoint(first, last)) result.pop()
  return result
}

function samePoint(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) < WELD_TOLERANCE && Math.abs(a.y - b.y) < WELD_TOLERANCE
}

function loopArea(loop: readonly Vec2[]): number {
  let total = 0
  for (let index = 0; index < loop.length; index += 1) {
    const a = loop[index] as Vec2
    const b = loop[(index + 1) % loop.length] as Vec2
    total += a.x * b.y - b.x * a.y
  }
  return total / 2
}
