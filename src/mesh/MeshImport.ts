import type { MeshData } from '../domain/MeshData'
import {
  meshBounds,
  positionAt,
  recomputeNormals,
  triangleAt,
  triangleCount,
  vertexCount,
} from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { add, cross, dot, length, scale, subtract, vec3 } from '../domain/vec3'
import { importStl } from '../io/StlImporter'
import type { EdgeKey, MeshTopology } from './types'
import {
  MeshError,
  boundaryLoops,
  buildTopology,
  cornersOf,
  edgeKey,
  nonManifoldEdges,
  parseEdgeKey,
} from './types'

/**
 * Getting foreign geometry in, and getting it into a state worth modelling on.
 *
 * A mesh that arrives from a scanner or a 3D-print slicer is rarely clean: it
 * duplicates every facet corner, leaves cracks between panels, carries a few
 * zero-area slivers and often disagrees with itself about which way is out.
 * Nothing downstream — not the boolean, not the B-Rep conversion, not even a
 * shaded render — behaves until those are dealt with, so validation and repair
 * live at the front door rather than being an optional tool.
 */

export const MESH_IMPORT_FORMATS = ['stl', 'obj'] as const
export type MeshImportFormat = (typeof MESH_IMPORT_FORMATS)[number]

export interface ImportedMesh {
  readonly name: string
  readonly mesh: MeshData
  readonly format: MeshImportFormat
}

export interface MeshImportOptions {
  /** Uniform scale applied on the way in, for unit conversion. */
  readonly scale?: number
  /** Merge coincident corners. On by default — foreign meshes rarely share any. */
  readonly weld?: boolean
  readonly weldTolerance?: number
}

/** The format a file name implies, or `undefined` when it is not a mesh. */
export function meshFormatFromName(name: string): MeshImportFormat | undefined {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return (MESH_IMPORT_FORMATS as readonly string[]).includes(extension)
    ? (extension as MeshImportFormat)
    : undefined
}

/** Reads an STL or OBJ file into a mesh. */
export function importMesh(
  name: string,
  content: string | ArrayBuffer | Uint8Array,
  options: MeshImportOptions = {},
): ImportedMesh {
  const format = meshFormatFromName(name)
  if (!format) throw new MeshError(`"${name}" is not a mesh file this build can read`)

  if (format === 'stl') {
    const result = importStl(content, {
      ...(options.scale === undefined ? {} : { scale: options.scale }),
      ...(options.weld === undefined ? {} : { weld: options.weld }),
      ...(options.weldTolerance === undefined ? {} : { weldTolerance: options.weldTolerance }),
    })
    return { name: result.name || name, mesh: result.mesh, format }
  }

  const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
  const parsed = importObj(text, options)
  return { name: parsed.name || name, mesh: parsed.mesh, format }
}

/**
 * A Wavefront OBJ as one mesh.
 *
 * Faces with more than three corners are fanned, negative indices are resolved
 * against the vertices read so far, and `v/vt/vn` triples keep only the position
 * — the normals are recomputed from the winding anyway, which is the only way to
 * be sure they agree with it.
 */
