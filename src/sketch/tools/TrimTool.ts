import { buildLine } from '../domain/builders'
import type { Vec2 } from '../domain/geometry'
import {
  EPSILON,
  add,
  angleOf,
  arcContainsAngle,
  dot,
  lineCircleIntersections,
  lineLineIntersection,
  normalizeAngle,
  pointOnCircle,
  scale,
  sub,
} from '../domain/geometry'
import { ArcEntity, PointEntity } from '../domain/SketchEntity'
import type { CircleEntity, LineEntity } from '../domain/SketchEntity'
import type { SketchModel } from '../domain/SketchModel'
import type { CurveEntity } from '../domain/intersections'
import { entityIntersections, isCurve } from '../domain/intersections'
import { arcAngles } from '../domain/query'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { movePoint, pickCurve } from './toolSupport'

/** Parameters this close to an end are the end, not a crossing to trim at. */
const PARAM_EPSILON = 1e-6

/**
 * Click a stretch of geometry to cut it away at the crossings that bound it;
 * hold shift to grow the nearest end out to the next crossing instead.
 */
export class TrimTool extends BaseTool {
  readonly id: ToolId = 'trim'

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const curve = pickCurve(context, event.world)
    if (!curve) {
      return { error: event.shiftKey ? 'Nothing to extend here' : 'Nothing to trim here' }
    }
    return event.shiftKey
      ? extendCurve(context.model, curve, event.world)
      : trimCurve(context.model, curve, event.world)
  }
}

/* -------------------------------------------------------------------------- */
/* Trim                                                                        */
/* -------------------------------------------------------------------------- */

function trimCurve(model: SketchModel, curve: CurveEntity, click: Vec2): ToolResult {
  if (curve.type === 'line') return trimLine(model, curve, click)
  if (curve.type === 'circle') return trimCircle(model, curve, click)
  return trimArc(model, curve, click)
}

function trimLine(model: SketchModel, line: LineEntity, click: Vec2): ToolResult {
  const start = { ...model.requirePoint(line.startPointId) }
  const end = { ...model.requirePoint(line.endPointId) }
  const along = sub(end, start)
  const span = dot(along, along)
  if (span < EPSILON) return removeEntity(model, line.id)

  const at = (t: number): Vec2 => add(start, scale(along, t))
  const paramOf = (point: Vec2): number => dot(sub(point, start), along) / span
  const crossings = interiorParams(entityIntersections(model, line).map(paramOf))
  if (crossings.length === 0) return removeEntity(model, line.id)

  const { lower, upper } = bracket(crossings, paramOf(click))
  if (lower === null) {
    movePoint(model, line.startPointId, at(upper as number))
    return { changed: true, status: 'Trimmed' }
  }
  if (upper === null) {
    movePoint(model, line.endPointId, at(lower))
    return { changed: true, status: 'Trimmed' }
  }

  // The cut is in the middle, so the far side survives as its own line.
  movePoint(model, line.endPointId, at(lower))
  const tail = buildLine(model, at(upper), end, { isConstruction: line.isConstruction })
  return { changed: true, createdEntityIds: [tail.id], status: 'Trimmed' }
}

function trimArc(model: SketchModel, arc: ArcEntity, click: Vec2): ToolResult {
  const center = { ...model.requirePoint(arc.centerPointId) }
  const { startAngle, endAngle, clockwise } = arcAngles(model, arc)
  const sweep = clockwise
    ? -normalizeAngle(startAngle - endAngle)
    : normalizeAngle(endAngle - startAngle)
  if (Math.abs(sweep) < EPSILON) return removeEntity(model, arc.id)

  const end = { ...model.requirePoint(arc.endPointId) }
  const at = (t: number): Vec2 => pointOnCircle(center, arc.radius, startAngle + sweep * t)
  const paramOf = (point: Vec2): number => {
    const angle = angleOf(sub(point, center))
    const offset = clockwise
      ? -normalizeAngle(startAngle - angle)
      : normalizeAngle(angle - startAngle)
    return offset / sweep
  }

  const crossings = interiorParams(entityIntersections(model, arc).map(paramOf))
  if (crossings.length === 0) return removeEntity(model, arc.id)

  const { lower, upper } = bracket(crossings, paramOf(click))
  if (lower === null) {
    movePoint(model, arc.startPointId, at(upper as number))
    return { changed: true, status: 'Trimmed' }
  }
  if (upper === null) {
    movePoint(model, arc.endPointId, at(lower))
    return { changed: true, status: 'Trimmed' }
  }

  movePoint(model, arc.endPointId, at(lower))
  const tail = addArc(model, arc.centerPointId, at(upper), end, arc.radius, clockwise, arc.isConstruction)
  return { changed: true, createdEntityIds: [tail.id], status: 'Trimmed' }
}

