import { describe, expect, it } from 'vitest'
import { PartStudio, StudioError, StudioPart } from '../../src/studio/PartStudio'
import { FeatureEngine } from '../../src/features/FeatureEngine'
import { FeatureTree } from '../../src/features/FeatureTree'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { StubKernel } from '../../src/kernel/StubKernel'
import { rectangleSketch } from '../features/support'

function studioWithSharedSketch(): {
  studio: PartStudio
  sketch: SketchModel
  bracket: StudioPart
  cover: StudioPart
} {
  const studio = new PartStudio({ name: 'Housing' })
  const sketch = studio.addSketch(rectangleSketch(20, 10, { id: 'profile', name: 'Profile' }))
  const bracket = studio.addPart(new StudioPart({ id: 'bracket', name: 'Bracket' }))
  const cover = studio.addPart(new StudioPart({ id: 'cover', name: 'Cover' }))

  studio.addFeature(
    'bracket',
    createFeature(FeatureType.Extrude, { id: 'bracket-extrude', sketchId: sketch.id }),
  )
  studio.addFeature(
    'cover',
    createFeature(FeatureType.Extrude, { id: 'cover-extrude', sketchId: sketch.id }),
  )
  return { studio, sketch, bracket, cover }
}

describe('StudioPart', () => {
  it('defaults to visible with an empty history', () => {
    const part = new StudioPart()

    expect(part.name).toBe('Part')
    expect(part.visible).toBe(true)
    expect(part.color).toBeNull()
    expect(part.tree.length).toBe(0)
    expect(part.referencePartIds).toEqual([])
  })

  it('lists the sketches its features read, once each, in tree order', () => {
    const part = new StudioPart()
    part.tree.addFeature(createFeature(FeatureType.Extrude, { sketchId: 'a' }))
    part.tree.addFeature(createFeature(FeatureType.CutExtrude, { sketchId: 'b' }))
    part.tree.addFeature(createFeature(FeatureType.Fillet, { sketchId: 'a' }))
    part.tree.addFeature(createFeature(FeatureType.Shell))

    expect(part.sketchIds).toEqual(['a', 'b'])
    expect(part.usesSketch('a')).toBe(true)
    expect(part.usesSketch('c')).toBe(false)
    expect(part.featuresUsing('a')).toHaveLength(2)
  })

  it('round-trips through JSON with its history and references', () => {
    const part = new StudioPart({
      name: 'Cover',
      visible: false,
      color: '#ff0000',
      referencePartIds: ['bracket'],
    })
    part.tree.addFeature(createFeature(FeatureType.Extrude, { id: 'f1', sketchId: 's1' }))

    const restored = StudioPart.fromJSON(part.toJSON())

    expect(restored.id).toBe(part.id)
    expect(restored.name).toBe('Cover')
    expect(restored.visible).toBe(false)
    expect(restored.color).toBe('#ff0000')
    expect(restored.referencePartIds).toEqual(['bracket'])
    expect(restored.tree.getFeature('f1')?.sketchId).toBe('s1')
  })

  it('clones deeply, so editing the copy leaves the original alone', () => {
    const part = new StudioPart({ name: 'Bracket' })
    part.tree.addFeature(createFeature(FeatureType.Extrude, { id: 'f1' }))

    const copy = part.clone()
    copy.name = 'Other'
    copy.tree.removeFeature('f1')

    expect(part.name).toBe('Bracket')
    expect(part.tree.length).toBe(1)
  })
})

