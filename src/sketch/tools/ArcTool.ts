import { buildArcThroughPoints, buildCenterArc, circumcenter } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { angleOf, distance, normalizeAngle, sub } from '../domain/geometry'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

export type ArcMode = '3point' | 'center'

/**
 * `3point` mode: pick the two endpoints, then a point the arc passes through.
 * `center` mode: pick the centre, the start, then the end angle.
 */
export class ArcTool extends BaseTool {
  readonly id: ToolId = 'arc'

  private readonly picks: Vec2[] = []
  private cursor: Vec2 | null = null

  private mode: ArcMode

  constructor(mode: ArcMode = '3point') {
    super()
    this.mode = mode
  }

  setMode(mode: ArcMode): void {
    this.mode = mode
    this.reset()
  }

  getMode(): ArcMode {
    return this.mode
  }

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    if (event.button === 2) return this.onCancel(context)
    const point = this.snapAt(event, context)
    this.picks.push(point)
    this.cursor = point
    if (this.picks.length < 3) {
      return { status: this.mode === 'center' ? 'Pick the start point' : 'Pick the next point' }
    }
    return this.mode === 'center' ? this.finishCenterArc(context) : this.finishThreePointArc(context)
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    return null
  }

  override getPreview(): PreviewShape | null {
    if (!this.cursor) return null
    const [first, second] = this.picks
    if (!first) return null
    if (!second) return { kind: 'polyline', points: [first, this.cursor] }

    if (this.mode === 'center') {
      const radius = distance(first, second)
      const startAngle = angleOf(sub(second, first))
      const endAngle = angleOf(sub(this.cursor, first))
      return { kind: 'arc', center: first, radius, startAngle, endAngle, clockwise: false }
    }

    const center = circumcenter(first, this.cursor, second)
    if (!center) return { kind: 'polyline', points: [first, second] }
    return {
      kind: 'arc',
      center,
      radius: distance(center, first),
      startAngle: angleOf(sub(first, center)),
      endAngle: angleOf(sub(second, center)),
      clockwise: sweepIsClockwise(first, this.cursor, second),
    }
  }

  protected override reset(): void {
    super.reset()
    this.picks.length = 0
    this.cursor = null
  }

  private finishThreePointArc(context: ToolContext): ToolResult {
    const [start, end, through] = this.picks as [Vec2, Vec2, Vec2]
    this.reset()
    const arc = buildArcThroughPoints(context.model, start, end, through, {
      isConstruction: context.settings.isConstruction,
    })
    if (!arc) return { error: 'Cannot fit an arc through three collinear points', done: true }
    return { changed: true, createdEntityIds: [arc.id], done: true }
  }

  private finishCenterArc(context: ToolContext): ToolResult {
    const [center, start, endDirection] = this.picks as [Vec2, Vec2, Vec2]
    this.reset()
    if (distance(center, start) <= 1e-6) {
      return { error: 'Arc needs a non-zero radius', done: true }
    }
    const sweep = normalizeAngle(
      angleOf(sub(endDirection, center)) - angleOf(sub(start, center)),
    )
    const arc = buildCenterArc(context.model, center, start, sweep, {
      isConstruction: context.settings.isConstruction,
    })
    return { changed: true, createdEntityIds: [arc.id], done: true }
  }
}

function sweepIsClockwise(start: Vec2, through: Vec2, end: Vec2): boolean {
  const toThrough = sub(through, start)
  const toEnd = sub(end, start)
  return toThrough.x * toEnd.y - toThrough.y * toEnd.x > 0
}
