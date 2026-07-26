import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import { buildLine } from '../../../src/sketch/domain/builders'
import { distance } from '../../../src/sketch/domain/geometry'
import { createToolContext, pointerEvent } from '../../../src/sketch/tools/SketchTool'
import { ArcTool } from '../../../src/sketch/tools/ArcTool'
import { CircleTool } from '../../../src/sketch/tools/CircleTool'
import { EllipseTool } from '../../../src/sketch/tools/EllipseTool'
import { LineTool } from '../../../src/sketch/tools/LineTool'
import { PolygonTool } from '../../../src/sketch/tools/PolygonTool'
import { RectangleTool } from '../../../src/sketch/tools/RectangleTool'
import { SlotTool } from '../../../src/sketch/tools/SlotTool'
import { SplineTool } from '../../../src/sketch/tools/SplineTool'

function ctx(model = new SketchModel()): ReturnType<typeof createToolContext> {
  return createToolContext({ model, snapTolerance: 0 })
}

function click(tool: { onPointerDown: Function; onPointerUp: Function }, context: ReturnType<typeof createToolContext>, x: number, y: number, init = {}): void {
  tool.onPointerDown(pointerEvent({ x, y }, init), context)
  tool.onPointerUp(pointerEvent({ x, y }, init), context)
}

describe('LineTool', () => {
  it('creates a line from a click-drag', () => {
    const context = ctx()
    const tool = new LineTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerMove(pointerEvent({ x: 50, y: 0 }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 0 }), context)

    expect(context.model.entitiesOfType('line')).toHaveLength(1)
    expect(context.model.entitiesOfType('point')).toHaveLength(2)
  })

  it('chains connected lines from repeated clicks', () => {
    const context = ctx()
    const tool = new LineTool()
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    click(tool, context, 50, 50)

    const lines = context.model.entitiesOfType('line')
    expect(lines).toHaveLength(2)
    expect(context.model.entitiesOfType('point')).toHaveLength(3)
  })

  it('ends the chain on escape', () => {
    const context = ctx()
    const tool = new LineTool()
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    tool.onKeyDown('Escape', context)
    click(tool, context, 90, 90)

    expect(context.model.entitiesOfType('line')).toHaveLength(1)
  })

  it('ends the chain on a right click', () => {
    const context = ctx()
    const tool = new LineTool()
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    click(tool, context, 50, 50, { button: 2 })

    expect(context.model.entitiesOfType('line')).toHaveLength(1)
    expect(tool.getPreview()).toBeNull()
  })

  it('previews the segment being drawn', () => {
    const context = ctx()
    const tool = new LineTool()
    click(tool, context, 0, 0)
    tool.onPointerMove(pointerEvent({ x: 30, y: 40 }), context)

    expect(tool.getPreview()).toEqual({
      kind: 'polyline',
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 40 },
      ],
    })
  })

  it('reuses an existing point when snapping to an endpoint', () => {
    const model = new SketchModel({ gridSpacing: 0 })
    const existing = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const context = createToolContext({ model, snapTolerance: 5 })
    const tool = new LineTool()
    click(tool, context, 100, 1)
    click(tool, context, 100, 60)

    expect(model.entitiesOfType('point')).toHaveLength(3)
    const created = model.entitiesOfType('line').find((line) => line.id !== existing.id)
    expect((created as { startPointId: string }).startPointId).toBe(existing.endPointId)
  })

  it('ignores a zero-length segment', () => {
    const context = ctx()
    const tool = new LineTool()
    click(tool, context, 10, 10)
    click(tool, context, 10, 10)

    expect(context.model.entitiesOfType('line')).toHaveLength(0)
  })
})

describe('CircleTool', () => {
  it('creates a circle from centre and radius', () => {
    const context = ctx()
    const tool = new CircleTool()
    tool.onPointerDown(pointerEvent({ x: 10, y: 10 }), context)
    tool.onPointerMove(pointerEvent({ x: 40, y: 10 }), context)
    tool.onPointerUp(pointerEvent({ x: 40, y: 10 }), context)

    const [circle] = context.model.entitiesOfType('circle')
    expect((circle as { radius: number }).radius).toBeCloseTo(30)
  })

  it('previews the circle while dragging', () => {
    const context = ctx()
    const tool = new CircleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerMove(pointerEvent({ x: 20, y: 0 }), context)

    expect(tool.getPreview()).toEqual({ kind: 'circle', center: { x: 0, y: 0 }, radius: 20 })
  })

  it('ignores a zero radius', () => {
    const context = ctx()
    const tool = new CircleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerUp(pointerEvent({ x: 0, y: 0 }), context)

    expect(context.model.entitiesOfType('circle')).toHaveLength(0)
  })

  it('cancels cleanly', () => {
    const context = ctx()
    const tool = new CircleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onCancel(context)

    expect(tool.getPreview()).toBeNull()
    expect(context.model.entities.size).toBe(0)
  })
})

