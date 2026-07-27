import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import {
  add,
  cross,
  distance,
  dot,
  length,
  normalize,
  perpendicular,
  scale,
  subtract,
} from '../domain/vec3'
import type { MeshTopology, TopologyFace } from '../kernel/topology'

/**
 * The measurements feature recognition is built on.
 *
 * The kernel's {@link meshTopology} says which triangles belong to the same
 * face; what recognition needs on top of that is the shape of each face — its
 * area, its centroid, and above all its boundary as an ordered loop, because a
 * loop is what becomes a sketch profile once a feature has been identified.
 */

export interface Vec2 {
  readonly x: number
  readonly y: number
}

/** A plane with an in-plane basis, so 3D points can be flattened to 2D. */
export interface Frame {
  readonly origin: Vec3
  readonly normal: Vec3
  readonly xAxis: Vec3
  readonly yAxis: Vec3
}

export interface FaceInfo {
  readonly id: string
  readonly normal: Vec3
  /** Distance from the origin to the face's plane, along `normal`. */
  readonly offset: number
  readonly area: number
  readonly centroid: Vec3
  /** The face's outer boundary, ordered, in world space. */
  readonly loop: readonly Vec3[]
  /** Inner boundaries — an opening through the face, e.g. where a hole exits. */
  readonly holes: readonly (readonly Vec3[])[]
  /** Every welded vertex position the face is built from. */
  readonly points: readonly Vec3[]
  readonly vertexIds: readonly string[]
}

/** Everything the recognizer needs to know about one body, worked out once. */
export interface BodyAnalysis {
  readonly mesh: MeshData
  readonly topology: MeshTopology
  readonly faces: readonly FaceInfo[]
  readonly byId: ReadonlyMap<string, FaceInfo>
  /** Face ids sharing an edge, per face. */
  readonly neighbours: ReadonlyMap<string, readonly string[]>
  readonly bounds: { readonly min: Vec3; readonly max: Vec3 }
  /** Longest side of the bounding box — the scale everything is judged against. */
  readonly scale: number
}

export function analyseBody(mesh: MeshData, topology: MeshTopology): BodyAnalysis {
  const index = indexVertices(topology)
  const faces = topology.faces.map((face) => describeFace(mesh, topology, index, face))
  const byId = new Map(faces.map((face) => [face.id, face]))
  const bounds = pointBounds(faces.flatMap((face) => [...face.points]))

  return {
    mesh,
    topology,
    faces,
    byId,
    neighbours: faceNeighbours(topology),
    bounds,
    scale: Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z,
      1e-9,
    ),
  }
}

/** Face ids that share at least one edge, per face. */
export function faceNeighbours(topology: MeshTopology): Map<string, string[]> {
  const neighbours = new Map<string, string[]>()
  for (const face of topology.faces) neighbours.set(face.id, [])

  for (const edge of topology.edges) {
    for (const a of edge.faceIds) {
      for (const b of edge.faceIds) {
        if (a === b) continue
        const list = neighbours.get(a)
        if (list && !list.includes(b)) list.push(b)
      }
    }
  }
  return neighbours
}

/** The edges two faces meet along. */
export function sharedEdges(topology: MeshTopology, a: string, b: string): string[] {
  return topology.edges
    .filter((edge) => edge.faceIds.includes(a) && edge.faceIds.includes(b))
    .map((edge) => edge.id)
}

/** Vertex lookups built once per body rather than once per face. */
interface VertexIndex {
  readonly positionOf: ReadonlyMap<string, Vec3>
  readonly ordinalOf: ReadonlyMap<string, number>
}

function indexVertices(topology: MeshTopology): VertexIndex {
  const positionOf = new Map<string, Vec3>()
  const ordinalOf = new Map<string, number>()
  topology.vertices.forEach((vertex, ordinal) => {
    positionOf.set(vertex.id, vertex.position)
    ordinalOf.set(vertex.id, ordinal)
  })
  return { positionOf, ordinalOf }
}

