import type { PointRef } from '../domain/builders'
import type { SketchModel } from '../domain/SketchModel'
import type { Vec2 } from '../domain/geometry'
import type { PreviewShape } from '../renderer/SketchRenderer'
import type { SnapCandidate } from '../snapping/SnapSystem'
import { SnapSystem } from '../snapping/SnapSystem'
import { ConstraintSolver } from '../../solver/ConstraintSolver'

export type ToolId =
  | 'select'
  | 'line'
  | 'circle'
  | 'arc'
  | 'rectangle'
  | 'slot'
  | 'polygon'
  | 'ellipse'
  | 'spline'
  | 'trim'
  | 'fillet'
  | 'chamfer'
  | 'dimension'
  | 'mirror'
  | 'pattern'
  | 'offset'

/**
 * Pointer input in sketch space. Tools never see DOM events — the React layer
 * converts them, which keeps every tool testable as plain logic.
 */
export interface SketchPointerEvent {
  /** Cursor position in sketch (world) coordinates. */
  readonly world: Vec2
  /** Cursor position in CSS pixels, for hit tolerances that scale with zoom. */
  readonly screen: Vec2
  /** 0 = primary, 2 = secondary. */
  readonly button: number
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly ctrlKey: boolean
  /** Click count — 2 means double-click. */
  readonly detail: number
}

export function pointerEvent(
  world: Vec2,
  init: Partial<Omit<SketchPointerEvent, 'world'>> = {},
): SketchPointerEvent {
  return {
    world,
    screen: init.screen ?? world,
    button: init.button ?? 0,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    detail: init.detail ?? 1,
  }
}

/** Numeric inputs the toolbar feeds to the tools. */
export interface ToolSettings {
  readonly filletRadius: number
  readonly chamferDistance: number
  readonly offsetDistance: number
  readonly polygonSides: number
  readonly patternMode: 'rectangular' | 'circular'
  readonly patternCount: number
  readonly patternSpacing: number
  readonly patternAngle: number
  /** New geometry is created as construction while this is on. */
  readonly isConstruction: boolean
}

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  filletRadius: 5,
  chamferDistance: 5,
  offsetDistance: 5,
  polygonSides: 6,
  patternMode: 'rectangular',
  patternCount: 3,
  patternSpacing: 20,
  patternAngle: 60,
  isConstruction: false,
}

export interface ToolContext {
  readonly model: SketchModel
  readonly solver: ConstraintSolver
  readonly snap: SnapSystem
  /** Pick radius in world units, derived from the current zoom. */
  readonly pickTolerance: number
  readonly selection: Set<string>
  readonly settings: ToolSettings
}

export interface ToolContextInit {
  readonly model: SketchModel
  readonly solver?: ConstraintSolver
  readonly snap?: SnapSystem
  readonly snapTolerance?: number
  readonly pickTolerance?: number
  readonly selection?: Set<string>
  readonly settings?: Partial<ToolSettings>
}

export function createToolContext(init: ToolContextInit): ToolContext {
  const snapTolerance = init.snapTolerance ?? 6
  return {
    model: init.model,
    solver: init.solver ?? new ConstraintSolver(),
    snap: init.snap ?? new SnapSystem({ tolerance: snapTolerance }),
    pickTolerance: init.pickTolerance ?? Math.max(snapTolerance, 4),
    selection: init.selection ?? new Set<string>(),
    settings: { ...DEFAULT_TOOL_SETTINGS, ...init.settings },
  }
}

export interface ToolResult {
  /** Message for the status bar. */
  readonly status?: string
  readonly error?: string
  readonly createdEntityIds?: readonly string[]
  /** The model changed and the viewport should redraw. */
  readonly changed?: boolean
  /** The gesture finished; the app may switch back to Select. */
  readonly done?: boolean
}

export interface SketchTool {
  readonly id: ToolId
  onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null
  onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null
  onPointerUp(event: SketchPointerEvent, context: ToolContext): ToolResult | null
  onKeyDown(key: string, context: ToolContext): ToolResult | null
  onCancel(context: ToolContext): ToolResult | null
  /** Rubber-band overlay for the current gesture. */
  getPreview(): PreviewShape | null
  /** Snap the cursor last latched onto, for the snap badge. */
  getSnap(): SnapCandidate | null
}

/**
 * Shared plumbing: snapping, cancel handling and the no-op defaults so each tool
 * only implements the events it cares about.
 */
export abstract class BaseTool implements SketchTool {
  abstract readonly id: ToolId

  protected activeSnap: SnapCandidate | null = null

  onPointerDown(_event: SketchPointerEvent, _context: ToolContext): ToolResult | null {
    return null
  }

  onPointerMove(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    this.snapAt(event, context)
    return null
  }

  onPointerUp(_event: SketchPointerEvent, _context: ToolContext): ToolResult | null {
    return null
  }

  onKeyDown(key: string, context: ToolContext): ToolResult | null {
    if (key === 'Escape') return this.onCancel(context)
    return null
  }

  onCancel(_context: ToolContext): ToolResult | null {
    this.reset()
    return { changed: false, done: true }
  }

  getPreview(): PreviewShape | null {
    return null
  }

  getSnap(): SnapCandidate | null {
    return this.activeSnap
  }

  /** Clears any in-flight gesture state. */
  protected reset(): void {
    this.activeSnap = null
  }

  /** Cursor position after snapping, remembering the candidate for the badge. */
  protected snapAt(event: SketchPointerEvent, context: ToolContext): Vec2 {
    const candidate = context.snap.findSnap(event.world, context.model)
    this.activeSnap = candidate
    return candidate ? candidate.point : event.world
  }

  /**
   * Snap result as a point reference — an existing point id when the cursor
   * latched onto one, so new geometry shares the vertex outright instead of
   * needing a coincident constraint.
   */
  protected snapRef(event: SketchPointerEvent, context: ToolContext): PointRef {
    const position = this.snapAt(event, context)
    const candidate = this.activeSnap
    if (
      candidate &&
      (candidate.type === 'endpoint' || candidate.type === 'center') &&
      candidate.entityId !== undefined &&
      context.model.getEntity(candidate.entityId)?.type === 'point'
    ) {
      return { pointId: candidate.entityId }
    }
    return position
  }

  protected resolveRef(context: ToolContext, ref: PointRef): Vec2 {
    return 'pointId' in ref ? { ...context.model.requirePoint(ref.pointId) } : ref
  }
}
