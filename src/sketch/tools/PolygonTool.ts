import { buildPolygon, buildRegularPolygon } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { TAU, distance, pointOnCircle } from '../domain/geometry'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

export type PolygonMode = 'free' | 'regular'

/**
 * `free` mode places vertices one click at a time and closes on a double click
 * or right click. `regular` mode takes a centre and a circumscribed radius and
 * uses the side count from the tool settings.
 */
export class PolygonTool extends BaseTool {
  readonly id: ToolId = 'polygon'

  private readonly vertices: Vec2[] = []
  private center: Vec2 | null = null
  private cursor: Vec2 | null = null

  private mode: PolygonMode

  constructor(mode: PolygonMode = 'free') {
    super()
    this.mode = mode
  }

  setMode(mode: PolygonMode): void {
    this.mode = mode
    this.reset()
  }

  getMode(): PolygonMode {
    return this.mode
  }

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const point = this.snapAt(event, context)
    this.cursor = point

    if (this.mode === 'regular') {
      if (!this.center) {
        this.center = point
        return { status: 'Set the radius' }
      }
      const radius = distance(this.center, point)
      const center = this.center
      this.reset()
      if (radius <= 1e-6) return { status: 'Polygon discarded — zero radius', done: true }
      const polygon = buildRegularPolygon(
        context.model,
        center,
        radius,
        Math.max(3, Math.round(context.settings.polygonSides)),
        { isConstruction: context.settings.isConstruction },
      )
      return { changed: true, createdEntityIds: [polygon.id], done: true }
    }

    if (event.button === 2) return this.close(context)

    this.vertices.push(point)
    if (event.detail >= 2) return this.close(context)
    return { status: `${this.vertices.length} vertices — double-click to close` }
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    return null
  }

  override getPreview(): PreviewShape | null {
    if (!this.cursor) return null
    if (this.mode === 'regular') {
      if (!this.center) return null
      const radius = distance(this.center, this.cursor)
      const sides = Math.max(3, Math.round(this.sides))
      const points = Array.from({ length: sides }, (_unused, index) =>
        pointOnCircle(this.center as Vec2, radius, (index / sides) * TAU),
      )
      return { kind: 'polyline', closed: true, points: [...points, points[0] as Vec2] }
    }
    if (this.vertices.length === 0) return null
    return { kind: 'polyline', points: [...this.vertices, this.cursor] }
  }

  /** Side count captured from the last context, so the preview matches the setting. */
  private sides = 6

  override onPointerUp(_event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.sides = context.settings.polygonSides
    return null
  }

  protected override reset(): void {
    super.reset()
    this.vertices.length = 0
    this.center = null
    this.cursor = null
  }

  private close(context: ToolContext): ToolResult {
    const vertices = [...this.vertices]
    this.reset()
    if (vertices.length < 3) return { error: 'A polygon needs at least three vertices', done: true }
    const polygon = buildPolygon(context.model, vertices, {
      closed: true,
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [polygon.id], done: true }
  }
}
