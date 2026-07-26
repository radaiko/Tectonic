import type { PointRef } from '../domain/builders'
import { buildLine } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import { distance } from '../domain/geometry'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'

/** Below this world distance a press-and-release counts as a click, not a drag. */
const DRAG_THRESHOLD = 1e-6

interface Anchor {
  readonly ref: PointRef
  readonly position: Vec2
}

/**
 * Click-drag draws a single line; click-click-click chains connected segments
 * that share their vertices. Esc or a right click ends the chain.
 */
export class LineTool extends BaseTool {
  readonly id: ToolId = 'line'

  private chain: Anchor | null = null
  private down: Anchor | null = null
  private cursor: Vec2 | null = null

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    if (event.button === 2) {
      this.reset()
      return { status: 'Chain ended', done: true }
    }
    this.down = this.anchorAt(event, context)
    this.cursor = this.down.position
    return null
  }

  override onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.cursor = this.snapAt(event, context)
    return null
  }

  override onPointerUp(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    if (event.button === 2) return null
    const down = this.down
    this.down = null
    if (!down) return null

    const release = this.anchorAt(event, context)

    if (!this.chain) {
      // Press and release in one spot starts a chain; a real drag draws one line.
      if (distance(down.position, release.position) <= DRAG_THRESHOLD) {
        this.chain = down
        return { status: 'Pick the next point' }
      }
      const line = buildLine(context.model, down.ref, release.ref, {
        isConstruction: context.settings.isConstruction,
      })
      this.reset()
      return { changed: true, createdEntityIds: [line.id], done: true }
    }

    if (distance(this.chain.position, release.position) <= DRAG_THRESHOLD) return null

    const line = buildLine(context.model, this.chain.ref, release.ref, {
      isConstruction: context.settings.isConstruction,
    })
    this.chain = { ref: { pointId: line.endPointId }, position: release.position }
    return { changed: true, createdEntityIds: [line.id], status: 'Pick the next point' }
  }

  override onKeyDown(key: string, context: ToolContext): ToolResult | null {
    if (key === 'Escape') {
      this.reset()
      return { status: 'Chain ended', done: true }
    }
    return super.onKeyDown(key, context)
  }

  override getPreview(): PreviewShape | null {
    if (!this.chain || !this.cursor) return null
    return { kind: 'polyline', points: [this.chain.position, this.cursor] }
  }

  protected override reset(): void {
    super.reset()
    this.chain = null
    this.down = null
    this.cursor = null
  }

  private anchorAt(event: SketchPointerEvent, context: ToolContext): Anchor {
    const ref = this.snapRef(event, context)
    return { ref, position: this.resolveRef(context, ref) }
  }
}
