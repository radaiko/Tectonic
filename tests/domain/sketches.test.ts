import { describe, expect, it } from 'vitest'
import {
  createDocument,
  createSketchOn,
  documentSketch,
  documentSketches,
  nextSketchName,
  withSketch,
  withSketches,
} from '../../src/domain/Document'
import type { TectonicDocument } from '../../src/domain/Document'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import type { SketchModelJSON } from '../../src/sketch/domain/SketchModel'
import { faceSupport, originPlaneSupport } from '../../src/sketch/domain/SketchSupport'
import { restoreModel } from '../../src/sketch/history'
import { deserialize, serialize } from '../../src/io/FileService'

const NOW = '2026-07-26T12:00:00.000Z'

/** Three independent sketches, one per kind of support the document allows. */
function threeSketches(): SketchModel[] {
  return [
    createSketchOn(originPlaneSupport('XY'), 'Sketch 1'),
    createSketchOn(originPlaneSupport('XZ'), 'Sketch 2'),
    createSketchOn(faceSupport('body-1', 'face-3', 2.5), 'Sketch 3'),
  ]
}

/**
 * A document as written before sketches became a list. The `sketches` key is
 * absent rather than present-and-undefined — that is what an opened pre-M2 file
 * parses to, and the only shape the document type admits.
 */
function legacyDocument(sketch?: SketchModelJSON): TectonicDocument {
  const { sketches: _dropped, ...rest } = createDocument({ now: NOW })
  return sketch === undefined ? rest : { ...rest, sketch }
}

describe('multiple sketches', () => {
  it('keeps every sketch, its support and its identity through a save and reload', () => {
    const sketches = threeSketches()
    const saved = withSketches(createDocument({ now: NOW }), sketches, NOW)

    const reloaded = documentSketches(deserialize(serialize(saved)))

    expect(reloaded.map((entry) => entry.name)).toEqual(['Sketch 1', 'Sketch 2', 'Sketch 3'])
    expect(reloaded.map((entry) => entry.id)).toEqual(sketches.map((entry) => entry.id))
    expect(reloaded.map((entry) => entry.support)).toEqual([
      { kind: 'origin-plane', plane: 'XY', offset: 0 },
      { kind: 'origin-plane', plane: 'XZ', offset: 0 },
      { kind: 'face', bodyId: 'body-1', faceId: 'face-3', offset: 2.5 },
    ])
  })

  it('replaces the seeded sketch rather than appending to it', () => {
    // A new document already holds one sketch; writing a list must not leave
    // the original behind as a fourth entry.
    const document = withSketches(createDocument({ now: NOW }), threeSketches(), NOW)

    expect(document.sketches).toHaveLength(3)
  })

  it('drops the legacy single-sketch field so it cannot contradict the list', () => {
    const legacy = legacyDocument(new SketchModel({ name: 'Old', plane: 'YZ' }).toJSON())

    const migrated = withSketches(legacy, threeSketches(), NOW)

    expect(migrated.sketch).toBeUndefined()
    expect(documentSketches(migrated)).toHaveLength(3)
  })

  it('reads a pre-M2 document that carries one sketch and no list', () => {
    const legacy = legacyDocument(new SketchModel({ id: 'old-1', name: 'Old', plane: 'YZ' }).toJSON())

    const sketches = documentSketches(deserialize(serialize(legacy)))

    expect(sketches).toHaveLength(1)
    expect(sketches[0]?.id).toBe('old-1')
    expect(sketches[0]?.support).toEqual({ kind: 'origin-plane', plane: 'YZ', offset: 0 })
  })

  it('has no sketches when the document holds neither field', () => {
    const bare = legacyDocument()

    expect(documentSketches(bare)).toEqual([])
    // The single-sketch convenience still hands back something drawable.
    expect(documentSketch(bare).entities.size).toBe(0)
  })

  it('rejects a "sketches" field that is not a list of sketches', () => {
    const document = createDocument({ now: NOW })

    expect(() => deserialize(JSON.stringify({ ...document, sketches: 'nope' }))).toThrow(
      /"sketches" is not an array/,
    )
    expect(() => deserialize(JSON.stringify({ ...document, sketches: [{}] }))).toThrow(
      /not a sketch/,
    )
  })
})

describe('withSketch', () => {
  it('updates the matching sketch in place and appends an unknown one', () => {
    const [first, second, third] = threeSketches() as [SketchModel, SketchModel, SketchModel]
    const document = withSketches(createDocument({ now: NOW }), [first, second], NOW)

    second.name = 'Renamed'
    const updated = withSketch(document, second, NOW)
    const appended = withSketch(updated, third, NOW)

    expect(documentSketches(updated).map((entry) => entry.name)).toEqual(['Sketch 1', 'Renamed'])
    expect(documentSketches(appended)).toHaveLength(3)
  })
})

describe('nextSketchName', () => {
  it('skips names already taken', () => {
    expect(nextSketchName([])).toBe('Sketch 1')
    expect(nextSketchName(threeSketches())).toBe('Sketch 4')
    expect(nextSketchName([createSketchOn(originPlaneSupport('XY'), 'Sketch 2')])).toBe('Sketch 1')
  })
})

describe('sketch undo', () => {
  it('does not detach a face-attached sketch when restoring a snapshot', () => {
    const sketch = createSketchOn(faceSupport('body-2', 'face-7'), 'On a face')
    const snapshot = sketch.toJSON()

    restoreModel(sketch, snapshot)

    // `plane` reports XY for a face sketch by design; the support is what has
    // to survive, and assigning `plane` on restore used to overwrite it.
    expect(sketch.support).toEqual({ kind: 'face', bodyId: 'body-2', faceId: 'face-7', offset: 0 })
  })
})
