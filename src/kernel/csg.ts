import type { MeshData } from '../domain/MeshData'

/**
 * Constructive solid geometry on triangle soups, via the classic BSP-tree
 * algorithm. This is what gives the stub kernel real booleans — cuts, holes and
 * shells actually remove material instead of faking it.
 *
 * It works on tessellations, not B-Rep topology, so results carry the usual mesh
 * boolean caveats (T-junctions, no exact surfaces). The WASM kernel replaces it
 * wholesale in a later milestone.
 */

/** Tolerance for classifying a point against a plane. */
const EPSILON = 1e-5

const COPLANAR = 0
const FRONT = 1
const BACK = 2
const SPANNING = 3

/** Guards against pathological inputs blowing the BSP up. */
const MAX_POLYGONS = 200_000

interface Vec {
  readonly x: number
  readonly y: number
  readonly z: number
}

interface CsgVertex {
  readonly pos: Vec
  readonly normal: Vec
}

interface CsgPlane {
  readonly normal: Vec
  readonly w: number
}

interface CsgPolygon {
  readonly vertices: CsgVertex[]
  readonly plane: CsgPlane
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function cross(a: Vec, b: Vec): Vec {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function lerp(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

function negate(a: Vec): Vec {
  return { x: -a.x, y: -a.y, z: -a.z }
}

function lerpVertex(a: CsgVertex, b: CsgVertex, t: number): CsgVertex {
  return { pos: lerp(a.pos, b.pos, t), normal: lerp(a.normal, b.normal, t) }
}

function flipVertex(vertex: CsgVertex): CsgVertex {
  return { pos: vertex.pos, normal: negate(vertex.normal) }
}

function flipPlane(plane: CsgPlane): CsgPlane {
  return { normal: negate(plane.normal), w: -plane.w }
}

function flipPolygon(polygon: CsgPolygon): CsgPolygon {
  return {
    vertices: polygon.vertices.map(flipVertex).reverse(),
    plane: flipPlane(polygon.plane),
  }
}

/** `null` when the three points are collinear — such a triangle carries no area. */
function planeFromPoints(a: Vec, b: Vec, c: Vec): CsgPlane | null {
  const n = cross(sub(b, a), sub(c, a))
  const length = Math.sqrt(dot(n, n))
  if (length < 1e-12) return null
  const normal = { x: n.x / length, y: n.y / length, z: n.z / length }
  return { normal, w: dot(normal, a) }
}

/**
 * Sorts `polygon` into the four buckets relative to `plane`, splitting it in two
 * when it straddles the plane.
 */
function splitPolygon(
  plane: CsgPlane,
  polygon: CsgPolygon,
  coplanarFront: CsgPolygon[],
  coplanarBack: CsgPolygon[],
  front: CsgPolygon[],
  back: CsgPolygon[],
): void {
  let polygonType = 0
  const types: number[] = []

  for (const vertex of polygon.vertices) {
    const distance = dot(plane.normal, vertex.pos) - plane.w
    const type = distance < -EPSILON ? BACK : distance > EPSILON ? FRONT : COPLANAR
    polygonType |= type
    types.push(type)
  }

  switch (polygonType) {
    case COPLANAR:
      (dot(plane.normal, polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon)
      return
    case FRONT:
      front.push(polygon)
      return
    case BACK:
      back.push(polygon)
      return
    default:
      break
  }

  const frontVertices: CsgVertex[] = []
  const backVertices: CsgVertex[] = []
  const count = polygon.vertices.length

  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count
    const ti = types[i] as number
    const tj = types[j] as number
    const vi = polygon.vertices[i] as CsgVertex
    const vj = polygon.vertices[j] as CsgVertex

    if (ti !== BACK) frontVertices.push(vi)
    if (ti !== FRONT) backVertices.push(vi)

    if ((ti | tj) === SPANNING) {
      const t = (plane.w - dot(plane.normal, vi.pos)) / dot(plane.normal, sub(vj.pos, vi.pos))
      const split = lerpVertex(vi, vj, t)
      frontVertices.push(split)
      backVertices.push(split)
    }
  }

  if (frontVertices.length >= 3) front.push({ vertices: frontVertices, plane: polygon.plane })
  if (backVertices.length >= 3) back.push({ vertices: backVertices, plane: polygon.plane })
}

/**
 * A BSP node. Every traversal here is iterative: a BSP built from a degenerate
 * mesh can be as deep as it has polygons, and recursion would overflow.
 */
class Node {
  plane: CsgPlane | null = null
  front: Node | null = null
  back: Node | null = null
  polygons: CsgPolygon[] = []

  static from(polygons: CsgPolygon[]): Node {
    const node = new Node()
    node.build(polygons)
    return node
  }

  build(polygons: CsgPolygon[]): void {
    const stack: [Node, CsgPolygon[]][] = [[this, polygons]]
    while (stack.length > 0) {
      const [node, batch] = stack.pop() as [Node, CsgPolygon[]]
      if (batch.length === 0) continue
      if (!node.plane) node.plane = (batch[0] as CsgPolygon).plane

      const front: CsgPolygon[] = []
      const back: CsgPolygon[] = []
      for (const polygon of batch) {
        splitPolygon(node.plane, polygon, node.polygons, node.polygons, front, back)
      }

      if (front.length > 0) {
        node.front ??= new Node()
        stack.push([node.front, front])
      }
      if (back.length > 0) {
        node.back ??= new Node()
        stack.push([node.back, back])
      }
    }
  }

  /** Drops the parts of `polygons` that fall inside this solid. */
  clipPolygons(polygons: CsgPolygon[]): CsgPolygon[] {
    const kept: CsgPolygon[] = []
    const stack: [Node, CsgPolygon[]][] = [[this, polygons]]

    while (stack.length > 0) {
      const [node, batch] = stack.pop() as [Node, CsgPolygon[]]
      if (batch.length === 0) continue
      if (!node.plane) {
        kept.push(...batch)
        continue
      }

      const front: CsgPolygon[] = []
      const back: CsgPolygon[] = []
      for (const polygon of batch) {
        splitPolygon(node.plane, polygon, front, back, front, back)
      }

      if (node.front) stack.push([node.front, front])
      else kept.push(...front)
      // No back child means "outside the solid there" — those pieces are dropped.
      if (node.back) stack.push([node.back, back])
    }

    return kept
  }

  clipTo(other: Node): void {
    const stack: Node[] = [this]
    while (stack.length > 0) {
      const node = stack.pop() as Node
      node.polygons = other.clipPolygons(node.polygons)
      if (node.front) stack.push(node.front)
      if (node.back) stack.push(node.back)
    }
  }

  /** Turns the solid inside out — the complement operation booleans are built on. */
  invert(): void {
    const stack: Node[] = [this]
    while (stack.length > 0) {
      const node = stack.pop() as Node
      node.polygons = node.polygons.map(flipPolygon)
      if (node.plane) node.plane = flipPlane(node.plane)
      const front = node.front
      node.front = node.back
      node.back = front
      if (node.front) stack.push(node.front)
      if (node.back) stack.push(node.back)
    }
  }

  allPolygons(): CsgPolygon[] {
    const result: CsgPolygon[] = []
    const stack: Node[] = [this]
    while (stack.length > 0) {
      const node = stack.pop() as Node
      result.push(...node.polygons)
      if (node.front) stack.push(node.front)
      if (node.back) stack.push(node.back)
    }
    return result
  }
}

/** Splits a mesh into triangle polygons, discarding degenerate faces. */
export function polygonsFromMesh(mesh: MeshData): CsgPolygon[] {
  const polygons: CsgPolygon[] = []
  const hasNormals = mesh.normals.length === mesh.positions.length

  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    const vertices: CsgVertex[] = []
    let degenerate = false

    for (let corner = 0; corner < 3; corner += 1) {
      const index = mesh.indices[i + corner] as number
      const base = index * 3
      const x = mesh.positions[base]
      const y = mesh.positions[base + 1]
      const z = mesh.positions[base + 2]
      if (x === undefined || y === undefined || z === undefined) {
        degenerate = true
        break
      }
      vertices.push({
        pos: { x, y, z },
        normal: hasNormals
          ? {
              x: mesh.normals[base] as number,
              y: mesh.normals[base + 1] as number,
              z: mesh.normals[base + 2] as number,
            }
          : { x: 0, y: 0, z: 0 },
      })
    }
    if (degenerate) continue

    const plane = planeFromPoints(
      (vertices[0] as CsgVertex).pos,
      (vertices[1] as CsgVertex).pos,
      (vertices[2] as CsgVertex).pos,
    )
    if (!plane) continue

    if (!hasNormals) {
      polygons.push({ vertices: vertices.map((v) => ({ pos: v.pos, normal: plane.normal })), plane })
    } else {
      polygons.push({ vertices, plane })
    }
  }

  return polygons
}

/** Fan-triangulates polygons back into an indexed mesh. */
export function meshFromPolygons(polygons: readonly CsgPolygon[]): MeshData {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  for (const polygon of polygons) {
    const base = positions.length / 3
    for (const vertex of polygon.vertices) {
      positions.push(vertex.pos.x, vertex.pos.y, vertex.pos.z)
      normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z)
    }
    for (let i = 2; i < polygon.vertices.length; i += 1) {
      indices.push(base, base + i - 1, base + i)
    }
  }

  return { positions, normals, indices }
}

function isEmpty(mesh: MeshData): boolean {
  return mesh.indices.length < 3
}

function guardSize(a: CsgPolygon[], b: CsgPolygon[], operation: string): void {
  if (a.length + b.length > MAX_POLYGONS) {
    throw new Error(`${operation} input is too large for the mesh CSG backend`)
  }
}

export function csgUnion(a: MeshData, b: MeshData): MeshData {
  if (isEmpty(a)) return b
  if (isEmpty(b)) return a

  const left = polygonsFromMesh(a)
  const right = polygonsFromMesh(b)
  guardSize(left, right, 'Union')

  const nodeA = Node.from(left)
  const nodeB = Node.from(right)

  nodeA.clipTo(nodeB)
  nodeB.clipTo(nodeA)
  nodeB.invert()
  nodeB.clipTo(nodeA)
  nodeB.invert()
  nodeA.build(nodeB.allPolygons())

  return meshFromPolygons(nodeA.allPolygons())
}

export function csgSubtract(a: MeshData, b: MeshData): MeshData {
  if (isEmpty(a)) return a
  if (isEmpty(b)) return a

  const left = polygonsFromMesh(a)
  const right = polygonsFromMesh(b)
  guardSize(left, right, 'Subtract')

  const nodeA = Node.from(left)
  const nodeB = Node.from(right)

  nodeA.invert()
  nodeA.clipTo(nodeB)
  nodeB.clipTo(nodeA)
  nodeB.invert()
  nodeB.clipTo(nodeA)
  nodeB.invert()
  nodeA.build(nodeB.allPolygons())
  nodeA.invert()

  return meshFromPolygons(nodeA.allPolygons())
}

export function csgIntersect(a: MeshData, b: MeshData): MeshData {
  if (isEmpty(a) || isEmpty(b)) return { positions: [], normals: [], indices: [] }

  const left = polygonsFromMesh(a)
  const right = polygonsFromMesh(b)
  guardSize(left, right, 'Intersect')

  const nodeA = Node.from(left)
  const nodeB = Node.from(right)

  nodeA.invert()
  nodeB.clipTo(nodeA)
  nodeB.invert()
  nodeA.clipTo(nodeB)
  nodeB.clipTo(nodeA)
  nodeA.build(nodeB.allPolygons())
  nodeA.invert()

  return meshFromPolygons(nodeA.allPolygons())
}
