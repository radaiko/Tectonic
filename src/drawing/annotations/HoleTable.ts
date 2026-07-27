import type { Vec3 } from '../../domain/vec3'
import type { Feature } from '../../features/domain/Feature'
import { FeatureType } from '../../features/domain/FeatureType'
import {
  readBoolean,
  readChoice,
  readNumber,
  readString,
  readStringArray,
  readVector3,
} from '../../features/domain/parameters'
import { HOLE_KINDS } from '../../features/domain/schema'
import type { FeatureTree } from '../../features/FeatureTree'
import { frameNormal, planeFrame, toWorld } from '../../features/geometry/plane'
import { isPoint } from '../../sketch/domain/SketchEntity'
import type { SketchModel } from '../../sketch/domain/SketchModel'

/**
 * The hole table: every hole in a part or assembly, tagged on the view and
 * listed with its position and specification.
 *
 * A hole table is what a drawing uses instead of dimensioning forty holes
 * individually. Each hole gets a tag — A1, A2, B1 — where the letter groups
 * holes that are the same and the number counts instances, so the table says
 * "these eight are the same ⌀6.6 clearance hole" in one line of reading.
 *
 * Holes are read from the feature tree rather than recovered from geometry.
 * A hole feature knows its diameter, its depth, whether it is countersunk and
 * what thread it carries; a mesh only knows there is a cylinder there. The
 * sketch the feature sits on gives the positions, exactly as the hole operation
 * itself reads them, so the table and the model can never disagree about where
 * a hole is.
 */

export const HOLE_TYPES = ['through', 'blind', 'countersink', 'counterbore'] as const

export type HoleType = (typeof HOLE_TYPES)[number]

/** One drilled hole: where it is and what it is. */
export interface HoleInstance {
  /** Unique within the table: the tag, which is also what is ballooned. */
  readonly tag: string
  /** The letter of the tag — holes sharing a letter share a specification. */
  readonly letter: string
  /** The number within the letter, counting from 1. */
  readonly index: number
  readonly featureId: string
  readonly featureName: string
  /** Centre of the hole on the face it enters, in model units. */
  readonly position: Vec3
  /** Drilling direction. */
  readonly axis: Vec3
  readonly diameter: number
  /** Null for a through hole. */
  readonly depth: number | null
  readonly type: HoleType
  readonly thread: string | null
  /** Counterbore or countersink diameter, when the hole has a head. */
  readonly headDiameter: number | null
  readonly headDepth: number | null
  /** Included angle of a countersink, in degrees. Null for anything else. */
  readonly angle: number | null
}

export interface DetectHolesOptions {
  /** Sketches by id, for reading hole positions. */
  readonly sketches?: ReadonlyMap<string, SketchModel>
  /** Included angle written for a countersink when the feature does not say. */
  readonly countersinkAngle?: number
  /** Only holes at or past the roll bar are listed when false. */
  readonly includeRolledBack?: boolean
}

/**
 * Every hole the tree drills, in tree order, tagged.
 *
 * Suppressed features are skipped — a suppressed hole is not in the part, so it
 * has no business being in the table. Holes whose sketch is missing are skipped
 * too rather than being listed at the origin.
 */
export function detectHoles(
  tree: FeatureTree,
  options: DetectHolesOptions = {},
): HoleInstance[] {
  const sketches = options.sketches ?? new Map<string, SketchModel>()
  const features = options.includeRolledBack === true ? [...tree.features] : tree.getActiveFeatures()

  const specs = new Map<string, string>()
  const counts = new Map<string, number>()
  const holes: HoleInstance[] = []

  for (const feature of features) {
    if (feature.featureType !== FeatureType.Hole) continue
    if (feature.status === 'suppressed') continue

    const sketch = feature.sketchId === null ? undefined : sketches.get(feature.sketchId)
    if (!sketch) continue

    const centers = holeCenters(sketch, readStringArray(feature.parameters, 'pointEntityIds'))
    if (centers.length === 0) continue

    const specification = describeHole(feature, options)
    const key = specificationKey(specification)
    // Holes with the same diameter, depth, type and thread share a letter,
    // however many features drilled them.
    let letter = specs.get(key)
    if (letter === undefined) {
      letter = tagLetter(specs.size)
      specs.set(key, letter)
    }

    for (const center of centers) {
      const index = (counts.get(letter) ?? 0) + 1
      counts.set(letter, index)
      holes.push({
        ...specification,
        tag: `${letter}${index}`,
        letter,
        index,
        featureId: feature.id,
        featureName: feature.name,
        position: center,
      })
    }
  }
  return holes
}

