import type { MeshData } from '../domain/MeshData'
import { mergeMeshes, recomputeNormals, triangleAt, triangleCount } from '../domain/MeshData'
import type { Vec3 } from '../kernel/IKernel'
import { createSurfaceBody } from './SurfaceBody'
import {
  addV,
  averageNormal,
  crossV,
  curveCentroid,
  dotV,
  lengthV,
  meshFromGrid,
  normalizeV,
  planeDistance,
  scaleV,
  subV,
  vertexNormals,
  weldMesh,
} from './geometry'
import type {
  Curve3,
  ExtendMode,
  SurfaceBody,
  SurfaceNaming,
  SurfacePlane,
  TrimKeep,
} from './types'
import { SURFACE_TOLERANCE, SurfaceError } from './types'

/**
 * Editing surfaces that already exist: trimming them back, putting a trim away
 * again, growing their edges, joining them up and cutting them apart.
 *
 * Trim, untrim and split all rest on one operation — clipping the sheet against a
 * plane — because that is the cut a mesh-backed surface can make exactly. What
 * varies is where the plane comes from, which is what {@link TrimBoundary} says.
 */

/**
 * What a trim cuts against.
 *
 * A `plane` cuts where it says. A `curve` cuts along the wall that stands on the
 * curve at right angles to the surface, which is what "trim this surface back to
 * this line drawn on it" means; that is exact for a straight trim curve and
 * follows the curve's overall direction when it bends. A `surface` cuts along the
 * plane the other sheet averages to.
 */
export type TrimBoundary =
  | { readonly kind: 'plane'; readonly plane: SurfacePlane }
  | { readonly kind: 'curve'; readonly curve: Curve3 }
  | { readonly kind: 'surface'; readonly surface: SurfaceBody }

export interface TrimParams {
  readonly boundary: TrimBoundary
  /** Side of the boundary to keep. The plane normal points at the "front". */
  readonly keep?: TrimKeep
}

/** Cuts a surface with a boundary and keeps one side of it. */
export function trimSurface(
  body: SurfaceBody,
  params: TrimParams,
  naming: SurfaceNaming = {},
): SurfaceBody {
  const keep = params.keep ?? 'front'
  const plane = cuttingPlane(body, params.boundary)
  const pieces = clipMeshByPlane(body.mesh, plane)
  const kept = keep === 'front' ? pieces.front : pieces.back

  if (triangleCount(kept) === 0) {
    throw new SurfaceError('The trim removed the whole surface')
  }
  return createSurfaceBody(kept, {
    id: body.id,
    name: body.name,
    // The mesh going in is what an untrim restores, even after several trims.
    untrimmed: body.untrimmed ?? body.mesh,
    ...naming,
  })
}

/** Restores the surface as it stood before its last trim. */
export function untrimSurface(body: SurfaceBody, naming: SurfaceNaming = {}): SurfaceBody {
  if (!body.untrimmed) {
    throw new SurfaceError('This surface has not been trimmed, so there is nothing to restore')
  }
  return createSurfaceBody(body.untrimmed, {
    id: body.id,
    name: body.name,
    untrimmed: null,
    ...naming,
  })
}

/** Cuts a surface into the pieces either side of a boundary. */
export function splitSurface(
  body: SurfaceBody,
  boundary: TrimBoundary,
  naming: SurfaceNaming = {},
): SurfaceBody[] {
  const plane = cuttingPlane(body, boundary)
  const { front, back } = clipMeshByPlane(body.mesh, plane)
  if (triangleCount(front) === 0 || triangleCount(back) === 0) {
    throw new SurfaceError('The split boundary does not cross the surface')
  }

  const base = { untrimmed: body.untrimmed ?? body.mesh, ...naming }
  return [
    createSurfaceBody(front, { ...base, name: `${naming.name ?? body.name} 1` }),
    createSurfaceBody(back, { ...base, name: `${naming.name ?? body.name} 2` }),
  ]
}

export interface ExtendSurfaceParams {
  readonly mode?: ExtendMode
  /** How far to grow, for a `distance` extension. */
  readonly distance?: number
  /** Where to stop, for a `to-plane` extension. */
  readonly toPlane?: SurfacePlane
  /** Which open boundary to grow, longest first. Every boundary by default. */
  readonly boundaryIndex?: number
}

/**
 * Grows a surface outwards from its open edges, tangentially: each boundary point
 * travels in the surface's own plane, at right angles to the boundary, so the new
 * band meets the old sheet smoothly.
 */