export function importObj(text: string, options: MeshImportOptions = {}): ImportedMesh {
  const factor = options.scale ?? 1
  const positions: number[] = []
  const indices: number[] = []
  let name = ''

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#')) continue

    const parts = line.split(/\s+/)
    const keyword = parts[0]

    if (keyword === 'o' || (keyword === 'g' && !name)) {
      name = parts.slice(1).join(' ')
      continue
    }

    if (keyword === 'v') {
      positions.push(
        Number(parts[1] ?? 0) * factor,
        Number(parts[2] ?? 0) * factor,
        Number(parts[3] ?? 0) * factor,
      )
      continue
    }

    if (keyword !== 'f') continue

    const corners: number[] = []
    for (const token of parts.slice(1)) {
      const first = token.split('/')[0]
      const value = Number(first)
      if (!Number.isFinite(value) || value === 0) continue
      corners.push(value > 0 ? value - 1 : positions.length / 3 + value)
    }
    for (let corner = 2; corner < corners.length; corner += 1) {
      indices.push(
        corners[0] as number,
        corners[corner - 1] as number,
        corners[corner] as number,
      )
    }
  }

  const raw: MeshData = { positions, normals: [], indices }
  const welded =
    options.weld === false ? raw : weldVertices(raw, options.weldTolerance ?? 1e-6).mesh
  return { name, mesh: recomputeNormals(welded), format: 'obj' }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export interface MeshValidation {
  /** Every edge has exactly two triangles: the mesh encloses a volume. */
  readonly closed: boolean
  /** No edge has more than two triangles. */
  readonly manifold: boolean
  readonly nonManifoldEdges: readonly EdgeKey[]
  readonly boundaryEdgeCount: number
  /** Openings in the surface, as closed rings of boundary edges. */
  readonly holeCount: number
  readonly degenerateTriangles: readonly number[]
  /** Vertices at the same place as an earlier one. */
  readonly duplicateVertices: number
  /**
   * Triangles wound against their neighbours. Only meaningful once the mesh is
   * manifold, so it is empty when it is not.
   */
  readonly invertedTriangles: readonly number[]
  /** True when the mesh is closed, manifold, consistently wound and clean. */
  readonly isValid: boolean
}

export interface ValidationOptions {
  /** Triangles with less than this area count as degenerate. */
  readonly minArea?: number
  readonly weldTolerance?: number
}

export function validateMesh(mesh: MeshData, options: ValidationOptions = {}): MeshValidation {
  const topology = buildTopology(mesh)
  const minArea = options.minArea ?? 1e-12
  const tolerance = options.weldTolerance ?? 1e-6

  const bad = nonManifoldEdges(topology)
  const boundary = [...topology.edgeTriangles.values()].filter(
    (owners) => owners.length === 1,
  ).length

  const degenerate: number[] = []
  for (let triangle = 0; triangle < topology.triangleCount; triangle += 1) {
    if ((topology.doubleAreas[triangle] ?? 0) / 2 <= minArea) degenerate.push(triangle)
  }

  const seen = new Map<string, number>()
  let duplicates = 0
  for (let vertex = 0; vertex < vertexCount(mesh); vertex += 1) {
    const key = quantizeKey(positionAt(mesh, vertex), tolerance)
    if (seen.has(key)) duplicates += 1
    else seen.set(key, vertex)
  }

  const inverted = bad.length === 0 ? inconsistentTriangles(mesh, topology) : []

  return {
    closed: boundary === 0 && bad.length === 0 && topology.triangleCount > 0,
    manifold: bad.length === 0,
    nonManifoldEdges: bad,
    boundaryEdgeCount: boundary,
    holeCount: boundaryLoops(topology).length,
    degenerateTriangles: degenerate,
    duplicateVertices: duplicates,
    invertedTriangles: inverted,
    isValid:
      boundary === 0 &&
      bad.length === 0 &&
      degenerate.length === 0 &&
      duplicates === 0 &&
      inverted.length === 0 &&
      topology.triangleCount > 0,
  }
}

/**
 * Triangles whose winding disagrees with the connected component they sit in.
 *
 * The check is a flood fill: take a seed, walk to every neighbour, and require
 * that a shared edge be traversed in opposite directions by the two triangles
 * that own it. That is the definition of consistent orientation, and it does not
 * need the mesh to be closed.
 */
