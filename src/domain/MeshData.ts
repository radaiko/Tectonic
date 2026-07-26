/**
 * Renderer-agnostic triangle mesh. Flat arrays keep this JSON-serializable so a
 * body's tessellation can round-trip through the .tectonic format unchanged.
 */
export interface MeshData {
  /** Flat [x, y, z, ...] triples — length is a multiple of 3. */
  readonly positions: number[]
  /** Flat [x, y, z, ...] triples, one per vertex, parallel to `positions`. */
  readonly normals: number[]
  /** Triangle indices into the vertex arrays — length is a multiple of 3. */
  readonly indices: number[]
}

/** A point in world space. Structurally the kernel's `Vec3`, without the import. */
export interface MeshPoint {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Axis-aligned extent of a mesh. Degenerate (all zero) for an empty mesh. */
export interface MeshBounds {
  readonly min: MeshPoint
  readonly max: MeshPoint
}

export function createEmptyMesh(): MeshData {
  return { positions: [], normals: [], indices: [] }
}

export function vertexCount(mesh: MeshData): number {
  return mesh.positions.length / 3
}

export function triangleCount(mesh: MeshData): number {
  return mesh.indices.length / 3
}

export function positionAt(mesh: MeshData, vertex: number): MeshPoint {
  return {
    x: mesh.positions[vertex * 3] ?? 0,
    y: mesh.positions[vertex * 3 + 1] ?? 0,
    z: mesh.positions[vertex * 3 + 2] ?? 0,
  }
}

export function normalAt(mesh: MeshData, vertex: number): MeshPoint {
  return {
    x: mesh.normals[vertex * 3] ?? 0,
    y: mesh.normals[vertex * 3 + 1] ?? 0,
    z: mesh.normals[vertex * 3 + 2] ?? 0,
  }
}

/** The three corners of a triangle, in winding order. */
export function triangleAt(mesh: MeshData, triangle: number): [MeshPoint, MeshPoint, MeshPoint] {
  return [
    positionAt(mesh, mesh.indices[triangle * 3] ?? 0),
    positionAt(mesh, mesh.indices[triangle * 3 + 1] ?? 0),
    positionAt(mesh, mesh.indices[triangle * 3 + 2] ?? 0),
  ]
}

/** Unit normal of a triangle, or a zero vector when it is degenerate. */
export function faceNormal(a: MeshPoint, b: MeshPoint, c: MeshPoint): MeshPoint {
  const ux = b.x - a.x
  const uy = b.y - a.y
  const uz = b.z - a.z
  const vx = c.x - a.x
  const vy = c.y - a.y
  const vz = c.z - a.z
  const x = uy * vz - uz * vy
  const y = uz * vx - ux * vz
  const z = ux * vy - uy * vx
  const magnitude = Math.hypot(x, y, z)
  return magnitude === 0 ? { x: 0, y: 0, z: 0 } : { x: x / magnitude, y: y / magnitude, z: z / magnitude }
}

export function meshBounds(mesh: MeshData): MeshBounds {
  if (mesh.positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
  }

  const low = [Infinity, Infinity, Infinity]
  const high = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index + 2 < mesh.positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = mesh.positions[index + axis] as number
      low[axis] = Math.min(low[axis] as number, value)
      high[axis] = Math.max(high[axis] as number, value)
    }
  }
  return {
    min: { x: low[0] as number, y: low[1] as number, z: low[2] as number },
    max: { x: high[0] as number, y: high[1] as number, z: high[2] as number },
  }
}

/** Concatenates meshes into one, shifting each block's indices into place. */
export function mergeMeshes(meshes: readonly MeshData[]): MeshData {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  for (const mesh of meshes) {
    const offset = positions.length / 3
    positions.push(...mesh.positions)
    normals.push(...mesh.normals)
    for (const index of mesh.indices) indices.push(index + offset)
  }
  return { positions, normals, indices }
}

/**
 * Area-weighted vertex normals derived from the triangles. Used wherever a mesh
 * is assembled position-first — imported geometry, surface construction — so the
 * normals always agree with the winding rather than with whatever a file claimed.
 */
export function recomputeNormals(mesh: MeshData): MeshData {
  const normals = new Array<number>(mesh.positions.length).fill(0)

  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const [a, b, c] = triangleAt(mesh, triangle)
    const normal = faceNormal(a, b, c)
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = mesh.indices[triangle * 3 + corner] as number
      normals[vertex * 3] = (normals[vertex * 3] ?? 0) + normal.x
      normals[vertex * 3 + 1] = (normals[vertex * 3 + 1] ?? 0) + normal.y
      normals[vertex * 3 + 2] = (normals[vertex * 3 + 2] ?? 0) + normal.z
    }
  }

  for (let vertex = 0; vertex * 3 + 2 < normals.length; vertex += 1) {
    const x = normals[vertex * 3] as number
    const y = normals[vertex * 3 + 1] as number
    const z = normals[vertex * 3 + 2] as number
    const magnitude = Math.hypot(x, y, z)
    if (magnitude === 0) continue
    normals[vertex * 3] = x / magnitude
    normals[vertex * 3 + 1] = y / magnitude
    normals[vertex * 3 + 2] = z / magnitude
  }

  return { positions: [...mesh.positions], normals, indices: [...mesh.indices] }
}
