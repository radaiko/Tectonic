import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { csgIntersect, csgSubtract, csgUnion, meshFromPolygons, polygonsFromMesh } from '../../src/kernel/csg'
import { toMeshData } from '../../src/kernel/StubKernel'
import type { MeshData } from '../../src/domain/MeshData'

const EMPTY: MeshData = { positions: [], normals: [], indices: [] }

function box(size: number, center: [number, number, number] = [0, 0, 0]): MeshData {
  const geometry = new THREE.BoxGeometry(size, size, size)
  geometry.translate(...center)
  return toMeshData(geometry)
}

/** Divergence-theorem volume of a closed triangle mesh. */
function volumeOf(mesh: MeshData): number {
  let total = 0
  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    const [a, b, c] = [0, 1, 2].map((offset) => {
      const index = mesh.indices[i + offset] as number
      return new THREE.Vector3(
        mesh.positions[index * 3] as number,
        mesh.positions[index * 3 + 1] as number,
        mesh.positions[index * 3 + 2] as number,
      )
    }) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]
    total += a.dot(new THREE.Vector3().crossVectors(b, c))
  }
  return Math.abs(total) / 6
}

describe('csg booleans', () => {
  it('unions two overlapping boxes into their combined volume', () => {
    const result = csgUnion(box(10), box(10, [5, 0, 0]))

    // Two 10-cubes offset by 5 share half their volume: 1000 + 1000 - 500.
    expect(volumeOf(result)).toBeCloseTo(1500, 1)
  })

  it('subtracts a smaller box, leaving a notch', () => {
    const result = csgSubtract(box(10), box(4, [5, 0, 0]))

    // The tool overlaps the target over half of its own volume.
    expect(volumeOf(result)).toBeCloseTo(1000 - 32, 1)
  })

  it('intersects two boxes down to their overlap', () => {
    const result = csgIntersect(box(10), box(10, [5, 0, 0]))

    expect(volumeOf(result)).toBeCloseTo(500, 1)
  })

  it('subtracts a fully enclosing tool down to nothing', () => {
    expect(csgSubtract(box(2), box(20)).indices).toHaveLength(0)
  })

  it.each([
    ['union with an empty left', () => csgUnion(EMPTY, box(2)), 8],
    ['union with an empty right', () => csgUnion(box(2), EMPTY), 8],
    ['subtract from nothing', () => csgSubtract(EMPTY, box(2)), 0],
    ['subtract nothing', () => csgSubtract(box(2), EMPTY), 8],
    ['intersect with nothing', () => csgIntersect(box(2), EMPTY), 0],
    ['intersect nothing', () => csgIntersect(EMPTY, box(2)), 0],
  ])('short-circuits %s', (_label, run, expected) => {
    expect(volumeOf(run())).toBeCloseTo(expected, 1)
  })
})

describe('polygon conversion', () => {
  it('drops degenerate triangles', () => {
    const collapsed: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 2, 0, 0],
      normals: [],
      indices: [0, 1, 2],
    }

    expect(polygonsFromMesh(collapsed)).toHaveLength(0)
  })

  it('drops triangles pointing past the end of the vertex array', () => {
    const truncated: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [],
      indices: [0, 1, 9],
    }

    expect(polygonsFromMesh(truncated)).toHaveLength(0)
  })

  it('derives face normals when the source mesh carries none', () => {
    const triangle: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [],
      indices: [0, 1, 2],
    }

    const rebuilt = meshFromPolygons(polygonsFromMesh(triangle))

    expect(rebuilt.normals.slice(0, 3)).toEqual([0, 0, 1])
  })

  it('round-trips a box through polygons unchanged in volume', () => {
    expect(volumeOf(meshFromPolygons(polygonsFromMesh(box(4))))).toBeCloseTo(64, 3)
  })
})
