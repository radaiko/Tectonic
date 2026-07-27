import type { LengthUnit } from '../../domain/Document'
import type { MeshData } from '../../domain/MeshData'
import { millimetresPerUnit } from '../../domain/units'
import type { Vec2 } from '../../sketch/domain/geometry'
import type { DrawingView, ProjectionAngle, ViewOrientation } from '../domain/DrawingView'
import { createView } from '../domain/DrawingView'
import { chooseScale } from '../domain/scale'
import type { SheetSpec } from '../domain/sheet'
import { sheetFrame } from '../domain/sheet'
import { DEFAULT_TITLE_BLOCK_HEIGHT } from '../domain/TitleBlock'
import type { Bounds2 } from './geometry2d'
import { boundsCenter, boundsHeight, boundsWidth } from './geometry2d'
import type { ViewGeometry, ViewGeometryOptions } from './ViewGenerator'
import { generateViewGeometry } from './ViewGenerator'
import { frameFor } from './viewAxes'

/**
 * Where the views go, and how big they are drawn.
 *
 * Views land on a three-by-three grid with the front view in the middle. Which
 * cell a view takes is the projection convention and nothing else: in third
 * angle the top view goes above the front and the right view to the right; in
 * first angle both swap over, which is the whole difference between ANSI and
 * ISO drawings.
 *
 * Scale is solved rather than searched. The gaps between views are fixed in
 * millimetres and so do not move when the scale does, which makes the fit a
 * single division per axis; the answer is then rounded down to the nearest
 * standard ratio so the sheet says 1:2 and not 1:1.87.
 */

export const DEFAULT_THREE_VIEW: readonly ViewOrientation[] = ['front', 'top', 'right']

export const DEFAULT_VIEW_GAP = 20

export interface AutoLayoutOptions extends ViewGeometryOptions {
  readonly sheet: SheetSpec
  /** Unit the mesh coordinates are in. */
  readonly units?: LengthUnit
  readonly projectionAngle?: ProjectionAngle
  /** Which views to lay out. Defaults to front, top and right. */
  readonly orientations?: readonly ViewOrientation[]
  /** Fixes the scale instead of fitting one. */
  readonly scale?: number
  /** Millimetres between neighbouring views. */
  readonly gap?: number
  /** Millimetres along the bottom of the frame kept clear for the title block. */
  readonly reservedBottom?: number
  /** Millimetres along the right of the frame kept clear. */
  readonly reservedRight?: number
}

export interface ViewPlacement {
  readonly orientation: ViewOrientation
  /** Centre of the view's geometry, in sheet millimetres. */
  readonly position: Vec2
  /** The projection's extent, in model units. */
  readonly bounds: Bounds2
  readonly geometry: ViewGeometry
  readonly column: number
  readonly row: number
}

export interface AutoLayoutResult {
  readonly scale: number
  readonly placements: readonly ViewPlacement[]
  /** The area the views were fitted into, in sheet millimetres. */
  readonly area: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
}

/** Grid cell each orientation takes, with the front view at (1, 1). */
function cellFor(orientation: ViewOrientation, angle: ProjectionAngle): { column: number; row: number } {
  const third = angle === 'third'
  switch (orientation) {
    case 'front':
      return { column: 1, row: 1 }
    case 'top':
      return { column: 1, row: third ? 2 : 0 }
    case 'bottom':
      return { column: 1, row: third ? 0 : 2 }
    case 'right':
      return { column: third ? 2 : 0, row: 1 }
    case 'left':
      return { column: third ? 0 : 2, row: 1 }
    case 'back':
      return { column: third ? 0 : 2, row: 1 }
    default:
      // The pictorial views take the corner diagonally opposite the top view.
      return { column: 2, row: third ? 2 : 0 }
  }
}

