import type { MeshData, MeshPoint } from '../../domain/MeshData'
import { faceNormal, positionAt, triangleCount } from '../../domain/MeshData'
import type { Vec2 } from '../../sketch/domain/geometry'
import type { Bounds2, Segment2 } from './geometry2d'
import { EMPTY_BOUNDS, boundsOf, pointOnSegment, segmentLength } from './geometry2d'
import type { ProjectionFrame } from './viewAxes'
import { depthOf, dot, projectPoint } from './viewAxes'

/**
 * Turning a solid into the line work a drawing view shows.
 *
 * A tessellated body has no edges of its own, so they are recovered from the
 * triangles: corners are welded by position, triangles are grouped by the edge
 * they share, and an edge is kept when it is open, a silhouette for this view,
 * or sharp. Smooth edges that are neither become tangent edges, which a drawing
 * usually leaves off.
 *
 * Hidden line removal is exact rather than sampled. Each candidate edge is cut
 * at every point where it crosses a projected triangle's outline; the resulting
 * pieces are wholly in front of or wholly behind the model, so classifying the
 * midpoint of a piece classifies all of it. Pieces that come out the same way
 * are then welded back together, which is why a box's silhouette comes back as
 * four segments and not forty.
 */

export type EdgeClass = 'outline' | 'silhouette' | 'sharp' | 'tangent' | 'smooth'

export interface ViewGeometry {
  /** Edges in front of the model. */
  readonly visible: readonly Segment2[]
  /** Edges behind it, for the dashed layer. */
  readonly hidden: readonly Segment2[]
  /** Smooth blends, for the layer most drawings turn off. */
  readonly tangent: readonly Segment2[]
  readonly bounds: Bounds2
  /**
   * True when the mesh was too heavy for hidden line removal and everything was
   * reported visible. The view still draws; it just draws optimistically.
   */
  readonly approximated: boolean
}

export const EMPTY_VIEW_GEOMETRY: ViewGeometry = {
  visible: [],
  hidden: [],
  tangent: [],
  bounds: EMPTY_BOUNDS,
  approximated: false,
}

export interface ViewGeometryOptions {
  /** Positions within this distance are the same corner. */
  readonly weldTolerance?: number
  /** Faces meeting at more than this angle, in degrees, make a drawn edge. */
  readonly sharpAngle?: number
  /** Faces meeting at less than this angle, in degrees, are one surface. */
  readonly tangentAngle?: number
  /** Compute the dashed layer. Off is markedly faster. */
  readonly hiddenLines?: boolean
  /** Compute the tangent layer. */
  readonly tangentEdges?: boolean
  /** Above this many triangles, hidden line removal is skipped. */
  readonly maxTrianglesForHiddenLines?: number
}

const DEFAULTS = {
  weldTolerance: 1e-6,
  sharpAngle: 20,
  tangentAngle: 0.5,
  hiddenLines: true,
  tangentEdges: true,
  maxTrianglesForHiddenLines: 40_000,
} as const

/** Most splits one edge is cut into before it falls back to even sampling. */
const MAX_SPLITS = 256

export interface MeshEdge {
  readonly a: number
  readonly b: number
  /** One entry per triangle that uses this edge. */
  readonly normals: MeshPoint[]
}

export interface MeshEdgeGraph {
  readonly vertices: readonly MeshPoint[]
  readonly edges: readonly MeshEdge[]
}

/** Every unique edge of the mesh with the normals of the faces that share it. */
export function meshEdges(mesh: MeshData, weldTolerance = DEFAULTS.weldTolerance): MeshEdgeGraph {
  const tolerance = weldTolerance > 0 ? weldTolerance : DEFAULTS.weldTolerance
  const vertexIds = new Map<string, number>()
  const vertices: MeshPoint[] = []

  const idOf = (point: MeshPoint): number => {
    const snap = (value: number): number => {
      const rounded = Math.round(value / tolerance) * tolerance
      return rounded === 0 ? 0 : rounded
    }
    const key = `${snap(point.x)},${snap(point.y)},${snap(point.z)}`
    const existing = vertexIds.get(key)
    if (existing !== undefined) return existing
    const id = vertices.length
    vertexIds.set(key, id)
    vertices.push(point)
    return id
  }

  const edges = new Map<string, MeshEdge>()
  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const corners = [0, 1, 2].map((corner) =>
      positionAt(mesh, mesh.indices[triangle * 3 + corner] ?? 0),
    ) as [MeshPoint, MeshPoint, MeshPoint]
    const ids = corners.map(idOf) as [number, number, number]
    const normal = faceNormal(corners[0], corners[1], corners[2])

    for (let corner = 0; corner < 3; corner += 1) {
      const from = ids[corner] as number
      const to = ids[(corner + 1) % 3] as number
      if (from === to) continue
      const key = from < to ? `${from}:${to}` : `${to}:${from}`
      const existing = edges.get(key)
      if (existing) existing.normals.push(normal)
      else edges.set(key, { a: Math.min(from, to), b: Math.max(from, to), normals: [normal] })
    }
  }
  return { vertices, edges: [...edges.values()] }
}

