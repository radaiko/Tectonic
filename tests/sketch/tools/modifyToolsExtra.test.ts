import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import {
  buildCenterArc,
  buildCircle,
  buildLine,
  buildSpline,
} from '../../../src/sketch/domain/builders'
import type { ArcEntity, CircleEntity } from '../../../src/sketch/domain/SketchEntity'
import { distance } from '../../../src/sketch/domain/geometry'
import { createToolContext, pointerEvent } from '../../../src/sketch/tools/SketchTool'
import { ChamferTool } from '../../../src/sketch/tools/ChamferTool'
import { DimensionTool } from '../../../src/sketch/tools/DimensionTool'
import { FilletTool } from '../../../src/sketch/tools/FilletTool'
import { MirrorTool } from '../../../src/sketch/tools/MirrorTool'
import { OffsetTool } from '../../../src/sketch/tools/OffsetTool'
import { PatternTool } from '../../../src/sketch/tools/PatternTool'
import { TrimTool } from '../../../src/sketch/tools/TrimTool'

const plainModel = (): SketchModel => new SketchModel({ gridSpacing: 0 })

function context(
  model: SketchModel,
  settings: Parameters<typeof createToolContext>[0]['settings'] = {},
): ReturnType<typeof createToolContext> {
  return createToolContext({ model, snapTolerance: 0, pickTolerance: 3, settings })
}

describe('TrimTool on rounded geometry', () => {
  it('turns a crossed circle into the arc that survives', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 20)
    buildLine(model, { x: -30, y: 0 }, { x: 30, y: 0 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 0, y: 20 }), context(model))

    expect(model.getEntity(circle.id)).toBeUndefined()
    const [arc] = model.entitiesOfType('arc') as ArcEntity[]
    expect(arc?.radius).toBeCloseTo(20)
    // The clicked top half is gone, so the arc runs the other way round.
    expect(model.requirePoint((arc as ArcEntity).startPointId).x).toBeCloseTo(-20)
    expect(model.requirePoint((arc as ArcEntity).endPointId).x).toBeCloseTo(20)
  })

  it('deletes a circle nothing crosses', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 20)
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 20, y: 0 }), context(model))

    expect(model.getEntity(circle.id)).toBeUndefined()
  })

  it('trims an arc back to the crossing it was clicked past', () => {
    const model = plainModel()
    const arc = buildCenterArc(model, { x: 0, y: 0 }, { x: 20, y: 0 }, Math.PI)
    buildLine(model, { x: 0, y: -30 }, { x: 0, y: 30 })
    const tool = new TrimTool()

    // Click the last quarter of the sweep, past the crossing at the top.
    tool.onPointerDown(pointerEvent({ x: -20, y: 0.001 }), context(model))

    expect(model.requirePoint(arc.endPointId).y).toBeCloseTo(20)
  })

  it('splits an arc when the trimmed span is in the middle', () => {
    const model = plainModel()
    const arc = buildCenterArc(model, { x: 0, y: 0 }, { x: 20, y: 0 }, Math.PI)
    buildLine(model, { x: -30, y: 10 }, { x: 30, y: 10 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 0, y: 20 }), context(model))

    expect(model.entitiesOfType('arc')).toHaveLength(2)
    expect(distance(model.requirePoint(arc.endPointId), { x: 0, y: 0 })).toBeCloseTo(20)
  })

  it('trims the far side of a line when the click is before every crossing', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 60, y: -20 }, { x: 60, y: 20 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 20, y: 0 }), context(model))

    expect(model.requirePoint(line.startPointId).x).toBeCloseTo(60)
  })

  it('extends a line backwards when the near end is clicked', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 40, y: 0 })
    buildLine(model, { x: -30, y: -20 }, { x: -30, y: 20 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 5, y: 0 }, { shiftKey: true }), context(model))

    expect(model.requirePoint(line.startPointId).x).toBeCloseTo(-30)
  })

  it('extends a line out to a circle', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildCircle(model, { x: 50, y: 0 }, 10)
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 9, y: 0 }, { shiftKey: true }), context(model))

    expect(model.requirePoint(line.endPointId).x).toBeCloseTo(40)
  })

  it('refuses to extend anything but a line', () => {
    const model = plainModel()
    buildCircle(model, { x: 0, y: 0 }, 20)
    const tool = new TrimTool()

    const result = tool.onPointerDown(pointerEvent({ x: 20, y: 0 }, { shiftKey: true }), context(model))

    expect(result?.error).toMatch(/only a line/i)
  })

  it('reports a shift-click that hits nothing', () => {
    const model = plainModel()
    const tool = new TrimTool()

    expect(
      tool.onPointerDown(pointerEvent({ x: 0, y: 0 }, { shiftKey: true }), context(model))?.error,
    ).toMatch(/nothing to extend here/i)
  })

  it('ignores geometry it cannot trim', () => {
    const model = plainModel()
    buildSpline(model, [
      { x: 0, y: 0 },
      { x: 20, y: 20 },
    ])
    const tool = new TrimTool()

    expect(tool.onPointerDown(pointerEvent({ x: 10, y: 10 }), context(model))?.error).toMatch(
      /nothing to trim/i,
    )
  })
})