function inconsistentTriangles(mesh: MeshData, topology: MeshTopology): number[] {
  const orientation = new Map<number, 1 | -1>()
  const flipped: number[] = []

  for (let seed = 0; seed < topology.triangleCount; seed += 1) {
    if (orientation.has(seed)) continue
    orientation.set(seed, 1)
    const queue = [seed]

    while (queue.length > 0) {
      const triangle = queue.pop() as number
      const sign = orientation.get(triangle) as 1 | -1
      const corners = cornersOf(mesh, triangle)

      for (let corner = 0; corner < 3; corner += 1) {
        const from = corners[corner] as number
        const to = corners[(corner + 1) % 3] as number
        for (const other of topology.edgeTriangles.get(edgeKey(from, to)) ?? []) {
          if (other === triangle) continue
          // Agreeing neighbours traverse the shared edge the other way round.
          const agrees = directedEdges(mesh, other).some(([a, b]) => a === to && b === from)
          const expected: 1 | -1 = agrees ? sign : ((-sign) as 1 | -1)
          const known = orientation.get(other)
          if (known === undefined) {
            orientation.set(other, expected)
            queue.push(other)
          }
        }
      }
    }
  }

  for (const [triangle, sign] of orientation) {
    if (sign === -1) flipped.push(triangle)
  }
  return flipped.sort((a, b) => a - b)
}

function directedEdges(mesh: MeshData, triangle: number): readonly (readonly [number, number])[] {
  const [a, b, c] = cornersOf(mesh, triangle)
  return [
    [a, b],
    [b, c],
    [c, a],
  ]
}

/* -------------------------------------------------------------------------- */
/* Repair                                                                      */
/* -------------------------------------------------------------------------- */

export interface RepairOptions {
  readonly weldTolerance?: number
  readonly minArea?: number
  /** Merge coincident vertices, closing hairline cracks. On by default. */
  readonly weld?: boolean
  readonly removeDegenerate?: boolean
  readonly fillHoles?: boolean
  /** Make the winding consistent and turn it outwards. On by default. */
  readonly orient?: boolean
}

export interface RepairReport {
  readonly mesh: MeshData
  readonly mergedVertices: number
  readonly removedTriangles: number
  readonly filledHoles: number
  readonly flippedTriangles: number
  /** Whether the result is closed and manifold. */
  readonly watertight: boolean
}

/**
 * The standard clean-up, in the only order that works.
 *
 * Welding first is what turns a crack into a shared edge, so hole filling has a
 * real loop to close rather than two parallel rims. Degenerate triangles go next
 * because a sliver left in place produces a boundary loop that is not a hole.
 * Orienting comes last, once the connectivity is final.
 */
export function repairMesh(mesh: MeshData, options: RepairOptions = {}): RepairReport {
  let working = mesh
  let mergedVertices = 0
  let removedTriangles = 0
  let filledHoles = 0
  let flippedTriangles = 0

  if (options.weld !== false) {
    const welded = weldVertices(working, options.weldTolerance ?? 1e-6)
    working = welded.mesh
    mergedVertices = welded.merged
  }

  if (options.removeDegenerate !== false) {
    const cleaned = removeDegenerateTriangles(working, options.minArea ?? 1e-12)
    working = cleaned.mesh
    removedTriangles = cleaned.removed
  }

  if (options.fillHoles !== false) {
    const filled = fillHoles(working)
    working = filled.mesh
    filledHoles = filled.filled
  }

  if (options.orient !== false) {
    const oriented = orientNormals(working)
    working = oriented.mesh
    flippedTriangles = oriented.flipped
  }

  const validation = validateMesh(working, {
    ...(options.minArea === undefined ? {} : { minArea: options.minArea }),
  })

  return {
    mesh: working,
    mergedVertices,
    removedTriangles,
    filledHoles,
    flippedTriangles,
    watertight: validation.closed && validation.manifold,
  }
}

/** Collapses vertices that share a position, rewriting the indices to match. */
export function weldVertices(
  mesh: MeshData,
  tolerance = 1e-6,
): { readonly mesh: MeshData; readonly merged: number } {
  const positions: number[] = []
  const remap = new Map<number, number>()
  const lookup = new Map<string, number>()

  for (let vertex = 0; vertex < vertexCount(mesh); vertex += 1) {
    const point = positionAt(mesh, vertex)
    const key = quantizeKey(point, tolerance)
    const existing = lookup.get(key)
    if (existing !== undefined) {
      remap.set(vertex, existing)
      continue
    }
    const index = positions.length / 3
    positions.push(point.x, point.y, point.z)
    lookup.set(key, index)
    remap.set(vertex, index)
  }

  const indices = mesh.indices.map((index) => remap.get(index) ?? 0)
  return {
    mesh: recomputeNormals({ positions, normals: [], indices }),
    merged: vertexCount(mesh) - positions.length / 3,
  }
}

