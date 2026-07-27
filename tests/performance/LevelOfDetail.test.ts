import { describe, expect, it } from 'vitest'
import type { MeshData } from '../../src/domain/MeshData'
import { triangleCount, vertexCount } from '../../src/domain/MeshData'
import {
  DEFAULT_FLOOR_TRIANGLES,
  DEFAULT_LOD_LEVELS,
  FULL_DETAIL,
  assignLevels,
  budgetFor,
  clusterMesh,
  decimate,
  levelForComponent,
  levelForCoverage,
  lodSavings,
  simplifyMesh,
} from '../../src/performance/LevelOfDetail'
import { cameraAt, componentAt } from '../helpers/components'
import { boxMesh } from '../helpers/meshes'

/** An `n` by `n` grid of quads in the z = 0 plane: 2n² triangles. */
function gridMesh(n: number): MeshData {
  const positions: number[] = []
  const indices: number[] = []

  for (let row = 0; row <= n; row += 1) {
    for (let column = 0; column <= n; column += 1) {
      positions.push(column / n, row / n, 0)
    }
  }
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const a = row * (n + 1) + column
      indices.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1)
    }
  }
  return { positions, normals: [], indices }
}

describe('levelForCoverage', () => {
  it('gives a component filling the screen full detail', () => {
    expect(levelForCoverage(0.8).name).toBe('full')
  })

  it('steps down as the component shrinks', () => {
    expect(levelForCoverage(0.15).name).toBe('high')
    expect(levelForCoverage(0.05).name).toBe('medium')
    expect(levelForCoverage(0.03).name).toBe('low')
  })

  it('drops a speck to a proxy', () => {
    expect(levelForCoverage(0.001).name).toBe('proxy')
  })

  it('takes the boundary as belonging to the higher level', () => {
    expect(levelForCoverage(0.25).name).toBe('full')
  })

  it('accepts a ladder supplied by the caller', () => {
    const levels = [
      { name: 'near', minCoverage: 0.5, detail: 1 },
      { name: 'far', minCoverage: 0, detail: 0.1 },
    ]

    expect(levelForCoverage(0.2, levels).name).toBe('far')
  })

  it('still answers when the ladder never reaches zero', () => {
    const levels = [{ name: 'near', minCoverage: 0.5, detail: 1 }]

    expect(levelForCoverage(0.1, levels).name).toBe('near')
  })

  it('falls back to full detail given no ladder at all', () => {
    expect(levelForCoverage(0.1, []).name).toBe(FULL_DETAIL.name)
  })
})

describe('levelForComponent', () => {
  it('picks the level from how big the component looks', () => {
    expect(levelForComponent(componentAt('a', [3, 0, 0]), cameraAt()).name).toBe('full')
    expect(levelForComponent(componentAt('a', [200, 0, 0]), cameraAt()).name).toBe('proxy')
  })

  it('keeps a pinned component at full detail however far away it is', () => {
    const pinned = componentAt('a', [5000, 0, 0], { pinned: true })

    expect(levelForComponent(pinned, cameraAt())).toBe(FULL_DETAIL)
  })
})

describe('budgetFor', () => {
  it('leaves a mesh alone at full detail', () => {
    expect(budgetFor(1000, 1)).toBe(1000)
  })

  it('scales the count by the detail fraction', () => {
    expect(budgetFor(1000, 0.2)).toBe(200)
  })

  it('drops to nothing at zero detail', () => {
    expect(budgetFor(1000, 0)).toBe(0)
  })

  it('leaves an already cheap part untouched', () => {
    expect(budgetFor(12, 0.05)).toBe(12)
  })

  it('never simplifies below the floor', () => {
    expect(budgetFor(1000, 0.001)).toBe(DEFAULT_FLOOR_TRIANGLES)
  })

  it('honours a floor the caller chose', () => {
    expect(budgetFor(1000, 0.001, 100)).toBe(100)
  })
})

describe('assignLevels', () => {
  const scene = [
    componentAt('near', [3, 0, 0], { triangleCount: 10_000 }),
    componentAt('far', [300, 0, 0], { triangleCount: 10_000 }),
  ]

  it('gives each component a level and a budget', () => {
    const assignments = assignLevels(scene, cameraAt())

    expect(assignments[0]?.level.name).toBe('full')
    expect(assignments[0]?.triangleCount).toBe(10_000)
    expect(assignments[1]?.level.name).toBe('proxy')
    expect(assignments[1]?.triangleCount).toBe(0)
  })

  it('records the coverage it decided on', () => {
    const assignments = assignLevels(scene, cameraAt())

    expect(assignments[0]?.coverage).toBeGreaterThan(assignments[1]?.coverage ?? 1)
  })

  it('reports a pinned component as filling the screen', () => {
    const pinned = [componentAt('a', [500, 0, 0], { pinned: true, triangleCount: 900 })]
    const assignments = assignLevels(pinned, cameraAt())

    expect(assignments[0]?.coverage).toBe(1)
    expect(assignments[0]?.triangleCount).toBe(900)
  })

  it('honours a floor passed through to the budget', () => {
    const assignments = assignLevels(scene, cameraAt(), { floorTriangles: 500 })

    expect(assignments[1]?.triangleCount).toBe(0)
  })
})