/** Everything about a hole except where it is. */
type HoleSpecification = Omit<
  HoleInstance,
  'tag' | 'letter' | 'index' | 'featureId' | 'featureName' | 'position'
>

function describeHole(feature: Feature, options: DetectHolesOptions): HoleSpecification {
  const parameters = feature.parameters
  const kind = readChoice(parameters, 'holeType', HOLE_KINDS, 'simple')
  const throughAll = readBoolean(parameters, 'throughAll', false)
  const thread = readString(parameters, 'threadSpec', '').trim()
  const headDiameter = readNumber(parameters, 'headDiameter', 0)
  const headDepth = readNumber(parameters, 'headDepth', 0)

  const type: HoleType =
    kind === 'countersink' ? 'countersink' : kind === 'counterbore' ? 'counterbore' : throughAll ? 'through' : 'blind'

  return {
    axis: readVector3(parameters, 'direction', { x: 0, y: 0, z: -1 }),
    diameter: readNumber(parameters, 'diameter', 6),
    depth: throughAll ? null : Math.abs(readNumber(parameters, 'depth', 10)),
    type,
    thread: thread === '' ? null : thread,
    headDiameter: kind === 'simple' ? null : headDiameter,
    headDepth: kind === 'simple' ? null : headDepth,
    angle: kind === 'countersink' ? (options.countersinkAngle ?? 82) : null,
  }
}

function specificationKey(specification: HoleSpecification): string {
  return [
    specification.diameter,
    specification.depth ?? 'through',
    specification.type,
    specification.thread ?? '',
    specification.headDiameter ?? '',
    specification.headDepth ?? '',
  ].join('|')
}

/** A, B, C … AA, AB. I, O and Q are skipped, as tags on a drawing always are. */
export function tagLetter(index: number): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  const position = Math.max(Math.floor(index), 0)
  if (position < letters.length) return letters[position] as string
  const remainder = position - letters.length
  const high = Math.floor(remainder / letters.length) % letters.length
  return `${letters[high] as string}${letters[remainder % letters.length] as string}`
}

/**
 * The sketch points a hole feature sits on, in world coordinates. Points owned
 * by another entity — a line's endpoint, a circle's centre — are skipped, since
 * they position that entity rather than mark a hole. This mirrors the hole
 * operation exactly.
 */
function holeCenters(sketch: SketchModel, entityIds: readonly string[]): Vec3[] {
  const frame = planeFrame(sketch.plane)

  if (entityIds.length > 0) {
    const points: Vec3[] = []
    for (const id of entityIds) {
      const entity = sketch.entities.get(id)
      if (!entity || !isPoint(entity)) continue
      points.push(toWorld(frame, { x: entity.x, y: entity.y }))
    }
    return points
  }

  const owned = new Set<string>()
  for (const entity of sketch.entities.values()) {
    if (isPoint(entity)) continue
    for (const id of entity.referencedIds) owned.add(id)
  }

  return [...sketch.entities.values()]
    .filter((entity) => isPoint(entity) && !owned.has(entity.id))
    .map((entity) => toWorld(frame, { x: (entity as { x: number }).x, y: (entity as { y: number }).y }))
}

/** The outward normal of a sketch plane — which way a hole's callout faces. */
export function sketchNormal(sketch: SketchModel): Vec3 {
  return frameNormal(planeFrame(sketch.plane))
}

/* ------------------------------------------------------------------- table */

export const HOLE_TABLE_COLUMNS = [
  'tag',
  'x',
  'y',
  'z',
  'size',
  'depth',
  'type',
  'thread',
  'angle',
] as const

