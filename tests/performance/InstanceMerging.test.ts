import { describe, expect, it } from 'vitest'
import { triangleCount, vertexCount } from '../../src/domain/MeshData'
import {
  groupInstances,
  instanceBatches,
  mergeGroup,
  mergeSavings,
  mergeableGroups,
} from '../../src/performance/InstanceMerging'
import { componentAt } from '../helpers/components'
import { boxMesh } from '../helpers/meshes'

/** Four identical bolts in a row, plus a housing that is nothing like them. */
const ASSEMBLY = [
  componentAt('bolt-1', [0, 0, 0], { geometryKey: 'm6-bolt', triangleCount: 40 }),
  componentAt('bolt-2', [10, 0, 0], { geometryKey: 'm6-bolt', triangleCount: 40 }),
  componentAt('bolt-3', [20, 0, 0], { geometryKey: 'm6-bolt', triangleCount: 40 }),
  componentAt('bolt-4', [30, 0, 0], { geometryKey: 'm6-bolt', triangleCount: 40 }),
  componentAt('housing', [15, 0, 5], { geometryKey: 'housing', triangleCount: 12_000 }),
]

describe('groupInstances', () => {
  it('collects components that share geometry', () => {
    const groups = groupInstances(ASSEMBLY)

    expect(groups).toHaveLength(2)
    expect(groups[0]?.instances).toHaveLength(4)
    expect(groups[1]?.instances).toHaveLength(1)
  })

  it('keeps groups in the order the geometry was first seen', () => {
    expect(groupInstances(ASSEMBLY).map((group) => group.geometryKey)).toEqual([
      'm6-bolt',
      'housing',
    ])
  })

  it('measures each instance against the first one', () => {
    const bolts = groupInstances(ASSEMBLY)[0]

    expect(bolts?.offsets[0]).toEqual({ x: 0, y: 0, z: 0 })
    expect(bolts?.offsets[2]).toEqual({ x: 20, y: 0, z: 0 })
  })

  it('reports the cost of one copy, not all of them', () => {
    expect(groupInstances(ASSEMBLY)[0]?.triangleCount).toBe(40)
  })

  it('gives an unkeyed component a group to itself', () => {
    const loose = [componentAt('a', [0, 0, 0]), componentAt('b', [0, 0, 0])]

    expect(groupInstances(loose)).toHaveLength(2)
  })

  it('never merges two unkeyed components that happen to coincide', () => {
    const identical = [componentAt('a', [1, 1, 1]), componentAt('b', [1, 1, 1])]
    const groups = groupInstances(identical)

    expect(groups).toHaveLength(2)
    expect(groups[0]?.geometryKey).not.toBe(groups[1]?.geometryKey)
  })

  it('has nothing to group in an empty assembly', () => {
    expect(groupInstances([])).toEqual([])
  })
})

describe('mergeableGroups', () => {
  it('picks out only the groups with something to merge', () => {
    const worthwhile = mergeableGroups(groupInstances(ASSEMBLY))

    expect(worthwhile).toHaveLength(1)
    expect(worthwhile[0]?.geometryKey).toBe('m6-bolt')
  })
})

describe('mergeGroup', () => {
  const bolts = groupInstances(ASSEMBLY)[0]
  const mesh = boxMesh(1, 1, 1)

  it('stamps out one copy per instance', () => {
    if (!bolts) throw new Error('the assembly produced no bolt group')
    const merged = mergeGroup(bolts, mesh)

    expect(triangleCount(merged)).toBe(triangleCount(mesh) * 4)
    expect(vertexCount(merged)).toBe(vertexCount(mesh) * 4)
  })

  it('places each copy at its own offset', () => {
    if (!bolts) throw new Error('the assembly produced no bolt group')
    const merged = mergeGroup(bolts, mesh)

    expect(Math.max(...merged.positions.filter((_value, index) => index % 3 === 0))).toBe(31)
  })

  it('renumbers the indices of each copy into its own block', () => {
    if (!bolts) throw new Error('the assembly produced no bolt group')
    const merged = mergeGroup(bolts, mesh)

    expect(Math.max(...merged.indices)).toBe(vertexCount(mesh) * 4 - 1)
  })

  it('carries the normals across untouched, since nothing rotated', () => {
    if (!bolts) throw new Error('the assembly produced no bolt group')
    const merged = mergeGroup(bolts, mesh)

    expect(merged.normals.slice(0, 3)).toEqual(mesh.normals.slice(0, 3))
  })
})

describe('instanceBatches', () => {
  it('turns the assembly into one batch per geometry', () => {
    const batches = instanceBatches(ASSEMBLY)

    expect(batches).toHaveLength(2)
    expect(batches[0]).toMatchObject({
      geometryKey: 'm6-bolt',
      instanceCount: 4,
      triangleCount: 160,
    })
  })

  it('lists the components each batch stands for', () => {
    expect(instanceBatches(ASSEMBLY)[0]?.componentIds).toEqual([
      'bolt-1',
      'bolt-2',
      'bolt-3',
      'bolt-4',
    ])
  })
})

describe('mergeSavings', () => {
  it('reports the draw calls merging removed', () => {
    const savings = mergeSavings(ASSEMBLY)

    expect(savings.drawCallsBefore).toBe(5)
    expect(savings.drawCallsAfter).toBe(2)
    expect(savings.saved).toBeCloseTo(0.6, 12)
    expect(savings.mergedGroups).toBe(1)
  })

  it('leaves the triangle count alone, because merging does not change it', () => {
    expect(mergeSavings(ASSEMBLY).triangleCount).toBe(12_160)
  })

  it('saves nothing on an assembly of unique parts', () => {
    const unique = [componentAt('a', [0, 0, 0]), componentAt('b', [1, 0, 0])]

    expect(mergeSavings(unique).saved).toBe(0)
  })

  it('saves nothing from an empty assembly', () => {
    expect(mergeSavings([])).toMatchObject({ drawCallsBefore: 0, drawCallsAfter: 0, saved: 0 })
  })
})