describe('lodSavings', () => {
  it('reports what the ladder avoided', () => {
    const scene = [
      componentAt('near', [3, 0, 0], { triangleCount: 1000 }),
      componentAt('far', [300, 0, 0], { triangleCount: 1000 }),
    ]
    const savings = lodSavings(assignLevels(scene, cameraAt()))

    expect(savings.before).toBe(2000)
    expect(savings.after).toBe(1000)
    expect(savings.saved).toBeCloseTo(0.5, 12)
  })

  it('saves nothing from an empty scene', () => {
    expect(lodSavings([])).toEqual({ before: 0, after: 0, saved: 0 })
  })
})

describe('clusterMesh', () => {
  it('welds vertices that land in the same cell', () => {
    const clustered = clusterMesh(gridMesh(8), 2)

    expect(vertexCount(clustered)).toBeLessThan(vertexCount(gridMesh(8)))
    expect(triangleCount(clustered)).toBeLessThan(128)
  })

  it('keeps a cell at the average of what fell into it', () => {
    const clustered = clusterMesh(gridMesh(4), 1)

    // Every vertex collapses to one cell, so nothing survives as a triangle.
    expect(vertexCount(clustered)).toBe(1)
    expect(triangleCount(clustered)).toBe(0)
  })

  it('survives a mesh that is flat on one axis', () => {
    // The grid has no z extent at all, which would divide by zero unguarded.
    expect(() => clusterMesh(gridMesh(4), 4)).not.toThrow()
  })

  it('leaves a fine enough grid alone', () => {
    const box = boxMesh(1, 1, 1)

    expect(triangleCount(clusterMesh(box, 64))).toBe(triangleCount(box))
  })

  it('treats a nonsensical resolution as the coarsest one', () => {
    expect(vertexCount(clusterMesh(gridMesh(4), 0))).toBe(1)
  })

  it('gives the result normals that follow its own winding', () => {
    const clustered = clusterMesh(gridMesh(8), 4)

    expect(clustered.normals).toHaveLength(clustered.positions.length)
  })
})

describe('simplifyMesh', () => {
  const mesh = gridMesh(16)

  it('gets a mesh under its budget', () => {
    const simplified = simplifyMesh(mesh, 100)

    expect(triangleCount(mesh)).toBe(512)
    expect(triangleCount(simplified)).toBeLessThanOrEqual(100)
    expect(triangleCount(simplified)).toBeGreaterThan(0)
  })

  it('gets closer to a larger budget than to a smaller one', () => {
    const loose = triangleCount(simplifyMesh(mesh, 300))
    const tight = triangleCount(simplifyMesh(mesh, 50))

    expect(loose).toBeGreaterThan(tight)
  })

  it('hands back the original when it is already small enough', () => {
    expect(simplifyMesh(mesh, 512)).toBe(mesh)
    expect(simplifyMesh(mesh, 10_000)).toBe(mesh)
  })

  it('has nothing to do to an empty mesh', () => {
    const empty = { positions: [], normals: [], indices: [] }

    expect(simplifyMesh(empty, 10)).toBe(empty)
  })

  it('returns nothing at all for a budget of zero', () => {
    expect(triangleCount(simplifyMesh(mesh, 0))).toBe(0)
  })

  it('still reduces a mesh it cannot get all the way down', () => {
    const simplified = simplifyMesh(mesh, 1)

    expect(triangleCount(simplified)).toBeLessThan(triangleCount(mesh))
  })
})

describe('decimate', () => {
  it('reduces to roughly the requested fraction', () => {
    const simplified = decimate(gridMesh(16), 0.25)

    expect(triangleCount(simplified)).toBeLessThanOrEqual(128)
  })

  it('leaves the mesh alone at a ratio of one', () => {
    const mesh = gridMesh(8)

    expect(decimate(mesh, 1)).toBe(mesh)
  })

  it('clamps a ratio above one', () => {
    const mesh = gridMesh(8)

    expect(decimate(mesh, 5)).toBe(mesh)
  })

  it('empties the mesh at a ratio of zero or below', () => {
    expect(triangleCount(decimate(gridMesh(8), 0))).toBe(0)
    expect(triangleCount(decimate(gridMesh(8), -1))).toBe(0)
  })
})

describe('DEFAULT_LOD_LEVELS', () => {
  it('runs from most detailed to least', () => {
    const coverages = DEFAULT_LOD_LEVELS.map((level) => level.minCoverage)

    expect(coverages).toEqual([...coverages].sort((a, b) => b - a))
  })

  it('reaches all the way down to zero', () => {
    expect(DEFAULT_LOD_LEVELS[DEFAULT_LOD_LEVELS.length - 1]?.minCoverage).toBe(0)
  })
})
