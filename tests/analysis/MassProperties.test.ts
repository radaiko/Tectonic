import { describe, expect, it } from 'vitest'
import { createEmptyMesh } from '../../src/domain/MeshData'
import { equals, vec3 } from '../../src/domain/vec3'
import {
  DEFAULT_DENSITY,
  addMatrix,
  massProperties,
  scaleMatrix,
  subtractMatrix,
  symmetricEigen,
} from '../../src/analysis/MassProperties'
import type { Matrix3 } from '../../src/analysis/MassProperties'
import {
  bodiesInterfere,
  minimumDistance,
  minimumDistanceBetweenTriangles,
} from '../../src/analysis/MinimumDistance'
import { boxMesh, triangleMesh } from '../helpers/meshes'

/** Shifts every vertex of a mesh along X, keeping the winding. */
function shiftX(mesh: ReturnType<typeof boxMesh>, dx: number): ReturnType<typeof boxMesh> {
  return {
    ...mesh,
    positions: mesh.positions.map((value, index) => (index % 3 === 0 ? value + dx : value)),
  }
}

describe('massProperties', () => {
  it('measures the volume and centre of mass of a box', () => {
    const properties = massProperties(boxMesh(2, 4, 6))
    expect(properties.volume).toBeCloseTo(48)
    expect(properties.density).toBe(DEFAULT_DENSITY)
    expect(properties.mass).toBeCloseTo(48)
    expect(equals(properties.centroid, vec3(1, 2, 3), 1e-9)).toBe(true)
    expect(properties.surfaceArea).toBeCloseTo(2 * (2 * 4 + 4 * 6 + 2 * 6))
  })

  it('scales mass with density but not volume', () => {
    const properties = massProperties(boxMesh(2, 2, 2), { density: 7.85 })
    expect(properties.volume).toBeCloseTo(8)
    expect(properties.mass).toBeCloseTo(8 * 7.85)
  })

  it('matches the textbook inertia of a solid cuboid', () => {
    // I = m/12 · (b² + c²) about each axis through the centre of mass.
    const width = 2
    const depth = 4
    const height = 6
    const properties = massProperties(boxMesh(width, depth, height))
    const mass = properties.mass

    expect(properties.inertia[0]).toBeCloseTo((mass / 12) * (depth ** 2 + height ** 2), 6)
    expect(properties.inertia[4]).toBeCloseTo((mass / 12) * (width ** 2 + height ** 2), 6)
    expect(properties.inertia[8]).toBeCloseTo((mass / 12) * (width ** 2 + depth ** 2), 6)
  })

  it('leaves no products of inertia on an axis-aligned box', () => {
    const properties = massProperties(boxMesh(2, 4, 6))
    for (const index of [1, 2, 3, 5, 6, 7]) {
      expect(properties.inertia[index] as number).toBeCloseTo(0, 6)
    }
  })

  it('reports principal moments in ascending order with unit axes', () => {
    const properties = massProperties(boxMesh(2, 4, 6))
    const [first, second, third] = properties.principalMoments
    expect(first).toBeLessThanOrEqual(second)
    expect(second).toBeLessThanOrEqual(third)
    for (const axis of properties.principalAxes) {
      expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1)
    }
  })

  it('derives the radii of gyration from the moments', () => {
    const properties = massProperties(boxMesh(2, 4, 6))
    properties.principalMoments.forEach((moment, index) => {
      expect(properties.radiiOfGyration[index] as number).toBeCloseTo(
        Math.sqrt(moment / properties.mass),
      )
    })
  })

  it('satisfies the parallel axis theorem', () => {
    const size = 2
    const properties = massProperties(boxMesh(size, size, size))
    const mass = properties.mass
    const offset = properties.centroid
    const shift = mass * (offset.y ** 2 + offset.z ** 2)
    expect(properties.inertiaAboutOrigin[0]).toBeCloseTo((properties.inertia[0] as number) + shift, 6)
  })

  it('gives the same answer for an inward-wound mesh', () => {
    const box = boxMesh(2, 4, 6)
    const inverted = { ...box, indices: reverseWinding(box.indices) }
    const properties = massProperties(inverted)
    expect(properties.volume).toBeCloseTo(48)
    expect(equals(properties.centroid, vec3(1, 2, 3), 1e-9)).toBe(true)
    expect(properties.inertia[0] as number).toBeGreaterThan(0)
  })

  it('reports an open surface honestly rather than dividing by zero', () => {
    const properties = massProperties(triangleMesh())
    expect(properties.volume).toBe(0)
    expect(properties.mass).toBe(0)
    expect(properties.surfaceArea).toBeCloseTo(0.5)
    expect(properties.principalMoments).toEqual([0, 0, 0])
    expect(properties.radiiOfGyration).toEqual([0, 0, 0])
  })

  it('survives an empty mesh', () => {
    const properties = massProperties(createEmptyMesh())
    expect(properties.volume).toBe(0)
    expect(properties.centroid).toEqual(vec3(0, 0, 0))
  })
})

