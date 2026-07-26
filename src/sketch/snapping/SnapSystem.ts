import type { SketchModel } from '../domain/SketchModel'
import type { CurveEntity } from '../domain/intersections'
import { curveIntersections, isCurve } from '../domain/intersections'
import type { Vec2 } from '../domain/geometry'
import { TAU, arcContainsAngle, distance, midpoint, pointOnCircle } from '../domain/geometry'
import { arcAngles, arcMidpoint } from '../domain/query'

export type SnapType =
  | 'endpoint'
  | 'center'
  | 'midpoint'
  | 'quadrant'
  | 'intersection'
  | 'grid'

/** Lower wins. Matches the precedence CAD users expect. */
export const SNAP_PRIORITY: Readonly<Record<SnapType, number>> = {
  endpoint: 0,
  center: 1,
  midpoint: 2,
  quadrant: 3,
  intersection: 4,
  grid: 5,
}

export const SNAP_LABEL: Readonly<Record<SnapType, string>> = {
  endpoint: 'Endpoint',
  center: 'Center',
  midpoint: 'Midpoint',
  quadrant: 'Quadrant',
  intersection: 'Intersection',
  grid: 'Grid',
}

export interface SnapCandidate {
  readonly point: Vec2
  readonly type: SnapType
  /** Entity the snap belongs to — a point id for endpoints and centres. */
  readonly entityId: string | undefined
  /** The second entity of an intersection. */
  readonly secondaryEntityId: string | undefined
  readonly distance: number
  readonly priority: number
  /** Human-readable badge for the cursor overlay. */
  readonly label: string
}

export interface SnapOptions {
  readonly tolerance?: number
  /** Overrides the sketch's own grid spacing. */
  readonly gridSpacing?: number
  readonly enabledTypes?: readonly SnapType[]
  readonly excludeEntityIds?: readonly string[]
}

export const DEFAULT_SNAP_TOLERANCE = 6

const ALL_TYPES: readonly SnapType[] = [
  'endpoint',
  'center',
  'midpoint',
  'quadrant',
  'intersection',
  'grid',
]

/**
 * Finds the point the cursor should latch onto. Candidates are gathered from
 * every entity, filtered by tolerance, then ranked by snap priority and only
 * then by distance — so a slightly further endpoint still beats a nearer grid
 * point, which is what makes snapping feel predictable.
 */
export class SnapSystem {
  private readonly defaults: SnapOptions

  constructor(defaults: SnapOptions = {}) {
    this.defaults = defaults
  }

  findSnap(cursor: Vec2, model: SketchModel, overrides: SnapOptions = {}): SnapCandidate | null {
    return this.findAll(cursor, model, overrides)[0] ?? null
  }

  findAll(cursor: Vec2, model: SketchModel, overrides: SnapOptions = {}): SnapCandidate[] {
    const options = { ...this.defaults, ...overrides }
    const tolerance = options.tolerance ?? DEFAULT_SNAP_TOLERANCE
    const enabled = new Set(options.enabledTypes ?? ALL_TYPES)
    const excluded = new Set(options.excludeEntityIds ?? [])

    const candidates: SnapCandidate[] = []
    const consider = (
      point: Vec2,
      type: SnapType,
      entityId?: string,
      secondaryEntityId?: string,
    ): void => {
      if (!enabled.has(type)) return
      if (entityId !== undefined && excluded.has(entityId)) return
      const gap = distance(cursor, point)
      if (gap > tolerance) return
      candidates.push({
        // Copied, never the live PointEntity — a snap result must not be a
        // handle that lets callers move geometry by accident.
        point: { x: point.x, y: point.y },
        type,
        entityId,
        secondaryEntityId,
        distance: gap,
        priority: SNAP_PRIORITY[type],
        label: SNAP_LABEL[type],
      })
    }

    collectEntityCandidates(model, consider)
    collectIntersections(model, consider)

    const spacing = options.gridSpacing ?? model.gridSpacing
    if (spacing > 0) {
      consider(
        { x: Math.round(cursor.x / spacing) * spacing, y: Math.round(cursor.y / spacing) * spacing },
        'grid',
      )
    }

    return candidates.sort(
      (a, b) => a.priority - b.priority || a.distance - b.distance,
    )
  }
}