function describeFace(
  mesh: MeshData,
  topology: MeshTopology,
  index: VertexIndex,
  face: TopologyFace,
): FaceInfo {
  const points = face.vertexIds
    .map((id) => index.positionOf.get(id))
    .filter((point): point is Vec3 => point !== undefined)

  let area = 0
  let weighted: Vec3 = { x: 0, y: 0, z: 0 }
  const corners: [Vec3, Vec3, Vec3][] = []

  for (const start of face.triangles) {
    const triangle = [0, 1, 2].map((corner) =>
      vertexPosition(mesh, topology, index, mesh.indices[start + corner] as number),
    ) as [Vec3, Vec3, Vec3]
    corners.push(triangle)

    const triangleArea = length(cross(subtract(triangle[1], triangle[0]), subtract(triangle[2], triangle[0]))) / 2
    area += triangleArea
    weighted = add(
      weighted,
      scale(
        scale(add(add(triangle[0], triangle[1]), triangle[2]), 1 / 3),
        triangleArea,
      ),
    )
  }

  const loops = boundaryLoops(mesh, topology, face, index)
  const frame = frameOf(face.normal, points[0] ?? { x: 0, y: 0, z: 0 })
  // The outer boundary is the one enclosing the most area; the rest are holes.
  const ranked = loops
    .map((loop) => ({ loop, area: Math.abs(polygonArea(loop.map((point) => flatten(point, frame)))) }))
    .sort((a, b) => b.area - a.area)

  return {
    id: face.id,
    normal: face.normal,
    offset: face.offset,
    area,
    centroid: area > 0 ? scale(weighted, 1 / area) : averagePoint(points),
    loop: ranked[0]?.loop ?? [],
    holes: ranked.slice(1).map((entry) => entry.loop),
    points,
    vertexIds: face.vertexIds,
  }
}

function vertexPosition(
  mesh: MeshData,
  topology: MeshTopology,
  index: VertexIndex,
  vertex: number,
): Vec3 {
  const id = topology.vertexIdOf[vertex]
  const welded = id === undefined ? undefined : index.positionOf.get(id)
  if (welded) return welded
  return {
    x: mesh.positions[vertex * 3] ?? 0,
    y: mesh.positions[vertex * 3 + 1] ?? 0,
    z: mesh.positions[vertex * 3 + 2] ?? 0,
  }
}

/**
 * The face's boundary, as ordered loops of world points.
 *
 * A face is a patch of triangles; the sides that only one of those triangles
 * uses are its boundary, and chaining them head to tail recovers the loops. The
 * winding of the triangles carries through, so the outer loop comes back
 * counter-clockwise about the face normal and a hole comes back clockwise.
 */
export function boundaryLoops(
  mesh: MeshData,
  topology: MeshTopology,
  face: TopologyFace,
  index: VertexIndex = indexVertices(topology),
): Vec3[][] {
  const directed = new Set<string>()
  const sides: [number, number][] = []
  const ordinal = (vertex: number): number =>
    index.ordinalOf.get(topology.vertexIdOf[vertex] ?? '') ?? -1

  for (const start of face.triangles) {
    for (let corner = 0; corner < 3; corner += 1) {
      const from = ordinal(mesh.indices[start + corner] as number)
      const to = ordinal(mesh.indices[start + ((corner + 1) % 3)] as number)
      if (from === to) continue
      directed.add(`${from}:${to}`)
      sides.push([from, to])
    }
  }

  // A side shared by two triangles of this face appears in both directions; it
  // is an artefact of triangulation rather than an edge of the face.
  const next = new Map<number, number[]>()
  for (const [from, to] of sides) {
    if (directed.has(`${to}:${from}`)) continue
    const list = next.get(from)
    if (list) list.push(to)
    else next.set(from, [to])
  }

  const loops: Vec3[][] = []
  while (next.size > 0) {
    const startVertex = next.keys().next().value as number
    const chain: number[] = []
    let current = startVertex

    for (;;) {
      const outgoing = next.get(current)
      if (!outgoing || outgoing.length === 0) break
      const to = outgoing.shift() as number
      if (outgoing.length === 0) next.delete(current)
      chain.push(current)
      current = to
      if (current === startVertex) break
    }

    if (chain.length >= 3) {
      loops.push(chain.map((ordinal) => topology.vertices[ordinal]?.position ?? ORIGIN))
    }
  }

  return loops
}

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 }

function weldOrdinal(topology: MeshTopology, index: number): number {
  const id = topology.vertexIdOf[index]
  return topology.vertices.findIndex((vertex) => vertex.id === id)
}

/* ------------------------------------------------------------------ frames */

