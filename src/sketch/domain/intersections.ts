import type { SketchModel } from './SketchModel'
import type { ArcEntity, CircleEntity, LineEntity, SketchEntity } from './SketchEntity'
import type { Vec2 } from './geometry'
import {
  angleOf,
  arcContainsAngle,
  circleCircleIntersections,
  distance,
  lineCircleIntersections,
  lineLineIntersection,
  sub,
} from './geometry'
import { arcAngles } from './query'

/** The entity kinds the intersection maths understands. */
export type CurveEntity = LineEntity | CircleEntity | ArcEntity

export function isCurve(entity: SketchEntity): entity is CurveEntity {
  return entity.type === 'line' || entity.type === 'circle' || entity.type === 'arc'
}

function onSegment(point: Vec2, start: Vec2, end: Vec2): boolean {
  const span = distance(start, end)
  if (span === 0) return false
  return distance(start, point) <= span + 1e-6 && distance(end, point) <= span + 1e-6
}

function onCurve(model: SketchModel, curve: CurveEntity, point: Vec2): boolean {
  if (curve.type === 'line') {
    return onSegment(point, model.requirePoint(curve.startPointId), model.requirePoint(curve.endPointId))
  }
  if (curve.type === 'circle') return true
  const { startAngle, endAngle, clockwise } = arcAngles(model, curve)
  const center = model.requirePoint(curve.centerPointId)
  return arcContainsAngle(startAngle, endAngle, clockwise, angleOf(sub(point, center)))
}

/** Points where two curves cross, restricted to the drawn extent of each. */
export function curveIntersections(
  model: SketchModel,
  first: CurveEntity,
  second: CurveEntity,
): Vec2[] {
  const hits = rawIntersections(model, first, second)
  return hits.filter((hit) => onCurve(model, first, hit) && onCurve(model, second, hit))
}

function rawIntersections(
  model: SketchModel,
  first: CurveEntity,
  second: CurveEntity,
): Vec2[] {
  if (first.type === 'line' && second.type === 'line') {
    const hit = lineLineIntersection(
      model.requirePoint(first.startPointId),
      model.requirePoint(first.endPointId),
      model.requirePoint(second.startPointId),
      model.requirePoint(second.endPointId),
    )
    return hit ? [hit] : []
  }

  const line = first.type === 'line' ? first : second.type === 'line' ? second : null
  if (line) {
    const curve = (line === first ? second : first) as CircleEntity | ArcEntity
    return lineCircleIntersections(
      model.requirePoint(line.startPointId),
      model.requirePoint(line.endPointId),
      model.requirePoint(curve.centerPointId),
      curve.radius,
    )
  }

  const a = first as CircleEntity | ArcEntity
  const b = second as CircleEntity | ArcEntity
  return circleCircleIntersections(
    model.requirePoint(a.centerPointId),
    a.radius,
    model.requirePoint(b.centerPointId),
    b.radius,
  )
}

/** Every crossing of one curve with the rest of the sketch. */
export function entityIntersections(model: SketchModel, entity: SketchEntity): Vec2[] {
  if (!isCurve(entity)) return []
  const hits: Vec2[] = []
  for (const other of model.entities.values()) {
    if (other.id === entity.id || !isCurve(other)) continue
    hits.push(...curveIntersections(model, entity, other))
  }
  return hits
}