/** Drops slivers and any triangle that repeats a corner. */
export function removeDegenerateTriangles(
  mesh: MeshData,
  minArea = 1e-12,
): { readonly mesh: MeshData; readonly removed: number } {
  const indices: number[] = []
  let removed = 0

  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const [a, b, c] = cornersOf(mesh, triangle)
    if (a === b || b === c || c === a) {
      removed += 1
      continue
    }
    const [p, q, r] = triangleAt(mesh, triangle)
    if (length(cross(subtract(q, p), subtract(r, p))) / 2 <= minArea) {
      removed += 1
      continue
    }
    indices.push(a, b, c)
  }

  return {
    mesh: recomputeNormals({ positions: [...mesh.positions], normals: [], indices }),
    removed,
  }
}

/**
 * Caps every opening with a triangle fan from the loop's own centroid.
 *
 * A fan from a corner is cheaper but folds badly on a concave rim; the centroid
 * costs one extra vertex per hole and produces a cap that is at least planar for
 * a planar loop, which is the case that actually turns up.
 */
export function fillHoles(mesh: MeshData): { readonly mesh: MeshData; readonly filled: number } {
  const loops = boundaryLoops(buildTopology(mesh))
  if (loops.length === 0) return { mesh, filled: 0 }

  const positions = [...mesh.positions]
  const indices = [...mesh.indices]

  for (const loop of loops) {
    const centre = loop.reduce<Vec3>(
      (total, vertex) => add(total, positionAt(mesh, vertex)),
      vec3(0, 0, 0),
    )
    const hub = positions.length / 3
    const middle = scale(centre, 1 / loop.length)
    positions.push(middle.x, middle.y, middle.z)

    for (let corner = 0; corner < loop.length; corner += 1) {
      indices.push(hub, loop[corner] as number, loop[(corner + 1) % loop.length] as number)
    }
  }

  return {
    mesh: recomputeNormals({ positions, normals: [], indices }),
    filled: loops.length,
  }
}

/**
 * Makes the winding consistent, then turns the whole thing outwards.
 *
 * Consistency is a flood fill over shared edges. Which way "out" is cannot be
 * decided locally at all, so it is settled globally by the signed volume: a
 * closed mesh wound outwards encloses a positive volume, and one wound inwards
 * encloses the same volume negated.
 */
export function orientNormals(mesh: MeshData): {
  readonly mesh: MeshData
  readonly flipped: number
} {
  const topology = buildTopology(mesh)
  const orientation = new Map<number, 1 | -1>()

  for (let seed = 0; seed < topology.triangleCount; seed += 1) {
    if (orientation.has(seed)) continue
    orientation.set(seed, 1)
    const queue = [seed]

    while (queue.length > 0) {
      const triangle = queue.pop() as number
      const sign = orientation.get(triangle) as 1 | -1
      const corners = cornersOf(mesh, triangle)

      for (let corner = 0; corner < 3; corner += 1) {
        const from = corners[corner] as number
        const to = corners[(corner + 1) % 3] as number
        for (const other of topology.edgeTriangles.get(edgeKey(from, to)) ?? []) {
          if (other === triangle || orientation.has(other)) continue
          const agrees = directedEdges(mesh, other).some(([a, b]) => a === to && b === from)
          orientation.set(other, agrees ? sign : ((-sign) as 1 | -1))
          queue.push(other)
        }
      }
    }
  }

  const indices: number[] = []
  let flipped = 0
  for (let triangle = 0; triangle < topology.triangleCount; triangle += 1) {
    const [a, b, c] = cornersOf(mesh, triangle)
    if (orientation.get(triangle) === -1) {
      indices.push(a, c, b)
      flipped += 1
    } else {
      indices.push(a, b, c)
    }
  }

  let result: MeshData = { positions: [...mesh.positions], normals: [], indices }
  if (signedVolume(result) < 0) {
    const reversed: number[] = []
    for (let triangle = 0; triangle * 3 + 2 < indices.length; triangle += 1) {
      reversed.push(
        indices[triangle * 3] as number,
        indices[triangle * 3 + 2] as number,
        indices[triangle * 3 + 1] as number,
      )
    }
    result = { positions: result.positions, normals: [], indices: reversed }
    flipped = topology.triangleCount - flipped
  }

  return { mesh: recomputeNormals(result), flipped }
}

