import type { MeshData } from '../domain/MeshData'
import { positionAt, recomputeNormals, triangleCount, vertexCount } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { add, cross, length, normalize, rotateAbout, scale, subtract, vec3 } from '../domain/vec3'
import { csgIntersect, csgSubtract, csgUnion } from '../kernel/csg'
import type { EdgeKey } from './types'
import { MeshError, boundaryLoops, buildTopology, cornersOf, edgeKey, parseEdgeKey } from './types'

/**
 * Direct editing of a triangle mesh: select, move, and change the topology.
 *
 * Every function here takes a mesh and returns a new one. Meshes are cheap flat
 * arrays and the editor needs undo anyway, so copying beats mutating in place —
 * and it means no operation can leave a half-edited mesh behind when it throws.
 */

/** What is currently picked. All three kinds can be selected at once. */
export interface MeshSelection {
  readonly vertices: readonly number[]
  readonly edges: readonly EdgeKey[]
  readonly faces: readonly number[]
}

export const EMPTY_SELECTION: MeshSelection = { vertices: [], edges: [], faces: [] }

export function createSelection(init: Partial<MeshSelection> = {}): MeshSelection {
  return {
    vertices: [...(init.vertices ?? [])],
    edges: [...(init.edges ?? [])],
    faces: [...(init.faces ?? [])],
  }
}

export function isSelectionEmpty(selection: MeshSelection): boolean {
  return (
    selection.vertices.length === 0 &&
    selection.edges.length === 0 &&
    selection.faces.length === 0
  )
}

/**
 * Every vertex the selection touches, however it was picked.
 *
 * Transformations work on vertices, so selecting a face and selecting its three
 * corners must move the same points — resolving to vertices up front is what
 * makes that true without three copies of every transform.
 */
export function selectedVertices(mesh: MeshData, selection: MeshSelection): number[] {
  const vertices = new Set<number>(selection.vertices)
  for (const key of selection.edges) {
    const [a, b] = parseEdgeKey(key)
    vertices.add(a)
    vertices.add(b)
  }
  for (const face of selection.faces) {
    for (const corner of cornersOf(mesh, face)) vertices.add(corner)
  }
  return [...vertices].filter((vertex) => vertex >= 0 && vertex < vertexCount(mesh)).sort((a, b) => a - b)
}

/** The centre of the selection — the pivot a rotation or a scale defaults to. */
export function selectionCenter(mesh: MeshData, selection: MeshSelection): Vec3 {
  const vertices = selectedVertices(mesh, selection)
  if (vertices.length === 0) return vec3(0, 0, 0)
  let total = vec3(0, 0, 0)
  for (const vertex of vertices) total = add(total, positionAt(mesh, vertex))
  return scale(total, 1 / vertices.length)
}

/** The area-weighted average normal of the selected faces. */
export function selectionNormal(mesh: MeshData, selection: MeshSelection): Vec3 {
  const topology = buildTopology(mesh)
  let total = vec3(0, 0, 0)
  for (const face of selection.faces) {
    const normal = topology.faceNormals[face]
    const weight = topology.doubleAreas[face] ?? 0
    if (normal) total = add(total, scale(normal, weight))
  }
  return length(total) === 0 ? vec3(0, 0, 1) : normalize(total)
}

/* -------------------------------------------------------------------------- */
/* Transformations                                                             */
/* -------------------------------------------------------------------------- */

/** Moves the selected vertices, leaving the rest of the mesh alone. */
export function translateSelection(
  mesh: MeshData,
  selection: MeshSelection,
  delta: Vec3,
): MeshData {
  return mapSelected(mesh, selection, (point) => add(point, delta))
}

export function rotateSelection(
  mesh: MeshData,
  selection: MeshSelection,
  axis: Vec3,
  degrees: number,
  origin?: Vec3,
): MeshData {
  if (length(axis) === 0) throw new MeshError('A rotation needs an axis with a direction')
  const pivot = origin ?? selectionCenter(mesh, selection)
  const radians = (degrees * Math.PI) / 180
  return mapSelected(mesh, selection, (point) =>
    add(pivot, rotateAbout(subtract(point, pivot), axis, radians)),
  )
}

export function scaleSelection(
  mesh: MeshData,
  selection: MeshSelection,
  factor: number | Vec3,
  origin?: Vec3,
): MeshData {
  const pivot = origin ?? selectionCenter(mesh, selection)
  const factors = typeof factor === 'number' ? vec3(factor, factor, factor) : factor
  return mapSelected(mesh, selection, (point) => ({
    x: pivot.x + (point.x - pivot.x) * factors.x,
    y: pivot.y + (point.y - pivot.y) * factors.y,
    z: pivot.z + (point.z - pivot.z) * factors.z,
  }))
}