export type HoleTableColumn = (typeof HOLE_TABLE_COLUMNS)[number]

export interface HoleColumnStyle {
  readonly column: HoleTableColumn
  readonly header: string
  /** Column width in sheet millimetres. */
  readonly width: number
  readonly align: 'left' | 'center' | 'right'
  /** Decimal places for numeric columns. */
  readonly precision?: number
}

export interface HoleTableStyle {
  readonly columns: readonly HoleColumnStyle[]
  /** Height of one body row, in sheet millimetres. */
  readonly rowHeight: number
  readonly headerHeight: number
  /** Text height in sheet millimetres. */
  readonly textSize: number
  readonly title: string
}

export const DEFAULT_HOLE_TABLE_STYLE: HoleTableStyle = {
  columns: [
    { column: 'tag', header: 'TAG', width: 14, align: 'center' },
    { column: 'x', header: 'X', width: 20, align: 'right', precision: 2 },
    { column: 'y', header: 'Y', width: 20, align: 'right', precision: 2 },
    { column: 'z', header: 'Z', width: 20, align: 'right', precision: 2 },
    { column: 'size', header: 'SIZE', width: 22, align: 'right', precision: 2 },
    { column: 'depth', header: 'DEPTH', width: 20, align: 'right', precision: 2 },
    { column: 'type', header: 'TYPE', width: 26, align: 'left' },
    { column: 'thread', header: 'THREAD', width: 24, align: 'left' },
  ],
  rowHeight: 6,
  headerHeight: 7,
  textSize: 2.5,
  title: 'HOLE TABLE',
}

export type HoleSortOrder = 'tag' | 'size' | 'position' | 'type'

/**
 * Holes in the requested order. Sorting is stable within a group and always
 * falls back to the tag, so two holes that tie never swap between rebuilds.
 */
export function sortHoles(
  holes: readonly HoleInstance[],
  order: HoleSortOrder = 'tag',
): HoleInstance[] {
  const sorted = [...holes]
  const byTag = (a: HoleInstance, b: HoleInstance): number =>
    a.letter === b.letter ? a.index - b.index : a.letter.localeCompare(b.letter)

  switch (order) {
    case 'tag':
      return sorted.sort(byTag)
    case 'size':
      return sorted.sort((a, b) => a.diameter - b.diameter || byTag(a, b))
    case 'type':
      return sorted.sort(
        (a, b) => HOLE_TYPES.indexOf(a.type) - HOLE_TYPES.indexOf(b.type) || byTag(a, b),
      )
    case 'position':
      // Reading order: up the sheet in bands, left to right within a band.
      return sorted.sort(
        (a, b) =>
          a.position.y - b.position.y ||
          a.position.x - b.position.x ||
          a.position.z - b.position.z ||
          byTag(a, b),
      )
  }
}

export interface HoleTableRow {
  readonly hole: HoleInstance
  /** One string per column of the style, ready to draw. */
  readonly cells: readonly string[]
}

export interface HoleTable {
  readonly id: string
  /** Lower-left corner of the table, in sheet millimetres. */
  readonly position: { readonly x: number; readonly y: number }
  /** The view whose holes this table lists, or null for the whole model. */
  readonly viewId: string | null
  readonly style: HoleTableStyle
  readonly order: HoleSortOrder
  readonly headers: readonly string[]
  readonly rows: readonly HoleTableRow[]
  readonly width: number
  readonly height: number
}

export interface BuildHoleTableOptions {
  readonly id?: string
  readonly position?: { readonly x: number; readonly y: number }
  readonly viewId?: string | null
  readonly style?: HoleTableStyle
  readonly order?: HoleSortOrder
  /** The origin positions are measured from. Defaults to the model origin. */
  readonly origin?: Vec3
}

