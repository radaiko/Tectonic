import { buildSpline } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { splinePolyline } from '../domain/query'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

/** Click to place control points; double-click or right-click to finish. */
export class SplineTool extends BaseTool {
  readonly id: ToolId = 'spline'

  private readonly controlPoints: Vec2[] = []
  private cursor: Vec2 | null = null

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const point = this.snapAt(event, context)
    this.cursor = point

    if (event.button === 2) return this.finish(context)

    this.controlPoints.push(point)
    if (event.detail >= 2) return this.finish(context)
    return { status: `${this.controlPoints.length} control points — double-click to finish` }
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    return null
  }

  override getPreview(): PreviewShape | null {
    if (this.controlPoints.length === 0 || !this.cursor) return null
    return { kind: 'polyline', points: splinePolyline([...this.controlPoints, this.cursor]) }
  }

  protected override reset(): void {
    super.reset()
    this.controlPoints.length = 0
    this.cursor = null
  }

  private finish(context: ToolContext): ToolResult {
    const points = [...this.controlPoints]
    this.reset()
    if (points.length < 2) return { error: 'A spline needs at least two control points', done: true }
    const spline = buildSpline(context.model, points, {
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [spline.id], done: true }
  }
}
