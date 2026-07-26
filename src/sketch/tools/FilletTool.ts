import { add, angleOf, normalize, normalizeAngle, scale, sub } from '../domain/geometry'
import { ArcEntity, PointEntity } from '../domain/SketchEntity'
import type { Corner } from './corner'
import { CornerTool } from './CornerTool'
import type { ToolContext, ToolId, ToolResult } from './SketchTool'
import { movePoint } from './toolSupport'

/**
 * Rounds the corner between two lines: both lines are pulled back to their
 * tangent points and an arc of the requested radius is dropped in between,
 * reusing those very points so the profile stays connected.
 */
export class FilletTool extends CornerTool {
  readonly id: ToolId = 'fillet'
  protected readonly noun = 'fillet'

  protected applyCorner(context: ToolContext, corner: Corner): ToolResult {
    const radius = context.settings.filletRadius
    if (radius <= 0) return { error: 'The fillet radius must be greater than zero' }

    const half = corner.angle / 2
    const setback = radius / Math.tan(half)
    if (setback > corner.first.reach || setback > corner.second.reach) {
      return { error: 'The fillet radius is too large for these lines' }
    }

    const tangent1 = add(corner.point, scale(corner.first.direction, setback))
    const tangent2 = add(corner.point, scale(corner.second.direction, setback))
    const bisector = normalize(add(corner.first.direction, corner.second.direction))
    const center = add(corner.point, scale(bisector, radius / Math.sin(half)))

    const { model } = context
    movePoint(model, corner.first.nearPointId, tangent1)
    movePoint(model, corner.second.nearPointId, tangent2)

    const isConstruction = corner.first.line.isConstruction
    const centerPoint = model.addEntity(new PointEntity({ ...center, isConstruction }))
    // Whichever way round is the short way is the fillet.
    const sweep = normalizeAngle(angleOf(sub(tangent2, center)) - angleOf(sub(tangent1, center)))

    const arc = model.addEntity(
      new ArcEntity({
        centerPointId: centerPoint.id,
        startPointId: corner.first.nearPointId,
        endPointId: corner.second.nearPointId,
        radius,
        clockwise: sweep > Math.PI,
        isConstruction,
      }),
    )
    return { changed: true, createdEntityIds: [arc.id], done: true, status: 'Fillet created' }
  }
}
