import { buildRectangle } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

const MIN_EXTENT = 1e-6

/** Drag corner to corner, or hold Alt to grow the rectangle from its centre. */
export class RectangleTool extends BaseTool {
  readonly id: ToolId = 'rectangle'

  private first: Vec2 | null = null
  private cursor: Vec2 | null = null
  private fromCenter = false

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.first = this.snapAt(event, context)
    this.cursor = this.first
    this.fromCenter = event.altKey
    return { status: this.fromCenter ? 'Drag out from the centre' : 'Drag to the opposite corner' }
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    if (event.altKey) this.fromCenter = true
    return null
  }

  override onPointerUp(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const first = this.first
    if (!first) return null
    const second = this.snapAt(event, context)
    const fromCenter = this.fromCenter || event.altKey
    this.reset()

    if (Math.abs(second.x - first.x) <= MIN_EXTENT || Math.abs(second.y - first.y) <= MIN_EXTENT) {
      return { status: 'Rectangle discarded — zero size', done: true }
    }

    const rectangle = buildRectangle(context.model, first, second, {
      fromCenter,
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [rectangle.id], done: true }
  }

  override getPreview(): PreviewShape | null {
    if (!this.first || !this.cursor) return null
    const [min, max] = this.fromCenter
      ? [
          {
            x: this.first.x - Math.abs(this.cursor.x - this.first.x),
            y: this.first.y - Math.abs(this.cursor.y - this.first.y),
          },
          {
            x: this.first.x + Math.abs(this.cursor.x - this.first.x),
            y: this.first.y + Math.abs(this.cursor.y - this.first.y),
          },
        ]
      : [this.first, this.cursor]

    return {
      kind: 'polyline',
      closed: true,
      points: [
        { x: min.x, y: min.y },
        { x: max.x, y: min.y },
        { x: max.x, y: max.y },
        { x: min.x, y: max.y },
        { x: min.x, y: min.y },
      ],
    }
  }

  protected override reset(): void {
    super.reset()
    this.first = null
    this.cursor = null
    this.fromCenter = false
  }
}