/** A plane through `origin` with `normal`, with an arbitrary but stable basis. */
export function frameOf(normal: Vec3, origin: Vec3): Frame {
  const unit = normalize(normal)
  const xAxis = perpendicular(unit)
  return { origin, normal: unit, xAxis, yAxis: cross(unit, xAxis) }
}

/** A 3D point in the frame's 2D coordinates. */
export function flatten(point: Vec3, frame: Frame): Vec2 {
  const local = subtract(point, frame.origin)
  return { x: dot(local, frame.xAxis), y: dot(local, frame.yAxis) }
}

/** The inverse of {@link flatten}. */
export function unflatten(point: Vec2, frame: Frame): Vec3 {
  return add(frame.origin, add(scale(frame.xAxis, point.x), scale(frame.yAxis, point.y)))
}

/** Signed area — positive when the loop winds counter-clockwise. */
export function polygonArea(points: readonly Vec2[]): number {
  let total = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as Vec2
    const next = points[(index + 1) % points.length] as Vec2
    total += current.x * next.y - next.x * current.y
  }
  return total / 2
}

export function polygonCentroid(points: readonly Vec2[]): Vec2 {
  const area = polygonArea(points)
  if (Math.abs(area) < 1e-12) return averagePoint2(points)

  let x = 0
  let y = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as Vec2
    const next = points[(index + 1) % points.length] as Vec2
    const step = current.x * next.y - next.x * current.y
    x += (current.x + next.x) * step
    y += (current.y + next.y) * step
  }
  return { x: x / (6 * area), y: y / (6 * area) }
}

function averagePoint2(points: readonly Vec2[]): Vec2 {
  if (points.length === 0) return { x: 0, y: 0 }
  let x = 0
  let y = 0
  for (const point of points) {
    x += point.x
    y += point.y
  }
  return { x: x / points.length, y: y / points.length }
}

export function averagePoint(points: readonly Vec3[]): Vec3 {
  if (points.length === 0) return ORIGIN
  let sum: Vec3 = ORIGIN
  for (const point of points) sum = add(sum, point)
  return scale(sum, 1 / points.length)
}

export function pointBounds(points: readonly Vec3[]): { min: Vec3; max: Vec3 } {
  if (points.length === 0) return { min: ORIGIN, max: ORIGIN }
  let min = points[0] as Vec3
  let max = points[0] as Vec3
  for (const point of points) {
    min = { x: Math.min(min.x, point.x), y: Math.min(min.y, point.y), z: Math.min(min.z, point.z) }
    max = { x: Math.max(max.x, point.x), y: Math.max(max.y, point.y), z: Math.max(max.z, point.z) }
  }
  return { min, max }
}

/* ------------------------------------------------------------------- axes */

/** Perpendicular distance from a point to the line through `origin` along `axis`. */
export function radialDistance(point: Vec3, origin: Vec3, axis: Vec3): number {
  const local = subtract(point, origin)
  return length(subtract(local, scale(axis, dot(local, axis))))
}

/** How far along the axis a point sits, measured from `origin`. */
export function axialPosition(point: Vec3, origin: Vec3, axis: Vec3): number {
  return dot(subtract(point, origin), axis)
}

/** The angle of a point about the axis, in degrees, in the frame's basis. */
export function angleAbout(point: Vec3, frame: Frame): number {
  const local = subtract(point, frame.origin)
  const degrees = (Math.atan2(dot(local, frame.yAxis), dot(local, frame.xAxis)) * 180) / Math.PI
  return degrees < 0 ? degrees + 360 : degrees
}

/**
 * The angular extent a set of directions covers, in degrees, and whether it
 * closes on itself. The largest gap between neighbouring angles is what decides
 * it: on a closed circle every gap is one tessellation step, and on an open
 * strip one gap is everything the strip does not cover.
 */
export function angularSpan(angles: readonly number[]): { readonly sweep: number; readonly closed: boolean } {
  if (angles.length < 2) return { sweep: 0, closed: false }

  const sorted = [...angles].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index] as number
    const next = index + 1 < sorted.length ? (sorted[index + 1] as number) : (sorted[0] as number) + 360
    gaps.push(next - current)
  }

  const largest = Math.max(...gaps)
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] as number
  // A closed loop has no gap noticeably wider than its tessellation step.
  const closed = largest <= Math.max(median * 2.5, 1e-6)
  return { sweep: closed ? 360 : 360 - largest, closed }
}