describe('PartStudio sketches', () => {
  it('holds sketches at the studio level, not inside a part', () => {
    const { studio, sketch } = studioWithSharedSketch()

    expect(studio.sketchCount).toBe(1)
    expect(studio.getSketch(sketch.id)).toBe(sketch)
    expect(studio.requireSketch(sketch.id).name).toBe('Profile')
  })

  it('refuses a second sketch with the same id', () => {
    const studio = new PartStudio()
    const sketch = studio.addSketch(new SketchModel({ id: 'one' }))

    expect(() => studio.addSketch(sketch)).toThrow(StudioError)
  })

  it('numbers new sketches around the ones already there', () => {
    const studio = new PartStudio()
    studio.createSketch()
    studio.createSketch({ name: 'Profile' })

    expect(studio.createSketch().name).toBe('Sketch 2')
    expect(studio.sketches.map((entry) => entry.name)).toEqual(['Sketch 1', 'Profile', 'Sketch 2'])
  })

  it('raises rather than guessing when a sketch id is unknown', () => {
    expect(() => new PartStudio().requireSketch('missing')).toThrow(/No sketch with id missing/)
  })

  it('reports every part that reads a sketch', () => {
    const { studio, sketch } = studioWithSharedSketch()

    expect(studio.partsUsingSketch(sketch.id).map((part) => part.name)).toEqual([
      'Bracket',
      'Cover',
    ])
    expect(studio.isSketchShared(sketch.id)).toBe(true)
  })

  it('reports the sketches one part reads', () => {
    const { studio, sketch } = studioWithSharedSketch()

    expect(studio.sketchesUsedBy('bracket')).toEqual([sketch])
    expect(studio.sketchesUsedBy('nobody')).toEqual([])
  })

  it('skips sketch ids a part names that the studio does not hold', () => {
    const studio = new PartStudio()
    const part = studio.addPart(new StudioPart({ id: 'p' }))
    part.tree.addFeature(createFeature(FeatureType.Extrude, { sketchId: 'ghost' }))

    expect(studio.sketchesUsedBy('p')).toEqual([])
  })

  it('keeps a sketch a part still reads unless deletion is forced', () => {
    const { studio, sketch } = studioWithSharedSketch()

    expect(studio.removeSketch(sketch.id)).toBe(false)
    expect(studio.sketchCount).toBe(1)

    expect(studio.removeSketch(sketch.id, true)).toBe(true)
    expect(studio.sketchCount).toBe(0)
    expect(studio.getPart('bracket')?.tree.getFeature('bracket-extrude')?.sketchId).toBeNull()
  })

  it('drops an unused sketch without a fight, and reports a missing one', () => {
    const studio = new PartStudio()
    const spare = studio.createSketch()

    expect(studio.unusedSketches()).toEqual([spare])
    expect(studio.removeSketch(spare.id)).toBe(true)
    expect(studio.removeSketch('never-existed')).toBe(false)
  })

  it('describes the whole reference picture for the sketch browser', () => {
    const { studio, sketch } = studioWithSharedSketch()
    const spare = studio.createSketch({ name: 'Spare' })

    const usage = studio.sketchUsage()

    expect(usage).toHaveLength(2)
    const shared = usage[0]
    expect(shared?.sketchId).toBe(sketch.id)
    expect(shared?.sketchName).toBe('Profile')
    expect(shared?.partIds).toEqual(['bracket', 'cover'])
    expect(shared?.featureIdsByPart.get('bracket')).toEqual(['bracket-extrude'])
    expect(shared?.shared).toBe(true)

    const unused = usage[1]
    expect(unused?.sketchId).toBe(spare.id)
    expect(unused?.partIds).toEqual([])
    expect(unused?.shared).toBe(false)
  })
})