export function extendSurface(
  body: SurfaceBody,
  params: ExtendSurfaceParams,
  naming: SurfaceNaming = {},
): SurfaceBody {
  const mode = params.mode ?? 'distance'
  const distance = params.distance ?? 0
  if (mode === 'distance' && !(distance > 0)) {
    throw new SurfaceError('An extension needs a positive distance')
  }
  if (mode === 'to-plane' && !params.toPlane) {
    throw new SurfaceError('An extension to a plane needs the plane to extend to')
  }
  if (body.boundaries.length === 0) {
    throw new SurfaceError('This surface is closed, so it has no edge to extend')
  }

  const chosen =
    params.boundaryIndex === undefined
      ? body.boundaries
      : [body.boundaries[params.boundaryIndex]].filter(
          (loop): loop is Curve3 => loop !== undefined,
        )
  if (chosen.length === 0) {
    throw new SurfaceError(`This surface has no boundary ${String(params.boundaryIndex)}`)
  }

  const normals = surfaceNormalLookup(body.mesh)
  const bands: MeshData[] = []
  for (const loop of chosen) {
    const band = extensionBand(loop, normals, mode, distance, params.toPlane)
    if (band) bands.push(band)
  }
  if (bands.length === 0) {
    throw new SurfaceError('The extension did not reach anywhere')
  }

  return createSurfaceBody(weldMesh(mergeMeshes([body.mesh, ...bands])), {
    id: body.id,
    name: body.name,
    untrimmed: body.untrimmed,
    ...naming,
  })
}

export interface KnitParams {
  /** Vertices closer than this are treated as touching. */
  readonly tolerance?: number
}

/**
 * Merges several surfaces into one. Vertices that touch within the tolerance
 * become a single vertex, which is what turns a pile of separate sheets into one
 * surface with fewer open edges — and, once none are left, into something
 * {@link import('./SurfaceToSolid').stitchSurfaces} can close into a solid.
 */
export function knitSurfaces(
  bodies: readonly SurfaceBody[],
  params: KnitParams = {},
  naming: SurfaceNaming = {},
): SurfaceBody {
  if (bodies.length === 0) throw new SurfaceError('Knitting needs at least one surface')

  const tolerance = params.tolerance ?? SURFACE_TOLERANCE
  const merged = weldMesh(mergeMeshes(bodies.map((body) => body.mesh)), tolerance)
  return createSurfaceBody(merged, {
    tolerance,
    name: bodies.length === 1 ? (bodies[0] as SurfaceBody).name : 'Knitted Surface',
    welded: true,
    ...naming,
  })
}

/* -------------------------------------------------------------------------- */
/* Clipping                                                                   */
/* -------------------------------------------------------------------------- */

export interface ClippedMesh {
  /** The part on the plane normal's side. */
  readonly front: MeshData
  readonly back: MeshData
}

/**
 * Splits a mesh along a plane, cutting the triangles that straddle it. Each
 * straddling triangle is clipped to a polygon per side and fanned back into
 * triangles, so no geometry is lost and the cut edge is exact.
 */
export function clipMeshByPlane(mesh: MeshData, plane: SurfacePlane): ClippedMesh {
  const unit = normalizeV(plane.normal)
  if (lengthV(unit) < 0.5) throw new SurfaceError('A cutting plane needs a non-zero normal')
  const cutter: SurfacePlane = { origin: plane.origin, normal: unit }

  const front = new MeshBuilder()
  const back = new MeshBuilder()

  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const corners = triangleAt(mesh, triangle)
    front.addPolygon(clipPolygon(corners, cutter, true))
    back.addPolygon(clipPolygon(corners, cutter, false))
  }

  return { front: front.build(), back: back.build() }
}

/** Sutherland–Hodgman clip of a convex polygon against a half-space. */
function clipPolygon(
  polygon: readonly Vec3[],
  plane: SurfacePlane,
  keepFront: boolean,
): Vec3[] {
  const sign = keepFront ? 1 : -1
  const kept: Vec3[] = []

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index] as Vec3
    const next = polygon[(index + 1) % polygon.length] as Vec3
    const currentSide = planeDistance(plane, current) * sign
    const nextSide = planeDistance(plane, next) * sign

    if (currentSide >= -SURFACE_TOLERANCE) kept.push(current)
    // A sign change between the two ends means the cut passes between them.
    const straddles =
      (currentSide > SURFACE_TOLERANCE && nextSide < -SURFACE_TOLERANCE) ||
      (currentSide < -SURFACE_TOLERANCE && nextSide > SURFACE_TOLERANCE)
    if (straddles) kept.push(crossingPoint(current, next, currentSide, nextSide))
  }
  return kept
}

function crossingPoint(from: Vec3, to: Vec3, fromSide: number, toSide: number): Vec3 {
  const t = fromSide / (fromSide - toSide)
  return addV(from, scaleV(subV(to, from), t))
}

/** Collects polygons into a mesh, fanning anything with more than three corners. */
class MeshBuilder {
  readonly #positions: number[] = []
  readonly #indices: number[] = []