function mapSelected(
  mesh: MeshData,
  selection: MeshSelection,
  move: (point: Vec3) => Vec3,
): MeshData {
  const vertices = new Set(selectedVertices(mesh, selection))
  if (vertices.size === 0) return recomputeNormals(mesh)

  const positions = [...mesh.positions]
  for (const vertex of vertices) {
    const moved = move(positionAt(mesh, vertex))
    positions[vertex * 3] = moved.x
    positions[vertex * 3 + 1] = moved.y
    positions[vertex * 3 + 2] = moved.z
  }
  return recomputeNormals({ positions, normals: [], indices: [...mesh.indices] })
}

/* -------------------------------------------------------------------------- */
/* Topology edits                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Push/pull: lifts the selected faces along their normal and walls in the gap.
 *
 * The selected region is detached — it gets its own copy of every corner — so
 * only the lifted faces move and the surrounding surface stays put. The rim
 * between the old position and the new is then stitched with two triangles per
 * boundary edge, which is what turns a lifted patch into a closed extrusion.
 */
export function extrudeFaces(
  mesh: MeshData,
  faces: readonly number[],
  distance: number,
  direction?: Vec3,
): MeshData {
  if (faces.length === 0) throw new MeshError('Extrude needs at least one face selected')
  const topology = buildTopology(mesh)
  const selected = new Set(faces)
  for (const face of selected) {
    if (face < 0 || face >= topology.triangleCount) {
      throw new MeshError(`No face ${face} in this mesh`)
    }
  }

  const offset = direction
    ? scale(normalize(direction), distance)
    : scale(selectionNormal(mesh, { ...EMPTY_SELECTION, faces: [...selected] }), distance)

  const positions = [...mesh.positions]
  const indices: number[] = []
  const lifted = new Map<number, number>()

  const liftedIndex = (vertex: number): number => {
    const known = lifted.get(vertex)
    if (known !== undefined) return known
    const moved = add(positionAt(mesh, vertex), offset)
    const index = positions.length / 3
    positions.push(moved.x, moved.y, moved.z)
    lifted.set(vertex, index)
    return index
  }

  // Untouched faces keep their corners; selected ones move to the lifted copies.
  for (let triangle = 0; triangle < topology.triangleCount; triangle += 1) {
    const [a, b, c] = cornersOf(mesh, triangle)
    if (selected.has(triangle)) {
      indices.push(liftedIndex(a), liftedIndex(b), liftedIndex(c))
    } else {
      indices.push(a, b, c)
    }
  }

  // The rim: every edge of the selection with only one selected owner.
  for (const face of selected) {
    const corners = cornersOf(mesh, face)
    for (let corner = 0; corner < 3; corner += 1) {
      const from = corners[corner] as number
      const to = corners[(corner + 1) % 3] as number
      const owners = topology.edgeTriangles.get(edgeKey(from, to)) ?? []
      if (owners.some((owner) => owner !== face && selected.has(owner))) continue

      const liftedFrom = liftedIndex(from)
      const liftedTo = liftedIndex(to)
      // Wound so the wall faces outwards for a positive lift.
      indices.push(from, to, liftedTo, from, liftedTo, liftedFrom)
    }
  }

  return recomputeNormals({ positions, normals: [], indices })
}

/**
 * Bevels an edge by pulling its two triangles back and bridging the gap.
 *
 * Each of the two triangles keeps its own copy of the edge, moved inwards
 * towards the triangle's own centroid by `width`. The strip between the two
 * copies becomes the bevel face. A boundary edge has nothing to bevel against
 * and is refused rather than silently left alone.
 */