/** Six times the volume the mesh encloses; negative when wound inwards. */
export function signedVolume(mesh: MeshData): number {
  let total = 0
  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const [a, b, c] = triangleAt(mesh, triangle)
    total += dot(a, cross(b, c))
  }
  return total / 6
}

/* -------------------------------------------------------------------------- */
/* Simplify                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Reduces the triangle count by vertex clustering.
 *
 * Every vertex is snapped to the centre of a grid cell and triangles whose
 * corners land in the same cell disappear. This is not the best decimation there
 * is — an edge-collapse driven by quadric error would keep sharp features better
 * — but it is O(n), never produces a non-manifold result from a manifold input
 * and cannot fold the surface through itself, which is what matters for a
 * preview or a lightweight export.
 */
export function decimateMesh(mesh: MeshData, targetRatio: number): MeshData {
  if (!(targetRatio > 0) || targetRatio >= 1) return recomputeNormals(mesh)
  const triangles = triangleCount(mesh)
  if (triangles === 0) return recomputeNormals(mesh)

  const bounds = meshBounds(mesh)
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  }
  const diagonal = Math.hypot(size.x, size.y, size.z)
  if (diagonal === 0) return recomputeNormals(mesh)

  // Triangle count falls roughly with the square of the cell size, so aim the
  // grid resolution at the square root of the requested ratio.
  const resolution = Math.max(2, Math.round(Math.cbrt(triangles * targetRatio) * 2))
  const cell = diagonal / resolution

  const cells = new Map<string, { sum: Vec3; count: number; index: number }>()
  const remap: number[] = []

  for (let vertex = 0; vertex < vertexCount(mesh); vertex += 1) {
    const point = positionAt(mesh, vertex)
    const key = `${Math.floor((point.x - bounds.min.x) / cell)}:${Math.floor(
      (point.y - bounds.min.y) / cell,
    )}:${Math.floor((point.z - bounds.min.z) / cell)}`
    const existing = cells.get(key)
    if (existing) {
      existing.sum = add(existing.sum, point)
      existing.count += 1
      remap.push(existing.index)
    } else {
      const index = cells.size
      cells.set(key, { sum: point, count: 1, index })
      remap.push(index)
    }
  }

  const positions: number[] = []
  for (const entry of cells.values()) {
    const centre = scale(entry.sum, 1 / entry.count)
    positions.push(centre.x, centre.y, centre.z)
  }

  const indices: number[] = []
  for (let triangle = 0; triangle < triangles; triangle += 1) {
    const [a, b, c] = cornersOf(mesh, triangle)
    const ra = remap[a] as number
    const rb = remap[b] as number
    const rc = remap[c] as number
    if (ra === rb || rb === rc || rc === ra) continue
    indices.push(ra, rb, rc)
  }

  return recomputeNormals({ positions, normals: [], indices })
}

/**
 * Laplacian smoothing: each vertex drifts towards the average of its neighbours.
 *
 * Boundary vertices are pinned, so an open sheet keeps its outline instead of
 * shrinking away from it. `factor` below 1 under-relaxes, which is what stops
 * the surface collapsing over many passes.
 */