/** A circle has no ends, so trimming one turns it into the arc that survives. */
function trimCircle(model: SketchModel, circle: CircleEntity, click: Vec2): ToolResult {
  const center = { ...model.requirePoint(circle.centerPointId) }
  const angles = entityIntersections(model, circle)
    .map((hit) => normalizeAngle(angleOf(sub(hit, center))))
    .sort((a, b) => a - b)
  if (angles.length < 2) return removeEntity(model, circle.id)

  const clickAngle = normalizeAngle(angleOf(sub(click, center)))
  let from = angles[angles.length - 1] as number
  let to = angles[0] as number
  for (let index = 0; index < angles.length - 1; index += 1) {
    const lower = angles[index] as number
    const upper = angles[index + 1] as number
    if (clickAngle >= lower && clickAngle < upper) {
      from = lower
      to = upper
      break
    }
  }

  const centerPointId = circle.centerPointId
  const isConstruction = circle.isConstruction
  model.removeEntity(circle.id)
  const arc = addArc(
    model,
    centerPointId,
    pointOnCircle(center, circle.radius, to),
    pointOnCircle(center, circle.radius, from),
    circle.radius,
    false,
    isConstruction,
  )
  return { changed: true, createdEntityIds: [arc.id], status: 'Trimmed' }
}

/* -------------------------------------------------------------------------- */
/* Extend                                                                      */
/* -------------------------------------------------------------------------- */

function extendCurve(model: SketchModel, curve: CurveEntity, click: Vec2): ToolResult {
  if (curve.type !== 'line') return { error: 'Only a line can be extended' }

  const start = { ...model.requirePoint(curve.startPointId) }
  const end = { ...model.requirePoint(curve.endPointId) }
  const along = sub(end, start)
  const span = dot(along, along)
  if (span < EPSILON) return { error: 'Nothing to extend' }

  const paramOf = (point: Vec2): number => dot(sub(point, start), along) / span
  const candidates = unboundedCrossings(model, curve, start, end).map(paramOf)
  const extendEnd = paramOf(click) >= 0.5

  const reach = extendEnd
    ? candidates.filter((t) => t > 1 + PARAM_EPSILON).sort((a, b) => a - b)[0]
    : candidates.filter((t) => t < -PARAM_EPSILON).sort((a, b) => b - a)[0]
  if (reach === undefined) return { error: 'Nothing to extend to' }

  const target = add(start, scale(along, reach))
  movePoint(model, extendEnd ? curve.endPointId : curve.startPointId, target)
  return { changed: true, status: 'Extended' }
}

/**
 * Where the infinite line through `start..end` meets the rest of the sketch. The
 * *other* curve still has to be hit within its own extent — an extension latches
 * onto real geometry, not onto its imaginary continuation.
 */
function unboundedCrossings(
  model: SketchModel,
  line: LineEntity,
  start: Vec2,
  end: Vec2,
): Vec2[] {
  const hits: Vec2[] = []
  for (const other of model.entities.values()) {
    if (other.id === line.id || !isCurve(other)) continue

    if (other.type === 'line') {
      const otherStart = model.requirePoint(other.startPointId)
      const otherEnd = model.requirePoint(other.endPointId)
      const hit = lineLineIntersection(start, end, otherStart, otherEnd)
      if (hit && withinSegment(hit, otherStart, otherEnd)) hits.push(hit)
      continue
    }

    const center = model.requirePoint(other.centerPointId)
    for (const hit of lineCircleIntersections(start, end, center, other.radius)) {
      if (other.type === 'circle' || onArc(model, other, hit)) hits.push(hit)
    }
  }
  return hits
}

function withinSegment(point: Vec2, start: Vec2, end: Vec2): boolean {
  const along = sub(end, start)
  const span = dot(along, along)
  if (span < EPSILON) return false
  const t = dot(sub(point, start), along) / span
  return t >= -PARAM_EPSILON && t <= 1 + PARAM_EPSILON
}

function onArc(model: SketchModel, arc: ArcEntity, point: Vec2): boolean {
  const center = model.requirePoint(arc.centerPointId)
  const { startAngle, endAngle, clockwise } = arcAngles(model, arc)
  return arcContainsAngle(startAngle, endAngle, clockwise, angleOf(sub(point, center)))
}

/* -------------------------------------------------------------------------- */

/** Crossing parameters strictly inside the curve, sorted. */
function interiorParams(params: readonly number[]): number[] {
  return params
    .filter((t) => t > PARAM_EPSILON && t < 1 - PARAM_EPSILON)
    .sort((a, b) => a - b)
}

interface Bracket {
  readonly lower: number | null
  readonly upper: number | null
}

/** The two crossings the clicked stretch sits between. */
function bracket(params: readonly number[], click: number): Bracket {
  let lower: number | null = null
  let upper: number | null = null
  for (const param of params) {
    if (param <= click) lower = lower === null ? param : Math.max(lower, param)
    else upper = upper === null ? param : Math.min(upper, param)
  }
  return { lower, upper }
}

function removeEntity(model: SketchModel, entityId: string): ToolResult {
  model.removeEntity(entityId)
  return { changed: true, status: 'Removed — nothing crossed it' }
}

function addArc(
  model: SketchModel,
  centerPointId: string,
  start: Vec2,
  end: Vec2,
  radius: number,
  clockwise: boolean,
  isConstruction: boolean,
): ArcEntity {
  const startPoint = model.addEntity(new PointEntity({ ...start, isConstruction }))
  const endPoint = model.addEntity(new PointEntity({ ...end, isConstruction }))
  return model.addEntity(
    new ArcEntity({
      centerPointId,
      startPointId: startPoint.id,
      endPointId: endPoint.id,
      radius,
      clockwise,
      isConstruction,
    }),
  )
}