  addPolygon(polygon: readonly Vec3[]): void {
    if (polygon.length < 3) return
    const base = this.#positions.length / 3
    for (const point of polygon) this.#positions.push(point.x, point.y, point.z)
    for (let corner = 1; corner + 1 < polygon.length; corner += 1) {
      this.#indices.push(base, base + corner, base + corner + 1)
    }
  }

  build(): MeshData {
    if (this.#indices.length === 0) return { positions: [], normals: [], indices: [] }
    return recomputeNormals({ positions: this.#positions, normals: [], indices: this.#indices })
  }
}

/* -------------------------------------------------------------------------- */

/** The plane a trim, split or knit boundary comes down to. */
export function cuttingPlane(body: SurfaceBody, boundary: TrimBoundary): SurfacePlane {
  switch (boundary.kind) {
    case 'plane':
      return boundary.plane
    case 'surface': {
      const other = boundary.surface
      return { origin: meshCentroid(other.mesh), normal: averageNormal(other.mesh) }
    }
    default: {
      const curve = boundary.curve
      if (curve.length < 2) throw new SurfaceError('A trim curve needs at least two points')
      const along = normalizeV(subV(curve[curve.length - 1] as Vec3, curve[0] as Vec3))
      const surfaceNormal = averageNormal(body.mesh)
      const normal = normalizeV(crossV(along, surfaceNormal))
      if (lengthV(normal) < 0.5) {
        throw new SurfaceError('This trim curve runs across the surface, so it cannot trim it')
      }
      return { origin: curveCentroid(curve), normal }
    }
  }
}

function meshCentroid(mesh: MeshData): Vec3 {
  let sum: Vec3 = { x: 0, y: 0, z: 0 }
  const count = mesh.positions.length / 3
  for (let vertex = 0; vertex < count; vertex += 1) {
    sum = addV(sum, {
      x: mesh.positions[vertex * 3] as number,
      y: mesh.positions[vertex * 3 + 1] as number,
      z: mesh.positions[vertex * 3 + 2] as number,
    })
  }
  return count === 0 ? sum : scaleV(sum, 1 / count)
}

/** Nearest-vertex normal lookup, so an extension follows the sheet it grows from. */
function surfaceNormalLookup(mesh: MeshData): (point: Vec3) => Vec3 {
  const normals = vertexNormals(mesh)
  const fallback = averageNormal(mesh)

  return (point: Vec3): Vec3 => {
    let bestDistance = Infinity
    let best = fallback
    for (let vertex = 0; vertex < normals.length; vertex += 1) {
      const dx = (mesh.positions[vertex * 3] as number) - point.x
      const dy = (mesh.positions[vertex * 3 + 1] as number) - point.y
      const dz = (mesh.positions[vertex * 3 + 2] as number) - point.z
      const squared = dx * dx + dy * dy + dz * dz
      if (squared < bestDistance) {
        bestDistance = squared
        best = normals[vertex] as Vec3
      }
    }
    return lengthV(best) < 0.5 ? fallback : best
  }
}

/**
 * The band of triangles that extends one boundary loop.
 *
 * The loop runs the way the triangle that owns each edge is wound, so the outward
 * direction at a point is its tangent crossed with the surface normal there — no
 * guessing which side is "out". The band is wound from the new edge back to the
 * loop so its normals agree with the sheet it joins.
 */
function extensionBand(
  loop: Curve3,
  normalAt: (point: Vec3) => Vec3,
  mode: ExtendMode,
  distance: number,
  toPlane?: SurfacePlane,
): MeshData | null {
  if (loop.length < 3) return null

  const extended: Vec3[] = []
  let moved = false

  for (let index = 0; index < loop.length; index += 1) {
    const point = loop[index] as Vec3
    const previous = loop[(index - 1 + loop.length) % loop.length] as Vec3
    const next = loop[(index + 1) % loop.length] as Vec3
    const tangent = normalizeV(subV(next, previous))
    const outward = normalizeV(crossV(tangent, normalAt(point)))

    const travel =
      lengthV(outward) < 0.5 ? 0 : mode === 'to-plane' ? toPlaneDistance(point, outward, toPlane) : distance
    if (travel > 0) moved = true
    extended.push(addV(point, scaleV(outward, travel)))
  }

  if (!moved) return null
  return meshFromGrid([extended, [...loop]], { closeColumns: true })
}

/** How far a point has to travel along `outward` to land on the plane. */
function toPlaneDistance(point: Vec3, outward: Vec3, plane?: SurfacePlane): number {
  if (!plane) return 0
  const unit = normalizeV(plane.normal)
  const rate = dotV(unit, outward)
  if (Math.abs(rate) < 1e-9) return 0
  const travel = -planeDistance({ origin: plane.origin, normal: unit }, point) / rate
  // An extension only ever grows; a plane already behind the edge stops it.
  return travel > 0 ? travel : 0
}