describe('symmetricEigen', () => {
  it('reads the diagonal of an already-diagonal matrix', () => {
    const { values } = symmetricEigen([5, 0, 0, 0, 2, 0, 0, 0, 9])
    expect(values[0]).toBeCloseTo(2)
    expect(values[1]).toBeCloseTo(5)
    expect(values[2]).toBeCloseTo(9)
  })

  it('diagonalises a matrix with off-diagonal terms', () => {
    const matrix: Matrix3 = [2, 1, 0, 1, 2, 0, 0, 0, 3]
    const { values, vectors } = symmetricEigen(matrix)
    expect(values[0]).toBeCloseTo(1)
    expect(values[1]).toBeCloseTo(3)
    expect(values[2]).toBeCloseTo(3)
    for (const vector of vectors) {
      expect(Math.hypot(vector.x, vector.y, vector.z)).toBeCloseTo(1)
    }
  })

  it('handles the identity without rotating', () => {
    expect(symmetricEigen([1, 0, 0, 0, 1, 0, 0, 0, 1]).values).toEqual([1, 1, 1])
  })

  it('stops early rather than looping when asked for no sweeps', () => {
    expect(symmetricEigen([2, 1, 0, 1, 2, 0, 0, 0, 3], 0).values[0]).toBeCloseTo(2)
  })
})

describe('matrix helpers', () => {
  const a: Matrix3 = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  it('adds, subtracts and scales', () => {
    expect(addMatrix(a, a)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18])
    expect(subtractMatrix(a, a)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(scaleMatrix(a, 2)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18])
  })
})

describe('minimumDistance', () => {
  it('measures the gap between two separated bodies', () => {
    const result = minimumDistance(boxMesh(1, 1, 1), shiftX(boxMesh(1, 1, 1), 5))
    expect(result.distance).toBeCloseTo(4)
    expect(result.touching).toBe(false)
    expect(result.from.x).toBeCloseTo(1)
    expect(result.to.x).toBeCloseTo(5)
  })

  it('reports touching bodies as zero apart', () => {
    const result = minimumDistance(boxMesh(1, 1, 1), shiftX(boxMesh(1, 1, 1), 1))
    expect(result.distance).toBe(0)
    expect(result.touching).toBe(true)
    expect(bodiesInterfere(boxMesh(2, 2, 2), boxMesh(2, 2, 2))).toBe(true)
  })

  it('reports overlapping bodies as interfering', () => {
    expect(bodiesInterfere(boxMesh(2, 2, 2), shiftX(boxMesh(2, 2, 2), 1))).toBe(true)
    expect(bodiesInterfere(boxMesh(1, 1, 1), shiftX(boxMesh(1, 1, 1), 5))).toBe(false)
  })

  it('has no answer when a body is empty', () => {
    const result = minimumDistanceBetweenTriangles([], [])
    expect(result.distance).toBe(Number.POSITIVE_INFINITY)
    expect(result.touching).toBe(false)
    expect(minimumDistance(createEmptyMesh(), boxMesh(1, 1, 1)).distance).toBe(
      Number.POSITIVE_INFINITY,
    )
  })
})

function reverseWinding(indices: readonly number[]): number[] {
  const flipped: number[] = []
  for (let index = 0; index < indices.length; index += 3) {
    flipped.push(indices[index] as number, indices[index + 2] as number, indices[index + 1] as number)
  }
  return flipped
}