describe('RectangleTool', () => {
  it('creates a rectangle corner to corner', () => {
    const context = ctx()
    const tool = new RectangleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerUp(pointerEvent({ x: 40, y: 20 }), context)

    expect(context.model.entitiesOfType('rectangle')).toHaveLength(1)
    expect(context.model.entitiesOfType('line')).toHaveLength(4)
  })

  it('builds from the centre when alt is held', () => {
    const context = ctx()
    const tool = new RectangleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }, { altKey: true }), context)
    tool.onPointerUp(pointerEvent({ x: 40, y: 20 }, { altKey: true }), context)

    const [rectangle] = context.model.entitiesOfType('rectangle')
    const corners = (rectangle as { cornerPointIds: string[] }).cornerPointIds.map((id) =>
      context.model.requirePoint(id),
    )
    expect(corners[0]).toMatchObject({ x: -40, y: -20 })
  })

  it('ignores a degenerate rectangle', () => {
    const context = ctx()
    const tool = new RectangleTool()
    tool.onPointerDown(pointerEvent({ x: 5, y: 5 }), context)
    tool.onPointerUp(pointerEvent({ x: 5, y: 5 }), context)

    expect(context.model.entitiesOfType('rectangle')).toHaveLength(0)
  })

  it('previews the rectangle outline', () => {
    const context = ctx()
    const tool = new RectangleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerMove(pointerEvent({ x: 10, y: 10 }), context)

    expect(tool.getPreview()?.kind).toBe('polyline')
  })
})

describe('ArcTool', () => {
  it('creates an arc through three points', () => {
    const context = ctx()
    const tool = new ArcTool()
    click(tool, context, -50, 0)
    click(tool, context, 50, 0)
    click(tool, context, 0, 50)

    const [arc] = context.model.entitiesOfType('arc')
    expect((arc as { radius: number }).radius).toBeCloseTo(50)
  })

  it('rejects three collinear points', () => {
    const context = ctx()
    const tool = new ArcTool()
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    const result = tool.onPointerDown(pointerEvent({ x: 100, y: 0 }), context)

    expect(result?.error).toMatch(/collinear/i)
    expect(context.model.entitiesOfType('arc')).toHaveLength(0)
  })

  it('creates an arc from centre, start and end in centre mode', () => {
    const context = ctx()
    const tool = new ArcTool('center')
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    click(tool, context, 0, 60)

    const [arc] = context.model.entitiesOfType('arc')
    expect((arc as { radius: number }).radius).toBeCloseTo(50)
    const end = context.model.requirePoint((arc as { endPointId: string }).endPointId)
    expect(end.x).toBeCloseTo(0)
    expect(end.y).toBeCloseTo(50)
  })

  it('previews the pending arc', () => {
    const context = ctx()
    const tool = new ArcTool()
    click(tool, context, -50, 0)
    click(tool, context, 50, 0)
    tool.onPointerMove(pointerEvent({ x: 0, y: 50 }), context)

    expect(tool.getPreview()?.kind).toBe('arc')
  })
})

describe('SlotTool', () => {
  it('creates a slot from two centres and a width', () => {
    const context = ctx()
    const tool = new SlotTool()
    click(tool, context, 0, 0)
    click(tool, context, 60, 0)
    click(tool, context, 60, 12)

    const [slot] = context.model.entitiesOfType('slot')
    expect((slot as { width: number }).width).toBeCloseTo(24)
  })

  it('previews the slot outline once both centres are placed', () => {
    const context = ctx()
    const tool = new SlotTool()
    click(tool, context, 0, 0)
    click(tool, context, 60, 0)
    tool.onPointerMove(pointerEvent({ x: 60, y: 10 }), context)

    expect(tool.getPreview()?.kind).toBe('polyline')
  })
})