/** Mean and spread of a sample — used to judge "is this radius constant?". */
export function statistics(values: readonly number[]): {
  readonly mean: number
  readonly deviation: number
  readonly min: number
  readonly max: number
} {
  if (values.length === 0) return { mean: 0, deviation: 0, min: 0, max: 0 }
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length
  return {
    mean,
    deviation: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

/** Least-squares fit of `y = slope * x + intercept`. */
export function linearFit(
  xs: readonly number[],
  ys: readonly number[],
): { readonly slope: number; readonly intercept: number; readonly residual: number } {
  const count = Math.min(xs.length, ys.length)
  if (count < 2) return { slope: 0, intercept: ys[0] ?? 0, residual: 0 }

  let sumX = 0
  let sumY = 0
  for (let index = 0; index < count; index += 1) {
    sumX += xs[index] as number
    sumY += ys[index] as number
  }
  const meanX = sumX / count
  const meanY = sumY / count

  let covariance = 0
  let variance = 0
  for (let index = 0; index < count; index += 1) {
    const dx = (xs[index] as number) - meanX
    covariance += dx * ((ys[index] as number) - meanY)
    variance += dx * dx
  }

  const slope = variance === 0 ? 0 : covariance / variance
  const intercept = meanY - slope * meanX

  let residual = 0
  for (let index = 0; index < count; index += 1) {
    residual += ((ys[index] as number) - (slope * (xs[index] as number) + intercept)) ** 2
  }
  return { slope, intercept, residual: Math.sqrt(residual / count) }
}

/** Solves a 3×3 system by Cramer's rule, or null when it is singular. */
export function solve3(
  matrix: readonly [readonly number[], readonly number[], readonly number[]],
  rhs: readonly [number, number, number],
): [number, number, number] | null {
  const determinant = determinant3(matrix)
  if (Math.abs(determinant) < 1e-12) return null

  const column = (index: number): [readonly number[], readonly number[], readonly number[]] =>
    matrix.map((row, rowIndex) =>
      row.map((value, columnIndex) => (columnIndex === index ? (rhs[rowIndex] as number) : value)),
    ) as [readonly number[], readonly number[], readonly number[]]

  return [
    determinant3(column(0)) / determinant,
    determinant3(column(1)) / determinant,
    determinant3(column(2)) / determinant,
  ]
}

function determinant3(
  matrix: readonly [readonly number[], readonly number[], readonly number[]],
): number {
  const [a, b, c] = matrix
  const value = (row: readonly number[], index: number): number => row[index] as number
  return (
    value(a, 0) * (value(b, 1) * value(c, 2) - value(b, 2) * value(c, 1)) -
    value(a, 1) * (value(b, 0) * value(c, 2) - value(b, 2) * value(c, 0)) +
    value(a, 2) * (value(b, 0) * value(c, 1) - value(b, 1) * value(c, 0))
  )
}

/** Angle between two directions, in degrees. */
export function angleDegrees(a: Vec3, b: Vec3): number {
  const magnitude = length(a) * length(b)
  if (magnitude === 0) return 0
  const cosine = Math.min(1, Math.max(-1, dot(a, b) / magnitude))
  return (Math.acos(cosine) * 180) / Math.PI
}

/** Whether two directions point the same way, within `tolerance` degrees. */
export function isParallel(a: Vec3, b: Vec3, tolerance = 1): boolean {
  const angle = angleDegrees(a, b)
  return angle <= tolerance || angle >= 180 - tolerance
}

/** Whether two directions point opposite ways, within `tolerance` degrees. */
export function isAntiparallel(a: Vec3, b: Vec3, tolerance = 1): boolean {
  return angleDegrees(a, b) >= 180 - tolerance
}

export function isPerpendicular(a: Vec3, b: Vec3, tolerance = 1): boolean {
  return Math.abs(angleDegrees(a, b) - 90) <= tolerance
}

/** The perimeter of a loop of points. */
export function loopLength(points: readonly Vec3[]): number {
  let total = 0
  for (let index = 0; index < points.length; index += 1) {
    total += distance(points[index] as Vec3, points[(index + 1) % points.length] as Vec3)
  }
  return total
}
