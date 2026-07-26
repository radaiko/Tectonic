import type { LengthUnit } from '../domain/Document'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { SketchEntity } from '../sketch/domain/SketchEntity'
import type { Vec2 } from '../sketch/domain/geometry'
import { normalizeAngle } from '../sketch/domain/geometry'
import { arcAngles, circleCenter, lineEnd, lineStart, tessellate } from '../sketch/domain/query'
import { encodeXmlText } from './xml'
import { isClosedPolyline } from './polyline'
import { num } from './types'

/**
 * SVG writing. Every entity becomes one `<path>`, which keeps the output
 * uniform and round-trips cleanly back through the importer.
 *
 * A sketch's y axis points up and SVG's points down, so the drawing is mirrored
 * about the middle of its own viewBox on the way out — the same mirror the
 * importer applies, which makes it its own inverse and the round trip exact. No
 * transform attribute is emitted; the coordinates in the file are the ones a
 * reader sees.
 */

export interface SvgExportOptions {
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly fill?: string
  /** Blank space around the drawing, in sketch units. */
  readonly margin?: number
  readonly precision?: number
  /** Points per curve for entities without an SVG counterpart. */
  readonly segments?: number
  readonly includeConstruction?: boolean
  readonly constructionStroke?: string
  readonly constructionDashArray?: string
  /** Written as the unit suffix on the width/height attributes. */
  readonly units?: LengthUnit
  readonly title?: string
}

const DEFAULTS = {
  stroke: '#000000',
  strokeWidth: 0.25,
  fill: 'none',
  margin: 5,
  precision: 4,
  segments: 48,
  constructionStroke: '#8899aa',
  constructionDashArray: '2 1',
} as const

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function exportSvg(sketch: SketchModel, options: SvgExportOptions = {}): string {
  const precision = options.precision ?? DEFAULTS.precision
  const segments = options.segments ?? DEFAULTS.segments
  const margin = options.margin ?? DEFAULTS.margin
  const includeConstruction = options.includeConstruction ?? false

  const drawn = [...sketch.entities.values()].filter(
    (entity) => entity.type !== 'point' && (includeConstruction || !entity.isConstruction),
  )

  const bounds = boundsOf(sketch, drawn, segments)
  const width = Math.max(bounds.maxX - bounds.minX + margin * 2, 1)
  const height = Math.max(bounds.maxY - bounds.minY + margin * 2, 1)
  // Mirroring about `minY + maxY` puts the content back in the middle of the
  // box, and applying it a second time — as the importer does — undoes it.
  const mirror = bounds.minY + bounds.maxY
  const viewBox = [bounds.minX - margin, bounds.minY - margin, width, height]
    .map((value) => num(value, precision))
    .join(' ')

  const unitSuffix = options.units ?? ''
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="${viewBox}" ` +
      `width="${num(width, precision)}${unitSuffix}" height="${num(height, precision)}${unitSuffix}">`,
  ]
  if (options.title) lines.push(`  <title>${encodeXmlText(options.title)}</title>`)

  for (const entity of drawn) {
    const data = pathData(sketch, entity, segments, precision, mirror)
    if (data === null) continue
    lines.push(`  <path d="${data}" ${strokeAttributes(entity, options)}/>`)
  }

  lines.push('</svg>')
  return `${lines.join('\n')}\n`
}

function strokeAttributes(entity: SketchEntity, options: SvgExportOptions): string {
  const construction = entity.isConstruction
  const stroke = construction
    ? (options.constructionStroke ?? DEFAULTS.constructionStroke)
    : (options.stroke ?? DEFAULTS.stroke)
  const attributes = [
    `fill="${options.fill ?? DEFAULTS.fill}"`,
    `stroke="${stroke}"`,
    `stroke-width="${options.strokeWidth ?? DEFAULTS.strokeWidth}"`,
  ]
  if (construction) {
    attributes.push(
      `stroke-dasharray="${options.constructionDashArray ?? DEFAULTS.constructionDashArray}"`,
    )
  }
  return attributes.join(' ')
}

/**
 * The path data for one entity, or null when it has nothing to draw. `mirror`
 * is the y value the drawing is reflected about on its way into SVG space.
 */
export function pathData(
  sketch: SketchModel,
  entity: SketchEntity,
  segments: number,
  precision: number,
  mirror = 0,
): string | null {
  const point = (position: Vec2): string =>
    `${num(position.x, precision)} ${num(mirror - position.y, precision)}`

  switch (entity.type) {
    case 'point':
      return null

    // The four edges are line entities of their own, already written.
    case 'rectangle':
      return null

    case 'line':
      return `M ${point(lineStart(sketch, entity))} L ${point(lineEnd(sketch, entity))}`

    case 'circle': {
      const center = circleCenter(sketch, entity)
      const radius = num(entity.radius, precision)
      const right = point({ x: center.x + entity.radius, y: center.y })
      const left = point({ x: center.x - entity.radius, y: center.y })
      // Two half-turns: a single arc command cannot close a full circle.
      return `M ${right} A ${radius} ${radius} 0 0 1 ${left} A ${radius} ${radius} 0 0 1 ${right} Z`
    }

    case 'arc': {
      const { startAngle, endAngle, clockwise } = arcAngles(sketch, entity)
      const sweep = clockwise
        ? -normalizeAngle(startAngle - endAngle)
        : normalizeAngle(endAngle - startAngle)
      const radius = num(entity.radius, precision)
      const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0
      // Negating y reverses the turn, so a counter-clockwise sketch arc is
      // drawn in SVG's negative-angle direction.
      const sweepFlag = clockwise ? 1 : 0
      const start = point(sketch.requirePoint(entity.startPointId))
      const end = point(sketch.requirePoint(entity.endPointId))
      return `M ${start} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${end}`
    }

    default: {
      const points = tessellate(sketch, entity, segments)
      if (points.length < 2) return null
      const closed = isClosedPolyline(points)
      const body = (closed ? points.slice(0, -1) : points).map(point)
      return `M ${body[0]} ${body
        .slice(1)
        .map((position) => `L ${position}`)
        .join(' ')}${closed ? ' Z' : ''}`
    }
  }
}

function boundsOf(
  sketch: SketchModel,
  entities: readonly SketchEntity[],
  segments: number,
): Bounds {
  const bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  let seen = false

  for (const entity of entities) {
    for (const point of tessellate(sketch, entity, segments)) {
      if (!seen) {
        bounds.minX = point.x
        bounds.maxX = point.x
        bounds.minY = point.y
        bounds.maxY = point.y
        seen = true
        continue
      }
      bounds.minX = Math.min(bounds.minX, point.x)
      bounds.maxX = Math.max(bounds.maxX, point.x)
      bounds.minY = Math.min(bounds.minY, point.y)
      bounds.maxY = Math.max(bounds.maxY, point.y)
    }
  }
  return bounds
}
