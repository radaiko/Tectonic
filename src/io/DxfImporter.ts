import type { LengthUnit } from '../domain/Document'
import type { SketchPlane } from '../sketch/domain/SketchModel'
import { SketchModel } from '../sketch/domain/SketchModel'
import type { Vec2 } from '../sketch/domain/geometry'
import { TAU, normalizeAngle } from '../sketch/domain/geometry'
import {
  buildCenterArc,
  buildCircle,
  buildLine,
  buildPolygon,
  resolvePoint,
} from '../sketch/domain/builders'
import { ImportError, unitScale } from './types'

/**
 * DXF reading for the R12/2000 flavours a 2D CAD exchange actually uses: the
 * ENTITIES section, the LAYER table and the handful of HEADER variables that
 * say what the numbers mean. Anything else in the file is skipped rather than
 * rejected — a drawing is worth more partly read than not read at all.
 */

export interface DxfPair {
  readonly code: number
  readonly value: string
}

/** A code-0 record: the entity keyword plus every pair up to the next code 0. */
export interface DxfRecord {
  readonly type: string
  readonly pairs: readonly DxfPair[]
}

interface DxfEntityBase {
  readonly layer: string
  /** AutoCAD colour index, or null when the entity inherits its layer's. */
  readonly color: number | null
}

export interface DxfLine extends DxfEntityBase {
  readonly type: 'LINE'
  readonly start: Vec2
  readonly end: Vec2
}

export interface DxfCircle extends DxfEntityBase {
  readonly type: 'CIRCLE'
  readonly center: Vec2
  readonly radius: number
}

/** Angles in degrees, swept counter-clockwise from `startAngle`, as DXF defines. */
export interface DxfArc extends DxfEntityBase {
  readonly type: 'ARC'
  readonly center: Vec2
  readonly radius: number
  readonly startAngle: number
  readonly endAngle: number
}

export interface DxfPolyline extends DxfEntityBase {
  readonly type: 'POLYLINE'
  readonly vertices: readonly Vec2[]
  readonly closed: boolean
}

export interface DxfPoint extends DxfEntityBase {
  readonly type: 'POINT'
  readonly position: Vec2
}

export type DxfEntity = DxfLine | DxfCircle | DxfArc | DxfPolyline | DxfPoint

export interface DxfLayer {
  readonly name: string
  readonly color: number
}

export interface DxfImportResult {
  readonly sketch: SketchModel
  readonly entities: readonly DxfEntity[]
  readonly layers: readonly DxfLayer[]
  /** Units the file declared, or `mm` when it declared none. */
  readonly units: LengthUnit
  readonly header: Readonly<Record<string, string>>
}

export interface DxfImportOptions {
  readonly name?: string
  readonly plane?: SketchPlane
  /** Rescale the drawing from its own units into these. */
  readonly targetUnits?: LengthUnit
  /** Extra uniform scale, applied after the unit conversion. */
  readonly scale?: number
  /** Layers to read; every layer when omitted. */
  readonly layers?: readonly string[]
}

/** $INSUNITS values, as the DXF reference numbers them. */
const INSUNITS: Readonly<Record<string, LengthUnit>> = {
  '1': 'in',
  '2': 'ft',
  '4': 'mm',
  '5': 'cm',
  '6': 'm',
}

const DEFAULT_LAYER = '0'

/** Splits the raw text into code/value pairs, two lines at a time. */
export function tokenizeDxf(text: string): DxfPair[] {
  const lines = text.split(/\r?\n/)
  const pairs: DxfPair[] = []

  for (let index = 0; index + 1 < lines.length; index += 2) {
    const rawCode = (lines[index] as string).trim()
    if (rawCode === '') continue
    const code = Number(rawCode)
    if (!Number.isInteger(code)) {
      throw new ImportError(`DXF group code "${rawCode}" on line ${index + 1} is not an integer`)
    }
    pairs.push({ code, value: (lines[index + 1] as string).trim() })
  }
  return pairs
}