describe('PolygonTool', () => {
  it('closes a free polygon on double click', () => {
    const context = ctx()
    const tool = new PolygonTool()
    click(tool, context, 0, 0)
    click(tool, context, 40, 0)
    click(tool, context, 40, 40, { detail: 2 })

    const [polygon] = context.model.entitiesOfType('polygon')
    expect((polygon as { pointIds: string[] }).pointIds).toHaveLength(3)
  })

  it('closes a free polygon on right click', () => {
    const context = ctx()
    const tool = new PolygonTool()
    click(tool, context, 0, 0)
    click(tool, context, 40, 0)
    click(tool, context, 40, 40)
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }, { button: 2 }), context)

    expect(context.model.entitiesOfType('polygon')).toHaveLength(1)
  })

  it('needs at least three vertices to close', () => {
    const context = ctx()
    const tool = new PolygonTool()
    click(tool, context, 0, 0)
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }, { button: 2 }), context)

    expect(context.model.entitiesOfType('polygon')).toHaveLength(0)
  })

  it('creates an n-sided polygon in regular mode', () => {
    const model = new SketchModel()
    const context = createToolContext({ model, snapTolerance: 0, settings: { polygonSides: 6 } })
    const tool = new PolygonTool('regular')
    click(tool, context, 0, 0)
    click(tool, context, 30, 0)

    const [polygon] = model.entitiesOfType('polygon')
    expect((polygon as { pointIds: string[] }).pointIds).toHaveLength(6)
  })
})

describe('EllipseTool', () => {
  it('creates an ellipse from centre, major axis and minor radius', () => {
    const context = ctx()
    const tool = new EllipseTool()
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    click(tool, context, 50, 20)

    const [ellipse] = context.model.entitiesOfType('ellipse')
    expect((ellipse as { minorRadius: number }).minorRadius).toBeCloseTo(20)
  })

  it('previews the ellipse while setting the minor radius', () => {
    const context = ctx()
    const tool = new EllipseTool()
    click(tool, context, 0, 0)
    click(tool, context, 50, 0)
    tool.onPointerMove(pointerEvent({ x: 50, y: 15 }), context)

    expect(tool.getPreview()?.kind).toBe('polyline')
  })
})

describe('SplineTool', () => {
  it('creates a spline from control points on double click', () => {
    const context = ctx()
    const tool = new SplineTool()
    click(tool, context, 0, 0)
    click(tool, context, 30, 30)
    click(tool, context, 60, 0, { detail: 2 })

    const [spline] = context.model.entitiesOfType('spline')
    expect((spline as { controlPointIds: string[] }).controlPointIds).toHaveLength(3)
  })

  it('needs at least two control points', () => {
    const context = ctx()
    const tool = new SplineTool()
    click(tool, context, 0, 0, { detail: 2 })

    expect(context.model.entitiesOfType('spline')).toHaveLength(0)
  })

  it('discards the pending points on cancel', () => {
    const context = ctx()
    const tool = new SplineTool()
    click(tool, context, 0, 0)
    click(tool, context, 30, 30)
    tool.onCancel(context)

    expect(tool.getPreview()).toBeNull()
    expect(context.model.entities.size).toBe(0)
  })
})

describe('construction mode', () => {
  it('flags new geometry as construction', () => {
    const model = new SketchModel()
    const context = createToolContext({
      model,
      snapTolerance: 0,
      settings: { isConstruction: true },
    })
    const tool = new CircleTool()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerUp(pointerEvent({ x: 20, y: 0 }), context)

    expect(model.entitiesOfType('circle')[0]?.isConstruction).toBe(true)
  })
})

describe('snapping inside tools', () => {
  it('places points on the snapped position, not the raw cursor', () => {
    const model = new SketchModel({ gridSpacing: 10 })
    const context = createToolContext({ model, snapTolerance: 4 })
    const tool = new CircleTool()
    tool.onPointerDown(pointerEvent({ x: 21, y: 19 }), context)
    tool.onPointerUp(pointerEvent({ x: 51, y: 19 }), context)

    const [circle] = model.entitiesOfType('circle')
    const center = model.requirePoint((circle as { centerPointId: string }).centerPointId)
    expect(center).toMatchObject({ x: 20, y: 20 })
    expect(distance(center, { x: 50, y: 20 })).toBeCloseTo(30)
  })
})
