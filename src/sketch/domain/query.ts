import type { Vec2 } from './geometry'
import { distance, midpoint, normalizeAngle, pointOnCircle, sub, angleOf } from './geometry'
import type { SketchModel } from './SketchModel'
import type { ArcEntity, CircleEntity, EllipseEntity, LineEntity, SketchEntity } from './SketchEntity'
import { isPoint } from './SketchEntity'

/** Resolved positions of every point an entity is built from, in order. */
export function entityPoints(model: SketchModel, entity: SketchEntity): Vec2[] {
  const positions: Vec2[] = []
  for (const id of entity.referencedIds) {
    const candidate = model.getEntity(id)
    if (candidate && isPoint(candidate)) positions.push({ x: candidate.x, y: candidate.y })
  }
  return positions
}

export function lineStart(model: SketchModel, line: LineEntity): Vec2 {
  return model.requirePoint(line.startPointId)
}

export function lineEnd(model: SketchModel, line: LineEntity): Vec2 {
  return model.requirePoint(line.endPointId)
}

export function lineMidpoint(model: SketchModel, line: LineEntity): Vec2 {
  return midpoint(lineStart(model, line), lineEnd(model, line))
}

export function lineLength(model: SketchModel, line: LineEntity): number {
  return distance(lineStart(model, line), lineEnd(model, line))
}

export function circleCenter(
  model: SketchModel,
  circle: CircleEntity | ArcEntity | EllipseEntity,
): Vec2 {
  return model.requirePoint(circle.centerPointId)
}

export interface ArcAngles {
  readonly startAngle: number
  readonly endAngle: number
  readonly clockwise: boolean
}

export function arcAngles(model: SketchModel, arc: ArcEntity): ArcAngles {
  const center = circleCenter(model, arc)
  return {
    startAngle: normalizeAngle(angleOf(sub(model.requirePoint(arc.startPointId), center))),
    endAngle: normalizeAngle(angleOf(sub(model.requirePoint(arc.endPointId), center))),
    clockwise: arc.clockwise,
  }
}

/** Point halfway along an arc's sweep. */
export function arcMidpoint(model: SketchModel, arc: ArcEntity): Vec2 {
  const center = circleCenter(model, arc)
  const { startAngle, endAngle, clockwise } = arcAngles(model, arc)
  const sweep = clockwise
    ? -normalizeAngle(startAngle - endAngle)
    : normalizeAngle(endAngle - startAngle)
  return pointOnCircle(center, arc.radius, startAngle + sweep / 2)
}

/** Polyline approximation of any entity — the common currency for hit testing. */
export function tessellate(model: SketchModel, entity: SketchEntity, segments = 48): Vec2[] {
  switch (entity.type) {
    case 'point':
      return [{ x: entity.x, y: entity.y }]
    case 'line':
      return [lineStart(model, entity), lineEnd(model, entity)]
    case 'circle': {
      const center = circleCenter(model, entity)
      return Array.from({ length: segments + 1 }, (_unused, index) =>
        pointOnCircle(center, entity.radius, (index / segments) * Math.PI * 2),
      )
    }
    case 'arc': {
      const center = circleCenter(model, entity)
      const { startAngle, endAngle, clockwise } = arcAngles(model, entity)
      const sweep = clockwise
        ? -normalizeAngle(startAngle - endAngle)
        : normalizeAngle(endAngle - startAngle)
      return Array.from({ length: segments + 1 }, (_unused, index) =>
        pointOnCircle(center, entity.radius, startAngle + (index / segments) * sweep),
      )
    }
    case 'rectangle': {
      const corners = entity.cornerPointIds.map((id) => model.requirePoint(id))
      return [...corners, corners[0] as Vec2]
    }
    case 'slot':
      return slotOutline(model, entity.center1PointId, entity.center2PointId, entity.width)
    case 'polygon': {
      const points = entity.pointIds.map((id) => model.requirePoint(id) as Vec2)
      return entity.closed && points.length > 0 ? [...points, points[0] as Vec2] : points
    }
    case 'ellipse': {
      const center = circleCenter(model, entity)
      const major = model.requirePoint(entity.majorAxisPointId)
      const axis = sub(major, center)
      const majorRadius = distance(center, major)
      const rotation = angleOf(axis)
      return Array.from({ length: segments + 1 }, (_unused, index) => {
        const t = (index / segments) * Math.PI * 2
        const localX = majorRadius * Math.cos(t)
        const localY = entity.minorRadius * Math.sin(t)
        return {
          x: center.x + localX * Math.cos(rotation) - localY * Math.sin(rotation),
          y: center.y + localX * Math.sin(rotation) + localY * Math.cos(rotation),
        }
      })
    }
    case 'spline':
      return splinePolyline(
        entity.controlPointIds.map((id) => model.requirePoint(id) as Vec2),
        segments,
      )
  }
}

function slotOutline(
  model: SketchModel,
  center1Id: string,
  center2Id: string,
  width: number,
): Vec2[] {
  const a = model.requirePoint(center1Id)
  const b = model.requirePoint(center2Id)
  const radius = width / 2
  const axisAngle = angleOf(sub(b, a))
  const steps = 16
  const points: Vec2[] = []
  for (let index = 0; index <= steps; index += 1) {
    points.push(pointOnCircle(b, radius, axisAngle - Math.PI / 2 + (index / steps) * Math.PI))
  }
  for (let index = 0; index <= steps; index += 1) {
    points.push(pointOnCircle(a, radius, axisAngle + Math.PI / 2 + (index / steps) * Math.PI))
  }
  points.push(points[0] as Vec2)
  return points
}

/**
 * Uniform Catmull-Rom interpolation through the control points. Good enough for
 * display and hit testing; the kernel gets the real NURBS in a later milestone.
 */
export function splinePolyline(points: readonly Vec2[], segments = 48): Vec2[] {
  if (points.length < 2) return [...points]
  const perSpan = Math.max(2, Math.round(segments / (points.length - 1)))
  const result: Vec2[] = []

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)] as Vec2
    const p1 = points[index] as Vec2
    const p2 = points[index + 1] as Vec2
    const p3 = points[Math.min(points.length - 1, index + 2)] as Vec2

    for (let step = 0; step < perSpan; step += 1) {
      const t = step / perSpan
      const t2 = t * t
      const t3 = t2 * t
      result.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  result.push(points[points.length - 1] as Vec2)
  return result
}
