import type { MeshData, MeshPoint } from '../../domain/MeshData'
import { positionAt, recomputeNormals, triangleCount } from '../../domain/MeshData'
import { addPoints, dot, normalize, scalePoint3, subtract } from './viewAxes'

/**
 * Cutting a tessellated solid with planes.
 *
 * A section view needs two things from the model: the material that survives
 * the cut, and the outline of the cut face itself. Both come from here — the
 * first by clipping triangles against the half-spaces that bound the removed
 * region, the second by intersecting the triangles with the cut plane and
 * chaining what comes back.
 *
 * Every removed region is expressed as an intersection of half-spaces, which is
 * enough for the cuts a drawing makes: a full section is one plane, a half
 * section is two, and an offset section is a run of convex cells subtracted one
 * after another.
 */

export interface Plane {
  /** Unit normal. Points with `dot(normal, p) > offset` are outside. */
  readonly normal: MeshPoint
  readonly offset: number
}

export interface Segment3 {
  readonly a: MeshPoint
  readonly b: MeshPoint
}

const EPSILON = 1e-9

export function planeThrough(point: MeshPoint, normal: MeshPoint): Plane {
  const unit = normalize(normal) ?? { x: 0, y: 0, z: 1 }
  return { normal: unit, offset: dot(unit, point) }
}

export function flipPlane(plane: Plane): Plane {
  return { normal: scalePoint3(plane.normal, -1), offset: -plane.offset }
}

export function signedDistance(plane: Plane, point: MeshPoint): number {
  return dot(plane.normal, point) - plane.offset
}

/** Where the segment from `a` to `b` meets the plane. */
function planeCrossing(plane: Plane, a: MeshPoint, b: MeshPoint): MeshPoint {
  const da = signedDistance(plane, a)
  const db = signedDistance(plane, b)
  const span = da - db
  const t = Math.abs(span) < EPSILON ? 0 : da / span
  return addPoints(a, scalePoint3(subtract(b, a), t))
}

/**
 * Splits a polygon into the part inside the half-space (`distance <= 0`) and
 * the part outside it. Either side comes back empty when the polygon does not
 * straddle the plane.
 */
export function splitPolygon(
  polygon: readonly MeshPoint[],
  plane: Plane,
  epsilon = EPSILON,
): { readonly inside: MeshPoint[]; readonly outside: MeshPoint[] } {
  const inside: MeshPoint[] = []
  const outside: MeshPoint[] = []

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index] as MeshPoint
    const next = polygon[(index + 1) % polygon.length] as MeshPoint
    const dCurrent = signedDistance(plane, current)
    const dNext = signedDistance(plane, next)

    if (dCurrent <= epsilon) inside.push(current)
    if (dCurrent >= -epsilon) outside.push(current)

    // Straddling the plane: the crossing point belongs to both halves.
    if ((dCurrent < -epsilon && dNext > epsilon) || (dCurrent > epsilon && dNext < -epsilon)) {
      const crossing = planeCrossing(plane, current, next)
      inside.push(crossing)
      outside.push(crossing)
    }
  }

  return {
    inside: inside.length >= 3 ? inside : [],
    outside: outside.length >= 3 ? outside : [],
  }
}

/** Every triangle of the mesh, as its three corners. */
export function meshTriangles(mesh: MeshData): [MeshPoint, MeshPoint, MeshPoint][] {
  const triangles: [MeshPoint, MeshPoint, MeshPoint][] = []
  for (let index = 0; index < triangleCount(mesh); index += 1) {
    triangles.push([
      positionAt(mesh, mesh.indices[index * 3] ?? 0),
      positionAt(mesh, mesh.indices[index * 3 + 1] ?? 0),
      positionAt(mesh, mesh.indices[index * 3 + 2] ?? 0),
    ])
  }
  return triangles
}

