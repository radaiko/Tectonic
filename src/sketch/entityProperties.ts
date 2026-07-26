import type { PointEntity, SketchEntity } from './domain/SketchEntity'
import type { SketchModel } from './domain/SketchModel'
import { TAU, angleOf, distance, normalizeAngle, sub } from './domain/geometry'
import { arcAngles } from './domain/query'
import { formatNumber } from './renderer/SketchRenderer'

export interface EntityProperty {
  readonly label: string
  readonly value: string
}

export interface EntityDescription {
  readonly id: string
  /** Human-readable entity kind, e.g. "Circle". */
  readonly kind: string
  readonly isConstruction: boolean
  readonly properties: readonly EntityProperty[]
}

/** Read-only summary of an entity for the properties panel. */
export function describeEntity(model: SketchModel, entity: SketchEntity): EntityDescription {
  return {
    id: entity.id,
    kind: entity.type.charAt(0).toUpperCase() + entity.type.slice(1),
    isConstruction: entity.isConstruction,
    properties: propertiesOf(model, entity),
  }
}

function propertiesOf(model: SketchModel, entity: SketchEntity): EntityProperty[] {
  switch (entity.type) {
    case 'point':
      return [
        { label: 'X', value: formatNumber(entity.x) },
        { label: 'Y', value: formatNumber(entity.y) },
      ]

    case 'line': {
      const start = model.requirePoint(entity.startPointId)
      const end = model.requirePoint(entity.endPointId)
      return [
        { label: 'Start', value: point(start.x, start.y) },
        { label: 'End', value: point(end.x, end.y) },
        { label: 'Length', value: formatNumber(distance(start, end)) },
        { label: 'Angle', value: `${formatNumber(degrees(angleOf(sub(end, start))))}°` },
      ]
    }

    case 'circle': {
      const center = model.requirePoint(entity.centerPointId)
      return [
        { label: 'Centre', value: point(center.x, center.y) },
        { label: 'Radius', value: formatNumber(entity.radius) },
        { label: 'Diameter', value: formatNumber(entity.radius * 2) },
      ]
    }

    case 'arc': {
      const center = model.requirePoint(entity.centerPointId)
      const { startAngle, endAngle, clockwise } = arcAngles(model, entity)
      const sweep = clockwise
        ? normalizeAngle(startAngle - endAngle)
        : normalizeAngle(endAngle - startAngle)
      return [
        { label: 'Centre', value: point(center.x, center.y) },
        { label: 'Radius', value: formatNumber(entity.radius) },
        { label: 'Sweep', value: `${formatNumber(degrees(sweep))}°` },
        { label: 'Direction', value: clockwise ? 'Clockwise' : 'Counter-clockwise' },
      ]
    }

    case 'rectangle': {
      // Tolerates a half-deleted rectangle: the panel must never throw.
      const corners = entity.cornerPointIds
        .map((id) => model.getEntity(id))
        .filter((candidate): candidate is PointEntity => candidate?.type === 'point')
      const [first, second, third] = corners
      if (!first || !second || !third) return []
      return [
        { label: 'Width', value: formatNumber(distance(first, second)) },
        { label: 'Height', value: formatNumber(distance(second, third)) },
      ]
    }

    case 'slot': {
      const first = model.requirePoint(entity.center1PointId)
      const second = model.requirePoint(entity.center2PointId)
      return [
        { label: 'Width', value: formatNumber(entity.width) },
        { label: 'Span', value: formatNumber(distance(first, second)) },
      ]
    }

    case 'polygon':
      return [
        { label: 'Vertices', value: String(entity.pointIds.length) },
        { label: 'Closed', value: entity.closed ? 'Yes' : 'No' },
      ]

    case 'ellipse': {
      const center = model.requirePoint(entity.centerPointId)
      const major = model.requirePoint(entity.majorAxisPointId)
      return [
        { label: 'Centre', value: point(center.x, center.y) },
        { label: 'Major radius', value: formatNumber(distance(center, major)) },
        { label: 'Minor radius', value: formatNumber(entity.minorRadius) },
      ]
    }

    case 'spline':
      return [
        { label: 'Control points', value: String(entity.controlPointIds.length) },
        { label: 'Degree', value: String(entity.degree) },
      ]
  }
}

function point(x: number, y: number): string {
  return `${formatNumber(x)}, ${formatNumber(y)}`
}

function degrees(radians: number): number {
  return (normalizeAngle(radians) / TAU) * 360
}
