import { buildCircle, buildLine } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import {
  EPSILON,
  add,
  angleOf,
  cross,
  distance,
  normalize,
  pointOnCircle,
  scale,
  sub,
} from '../domain/geometry'
import { ArcEntity, PointEntity } from '../domain/SketchEntity'
import type { CircleEntity, LineEntity } from '../domain/SketchEntity'
import type { SketchModel } from '../domain/SketchModel'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { pickCurve } from './toolSupport'

/** Either the entity the offset produced, or why it produced none. */
type OffsetOutcome = { readonly entityId: string } | { readonly error: string }

/**
 * Drops a parallel copy of the clicked curve. Which side it lands on is read
 * from where the cursor is: left or right of a line, inside or outside a circle.
 */
export class OffsetTool extends BaseTool {
  readonly id: ToolId = 'offset'

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const curve = pickCurve(context, event.world)
    if (!curve) return { error: 'Nothing to offset here' }

    const gap = context.settings.offsetDistance
    if (gap <= 0) return { error: 'The offset distance must be greater than zero' }

    const outcome =
      curve.type === 'line'
        ? offsetLine(context.model, curve, event.world, gap)
        : offsetRound(context.model, curve, event.world, gap)
    if ('error' in outcome) return { error: outcome.error }

    return {
      changed: true,
      done: true,
      createdEntityIds: [outcome.entityId],
      status: 'Offset created',
    }
  }
}

function offsetLine(
  model: SketchModel,
  line: LineEntity,
  cursor: Vec2,
  gap: number,
): OffsetOutcome {
  const start = { ...model.requirePoint(line.startPointId) }
  const end = { ...model.requirePoint(line.endPointId) }
  if (distance(start, end) < EPSILON) return { error: 'That line is too short to offset' }

  const along = sub(end, start)
  const direction = normalize(along)
  // Which side of the line the cursor sits on decides which way the copy goes.
  const side = cross(along, sub(cursor, start)) >= 0 ? 1 : -1
  const shift = scale({ x: -direction.y * side, y: direction.x * side }, gap)

  const created = buildLine(model, add(start, shift), add(end, shift), {
    isConstruction: line.isConstruction,
  })
  return { entityId: created.id }
}

function offsetRound(
  model: SketchModel,
  curve: CircleEntity | ArcEntity,
  cursor: Vec2,
  gap: number,
): OffsetOutcome {
  const center = { ...model.requirePoint(curve.centerPointId) }
  const outward = distance(cursor, center) >= curve.radius
  const radius = curve.radius + (outward ? gap : -gap)
  if (radius <= EPSILON) return { error: 'The offset result is too small to exist' }

  const isConstruction = curve.isConstruction
  if (curve.type === 'circle') {
    return { entityId: buildCircle(model, center, radius, { isConstruction }).id }
  }

  const startAngle = angleOf(sub(model.requirePoint(curve.startPointId), center))
  const endAngle = angleOf(sub(model.requirePoint(curve.endPointId), center))
  const centerPoint = model.addEntity(new PointEntity({ ...center, isConstruction }))
  const startPoint = model.addEntity(
    new PointEntity({ ...pointOnCircle(center, radius, startAngle), isConstruction }),
  )
  const endPoint = model.addEntity(
    new PointEntity({ ...pointOnCircle(center, radius, endAngle), isConstruction }),
  )

  const created = model.addEntity(
    new ArcEntity({
      centerPointId: centerPoint.id,
      startPointId: startPoint.id,
      endPointId: endPoint.id,
      radius,
      clockwise: curve.clockwise,
      isConstruction,
    }),
  )
  return { entityId: created.id }
}
