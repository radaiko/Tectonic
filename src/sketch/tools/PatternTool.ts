import type { Vec2 } from '../domain/geometry'
import { length, normalize, scale, sub } from '../domain/geometry'
import type { SketchEntity } from '../domain/SketchEntity'
import { copyEntities, rotatePoint, translatePoint } from '../domain/transform'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { centroidOf, liveSelection } from './toolSupport'

/**
 * Repeats the selection. In rectangular mode the click sets the direction the
 * copies march off in; in circular mode it sets the centre they turn about.
 * Counts include the original, so a count of three adds two copies.
 */
export class PatternTool extends BaseTool {
  readonly id: ToolId = 'pattern'

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const { model, settings } = context
    const sources = liveSelection(model, context.selection)
    if (sources.length === 0) return { error: 'Select the entities to pattern first' }

    const count = Math.floor(settings.patternCount)
    if (count < 2) return { error: 'A pattern needs at least two instances' }

    const created: SketchEntity[] = []
    if (settings.patternMode === 'circular') {
      const step = (settings.patternAngle * Math.PI) / 180
      for (let index = 1; index < count; index += 1) {
        created.push(
          ...copyEntities(model, sources, (point) =>
            rotatePoint(point, event.world, step * index),
          ),
        )
      }
    } else {
      const direction = patternDirection(centroidOf(model, sources), event.world)
      for (let index = 1; index < count; index += 1) {
        const offset = scale(direction, settings.patternSpacing * index)
        created.push(...copyEntities(model, sources, (point) => translatePoint(point, offset)))
      }
    }

    return {
      changed: true,
      done: true,
      createdEntityIds: created.map((entity) => entity.id),
      status: `Patterned ${sources.length} entit${sources.length === 1 ? 'y' : 'ies'} ${count} times`,
    }
  }
}

/** Cursor direction from the selection, falling back to +X on top of it. */
function patternDirection(anchor: Vec2, cursor: Vec2): Vec2 {
  const towards = sub(cursor, anchor)
  return length(towards) < 1e-9 ? { x: 1, y: 0 } : normalize(towards)
}
