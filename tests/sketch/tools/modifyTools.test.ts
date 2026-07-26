import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import { buildCircle, buildLine } from '../../../src/sketch/domain/builders'
import type { ArcEntity, CircleEntity, LineEntity } from '../../../src/sketch/domain/SketchEntity'
import { distance } from '../../../src/sketch/domain/geometry'
import { createToolContext, pointerEvent } from '../../../src/sketch/tools/SketchTool'
import { ChamferTool } from '../../../src/sketch/tools/ChamferTool'
import { DimensionTool } from '../../../src/sketch/tools/DimensionTool'
import { FilletTool } from '../../../src/sketch/tools/FilletTool'
import { MirrorTool } from '../../../src/sketch/tools/MirrorTool'
import { OffsetTool } from '../../../src/sketch/tools/OffsetTool'
import { PatternTool } from '../../../src/sketch/tools/PatternTool'
import { TrimTool } from '../../../src/sketch/tools/TrimTool'

function context(
  model: SketchModel,
  settings: Parameters<typeof createToolContext>[0]['settings'] = {},
): ReturnType<typeof createToolContext> {
  return createToolContext({ model, snapTolerance: 0, pickTolerance: 3, settings })
}

const plainModel = (): SketchModel => new SketchModel({ gridSpacing: 0 })

describe('TrimTool', () => {
  it('trims a line back to the crossing it was clicked past', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 50, y: -50 }, { x: 50, y: 50 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 80, y: 0 }), context(model))

    expect(model.requirePoint(line.endPointId).x).toBeCloseTo(50)
  })

  it('splits a line when the trimmed span is in the middle', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 30, y: -50 }, { x: 30, y: 50 })
    buildLine(model, { x: 70, y: -50 }, { x: 70, y: 50 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), context(model))

    expect(model.entitiesOfType('line')).toHaveLength(4)
    expect(model.requirePoint(line.endPointId).x).toBeCloseTo(30)
  })

  it('deletes an entity that crosses nothing', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), context(model))

    expect(model.getEntity(line.id)).toBeUndefined()
  })

  it('reports a miss', () => {
    const model = plainModel()
    const tool = new TrimTool()
    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context(model))?.error).toMatch(
      /nothing to trim/i,
    )
  })

  it('extends a line to the next crossing when shift is held', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 40, y: 0 })
    buildLine(model, { x: 80, y: -50 }, { x: 80, y: 50 })
    const tool = new TrimTool()

    tool.onPointerDown(pointerEvent({ x: 35, y: 0 }, { shiftKey: true }), context(model))

    expect(model.requirePoint(line.endPointId).x).toBeCloseTo(80)
  })

  it('reports when there is nothing to extend to', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 40, y: 0 })
    const tool = new TrimTool()

    const result = tool.onPointerDown(pointerEvent({ x: 35, y: 0 }, { shiftKey: true }), context(model))

    expect(result?.error).toMatch(/nothing to extend/i)
  })
})

describe('FilletTool', () => {
  it('rounds the corner between two lines', () => {
    const model = plainModel()
    const first = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const second = buildLine(model, { x: 0, y: 0 }, { x: 0, y: 100 })
    const tool = new FilletTool()
    const ctx = context(model, { filletRadius: 10 })

    tool.onPointerDown(pointerEvent({ x: 60, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 0, y: 60 }), ctx)

    const [arc] = model.entitiesOfType('arc') as ArcEntity[]
    expect(arc?.radius).toBeCloseTo(10)
    expect(model.requirePoint(first.startPointId)).toMatchObject({
      x: expect.closeTo(10),
      y: expect.closeTo(0),
    })
    expect(model.requirePoint(second.startPointId)).toMatchObject({
      x: expect.closeTo(0),
      y: expect.closeTo(10),
    })
  })

  it('rejects two parallel lines', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 0, y: 20 }, { x: 100, y: 20 })
    const tool = new FilletTool()
    const ctx = context(model, { filletRadius: 5 })

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), ctx)
    const result = tool.onPointerDown(pointerEvent({ x: 50, y: 20 }), ctx)

    expect(result?.error).toMatch(/do not meet/i)
  })

  it('requires a line', () => {
    const model = plainModel()
    buildCircle(model, { x: 0, y: 0 }, 20)
    const tool = new FilletTool()

    const result = tool.onPointerDown(pointerEvent({ x: 20, y: 0 }), context(model))

    expect(result?.error).toMatch(/pick a line/i)
  })
})

