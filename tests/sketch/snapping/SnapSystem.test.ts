import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import {
  buildCenterArc,
  buildCircle,
  buildLine,
  buildPolygon,
  buildSpline,
} from '../../../src/sketch/domain/builders'
import { SnapSystem } from '../../../src/sketch/snapping/SnapSystem'

describe('endpoint snapping', () => {
  it('snaps to a line endpoint', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 98, y: 1 }, model)

    expect(snap?.type).toBe('endpoint')
    expect(snap?.point).toEqual({ x: 100, y: 0 })
    expect(snap?.entityId).toBe(line.endPointId)
  })

  it('snaps to polygon vertices', () => {
    const model = new SketchModel()
    buildPolygon(model, [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
    ])
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 41, y: 41 }, model)
    expect(snap?.type).toBe('endpoint')
  })

  it('snaps to spline control points', () => {
    const model = new SketchModel()
    buildSpline(model, [
      { x: 0, y: 0 },
      { x: 30, y: 30 },
      { x: 60, y: 0 },
    ])
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 31, y: 30 }, model)
    expect(snap?.type).toBe('endpoint')
  })
})

describe('midpoint snapping', () => {
  it('snaps to the middle of a line', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 51, y: 1 }, model)

    expect(snap?.type).toBe('midpoint')
    expect(snap?.point.x).toBeCloseTo(50)
  })

  it('snaps to the middle of an arc', () => {
    const model = new SketchModel()
    buildCenterArc(model, { x: 0, y: 0 }, { x: 100, y: 0 }, Math.PI / 2)
    const expected = { x: 100 * Math.cos(Math.PI / 4), y: 100 * Math.sin(Math.PI / 4) }
    const snap = new SnapSystem({ tolerance: 5, enabledTypes: ['midpoint'] }).findSnap(
      { x: expected.x + 1, y: expected.y },
      model,
    )

    expect(snap?.type).toBe('midpoint')
  })
})

describe('centre snapping', () => {
  it('snaps to a circle centre', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 20, y: 20 }, 50)
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 22, y: 20 }, model)

    expect(snap?.type).toBe('center')
    expect(snap?.entityId).toBe(circle.centerPointId)
  })
})

describe('quadrant snapping', () => {
  it('snaps to the cardinal points of a circle', () => {
    const model = new SketchModel()
    buildCircle(model, { x: 0, y: 0 }, 50)
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 1, y: 49 }, model)

    expect(snap?.type).toBe('quadrant')
    expect(snap?.point.x).toBeCloseTo(0)
    expect(snap?.point.y).toBeCloseTo(50)
  })

  it('ignores quadrants outside an arc sweep', () => {
    const model = new SketchModel()
    buildCenterArc(model, { x: 0, y: 0 }, { x: 50, y: 0 }, Math.PI / 2)
    const system = new SnapSystem({ tolerance: 5, enabledTypes: ['quadrant'] })

    expect(system.findSnap({ x: 0, y: 50 }, model)?.point.y).toBeCloseTo(50)
    expect(system.findSnap({ x: -50, y: 0 }, model)).toBeNull()
  })
})

describe('intersection snapping', () => {
  it('snaps where two lines cross', () => {
    const model = new SketchModel()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    buildLine(model, { x: 10, y: -50 }, { x: 10, y: 50 })
    const snap = new SnapSystem({ tolerance: 5, enabledTypes: ['intersection'] }).findSnap(
      { x: 11, y: 1 },
      model,
    )

    expect(snap?.type).toBe('intersection')
    expect(snap?.point).toEqual({ x: 10, y: 0 })
  })

  it('snaps where a line crosses a circle', () => {
    const model = new SketchModel()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    buildCircle(model, { x: 0, y: 0 }, 20)
    const snap = new SnapSystem({ tolerance: 3, enabledTypes: ['intersection'] }).findSnap(
      { x: 21, y: 0 },
      model,
    )

    expect(snap?.point.x).toBeCloseTo(20)
  })

  it('snaps where two circles cross', () => {
    const model = new SketchModel()
    buildCircle(model, { x: 0, y: 0 }, 50)
    buildCircle(model, { x: 60, y: 0 }, 50)
    const snap = new SnapSystem({ tolerance: 5, enabledTypes: ['intersection'] }).findSnap(
      { x: 30, y: 40 },
      model,
    )

    expect(snap?.point.x).toBeCloseTo(30)
    expect(Math.abs(snap?.point.y ?? 0)).toBeCloseTo(40)
  })
})

describe('grid snapping', () => {
  it('snaps to the nearest grid point', () => {
    const model = new SketchModel({ gridSpacing: 10 })
    const snap = new SnapSystem({ tolerance: 4 }).findSnap({ x: 21, y: 39 }, model)

    expect(snap?.type).toBe('grid')
    expect(snap?.point).toEqual({ x: 20, y: 40 })
  })

  it('returns nothing when the cursor is off-grid and nothing else is near', () => {
    const model = new SketchModel({ gridSpacing: 10 })
    expect(new SnapSystem({ tolerance: 1 }).findSnap({ x: 25, y: 25 }, model)).toBeNull()
  })

  it('prefers an explicit grid spacing over the sketch setting', () => {
    const model = new SketchModel({ gridSpacing: 10 })
    const snap = new SnapSystem({ tolerance: 4, gridSpacing: 25 }).findSnap({ x: 24, y: 0 }, model)
    expect(snap?.point.x).toBe(25)
  })
})

describe('priority', () => {
  it('prefers an endpoint over a centre at the same distance', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 30, y: 0 })
    buildCircle(model, { x: 30, y: 0 }, 10)
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 30, y: 0 }, model)

    expect(snap?.type).toBe('endpoint')
  })

  it('prefers a centre over a midpoint', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildCircle(model, { x: 50, y: 0 }, 10)
    const snap = new SnapSystem({ tolerance: 5 }).findSnap({ x: 50, y: 0 }, model)

    expect(snap?.type).toBe('center')
  })

  it('sorts every candidate by priority then distance', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 20, y: 0 })
    const candidates = new SnapSystem({ tolerance: 30 }).findAll({ x: 10, y: 0 }, model)

    expect(candidates.length).toBeGreaterThan(1)
    expect(candidates[0]?.type).toBe('endpoint')
    for (let index = 1; index < candidates.length; index += 1) {
      const previous = candidates[index - 1]
      const current = candidates[index]
      expect(previous!.priority).toBeLessThanOrEqual(current!.priority)
    }
  })
})

describe('filters', () => {
  it('honours the enabled type list', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const snap = new SnapSystem({ tolerance: 5, enabledTypes: ['midpoint'] }).findSnap(
      { x: 1, y: 0 },
      model,
    )
    expect(snap).toBeNull()
  })

  it('ignores excluded entities', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const snap = new SnapSystem({ tolerance: 5, enabledTypes: ['endpoint'] }).findSnap(
      { x: 1, y: 0 },
      model,
      { excludeEntityIds: [line.startPointId] },
    )
    expect(snap).toBeNull()
  })

  it('carries a human-readable label for the cursor badge', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    expect(new SnapSystem({ tolerance: 5 }).findSnap({ x: 0, y: 0 }, model)?.label).toBe('Endpoint')
  })
})
