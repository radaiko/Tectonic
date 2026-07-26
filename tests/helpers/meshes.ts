import type { MeshData } from '../../src/domain/MeshData'
import { recomputeNormals } from '../../src/domain/MeshData'

/** A single triangle in the z = 0 plane, wound counter-clockwise. */
export function triangleMesh(): MeshData {
  return recomputeNormals({
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    normals: [],
    indices: [0, 1, 2],
  })
}

/** An axis-aligned box from the origin, 12 triangles with outward normals. */
export function boxMesh(sizeX = 1, sizeY = 1, sizeZ = 1): MeshData {
  const corners: [number, number, number][] = [
    [0, 0, 0],
    [sizeX, 0, 0],
    [sizeX, sizeY, 0],
    [0, sizeY, 0],
    [0, 0, sizeZ],
    [sizeX, 0, sizeZ],
    [sizeX, sizeY, sizeZ],
    [0, sizeY, sizeZ],
  ]

  const faces: [number, number, number, number][] = [
    [0, 3, 2, 1], // bottom, normal -z
    [4, 5, 6, 7], // top, normal +z
    [0, 1, 5, 4], // front, normal -y
    [1, 2, 6, 5], // right, normal +x
    [2, 3, 7, 6], // back, normal +y
    [3, 0, 4, 7], // left, normal -x
  ]

  const positions: number[] = []
  const indices: number[] = []
  for (const [a, b, c, d] of faces) {
    const base = positions.length / 3
    for (const corner of [a, b, c, d]) positions.push(...(corners[corner] as number[]))
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  return recomputeNormals({ positions, normals: [], indices })
}
