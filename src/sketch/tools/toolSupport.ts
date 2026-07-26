import type { Vec2 } from '../domain/geometry'
import { hitTestAll } from '../domain/hitTest'
import type { LineEntity, PointEntity, SketchEntity } from '../domain/SketchEntity'
import { isLine } from '../domain/SketchEntity'
import type { SketchModel } from '../domain/SketchModel'
import type { CurveEntity } from '../domain/intersections'
import { isCurve } from '../domain/intersections'
import { expandToDependencies } from '../domain/transform'
import type { ToolContext } from './SketchTool'

/**
 * Picking and geometry-editing helpers the modify tools share. Kept out of the
 * tools themselves so "what does a click select" has exactly one answer.
 */

/** Entities under the cursor, nearest first, points ahead of curves. */
export function pickAll(context: ToolContext, point: Vec2): SketchEntity[] {
  return hitTestAll(context.model, point, context.pickTolerance)
}

export function pickEntity(context: ToolContext, point: Vec2): SketchEntity | null {
  return pickAll(context, point)[0] ?? null
}

/** Nearest line under the cursor, looking past points and other geometry. */
export function pickLine(context: ToolContext, point: Vec2): LineEntity | null {
  return pickAll(context, point).find(isLine) ?? null
}

export function pickCurve(context: ToolContext, point: Vec2): CurveEntity | null {
  return pickAll(context, point).find(isCurve) ?? null
}

export function movePoint(model: SketchModel, pointId: string, to: Vec2): void {
  const point = model.requirePoint(pointId)
  point.x = to.x
  point.y = to.y
}

/** Every point the given entities are built from, each one once. */
export function pointsOf(model: SketchModel, entityIds: Iterable<string>): PointEntity[] {
  const points: PointEntity[] = []
  for (const id of expandToDependencies(model, entityIds)) {
    const entity = model.getEntity(id)
    if (entity?.type === 'point') points.push(entity)
  }
  return points
}

/** Average of every point the given entities are built from. */
export function centroidOf(model: SketchModel, entityIds: Iterable<string>): Vec2 {
  const points = pointsOf(model, entityIds)
  if (points.length === 0) return { x: 0, y: 0 }
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
    x: 0,
    y: 0,
  })
  return { x: total.x / points.length, y: total.y / points.length }
}

/** Ids in `selection` that still exist in the model. */
export function liveSelection(model: SketchModel, selection: Iterable<string>): string[] {
  return [...selection].filter((id) => model.entities.has(id))
}
