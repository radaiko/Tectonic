import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { add, scale, vec3 } from '../domain/vec3'
import type { CageEdgeKey, ControlCage } from './types'
import {
  FormError,
  cageEdgeKey,
  cageEdges,
  cageToMesh,
  cageVertexFaces,
  createCage,
  creaseOf,
  faceCenter,
  parseCageEdgeKey,
} from './types'

/**
 * Catmull-Clark subdivision with semi-sharp creases.
 *
 * One level replaces every n-gon with n quads: a point per face, a point per
 * edge and a moved copy of every original vertex. The three rules below are what
 * make the limit surface smooth; the crease rules are what let a sculpted form
 * still have a hard edge where the designer wants one.
 *
 * Sharpness is decremented at each level, so a crease of 1 holds one level and
 * then blends. Boundary edges are treated as fully sharp, which is what keeps an
 * open cage — a plane, a sculpted panel — from shrinking away from its own rim.
 */

/** Levels beyond this multiply the face count past anything usable. */
export const MAX_SUBDIVISION_LEVEL = 5

export interface SubdivisionOptions {
  /** How many levels to refine. Clamped to {@link MAX_SUBDIVISION_LEVEL}. */
  readonly level?: number
}

/** One level of Catmull-Clark refinement. */
export function subdivideOnce(cage: ControlCage): ControlCage {
  if (cage.faces.length === 0) return cage

  const edges = cageEdges(cage)
  const vertexFaces = cageVertexFaces(cage)

  const vertices: Vec3[] = []
  const push = (point: Vec3): number => {
    vertices.push(point)
    return vertices.length - 1
  }

  // 1. Face points: the centroid of each face.
  const facePoints = cage.faces.map((face) => push(faceCenter(cage, face)))

  // 2. Edge points: the average of the two endpoints and the two face points,
  //    pulled towards the plain midpoint as the crease sharpens.
  const edgePoints = new Map<CageEdgeKey, number>()
  const newCreases = new Map<CageEdgeKey, number>()

  for (const [key, owners] of edges) {
    const [a, b] = parseCageEdgeKey(key)
    const start = cage.vertices[a] as Vec3
    const end = cage.vertices[b] as Vec3
    const middle = scale(add(start, end), 0.5)
    const sharpness = creaseOf(cage, key, owners)

    let point = middle
    if (owners.length >= 2 && sharpness < 1) {
      let smooth = add(start, end)
      for (const face of owners) smooth = add(smooth, faceCenter(cage, cage.faces[face] as number[]))
      smooth = scale(smooth, 1 / (2 + owners.length))
      point = sharpness <= 0 ? smooth : lerp(smooth, middle, sharpness)
    }
    edgePoints.set(key, push(point))
  }

  // 3. Original vertices, by the rule their sharpness calls for.
  const movedVertices = cage.vertices.map((vertex, index) =>
    push(moveVertex(cage, index, vertex, edges, vertexFaces.get(index) ?? [])),
  )

  // 4. Each n-gon becomes n quads round its face point.
  const faces: number[][] = []
  cage.faces.forEach((face, faceIndex) => {
    const centre = facePoints[faceIndex] as number
    for (let corner = 0; corner < face.length; corner += 1) {
      const previous = face[(corner + face.length - 1) % face.length] as number
      const current = face[corner] as number
      const next = face[(corner + 1) % face.length] as number
      faces.push([
        movedVertices[current] as number,
        edgePoints.get(cageEdgeKey(current, next)) as number,
        centre,
        edgePoints.get(cageEdgeKey(previous, current)) as number,
      ])
    }
  })

  // Creases carry down onto the two halves of the edge, one level blunter.
  for (const [key, owners] of edges) {
    const sharpness = cage.creases.get(key)
    if (sharpness === undefined || sharpness <= 0) continue
    if (owners.length < 2) continue
    const next = Math.max(0, sharpness - 1)
    if (next <= 0) continue
    const [a, b] = parseCageEdgeKey(key)
    const middle = edgePoints.get(key) as number
    newCreases.set(cageEdgeKey(movedVertices[a] as number, middle), next)
    newCreases.set(cageEdgeKey(middle, movedVertices[b] as number), next)
  }

  const newCorners = new Map<number, number>()
  for (const [vertex, sharpness] of cage.corners) {
    const moved = movedVertices[vertex]
    if (moved !== undefined && sharpness > 0) newCorners.set(moved, Math.max(0, sharpness - 1))
  }

  return createCage({ vertices, faces, creases: newCreases, corners: newCorners })
}

/**
 * Where an original vertex moves to.
 *
 * Three rules, chosen by how sharp the vertex is:
 * - a corner, or a vertex on three or more sharp edges, stays exactly put;
 * - a vertex on two sharp edges follows the crease: ¾ of itself plus ⅛ of each
 *   sharp neighbour, which is the cubic B-spline rule along the crease curve;
 * - anything else takes the smooth rule, `(F + 2R + (n−3)P) / n`.
 */
