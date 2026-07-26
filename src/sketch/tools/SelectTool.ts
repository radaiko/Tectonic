import type { Vec2 } from '../domain/geometry'
import { length, sub } from '../domain/geometry'
import type { BoundingBox } from '../domain/hitTest'
import { entitiesInBox, hitTest } from '../domain/hitTest'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { pointsOf } from './toolSupport'

/** Any pointer travel at all turns a press into a drag. */
const DRAG_THRESHOLD = 1e-9

interface DraggedPoint {
  readonly id: string
  readonly x: number
  readonly y: number
}

type Gesture =
  | { readonly kind: 'idle' }
  | { readonly kind: 'box'; readonly from: Vec2; to: Vec2 | null }
  | {
      readonly kind: 'press'
      readonly entityId: string
      readonly origin: Vec2
      readonly points: readonly DraggedPoint[]
      moved: boolean
    }

/**
 * The default tool: picking, box selection, dragging geometry and deleting it.
 * A drag moves the grabbed points and re-solves with them pinned, so the rest of
 * the sketch follows its constraints instead of being torn away from them.
 */
export class SelectTool extends BaseTool {
  readonly id: ToolId = 'select'

  private gesture: Gesture = { kind: 'idle' }
  private hoveredEntityId: string | null = null

  getHoveredEntityId(): string | null {
    return this.hoveredEntityId
  }

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    if (event.button === 2) return null

    const hit = hitTest(context.model, event.world, context.pickTolerance)
    if (!hit) {
      this.gesture = { kind: 'box', from: event.world, to: null }
      return null
    }

    // Grabbing something already selected drags the whole selection with it.
    const dragged = context.selection.has(hit.id) ? [...context.selection] : [hit.id]
    this.gesture = {
      kind: 'press',
      entityId: hit.id,
      origin: event.world,
      points: pointsOf(context.model, dragged).map((point) => ({
        id: point.id,
        x: point.x,
        y: point.y,
      })),
      moved: false,
    }
    return null
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const gesture = this.gesture

    if (gesture.kind === 'idle') {
      this.hoveredEntityId = hitTest(context.model, event.world, context.pickTolerance)?.id ?? null
      return null
    }

    if (gesture.kind === 'box') {
      gesture.to = event.world
      return null
    }

    const delta = sub(event.world, gesture.origin)
    if (!gesture.moved && length(delta) <= DRAG_THRESHOLD) return null
    gesture.moved = true

    for (const point of gesture.points) {
      const entity = context.model.getEntity(point.id)
      if (entity?.type !== 'point') continue
      entity.x = point.x + delta.x
      entity.y = point.y + delta.y
    }
    context.solver.solve(context.model, {
      pinnedPointIds: gesture.points.map((point) => point.id),
    })
    return { changed: true }
  }

  override onPointerUp(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const gesture = this.gesture
    this.gesture = { kind: 'idle' }
    if (event.button === 2 || gesture.kind === 'idle') return null

    if (gesture.kind === 'box') {
      const box = boxBetween(gesture.from, gesture.to ?? gesture.from)
      if (!event.shiftKey) context.selection.clear()
      for (const entity of entitiesInBox(context.model, box)) context.selection.add(entity.id)
      return { status: describeSelection(context.selection.size) }
    }

    if (gesture.moved) return { changed: true, status: 'Moved' }

    if (event.shiftKey) {
      if (context.selection.has(gesture.entityId)) context.selection.delete(gesture.entityId)
      else context.selection.add(gesture.entityId)
    } else {
      context.selection.clear()
      context.selection.add(gesture.entityId)
    }
    return { status: describeSelection(context.selection.size) }
  }

  override onKeyDown(key: string, context: ToolContext): ToolResult | null {
    if (key === 'Delete' || key === 'Backspace') {
      if (context.selection.size === 0) return null
      const doomed = [...context.selection]
      for (const id of doomed) context.model.removeEntity(id)
      context.selection.clear()
      return { changed: true, status: `Deleted ${doomed.length} entit${doomed.length === 1 ? 'y' : 'ies'}` }
    }

    if (key === 'Escape') {
      this.reset()
      context.selection.clear()
      return { status: 'Selection cleared' }
    }
    return null
  }

  override onCancel(context: ToolContext): ToolResult | null {
    this.reset()
    context.selection.clear()
    return { status: 'Selection cleared' }
  }

  override getPreview(): PreviewShape | null {
    const gesture = this.gesture
    if (gesture.kind !== 'box' || !gesture.to) return null
    return { kind: 'box', from: gesture.from, to: gesture.to }
  }

  protected override reset(): void {
    super.reset()
    this.gesture = { kind: 'idle' }
    this.hoveredEntityId = null
  }
}

function boxBetween(from: Vec2, to: Vec2): BoundingBox {
  return {
    minX: Math.min(from.x, to.x),
    minY: Math.min(from.y, to.y),
    maxX: Math.max(from.x, to.x),
    maxY: Math.max(from.y, to.y),
  }
}

function describeSelection(count: number): string {
  if (count === 0) return 'Nothing selected'
  return `${count} selected`
}
