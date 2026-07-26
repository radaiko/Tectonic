import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import { buildCircle, buildLine } from '../../../src/sketch/domain/builders'
import { HorizontalConstraint } from '../../../src/sketch/domain/Constraint'
import { createToolContext, pointerEvent } from '../../../src/sketch/tools/SketchTool'
import { SelectTool } from '../../../src/sketch/tools/SelectTool'

function setup(): {
  model: SketchModel
  context: ReturnType<typeof createToolContext>
  tool: SelectTool
} {
  const model = new SketchModel({ gridSpacing: 0 })
  return {
    model,
    context: createToolContext({ model, snapTolerance: 3, pickTolerance: 3 }),
    tool: new SelectTool(),
  }
}

describe('picking', () => {
  it('selects the entity under the cursor', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 0 }), context)

    expect([...context.selection]).toEqual([line.id])
  })

  it('replaces the selection on a plain click', () => {
    const { model, context, tool } = setup()
    const first = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const second = buildLine(model, { x: 0, y: 50 }, { x: 100, y: 50 })
    context.selection.add(first.id)

    tool.onPointerDown(pointerEvent({ x: 50, y: 50 }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 50 }), context)

    expect([...context.selection]).toEqual([second.id])
  })

  it('adds to the selection with shift', () => {
    const { model, context, tool } = setup()
    const first = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const second = buildLine(model, { x: 0, y: 50 }, { x: 100, y: 50 })
    context.selection.add(first.id)

    tool.onPointerDown(pointerEvent({ x: 50, y: 50 }, { shiftKey: true }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 50 }, { shiftKey: true }), context)

    expect(context.selection.has(first.id)).toBe(true)
    expect(context.selection.has(second.id)).toBe(true)
  })

  it('removes an already-selected entity with shift', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    context.selection.add(line.id)

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }, { shiftKey: true }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 0 }, { shiftKey: true }), context)

    expect(context.selection.has(line.id)).toBe(false)
  })

  it('clears the selection when clicking empty space', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    context.selection.add(line.id)

    tool.onPointerDown(pointerEvent({ x: 500, y: 500 }), context)
    tool.onPointerUp(pointerEvent({ x: 500, y: 500 }), context)

    expect(context.selection.size).toBe(0)
  })

  it('tracks the hovered entity', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })

    tool.onPointerMove(pointerEvent({ x: 50, y: 0 }), context)
    expect(tool.getHoveredEntityId()).toBe(line.id)

    tool.onPointerMove(pointerEvent({ x: 50, y: 400 }), context)
    expect(tool.getHoveredEntityId()).toBeNull()
  })
})

describe('box selection', () => {
  it('selects entities fully inside the box', () => {
    const { model, context, tool } = setup()
    buildLine(model, { x: 10, y: 10 }, { x: 20, y: 20 })
    buildLine(model, { x: 200, y: 200 }, { x: 300, y: 300 })

    tool.onPointerDown(pointerEvent({ x: -5, y: -5 }), context)
    tool.onPointerMove(pointerEvent({ x: 50, y: 50 }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 50 }), context)

    expect(context.selection.size).toBe(3)
  })

  it('previews the box while dragging', () => {
    const { context, tool } = setup()
    tool.onPointerDown(pointerEvent({ x: 0, y: 0 }), context)
    tool.onPointerMove(pointerEvent({ x: 40, y: 40 }), context)

    expect(tool.getPreview()).toEqual({
      kind: 'box',
      from: { x: 0, y: 0 },
      to: { x: 40, y: 40 },
    })
  })

  it('keeps the previous selection when shift is held', () => {
    const { model, context, tool } = setup()
    const far = buildCircle(model, { x: 500, y: 500 }, 5)
    buildLine(model, { x: 10, y: 10 }, { x: 20, y: 20 })
    context.selection.add(far.id)

    tool.onPointerDown(pointerEvent({ x: -5, y: -5 }, { shiftKey: true }), context)
    tool.onPointerMove(pointerEvent({ x: 50, y: 50 }, { shiftKey: true }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 50 }, { shiftKey: true }), context)

    expect(context.selection.has(far.id)).toBe(true)
    expect(context.selection.size).toBe(4)
  })
})

describe('dragging', () => {
  it('moves a dragged point and re-solves the constraints', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    tool.onPointerDown(pointerEvent({ x: 100, y: 0 }), context)
    tool.onPointerMove(pointerEvent({ x: 120, y: 30 }), context)
    tool.onPointerUp(pointerEvent({ x: 120, y: 30 }), context)

    expect(model.requirePoint(line.endPointId)).toMatchObject({ x: 120, y: 30 })
    expect(model.requirePoint(line.startPointId).y).toBeCloseTo(30)
  })

  it('moves every point of a dragged line', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    context.selection.add(line.id)

    tool.onPointerDown(pointerEvent({ x: 50, y: 0 }), context)
    tool.onPointerMove(pointerEvent({ x: 50, y: 40 }), context)
    tool.onPointerUp(pointerEvent({ x: 50, y: 40 }), context)

    expect(model.requirePoint(line.startPointId).y).toBeCloseTo(40)
    expect(model.requirePoint(line.endPointId).y).toBeCloseTo(40)
  })
})

describe('keyboard', () => {
  it('deletes the selection', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    context.selection.add(line.id)

    const result = tool.onKeyDown('Delete', context)

    expect(result?.changed).toBe(true)
    expect(model.getEntity(line.id)).toBeUndefined()
    expect(context.selection.size).toBe(0)
  })

  it('deletes with backspace too', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    context.selection.add(line.id)

    tool.onKeyDown('Backspace', context)

    expect(model.getEntity(line.id)).toBeUndefined()
  })

  it('does nothing when there is no selection', () => {
    const { context, tool } = setup()
    expect(tool.onKeyDown('Delete', context)).toBeNull()
  })

  it('clears the selection on escape', () => {
    const { model, context, tool } = setup()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    context.selection.add(line.id)

    tool.onKeyDown('Escape', context)

    expect(context.selection.size).toBe(0)
    expect(model.getEntity(line.id)).toBeDefined()
  })
})
