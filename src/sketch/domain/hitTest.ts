import type { SketchModel } from './SketchModel'
import type { SketchEntity } from './SketchEntity'
import type { Vec2 } from './geometry'
import { distance, distanceToSegment } from './geometry'
import { tessellate } from './query'

export interface BoundingBox {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/**
 * Distance from a world point to an entity's drawn outline. Closed shapes are
 * hit on their outline, never their interior — that is what CAD users expect
 * when picking edges.
 */
export function distanceToEntity(model: SketchModel, entity: SketchEntity, point: Vec2): number {
  if (entity.type === 'point') return distance(point, entity)

  const outline = tessellate(model, entity)
  if (outline.length === 0) return Number.POSITIVE_INFINITY
  if (outline.length === 1) return distance(point, outline[0] as Vec2)

  let closest = Number.POSITIVE_INFINITY
  for (let index = 0; index < outline.length - 1; index += 1) {
    closest = Math.min(
      closest,
      distanceToSegment(point, outline[index] as Vec2, outline[index + 1] as Vec2),
    )
  }
  return closest
}

/**
 * Entities within `tolerance` of the point, nearest first. Points sort ahead of
 * curves at equal distance so a vertex stays grabbable on top of its edge.
 */
export function hitTestAll(
  model: SketchModel,
  point: Vec2,
  tolerance: number,
): SketchEntity[] {
  const hits: { entity: SketchEntity; gap: number; rank: number }[] = []
  for (const entity of model.entities.values()) {
    const gap = distanceToEntity(model, entity, point)
    if (gap > tolerance) continue
    hits.push({ entity, gap, rank: entity.type === 'point' ? 0 : 1 })
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.gap - b.gap)
    .map((hit) => hit.entity)
}

export function hitTest(model: SketchModel, point: Vec2, tolerance: number): SketchEntity | null {
  return hitTestAll(model, point, tolerance)[0] ?? null
}

/** Entities whose geometry lies entirely inside the box. */
export function entitiesInBox(model: SketchModel, box: BoundingBox): SketchEntity[] {
  return [...model.entities.values()].filter((entity) => {
    const outline = entity.type === 'point' ? [entity] : tessellate(model, entity)
    if (outline.length === 0) return false
    return outline.every(
      (position) =>
        position.x >= box.minX &&
        position.x <= box.maxX &&
        position.y >= box.minY &&
        position.y <= box.maxY,
    )
  })
}

export function boundingBox(model: SketchModel): BoundingBox {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const entity of model.entities.values()) {
    for (const position of entity.type === 'point' ? [entity] : tessellate(model, entity)) {
      minX = Math.min(minX, position.x)
      minY = Math.min(minY, position.y)
      maxX = Math.max(maxX, position.x)
      maxY = Math.max(maxY, position.y)
    }
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}
