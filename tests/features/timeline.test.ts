import { describe, expect, it } from 'vitest'
import { createFeature } from '../../src/features/domain/factory'
import { FeatureType } from '../../src/features/domain/FeatureType'
import type { FeatureParameters } from '../../src/features/domain/parameters'
import {
  buildTimeline,
  isRolledBack,
  rollBarPosition,
  sketchReferenceIds,
} from '../../src/features/domain/timeline'
import { FeatureTree } from '../../src/features/FeatureTree'
import { SketchModel } from '../../src/sketch/domain/SketchModel'

const sketch = (id: string, name = id): SketchModel => new SketchModel({ id, name })

const consumer = (
  id: string,
  sketchId: string | null,
  parameters: FeatureParameters = {},
): ReturnType<typeof createFeature> =>
  createFeature(FeatureType.Extrude, { id, name: id, sketchId, parameters })

/** The ordinary workflow: draw, build, draw, build. */
function alternating(): { tree: FeatureTree; sketches: SketchModel[] } {
  const sketches = [sketch('s1'), sketch('s2')]
  const tree = new FeatureTree([consumer('f1', 's1'), consumer('f2', 's2')])
  return { tree, sketches }
}

const shape = (entries: ReturnType<typeof buildTimeline>): string[] =>
  entries.map((entry) => entry.id)

describe('sketchReferenceIds', () => {
  it('finds the profile a feature is built on', () => {
    expect(sketchReferenceIds(consumer('f', 's1'))).toEqual(['s1'])
  })

  it('finds the extra sketches the multi-sketch operations name', () => {
    const swept = createFeature(FeatureType.Sweep, {
      sketchId: 's1',
      parameters: { pathSketchId: 's2' },
    })

    expect(sketchReferenceIds(swept).sort()).toEqual(['s1', 's2'])
  })

  it('finds every sketch of a list-valued reference', () => {
    const lofted = createFeature(FeatureType.Loft, {
      sketchId: null,
      parameters: { sectionSketchIds: ['s1', 's2'], guideSketchIds: ['s3'] },
    })

    expect(sketchReferenceIds(lofted).sort()).toEqual(['s1', 's2', 's3'])
  })

  it('reports a sketch named twice only once', () => {
    const feature = consumer('f', 's1', { pathSketchId: 's1' })

    expect(sketchReferenceIds(feature)).toEqual(['s1'])
  })

  it('has nothing to report for a feature built on no sketch', () => {
    expect(sketchReferenceIds(createFeature(FeatureType.Fillet, {}))).toEqual([])
  })
})

