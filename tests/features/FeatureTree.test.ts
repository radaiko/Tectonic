import { describe, expect, it } from 'vitest'
import { FeatureTree } from '../../src/features/FeatureTree'
import { Feature } from '../../src/features/domain/Feature'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'

function feature(id: string, parents: readonly string[] = []): Feature {
  return createFeature(FeatureType.Extrude, { id, name: id, parentFeatureIds: parents })
}

/** A → B → C, each built on the one before it. */
function chain(): FeatureTree {
  const tree = new FeatureTree()
  tree.addFeature(feature('A'))
  tree.addFeature(feature('B', ['A']))
  tree.addFeature(feature('C', ['B']))
  return tree
}

describe('FeatureTree construction', () => {
  it('starts empty with the roll bar at the front', () => {
    const tree = new FeatureTree()

    expect(tree.features).toEqual([])
    expect(tree.length).toBe(0)
    expect(tree.rollBarIndex).toBe(0)
  })

  it('puts the roll bar behind the last feature it was seeded with', () => {
    const tree = new FeatureTree([feature('A'), feature('B')])

    expect(tree.length).toBe(2)
    expect(tree.rollBarIndex).toBe(2)
  })

  it('clamps a seeded roll bar to the number of features', () => {
    expect(new FeatureTree([feature('A')], 9).rollBarIndex).toBe(1)
    expect(new FeatureTree([feature('A')], -3).rollBarIndex).toBe(0)
    expect(new FeatureTree([feature('A')], Number.NaN).rollBarIndex).toBe(1)
  })
})

describe('FeatureTree.addFeature', () => {
  it('appends features in the order they are added', () => {
    const tree = chain()

    expect(tree.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])
    expect(tree.rollBarIndex).toBe(3)
  })

  it('inserts at a given index and clamps one past the end', () => {
    const tree = new FeatureTree([feature('A'), feature('C')])

    tree.addFeature(feature('B'), 1)
    tree.addFeature(feature('D'), 99)

    expect(tree.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('links a new feature to the parents it names', () => {
    const tree = chain()

    expect(tree.requireFeature('A').childFeatureIds).toEqual(['B'])
    expect(tree.requireFeature('B').childFeatureIds).toEqual(['C'])
  })

  it('leaves a rolled-back bar where it is, shifting for earlier inserts', () => {
    const tree = chain()
    tree.moveRollBar(1)

    tree.addFeature(feature('D'))
    expect(tree.rollBarIndex).toBe(1)

    tree.addFeature(feature('E'), 0)
    expect(tree.rollBarIndex).toBe(2)
  })
})

describe('FeatureTree lookup', () => {
  it('finds features by id and reports their position', () => {
    const tree = chain()

    expect(tree.getFeature('B')?.name).toBe('B')
    expect(tree.indexOf('C')).toBe(2)
    expect(tree.getFeature('nope')).toBeUndefined()
    expect(tree.indexOf('nope')).toBe(-1)
  })

  it('throws when a required feature is missing', () => {
    expect(() => new FeatureTree().requireFeature('nope')).toThrow(/No feature with id nope/)
  })
})

describe('FeatureTree.removeFeature', () => {
  it('removes a feature together with everything built on it', () => {
    const tree = chain()

    const removed = tree.removeFeature('B')

    expect(removed.sort()).toEqual(['B', 'C'])
    expect(tree.features.map((entry) => entry.id)).toEqual(['A'])
  })

  it('clears links the survivors held to the removed features', () => {
    const tree = chain()

    tree.removeFeature('B')

    expect(tree.requireFeature('A').childFeatureIds).toEqual([])
  })

  it('ignores an id that is not in the tree', () => {
    const tree = chain()

    expect(tree.removeFeature('nope')).toEqual([])
    expect(tree.length).toBe(3)
  })

  it('pulls the roll bar back when it sat behind removed features', () => {
    const tree = chain()

    tree.removeFeature('A')

    expect(tree.length).toBe(0)
    expect(tree.rollBarIndex).toBe(0)
  })
})

describe('FeatureTree.reorderFeature', () => {
  it('moves an independent feature to a new position', () => {
    const tree = new FeatureTree([feature('A'), feature('B'), feature('C')])

    expect(tree.reorderFeature('C', 0)).toBe(true)
    expect(tree.features.map((entry) => entry.id)).toEqual(['C', 'A', 'B'])
  })

  it('refuses to move a feature in front of what it depends on', () => {
    const tree = chain()

    expect(tree.reorderFeature('B', 0)).toBe(false)
    expect(tree.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])
  })

  it('takes dependents along with the feature they are built on', () => {
    const tree = new FeatureTree()
    tree.addFeature(feature('base'))
    tree.addFeature(feature('A'))
    tree.addFeature(feature('B', ['A']))

    expect(tree.reorderFeature('A', 0)).toBe(true)
    expect(tree.features.map((entry) => entry.id)).toEqual(['A', 'B', 'base'])
  })

  it('rejects a move of a feature that is not in the tree', () => {
    const tree = chain()

    expect(tree.reorderFeature('nope', 0)).toBe(false)
  })

  it('keeps the roll bar at the tail when the tail is where it was', () => {
    const tree = new FeatureTree([feature('A'), feature('B')])

    tree.reorderFeature('B', 0)

    expect(tree.rollBarIndex).toBe(2)
  })

  it('answers whether a move is legal without performing it', () => {
    const tree = chain()

    expect(tree.validateDependencies('B', 0)).toBe(false)
    // C has to stay behind B, so index 2 is the only place left for it.
    expect(tree.validateDependencies('C', 1)).toBe(false)
    expect(tree.validateDependencies('C', 2)).toBe(true)
    expect(tree.validateDependencies('nope', 0)).toBe(false)
    expect(tree.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])
  })

  it('keeps a dependency cycle together instead of looping forever', () => {
    const tree = new FeatureTree()
    tree.addFeature(feature('A'))
    tree.addFeature(feature('B'))
    tree.requireFeature('A').addParent('B')
    tree.requireFeature('B').addParent('A')

    expect(tree.getDependents('A').map((entry) => entry.id)).toEqual(['B'])
    expect(tree.validateDependencies('A', 0)).toBe(true)
  })
})

