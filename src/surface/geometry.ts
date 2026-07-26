import type { MeshData } from '../domain/MeshData'
import { positionAt, recomputeNormals, triangleAt } from '../domain/MeshData'
import type { Vec3 } from '../kernel/IKernel'
import type { Curve3, SurfacePlane } from './types'
import { SURFACE_TOLERANCE, SurfaceError } from './types'

/**
 * Vector, curve and mesh maths the surface operations are built from. Pure
 * functions on plain objects — the surface equivalent of `sketch/domain/geometry`.
 */

/* -------------------------------------------------------------------------- */
/* Vectors                                                                     */
/* -------------------------------------------------------------------------- */

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function addV(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function subV(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scaleV(a: Vec3, factor: number): Vec3 {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor }
}

export function dotV(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function crossV(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function lengthV(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z)
}

export function distanceV(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

/** Unit vector, or the zero vector when there is no direction to normalise. */
export function normalizeV(a: Vec3): Vec3 {
  const magnitude = lengthV(a)
  return magnitude < SURFACE_TOLERANCE ? { x: 0, y: 0, z: 0 } : scaleV(a, 1 / magnitude)
}

export function lerpV(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

export function sameV(a: Vec3, b: Vec3, tolerance = SURFACE_TOLERANCE): boolean {
  return distanceV(a, b) <= tolerance
}

/** A unit vector perpendicular to `axis`, biased towards `preferred`. */
export function perpendicularV(axis: Vec3, preferred: Vec3 = { x: 0, y: 0, z: 1 }): Vec3 {
  const unit = normalizeV(axis)
  let candidate = subV(preferred, scaleV(unit, dotV(preferred, unit)))
  if (lengthV(candidate) < 1e-6) {
    const fallback: Vec3 = Math.abs(unit.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }
    candidate = subV(fallback, scaleV(unit, dotV(fallback, unit)))
  }
  return normalizeV(candidate)
}

/** Rotates `point` about the line through `origin` along `axis`, by radians. */
export function rotateAboutAxis(point: Vec3, origin: Vec3, axis: Vec3, angle: number): Vec3 {
  const unit = normalizeV(axis)
  const offset = subV(point, origin)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const rotated = addV(
    addV(scaleV(offset, cosine), scaleV(crossV(unit, offset), sine)),
    scaleV(unit, dotV(unit, offset) * (1 - cosine)),
  )
  return addV(origin, rotated)
}

/* -------------------------------------------------------------------------- */
/* Curves                                                                     */
/* -------------------------------------------------------------------------- */

export function curveLength(curve: Curve3): number {
  let total = 0
  for (let index = 1; index < curve.length; index += 1) {
    total += distanceV(curve[index - 1] as Vec3, curve[index] as Vec3)
  }
  return total
}

/** Drops consecutive duplicates so no operation ever sees a zero-length segment. */
export function weldCurve(curve: Curve3, tolerance = SURFACE_TOLERANCE): Vec3[] {
  const welded: Vec3[] = []
  for (const point of curve) {
    const previous = welded[welded.length - 1]
    if (previous && sameV(previous, point, tolerance)) continue
    welded.push({ x: point.x, y: point.y, z: point.z })
  }
  return welded
}

export function isClosedCurve(curve: Curve3, tolerance = SURFACE_TOLERANCE): boolean {
  const first = curve[0]
  const last = curve[curve.length - 1]
  return curve.length > 2 && first !== undefined && last !== undefined && sameV(first, last, tolerance)
}

export function reverseCurve(curve: Curve3): Vec3[] {
  return [...curve].reverse()
}

export function curveCentroid(curve: Curve3): Vec3 {
  if (curve.length === 0) return { x: 0, y: 0, z: 0 }
  let sum: Vec3 = { x: 0, y: 0, z: 0 }
  for (const point of curve) sum = addV(sum, point)
  return scaleV(sum, 1 / curve.length)
}

/**
 * `count` points spread evenly along the curve by arc length, ends included.
 * Every operation that pairs two curves up resamples them through here first, so
 * the rows of the resulting mesh always line up.
 */
export function resampleCurve(curve: Curve3, count: number): Vec3[] {
  const points = weldCurve(curve)
  if (points.length === 0) throw new SurfaceError('Cannot resample an empty curve')
  if (count < 2) throw new SurfaceError('A resampled curve needs at least two points')
  if (points.length === 1) {
    return Array.from({ length: count }, () => points[0] as Vec3)
  }

  const spans: number[] = []
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const span = distanceV(points[index - 1] as Vec3, points[index] as Vec3)
    spans.push(span)
    total += span
  }

  const result: Vec3[] = [points[0] as Vec3]
  for (let step = 1; step < count - 1; step += 1) {
    let target = (total * step) / (count - 1)
    let segment = 0
    while (segment < spans.length - 1 && target > (spans[segment] as number)) {
      target -= spans[segment] as number
      segment += 1
    }
    const span = spans[segment] as number
    const t = span === 0 ? 0 : target / span
    result.push(lerpV(points[segment] as Vec3, points[segment + 1] as Vec3, t))
  }
  result.push(points[points.length - 1] as Vec3)
  return result
}

/**
 * Best-fit plane through a point cloud, by Newell's method: the summed edge
 * cross products give the area-weighted normal, which is exact for a planar loop
 * and the least-squares answer for one that only nearly is.
 */
export function bestFitPlane(points: Curve3): SurfacePlane {
  const origin = curveCentroid(points)
  let normal: Vec3 = { x: 0, y: 0, z: 0 }
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as Vec3
    const next = points[(index + 1) % points.length] as Vec3
    normal = addV(normal, {
      x: (current.y - next.y) * (current.z + next.z),
      y: (current.z - next.z) * (current.x + next.x),
      z: (current.x - next.x) * (current.y + next.y),
    })
  }

  const unit = normalizeV(normal)
  if (lengthV(unit) < 0.5) {
    // A straight or doubled-back polyline has no plane of its own; pick one that
    // at least contains it so callers get a usable frame instead of a zero normal.
    const direction = normalizeV(subV(points[points.length - 1] ?? origin, points[0] ?? origin))
    return { origin, normal: perpendicularV(direction) }
  }
  return { origin, normal: unit }
}

/** Signed distance from a point to a plane, positive on the normal's side. */
export function planeDistance(plane: SurfacePlane, point: Vec3): number {
  return dotV(normalizeV(plane.normal), subV(point, plane.origin))
}

/* -------------------------------------------------------------------------- */
/* Mesh construction                                                          */
/* -------------------------------------------------------------------------- */

export interface GridOptions {
  /** Joins the last row back to the first — a tube rather than a sheet. */
  readonly closeRows?: boolean
  /** Joins the last column of every row back to its first. */
  readonly closeColumns?: boolean
}

/**
 * Stitches a grid of rows into a triangle sheet. Every row must hold the same
 * number of points; each cell becomes two triangles wound so the surface normal
 * follows the row-then-column right-hand rule.
 */
export function meshFromGrid(rows: readonly Curve3[], options: GridOptions = {}): MeshData {
  if (rows.length < 2) throw new SurfaceError('A surface grid needs at least two rows')
  const columns = (rows[0] as Curve3).length
  if (columns < 2) throw new SurfaceError('A surface grid needs at least two columns')
  for (const row of rows) {
    if (row.length !== columns) {
      throw new SurfaceError('Every row of a surface grid must hold the same number of points')
    }
  }

  const positions: number[] = []
  for (const row of rows) {
    for (const point of row) positions.push(point.x, point.y, point.z)
  }

  const indices: number[] = []
  const lastRow = options.closeRows ? rows.length : rows.length - 1
  const lastColumn = options.closeColumns ? columns : columns - 1

  for (let row = 0; row < lastRow; row += 1) {
    const nextRow = (row + 1) % rows.length
    for (let column = 0; column < lastColumn; column += 1) {
      const nextColumn = (column + 1) % columns
      const a = row * columns + column
      const b = row * columns + nextColumn
      const c = nextRow * columns + nextColumn
      const d = nextRow * columns + column
      if (degenerateQuad(positions, a, b, c, d)) continue
      indices.push(a, b, c, a, c, d)
    }
  }

  if (indices.length === 0) throw new SurfaceError('The surface grid collapsed to nothing')
  return recomputeNormals({ positions, normals: [], indices })
}

/**
 * A cell that has collapsed to a line or a point — which happens wherever a
 * revolved curve touches its axis — carries no area and is left out.
 */
function degenerateQuad(positions: readonly number[], ...corners: readonly number[]): boolean {
  const points = corners.map((corner) => ({
    x: positions[corner * 3] as number,
    y: positions[corner * 3 + 1] as number,
    z: positions[corner * 3 + 2] as number,
  }))
  const [a, b, c, d] = points as [Vec3, Vec3, Vec3, Vec3]
  return (sameV(a, b) && sameV(c, d)) || (sameV(a, d) && sameV(b, c))
}

/**
 * Fills a closed loop with a triangle fan from its centroid. Exact for convex
 * loops and correct for any loop the centroid can see, which is every boundary
 * the patch and cap operations meet in practice.
 */
export function triangulateLoop(loop: Curve3, normal?: Vec3): MeshData {
  const points = weldCurve(isClosedCurve(loop) ? loop.slice(0, -1) : loop)
  if (points.length < 3) throw new SurfaceError('A patch needs a loop of at least three points')

  const centroid = curveCentroid(points)
  const positions: number[] = [centroid.x, centroid.y, centroid.z]
  for (const point of points) positions.push(point.x, point.y, point.z)

  const indices: number[] = []
  for (let index = 0; index < points.length; index += 1) {
    indices.push(0, index + 1, ((index + 1) % points.length) + 1)
  }

  const mesh = recomputeNormals({ positions, normals: [], indices })
  if (!normal) return mesh

  // Wind the fan so its normal points the way the caller asked for.
  const built = bestFitPlane(points).normal
  return dotV(built, normal) < 0 ? flipMesh(mesh) : mesh
}

/** Reverses winding and normals, turning a sheet inside out. */
export function flipMesh(mesh: MeshData): MeshData {
  const indices: number[] = []
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    indices.push(
      mesh.indices[triangle * 3] as number,
      mesh.indices[triangle * 3 + 2] as number,
      mesh.indices[triangle * 3 + 1] as number,
    )
  }
  return {
    positions: [...mesh.positions],
    normals: mesh.normals.map((component) => -component),
    indices,
  }
}

/* -------------------------------------------------------------------------- */
/* Mesh analysis                                                              */
/* -------------------------------------------------------------------------- */

export function surfaceArea(mesh: MeshData): number {
  let total = 0
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const [a, b, c] = triangleAt(mesh, triangle)
    total += lengthV(crossV(subV(b, a), subV(c, a))) / 2
  }
  return total
}

