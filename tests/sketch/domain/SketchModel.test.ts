import { describe, expect, it } from 'vitest'
import {
  CircleEntity,
  LineEntity,
  PointEntity,
} from '../../../src/sketch/domain/SketchEntity'
import {
  DistanceConstraint,
  HorizontalConstraint,
  RadiusConstraint,
} from '../../../src/sketch/domain/Constraint'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'

function modelWithLine(): { model: SketchModel; line: LineEntity; a: PointEntity; b: PointEntity } {
  const model = new SketchModel({ id: 's1', name: 'Sketch 1' })
  const a = model.addEntity(new PointEntity({ id: 'a', x: 0, y: 0 }))
  const b = model.addEntity(new PointEntity({ id: 'b', x: 10, y: 0 }))
  const line = model.addEntity(new LineEntity({ id: 'l', startPointId: 'a', endPointId: 'b' }))
  return { model, line, a, b }
}

describe('SketchModel defaults', () => {
  it('uses the XY plane and a 10mm grid', () => {
    const model = new SketchModel()
    expect(model.plane).toBe('XY')
    expect(model.gridSpacing).toBe(10)
    expect(model.name).toBe('Sketch')
    expect(model.id).not.toHaveLength(0)
  })
})

describe('entity storage', () => {
  it('stores added entities by id', () => {
    const { model, line } = modelWithLine()
    expect(model.entities.size).toBe(3)
    expect(model.getEntity('l')).toBe(line)
  })

  it('returns undefined for an unknown id', () => {
    expect(new SketchModel().getEntity('nope')).toBeUndefined()
  })

  it('requires an entity that must exist', () => {
    const { model } = modelWithLine()
    expect(model.requireEntity('l').id).toBe('l')
    expect(() => model.requireEntity('nope')).toThrow(/No sketch entity/)
  })

  it('reads a point by id', () => {
    const { model } = modelWithLine()
    expect(model.requirePoint('a').x).toBe(0)
    expect(() => model.requirePoint('l')).toThrow(/not a point/)
  })

  it('lists entities of a given type', () => {
    const { model } = modelWithLine()
    expect(model.entitiesOfType('point')).toHaveLength(2)
    expect(model.entitiesOfType('line')).toHaveLength(1)
  })
})

describe('removeEntity', () => {
  it('removes the entity and reports success', () => {
    const { model } = modelWithLine()
    expect(model.removeEntity('l')).toBe(true)
    expect(model.getEntity('l')).toBeUndefined()
  })

  it('reports failure for an unknown id', () => {
    expect(new SketchModel().removeEntity('nope')).toBe(false)
  })

  it('cascades to entities that reference the removed one', () => {
    const { model } = modelWithLine()
    model.removeEntity('a')
    expect(model.getEntity('l')).toBeUndefined()
    expect(model.getEntity('b')).toBeDefined()
  })

  it('drops constraints that reference a removed entity', () => {
    const { model } = modelWithLine()
    model.addConstraint(new HorizontalConstraint({ id: 'h', lineId: 'l' }))
    model.removeEntity('l')
    expect(model.constraints.size).toBe(0)
  })
})

describe('constraint storage', () => {
  it('stores and removes constraints', () => {
    const { model } = modelWithLine()
    model.addConstraint(new HorizontalConstraint({ id: 'h', lineId: 'l' }))
    expect(model.constraints.size).toBe(1)
    expect(model.removeConstraint('h')).toBe(true)
    expect(model.removeConstraint('h')).toBe(false)
  })

  it('rejects a constraint referencing a missing entity', () => {
    const model = new SketchModel()
    expect(() => model.addConstraint(new HorizontalConstraint({ lineId: 'ghost' }))).toThrow(
      /unknown entity/,
    )
  })

  it('lists the constraints attached to an entity', () => {
    const { model } = modelWithLine()
    const h = model.addConstraint(new HorizontalConstraint({ lineId: 'l' }))
    model.addConstraint(new DistanceConstraint({ pointId1: 'a', pointId2: 'b', value: 10 }))
    expect(model.constraintsFor('l')).toEqual([h])
    expect(model.constraintsFor('a')).toHaveLength(1)
  })

  it('auto-names dimensional constraints in sequence', () => {
    const { model } = modelWithLine()
    const first = model.addConstraint(
      new DistanceConstraint({ pointId1: 'a', pointId2: 'b', value: 10 }),
    )
    const circleCenter = model.addEntity(new PointEntity({ x: 5, y: 5 }))
    const circle = model.addEntity(
      new CircleEntity({ centerPointId: circleCenter.id, radius: 3 }),
    )
    const second = model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 3 }))
    expect(first.name).toBe('d1')
    expect(second.name).toBe('d2')
  })

  it('keeps an explicitly supplied dimension name', () => {
    const { model } = modelWithLine()
    const c = model.addConstraint(
      new DistanceConstraint({ pointId1: 'a', pointId2: 'b', value: 10, name: 'width' }),
    )
    expect(c.name).toBe('width')
  })

  it('does not name geometric constraints', () => {
    const { model } = modelWithLine()
    const h = model.addConstraint(new HorizontalConstraint({ lineId: 'l' }))
    expect('name' in h).toBe(false)
  })
})

describe('serialization', () => {
  it('round-trips a populated sketch', () => {
    const { model } = modelWithLine()
    model.gridSpacing = 5
    model.addConstraint(new HorizontalConstraint({ id: 'h', lineId: 'l' }))
    model.addConstraint(
      new DistanceConstraint({ id: 'd', pointId1: 'a', pointId2: 'b', value: 10 }),
    )

    const restored = SketchModel.fromJSON(JSON.parse(JSON.stringify(model.toJSON())))

    expect(restored.id).toBe(model.id)
    expect(restored.name).toBe(model.name)
    expect(restored.plane).toBe('XY')
    expect(restored.gridSpacing).toBe(5)
    expect(restored.entities.size).toBe(3)
    expect(restored.constraints.size).toBe(2)
    expect(restored.requirePoint('b').x).toBe(10)
    expect(restored.toJSON()).toEqual(model.toJSON())
  })

  it('is shown unless it has been hidden', () => {
    expect(new SketchModel().visible).toBe(true)
    expect(new SketchModel({ visible: false }).visible).toBe(false)
  })

  it('round-trips whether it is hidden', () => {
    const model = new SketchModel({ id: 's1' })
    model.visible = false

    expect(SketchModel.fromJSON(JSON.parse(JSON.stringify(model.toJSON()))).visible).toBe(false)
  })

  /** A file written before a sketch could be hidden holds none that are. */
  it('reads a sketch written without a visibility as shown', () => {
    const json = new SketchModel({ id: 's1' }).toJSON()
    const { visible: _omitted, ...legacy } = json

    expect(SketchModel.fromJSON(legacy).visible).toBe(true)
  })

  it('clones into an independent model', () => {
    const { model } = modelWithLine()
    const copy = model.clone()
    copy.requirePoint('a').x = 99
    expect(model.requirePoint('a').x).toBe(0)
    expect(copy.id).toBe(model.id)
  })
})