describe('FilletTool limits', () => {
  it('rejects a radius that does not fit', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildLine(model, { x: 0, y: 0 }, { x: 0, y: 10 })
    const tool = new FilletTool()
    const ctx = context(model, { filletRadius: 50 })

    tool.onPointerDown(pointerEvent({ x: 5, y: 0 }), ctx)

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 5 }), ctx)?.error).toMatch(/too large/i)
  })

  it('rejects a radius of zero', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 0, y: 0 }, { x: 0, y: 100 })
    const tool = new FilletTool()
    const ctx = context(model, { filletRadius: 0 })

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), ctx)

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 50 }), ctx)?.error).toMatch(
      /greater than zero/i,
    )
  })

  it('rejects the same line picked twice', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const tool = new FilletTool()
    const ctx = context(model)

    tool.onPointerDown(pointerEvent({ x: 40, y: 0 }), ctx)

    expect(tool.onPointerDown(pointerEvent({ x: 60, y: 0 }), ctx)?.error).toMatch(
      /two different lines/i,
    )
  })

  it('remembers the line picked first', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const tool = new FilletTool()

    tool.onPointerDown(pointerEvent({ x: 40, y: 0 }), context(model))

    expect(tool.getFirstLineId()).toBe(line.id)
    tool.onCancel(context(model))
    expect(tool.getFirstLineId()).toBeNull()
  })

  it('sweeps the short way round whichever order the lines are picked in', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 0, y: 0 }, { x: 0, y: 100 })
    const tool = new FilletTool()
    const ctx = context(model, { filletRadius: 10 })

    tool.onPointerDown(pointerEvent({ x: 0, y: 60 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 60, y: 0 }), ctx)

    const [arc] = model.entitiesOfType('arc') as ArcEntity[]
    expect(arc?.clockwise).toBe(false)
  })
})

describe('ChamferTool limits', () => {
  it('rejects a distance that does not fit', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildLine(model, { x: 0, y: 0 }, { x: 0, y: 10 })
    const tool = new ChamferTool()
    const ctx = context(model, { chamferDistance: 40 })

    tool.onPointerDown(pointerEvent({ x: 5, y: 0 }), ctx)

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 5 }), ctx)?.error).toMatch(/too large/i)
  })

  it('rejects a distance of zero', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 0, y: 0 }, { x: 0, y: 100 })
    const tool = new ChamferTool()
    const ctx = context(model, { chamferDistance: 0 })

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), ctx)

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 50 }), ctx)?.error).toMatch(
      /greater than zero/i,
    )
  })
})

