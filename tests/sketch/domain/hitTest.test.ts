import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import {
  buildCircle,
  buildLine,
  buildRectangle,
  buildSpline,
} from '../../../src/sketch/domain/builders'
import { PointEntity } from '../../../src/sketch/domain/SketchEntity'
import { boundingBox, entitiesInBox, hitTest, hitTestAll } from '../../../src/sketch/domain/hitTest'

describe('hitTest', () => {
  it('finds a line under the cursor', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    expect(hitTest(model, { x: 50, y: 1 }, 3)?.id).toBe(line.id)
  })

  it('misses a line the cursor is far from', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    expect(hitTest(model, { x: 50, y: 40 }, 3)).toBeNull()
  })

  it('finds a circle by its outline, not its interior', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 50)
    expect(hitTest(model, { x: 50, y: 0 }, 3)?.id).toBe(circle.id)
    expect(hitTest(model, { x: 0, y: 10 }, 3)).toBeNull()
  })

  it('prefers a point over the curve it sits on', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    expect(hitTest(model, { x: 0, y: 0 }, 3)?.id).toBe(line.startPointId)
  })

  it('finds a spline', () => {
    const model = new SketchModel()
    const spline = buildSpline(model, [
      { x: 0, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 0 },
    ])
    const hit = hitTestAll(model, { x: 50, y: 40 }, 8).map((entity) => entity.id)
    expect(hit).toContain(spline.id)
  })

  it('returns every entity within tolerance', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 0, y: 1 }, { x: 100, y: 1 })
    expect(hitTestAll(model, { x: 50, y: 0.5 }, 3).length).toBeGreaterThanOrEqual(2)
  })

  it('ignores an empty sketch', () => {
    expect(hitTest(new SketchModel(), { x: 0, y: 0 }, 3)).toBeNull()
  })
})

describe('entitiesInBox', () => {
  it('selects entities fully inside the box', () => {
    const model = new SketchModel()
    const inside = buildLine(model, { x: 10, y: 10 }, { x: 20, y: 20 })
    buildLine(model, { x: 200, y: 200 }, { x: 300, y: 300 })

    const selected = entitiesInBox(model, { minX: 0, minY: 0, maxX: 50, maxY: 50 })

    expect(selected.map((entity) => entity.id)).toContain(inside.id)
    expect(selected).toHaveLength(3)
  })

  it('excludes entities that only partly overlap', () => {
    const model = new SketchModel()
    buildLine(model, { x: 10, y: 10 }, { x: 400, y: 400 })
    expect(entitiesInBox(model, { minX: 0, minY: 0, maxX: 50, maxY: 50 })).toHaveLength(1)
  })
})

describe('boundingBox', () => {
  it('spans every entity', () => {
    const model = new SketchModel()
    buildRectangle(model, { x: -10, y: -5 }, { x: 30, y: 15 })
    expect(boundingBox(model)).toEqual({ minX: -10, minY: -5, maxX: 30, maxY: 15 })
  })

  it('returns a unit box for an empty sketch', () => {
    expect(boundingBox(new SketchModel())).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('spans a lone point', () => {
    const model = new SketchModel()
    model.addEntity(new PointEntity({ x: 7, y: -3 }))
    expect(boundingBox(model)).toEqual({ minX: 7, minY: -3, maxX: 7, maxY: -3 })
  })
})