/** Rebuilds a mesh from convex polygons, fanning each one into triangles. */
export function meshFromPolygons(polygons: readonly (readonly MeshPoint[])[]): MeshData {
  const positions: number[] = []
  const indices: number[] = []

  for (const polygon of polygons) {
    if (polygon.length < 3) continue
    const base = positions.length / 3
    for (const point of polygon) positions.push(point.x, point.y, point.z)
    for (let corner = 1; corner + 1 < polygon.length; corner += 1) {
      indices.push(base, base + corner, base + corner + 1)
    }
  }
  return recomputeNormals({ positions, normals: [], indices })
}

/**
 * The mesh with everything inside every one of `planes` taken away. An empty
 * plane list removes nothing, and a single plane is the ordinary full cut.
 */
export function subtractConvexRegion(mesh: MeshData, planes: readonly Plane[]): MeshData {
  if (planes.length === 0) return mesh

  const kept: MeshPoint[][] = []
  for (const triangle of meshTriangles(mesh)) {
    let remaining: MeshPoint[][] = [[...triangle]]
    for (const plane of planes) {
      const next: MeshPoint[][] = []
      for (const polygon of remaining) {
        const { inside, outside } = splitPolygon(polygon, plane)
        // Outside any one plane is outside the region: keep it and stop
        // testing that piece against the rest.
        if (outside.length >= 3) kept.push(outside)
        if (inside.length >= 3) next.push(inside)
      }
      remaining = next
      if (remaining.length === 0) break
    }
    // Whatever survived every plane sits inside the region and is removed.
  }
  return meshFromPolygons(kept)
}

/** The mesh with everything inside any one of the regions taken away. */
export function subtractRegions(mesh: MeshData, regions: readonly (readonly Plane[])[]): MeshData {
  let result = mesh
  for (const region of regions) {
    if (region.length === 0) continue
    result = subtractConvexRegion(result, region)
  }
  return result
}

/**
 * Where the plane cuts through the mesh, as loose segments. Triangles lying in
 * the plane are skipped: their edges are already reported by their neighbours,
 * and including them would double the boundary.
 */
export function slicePlane(mesh: MeshData, plane: Plane, epsilon = EPSILON): Segment3[] {
  const segments: Segment3[] = []

  for (const triangle of meshTriangles(mesh)) {
    const distances = triangle.map((point) => signedDistance(plane, point)) as [number, number, number]
    const above = distances.filter((value) => value > epsilon).length
    const below = distances.filter((value) => value < -epsilon).length
    if (above === 0 || below === 0) continue

    const crossings: MeshPoint[] = []
    for (let corner = 0; corner < 3; corner += 1) {
      const current = triangle[corner] as MeshPoint
      const next = triangle[(corner + 1) % 3] as MeshPoint
      const dCurrent = distances[corner] as number
      const dNext = distances[(corner + 1) % 3] as number

      // A corner exactly on the plane is one of the crossing points.
      if (Math.abs(dCurrent) <= epsilon) {
        crossings.push(current)
        continue
      }
      if (dCurrent * dNext < 0) crossings.push(planeCrossing(plane, current, next))
    }
    if (crossings.length >= 2) {
      segments.push({ a: crossings[0] as MeshPoint, b: crossings[1] as MeshPoint })
    }
  }
  return segments
}

/**
 * The part of the slice that falls inside the removed region — the outline of
 * the face the cut exposes, which is what gets hatched.
 */
export function sliceWithinRegion(
  mesh: MeshData,
  cut: Plane,
  region: readonly Plane[],
  epsilon = EPSILON,
): Segment3[] {
  const segments = slicePlane(mesh, cut, epsilon)
  if (region.length === 0) return segments

  const clipped: Segment3[] = []
  for (const segment of segments) {
    let a = segment.a
    let b = segment.b
    let alive = true
    for (const plane of region) {
      const da = signedDistance(plane, a)
      const db = signedDistance(plane, b)
      if (da > epsilon && db > epsilon) {
        alive = false
        break
      }
      if (da > epsilon) a = planeCrossing(plane, a, b)
      else if (db > epsilon) b = planeCrossing(plane, b, a)
    }
    if (alive) clipped.push({ a, b })
  }
  return clipped
}
