import type { MeshData, MeshPoint } from '../domain/MeshData'
import { faceNormal, positionAt, triangleCount } from '../domain/MeshData'
import type { Vec2 } from '../sketch/domain/geometry'

/**
 * Turning a solid into the line work an orthographic drawing view shows.
 *
 * A tessellated body has no edges of its own, so they are recovered from the
 * triangles: corners are welded by position, triangles are grouped by the edge
 * they share, and an edge is drawn when it is either open (only one face uses
 * it), a silhouette for this view (its two faces face opposite ways), or sharp
 * (its two faces meet at a real corner rather than across a tessellated curve).
 * That last rule is what keeps a cylinder's seam out of the drawing while
 * keeping a chamfer's edge in it.
 */

export type ViewName = 'front' | 'top' | 'right'

export interface ViewAxes {
  readonly name: ViewName
  readonly label: string
  /** The direction the viewer looks along. */
  readonly direction: MeshPoint
  /** Model direction that lands on +x of the drawing. */
  readonly right: MeshPoint
  /** Model direction that lands on +y of the drawing. */
  readonly up: MeshPoint
  /** Axis letters for the two dimensions of this view. */
  readonly axisLabels: readonly [string, string]
}

/** Third-angle projection: front from -Y, top from +Z, right from +X. */
export const ORTHO_VIEWS: readonly ViewAxes[] = [
  {
    name: 'front',
    label: 'FRONT',
    direction: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 },
    axisLabels: ['X', 'Z'],
  },
  {
    name: 'top',
    label: 'TOP',
    direction: { x: 0, y: 0, z: -1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    axisLabels: ['X', 'Y'],
  },
  {
    name: 'right',
    label: 'RIGHT',
    direction: { x: -1, y: 0, z: 0 },
    right: { x: 0, y: 1, z: 0 },
    up: { x: 0, y: 0, z: 1 },
    axisLabels: ['Y', 'Z'],
  },
]

export function viewByName(name: ViewName): ViewAxes {
  const view = ORTHO_VIEWS.find((candidate) => candidate.name === name)
  // The type makes this unreachable; the throw keeps the return type narrow.
  if (!view) throw new Error(`Unknown view "${name}"`)
  return view
}

export interface DrawingSegment {
  readonly a: Vec2
  readonly b: Vec2
}

export interface DrawingBounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export interface EdgeOptions {
  /** Positions within this distance are the same corner. */
  readonly weldTolerance?: number
  /** Faces meeting at more than this angle, in degrees, make a drawn edge. */
  readonly sharpAngle?: number
}

const DEFAULT_WELD_TOLERANCE = 1e-6
const DEFAULT_SHARP_ANGLE = 20

export interface MeshEdge {
  readonly a: number
  readonly b: number
  /** One entry per triangle that uses this edge. */
  readonly normals: MeshPoint[]
}

export interface MeshEdgeGraph {
  /** Welded corner positions, indexed by the ids the edges refer to. */
  readonly vertices: readonly MeshPoint[]
  readonly edges: readonly MeshEdge[]
}

/** Every unique edge of the mesh with the normals of the faces that share it. */
export function meshEdges(mesh: MeshData, options: EdgeOptions = {}): MeshEdgeGraph {
  const tolerance = options.weldTolerance ?? DEFAULT_WELD_TOLERANCE
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

/** Whether this edge belongs in the view: open, silhouette or sharp. */
export function isDrawnEdge(
  normals: readonly MeshPoint[],
  direction: MeshPoint,
  sharpAngle: number,
): boolean {
  if (normals.length !== 2) return true

  const [first, second] = normals as [MeshPoint, MeshPoint]
  const toward = dot(first, direction)
  const away = dot(second, direction)
  // Opposite signs (or one exactly edge-on) put the edge on the outline.
  if (toward * away <= 0) return true

  const cosine = Math.min(Math.max(dot(first, second), -1), 1)
  return Math.acos(cosine) > (sharpAngle * Math.PI) / 180
}

/** The drawn edges of `mesh`, projected into the view's 2D frame. */
export function viewSegments(
  mesh: MeshData,
  view: ViewAxes,
  options: EdgeOptions = {},
): DrawingSegment[] {
  const sharpAngle = options.sharpAngle ?? DEFAULT_SHARP_ANGLE
  const tolerance = options.weldTolerance ?? DEFAULT_WELD_TOLERANCE
  const { vertices, edges } = meshEdges(mesh, options)

  const segments: DrawingSegment[] = []
  const emitted = new Set<string>()

  for (const edge of edges) {
    if (!isDrawnEdge(edge.normals, view.direction, sharpAngle)) continue
    const from = vertices[edge.a]
    const to = vertices[edge.b]
    if (!from || !to) continue

    const a = project(from, view)
    const b = project(to, view)
    // An edge parallel to the line of sight collapses to a point on paper.
    if (Math.hypot(b.x - a.x, b.y - a.y) <= tolerance) continue

    const key = segmentKey(a, b)
    if (emitted.has(key)) continue
    emitted.add(key)
    segments.push({ a, b })
  }
  return segments
}

export function project(point: MeshPoint, view: ViewAxes): Vec2 {
  return { x: dot(point, view.right), y: dot(point, view.up) }
}

export function segmentBounds(segments: readonly DrawingSegment[]): DrawingBounds {
  if (segments.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const segment of segments) {
    for (const point of [segment.a, segment.b]) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }
  return { minX, minY, maxX, maxY }
}

function dot(a: MeshPoint, b: MeshPoint): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/** Direction-independent key, so A→B and B→A are drawn once. */
function segmentKey(a: Vec2, b: Vec2): string {
  const round = (value: number): string => value.toFixed(6)
  const first = `${round(a.x)},${round(a.y)}`
  const second = `${round(b.x)},${round(b.y)}`
  return first < second ? `${first}|${second}` : `${second}|${first}`
}
