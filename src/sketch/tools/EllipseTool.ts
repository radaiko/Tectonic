import { buildEllipse } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { distanceToSegment } from '../domain/geometry'
import { tessellate } from '../domain/query'
import { SketchModel } from '../domain/SketchModel'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

const MIN_RADIUS = 1e-6

/** Pick the centre, then the end of the major axis, then the minor radius. */
export class EllipseTool extends BaseTool {
  readonly id: ToolId = 'ellipse'

  private center: Vec2 | null = null
  private majorAxis: Vec2 | null = null
  private cursor: Vec2 | null = null

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    if (event.button === 2) return this.onCancel(context)
    const point = this.snapAt(event, context)
    this.cursor = point

    if (!this.center) {
      this.center = point
      return { status: 'Set the major axis' }
    }
    if (!this.majorAxis) {
      this.majorAxis = point
      return { status: 'Set the minor radius' }
    }

    const center = this.center
    const major = this.majorAxis
    const minorRadius = distanceToSegment(point, center, major)
    this.reset()
    if (minorRadius <= MIN_RADIUS) return { status: 'Ellipse discarded — zero radius', done: true }

    const ellipse = buildEllipse(context.model, center, major, minorRadius, {
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [ellipse.id], done: true }
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    return null
  }

  override getPreview(): PreviewShape | null {
    if (!this.center || !this.cursor) return null
    if (!this.majorAxis) return { kind: 'polyline', points: [this.center, this.cursor] }

    const minorRadius = Math.max(
      distanceToSegment(this.cursor, this.center, this.majorAxis),
      MIN_RADIUS,
    )
    const scratch = new SketchModel()
    const ellipse = buildEllipse(scratch, this.center, this.majorAxis, minorRadius)
    return { kind: 'polyline', points: tessellate(scratch, ellipse) }
  }

  protected override reset(): void {
    super.reset()
    this.center = null
    this.majorAxis = null
    this.cursor = null
  }
}