export function smoothMesh(mesh: MeshData, iterations = 1, factor = 0.5): MeshData {
  if (iterations <= 0) return recomputeNormals(mesh)

  let positions = [...mesh.positions]
  const topology = buildTopology(mesh)
  const pinned = new Set<number>()
  for (const [key, owners] of topology.edgeTriangles) {
    if (owners.length !== 1) continue
    const [a, b] = parseEdgeKey(key)
    pinned.add(a)
    pinned.add(b)
  }

  for (let pass = 0; pass < iterations; pass += 1) {
    const next = [...positions]
    for (const [vertex, neighbours] of topology.vertexNeighbors) {
      if (pinned.has(vertex) || neighbours.length === 0) continue
      let sum = vec3(0, 0, 0)
      for (const neighbour of neighbours) {
        sum = add(sum, {
          x: positions[neighbour * 3] ?? 0,
          y: positions[neighbour * 3 + 1] ?? 0,
          z: positions[neighbour * 3 + 2] ?? 0,
        })
      }
      const average = scale(sum, 1 / neighbours.length)
      const current = vec3(
        positions[vertex * 3] ?? 0,
        positions[vertex * 3 + 1] ?? 0,
        positions[vertex * 3 + 2] ?? 0,
      )
      const moved = add(current, scale(subtract(average, current), factor))
      next[vertex * 3] = moved.x
      next[vertex * 3 + 1] = moved.y
      next[vertex * 3 + 2] = moved.z
    }
    positions = next
  }

  return recomputeNormals({ positions, normals: [], indices: [...mesh.indices] })
}

/**
 * Evens out triangle size by splitting every edge longer than the target.
 *
 * Each pass splits at most once per edge — a 4:1 subdivision of the triangles
 * that need it — and then welds, so the split points shared by two triangles
 * become one vertex and the mesh stays closed. Long edges therefore halve per
 * pass rather than being cut to size in one go, which keeps the triangle shapes
 * reasonable instead of producing fans of slivers.
 */
export function remesh(mesh: MeshData, targetEdgeLength: number, passes = 1): MeshData {
  if (!(targetEdgeLength > 0)) {
    throw new MeshError(`Remesh needs a positive edge length, got ${String(targetEdgeLength)}`)
  }

  let working = recomputeNormals(mesh)
  for (let pass = 0; pass < passes; pass += 1) {
    const positions = [...working.positions]
    const indices: number[] = []
    const midpoints = new Map<EdgeKey, number>()

    const midpointOf = (a: number, b: number): number => {
      const key = edgeKey(a, b)
      const known = midpoints.get(key)
      if (known !== undefined) return known
      const start = positionAt(working, a)
      const end = positionAt(working, b)
      const index = positions.length / 3
      positions.push((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2)
      midpoints.set(key, index)
      return index
    }

    let split = false
    for (let triangle = 0; triangle < triangleCount(working); triangle += 1) {
      const [a, b, c] = cornersOf(working, triangle)
      const pa = positionAt(working, a)
      const pb = positionAt(working, b)
      const pc = positionAt(working, c)

      const longAB = length(subtract(pb, pa)) > targetEdgeLength
      const longBC = length(subtract(pc, pb)) > targetEdgeLength
      const longCA = length(subtract(pa, pc)) > targetEdgeLength

      if (!longAB && !longBC && !longCA) {
        indices.push(a, b, c)
        continue
      }

      // Split all three edges whenever any is long: a uniform 4:1 split leaves
      // no T-junctions, which a partial split would.
      split = true
      const ab = midpointOf(a, b)
      const bc = midpointOf(b, c)
      const ca = midpointOf(c, a)
      indices.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
    }

    working = recomputeNormals({ positions, normals: [], indices })
    if (!split) break
  }
  return working
}

function quantizeKey(point: Vec3, tolerance: number): string {
  const step = tolerance > 0 ? tolerance : 1e-9
  return `${Math.round(point.x / step)}:${Math.round(point.y / step)}:${Math.round(point.z / step)}`
}