/**
 * What kind of edge this is for the given line of sight. Open edges and
 * silhouettes always draw; the rest is decided by how sharply the two faces
 * meet.
 */
export function classifyEdge(
  normals: readonly MeshPoint[],
  direction: MeshPoint,
  sharpAngle: number,
  tangentAngle: number,
): EdgeClass {
  if (normals.length !== 2) return 'outline'

  const [first, second] = normals as [MeshPoint, MeshPoint]
  const toward = dot(first, direction)
  const away = dot(second, direction)
  // Opposite signs (or one exactly edge-on) put the edge on the outline.
  if (toward * away <= 0) return 'silhouette'

  const cosine = Math.min(Math.max(dot(first, second), -1), 1)
  const angle = (Math.acos(cosine) * 180) / Math.PI
  if (angle > sharpAngle) return 'sharp'
  return angle > tangentAngle ? 'tangent' : 'smooth'
}

interface ProjectedTriangle {
  readonly a: Vec2
  readonly b: Vec2
  readonly c: Vec2
  readonly da: number
  readonly db: number
  readonly dc: number
  readonly bounds: Bounds2
  /** Twice the signed area; zero when the triangle is edge-on to the viewer. */
  readonly area2: number
}

/** The drawn edges of `mesh` seen through `frame`, split into layers. */
export function generateViewGeometry(
  mesh: MeshData,
  frame: ProjectionFrame,
  options: ViewGeometryOptions = {},
): ViewGeometry {
  const sharpAngle = options.sharpAngle ?? DEFAULTS.sharpAngle
  const tangentAngle = options.tangentAngle ?? DEFAULTS.tangentAngle
  const wantHidden = options.hiddenLines ?? DEFAULTS.hiddenLines
  const wantTangent = options.tangentEdges ?? DEFAULTS.tangentEdges
  const maxTriangles = options.maxTrianglesForHiddenLines ?? DEFAULTS.maxTrianglesForHiddenLines
  const weldTolerance = options.weldTolerance ?? DEFAULTS.weldTolerance

  if (triangleCount(mesh) === 0) return EMPTY_VIEW_GEOMETRY

  const { vertices, edges } = meshEdges(mesh, weldTolerance)

  interface Candidate {
    readonly segment: Segment2
    readonly depthA: number
    readonly depthB: number
    readonly tangent: boolean
  }

  const candidates: Candidate[] = []
  const seen = new Set<string>()
  for (const edge of edges) {
    const kind = classifyEdge(edge.normals, frame.direction, sharpAngle, tangentAngle)
    if (kind === 'smooth') continue
    if (kind === 'tangent' && !wantTangent) continue

    const from = vertices[edge.a]
    const to = vertices[edge.b]
    if (!from || !to) continue

    const segment = { a: projectPoint(from, frame), b: projectPoint(to, frame) }
    // An edge parallel to the line of sight collapses to a point on paper.
    if (segmentLength(segment) <= weldTolerance) continue

    const key = segmentKey(segment)
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({
      segment,
      depthA: depthOf(from, frame),
      depthB: depthOf(to, frame),
      tangent: kind === 'tangent',
    })
  }

  if (candidates.length === 0) return EMPTY_VIEW_GEOMETRY

  const triangles = projectTriangles(mesh, frame)
  const skipHidden = triangles.length === 0 || triangles.length > maxTriangles

  if (skipHidden) {
    const visible = candidates.filter((candidate) => !candidate.tangent).map((c) => c.segment)
    const tangent = candidates.filter((candidate) => candidate.tangent).map((c) => c.segment)
    return {
      visible,
      hidden: [],
      tangent,
      bounds: boundsOf([...visible, ...tangent]),
      approximated: triangles.length > maxTriangles,
    }
  }

  const grid = new TriangleGrid(triangles)
  const scale = modelScale(triangles)
  const depthTolerance = Math.max(scale * 1e-7, 1e-12)

  const visible: Segment2[] = []
  const hidden: Segment2[] = []
  const tangent: Segment2[] = []

  for (const candidate of candidates) {
    const pieces = splitByVisibility(candidate.segment, candidate.depthA, candidate.depthB, grid, depthTolerance)
    for (const piece of pieces) {
      if (piece.visible) (candidate.tangent ? tangent : visible).push(piece.segment)
      // A hidden tangent edge is noise: the blend is behind the part and no
      // drawing convention asks for it dashed.
      else if (wantHidden && !candidate.tangent) hidden.push(piece.segment)
    }
  }

  const solidVisible = mergeCollinear(visible)
  const trimmedHidden = wantHidden
    ? mergeCollinear(removeCoincident(hidden, solidVisible, Math.max(scale * 1e-6, 1e-9)))
    : []
  const solidTangent = mergeCollinear(tangent)

  return {
    visible: solidVisible,
    hidden: trimmedHidden,
    tangent: solidTangent,
    bounds: boundsOf([...solidVisible, ...trimmedHidden, ...solidTangent]),
    approximated: false,
  }
}

