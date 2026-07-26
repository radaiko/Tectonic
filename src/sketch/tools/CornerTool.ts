import type { LineEntity } from '../domain/SketchEntity'
import type { Corner } from './corner'
import { findCorner } from './corner'
import type { SketchPointerEvent, ToolContext, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { pickLine } from './toolSupport'

/**
 * Shared two-click flow for the tools that rework the corner between two lines.
 * Subclasses only supply what happens once both lines are known.
 */
export abstract class CornerTool extends BaseTool {
  /** Used in the prompts and errors, e.g. "Pick a line to fillet". */
  protected abstract readonly noun: string

  private firstLine: LineEntity | null = null

  getFirstLineId(): string | null {
    return this.firstLine?.id ?? null
  }

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const line = pickLine(context, event.world)
    if (!line) return { error: `Pick a line to ${this.noun}` }

    if (!this.firstLine) {
      this.firstLine = line
      return { status: `Pick the second line to ${this.noun}` }
    }
    if (line.id === this.firstLine.id) return { error: 'Pick two different lines' }

    const corner = findCorner(context.model, this.firstLine, line)
    this.firstLine = null
    if (!corner) return { error: 'Those two lines do not meet at a corner' }
    return this.applyCorner(context, corner)
  }

  protected abstract applyCorner(context: ToolContext, corner: Corner): ToolResult

  protected override reset(): void {
    super.reset()
    this.firstLine = null
  }
}