type Consider = (
  point: Vec2,
  type: SnapType,
  entityId?: string,
  secondaryEntityId?: string,
) => void

function collectEntityCandidates(model: SketchModel, consider: Consider): void {
  const referenced = new Set<string>()
  for (const entity of model.entities.values()) {
    for (const id of entity.referencedIds) referenced.add(id)
  }

  for (const entity of model.entities.values()) {
    switch (entity.type) {
      case 'point':
        // Standalone points (dimension anchors, construction points) still snap.
        if (!referenced.has(entity.id)) consider(entity, 'endpoint', entity.id)
        break

      case 'line': {
        const start = model.requirePoint(entity.startPointId)
        const end = model.requirePoint(entity.endPointId)
        consider(start, 'endpoint', entity.startPointId)
        consider(end, 'endpoint', entity.endPointId)
        consider(midpoint(start, end), 'midpoint', entity.id)
        break
      }

      case 'circle': {
        const center = model.requirePoint(entity.centerPointId)
        consider(center, 'center', entity.centerPointId)
        for (let quadrant = 0; quadrant < 4; quadrant += 1) {
          consider(pointOnCircle(center, entity.radius, (quadrant * TAU) / 4), 'quadrant', entity.id)
        }
        break
      }

      case 'arc': {
        const center = model.requirePoint(entity.centerPointId)
        consider(center, 'center', entity.centerPointId)
        consider(model.requirePoint(entity.startPointId), 'endpoint', entity.startPointId)
        consider(model.requirePoint(entity.endPointId), 'endpoint', entity.endPointId)
        consider(arcMidpoint(model, entity), 'midpoint', entity.id)

        const { startAngle, endAngle, clockwise } = arcAngles(model, entity)
        for (let quadrant = 0; quadrant < 4; quadrant += 1) {
          const angle = (quadrant * TAU) / 4
          if (!arcContainsAngle(startAngle, endAngle, clockwise, angle)) continue
          consider(pointOnCircle(center, entity.radius, angle), 'quadrant', entity.id)
        }
        break
      }

      case 'slot':
        consider(model.requirePoint(entity.center1PointId), 'center', entity.center1PointId)
        consider(model.requirePoint(entity.center2PointId), 'center', entity.center2PointId)
        break

      case 'polygon': {
        const points = entity.pointIds.map((id) => model.requirePoint(id))
        points.forEach((point, index) =>
          consider(point, 'endpoint', entity.pointIds[index] as string),
        )
        const edgeCount = entity.closed ? points.length : points.length - 1
        for (let index = 0; index < edgeCount; index += 1) {
          const from = points[index] as Vec2
          const to = points[(index + 1) % points.length] as Vec2
          consider(midpoint(from, to), 'midpoint', entity.id)
        }
        break
      }

      case 'ellipse':
        consider(model.requirePoint(entity.centerPointId), 'center', entity.centerPointId)
        consider(model.requirePoint(entity.majorAxisPointId), 'endpoint', entity.majorAxisPointId)
        break

      case 'spline':
        for (const pointId of entity.controlPointIds) {
          consider(model.requirePoint(pointId), 'endpoint', pointId)
        }
        break

      case 'rectangle':
        // Its four edges are lines in their own right and already contribute.
        break
    }
  }
}

function collectIntersections(model: SketchModel, consider: Consider): void {
  const curves = [...model.entities.values()].filter(isCurve)

  for (let i = 0; i < curves.length; i += 1) {
    for (let j = i + 1; j < curves.length; j += 1) {
      const first = curves[i] as CurveEntity
      const second = curves[j] as CurveEntity
      for (const hit of curveIntersections(model, first, second)) {
        consider(hit, 'intersection', first.id, second.id)
      }
    }
  }
}