function moveVertex(
  cage: ControlCage,
  index: number,
  vertex: Vec3,
  edges: ReadonlyMap<CageEdgeKey, number[]>,
  faces: readonly number[],
): Vec3 {
  const incident: { key: CageEdgeKey; other: number; sharpness: number }[] = []
  for (const [key, owners] of edges) {
    const [a, b] = parseCageEdgeKey(key)
    if (a !== index && b !== index) continue
    incident.push({ key, other: a === index ? b : a, sharpness: creaseOf(cage, key, owners) })
  }

  const sharp = incident.filter((edge) => edge.sharpness > 0)
  const cornerSharpness = cage.corners.get(index) ?? 0

  if (cornerSharpness > 0 || sharp.length > 2 || incident.length === 0) return vertex

  if (sharp.length === 2) {
    const [first, second] = sharp as [(typeof sharp)[number], (typeof sharp)[number]]
    const crease = scale(
      add(
        scale(vertex, 6),
        add(cage.vertices[first.other] as Vec3, cage.vertices[second.other] as Vec3),
      ),
      1 / 8,
    )
    // Blend the crease rule towards the smooth one for a partial crease.
    const blend = Math.min(1, (first.sharpness + second.sharpness) / 2)
    return blend >= 1 ? crease : lerp(smoothVertex(cage, vertex, incident, faces), crease, blend)
  }

  return smoothVertex(cage, vertex, incident, faces)
}

function smoothVertex(
  cage: ControlCage,
  vertex: Vec3,
  incident: readonly { readonly other: number }[],
  faces: readonly number[],
): Vec3 {
  const valence = incident.length
  if (valence < 3 || faces.length === 0) return vertex

  let faceAverage = vec3(0, 0, 0)
  for (const face of faces) faceAverage = add(faceAverage, faceCenter(cage, cage.faces[face] as number[]))
  faceAverage = scale(faceAverage, 1 / faces.length)

  let edgeAverage = vec3(0, 0, 0)
  for (const edge of incident) {
    edgeAverage = add(edgeAverage, scale(add(vertex, cage.vertices[edge.other] as Vec3), 0.5))
  }
  edgeAverage = scale(edgeAverage, 1 / valence)

  return scale(
    add(add(faceAverage, scale(edgeAverage, 2)), scale(vertex, valence - 3)),
    1 / valence,
  )
}

/** The cage refined `level` times. Level 0 is the cage itself. */
export function subdivide(cage: ControlCage, options: SubdivisionOptions = {}): ControlCage {
  const level = Math.max(0, Math.min(MAX_SUBDIVISION_LEVEL, Math.round(options.level ?? 1)))
  let result = cage
  for (let pass = 0; pass < level; pass += 1) result = subdivideOnce(result)
  return result
}

/**
 * A subdivision surface: the cage, the level it is shown at, and the mesh that
 * falls out. Holding all three together is what lets the editor draw the cage
 * and the smooth result at once, which is how sculpting is actually done.
 */
export class SubdivisionSurface {
  #cage: ControlCage
  #level: number
  #cachedLevel = -1
  #cached: ControlCage | null = null

  constructor(cage: ControlCage, level = 2) {
    this.#cage = cage
    this.#level = clampLevel(level)
  }

  get cage(): ControlCage {
    return this.#cage
  }

  get level(): number {
    return this.#level
  }

  setCage(cage: ControlCage): void {
    this.#cage = cage
    this.#cachedLevel = -1
    this.#cached = null
  }

  setLevel(level: number): number {
    this.#level = clampLevel(level)
    return this.#level
  }

  /** The refined cage. Re-subdividing is skipped while nothing has changed. */
  get refined(): ControlCage {
    if (this.#cached && this.#cachedLevel === this.#level) return this.#cached
    this.#cached = subdivide(this.#cage, { level: this.#level })
    this.#cachedLevel = this.#level
    return this.#cached
  }

  /** The smooth surface as triangles. */
  toMesh(): MeshData {
    return cageToMesh(this.refined)
  }

  /** The unrefined cage as triangles, for the editing overlay. */
  cageMesh(): MeshData {
    return cageToMesh(this.#cage)
  }

  /** Marks an edge sharp. Sharpness of 0 clears the crease. */
  setCrease(a: number, b: number, sharpness: number): void {
    if (!Number.isFinite(sharpness) || sharpness < 0) {
      throw new FormError(`Crease sharpness cannot be negative, got ${String(sharpness)}`)
    }
    const creases = new Map(this.#cage.creases)
    const key = cageEdgeKey(a, b)
    if (sharpness === 0) creases.delete(key)
    else creases.set(key, sharpness)
    this.setCage({ ...this.#cage, creases })
  }

  /** Marks a vertex as a hard corner. Sharpness of 0 clears it. */
  setCorner(vertex: number, sharpness: number): void {
    const corners = new Map(this.#cage.corners)
    if (sharpness <= 0) corners.delete(vertex)
    else corners.set(vertex, sharpness)
    this.setCage({ ...this.#cage, corners })
  }
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(MAX_SUBDIVISION_LEVEL, Math.round(level)))
}

function lerp(from: Vec3, to: Vec3, fraction: number): Vec3 {
  const t = Math.min(1, Math.max(0, fraction))
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  }
}
