import type { MeshData } from '../domain/MeshData'
import { recomputeNormals } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { add, scale, vec3 } from '../domain/vec3'

/**
 * The control cage: the low-polygon skeleton a form body is sculpted through.
 *
 * Faces are arbitrary polygons rather than triangles. That is not a nicety —
 * Catmull-Clark turns an n-gon into n quads, so a quad cage stays a quad cage
 * under subdivision, and only a quad cage subdivides into a surface without
 * the pinching an all-triangle cage produces at every original vertex.
 */

/** Raised when a cage or a subdivision cannot be built as described. */
export class FormError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FormError'
  }
}

/** An undirected cage edge, written `low:high`. */
export type CageEdgeKey = string

export function cageEdgeKey(a: number, b: number): CageEdgeKey {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

export function parseCageEdgeKey(key: CageEdgeKey): readonly [number, number] {
  const separator = key.indexOf(':')
  return [Number(key.slice(0, separator)), Number(key.slice(separator + 1))]
}

/**
 * Crease sharpness, Pixar's semi-sharp scheme: 0 is smooth, 1 or more holds the
 * edge fully sharp, and a fraction blends. Each subdivision level takes 1 off,
 * so a crease of 2 stays sharp for two levels and then rounds — which is how a
 * fillet-like transition is sculpted rather than modelled.
 */
export const MAX_CREASE = 10

export interface ControlCage {
  readonly vertices: readonly Vec3[]
  /** Each face is a ring of vertex indices, wound counter-clockwise from outside. */
  readonly faces: readonly (readonly number[])[]
  readonly creases: ReadonlyMap<CageEdgeKey, number>
  /** Per-vertex sharpness; a sharp vertex is held exactly where it is. */
  readonly corners: ReadonlyMap<number, number>
}

export interface ControlCageInit {
  readonly vertices: readonly Vec3[]
  readonly faces: readonly (readonly number[])[]
  readonly creases?: ReadonlyMap<CageEdgeKey, number> | Readonly<Record<CageEdgeKey, number>>
  readonly corners?: ReadonlyMap<number, number> | Readonly<Record<string, number>>
}

export function createCage(init: ControlCageInit): ControlCage {
  const vertices = init.vertices.map((vertex) => vec3(vertex.x, vertex.y, vertex.z))
  const faces = init.faces.map((face) => [...face])

  for (const face of faces) {
    if (face.length < 3) throw new FormError('A cage face needs at least three corners')
    for (const corner of face) {
      if (corner < 0 || corner >= vertices.length || !Number.isInteger(corner)) {
        throw new FormError(`Cage face names vertex ${corner}, which does not exist`)
      }
    }
  }

  return {
    vertices,
    faces,
    creases: toNumberMap(init.creases, (key) => key),
    corners: toNumberMap(init.corners, (key) => Number(key)),
  }
}

function toNumberMap<K>(
  source: ReadonlyMap<K, number> | Readonly<Record<string, number>> | undefined,
  convert: (key: string) => K,
): ReadonlyMap<K, number> {
  if (!source) return new Map<K, number>()
  if (source instanceof Map) return new Map(source)
  return new Map(
    Object.entries(source as Readonly<Record<string, number>>).map(
      ([key, value]) => [convert(key), value] as const,
    ),
  )
}

/** The cage's edges, each with the faces that use it. */
export function cageEdges(cage: ControlCage): Map<CageEdgeKey, number[]> {
  const edges = new Map<CageEdgeKey, number[]>()
  cage.faces.forEach((face, index) => {
    for (let corner = 0; corner < face.length; corner += 1) {
      const key = cageEdgeKey(face[corner] as number, face[(corner + 1) % face.length] as number)
      const owners = edges.get(key)
      if (owners) owners.push(index)
      else edges.set(key, [index])
    }
  })
  return edges
}

/** Faces touching each vertex. */
export function cageVertexFaces(cage: ControlCage): Map<number, number[]> {
  const map = new Map<number, number[]>()
  cage.faces.forEach((face, index) => {
    for (const corner of face) {
      const owners = map.get(corner)
      if (owners) {
        if (!owners.includes(index)) owners.push(index)
      } else {
        map.set(corner, [index])
      }
    }
  })
  return map
}

/** The sharpness of an edge: its crease, or fully sharp when it is a boundary. */
export function creaseOf(
  cage: ControlCage,
  key: CageEdgeKey,
  owners: readonly number[],
): number {
  if (owners.length < 2) return MAX_CREASE
  return Math.max(0, Math.min(MAX_CREASE, cage.creases.get(key) ?? 0))
}

export function faceCenter(cage: ControlCage, face: readonly number[]): Vec3 {
  let total = vec3(0, 0, 0)
  for (const corner of face) total = add(total, cage.vertices[corner] as Vec3)
  return scale(total, 1 / face.length)
}

/** The cage as triangles, so it can be drawn as a wireframe or a hull. */
export function cageToMesh(cage: ControlCage): MeshData {
  const positions: number[] = []
  for (const vertex of cage.vertices) positions.push(vertex.x, vertex.y, vertex.z)

  const indices: number[] = []
  for (const face of cage.faces) {
    for (let corner = 2; corner < face.length; corner += 1) {
      indices.push(face[0] as number, face[corner - 1] as number, face[corner] as number)
    }
  }
  return recomputeNormals({ positions, normals: [], indices })
}

/** The cage's edges as index pairs, for drawing the editable wireframe. */
export function cageWireframe(cage: ControlCage): (readonly [number, number])[] {
  return [...cageEdges(cage).keys()].map((key) => parseCageEdgeKey(key))
}

/* -------------------------------------------------------------------------- */
/* Serialisation                                                               */
/* -------------------------------------------------------------------------- */

export interface ControlCageJSON {
  readonly vertices: readonly (readonly [number, number, number])[]
  readonly faces: readonly (readonly number[])[]
  readonly creases: Readonly<Record<string, number>>
  readonly corners: Readonly<Record<string, number>>
}

export function cageToJSON(cage: ControlCage): ControlCageJSON {
  return {
    vertices: cage.vertices.map((vertex) => [vertex.x, vertex.y, vertex.z] as const),
    faces: cage.faces.map((face) => [...face]),
    creases: Object.fromEntries(cage.creases),
    corners: Object.fromEntries([...cage.corners].map(([key, value]) => [String(key), value])),
  }
}

export function cageFromJSON(json: ControlCageJSON): ControlCage {
  return createCage({
    vertices: json.vertices.map(([x, y, z]) => vec3(x, y, z)),
    faces: json.faces,
    creases: json.creases,
    corners: json.corners,
  })
}
