import type { LengthUnit } from '../domain/Document'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { SketchEntity } from '../sketch/domain/SketchEntity'
import type { Vec2 } from '../sketch/domain/geometry'
import { normalizeAngle } from '../sketch/domain/geometry'
import { arcAngles, circleCenter, lineEnd, lineStart, tessellate } from '../sketch/domain/query'
import { isClosedPolyline } from './polyline'
import { num, unitScale } from './types'

/**
 * DXF R12 writing. R12 is the most widely readable flavour and has no handles or
 * object dictionary to keep consistent, so the file is a plain list of entities.
 *
 * Only lines, circles and arcs have a native counterpart. Everything else —
 * ellipses, splines, slots — is written as a POLYLINE tessellation, which is
 * what every 2D CAD package does with them anyway.
 */

export interface DxfExportOptions {
  /** Units the sketch's numbers are in; recorded as $INSUNITS. */
  readonly units?: LengthUnit
  /** Rescale the geometry into these units on the way out. */
  readonly targetUnits?: LengthUnit
  /** Layer every entity lands on unless overridden. */
  readonly layer?: string
  /** AutoCAD colour index for the default layer. 7 is black/white. */
  readonly color?: number
  /** Include entities flagged as construction geometry. Off by default. */
  readonly includeConstruction?: boolean
  /** Segments per curve when an entity has to be tessellated. */
  readonly segments?: number
  /** Decimal places per coordinate. */
  readonly precision?: number
}

/** $INSUNITS codes, keyed by the units the document can be in. */
const INSUNITS_CODE: Readonly<Record<LengthUnit, string>> = {
  in: '1',
  ft: '2',
  mm: '4',
  cm: '5',
  m: '6',
}

const DEFAULT_LAYER = '0'

/** Accumulates group code/value pairs, which is all a DXF file is. */
class DxfWriter {
  readonly #lines: string[] = []
  readonly #precision: number

  constructor(precision: number) {
    this.#precision = precision
  }

  pair(code: number, value: string | number): this {
    this.#lines.push(String(code), typeof value === 'number' ? this.number(value) : value)
    return this
  }

  number(value: number): string {
    return num(value, this.#precision)
  }

  /** A 3D point as its 10/20/30 triple, offset for the second point of a line. */
  point(base: number, point: Vec2): this {
    return this.pair(base, point.x).pair(base + 10, point.y).pair(base + 20, 0)
  }

  toString(): string {
    return `${this.#lines.join('\n')}\n`
  }
}

export function exportDxf(sketch: SketchModel, options: DxfExportOptions = {}): string {
  const precision = options.precision ?? 6
  const layer = options.layer ?? DEFAULT_LAYER
  const color = options.color ?? 7
  const segments = options.segments ?? 48
  const units = options.units ?? 'mm'
  const scale = options.targetUnits ? unitScale(units, options.targetUnits) : 1
  const writer = new DxfWriter(precision)

  writeHeader(writer, options.targetUnits ?? units)
  writeTables(writer, layer, color)

  writer.pair(0, 'SECTION').pair(2, 'ENTITIES')
  for (const entity of sketch.entities.values()) {
    if (entity.isConstruction && !options.includeConstruction) continue
    writeEntity(writer, sketch, entity, { layer, scale, segments })
  }
  writer.pair(0, 'ENDSEC')

  writer.pair(0, 'EOF')
  return writer.toString()
}

function writeHeader(writer: DxfWriter, units: LengthUnit): void {
  writer
    .pair(0, 'SECTION')
    .pair(2, 'HEADER')
    .pair(9, '$ACADVER')
    .pair(1, 'AC1009')
    .pair(9, '$INSUNITS')
    .pair(70, INSUNITS_CODE[units])
    .pair(9, '$MEASUREMENT')
    .pair(70, units === 'in' || units === 'ft' ? '0' : '1')
    .pair(0, 'ENDSEC')
}

function writeTables(writer: DxfWriter, layer: string, color: number): void {
  writer.pair(0, 'SECTION').pair(2, 'TABLES').pair(0, 'TABLE').pair(2, 'LAYER').pair(70, '1')

  writer
    .pair(0, 'LAYER')
    .pair(2, layer)
    .pair(70, '0')
    .pair(62, String(color))
    .pair(6, 'CONTINUOUS')

  writer.pair(0, 'ENDTAB').pair(0, 'ENDSEC')
}

interface EntityContext {
  readonly layer: string
  readonly scale: number
  readonly segments: number
}

function writeEntity(
  writer: DxfWriter,
  sketch: SketchModel,
  entity: SketchEntity,
  context: EntityContext,
): void {
  const at = (point: Vec2): Vec2 => ({ x: point.x * context.scale, y: point.y * context.scale })

  switch (entity.type) {
    case 'point':
      writer.pair(0, 'POINT').pair(8, context.layer)
      writer.point(10, at(entity))
      break

    case 'line':
      writer.pair(0, 'LINE').pair(8, context.layer)
      writer.point(10, at(lineStart(sketch, entity)))
      writer.point(11, at(lineEnd(sketch, entity)))
      break

    case 'circle':
      writer.pair(0, 'CIRCLE').pair(8, context.layer)
      writer.point(10, at(circleCenter(sketch, entity)))
      writer.pair(40, entity.radius * context.scale)
      break

    case 'arc': {
      const { startAngle, endAngle, clockwise } = arcAngles(sketch, entity)
      // DXF sweeps counter-clockwise only, so a clockwise arc swaps its ends.
      const from = clockwise ? endAngle : startAngle
      const to = clockwise ? startAngle : endAngle
      writer.pair(0, 'ARC').pair(8, context.layer)
      writer.point(10, at(circleCenter(sketch, entity)))
      writer
        .pair(40, entity.radius * context.scale)
        .pair(50, degrees(from))
        .pair(51, degrees(to))
      break
    }

    // A rectangle's own edges are separate line entities, already written.
    case 'rectangle':
      break

    default: {
      const points = tessellate(sketch, entity, context.segments).map(at)
      if (points.length >= 2) writePolyline(writer, points, context.layer)
      break
    }
  }
}

/** R12 polylines are a POLYLINE header, a VERTEX per point, then a SEQEND. */
function writePolyline(writer: DxfWriter, points: readonly Vec2[], layer: string): void {
  // A tessellation repeats its first point to close the loop; DXF says so with a flag.
  const closed = isClosedPolyline(points)
  const vertices = closed ? points.slice(0, -1) : points

  writer.pair(0, 'POLYLINE').pair(8, layer).pair(66, '1').pair(70, closed ? '1' : '0')
  writer.point(10, { x: 0, y: 0 })

  for (const point of vertices) {
    writer.pair(0, 'VERTEX').pair(8, layer)
    writer.point(10, point)
  }
  writer.pair(0, 'SEQEND').pair(8, layer)
}

function degrees(radians: number): number {
  return (normalizeAngle(radians) * 180) / Math.PI
}
