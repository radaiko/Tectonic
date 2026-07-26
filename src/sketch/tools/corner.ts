import type { LineEntity } from '../domain/SketchEntity'
import type { SketchModel } from '../domain/SketchModel'
import type { Vec2 } from '../domain/geometry'
import {
  EPSILON,
  angleBetween,
  distance,
  lineLineIntersection,
  normalize,
  sub,
} from '../domain/geometry'

/** One of the two lines meeting at a corner, described from the corner outwards. */
export interface CornerLeg {
  readonly line: LineEntity
  /** Endpoint pulled back to make room for the fillet or chamfer. */
  readonly nearPointId: string
  /** Unit vector from the corner towards the far end of the line. */
  readonly direction: Vec2
  /** Distance from the corner to the far end — the setback budget. */
  readonly reach: number
}

export interface Corner {
  /** Where the two lines meet, extended if they do not touch. */
  readonly point: Vec2
  readonly first: CornerLeg
  readonly second: CornerLeg
  /** Included angle at the corner, in radians. */
  readonly angle: number
}

/**
 * Geometry of the corner two lines form. Returns `null` when they are parallel,
 * collinear or degenerate — none of which can be filleted or chamfered.
 */
export function findCorner(
  model: SketchModel,
  first: LineEntity,
  second: LineEntity,
): Corner | null {
  const point = lineLineIntersection(
    model.requirePoint(first.startPointId),
    model.requirePoint(first.endPointId),
    model.requirePoint(second.startPointId),
    model.requirePoint(second.endPointId),
  )
  if (!point) return null

  const firstLeg = legOf(model, first, point)
  const secondLeg = legOf(model, second, point)
  if (!firstLeg || !secondLeg) return null

  const angle = angleBetween(firstLeg.direction, secondLeg.direction)
  if (angle < 1e-6 || Math.PI - angle < 1e-6) return null

  return { point, first: firstLeg, second: secondLeg, angle }
}

function legOf(model: SketchModel, line: LineEntity, corner: Vec2): CornerLeg | null {
  const start = model.requirePoint(line.startPointId)
  const end = model.requirePoint(line.endPointId)
  const startIsNear = distance(start, corner) <= distance(end, corner)
  const nearPointId = startIsNear ? line.startPointId : line.endPointId
  const far = startIsNear ? end : start

  const reach = distance(corner, far)
  if (reach < EPSILON) return null
  return { line, nearPointId, direction: normalize(sub(far, corner)), reach }
}