/** Groups the pair stream into records, one per code-0 keyword. */
export function readRecords(pairs: readonly DxfPair[]): DxfRecord[] {
  const records: DxfRecord[] = []
  let current: { type: string; pairs: DxfPair[] } | null = null

  for (const pair of pairs) {
    if (pair.code === 0) {
      if (current) records.push(current)
      current = { type: pair.value.toUpperCase(), pairs: [] }
      continue
    }
    if (current) current.pairs.push(pair)
  }
  if (current) records.push(current)
  return records
}

function firstValue(record: DxfRecord, code: number): string | undefined {
  return record.pairs.find((pair) => pair.code === code)?.value
}

function firstNumber(record: DxfRecord, code: number, fallback: number): number {
  const value = firstValue(record, code)
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function requireNumber(record: DxfRecord, code: number): number {
  const value = firstValue(record, code)
  const parsed = Number(value)
  if (value === undefined || !Number.isFinite(parsed)) {
    throw new ImportError(`DXF ${record.type} is missing group code ${code}`)
  }
  return parsed
}

/** HEADER variables, keyed by their `$NAME`, holding the first value that follows. */
export function readHeader(records: readonly DxfRecord[]): Record<string, string> {
  const header: Record<string, string> = {}
  const section = records.find(
    (record) => record.type === 'SECTION' && firstValue(record, 2) === 'HEADER',
  )
  if (!section) return header

  let name: string | null = null
  for (const pair of section.pairs) {
    if (pair.code === 9) {
      name = pair.value
      continue
    }
    if (name !== null && header[name] === undefined) header[name] = pair.value
  }
  return header
}

export function readLayers(records: readonly DxfRecord[]): DxfLayer[] {
  const layers: DxfLayer[] = []
  let inLayerTable = false

  for (const record of records) {
    if (record.type === 'TABLE') {
      inLayerTable = firstValue(record, 2) === 'LAYER'
      continue
    }
    if (record.type === 'ENDTAB') {
      inLayerTable = false
      continue
    }
    if (inLayerTable && record.type === 'LAYER') {
      const name = firstValue(record, 2)
      if (name !== undefined) layers.push({ name, color: firstNumber(record, 62, 7) })
    }
  }
  return layers
}

/** The ENTITIES section as typed entities. Unsupported keywords are skipped. */
export function readEntities(records: readonly DxfRecord[]): DxfEntity[] {
  const entities: DxfEntity[] = []
  let inEntities = false
  /** The POLYLINE currently collecting VERTEX records, if any. */
  let openPolyline: { base: DxfEntityBase; closed: boolean; vertices: Vec2[] } | null = null

  const closePolyline = (): void => {
    if (!openPolyline) return
    if (openPolyline.vertices.length >= 2) {
      entities.push({
        type: 'POLYLINE',
        ...openPolyline.base,
        vertices: openPolyline.vertices,
        closed: openPolyline.closed,
      })
    }
    openPolyline = null
  }

  for (const record of records) {
    if (record.type === 'SECTION') {
      inEntities = firstValue(record, 2) === 'ENTITIES'
      continue
    }
    if (record.type === 'ENDSEC' || record.type === 'EOF') {
      closePolyline()
      inEntities = false
      continue
    }
    if (!inEntities) continue

    if (record.type === 'VERTEX') {
      if (openPolyline) {
        openPolyline.vertices.push({
          x: requireNumber(record, 10),
          y: requireNumber(record, 20),
        })
      }
      continue
    }
    if (record.type === 'SEQEND') {
      closePolyline()
      continue
    }

    // Any other keyword ends a POLYLINE that never got its SEQEND.
    closePolyline()
    const base: DxfEntityBase = {
      layer: firstValue(record, 8) ?? DEFAULT_LAYER,
      color: firstValue(record, 62) === undefined ? null : firstNumber(record, 62, 7),
    }

    switch (record.type) {
      case 'LINE':
        entities.push({
          type: 'LINE',
          ...base,
          start: { x: requireNumber(record, 10), y: requireNumber(record, 20) },
          end: { x: requireNumber(record, 11), y: requireNumber(record, 21) },
        })
        break
      case 'CIRCLE':
        entities.push({
          type: 'CIRCLE',
          ...base,
          center: { x: requireNumber(record, 10), y: requireNumber(record, 20) },
          radius: requireNumber(record, 40),
        })
        break
      case 'ARC':
        entities.push({
          type: 'ARC',
          ...base,
          center: { x: requireNumber(record, 10), y: requireNumber(record, 20) },
          radius: requireNumber(record, 40),
          startAngle: firstNumber(record, 50, 0),
          endAngle: firstNumber(record, 51, 360),
        })
        break
      case 'POINT':
        entities.push({
          type: 'POINT',
          ...base,
          position: { x: requireNumber(record, 10), y: requireNumber(record, 20) },
        })
        break
      case 'LWPOLYLINE': {
        const vertices = readLwVertices(record)
        if (vertices.length >= 2) {
          entities.push({
            type: 'POLYLINE',
            ...base,
            vertices,
            closed: (firstNumber(record, 70, 0) & 1) === 1,
          })
        }
        break
      }
      case 'POLYLINE':
        openPolyline = {
          base,
          closed: (firstNumber(record, 70, 0) & 1) === 1,
          vertices: [],
        }
        break
      default:
        break
    }
  }

  closePolyline()
  return entities
}

/** LWPOLYLINE keeps its vertices inline as interleaved 10/20 pairs. */
function readLwVertices(record: DxfRecord): Vec2[] {
  const vertices: Vec2[] = []
  let pendingX: number | null = null

  for (const pair of record.pairs) {
    if (pair.code === 10) {
      pendingX = Number(pair.value)
      continue
    }
    if (pair.code === 20 && pendingX !== null) {
      const y = Number(pair.value)
      if (Number.isFinite(pendingX) && Number.isFinite(y)) vertices.push({ x: pendingX, y })
      pendingX = null
    }
  }
  return vertices
}

export function importDxf(text: string, options: DxfImportOptions = {}): DxfImportResult {
  if (!/\bSECTION\b/.test(text)) throw new ImportError('File contains no DXF SECTION')

  const records = readRecords(tokenizeDxf(text))
  const header = readHeader(records)
  const units = INSUNITS[header.$INSUNITS ?? ''] ?? 'mm'
  const allEntities = readEntities(records)
  const wanted = options.layers ? new Set(options.layers) : null
  const entities = wanted ? allEntities.filter((entity) => wanted.has(entity.layer)) : allEntities

  const scale =
    (options.targetUnits ? unitScale(units, options.targetUnits) : 1) * (options.scale ?? 1)

  return {
    sketch: toSketch(entities, scale, options),
    entities,
    layers: readLayers(records),
    units,
    header,
  }
}

/** Turns parsed DXF entities into sketch geometry on a fresh sketch. */
function toSketch(
  entities: readonly DxfEntity[],
  scale: number,
  options: DxfImportOptions,
): SketchModel {
  const sketch = new SketchModel({
    name: options.name ?? 'Imported DXF',
    plane: options.plane ?? 'XY',
  })
  const at = (point: Vec2): Vec2 => ({ x: point.x * scale, y: point.y * scale })

  for (const entity of entities) {
    switch (entity.type) {
      case 'LINE':
        buildLine(sketch, at(entity.start), at(entity.end))
        break
      case 'CIRCLE':
        buildCircle(sketch, at(entity.center), entity.radius * scale)
        break
      case 'ARC': {
        const center = at(entity.center)
        const radius = entity.radius * scale
        const startAngle = (entity.startAngle * Math.PI) / 180
        const sweep = arcSweep(entity)
        buildCenterArc(
          sketch,
          center,
          {
            x: center.x + radius * Math.cos(startAngle),
            y: center.y + radius * Math.sin(startAngle),
          },
          sweep,
        )
        break
      }
      case 'POLYLINE':
        buildPolygon(sketch, entity.vertices.map(at), { closed: entity.closed })
        break
      case 'POINT':
        resolvePoint(sketch, at(entity.position))
        break
    }
  }
  return sketch
}

/** DXF arcs always sweep counter-clockwise; equal angles mean a full circle. */
function arcSweep(arc: DxfArc): number {
  const sweep = normalizeAngle(((arc.endAngle - arc.startAngle) * Math.PI) / 180)
  return sweep === 0 ? TAU : sweep
}