describe('buildTimeline', () => {
  it('reads as the order the work was done in', () => {
    const { tree, sketches } = alternating()

    expect(shape(buildTimeline(tree, sketches))).toEqual(['s1', 'f1', 's2', 'f2'])
  })

  it('puts each sketch in front of the feature built on it', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    for (const entry of entries) {
      if (entry.kind !== 'feature') continue
      for (const sketchId of sketchReferenceIds(entry.feature)) {
        const source = entries.find((candidate) => candidate.id === sketchId)
        expect(source?.position).toBeLessThan(entry.position)
      }
    }
  })

  /**
   * A sketch several features share belongs in front of the first of them — the
   * only placement that keeps it ahead of all of them.
   */
  it('puts a shared sketch in front of the earliest feature using it', () => {
    const tree = new FeatureTree([
      consumer('f1', null),
      consumer('f2', 's1'),
      consumer('f3', 's1'),
    ])

    expect(shape(buildTimeline(tree, [sketch('s1')]))).toEqual(['f1', 's1', 'f2', 'f3'])
  })

  it('leaves a sketch nothing consumes yet at the end, where it was just drawn', () => {
    const tree = new FeatureTree([consumer('f1', 's1')])

    expect(shape(buildTimeline(tree, [sketch('s1'), sketch('s2')]))).toEqual(['s1', 'f1', 's2'])
  })

  it('keeps unconsumed sketches in document order', () => {
    const entries = buildTimeline(new FeatureTree(), [sketch('s3'), sketch('s1'), sketch('s2')])

    expect(shape(entries)).toEqual(['s3', 's1', 's2'])
  })

  it('holds every sketch and every feature exactly once', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    expect(entries).toHaveLength(4)
    expect(new Set(shape(entries)).size).toBe(4)
  })

  it('numbers positions consecutively from zero', () => {
    const { tree, sketches } = alternating()

    expect(buildTimeline(tree, sketches).map((entry) => entry.position)).toEqual([0, 1, 2, 3])
  })

  it('counts the features ahead of each entry', () => {
    const { tree, sketches } = alternating()

    expect(buildTimeline(tree, sketches).map((entry) => entry.featuresBefore)).toEqual([0, 0, 1, 1])
  })

  it('carries each feature its own index, which reorder and rollback speak in', () => {
    const { tree, sketches } = alternating()
    const features = buildTimeline(tree, sketches).filter((entry) => entry.kind === 'feature')

    expect(features.map((entry) => (entry.kind === 'feature' ? entry.featureIndex : -1))).toEqual([
      0, 1,
    ])
  })

  it('is a plain list of features when the document has no sketches', () => {
    const { tree } = alternating()

    expect(shape(buildTimeline(tree, []))).toEqual(['f1', 'f2'])
  })

  it('is a plain list of sketches before anything is built', () => {
    expect(shape(buildTimeline(new FeatureTree(), [sketch('s1')]))).toEqual(['s1'])
  })

  it('has nothing in it for an empty document', () => {
    expect(buildTimeline(new FeatureTree(), [])).toEqual([])
  })

  /** A reference to a sketch the document no longer holds places nothing. */
  it('ignores a reference to a sketch that is not there', () => {
    const tree = new FeatureTree([consumer('f1', 'gone')])

    expect(shape(buildTimeline(tree, [sketch('s1')]))).toEqual(['f1', 's1'])
  })
})

describe('rollBarPosition', () => {
  it('sits where the feature it counts to begins', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    // s1, f1, s2, f2. The bar counts features, so "1" lands immediately before
    // the second one — past s2, which is exactly what keeps the sketch that
    // feature is built from standing while the feature itself is rolled back.
    expect(rollBarPosition(entries, 1)).toBe(3)
    expect(rollBarPosition(entries, 0)).toBe(1)
  })

  it('sits past the end when every feature is built', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    expect(rollBarPosition(entries, 2)).toBe(entries.length)
  })
})

describe('isRolledBack', () => {
  /**
   * Rolling back to just before a feature has to leave the sketch it consumes
   * built — that sketch is what the feature would be replayed from.
   */
  it('leaves the sketch of a rolled-back feature built', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)
    const at = (id: string) => entries.find((entry) => entry.id === id)

    // Bar at 1: f1 built, f2 rolled back, and both sketches still standing.
    expect(isRolledBack(entries, at('s1')!, 1)).toBe(false)
    expect(isRolledBack(entries, at('f1')!, 1)).toBe(false)
    expect(isRolledBack(entries, at('s2')!, 1)).toBe(false)
    expect(isRolledBack(entries, at('f2')!, 1)).toBe(true)
  })

  it('rolls back everything past the bar', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    expect(entries.map((entry) => isRolledBack(entries, entry, 0))).toEqual([
      false,
      true,
      true,
      true,
    ])
  })

  it('rolls nothing back when the bar is at the end', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    expect(entries.every((entry) => !isRolledBack(entries, entry, 2))).toBe(true)
  })

  /** What a row is drawn as never contradicts where the line is drawn. */
  it('agrees with the marker position for every bar setting', () => {
    const { tree, sketches } = alternating()
    const entries = buildTimeline(tree, sketches)

    for (let index = 0; index <= tree.length; index += 1) {
      const marker = rollBarPosition(entries, index)
      for (const entry of entries) {
        expect(isRolledBack(entries, entry, index)).toBe(entry.position >= marker)
      }
    }
  })
})