describe('PartStudio parts', () => {
  it('makes the first part added the active one', () => {
    const studio = new PartStudio()
    const first = studio.createPart()
    studio.createPart()

    expect(studio.activePartId).toBe(first.id)
    expect(studio.activePart).toBe(first)
  })

  it('ignores a selection of a part that is not in the studio', () => {
    const { studio } = studioWithSharedSketch()

    expect(studio.setActivePart('cover')).toBe('cover')
    expect(studio.setActivePart('ghost')).toBeNull()
    expect(studio.setActivePart(null)).toBeNull()
    expect(studio.activePart).toBeNull()
  })

  it('numbers new parts around the ones already there', () => {
    const studio = new PartStudio()
    studio.createPart()
    studio.createPart('Bracket')

    expect(studio.createPart().name).toBe('Part 2')
    expect(studio.partCount).toBe(3)
  })

  it('refuses a second part with the same id', () => {
    const studio = new PartStudio()
    const part = studio.createPart()

    expect(() => studio.addPart(part)).toThrow(StudioError)
    expect(() => studio.requirePart('nope')).toThrow(/No part with id nope/)
  })

  it('removes a part along with every reference to it', () => {
    const { studio } = studioWithSharedSketch()
    studio.addPartReference('cover', 'bracket')

    expect(studio.removePart('bracket')).toBe(true)
    expect(studio.getPart('cover')?.referencePartIds).toEqual([])
    expect(studio.activePartId).toBe('cover')
    expect(studio.removePart('bracket')).toBe(false)
  })

  it('clears the selection when the last part goes', () => {
    const studio = new PartStudio()
    const only = studio.createPart()

    studio.removePart(only.id)

    expect(studio.activePartId).toBeNull()
  })

  it('renames a part, trimming, and refuses a blank name', () => {
    const { studio } = studioWithSharedSketch()

    expect(studio.renamePart('bracket', '  Frame  ')).toBe(true)
    expect(studio.getPart('bracket')?.name).toBe('Frame')
    expect(studio.renamePart('bracket', '   ')).toBe(false)
    expect(studio.renamePart('ghost', 'Frame')).toBe(false)
  })

  it('toggles, isolates and restores visibility', () => {
    const { studio } = studioWithSharedSketch()

    expect(studio.togglePartVisibility('bracket')).toBe(false)
    expect(studio.visibleParts.map((part) => part.id)).toEqual(['cover'])

    expect(studio.showOnly('bracket')).toBe(true)
    expect(studio.visibleParts.map((part) => part.id)).toEqual(['bracket'])

    studio.showAll()
    expect(studio.visibleParts).toHaveLength(2)

    expect(studio.setPartVisible('cover', false)).toBe(true)
    expect(studio.getPart('cover')?.visible).toBe(false)
  })

  it('reports a missing part rather than throwing on visibility calls', () => {
    const studio = new PartStudio()

    expect(studio.togglePartVisibility('ghost')).toBe(false)
    expect(studio.setPartVisible('ghost', true)).toBe(false)
    expect(studio.showOnly('ghost')).toBe(false)
  })
})

describe('PartStudio cross-part references', () => {
  it('records that one part consumes another part geometry', () => {
    const { studio } = studioWithSharedSketch()

    expect(studio.addPartReference('cover', 'bracket')).toBe(true)
    expect(studio.addPartReference('cover', 'bracket')).toBe(false)
    expect(studio.getPart('cover')?.referencesPart('bracket')).toBe(true)
  })

  it('refuses a self reference and any cycle it would close', () => {
    const { studio } = studioWithSharedSketch()
    studio.createPart('Seal')
    const seal = studio.parts[2]?.id as string

    expect(() => studio.addPartReference('cover', 'cover')).toThrow(/cannot reference itself/)

    studio.addPartReference('cover', 'bracket')
    studio.addPartReference(seal, 'cover')

    expect(() => studio.addPartReference('bracket', seal)).toThrow(/cycle/)
  })

  it('drops a reference and reports one that was never there', () => {
    const { studio } = studioWithSharedSketch()
    studio.addPartReference('cover', 'bracket')

    expect(studio.removePartReference('cover', 'bracket')).toBe(true)
    expect(studio.removePartReference('cover', 'bracket')).toBe(false)
    expect(studio.removePartReference('ghost', 'bracket')).toBe(false)
  })

  it('walks dependents transitively', () => {
    const { studio } = studioWithSharedSketch()
    const seal = studio.createPart('Seal')
    studio.addPartReference('cover', 'bracket')
    studio.addPartReference(seal.id, 'cover')

    expect(studio.dependentsOf('bracket').map((part) => part.name)).toEqual(['Cover', 'Seal'])
    expect(studio.dependentsOf(seal.id)).toEqual([])
  })

  it('rebuilds references before the parts that read them', () => {
    const studio = new PartStudio()
    studio.addPart(new StudioPart({ id: 'c' }))
    studio.addPart(new StudioPart({ id: 'b' }))
    studio.addPart(new StudioPart({ id: 'a' }))
    studio.addPartReference('c', 'b')
    studio.addPartReference('b', 'a')

    expect(studio.buildOrder().map((part) => part.id)).toEqual(['a', 'b', 'c'])
  })

  it('still lists every part when corrupt JSON leaves a cycle behind', () => {
    const studio = new PartStudio({
      parts: [
        new StudioPart({ id: 'a', referencePartIds: ['b'] }),
        new StudioPart({ id: 'b', referencePartIds: ['a'] }),
      ],
    })

    expect(studio.buildOrder().map((part) => part.id).sort()).toEqual(['a', 'b'])
  })

  it('ignores a reference to a part that has since been dropped', () => {
    const studio = new PartStudio({
      parts: [new StudioPart({ id: 'a', referencePartIds: ['gone'] })],
    })

    expect(studio.buildOrder().map((part) => part.id)).toEqual(['a'])
  })
})