export function bevelEdge(mesh: MeshData, edge: EdgeKey, width: number): MeshData {
  if (!(width > 0)) throw new MeshError(`A bevel needs a positive width, got ${String(width)}`)

  const topology = buildTopology(mesh)
  const owners = topology.edgeTriangles.get(edge)
  if (!owners || owners.length !== 2) {
    throw new MeshError(`Edge ${edge} is not shared by exactly two faces, so it cannot be bevelled`)
  }

  const [a, b] = parseEdgeKey(edge)
  const positions = [...mesh.positions]
  const indices = [...mesh.indices]
  const copies: { readonly a: number; readonly b: number }[] = []

  for (const triangle of owners) {
    const corners = cornersOf(mesh, triangle)
    const opposite = corners.find((corner) => corner !== a && corner !== b)
    if (opposite === undefined) throw new MeshError(`Face ${triangle} is degenerate`)

    const away = normalize(
      subtract(positionAt(mesh, opposite), midpoint(positionAt(mesh, a), positionAt(mesh, b))),
    )
    const shiftA = add(positionAt(mesh, a), scale(away, width))
    const shiftB = add(positionAt(mesh, b), scale(away, width))

    const indexA = positions.length / 3
    positions.push(shiftA.x, shiftA.y, shiftA.z)
    const indexB = positions.length / 3
    positions.push(shiftB.x, shiftB.y, shiftB.z)
    copies.push({ a: indexA, b: indexB })

    // Rewrite this triangle onto its own pulled-back copy of the edge.
    for (let corner = 0; corner < 3; corner += 1) {
      const at = triangle * 3 + corner
      if (indices[at] === a) indices[at] = indexA
      else if (indices[at] === b) indices[at] = indexB
    }
  }

  const [first, second] = copies as [{ a: number; b: number }, { a: number; b: number }]
  indices.push(first.a, first.b, second.b, first.a, second.b, second.a)
  return recomputeNormals({ positions, normals: [], indices })
}

/**
 * Bridges two edge loops with a band of quads.
 *
 * The loops are matched by walking both from the pair of vertices that are
 * closest together, and the second loop is reversed when that produces a shorter
 * total run — without that, two loops wound opposite ways bridge into a twisted
 * band rather than a tube.
 */
export function bridgeLoops(
  mesh: MeshData,
  loopA: readonly number[],
  loopB: readonly number[],
): MeshData {
  if (loopA.length < 3 || loopB.length < 3) {
    throw new MeshError('A bridge needs two loops of at least three vertices')
  }
  if (loopA.length !== loopB.length) {
    throw new MeshError(
      `A bridge needs loops of equal length, got ${loopA.length} and ${loopB.length}`,
    )
  }

  const aligned = alignLoop(mesh, loopA, loopB)
  const indices = [...mesh.indices]

  for (let step = 0; step < loopA.length; step += 1) {
    const a0 = loopA[step] as number
    const a1 = loopA[(step + 1) % loopA.length] as number
    const b0 = aligned[step] as number
    const b1 = aligned[(step + 1) % aligned.length] as number
    indices.push(a0, a1, b1, a0, b1, b0)
  }

  return recomputeNormals({ positions: [...mesh.positions], normals: [], indices })
}

function alignLoop(
  mesh: MeshData,
  loopA: readonly number[],
  loopB: readonly number[],
): number[] {
  const start = positionAt(mesh, loopA[0] as number)
  let best = 0
  let bestDistance = Infinity
  for (let index = 0; index < loopB.length; index += 1) {
    const distance = length(subtract(positionAt(mesh, loopB[index] as number), start))
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  }

  const forward = loopB.slice(best).concat(loopB.slice(0, best))
  const backward = [forward[0] as number, ...forward.slice(1).reverse()]
  return totalRun(mesh, loopA, forward) <= totalRun(mesh, loopA, backward) ? forward : backward
}

function totalRun(mesh: MeshData, loopA: readonly number[], loopB: readonly number[]): number {
  let total = 0
  for (let index = 0; index < loopA.length; index += 1) {
    total += length(
      subtract(
        positionAt(mesh, loopB[index] as number),
        positionAt(mesh, loopA[index] as number),
      ),
    )
  }
  return total
}

/**
 * Caps one opening with a fan from its centroid.
 *
 * Pass a loop to close a particular hole; leave it out to close the first one
 * found. Closing every hole at once is {@link fillHoles} in `MeshImport` — this
 * is the interactive version, where the user picked which opening they meant.
 */
export function fillHole(mesh: MeshData, loop?: readonly number[]): MeshData {
  const target = loop ?? boundaryLoops(buildTopology(mesh))[0]
  if (!target || target.length < 3) throw new MeshError('No hole to fill')

  const positions = [...mesh.positions]
  const indices = [...mesh.indices]

  let centre = vec3(0, 0, 0)
  for (const vertex of target) centre = add(centre, positionAt(mesh, vertex))
  centre = scale(centre, 1 / target.length)

  const hub = positions.length / 3
  positions.push(centre.x, centre.y, centre.z)
  for (let corner = 0; corner < target.length; corner += 1) {
    indices.push(hub, target[corner] as number, target[(corner + 1) % target.length] as number)
  }

  return recomputeNormals({ positions, normals: [], indices })
}

