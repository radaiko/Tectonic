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

export function createEmptyMesh(): MeshData {
  return { positions: [], normals: [], indices: [] }
}

export function vertexCount(mesh: MeshData): number {
  return mesh.positions.length / 3
}

export function triangleCount(mesh: MeshData): number {
  return mesh.indices.length / 3
}