/** Signed volume of a mesh, from the divergence theorem. Zero for a flat sheet. */
export function meshVolume(mesh: MeshData): number {
  let total = 0
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const [a, b, c] = triangleAt(mesh, triangle)
    total += dotV(a, crossV(b, c)) / 6
  }
  return total
}

/** Welded vertex ordinal for every vertex of the mesh. */
function weldIndex(mesh: MeshData, tolerance: number): number[] {
  const buckets = new Map<string, number>()
  const scale = Math.max(tolerance, Number.MIN_VALUE)
  const mapping: number[] = []
  let next = 0

  for (let vertex = 0; vertex * 3 + 2 < mesh.positions.length; vertex += 1) {
    const point = positionAt(mesh, vertex)
    const key = `${Math.round(point.x / scale)}:${Math.round(point.y / scale)}:${Math.round(point.z / scale)}`
    const existing = buckets.get(key)
    if (existing === undefined) {
      buckets.set(key, next)
      mapping.push(next)
      next += 1
    } else {
      mapping.push(existing)
    }
  }
  return mapping
}

/**
 * Merges vertices that sit on top of each other, dropping the triangles that
 * collapse in the process. Knitting and stitching both depend on this: two
 * sheets only become one surface once their touching corners are the same vertex.
 */
export function weldMesh(mesh: MeshData, tolerance = SURFACE_TOLERANCE): MeshData {
  const mapping = weldIndex(mesh, tolerance)
  const positions: number[] = []
  const seen = new Map<number, number>()

  for (let vertex = 0; vertex < mapping.length; vertex += 1) {
    const welded = mapping[vertex] as number
    if (seen.has(welded)) continue
    seen.set(welded, positions.length / 3)
    const point = positionAt(mesh, vertex)
    positions.push(point.x, point.y, point.z)
  }

  const indices: number[] = []
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const corners = [0, 1, 2].map((corner) =>
      seen.get(mapping[mesh.indices[triangle * 3 + corner] as number] as number) as number,
    )
    const [a, b, c] = corners as [number, number, number]
    if (a === b || b === c || a === c) continue
    indices.push(a, b, c)
  }

  return recomputeNormals({ positions, normals: [], indices })
}