/** The formatted table, laid out and ready for the renderer. */
export function buildHoleTable(
  holes: readonly HoleInstance[],
  options: BuildHoleTableOptions = {},
): HoleTable {
  const style = options.style ?? DEFAULT_HOLE_TABLE_STYLE
  const order = options.order ?? 'tag'
  const origin = options.origin ?? { x: 0, y: 0, z: 0 }
  const sorted = sortHoles(holes, order)

  const rows = sorted.map((hole) => ({
    hole,
    cells: style.columns.map((column) => holeCell(hole, column, origin)),
  }))

  return {
    id: options.id ?? 'hole-table',
    position: options.position ?? { x: 20, y: 20 },
    viewId: options.viewId ?? null,
    style,
    order,
    headers: style.columns.map((column) => column.header),
    rows,
    width: style.columns.reduce((total, column) => total + column.width, 0),
    height: style.headerHeight + rows.length * style.rowHeight,
  }
}

/** What one cell reads. Absent values are an em dash, never a blank. */
export function holeCell(hole: HoleInstance, column: HoleColumnStyle, origin: Vec3): string {
  const digits = column.precision ?? 2
  const number = (value: number | null): string => (value === null ? '—' : value.toFixed(digits))

  switch (column.column) {
    case 'tag':
      return hole.tag
    case 'x':
      return number(hole.position.x - origin.x)
    case 'y':
      return number(hole.position.y - origin.y)
    case 'z':
      return number(hole.position.z - origin.z)
    case 'size':
      return `⌀${hole.diameter.toFixed(digits)}`
    case 'depth':
      return hole.depth === null ? 'THRU' : number(hole.depth)
    case 'type':
      return describeType(hole)
    case 'thread':
      return hole.thread ?? '—'
    case 'angle':
      return number(hole.angle)
  }
}

function describeType(hole: HoleInstance): string {
  switch (hole.type) {
    case 'through':
      return 'THROUGH'
    case 'blind':
      return 'BLIND'
    case 'countersink':
      return hole.headDiameter === null
        ? 'C’SINK'
        : `C’SINK ⌀${hole.headDiameter.toFixed(1)}`
    case 'counterbore':
      return hole.headDiameter === null
        ? 'C’BORE'
        : `C’BORE ⌀${hole.headDiameter.toFixed(1)}`
  }
}

/**
 * Reads a table back off a drawing, or null when the entry is not one.
 *
 * A hole table is derived data — rebuilding it from the feature tree gives the
 * same thing — so the check is deliberately shallow: enough to know a renderer
 * can draw it, and no more. A stale table redraws wrong for one open rather
 * than failing the file.
 */
export function holeTableFromJSON(value: unknown): HoleTable | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>

  if (typeof candidate.id !== 'string') return null
  if (!Array.isArray(candidate.rows) || !Array.isArray(candidate.headers)) return null
  if (typeof candidate.style !== 'object' || candidate.style === null) return null
  if (candidate.viewId !== null && typeof candidate.viewId !== 'string') return null

  const position = candidate.position as Record<string, unknown> | undefined
  if (
    typeof position !== 'object' ||
    position === null ||
    typeof position.x !== 'number' ||
    typeof position.y !== 'number'
  ) {
    return null
  }
  return candidate as unknown as HoleTable
}

/** The table as a grid of strings, header row first — what a renderer draws. */
export function holeTableGrid(table: HoleTable): string[][] {
  return [[...table.headers], ...table.rows.map((row) => [...row.cells])]
}

/**
 * Where each cell sits on the sheet, in millimetres, with the origin at the
 * table's lower-left corner. Rows are laid out downwards from the header, which
 * is how a table on a drawing reads.
 */
export function holeTableCellRect(
  table: HoleTable,
  row: number,
  column: number,
): { x: number; y: number; width: number; height: number } | null {
  const style = table.style.columns[column]
  if (!style) return null
  if (row < -1 || row >= table.rows.length) return null

  let x = table.position.x
  for (let index = 0; index < column; index += 1) {
    x += table.style.columns[index]?.width ?? 0
  }
  // Row −1 is the header; body rows run down from underneath it.
  const top = table.position.y + table.height
  const y =
    row === -1
      ? top - table.style.headerHeight
      : top - table.style.headerHeight - (row + 1) * table.style.rowHeight

  return {
    x,
    y,
    width: style.width,
    height: row === -1 ? table.style.headerHeight : table.style.rowHeight,
  }
}
