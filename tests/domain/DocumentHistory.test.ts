import { describe, expect, it } from 'vitest'
import {
  DocumentHistory,
  restoreDocument,
  snapshotDocument,
} from '../../src/domain/DocumentHistory'
import type { DocumentModelHandle } from '../../src/domain/DocumentHistory'
import { FeatureTree } from '../../src/features/FeatureTree'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildLine, buildRectangle } from '../../src/sketch/domain/builders'
import { faceSupport, originPlaneSupport } from '../../src/sketch/domain/SketchSupport'

/** A live document the history can read and refill, as the editor holds one. */
function documentModel(name = 'Untitled'): DocumentModelHandle & { title: string } {
  const state = {
    title: name,
    sketches: [] as SketchModel[],
    tree: new FeatureTree(),
    getName: () => state.title,
    setName: (next: string) => {
      state.title = next
    },
  }
  return state
}

function sketchOn(plane: 'XY' | 'XZ' | 'YZ', name: string): SketchModel {
  return new SketchModel({ name, support: originPlaneSupport(plane) })
}

describe('document snapshots', () => {
  it('captures the title, the sketches and the history together', () => {
    const model = documentModel('Bracket')
    model.sketches.push(sketchOn('XY', 'Sketch 1'))
    model.tree.addFeature(createFeature(FeatureType.Extrude, { id: 'e1' }))

    const snapshot = snapshotDocument(model)

    expect(snapshot.name).toBe('Bracket')
    expect(snapshot.sketches).toHaveLength(1)
    expect(snapshot.features).toHaveLength(1)
  })

  it('refills the very sketch objects the editor is holding', () => {
    const model = documentModel()
    const sketch = sketchOn('XY', 'Sketch 1')
    model.sketches.push(sketch)
    const before = snapshotDocument(model)

    buildRectangle(sketch, { x: 0, y: 0 }, { x: 10, y: 10 })
    expect(sketch.entities.size).toBeGreaterThan(0)
    restoreDocument(model, before)

    // Identity matters as much as content: the sketch editor, its renderer and
    // its own undo stack are all built around this object. Swapping in a
    // replacement would leave every one of them showing the pre-undo drawing.
    expect(model.sketches[0]).toBe(sketch)
    expect(sketch.entities.size).toBe(0)
  })

  it('refills the very feature tree the panels are holding', () => {
    const model = documentModel()
    const before = snapshotDocument(model)
    const tree = model.tree

    tree.addFeature(createFeature(FeatureType.Extrude, { id: 'e1' }))
    restoreDocument(model, before)

    expect(model.tree).toBe(tree)
    expect(tree.length).toBe(0)
  })

  it('keeps a face support intact rather than rewriting it to a plane', () => {
    const model = documentModel()
    const sketch = new SketchModel({
      name: 'On a face',
      support: faceSupport('body-1', 'face-2', 0, {
        normal: { x: 0, y: 0, z: 1 },
        offset: 5,
        centroid: { x: 0, y: 0, z: 5 },
        area: 100,
        outermost: true,
      }),
    })
    model.sketches.push(sketch)
    const before = snapshotDocument(model)

    buildLine(sketch, { x: 0, y: 0 }, { x: 5, y: 5 })
    restoreDocument(model, before)

    expect(sketch.support).toMatchObject({ kind: 'face', bodyId: 'body-1', faceId: 'face-2' })
    expect((sketch.support as { fingerprint?: unknown }).fingerprint).toBeDefined()
  })
})