function projectTriangles(mesh: MeshData, frame: ProjectionFrame): ProjectedTriangle[] {
  const triangles: ProjectedTriangle[] = []
  for (let index = 0; index < triangleCount(mesh); index += 1) {
    const corners = [0, 1, 2].map((corner) =>
      positionAt(mesh, mesh.indices[index * 3 + corner] ?? 0),
    ) as [MeshPoint, MeshPoint, MeshPoint]
    const a = projectPoint(corners[0], frame)
    const b = projectPoint(corners[1], frame)
    const c = projectPoint(corners[2], frame)
    const area2 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    // Edge-on triangles cover no area and cannot hide anything.
    if (area2 === 0) continue
    triangles.push({
      a,
      b,
      c,
      da: depthOf(corners[0], frame),
      db: depthOf(corners[1], frame),
      dc: depthOf(corners[2], frame),
      bounds: {
        minX: Math.min(a.x, b.x, c.x),
        minY: Math.min(a.y, b.y, c.y),
        maxX: Math.max(a.x, b.x, c.x),
        maxY: Math.max(a.y, b.y, c.y),
      },
      area2,
    })
  }
  return triangles
}

/** A uniform bucket grid over the projected triangles, for occlusion lookups. */
class TriangleGrid {
  readonly #triangles: readonly ProjectedTriangle[]
  readonly #cells: Map<string, number[]>
  readonly #cellSize: number
  readonly #origin: Vec2

  constructor(triangles: readonly ProjectedTriangle[]) {
    this.#triangles = triangles
    this.#cells = new Map()

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const triangle of triangles) {
      minX = Math.min(minX, triangle.bounds.minX)
      minY = Math.min(minY, triangle.bounds.minY)
      maxX = Math.max(maxX, triangle.bounds.maxX)
      maxY = Math.max(maxY, triangle.bounds.maxY)
    }
    this.#origin = { x: minX, y: minY }

    // Roughly one triangle per cell, capped so a huge mesh cannot allocate a
    // grid bigger than the mesh itself.
    const span = Math.max(maxX - minX, maxY - minY, 1e-9)
    const divisions = Math.min(Math.max(Math.ceil(Math.sqrt(triangles.length)), 1), 256)
    this.#cellSize = span / divisions