interface MeshEdge {
  readonly from: number
  readonly to: number
  count: number
}

/** Undirected edge table over welded vertices, keeping one directed example each. */
function edgeTable(mesh: MeshData, tolerance: number): Map<string, MeshEdge> {
  const mapping = weldIndex(mesh, tolerance)
  const edges = new Map<string, MeshEdge>()

  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const from = mapping[mesh.indices[triangle * 3 + corner] as number] as number
      const to = mapping[mesh.indices[triangle * 3 + ((corner + 1) % 3)] as number] as number
      if (from === to) continue
      const key = `${Math.min(from, to)}:${Math.max(from, to)}`
      const existing = edges.get(key)
      if (existing) existing.count += 1
      else edges.set(key, { from, to, count: 1 })
    }
  }
  return edges
}

/** Whether every edge of the mesh is shared by two triangles. */
export function isClosedMesh(mesh: MeshData, tolerance = SURFACE_TOLERANCE): boolean {
  const edges = edgeTable(mesh, tolerance)
  if (edges.size === 0) return false
  for (const edge of edges.values()) {
    if (edge.count !== 2) return false
  }
  return true
}

/**
 * The open boundaries of a sheet, as loops of world points. An edge used by one
 * triangle only borders a hole; those edges are chained head to tail, following
 * the winding of the triangle that owns them, so each loop comes back in order.
 */
