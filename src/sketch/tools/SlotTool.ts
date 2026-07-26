import { buildSlot } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { distanceToSegment } from '../domain/geometry'
import { tessellate } from '../domain/query'
import { SketchModel } from '../domain/SketchModel'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

const MIN_WIDTH = 1e-6

/** Pick the two arc centres, then move out to set the slot width. */
export class SlotTool extends BaseTool {
  readonly id: ToolId = 'slot'

  private readonly centers: Vec2[] = []
  private cursor: Vec2 | null = null

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    if (event.button === 2) return this.onCancel(context)
    const point = this.snapAt(event, context)
    this.cursor = point

    if (this.centers.length < 2) {
      this.centers.push(point)
      return { status: this.centers.length === 1 ? 'Pick the second centre' : 'Set the width' }
    }

    const [first, second] = this.centers as [Vec2, Vec2]
    const width = distanceToSegment(point, first, second) * 2
    this.reset()
    if (width <= MIN_WIDTH) return { status: 'Slot discarded — zero width', done: true }

    const slot = buildSlot(context.model, first, second, width, {
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [slot.id], done: true }
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    return null
  }

  override getPreview(): PreviewShape | null {
    if (!this.cursor) return null
    const [first, second] = this.centers
    if (!first) return null
    if (!second) return { kind: 'polyline', points: [first, this.cursor] }

    const width = Math.max(distanceToSegment(this.cursor, first, second) * 2, MIN_WIDTH)
    // Reuse the real outline maths by building the slot in a throwaway model.
    const scratch = new SketchModel()
    const slot = buildSlot(scratch, first, second, width)
    return { kind: 'polyline', points: tessellate(scratch, slot) }
  }

  protected override reset(): void {
    super.reset()
    this.centers.length = 0
    this.cursor = null
  }
}
