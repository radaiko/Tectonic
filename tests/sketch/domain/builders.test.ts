import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import {
  buildArcThroughPoints,
  buildCenterArc,
  buildCircle,
  buildEllipse,
  buildLine,
  buildPolygon,
  buildRectangle,
  buildRegularPolygon,
  buildSlot,
  buildSpline,
} from '../../../src/sketch/domain/builders'
import { entityPoints } from '../../../src/sketch/domain/query'

describe('buildLine', () => {
  it('creates two points and a line', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 5 })
    expect(model.entities.size).toBe(3)
    expect(model.requirePoint(line.startPointId).x).toBe(0)
    expect(model.requirePoint(line.endPointId).y).toBe(5)
  })

  it('reuses an existing point when given an id', () => {
    const model = new SketchModel()
    const first = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const second = buildLine(model, { pointId: first.endPointId }, { x: 10, y: 10 })
    expect(second.startPointId).toBe(first.endPointId)
    expect(model.entitiesOfType('point')).toHaveLength(3)
  })

  it('marks construction geometry', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 1, y: 0 }, { isConstruction: true })
    expect(line.isConstruction).toBe(true)
  })
})

describe('buildCircle', () => {
  it('creates a centre point and a circle', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 2, y: 3 }, 7)
    expect(circle.radius).toBe(7)
    expect(model.requirePoint(circle.centerPointId).y).toBe(3)
  })
})

describe('buildRectangle', () => {
  it('creates four corners, four edges and the rectangle', () => {
    const model = new SketchModel()
    const rect = buildRectangle(model, { x: 0, y: 0 }, { x: 10, y: 4 })
    expect(model.entitiesOfType('point')).toHaveLength(4)
    expect(model.entitiesOfType('line')).toHaveLength(4)
    const corners = rect.cornerPointIds.map((id) => model.requirePoint(id))
    expect(corners.map((p) => [p.x, p.y])).toEqual([
      [0, 0],
      [10, 0],
      [10, 4],
      [0, 4],
    ])
  })

  it('constrains the edges horizontal and vertical', () => {
    const model = new SketchModel()
    buildRectangle(model, { x: 0, y: 0 }, { x: 10, y: 4 })
    const types = [...model.constraints.values()].map((c) => c.type).sort()
    expect(types).toEqual(['horizontal', 'horizontal', 'vertical', 'vertical'])
  })

  it('supports centre-out construction', () => {
    const model = new SketchModel()
    const rect = buildRectangle(model, { x: 0, y: 0 }, { x: 5, y: 2 }, { fromCenter: true })
    const corners = rect.cornerPointIds.map((id) => model.requirePoint(id))
    expect(corners[0]).toMatchObject({ x: -5, y: -2 })
    expect(corners[2]).toMatchObject({ x: 5, y: 2 })
  })
})

describe('buildSlot', () => {
  it('stores both centres and the width', () => {
    const model = new SketchModel()
    const slot = buildSlot(model, { x: 0, y: 0 }, { x: 20, y: 0 }, 6)
    expect(slot.width).toBe(6)
    expect(model.requirePoint(slot.center2PointId).x).toBe(20)
  })
})

describe('buildPolygon', () => {
  it('creates a point per vertex', () => {
    const model = new SketchModel()
    const poly = buildPolygon(model, [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
    ])
    expect(poly.pointIds).toHaveLength(3)
    expect(poly.closed).toBe(true)
  })

  it('can stay open', () => {
    const model = new SketchModel()
    const poly = buildPolygon(
      model,
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      { closed: false },
    )
    expect(poly.closed).toBe(false)
  })

  it('rejects fewer than two vertices', () => {
    expect(() => buildPolygon(new SketchModel(), [{ x: 0, y: 0 }])).toThrow(/at least two/)
  })
})

describe('buildRegularPolygon', () => {
  it('places n vertices on the circumscribed circle', () => {
    const model = new SketchModel()
    const poly = buildRegularPolygon(model, { x: 0, y: 0 }, 10, 6)
    expect(poly.pointIds).toHaveLength(6)
    const first = model.requirePoint(poly.pointIds[0] as string)
    expect(first.x).toBeCloseTo(10)
    expect(first.y).toBeCloseTo(0)
  })

  it('rejects fewer than three sides', () => {
    expect(() => buildRegularPolygon(new SketchModel(), { x: 0, y: 0 }, 5, 2)).toThrow(
      /at least three/,
    )
  })
})

describe('buildEllipse', () => {
  it('stores the major axis point and minor radius', () => {
    const model = new SketchModel()
    const ellipse = buildEllipse(model, { x: 0, y: 0 }, { x: 10, y: 0 }, 4)
    expect(ellipse.minorRadius).toBe(4)
    expect(model.requirePoint(ellipse.majorAxisPointId).x).toBe(10)
  })
})

describe('buildSpline', () => {
  it('creates a control point per position', () => {
    const model = new SketchModel()
    const spline = buildSpline(model, [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ])
    expect(spline.controlPointIds).toHaveLength(3)
  })

  it('rejects fewer than two control points', () => {
    expect(() => buildSpline(new SketchModel(), [{ x: 0, y: 0 }])).toThrow(/at least two/)
  })
})

describe('buildCenterArc', () => {
  it('derives the radius from the start point', () => {
    const model = new SketchModel()
    const arc = buildCenterArc(model, { x: 0, y: 0 }, { x: 5, y: 0 }, Math.PI / 2)
    expect(arc.radius).toBeCloseTo(5)
    const end = model.requirePoint(arc.endPointId)
    expect(end.x).toBeCloseTo(0)
    expect(end.y).toBeCloseTo(5)
  })
})

describe('buildArcThroughPoints', () => {
  it('fits an arc through three points', () => {
    const model = new SketchModel()
    const arc = buildArcThroughPoints(
      model,
      { x: -5, y: 0 },
      { x: 5, y: 0 },
      { x: 0, y: 5 },
    )
    expect(arc).not.toBeNull()
    expect(arc?.radius).toBeCloseTo(5)
    const center = model.requirePoint((arc as { centerPointId: string }).centerPointId)
    expect(center.x).toBeCloseTo(0)
    expect(center.y).toBeCloseTo(0)
  })

  it('returns null for collinear points', () => {
    const model = new SketchModel()
    expect(
      buildArcThroughPoints(model, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }),
    ).toBeNull()
  })
})

describe('entityPoints', () => {
  it('returns the resolved positions of an entity', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 3, y: 4 })
    expect(entityPoints(model, line)).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ])
  })
})