export function boundaryLoops(mesh: MeshData, tolerance = SURFACE_TOLERANCE): Curve3[] {
  const mapping = weldIndex(mesh, tolerance)
  const positions: Vec3[] = []
  for (let vertex = 0; vertex < mapping.length; vertex += 1) {
    positions[mapping[vertex] as number] = positionAt(mesh, vertex)
  }

  const open = [...edgeTable(mesh, tolerance).values()].filter((edge) => edge.count === 1)
  const next = new Map<number, number[]>()
  for (const edge of open) {
    const list = next.get(edge.from)
    if (list) list.push(edge.to)
    else next.set(edge.from, [edge.to])
  }

  const loops: Curve3[] = []
  const remaining = new Set(open.map((edge) => `${edge.from}:${edge.to}`))

  for (const edge of open) {
    if (!remaining.has(`${edge.from}:${edge.to}`)) continue

    const loop: number[] = [edge.from]
    let current = edge.from
    remaining.delete(`${edge.from}:${edge.to}`)
    let following: number | undefined = edge.to

    while (following !== undefined && following !== edge.from) {
      loop.push(following)
      current = following
      following = (next.get(current) ?? []).find((candidate) =>
        remaining.has(`${current}:${candidate}`),
      )
      if (following !== undefined) remaining.delete(`${current}:${following}`)
    }

    if (loop.length >= 3) loops.push(loop.map((vertex) => positions[vertex] as Vec3))
  }

  // Longest loop first: the outer boundary is the one operations default to.
  return loops.sort((a, b) => curveLength(b) - curveLength(a))
}

/** Unit vertex normals of a mesh, indexed by vertex. */
export function vertexNormals(mesh: MeshData): Vec3[] {
  const withNormals = mesh.normals.length === mesh.positions.length ? mesh : recomputeNormals(mesh)
  const normals: Vec3[] = []
  for (let vertex = 0; vertex * 3 + 2 < withNormals.normals.length; vertex += 1) {
    normals.push({
      x: withNormals.normals[vertex * 3] as number,
      y: withNormals.normals[vertex * 3 + 1] as number,
      z: withNormals.normals[vertex * 3 + 2] as number,
    })
  }
  return normals
}

/** Area-weighted average normal of a sheet — the direction a thicken grows along. */
export function averageNormal(mesh: MeshData): Vec3 {
  let sum: Vec3 = { x: 0, y: 0, z: 0 }
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const [a, b, c] = triangleAt(mesh, triangle)
    sum = addV(sum, scaleV(crossV(subV(b, a), subV(c, a)), 0.5))
  }
  const unit = normalizeV(sum)
  return lengthV(unit) < 0.5 ? { x: 0, y: 0, z: 1 } : unit
}

/** The mesh with every vertex displaced along its own normal. */
export function offsetMesh(mesh: MeshData, distance: number): MeshData {
  const normals = vertexNormals(mesh)
  const positions: number[] = []
  for (let vertex = 0; vertex < normals.length; vertex += 1) {
    const point = addV(positionAt(mesh, vertex), scaleV(normals[vertex] as Vec3, distance))
    positions.push(point.x, point.y, point.z)
  }
  return recomputeNormals({ positions, normals: [], indices: [...mesh.indices] })
}