describe('DocumentHistory', () => {
  it('starts with nothing to undo and nothing to redo', () => {
    const history = new DocumentHistory(documentModel())

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    expect(history.undoLabel).toBeNull()
  })

  it('takes back an added sketch', () => {
    const model = documentModel()
    const history = new DocumentHistory(model)

    model.sketches.push(sketchOn('XZ', 'Sketch 1'))
    history.commit('Add sketch on XZ')

    expect(history.undoLabel).toBe('Add sketch on XZ')
    expect(history.undo()).toBe('Add sketch on XZ')
    expect(model.sketches).toHaveLength(0)
  })

  it('puts it back on redo', () => {
    const model = documentModel()
    const history = new DocumentHistory(model)
    model.sketches.push(sketchOn('XZ', 'Sketch 1'))
    history.commit('Add sketch on XZ')
    history.undo()

    expect(history.redoLabel).toBe('Add sketch on XZ')
    expect(history.redo()).toBe('Add sketch on XZ')
    expect(model.sketches).toHaveLength(1)
    expect(model.sketches[0]?.name).toBe('Sketch 1')
  })

  it('takes back a deleted sketch', () => {
    const model = documentModel()
    model.sketches.push(sketchOn('XY', 'Sketch 1'))
    const history = new DocumentHistory(model)

    model.sketches.splice(0, 1)
    history.commit('Delete Sketch 1')
    history.undo()

    expect(model.sketches.map((sketch) => sketch.name)).toEqual(['Sketch 1'])
  })

  it('takes back a feature, a reorder and a suppression in turn', () => {
    const model = documentModel()
    const history = new DocumentHistory(model)

    model.tree.addFeature(createFeature(FeatureType.Extrude, { id: 'e1', name: 'Extrude 1' }))
    history.commit('Add Extrude')
    model.tree.addFeature(createFeature(FeatureType.Shell, { id: 's1', name: 'Shell 1' }))
    history.commit('Add Shell')
    model.tree.reorderFeature('s1', 0)
    history.commit('Reorder Shell 1')
    model.tree.suppressFeature('e1')
    history.commit('Suppress Extrude 1')

    expect(history.undo()).toBe('Suppress Extrude 1')
    expect(model.tree.requireFeature('e1').suppressed).toBe(false)
    expect(history.undo()).toBe('Reorder Shell 1')
    expect(model.tree.features.map((f) => f.id)).toEqual(['e1', 's1'])
    expect(history.undo()).toBe('Add Shell')
    expect(model.tree.length).toBe(1)
    expect(history.undo()).toBe('Add Extrude')
    expect(model.tree.length).toBe(0)
    expect(history.canUndo).toBe(false)
  })

  it('takes back a parameter change', () => {
    const model = documentModel()
    model.tree.addFeature(
      createFeature(FeatureType.Extrude, { id: 'e1', parameters: { distance: 10 } }),
    )
    const history = new DocumentHistory(model)

    model.tree.requireFeature('e1').setParameters({ distance: 40 })
    history.commit('Edit Extrude 1')
    history.undo()

    expect(model.tree.requireFeature('e1').parameters.distance).toBe(10)
  })

  it('takes back a change of support', () => {
    const model = documentModel()
    const sketch = sketchOn('XY', 'Sketch 1')
    model.sketches.push(sketch)
    const history = new DocumentHistory(model)

    sketch.support = faceSupport('body-1', 'face-0')
    history.commit('Move Sketch 1 to a face')
    history.undo()

    expect(sketch.support).toEqual(originPlaneSupport('XY'))
  })

  it('takes back a rename of the document', () => {
    const model = documentModel('Untitled')
    const history = new DocumentHistory(model)

    model.setName('Bracket')
    history.commit('Rename document')
    history.undo()

    expect(model.getName()).toBe('Untitled')
  })

  it('collapses a run of edits that share a key into one step', () => {
    const model = documentModel('Untitled')
    const history = new DocumentHistory(model)

    for (const title of ['B', 'Br', 'Bra', 'Brac']) {
      model.setName(title)
      history.commit('Rename document', { coalesceKey: 'document-name' })
    }

    // One step, not four: typing a title is one decision, and undo should take
    // back the rename rather than the last keystroke of it.
    expect(history.size).toBe(2)
    history.undo()
    expect(model.getName()).toBe('Untitled')
  })

  it('starts a new step when a different command interrupts the run', () => {
    const model = documentModel('Untitled')
    const history = new DocumentHistory(model)

    model.setName('Brack')
    history.commit('Rename document', { coalesceKey: 'document-name' })
    model.tree.addFeature(createFeature(FeatureType.Extrude, { id: 'e1' }))
    history.commit('Add Extrude')
    model.setName('Bracket')
    history.commit('Rename document', { coalesceKey: 'document-name' })

    expect(history.undo()).toBe('Rename document')
    expect(model.getName()).toBe('Brack')
    expect(history.undo()).toBe('Add Extrude')
  })

  it('collapses sketch drawing per sketch, not across two of them', () => {
    const model = documentModel()
    const first = sketchOn('XY', 'Sketch 1')
    const second = sketchOn('XZ', 'Sketch 2')
    model.sketches.push(first, second)
    const history = new DocumentHistory(model)

    buildLine(first, { x: 0, y: 0 }, { x: 1, y: 1 })
    history.commit('Edit Sketch 1', { coalesceKey: 'sketch:1' })
    buildLine(second, { x: 0, y: 0 }, { x: 2, y: 2 })
    history.commit('Edit Sketch 2', { coalesceKey: 'sketch:2' })

    expect(history.undo()).toBe('Edit Sketch 2')
    expect(second.entities.size).toBe(0)
    expect(first.entities.size).toBeGreaterThan(0)
  })

  it('drops the redo branch once a new edit is made', () => {
    const model = documentModel()
    const history = new DocumentHistory(model)
    model.tree.addFeature(createFeature(FeatureType.Extrude, { id: 'e1' }))
    history.commit('Add Extrude')
    history.undo()

    model.tree.addFeature(createFeature(FeatureType.Revolve, { id: 'r1' }))
    history.commit('Add Revolve')

    expect(history.canRedo).toBe(false)
    expect(history.undoLabel).toBe('Add Revolve')
  })

  it('will not fold a new edit into a run that an undo already closed', () => {
    const model = documentModel('Untitled')
    const history = new DocumentHistory(model)
    model.setName('One')
    history.commit('Rename document', { coalesceKey: 'document-name' })
    history.undo()

    model.setName('Two')
    history.commit('Rename document', { coalesceKey: 'document-name' })

    // Folding here would have overwritten the entry the undo just stepped off,
    // losing the way back to "Untitled".
    expect(history.undo()).toBe('Rename document')
    expect(model.getName()).toBe('Untitled')
  })

  it('forgets the oldest steps rather than growing without bound', () => {
    const model = documentModel()
    const history = new DocumentHistory(model, 3)

    for (let index = 0; index < 10; index += 1) {
      model.setName(`Title ${index}`)
      history.commit(`Rename ${index}`)
    }

    expect(history.size).toBe(3)
    expect(history.undoLabel).toBe('Rename 9')
  })

  it('reports nothing to undo at the start and nothing to redo at the end', () => {
    const history = new DocumentHistory(documentModel())

    expect(history.undo()).toBeNull()
    expect(history.redo()).toBeNull()
  })
})