describe('PartStudio features', () => {
  it('adds a feature that names a studio sketch', () => {
    const { studio, sketch } = studioWithSharedSketch()

    const feature = studio.addFeature(
      'bracket',
      createFeature(FeatureType.Fillet, { id: 'fillet', sketchId: sketch.id }),
      0,
    )

    expect(feature.id).toBe('fillet')
    expect(studio.getPart('bracket')?.tree.features[0]?.id).toBe('fillet')
  })

  it('accepts a feature that reads no sketch at all', () => {
    const { studio } = studioWithSharedSketch()

    expect(() => studio.addFeature('bracket', createFeature(FeatureType.Shell))).not.toThrow()
  })

  it('rejects a feature naming a sketch from outside the studio', () => {
    const { studio } = studioWithSharedSketch()

    expect(() =>
      studio.addFeature('bracket', createFeature(FeatureType.Extrude, { sketchId: 'elsewhere' })),
    ).toThrow(/not in this studio/)
  })

  it('finds which part owns a feature', () => {
    const { studio } = studioWithSharedSketch()

    expect(studio.partsWithFeature('cover-extrude').map((part) => part.id)).toEqual(['cover'])
    expect(studio.partsWithFeature('nothing')).toEqual([])
  })
})

describe('PartStudio evaluation', () => {
  it('rebuilds one part against the shared sketch pool', async () => {
    const { studio } = studioWithSharedSketch()
    const engine = new FeatureEngine(new StubKernel())

    const evaluation = await studio.evaluatePart(engine, 'bracket')

    expect(evaluation.failures).toEqual([])
    expect(evaluation.bodies).toHaveLength(1)
  })

  it('rebuilds every part, references first', async () => {
    const { studio } = studioWithSharedSketch()
    studio.addPartReference('bracket', 'cover')
    const engine = new FeatureEngine(new StubKernel())

    const result = await studio.evaluateAll(engine)

    expect(result.order).toEqual(['cover', 'bracket'])
    expect(result.byPart.get('bracket')?.bodies).toHaveLength(1)
    expect(result.byPart.get('cover')?.bodies).toHaveLength(1)
  })
})

describe('PartStudio serialisation', () => {
  it('round-trips sketches, parts, references and the selection', () => {
    const { studio } = studioWithSharedSketch()
    studio.addPartReference('cover', 'bracket')
    studio.setActivePart('cover')

    const restored = PartStudio.fromJSON(studio.toJSON())

    expect(restored.id).toBe(studio.id)
    expect(restored.name).toBe('Housing')
    expect(restored.sketches.map((sketch) => sketch.id)).toEqual(['profile'])
    expect(restored.parts.map((part) => part.name)).toEqual(['Bracket', 'Cover'])
    expect(restored.getPart('cover')?.referencePartIds).toEqual(['bracket'])
    expect(restored.activePartId).toBe('cover')
    expect(restored.sketchUsage()[0]?.shared).toBe(true)
  })

  it('drops references to parts that did not survive the round trip', () => {
    const restored = PartStudio.fromJSON({
      id: 'studio',
      name: 'Damaged',
      sketches: [],
      parts: [
        {
          id: 'a',
          name: 'A',
          visible: true,
          color: null,
          tree: new FeatureTree().toJSON(),
          referencePartIds: ['a', 'vanished'],
        },
      ],
      activePartId: 'vanished',
    })

    expect(restored.getPart('a')?.referencePartIds).toEqual([])
    expect(restored.activePartId).toBeNull()
  })

  it('opens a studio written before parts and sketches were optional fields', () => {
    const restored = PartStudio.fromJSON({
      id: 'studio',
      name: 'Sparse',
    } as unknown as ReturnType<PartStudio['toJSON']>)

    expect(restored.partCount).toBe(0)
    expect(restored.sketchCount).toBe(0)
    expect(restored.activePartId).toBeNull()
  })

  it('clones without sharing state with the original', () => {
    const { studio } = studioWithSharedSketch()

    const copy = studio.clone()
    copy.renamePart('bracket', 'Renamed')
    copy.removeSketch('profile', true)

    expect(studio.getPart('bracket')?.name).toBe('Bracket')
    expect(studio.sketchCount).toBe(1)
  })
})
