import type { Constraint } from '../domain/Constraint'
import {
  AngleConstraint,
  DistanceConstraint,
  LengthConstraint,
  RadiusConstraint,
} from '../domain/Constraint'
import { angleBetween, distance, sub } from '../domain/geometry'
import type { LineEntity, SketchEntity } from '../domain/SketchEntity'
import type { SketchModel } from '../domain/SketchModel'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { pickEntity } from './toolSupport'

/**
 * Turns picks into driving dimensions. What gets created follows from what is
 * picked: a circle or arc is a radius, a line on its own is a length, two lines
 * are an angle, two points are a distance.
 *
 * Every dimension goes in through the solver's trial-add, so one that would
 * over-constrain the sketch is reported instead of quietly breaking it.
 */
export class DimensionTool extends BaseTool {
  readonly id: ToolId = 'dimension'

  private first: SketchEntity | null = null
  private lastConstraintId: string | null = null

  /** Id of the dimension the last pick created, for inline value editing. */
  getLastConstraintId(): string | null {
    return this.lastConstraintId
  }

  getFirstPickId(): string | null {
    return this.first?.id ?? null
  }

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const hit = pickEntity(context, event.world)

    if (!this.first) {
      if (!hit) return { error: 'Nothing to dimension here' }
      if (hit.type === 'circle' || hit.type === 'arc') {
        return this.add(context, new RadiusConstraint({ circleId: hit.id, value: hit.radius }))
      }
      if (hit.type === 'point' || hit.type === 'line') {
        this.first = hit
        return { status: 'Pick what to dimension it against, or click away to place it' }
      }
      return { error: 'Nothing to dimension here' }
    }

    const first = this.first
    this.first = null

    if (first.type === 'line' && (!hit || hit.id === first.id)) {
      return this.add(
        context,
        new LengthConstraint({ lineId: first.id, value: lineLength(context.model, first) }),
      )
    }
    if (first.type === 'line' && hit?.type === 'line') {
      return this.add(
        context,
        new AngleConstraint({
          lineId1: first.id,
          lineId2: hit.id,
          value: angleBetweenLines(context.model, first, hit),
        }),
      )
    }
    if (first.type === 'point' && hit?.type === 'point') {
      return this.add(
        context,
        new DistanceConstraint({
          pointId1: first.id,
          pointId2: hit.id,
          value: distance(first, hit),
        }),
      )
    }
    return { error: 'Pick a matching second reference — two points, or two lines' }
  }

  override onCancel(context: ToolContext): ToolResult | null {
    this.first = null
    return super.onCancel(context)
  }

  protected override reset(): void {
    super.reset()
    this.first = null
  }

  private add(context: ToolContext, constraint: Constraint): ToolResult {
    const outcome = context.solver.tryAddConstraint(context.model, constraint)
    if (!outcome.ok) {
      return { error: outcome.error ?? 'That dimension would over-constrain the sketch' }
    }
    this.lastConstraintId = constraint.id
    return { changed: true, done: true, status: `Added ${constraint.type} dimension` }
  }
}

function lineLength(model: SketchModel, line: LineEntity): number {
  return distance(model.requirePoint(line.startPointId), model.requirePoint(line.endPointId))
}

/** Unsigned angle between two lines, in degrees — the unit dimensions carry. */
function angleBetweenLines(model: SketchModel, first: LineEntity, second: LineEntity): number {
  const a = sub(model.requirePoint(first.endPointId), model.requirePoint(first.startPointId))
  const b = sub(model.requirePoint(second.endPointId), model.requirePoint(second.startPointId))
  return (angleBetween(a, b) * 180) / Math.PI
}
