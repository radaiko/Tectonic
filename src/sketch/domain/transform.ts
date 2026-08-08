import type { SketchModel } from './SketchModel'
import type { SketchEntity, SketchEntityJSON } from './SketchEntity'
import { entityFromJSON } from './SketchEntity'
import type { Vec2 } from './geometry'
import { dot, normalize, scale, sub } from './geometry'
import { newId } from './ids'

/** Maps a sketch position to a new one — the input to copy operations. */
export type PointTransform = (point: Vec2) => Vec2

/** Reflects a point across the line through `a` and `b`. */
export function reflectPoint(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const direction = normalize(sub(b, a))
  const offset = sub(point, a)
  const along = scale(direction, 2 * dot(offset, direction))
  return { x: a.x + along.x - offset.x, y: a.y + along.y - offset.y }
}

export function rotatePoint(point: Vec2, center: Vec2, radians: number): Vec2 {
  const offset = sub(point, center)
  return {
    x: center.x + offset.x * Math.cos(radians) - offset.y * Math.sin(radians),
    y: center.y + offset.x * Math.sin(radians) + offset.y * Math.cos(radians),
  }
}

export function translatePoint(point: Vec2, delta: Vec2): Vec2 {
  return { x: point.x + delta.x, y: point.y + delta.y }
}

/** Widens a set of entity ids to include everything they are built from. */
export function expandToDependencies(model: SketchModel, entityIds: Iterable<string>): string[] {
  const collected = new Set<string>()
  const visit = (id: string): void => {
    if (collected.has(id)) return
    const entity = model.getEntity(id)
    if (!entity) return
    collected.add(id)
    for (const referenced of entity.referencedIds) visit(referenced)
  }
  for (const id of entityIds) visit(id)
  return [...collected]
}

/**
 * Copies entities into the same sketch, running every position they are built
 * from through `transform`. Ids are freshly minted and internal references
 * rewired, so the copy is fully independent of the original.
 */
export function copyEntities(
  model: SketchModel,
  entityIds: Iterable<string>,
  transform: PointTransform,
): SketchEntity[] {
  const sources = expandToDependencies(model, entityIds)
  const idMap = new Map<string, string>()
  for (const id of sources) idMap.set(id, newId())

  const created: SketchEntity[] = []
  // Points first: composite entities reference them by their new ids.
  for (const id of sources) {
    const entity = model.requireEntity(id)
    if (entity.type !== 'point') continue
    const moved = transform({ x: entity.x, y: entity.y })
    created.push(
      model.addEntity(
        entityFromJSON({
          ...entity.toJSON(),
          id: idMap.get(id) as string,
          x: moved.x,
          y: moved.y,
        }),
      ),
    )
  }
  for (const id of sources) {
    const entity = model.requireEntity(id)
    if (entity.type === 'point') continue
    created.push(model.addEntity(entityFromJSON(remapIds(entity.toJSON(), idMap))))
  }
  return created
}

/** Rewrites every id-bearing field of an entity's JSON through `idMap`. */
function remapIds(json: SketchEntityJSON, idMap: ReadonlyMap<string, string>): SketchEntityJSON {
  const result: Record<string, unknown> = { ...json }
  for (const [key, value] of Object.entries(json)) {
    if (key === 'type') continue
    if (key === 'id') {
      result.id = idMap.get(json.id) ?? newId()
      continue
    }
    if (typeof value === 'string') {
      const mapped = idMap.get(value)
      if (mapped) result[key] = mapped
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? (idMap.get(item) ?? item) : item,
      )
    }
  }
  return result as unknown as SketchEntityJSON
}