/** Splits an edge at its midpoint, dividing both faces that use it. */
export function splitEdge(mesh: MeshData, edge: EdgeKey): MeshData {
  const topology = buildTopology(mesh)
  const owners = topology.edgeTriangles.get(edge)
  if (!owners || owners.length === 0) throw new MeshError(`No edge ${edge} in this mesh`)

  const [a, b] = parseEdgeKey(edge)
  const positions = [...mesh.positions]
  const middle = midpoint(positionAt(mesh, a), positionAt(mesh, b))
  const inserted = positions.length / 3
  positions.push(middle.x, middle.y, middle.z)

  const owning = new Set(owners)
  const indices: number[] = []
  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const corners = cornersOf(mesh, triangle)
    if (!owning.has(triangle)) {
      indices.push(...corners)
      continue
    }
    // Re-fan the triangle about the new point, keeping the winding.
    for (let corner = 0; corner < 3; corner += 1) {
      const from = corners[corner] as number
      const to = corners[(corner + 1) % 3] as number
      const rest = corners[(corner + 2) % 3] as number
      if ((from === a && to === b) || (from === b && to === a)) {
        indices.push(from, inserted, rest, inserted, to, rest)
        break
      }
    }
  }

  return recomputeNormals({ positions, normals: [], indices })
}

/** Removes the selected faces, leaving a hole behind. */
export function deleteFaces(mesh: MeshData, faces: readonly number[]): MeshData {
  const removing = new Set(faces)
  const indices: number[] = []
  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    if (removing.has(triangle)) continue
    indices.push(...cornersOf(mesh, triangle))
  }
  return recomputeNormals({ positions: [...mesh.positions], normals: [], indices })
}

/* -------------------------------------------------------------------------- */
/* Booleans                                                                    */
/* -------------------------------------------------------------------------- */

export const MESH_BOOLEANS = ['union', 'subtract', 'intersect'] as const
export type MeshBoolean = (typeof MESH_BOOLEANS)[number]

/**
 * Combines two meshes.
 *
 * This runs on the BSP-based CSG the stub kernel already uses, so it works on
 * triangle soups with no B-Rep behind them — which is the whole point in the
 * mesh environment, where there is no B-Rep to be had.
 */
export function meshBoolean(a: MeshData, b: MeshData, operation: MeshBoolean): MeshData {
  switch (operation) {
    case 'union':
      return csgUnion(a, b)
    case 'subtract':
      return csgSubtract(a, b)
    case 'intersect':
      return csgIntersect(a, b)
  }
}

/* -------------------------------------------------------------------------- */
/* Picking                                                                     */
/* -------------------------------------------------------------------------- */

/** The nearest vertex to a point, or `undefined` when the mesh has none. */
export function nearestVertex(mesh: MeshData, point: Vec3): number | undefined {
  let best: number | undefined
  let bestDistance = Infinity
  for (let vertex = 0; vertex < vertexCount(mesh); vertex += 1) {
    const distance = length(subtract(positionAt(mesh, vertex), point))
    if (distance < bestDistance) {
      bestDistance = distance
      best = vertex
    }
  }
  return best
}

/**
 * Every face reachable from a seed without crossing an edge sharper than
 * `angleDegrees` — the "select connected coplanar" that makes picking a flat
 * face of a tessellated model bearable.
 */
export function growFaceSelection(
  mesh: MeshData,
  seed: number,
  angleDegrees = 1,
): number[] {
  const topology = buildTopology(mesh)
  if (seed < 0 || seed >= topology.triangleCount) return []
  const threshold = Math.cos((Math.max(0, angleDegrees) * Math.PI) / 180)

  const found = new Set<number>([seed])
  const queue = [seed]
  while (queue.length > 0) {
    const triangle = queue.pop() as number
    const normal = topology.faceNormals[triangle]
    const corners = cornersOf(mesh, triangle)

    for (let corner = 0; corner < 3; corner += 1) {
      const key = edgeKey(corners[corner] as number, corners[(corner + 1) % 3] as number)
      for (const other of topology.edgeTriangles.get(key) ?? []) {
        if (found.has(other)) continue
        const otherNormal = topology.faceNormals[other]
        if (!normal || !otherNormal) continue
        if (normal.x * otherNormal.x + normal.y * otherNormal.y + normal.z * otherNormal.z < threshold) {
          continue
        }
        found.add(other)
        queue.push(other)
      }
    }
  }
  return [...found].sort((a, b) => a - b)
}

/** The area of one triangle — what the editor's status bar reports. */
export function faceArea(mesh: MeshData, face: number): number {
  const corners = cornersOf(mesh, face)
  const a = positionAt(mesh, corners[0])
  const b = positionAt(mesh, corners[1])
  const c = positionAt(mesh, corners[2])
  return length(cross(subtract(b, a), subtract(c, a))) / 2
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}
