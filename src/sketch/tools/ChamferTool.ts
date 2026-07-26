import { add, scale } from '../domain/geometry'
import { LineEntity } from '../domain/SketchEntity'
import type { Corner } from './corner'
import { CornerTool } from './CornerTool'
import type { ToolContext, ToolId, ToolResult } from './SketchTool'
import { movePoint } from './toolSupport'

/**
 * Cuts the corner between two lines: both are pulled back by the chamfer
 * distance and a straight edge is run between the new endpoints.
 */
export class ChamferTool extends CornerTool {
  readonly id: ToolId = 'chamfer'
  protected readonly noun = 'chamfer'

  protected applyCorner(context: ToolContext, corner: Corner): ToolResult {
    const setback = context.settings.chamferDistance
    if (setback <= 0) return { error: 'The chamfer distance must be greater than zero' }
    if (setback > corner.first.reach || setback > corner.second.reach) {
      return { error: 'The chamfer distance is too large for these lines' }
    }

    const { model } = context
    movePoint(model, corner.first.nearPointId, add(corner.point, scale(corner.first.direction, setback)))
    movePoint(
      model,
      corner.second.nearPointId,
      add(corner.point, scale(corner.second.direction, setback)),
    )

    const chamfer = model.addEntity(
      new LineEntity({
        startPointId: corner.first.nearPointId,
        endPointId: corner.second.nearPointId,
        isConstruction: corner.first.line.isConstruction,
      }),
    )
    return { changed: true, createdEntityIds: [chamfer.id], done: true, status: 'Chamfer created' }
  }
}
