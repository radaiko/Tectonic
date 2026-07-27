import { describe, expect, it } from 'vitest'
import type { MeshData } from '../../src/domain/MeshData'
import { recomputeNormals, triangleCount } from '../../src/domain/MeshData'
import type { MeshFace } from '../../src/diff/faceGroups'
import {
  DEFAULT_CREASE_ANGLE,
  faceMesh,
  meshFaces,
  weldIndices,
} from '../../src/diff/faceGroups'
import { boxMesh, triangleMesh } from '../helpers/meshes'

/** A regular n-sided prism about the Z axis: one smooth side, two flat caps. */
function cylinderMesh(sides = 16, radius = 1, height = 2): MeshData {
  const positions: number[] = []
  const indices: number[] = []

  for (let side = 0; side < sides; side += 1) {
    const angle = (side / sides) * Math.PI * 2
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
  }
  for (let side = 0; side < sides; side += 1) {
    const angle = (side / sides) * Math.PI * 2
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, height)
  }
  const bottomCentre = positions.length / 3
  positions.push(0, 0, 0)
  const topCentre = positions.length / 3
  positions.push(0, 0, height)

  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides
    indices.push(side, next, sides + next, side, sides + next, sides + side)
    indices.push(bottomCentre, next, side)
    indices.push(topCentre, sides + side, sides + next)
  }
  return recomputeNormals({ positions, normals: [], indices })
}

describe('weldIndices', () => {
  it('collapses duplicated vertices onto the first one seen', () => {
    const mesh: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 0, 0, 0],
      normals: [],
      indices: [0, 1, 2],
    }

    expect(weldIndices(mesh, 1e-6)).toEqual([0, 1, 0])
  })

  it('keeps vertices further apart than the tolerance distinct', () => {
    const mesh: MeshData = { positions: [0, 0, 0, 1, 0, 0], normals: [], indices: [] }

    expect(weldIndices(mesh, 1e-6)).toEqual([0, 1])
  })

  it('falls back to a usable grid when handed a non-positive tolerance', () => {
    const mesh: MeshData = { positions: [0, 0, 0, 5, 0, 0], normals: [], indices: [] }

    expect(weldIndices(mesh, 0)).toEqual([0, 1])
  })
})

describe('meshFaces', () => {
  it('has nothing to group in an empty mesh', () => {
    expect(meshFaces({ positions: [], normals: [], indices: [] })).toEqual([])
  })

  it('finds the six sides of a box', () => {
    const faces = meshFaces(boxMesh(2, 3, 4))

    expect(faces).toHaveLength(6)
    // Every triangle ends up in exactly one face.
    expect(faces.reduce((total, face) => total + face.triangles.length, 0)).toBe(12)
  })

  it('measures each box face at its true area', () => {
    const faces = meshFaces(boxMesh(2, 3, 4))
    const areas = faces.map((face) => face.area).sort((a, b) => a - b)

    expect(areas).toEqual([6, 6, 8, 8, 12, 12])
  })

  it('reports outward normals and centroids on the box faces', () => {
    const faces = meshFaces(boxMesh(2, 2, 2))
    const top = faces.find((face) => face.normal.z > 0.99)

    expect(top).toBeDefined()
    expect(top?.centroid).toEqual({ x: 1, y: 1, z: 2 })
  })

  it('keeps a tessellated cylinder wall as one face', () => {
    const faces = meshFaces(cylinderMesh(16))

    // The wall plus two caps — the wall's facets are within the crease angle.
    expect(faces).toHaveLength(3)
    const wall = faces.find((face) => face.triangles.length === 32)
    expect(wall).toBeDefined()
    expect(Math.abs(wall?.normal.z ?? 1)).toBeLessThan(1e-9)
  })

  it('splits the cylinder wall apart when the crease angle is tight enough', () => {
    // Each facet of a 16-sided prism turns 22.5 degrees from the last.
    const faces = meshFaces(cylinderMesh(16), { creaseAngle: (10 * Math.PI) / 180 })

    expect(faces.length).toBeGreaterThan(3)
  })

  it('groups a lone triangle as a single face', () => {
    const faces = meshFaces(triangleMesh())

    expect(faces).toHaveLength(1)
    expect(faces[0]?.area).toBeCloseTo(0.5, 12)
  })

  it('drops degenerate triangles rather than seeding a face from them', () => {
    const mesh: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 2, 0, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      indices: [0, 1, 2],
    }

    expect(triangleCount(mesh)).toBe(1)
    expect(meshFaces(mesh)).toEqual([])
  })

  it('numbers faces in discovery order', () => {
    const faces = meshFaces(boxMesh())

    expect(faces.map((face) => face.index)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('defaults the crease angle to thirty degrees', () => {
    expect(DEFAULT_CREASE_ANGLE).toBeCloseTo(Math.PI / 6, 12)
  })
})

describe('faceMesh', () => {
  /** The upward-facing side of a box, which every case below extracts. */
  function topFace(box: MeshData): MeshFace {
    const face = meshFaces(box).find((candidate) => candidate.normal.z > 0.99)
    if (!face) throw new Error('the box has no upward face')
    return face
  }

  it('extracts a face as a standalone mesh', () => {
    const box = boxMesh(2, 2, 2)
    const extracted = faceMesh(box, topFace(box))

    expect(triangleCount(extracted)).toBe(2)
    expect(extracted.positions).toHaveLength(18)
    expect(extracted.indices).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('gives every extracted vertex the normal of its own triangle', () => {
    const box = boxMesh(2, 2, 2)
    const extracted = faceMesh(box, topFace(box))

    for (let vertex = 0; vertex < 6; vertex += 1) {
      expect(extracted.normals[vertex * 3 + 2]).toBeCloseTo(1, 12)
    }
  })
})