describe('ChamferTool', () => {
  it('cuts the corner between two lines', () => {
    const model = plainModel()
    const first = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const second = buildLine(model, { x: 0, y: 0 }, { x: 0, y: 100 })
    const tool = new ChamferTool()
    const ctx = context(model, { chamferDistance: 5 })

    tool.onPointerDown(pointerEvent({ x: 60, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 0, y: 60 }), ctx)

    expect(model.entitiesOfType('line')).toHaveLength(3)
    expect(model.requirePoint(first.startPointId).x).toBeCloseTo(5)
    expect(model.requirePoint(second.startPointId).y).toBeCloseTo(5)
  })

  it('rejects two parallel lines', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    buildLine(model, { x: 0, y: 20 }, { x: 100, y: 20 })
    const tool = new ChamferTool()
    const ctx = context(model, { chamferDistance: 5 })

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), ctx)
    expect(tool.onPointerDown(pointerEvent({ x: 50, y: 20 }), ctx)?.error).toMatch(/do not meet/i)
  })
})

describe('DimensionTool', () => {
  it('dimensions the distance between two points', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 40, y: 30 })
    const tool = new DimensionTool()
    const ctx = context(model)

    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 40, y: 30 }), ctx)

    const [constraint] = [...model.constraints.values()]
    expect(constraint?.type).toBe('distance')
    expect((constraint as { value: number }).value).toBeCloseTo(50)
    expect(model.getEntity(line.id)).toBeDefined()
  })

  it('dimensions the radius of a circle', () => {
    const model = plainModel()
    buildCircle(model, { x: 0, y: 0 }, 25)
    const tool = new DimensionTool()

    tool.onPointerDown(pointerEvent({ x: 25, y: 0 }), context(model))

    const [constraint] = [...model.constraints.values()]
    expect(constraint?.type).toBe('radius')
    expect((constraint as { value: number }).value).toBeCloseTo(25)
  })

  it('dimensions the length of a line', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 60, y: 0 })
    const tool = new DimensionTool()
    const ctx = context(model)

    tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 30, y: 200 }), ctx)

    const [constraint] = [...model.constraints.values()]
    expect(constraint?.type).toBe('length')
    expect((constraint as { value: number }).value).toBeCloseTo(60)
  })

  it('dimensions the angle between two lines', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: 0 }, { x: 60, y: 0 })
    buildLine(model, { x: 0, y: 0 }, { x: 0, y: 60 })
    const tool = new DimensionTool()
    const ctx = context(model)

    tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 0, y: 30 }), ctx)

    const [constraint] = [...model.constraints.values()]
    expect(constraint?.type).toBe('angle')
    expect((constraint as { value: number }).value).toBeCloseTo(90)
  })

  it('reports a click that hits nothing', () => {
    const model = plainModel()
    const tool = new DimensionTool()
    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context(model))?.error).toMatch(
      /nothing to dimension/i,
    )
  })

  it('rejects a dimension that would over-constrain the sketch', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 60, y: 0 })
    const tool = new DimensionTool()
    const ctx = context(model)
    tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)
    tool.onPointerDown(pointerEvent({ x: 30, y: 200 }), ctx)

    tool.onPointerDown(pointerEvent({ x: 30, y: 0 }), ctx)
    const result = tool.onPointerDown(pointerEvent({ x: 30, y: 200 }), ctx)

    expect(result?.error).toBeDefined()
    expect(model.constraints.size).toBe(1)
    expect(model.getEntity(line.id)).toBeDefined()
  })
})

describe('MirrorTool', () => {
  it('mirrors the selection across the picked line', () => {
    const model = plainModel()
    const mirror = buildLine(model, { x: 0, y: -50 }, { x: 0, y: 50 })
    const circle = buildCircle(model, { x: 30, y: 10 }, 5)
    const ctx = context(model)
    ctx.selection.add(circle.id)
    const tool = new MirrorTool()

    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)

    const circles = model.entitiesOfType('circle') as CircleEntity[]
    expect(circles).toHaveLength(2)
    const copy = circles.find((entity) => entity.id !== circle.id) as CircleEntity
    expect(model.requirePoint(copy.centerPointId)).toMatchObject({
      x: expect.closeTo(-30),
      y: expect.closeTo(10),
    })
    expect(model.getEntity(mirror.id)).toBeDefined()
  })

  it('needs a selection', () => {
    const model = plainModel()
    buildLine(model, { x: 0, y: -50 }, { x: 0, y: 50 })
    const tool = new MirrorTool()

    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context(model))?.error).toMatch(
      /select/i,
    )
  })

  it('needs a line to mirror about', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 30, y: 10 }, 5)
    const ctx = context(model)
    ctx.selection.add(circle.id)
    const tool = new MirrorTool()

    expect(tool.onPointerDown(pointerEvent({ x: 200, y: 200 }), ctx)?.error).toMatch(
      /mirror line/i,
    )
  })
})

