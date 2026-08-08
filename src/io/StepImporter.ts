import type { LengthUnit } from '../domain/Document'
import type { MeshPoint } from '../domain/MeshData'
import type { SketchPlane } from '../sketch/domain/SketchModel'
import { SketchModel } from '../sketch/domain/SketchModel'
import type { Vec2 } from '../sketch/domain/geometry'
import { TAU, normalizeAngle } from '../sketch/domain/geometry'
import { buildCenterArc, buildCircle, buildLine } from '../sketch/domain/builders'
import { ImportError, unitScale } from './types'

/**
 * STEP (ISO 10303-21) reading, as far as it goes without a B-Rep kernel.
 *
 * The exchange structure — the header, the instance list, the parameter grammar
 * — is parsed in full. Of the geometry, the entities that describe curves are
 * turned into sketch geometry: an EDGE_CURVE over a LINE becomes a sketch line,
 * one over a CIRCLE becomes an arc, and a CIRCLE nothing bounds becomes a full
 * circle. Faces, shells and solids are recorded as unsupported rather than
 * guessed at; rebuilding those needs the OpenCascade kernel behind `IKernel`.
 */

export type StepSchema = 'AP203' | 'AP214' | 'AP242' | 'unknown'

export type StepValue =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'ref'; readonly id: number }
  | { readonly kind: 'enum'; readonly value: string }
  | { readonly kind: 'list'; readonly items: readonly StepValue[] }
  /** `$` — an omitted optional attribute. */
  | { readonly kind: 'null' }
  /** `*` — a value derived by a subtype. */
  | { readonly kind: 'derived' }
  /** A typed parameter such as `LENGTH_MEASURE(1.)`. */
  | { readonly kind: 'typed'; readonly type: string; readonly items: readonly StepValue[] }

/** One `TYPE(...)` application: an instance body, or a piece of one. */
export interface StepCall {
  readonly type: string
  readonly params: readonly StepValue[]
}

export interface StepEntity extends StepCall {
  readonly id: number
  /**
   * Every call the instance is made of. A complex instance —
   * `#7=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));` — has one per
   * supertype; a plain instance has exactly one, the same as `type`/`params`.
   */
  readonly parts: readonly StepCall[]
}

export interface StepHeader {
  readonly description: readonly string[]
  readonly implementationLevel: string
  readonly name: string
  readonly timestamp: string
  readonly authors: readonly string[]
  readonly organizations: readonly string[]
  readonly preprocessor: string
  readonly originatingSystem: string
  readonly authorization: string
  readonly schemas: readonly string[]
}

export type StepCurve =
  | { readonly kind: 'line'; readonly start: MeshPoint; readonly end: MeshPoint }
  | {
      readonly kind: 'arc'
      readonly center: MeshPoint
      readonly radius: number
      readonly start: MeshPoint
      readonly end: MeshPoint
      readonly axis: MeshPoint
    }
  | {
      readonly kind: 'circle'
      readonly center: MeshPoint
      readonly radius: number
      readonly axis: MeshPoint
    }

export interface StepImportOptions {
  readonly name?: string
  /** Force the plane the 3D curves are flattened onto. Detected by default. */
  readonly plane?: SketchPlane
  /** Rescale from the file's declared units into these. */
  readonly targetUnits?: LengthUnit
  /** Extra uniform scale, applied after the unit conversion. */
  readonly scale?: number
}

export interface StepImportResult {
  readonly header: StepHeader
  readonly schema: StepSchema
  readonly entities: ReadonlyMap<number, StepEntity>
  /** The curve geometry that could be recovered, in model space. */
  readonly curves: readonly StepCurve[]
  readonly sketch: SketchModel
  /** The plane the curves were flattened onto. */
  readonly plane: SketchPlane
  /** Units the file declared, or `mm` when it declared none. */
  readonly units: LengthUnit
  /** Entity types present in the file that this importer does not translate. */
  readonly unsupported: readonly string[]
}