export function autoLayout(mesh: MeshData, options: AutoLayoutOptions): AutoLayoutResult {
  const angle = options.projectionAngle ?? 'third'
  const units = options.units ?? 'mm'
  const gap = options.gap ?? DEFAULT_VIEW_GAP
  const perUnit = millimetresPerUnit(units)
  const requested = options.orientations ?? DEFAULT_THREE_VIEW

  const frame = sheetFrame(options.sheet)
  const reservedBottom = options.reservedBottom ?? DEFAULT_TITLE_BLOCK_HEIGHT + 6
  const reservedRight = options.reservedRight ?? 0
  const area = {
    x: frame.x,
    y: frame.y + reservedBottom,
    width: Math.max(frame.width - reservedRight, 1),
    height: Math.max(frame.height - reservedBottom, 1),
  }

  // Project everything once; the grid is sized from what came back.
  const taken = new Set<string>()
  const projected = requested.map((orientation) => {
    const geometry = generateViewGeometry(mesh, frameFor(orientation), options)
    const cell = freeCell(cellFor(orientation, angle), taken)
    taken.add(`${cell.column}:${cell.row}`)
    return { orientation, geometry, cell }
  })

  const columnWidths = [0, 0, 0]
  const rowHeights = [0, 0, 0]
  for (const entry of projected) {
    const width = boundsWidth(entry.geometry.bounds)
    const height = boundsHeight(entry.geometry.bounds)
    columnWidths[entry.cell.column] = Math.max(columnWidths[entry.cell.column] as number, width)
    rowHeights[entry.cell.row] = Math.max(rowHeights[entry.cell.row] as number, height)
  }

  const usedColumns = columnWidths.filter((width) => width > 0).length
  const usedRows = rowHeights.filter((height) => height > 0).length
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0)
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0)
  const gapsX = Math.max(usedColumns - 1, 0) * gap
  const gapsY = Math.max(usedRows - 1, 0) * gap

  const scale = options.scale ?? fitScale(
    { width: area.width - gapsX, height: area.height - gapsY },
    { width: totalWidth * perUnit, height: totalHeight * perUnit },
  )
  const perModelUnit = scale * perUnit

  // Lay the grid out in sheet millimetres, then centre it in the free area.
  const columnSpans = columnWidths.map((width) => width * perModelUnit)
  const rowSpans = rowHeights.map((height) => height * perModelUnit)
  const laidWidth = columnSpans.reduce((sum, span) => sum + span, 0) + gapsX
  const laidHeight = rowSpans.reduce((sum, span) => sum + span, 0) + gapsY

  const originX = area.x + Math.max((area.width - laidWidth) / 2, 0)
  const originY = area.y + Math.max((area.height - laidHeight) / 2, 0)

  const columnCentres = cellCentres(columnSpans, originX, gap)
  const rowCentres = cellCentres(rowSpans, originY, gap)

  const placements = projected.map((entry) => ({
    orientation: entry.orientation,
    position: {
      x: columnCentres[entry.cell.column] as number,
      y: rowCentres[entry.cell.row] as number,
    },
    bounds: entry.geometry.bounds,
    geometry: entry.geometry,
    column: entry.cell.column,
    row: entry.cell.row,
  }))

  return { scale, placements, area }
}

/**
 * The layout as views ready to drop on a drawing. The front view — or whatever
 * landed in the middle — parents the rest, so dragging it takes the projected
 * views with it.
 */
export function createLayoutViews(
  mesh: MeshData,
  options: AutoLayoutOptions & { readonly sourcePartId?: string },
): { readonly scale: number; readonly views: DrawingView[] } {
  const layout = autoLayout(mesh, options)
  const sourcePartId = options.sourcePartId ?? ''

  // Whatever landed in the middle cell is the parent; failing that, the first
  // view laid out, so a two-view drawing still has something to hang off.
  const primary =
    layout.placements.find((placement) => placement.column === 1 && placement.row === 1) ??
    layout.placements[0]
  const views: DrawingView[] = []
  let primaryId: string | null = null

  for (const placement of layout.placements) {
    const isPrimary = placement === primary
    const view = createView({
      type: orthographicOrPictorial(placement.orientation),
      orientation: placement.orientation,
      position: placement.position,
      sourcePartId,
      parentViewId: isPrimary ? null : primaryId,
      alignedToParent: !isPrimary,
    })
    if (isPrimary) primaryId = view.id
    views.push(view)
  }

  // The primary may not have been first out of the layout, so anything placed
  // before it still needs its parent filled in.
  return {
    scale: layout.scale,
    views: views.map((view) =>
      view.id === primaryId || view.parentViewId !== null
        ? view
        : { ...view, parentViewId: primaryId, alignedToParent: true },
    ),
  }
}

function orthographicOrPictorial(orientation: ViewOrientation): 'orthographic' | 'isometric' {
  return orientation === 'isometric' || orientation === 'dimetric' || orientation === 'trimetric'
    ? 'isometric'
    : 'orthographic'
}

/** The largest standard ratio at which the arrangement still fits the area. */
export function fitScale(
  area: { readonly width: number; readonly height: number },
  content: { readonly width: number; readonly height: number },
): number {
  const horizontal = content.width > 0 ? area.width / content.width : Infinity
  const vertical = content.height > 0 ? area.height / content.height : Infinity
  const fit = Math.min(horizontal, vertical)
  return Number.isFinite(fit) && fit > 0 ? chooseScale(fit) : 1
}

/** Centre of each grid cell along one axis, skipping the empty ones. */
function cellCentres(spans: readonly number[], origin: number, gap: number): number[] {
  const centres: number[] = []
  let cursor = origin
  for (const span of spans) {
    if (span <= 0) {
      // An empty row or column occupies no space and no gap.
      centres.push(cursor)
      continue
    }
    centres.push(cursor + span / 2)
    cursor += span + gap
  }
  return centres
}

/** The requested cell, or the nearest free one when two views collide. */
function freeCell(
  preferred: { column: number; row: number },
  taken: ReadonlySet<string>,
): { column: number; row: number } {
  if (!taken.has(`${preferred.column}:${preferred.row}`)) return preferred
  for (let row = 2; row >= 0; row -= 1) {
    for (let column = 0; column < 3; column += 1) {
      if (!taken.has(`${column}:${row}`)) return { column, row }
    }
  }
  return preferred
}

/** Centre of a projection, for callers positioning geometry under a view. */
export function geometryCentre(bounds: Bounds2): Vec2 {
  return boundsCenter(bounds)
}