describe('DimensionTool pairings', () => {
  it('reports a first pick it cannot dimension', () => {
    const model = plainModel()
    buildSpline(model, [
      { x: 0, y: 0 },
      { x: 20, y: 20 },
    ])
    const tool = new DimensionTool()

    expect(tool.onPointerDown(pointerEvent({ x: 10, y: 10 }), context(model))?.error).toMatch(
      /nothing to dimension/i,
    )
  })

  it('reports a second pick that does not pair with the first', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 60, y: 0 })
    const tool = new DimensionTool()
    const ctx = context(model)

    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)
    const result = tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)

    expect(result?.error).toMatch(/matching second reference/i)
    expect(model.constraints.size).toBe(0)
  })

  it('dimensions the radius of an arc', () => {
    const model = plainModel()
    buildCenterArc(model, { x: 0, y: 0 }, { x: 15, y: 0 }, Math.PI / 2)
    const tool = new DimensionTool()

    // Halfway round the sweep, clear of both endpoints.
    tool.onPointerDown(pointerEvent({ x: 10.6, y: 10.6 }), context(model))

    const [constraint] = [...model.constraints.values()]
    expect(constraint?.type).toBe('radius')
  })

  it('exposes the dimension it last created and forgets a pending pick on cancel', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 60, y: 0 })
    const tool = new DimensionTool()
    const ctx = context(model)

    expect(tool.getLastConstraintId()).toBeNull()
    tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)
    expect(tool.getFirstPickId()).toBe(line.id)
    tool.onCancel(ctx)
    expect(tool.getFirstPickId()).toBeNull()

    tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 30, y: 200 }), ctx)

    const [constraint] = [...model.constraints.values()]
    expect(tool.getLastConstraintId()).toBe(constraint?.id)
  })
})

describe('MirrorTool and PatternTool details', () => {
  it('refuses to mirror a selection that is only the mirror line', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: -50 }, { x: 0, y: 50 })
    const ctx = context(model)
    ctx.selection.add(line.id)
    const tool = new MirrorTool()

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)?.error).toMatch(/select/i)
  })

  it('ignores selected ids that no longer exist', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: -50 }, { x: 0, y: 50 })
    const ctx = context(model)
    ctx.selection.add('ghost')
    const tool = new MirrorTool()

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)?.error).toMatch(/select/i)
  })

  it('patterns along +X when the click lands on the selection', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    const ctx = context(model, { patternMode: 'rectangular', patternCount: 2, patternSpacing: 15 })
    ctx.selection.add(circle.id)
    const tool = new PatternTool()

    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)

    const centers = (model.entitiesOfType('circle') as CircleEntity[])
      .map((entity) => model.requirePoint(entity.centerPointId).x)
      .sort((a, b) => a - b)
    expect(centers[1]).toBeCloseTo(15)
  })
})

describe('OffsetTool on arcs', () => {
  it('grows an arc away from its centre', () => {
    const model = plainModel()
    const arc = buildCenterArc(model, { x: 0, y: 0 }, { x: 20, y: 0 }, Math.PI / 2)
    const tool = new OffsetTool()

    tool.onPointerDown(pointerEvent({ x: 22, y: 0 }), context(model, { offsetDistance: 5 }))

    const created = (model.entitiesOfType('arc') as ArcEntity[]).find(
      (entity) => entity.id !== arc.id,
    ) as ArcEntity
    expect(created.radius).toBeCloseTo(25)
    expect(model.requirePoint(created.startPointId).x).toBeCloseTo(25)
    expect(model.requirePoint(created.endPointId).y).toBeCloseTo(25)
  })

  it('rejects an offset distance of zero', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const tool = new OffsetTool()

    expect(
      tool.onPointerDown(pointerEvent({ x: 50, y: 1 }), context(model, { offsetDistance: 0 }))
        ?.error,
    ).toMatch(/greater than zero/i)
  })
})