/** How close to constant a coordinate has to be for the curves to be planar. */
const PLANAR_TOLERANCE = 1e-6

/* ------------------------------------------------------------------ parsing */

/** Splits the file into statements, honouring strings and comments. */
export function splitStatements(text: string): string[] {
  const statements: string[] = []
  let current = ''
  let index = 0

  while (index < text.length) {
    const character = text[index] as string

    if (character === "'") {
      // A quote inside a STEP string is written twice; consume both.
      current += character
      index += 1
      while (index < text.length) {
        const inner = text[index] as string
        current += inner
        index += 1
        if (inner !== "'") continue
        if (text[index] === "'") {
          current += "'"
          index += 1
          continue
        }
        break
      }
      continue
    }

    if (character === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2)
      index = end === -1 ? text.length : end + 2
      continue
    }

    if (character === ';') {
      const trimmed = current.trim()
      if (trimmed !== '') statements.push(trimmed)
      current = ''
      index += 1
      continue
    }

    current += character
    index += 1
  }

  const tail = current.trim()
  if (tail !== '') statements.push(tail)
  return statements
}

/** Recursive-descent reader for the parameter grammar. */
class ValueReader {
  readonly #text: string
  #index = 0

  constructor(text: string) {
    this.#text = text
  }

  /** Parses `TYPE(...)` and returns its name and arguments. */
  readCall(): StepCall | null {
    this.#skipSpace()
    const name = this.#readName()
    if (name === null) return null
    this.#skipSpace()
    if (this.#text[this.#index] !== '(') return null
    this.#index += 1
    return { type: name.toUpperCase(), params: this.#readListBody() }
  }

  /**
   * The calls an instance body is made of: one for a plain instance, several
   * for a complex one wrapped in an extra pair of parentheses.
   */
  readInstance(): StepCall[] {
    this.#skipSpace()
    if (this.#text[this.#index] !== '(') {
      const single = this.readCall()
      return single ? [single] : []
    }

    this.#index += 1
    const calls: StepCall[] = []
    for (;;) {
      this.#skipSpace()
      const character = this.#text[this.#index]
      if (character === undefined || character === ')') return calls
      const call = this.readCall()
      if (!call) return calls
      calls.push(call)
    }
  }

  /** Values up to the matching `)`, which is consumed. */
  #readListBody(): StepValue[] {
    const items: StepValue[] = []
    for (;;) {
      this.#skipSpace()
      const character = this.#text[this.#index]
      if (character === undefined || character === ')') {
        this.#index += 1
        return items
      }
      if (character === ',') {
        this.#index += 1
        continue
      }
      items.push(this.#readValue())
    }
  }

  #readValue(): StepValue {
    this.#skipSpace()
    const character = this.#text[this.#index]

    if (character === '(') {
      this.#index += 1
      return { kind: 'list', items: this.#readListBody() }
    }
    if (character === "'") return { kind: 'string', value: this.#readString() }
    if (character === '#') {
      this.#index += 1
      return { kind: 'ref', id: this.#readInteger() }
    }
    if (character === '$') {
      this.#index += 1
      return { kind: 'null' }
    }
    if (character === '*') {
      this.#index += 1
      return { kind: 'derived' }
    }
    if (character === '.') {
      this.#index += 1
      const start = this.#index
      while (this.#index < this.#text.length && this.#text[this.#index] !== '.') this.#index += 1
      const value = this.#text.slice(start, this.#index)
      this.#index += 1
      return { kind: 'enum', value }
    }

    const name = this.#readName()
    if (name !== null) {
      this.#skipSpace()
      if (this.#text[this.#index] === '(') {
        this.#index += 1
        return { kind: 'typed', type: name.toUpperCase(), items: this.#readListBody() }
      }
      return { kind: 'string', value: name }
    }
    return { kind: 'number', value: this.#readNumber() }
  }

  #readName(): string | null {
    const match = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(this.#text.slice(this.#index))
    if (!match) return null
    this.#index += match[0].length
    return match[0]
  }

  #readNumber(): number {
    const match = /^[+-]?(\d+\.?\d*|\.\d+)([Ee][+-]?\d+)?/.exec(this.#text.slice(this.#index))
    if (!match) {
      // Nothing recognisable here; step over it so the reader cannot loop.
      this.#index += 1
      return 0
    }
    this.#index += match[0].length
    return Number(match[0])
  }

  #readInteger(): number {
    const match = /^\d+/.exec(this.#text.slice(this.#index))
    if (!match) return -1
    this.#index += match[0].length
    return Number(match[0])
  }

  #readString(): string {
    this.#index += 1
    let out = ''
    while (this.#index < this.#text.length) {
      const character = this.#text[this.#index] as string
      this.#index += 1
      if (character !== "'") {
        out += character
        continue
      }
      if (this.#text[this.#index] === "'") {
        out += "'"
        this.#index += 1
        continue
      }
      break
    }
    return decodeStepString(out)
  }

  #skipSpace(): void {
    while (this.#index < this.#text.length && /\s/.test(this.#text[this.#index] as string)) {
      this.#index += 1
    }
  }
}

/** Undoes the `\X2\..\X0\` and `\X\..` escapes STEP uses for non-ASCII text. */
export function decodeStepString(text: string): string {
  return text
    .replace(/\\X2\\([0-9A-Fa-f]+)\\X0\\/g, (_match, hex: string) =>
      (hex.match(/.{1,4}/g) ?? [])
        .map((unit) => String.fromCharCode(Number.parseInt(unit, 16)))
        .join(''),
    )
    .replace(/\\X\\([0-9A-Fa-f]{2})/g, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
}

/** Every `#id = TYPE(...)` instance in the DATA section. */
export function parseEntities(statements: readonly string[]): Map<number, StepEntity> {
  const entities = new Map<number, StepEntity>()
  let inData = false

  for (const statement of statements) {
    const keyword = statement.toUpperCase()
    if (keyword === 'DATA' || keyword.startsWith('DATA(')) {
      inData = true
      continue
    }
    if (keyword === 'ENDSEC') {
      inData = false
      continue
    }
    if (!inData) continue

    const match = /^#(\d+)\s*=\s*([\s\S]*)$/.exec(statement)
    if (!match) continue
    const parts = new ValueReader(match[2] as string).readInstance()
    const first = parts[0]
    if (!first) continue
    entities.set(Number(match[1]), {
      id: Number(match[1]),
      type: first.type,
      params: first.params,
      parts,
    })
  }
  return entities
}

/** The HEADER section's three standard entities, with sane fallbacks. */
export function parseHeader(statements: readonly string[]): StepHeader {
  let inHeader = false
  const calls = new Map<string, readonly StepValue[]>()

  for (const statement of statements) {
    const keyword = statement.toUpperCase()
    if (keyword === 'HEADER') {
      inHeader = true
      continue
    }
    if (keyword === 'ENDSEC') {
      if (inHeader) break
      continue
    }
    if (!inHeader) continue

    const call = new ValueReader(statement).readCall()
    if (call) calls.set(call.type, call.params)
  }

  const description = calls.get('FILE_DESCRIPTION') ?? []
  const name = calls.get('FILE_NAME') ?? []
  const schema = calls.get('FILE_SCHEMA') ?? []

  return {
    description: stringList(description[0]),
    implementationLevel: asString(description[1]),
    name: asString(name[0]),
    timestamp: asString(name[1]),
    authors: stringList(name[2]),
    organizations: stringList(name[3]),
    preprocessor: asString(name[4]),
    originatingSystem: asString(name[5]),
    authorization: asString(name[6]),
    schemas: stringList(schema[0]),
  }
}

export function detectSchema(schemas: readonly string[]): StepSchema {
  const joined = schemas.join(' ').toUpperCase()
  if (joined.includes('AP242')) return 'AP242'
  if (joined.includes('AUTOMOTIVE_DESIGN') || joined.includes('AP214')) return 'AP214'
  if (joined.includes('CONFIG_CONTROL_DESIGN') || joined.includes('AP203')) return 'AP203'
  return 'unknown'
}

/* ---------------------------------------------------------------- geometry */

function asString(value: StepValue | undefined): string {
  return value?.kind === 'string' ? value.value : ''
}

function asNumber(value: StepValue | undefined): number {
  if (value?.kind === 'number') return value.value
  // A measure such as `POSITIVE_LENGTH_MEASURE(5.)` wraps the number it means.
  if (value?.kind === 'typed') return asNumber(value.items[0])
  return 0
}

function stringList(value: StepValue | undefined): string[] {
  if (value?.kind === 'string') return [value.value]
  if (value?.kind !== 'list') return []
  return value.items.filter((item) => item.kind === 'string').map((item) => asString(item))
}

function asRef(value: StepValue | undefined): number | null {
  return value?.kind === 'ref' ? value.id : null
}

/** The three coordinates of a CARTESIAN_POINT or DIRECTION parameter list. */
function asTriple(value: StepValue | undefined): MeshPoint | null {
  if (value?.kind !== 'list') return null
  const [x, y, z] = value.items
  if (x === undefined || y === undefined) return null
  return { x: asNumber(x), y: asNumber(y), z: z === undefined ? 0 : asNumber(z) }
}

/** Entity types that carry no curve for us but are legitimately present. */
const IGNORED_TYPES = new Set([
  'CARTESIAN_POINT',
  'DIRECTION',
  'VECTOR',
  'VERTEX_POINT',
  'AXIS2_PLACEMENT_2D',
  'AXIS2_PLACEMENT_3D',
  'LINE',
  'CIRCLE',
  'EDGE_CURVE',
  'ORIENTED_EDGE',
  'EDGE_LOOP',
  'APPLICATION_CONTEXT',
  'APPLICATION_PROTOCOL_DEFINITION',
  'PRODUCT',
  'PRODUCT_DEFINITION',
  'PRODUCT_DEFINITION_FORMATION',
  'PRODUCT_DEFINITION_SHAPE',
  'PRODUCT_DEFINITION_CONTEXT',
  'PRODUCT_CONTEXT',
  'PRODUCT_RELATED_PRODUCT_CATEGORY',
  'SHAPE_DEFINITION_REPRESENTATION',
  'SHAPE_REPRESENTATION',
  'GEOMETRIC_CURVE_SET',
  'GEOMETRIC_REPRESENTATION_CONTEXT',
  'GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT',
  'GLOBAL_UNIT_ASSIGNED_CONTEXT',
  'UNCERTAINTY_MEASURE_WITH_UNIT',
  'DIMENSIONAL_EXPONENTS',
  'SI_UNIT',
  'CONVERSION_BASED_UNIT',
  'LENGTH_MEASURE_WITH_UNIT',
  'PLANE_ANGLE_MEASURE_WITH_UNIT',
  'NAMED_UNIT',
  'LENGTH_UNIT',
  'PLANE_ANGLE_UNIT',
  'SOLID_ANGLE_UNIT',
  'MASS_UNIT',
])

/** Pulls every curve we can make sense of out of the instance map. */
export function readCurves(entities: ReadonlyMap<number, StepEntity>): {
  curves: StepCurve[]
  unsupported: string[]
} {
  const point = (id: number | null): MeshPoint | null => {
    if (id === null) return null
    const entity = entities.get(id)
    if (!entity) return null
    if (entity.type === 'CARTESIAN_POINT' || entity.type === 'DIRECTION') {
      return asTriple(entity.params[1])
    }
    // A VERTEX_POINT holds the geometry it sits on.
    if (entity.type === 'VERTEX_POINT') return point(asRef(entity.params[1]))
    return null
  }

  /** AXIS2_PLACEMENT_3D('', #location, #axis, #ref_direction). */
  const placementLocation = (id: number | null): MeshPoint | null => {
    const entity = id === null ? undefined : entities.get(id)
    return entity ? point(asRef(entity.params[1])) : null
  }

  const placementAxis = (id: number | null): MeshPoint => {
    const entity = id === null ? undefined : entities.get(id)
    const axis = entity ? point(asRef(entity.params[2])) : null
    return axis ?? { x: 0, y: 0, z: 1 }
  }

  const curves: StepCurve[] = []
  const boundedCircles = new Set<number>()
  const unsupported = new Set<string>()

  for (const entity of entities.values()) {
    if (entity.type !== 'EDGE_CURVE') continue
    const start = point(asRef(entity.params[1]))
    const end = point(asRef(entity.params[2]))
    const curveId = asRef(entity.params[3])
    const curve = curveId === null ? undefined : entities.get(curveId)
    if (!start || !end || !curve) continue

    if (curve.type === 'LINE') {
      curves.push({ kind: 'line', start, end })
      continue
    }
    if (curve.type === 'CIRCLE') {
      boundedCircles.add(curve.id)
      const placement = asRef(curve.params[1])
      const center = placementLocation(placement)
      if (!center) continue
      curves.push({
        kind: 'arc',
        center,
        radius: asNumber(curve.params[2]),
        start,
        end,
        axis: placementAxis(placement),
      })
      continue
    }
    unsupported.add(curve.type)
  }

  // A circle nothing bounds is a full circle in its own right.
  for (const entity of entities.values()) {
    if (entity.type !== 'CIRCLE' || boundedCircles.has(entity.id)) continue
    const placement = asRef(entity.params[1])
    const center = placementLocation(placement)
    if (!center) continue
    curves.push({
      kind: 'circle',
      center,
      radius: asNumber(entity.params[2]),
      axis: placementAxis(placement),
    })
  }

  for (const entity of entities.values()) {
    // A complex instance counts as understood when every supertype it is built
    // from is one we deliberately pass over.
    if (entity.parts.every((part) => IGNORED_TYPES.has(part.type))) continue
    unsupported.add(entity.type)
  }
  return { curves, unsupported: [...unsupported].sort() }
}

/**
 * The unit the file assigns to lengths. Both spellings are checked: a
 * CONVERSION_BASED_UNIT names an imperial unit outright, while metric files
 * carry an SI_UNIT — usually inside a complex instance, hence the walk over
 * every part of every entity.
 */
export function detectUnits(entities: ReadonlyMap<number, StepEntity>): LengthUnit {
  const calls = [...entities.values()].flatMap((entity) => entity.parts)

  for (const call of calls) {
    if (call.type !== 'CONVERSION_BASED_UNIT') continue
    const name = asString(call.params[0]).toUpperCase()
    if (name.includes('INCH')) return 'in'
    if (name.includes('FOOT') || name.includes('FEET')) return 'ft'
  }

  for (const call of calls) {
    if (call.type !== 'SI_UNIT') continue
    const [prefix, unitName] = call.params
    if (unitName?.kind !== 'enum' || unitName.value.toUpperCase() !== 'METRE') continue
    if (prefix?.kind !== 'enum') return 'm'
    switch (prefix.value.toUpperCase()) {
      case 'MILLI':
        return 'mm'
      case 'CENTI':
        return 'cm'
      default:
        return 'm'
    }
  }
  return 'mm'
}

/** The plane the curves lie in, or `XY` when they are not planar. */
export function detectPlane(curves: readonly StepCurve[]): SketchPlane {
  const points: MeshPoint[] = []
  for (const curve of curves) {
    if (curve.kind === 'line') points.push(curve.start, curve.end)
    else if (curve.kind === 'arc') points.push(curve.center, curve.start, curve.end)
    else points.push(curve.center)
  }
  if (points.length === 0) return 'XY'

  const spread = (pick: (point: MeshPoint) => number): number => {
    const values = points.map(pick)
    return Math.max(...values) - Math.min(...values)
  }
  if (spread((point) => point.z) <= PLANAR_TOLERANCE) return 'XY'
  if (spread((point) => point.y) <= PLANAR_TOLERANCE) return 'XZ'
  if (spread((point) => point.x) <= PLANAR_TOLERANCE) return 'YZ'
  return 'XY'
}

/** Drops a model-space point onto the sketch plane's two axes. */
export function flatten(point: MeshPoint, plane: SketchPlane): Vec2 {
  switch (plane) {
    case 'XZ':
      return { x: point.x, y: point.z }
    case 'YZ':
      return { x: point.y, y: point.z }
    default:
      return { x: point.x, y: point.y }
  }
}

/**
 * Sign of the plane's own normal against a 3D axis. An arc whose axis opposes
 * the plane normal turns the other way once flattened.
 */
function axisSign(axis: MeshPoint, plane: SketchPlane): number {
  // X×Z is -Y, so the XZ plane's counter-clockwise normal points along -Y.
  const along = plane === 'XZ' ? -axis.y : plane === 'YZ' ? axis.x : axis.z
  return along < 0 ? -1 : 1
}

/** Builds sketch geometry from the recovered curves. */
export function curvesToSketch(
  curves: readonly StepCurve[],
  plane: SketchPlane,
  options: { name?: string; scale?: number } = {},
): SketchModel {
  const scale = options.scale ?? 1
  const sketch = new SketchModel({ name: options.name ?? 'Imported STEP', plane })
  const at = (point: MeshPoint): Vec2 => {
    const flat = flatten(point, plane)
    return { x: flat.x * scale, y: flat.y * scale }
  }

  for (const curve of curves) {
    switch (curve.kind) {
      case 'line': {
        const start = at(curve.start)
        const end = at(curve.end)
        if (start.x === end.x && start.y === end.y) continue
        buildLine(sketch, start, end)
        break
      }
      case 'circle':
        buildCircle(sketch, at(curve.center), curve.radius * scale)
        break
      case 'arc': {
        const center = at(curve.center)
        const start = at(curve.start)
        const end = at(curve.end)
        const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
        const endAngle = Math.atan2(end.y - center.y, end.x - center.x)
        const sign = axisSign(curve.axis, plane)
        const magnitude = normalizeAngle(sign > 0 ? endAngle - startAngle : startAngle - endAngle)
        // Coincident ends mean the edge wraps the whole circle.
        const sweep = magnitude <= PLANAR_TOLERANCE ? TAU : magnitude
        buildCenterArc(sketch, center, start, sign * sweep)
        break
      }
    }
  }
  return sketch
}

export function importStep(text: string, options: StepImportOptions = {}): StepImportResult {
  if (!/ISO-10303-21/i.test(text)) {
    throw new ImportError('File does not start with the ISO-10303-21 marker')
  }

  const statements = splitStatements(text)
  const header = parseHeader(statements)
  const entities = parseEntities(statements)
  if (entities.size === 0) throw new ImportError('STEP file has no DATA section entities')

  const { curves, unsupported } = readCurves(entities)
  const units = detectUnits(entities)
  const plane = options.plane ?? detectPlane(curves)
  const scale =
    (options.targetUnits ? unitScale(units, options.targetUnits) : 1) * (options.scale ?? 1)

  return {
    header,
    schema: detectSchema(header.schemas),
    entities,
    curves,
    sketch: curvesToSketch(curves, plane, {
      ...(options.name === undefined ? {} : { name: options.name }),
      scale,
    }),
    plane,
    units,
    unsupported,
  }
}