    triangles.forEach((triangle, index) => {
      for (const key of this.#keysFor(triangle.bounds)) {
        const bucket = this.#cells.get(key)
        if (bucket) bucket.push(index)
        else this.#cells.set(key, [index])
      }
    })
  }

  /** Every triangle whose box meets `bounds`, each returned once. */
  query(bounds: Bounds2): ProjectedTriangle[] {
    const found = new Set<number>()
    for (const key of this.#keysFor(bounds)) {
      for (const index of this.#cells.get(key) ?? []) found.add(index)
    }
    const result: ProjectedTriangle[] = []
    for (const index of found) result.push(this.#triangles[index] as ProjectedTriangle)
    return result
  }

  *#keysFor(bounds: Bounds2): Generator<string> {
    const minColumn = Math.floor((bounds.minX - this.#origin.x) / this.#cellSize)
    const maxColumn = Math.floor((bounds.maxX - this.#origin.x) / this.#cellSize)
    const minRow = Math.floor((bounds.minY - this.#origin.y) / this.#cellSize)
    const maxRow = Math.floor((bounds.maxY - this.#origin.y) / this.#cellSize)
    // A degenerate grid would iterate forever; the constructor's floor on
    // cellSize keeps these counts finite.
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (let row = minRow; row <= maxRow; row += 1) yield `${column}:${row}`
    }
  }
}

interface VisibilityPiece {
  readonly segment: Segment2
  readonly visible: boolean
}

/**
 * Cuts one edge where it crosses any projected triangle outline, then decides
 * each piece by its midpoint. Splitting first is what makes the answer exact:
 * within a piece no triangle boundary is crossed, so its visibility cannot
 * change halfway along.
 */
function splitByVisibility(
  segment: Segment2,
  depthA: number,
  depthB: number,
  grid: TriangleGrid,
  depthTolerance: number,
): VisibilityPiece[] {
  const box = {
    minX: Math.min(segment.a.x, segment.b.x),
    minY: Math.min(segment.a.y, segment.b.y),
    maxX: Math.max(segment.a.x, segment.b.x),
    maxY: Math.max(segment.a.y, segment.b.y),
  }
  const candidates = grid.query(box)

  const cuts = new Set<number>([0, 1])
  for (const triangle of candidates) {
    for (const edge of [
      { a: triangle.a, b: triangle.b },
      { a: triangle.b, b: triangle.c },
      { a: triangle.c, b: triangle.a },
    ]) {
      const t = crossingParameter(segment, edge)
      if (t !== null && t > 0 && t < 1) cuts.add(t)
    }
    if (cuts.size > MAX_SPLITS) break
  }

  const parameters =
    cuts.size > MAX_SPLITS
      ? // Pathological edge: fall back to even sampling rather than choking.
        Array.from({ length: MAX_SPLITS + 1 }, (_, index) => index / MAX_SPLITS)
      : [...cuts].sort((first, second) => first - second)

  const pieces: VisibilityPiece[] = []
  for (let index = 0; index + 1 < parameters.length; index += 1) {
    const from = parameters[index] as number
    const to = parameters[index + 1] as number
    if (to - from < 1e-12) continue

    const middle = (from + to) / 2
    const point = pointOnSegment(segment, middle)
    const depth = depthA + (depthB - depthA) * middle
    const visible = !isOccluded(point, depth, candidates, depthTolerance)

    const previous = pieces[pieces.length - 1]
    const piece = { segment: { a: pointOnSegment(segment, from), b: pointOnSegment(segment, to) }, visible }
    // Weld runs of the same answer as we go, so a hundred cuts across one face
    // come back as one segment.
    if (previous && previous.visible === visible) {
      pieces[pieces.length - 1] = { segment: { a: previous.segment.a, b: piece.segment.b }, visible }
    } else {
      pieces.push(piece)
    }
  }
  return pieces
}

/** Where a segment crosses another, as a parameter along the first. */
function crossingParameter(segment: Segment2, other: Segment2): number | null {
  const r = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y }
  const s = { x: other.b.x - other.a.x, y: other.b.y - other.a.y }
  const denominator = r.x * s.y - r.y * s.x
  if (denominator === 0) return null

  const qp = { x: other.a.x - segment.a.x, y: other.a.y - segment.a.y }
  const t = (qp.x * s.y - qp.y * s.x) / denominator
  const u = (qp.x * r.y - qp.y * r.x) / denominator
  if (u < 0 || u > 1) return null
  return t
}

/** Whether any triangle covers this point and sits nearer the eye than it. */
function isOccluded(
  point: Vec2,
  depth: number,
  triangles: readonly ProjectedTriangle[],
  depthTolerance: number,
): boolean {
  for (const triangle of triangles) {
    if (
      point.x < triangle.bounds.minX ||
      point.x > triangle.bounds.maxX ||
      point.y < triangle.bounds.minY ||
      point.y > triangle.bounds.maxY
    ) {
      continue
    }
    const covering = depthAt(triangle, point)
    if (covering === null) continue
    if (covering < depth - depthTolerance) return true
  }
  return false
}

/**
 * Depth of the triangle's surface under `point`, or null when the point is
 * outside it. The boundary counts as inside so that an edge lying exactly on a
 * face — which every silhouette does — is measured against that face rather
 * than escaping the test.
 */
function depthAt(triangle: ProjectedTriangle, point: Vec2): number | null {
  const { a, b, c, area2 } = triangle
  const w0 = ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)) / area2
  const w1 = ((c.x - b.x) * (point.y - b.y) - (c.y - b.y) * (point.x - b.x)) / area2
  const w2 = ((a.x - c.x) * (point.y - c.y) - (a.y - c.y) * (point.x - c.x)) / area2
  const tolerance = 1e-9
  if (w0 < -tolerance || w1 < -tolerance || w2 < -tolerance) return null
  // w1 belongs to vertex a, w2 to b and w0 to c — the usual barycentric shuffle.
  return triangle.da * w1 + triangle.db * w2 + triangle.dc * w0
}

/** Longest side of the projected model, used to size the tolerances. */
function modelScale(triangles: readonly ProjectedTriangle[]): number {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let minDepth = Infinity
  let maxDepth = -Infinity
  for (const triangle of triangles) {
    minX = Math.min(minX, triangle.bounds.minX)
    minY = Math.min(minY, triangle.bounds.minY)
    maxX = Math.max(maxX, triangle.bounds.maxX)
    maxY = Math.max(maxY, triangle.bounds.maxY)
    minDepth = Math.min(minDepth, triangle.da, triangle.db, triangle.dc)
    maxDepth = Math.max(maxDepth, triangle.da, triangle.db, triangle.dc)
  }
  const span = Math.max(maxX - minX, maxY - minY, maxDepth - minDepth)
  return Number.isFinite(span) && span > 0 ? span : 1
}

/**
 * Joins segments that carry on in the same direction from where the last one
 * stopped. Hidden line removal produces these in droves; a drawing should not.
 */
export function mergeCollinear(segments: readonly Segment2[], tolerance = 1e-9): Segment2[] {
  const merged: Segment2[] = []
  for (const segment of segments) {
    const previous = merged[merged.length - 1]
    if (previous && continues(previous, segment, tolerance)) {
      merged[merged.length - 1] = { a: previous.a, b: segment.b }
      continue
    }
    merged.push(segment)
  }
  return merged
}

function continues(first: Segment2, second: Segment2, tolerance: number): boolean {
  const gap = Math.hypot(second.a.x - first.b.x, second.a.y - first.b.y)
  if (gap > tolerance) return false
  const u = { x: first.b.x - first.a.x, y: first.b.y - first.a.y }
  const v = { x: second.b.x - second.a.x, y: second.b.y - second.a.y }
  const cross = u.x * v.y - u.y * v.x
  const scale = Math.max(Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y), 1e-12)
  return Math.abs(cross) / scale < 1e-9
}

/**
 * Drops the parts of hidden edges that a visible edge already covers. A closed
 * solid always has its far outline landing exactly on its near one, and a
 * dashed line peeking out from under a solid one is a drafting error.
 */
export function removeCoincident(
  hidden: readonly Segment2[],
  visible: readonly Segment2[],
  tolerance: number,
): Segment2[] {
  if (visible.length === 0) return [...hidden]

  const kept: Segment2[] = []
  for (const segment of hidden) {
    const length = segmentLength(segment)
    if (length <= tolerance) continue

    const direction = { x: (segment.b.x - segment.a.x) / length, y: (segment.b.y - segment.a.y) / length }
    // Intervals along this segment that a collinear visible segment covers.
    const covered: [number, number][] = []
    for (const other of visible) {
      if (!isCollinear(segment, other, direction, tolerance)) continue
      const from = project1d(segment.a, direction, other.a)
      const to = project1d(segment.a, direction, other.b)
      const low = Math.max(Math.min(from, to), 0)
      const high = Math.min(Math.max(from, to), length)
      if (high > low) covered.push([low, high])
    }
    if (covered.length === 0) {
      kept.push(segment)
      continue
    }

    covered.sort((first, second) => first[0] - second[0])
    let cursor = 0
    for (const [low, high] of covered) {
      if (low > cursor + tolerance) {
        kept.push({
          a: pointOnSegment(segment, cursor / length),
          b: pointOnSegment(segment, low / length),
        })
      }
      cursor = Math.max(cursor, high)
    }
    if (cursor < length - tolerance) {
      kept.push({ a: pointOnSegment(segment, cursor / length), b: segment.b })
    }
  }
  return kept
}

function isCollinear(segment: Segment2, other: Segment2, direction: Vec2, tolerance: number): boolean {
  for (const point of [other.a, other.b]) {
    const dx = point.x - segment.a.x
    const dy = point.y - segment.a.y
    // Distance from the infinite line through `segment`.
    if (Math.abs(dx * direction.y - dy * direction.x) > tolerance) return false
  }
  return true
}

function project1d(origin: Vec2, direction: Vec2, point: Vec2): number {
  return (point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y
}

/** Direction-independent key, so A→B and B→A are drawn once. */
function segmentKey(segment: Segment2): string {
  const round = (value: number): string => value.toFixed(6)
  const first = `${round(segment.a.x)},${round(segment.a.y)}`
  const second = `${round(segment.b.x)},${round(segment.b.y)}`
  return first < second ? `${first}|${second}` : `${second}|${first}`
}
