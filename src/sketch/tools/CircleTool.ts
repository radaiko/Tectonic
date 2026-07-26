import { buildCircle } from '../domain/builders'
import type { PointRef } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { distance } from '../domain/geometry'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

const MIN_RADIUS = 1e-6

/** Press for the centre, drag out to the radius, release to create. */
export class CircleTool extends BaseTool {
  readonly id: ToolId = 'circle'

  private center: { ref: PointRef; position: Vec2 } | null = null
  private radius = 0

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const ref = this.snapRef(event, context)
    this.center = { ref, position: this.resolveRef(context, ref) }
    this.radius = 0
    return { status: 'Drag to set the radius' }
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const position = this.snapAt(event, context)
    if (this.center) this.radius = distance(this.center.position, position)
    return null
  }

  override onPointerUp(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const center = this.center
    if (!center) return null
    const radius = distance(center.position, this.snapAt(event, context))
    this.reset()
    if (radius <= MIN_RADIUS) return { status: 'Circle discarded — zero radius', done: true }

    const circle = buildCircle(context.model, center.ref, radius, {
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [circle.id], done: true }
  }

  override getPreview(): PreviewShape | null {
    if (!this.center || this.radius <= MIN_RADIUS) return null
    return { kind: 'circle', center: this.center.position, radius: this.radius }
  }

  protected override reset(): void {
    super.reset()
    this.center = null
    this.radius = 0
  }
}