describe('PatternTool', () => {
  it('repeats the selection in a straight line', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    const ctx = context(model, { patternMode: 'rectangular', patternCount: 3, patternSpacing: 20 })
    ctx.selection.add(circle.id)
    const tool = new PatternTool()

    tool.onPointerDown(pointerEvent({ x: 10, y: 0 }), ctx)

    const centers = (model.entitiesOfType('circle') as CircleEntity[])
      .map((entity) => model.requirePoint(entity.centerPointId).x)
      .sort((a, b) => a - b)
    expect(centers).toHaveLength(3)
    expect(centers[1]).toBeCloseTo(20)
    expect(centers[2]).toBeCloseTo(40)
  })

  it('repeats the selection around a centre', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 10, y: 0 }, 5)
    const ctx = context(model, { patternMode: 'circular', patternCount: 4, patternAngle: 90 })
    ctx.selection.add(circle.id)
    const tool = new PatternTool()

    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), ctx)

    const circles = model.entitiesOfType('circle') as CircleEntity[]
    expect(circles).toHaveLength(4)
    const radii = circles.map((entity) => distance(model.requirePoint(entity.centerPointId), { x: 0, y: 0 }))
    for (const radius of radii) expect(radius).toBeCloseTo(10)
  })

  it('needs a selection', () => {
    const model = plainModel()
    const tool = new PatternTool()
    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context(model))?.error).toMatch(
      /select/i,
    )
  })

  it('does nothing for a count below two', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    const ctx = context(model, { patternCount: 1 })
    ctx.selection.add(circle.id)
    const tool = new PatternTool()

    expect(tool.onPointerDown(pointerEvent({ x: 10, y: 0 }), ctx)?.error).toMatch(/at least two/i)
  })
})

describe('OffsetTool', () => {
  it('offsets a line to the side the cursor is on', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const tool = new OffsetTool()

    tool.onPointerDown(pointerEvent({ x: 50, y: 2 }), context(model, { offsetDistance: 5 }))

    const created = (model.entitiesOfType('line') as LineEntity[]).find(
      (entity) => entity.id !== line.id,
    ) as LineEntity
    expect(model.requirePoint(created.startPointId)).toMatchObject({ x: 0, y: 5 })
  })

  it('offsets a line the other way when the cursor is below it', () => {
    const model = plainModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const tool = new OffsetTool()

    tool.onPointerDown(pointerEvent({ x: 50, y: -2 }), context(model, { offsetDistance: 5 }))

    const created = (model.entitiesOfType('line') as LineEntity[]).find(
      (entity) => entity.id !== line.id,
    ) as LineEntity
    expect(model.requirePoint(created.startPointId).y).toBeCloseTo(-5)
  })

  it('grows a circle when the cursor is outside it', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 20)
    const tool = new OffsetTool()

    tool.onPointerDown(pointerEvent({ x: 22, y: 0 }), context(model, { offsetDistance: 5 }))

    const created = (model.entitiesOfType('circle') as CircleEntity[]).find(
      (entity) => entity.id !== circle.id,
    ) as CircleEntity
    expect(created.radius).toBeCloseTo(25)
  })

  it('shrinks a circle when the cursor is inside it', () => {
    const model = plainModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 20)
    const tool = new OffsetTool()

    tool.onPointerDown(pointerEvent({ x: 18, y: 0 }), context(model, { offsetDistance: 5 }))

    const created = (model.entitiesOfType('circle') as CircleEntity[]).find(
      (entity) => entity.id !== circle.id,
    ) as CircleEntity
    expect(created.radius).toBeCloseTo(15)
  })

  it('refuses to shrink a circle past nothing', () => {
    const model = plainModel()
    buildCircle(model, { x: 0, y: 0 }, 3)
    const tool = new OffsetTool()

    const result = tool.onPointerDown(
      pointerEvent({ x: 2, y: 0 }),
      context(model, { offsetDistance: 5 }),
    )

    expect(result?.error).toMatch(/too small/i)
  })

  it('reports an entity it cannot offset', () => {
    const model = plainModel()
    const tool = new OffsetTool()
    expect(tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context(model))?.error).toMatch(
      /nothing to offset/i,
    )
  })
})
