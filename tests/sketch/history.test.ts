import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildCircle, buildLine } from '../../src/sketch/domain/builders'
import { HorizontalConstraint } from '../../src/sketch/domain/Constraint'
import { SketchHistory, restoreModel } from '../../src/sketch/history'

function sketchWithLine(): { model: SketchModel; lineId: string } {
  const model = new SketchModel({ gridSpacing: 0 })
  return { model, lineId: buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 }).id }
}

describe('restoreModel', () => {
  it('refills the model in place, keeping the same object', () => {
    const { model } = sketchWithLine()
    const snapshot = model.toJSON()
    buildCircle(model, { x: 5, y: 5 }, 2)

    restoreModel(model, snapshot)

    expect(model.entitiesOfType('circle')).toHaveLength(0)
    expect(model.entitiesOfType('line')).toHaveLength(1)
  })

  it('restores the sketch settings too', () => {
    const model = new SketchModel({ name: 'Sketch', plane: 'XY', gridSpacing: 10 })
    const snapshot = model.toJSON()
    model.name = 'Renamed'
    model.plane = 'YZ'
    model.gridSpacing = 2

    restoreModel(model, snapshot)

    expect(model.name).toBe('Sketch')
    expect(model.plane).toBe('XY')
    expect(model.gridSpacing).toBe(10)
  })

  it('restores constraints', () => {
    const { model, lineId } = sketchWithLine()
    model.addConstraint(new HorizontalConstraint({ lineId }))
    const snapshot = model.toJSON()
    model.constraints.clear()

    restoreModel(model, snapshot)

    expect(model.constraints.size).toBe(1)
  })
})

describe('SketchHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const { model } = sketchWithLine()
    const history = new SketchHistory(model)

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    expect(history.undo()).toBe(false)
    expect(history.redo()).toBe(false)
  })

  it('undoes and redoes a change', () => {
    const { model } = sketchWithLine()
    const history = new SketchHistory(model)
    buildCircle(model, { x: 0, y: 0 }, 4)
    history.commit()

    expect(history.undo()).toBe(true)
    expect(model.entitiesOfType('circle')).toHaveLength(0)
    expect(history.canRedo).toBe(true)

    expect(history.redo()).toBe(true)
    expect(model.entitiesOfType('circle')).toHaveLength(1)
  })

  it('drops the redo branch once a new change is committed', () => {
    const { model } = sketchWithLine()
    const history = new SketchHistory(model)
    buildCircle(model, { x: 0, y: 0 }, 4)
    history.commit()
    history.undo()

    buildLine(model, { x: 0, y: 9 }, { x: 9, y: 9 })
    history.commit()

    expect(history.canRedo).toBe(false)
    expect(history.size).toBe(2)
  })

  it('forgets the oldest snapshots past its limit', () => {
    const { model } = sketchWithLine()
    const history = new SketchHistory(model, 2)

    buildCircle(model, { x: 0, y: 0 }, 1)
    history.commit()
    buildCircle(model, { x: 5, y: 0 }, 1)
    history.commit()

    expect(history.size).toBe(2)
    history.undo()
    expect(model.entitiesOfType('circle')).toHaveLength(1)
    expect(history.canUndo).toBe(false)
  })

  it('keeps at least one snapshot whatever limit it is given', () => {
    const { model } = sketchWithLine()
    const history = new SketchHistory(model, 0)

    history.commit()

    expect(history.size).toBe(1)
  })
})