describe('FeatureTree suppression and naming', () => {
  it('suppresses and unsuppresses a feature', () => {
    const tree = chain()

    expect(tree.suppressFeature('B')).toBe(true)
    expect(tree.requireFeature('B').suppressed).toBe(true)
    expect(tree.unsuppressFeature('B')).toBe(true)
    expect(tree.requireFeature('B').status).toBe('active')
  })

  it('clears an error when a failed feature is suppressed', () => {
    const tree = chain()
    tree.requireFeature('B').markError('bad radius')

    tree.suppressFeature('B')

    expect(tree.requireFeature('B').errorMessage).toBeNull()
  })

  it('will not unsuppress something that was never suppressed', () => {
    const tree = chain()

    expect(tree.unsuppressFeature('B')).toBe(false)
    expect(tree.suppressFeature('nope')).toBe(false)
    expect(tree.unsuppressFeature('nope')).toBe(false)
  })

  it('renames a feature, trimming the name and rejecting a blank one', () => {
    const tree = chain()

    expect(tree.renameFeature('B', '  Boss  ')).toBe(true)
    expect(tree.requireFeature('B').name).toBe('Boss')
    expect(tree.renameFeature('B', '   ')).toBe(false)
    expect(tree.renameFeature('nope', 'x')).toBe(false)
  })
})

describe('FeatureTree roll bar', () => {
  it('moves forwards and backwards, clamped to the tree', () => {
    const tree = chain()

    expect(tree.moveRollBar(1)).toBe(1)
    expect(tree.moveRollBar(2)).toBe(2)
    expect(tree.moveRollBar(-5)).toBe(0)
    expect(tree.moveRollBar(50)).toBe(3)
  })

  it('evaluates only the features in front of the bar', () => {
    const tree = chain()
    tree.moveRollBar(2)

    expect(tree.getActiveFeatures().map((entry) => entry.id)).toEqual(['A', 'B'])
    expect(tree.getRolledBackFeatures().map((entry) => entry.id)).toEqual(['C'])
  })

  it('skips suppressed features but keeps failed ones', () => {
    const tree = chain()
    tree.suppressFeature('B')
    tree.requireFeature('C').markError('boom')

    expect(tree.getActiveFeatures().map((entry) => entry.id)).toEqual(['A', 'C'])
  })
})

describe('FeatureTree dependencies', () => {
  it('collects dependents transitively in tree order', () => {
    const tree = chain()

    expect(tree.getDependents('A').map((entry) => entry.id)).toEqual(['B', 'C'])
    expect(tree.getDependents('C')).toEqual([])
  })

  it('clears errors left by a previous rebuild', () => {
    const tree = chain()
    tree.requireFeature('A').markError('boom')
    tree.suppressFeature('B')

    tree.clearErrors()

    expect(tree.requireFeature('A').status).toBe('active')
    expect(tree.requireFeature('A').errorMessage).toBeNull()
    expect(tree.requireFeature('B').status).toBe('suppressed')
  })
})

describe('FeatureTree serialization', () => {
  it('round-trips through JSON with the roll bar', () => {
    const tree = chain()
    tree.moveRollBar(2)
    tree.requireFeature('C').setParameters({ distance: 42 })

    const restored = FeatureTree.fromJSON(JSON.parse(JSON.stringify(tree.toJSON())))

    expect(restored.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])
    expect(restored.rollBarIndex).toBe(2)
    expect(restored.requireFeature('C').parameters.distance).toBe(42)
    expect(restored.requireFeature('B').parentFeatureIds).toEqual(['A'])
  })

  it('rejects a feature kind it does not know', () => {
    expect(() =>
      FeatureTree.fromJSON({ features: [{ featureType: 'WarpFeature' } as never], rollBarIndex: 0 }),
    ).toThrow(/Unknown feature type/)
  })

  it('clones into a tree that no longer shares its features', () => {
    const tree = chain()

    const copy = tree.clone()
    copy.requireFeature('A').name = 'renamed'

    expect(tree.requireFeature('A').name).toBe('A')
    expect(copy.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])
  })
})
