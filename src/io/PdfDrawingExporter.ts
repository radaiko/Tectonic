import type { LengthUnit } from '../domain/Document'
import type { MeshData } from '../domain/MeshData'
import type { DrawingBounds, DrawingSegment, ViewAxes, ViewName } from './orthoViews'
import { ORTHO_VIEWS, segmentBounds, viewSegments } from './orthoViews'
import { MILLIMETRES_PER_UNIT, num } from './types'
import { PdfContent, PdfWriter, infoDictionary } from './pdf'

/**
 * A 2D drawing sheet as a PDF, written without a PDF library.
 *
 * The sheet is A4 landscape with three third-angle views side by side — front,
 * top and right — all at one common scale, each with its overall dimensions,
 * and a title block in the bottom right. The line work comes from
 * `orthoViews`; everything here is layout and PDF syntax.
 */

/** A4 landscape, in PostScript points. */
export const PAGE_WIDTH = 841.89
export const PAGE_HEIGHT = 595.28
export const POINTS_PER_MM = 72 / 25.4

const SHEET_MARGIN = 14
const TITLE_BLOCK_HEIGHT = 62
const TITLE_BLOCK_WIDTH = 300
/** Space inside a view cell reserved for the dimension lines and the label. */
const GUTTER = { left: 40, right: 14, bottom: 34, top: 20 } as const
const ARROW_LENGTH = 6
const ARROW_HALF_WIDTH = 2
/** Dimension line sits this far outside the geometry's extent. */
const DIMENSION_OFFSET = 18
const EXTENSION_OVERSHOOT = 4

const LINE_WIDTH = { visible: 0.7, thin: 0.25, frame: 1 } as const
const FONT_SIZE = { label: 8, dimension: 7, caption: 5.5, value: 9, title: 11 } as const

/** The ratios a drawing is allowed to be at, largest first. */
export const PREFERRED_SCALES: readonly number[] = [
  100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001,
]

export interface PdfDrawingOptions {
  readonly partName?: string
  readonly material?: string
  /** Unit the mesh coordinates are in. Drives both the scale and the labels. */
  readonly units?: LengthUnit
  /** Sheet date. Injected so a drawing can be reproduced byte for byte. */
  readonly date?: Date
  readonly author?: string
  /** Force a drawing ratio instead of fitting one. 0.5 means 1:2. */
  readonly scale?: number
  /** Faces meeting at more than this angle produce a drawn edge. */
  readonly sharpAngle?: number
  readonly views?: readonly ViewName[]
  readonly precision?: number
}

interface ViewLayout {
  readonly view: ViewAxes
  readonly segments: readonly DrawingSegment[]
  readonly bounds: DrawingBounds
  /** Cell the view lives in, in page coordinates. */
  readonly cell: { x: number; y: number; width: number; height: number }
  /** Page position of the view's model-space origin. */
  readonly originX: number
  readonly originY: number
}

/** The largest preferred ratio that still fits, or the fit itself if none do. */
export function chooseScale(fit: number): number {
  return PREFERRED_SCALES.find((ratio) => ratio <= fit) ?? fit
}

/** "2:1", "1:1", "1:5" — how a title block spells a ratio. */
export function formatScale(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '1:1'
  return ratio >= 1 ? `${num(ratio, 3)}:1` : `1:${num(1 / ratio, 3)}`
}

export function exportPdfDrawing(mesh: MeshData, options: PdfDrawingOptions = {}): string {
  const units = options.units ?? 'mm'
  const date = options.date ?? new Date()
  const partName = options.partName ?? 'Untitled'
  const precision = options.precision ?? 3
  // `exactOptionalPropertyTypes` rules out passing an explicit `undefined`, so
  // an absent option has to be an absent key.
  const sharpAngleOptions = options.sharpAngle === undefined ? {} : { sharpAngle: options.sharpAngle }
  const authorOption = options.author === undefined ? {} : { author: options.author }

  const views = (options.views ?? ORTHO_VIEWS.map((view) => view.name)).map((name) => {
    const axes = ORTHO_VIEWS.find((candidate) => candidate.name === name) ?? ORTHO_VIEWS[0]
    return axes as ViewAxes
  })

  const projections = views.map((view) => {
    const segments = viewSegments(mesh, view, sharpAngleOptions)
    return { view, segments, bounds: segmentBounds(segments) }
  })

  const area = {
    x: SHEET_MARGIN,
    y: SHEET_MARGIN + TITLE_BLOCK_HEIGHT,
    width: PAGE_WIDTH - SHEET_MARGIN * 2,
    height: PAGE_HEIGHT - SHEET_MARGIN * 2 - TITLE_BLOCK_HEIGHT,
  }
  const cellWidth = area.width / Math.max(projections.length, 1)
  const usable = {
    width: Math.max(cellWidth - GUTTER.left - GUTTER.right, 1),
    height: Math.max(area.height - GUTTER.bottom - GUTTER.top, 1),
  }

  // One scale for the whole sheet: the tightest fit any single view demands.
  const pointsPerMm = POINTS_PER_MM * MILLIMETRES_PER_UNIT[units]
  let fitRatio = Infinity
  for (const { bounds } of projections) {
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    if (width > 0) fitRatio = Math.min(fitRatio, usable.width / (width * pointsPerMm))
    if (height > 0) fitRatio = Math.min(fitRatio, usable.height / (height * pointsPerMm))
  }
  const ratio = options.scale ?? (Number.isFinite(fitRatio) ? chooseScale(fitRatio) : 1)
  const pointsPerUnit = ratio * pointsPerMm

  const layouts: ViewLayout[] = projections.map((projection, index) => {
    const cell = {
      x: area.x + cellWidth * index,
      y: area.y,
      width: cellWidth,
      height: area.height,
    }
    const { bounds } = projection
    const drawnWidth = (bounds.maxX - bounds.minX) * pointsPerUnit
    const drawnHeight = (bounds.maxY - bounds.minY) * pointsPerUnit
    return {
      ...projection,
      cell,
      // Centre the geometry inside the cell's usable box, then place the
      // model origin so `minX`/`minY` land on the box's lower-left corner.
      originX:
        cell.x + GUTTER.left + (usable.width - drawnWidth) / 2 - bounds.minX * pointsPerUnit,
      originY:
        cell.y + GUTTER.bottom + (usable.height - drawnHeight) / 2 - bounds.minY * pointsPerUnit,
    }
  })

  const content = new PdfContent(precision)
  drawFrame(content)
  for (const layout of layouts) drawView(content, layout, pointsPerUnit, units)
  drawTitleBlock(content, {
    partName,
    material: options.material ?? 'Unspecified',
    scale: formatScale(ratio),
    units,
    date,
    ...authorOption,
  })

  return buildPdf(content.toString(), {
    title: partName,
    ...authorOption,
    subject: `Orthographic drawing, scale ${formatScale(ratio)}`,
    creationDate: date,
  })
}

/** Sheet border, drawn just inside the margin. */
function drawFrame(content: PdfContent): void {
  content
    .save()
    .stroke(0, LINE_WIDTH.frame)
    .rect(
      SHEET_MARGIN,
      SHEET_MARGIN,
      PAGE_WIDTH - SHEET_MARGIN * 2,
      PAGE_HEIGHT - SHEET_MARGIN * 2,
    )
    .op('S')
    .restore()
}

function drawView(
  content: PdfContent,
  layout: ViewLayout,
  pointsPerUnit: number,
  units: LengthUnit,
): void {
  const toPageX = (x: number): number => layout.originX + x * pointsPerUnit
  const toPageY = (y: number): number => layout.originY + y * pointsPerUnit

  content.save().stroke(0, LINE_WIDTH.visible)
  for (const segment of layout.segments) {
    content.line(toPageX(segment.a.x), toPageY(segment.a.y), toPageX(segment.b.x), toPageY(segment.b.y))
  }
  content.restore()

  content
    .save()
    .fillGray(0)
    .text(
      layout.cell.x + layout.cell.width / 2 - layout.view.label.length * FONT_SIZE.label * 0.3,
      layout.cell.y + layout.cell.height - FONT_SIZE.label,
      FONT_SIZE.label,
      layout.view.label,
    )
    .restore()

  if (layout.segments.length === 0) return

  const { bounds } = layout
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  if (width > 0) {
    horizontalDimension(
      content,
      toPageX(bounds.minX),
      toPageX(bounds.maxX),
      toPageY(bounds.minY),
      `${num(width, 2)} ${units}`,
    )
  }
  if (height > 0) {
    verticalDimension(
      content,
      toPageY(bounds.minY),
      toPageY(bounds.maxY),
      toPageX(bounds.minX),
      `${num(height, 2)} ${units}`,
    )
  }
}

/** Dimension line below the view, with extension lines up to the geometry. */
function horizontalDimension(
  content: PdfContent,
  left: number,
  right: number,
  bottom: number,
  label: string,
): void {
  const y = bottom - DIMENSION_OFFSET
  content.save().stroke(0.35, LINE_WIDTH.thin)
  content.line(left, bottom - 2, left, y - EXTENSION_OVERSHOOT)
  content.line(right, bottom - 2, right, y - EXTENSION_OVERSHOOT)
  content.line(left, y, right, y)
  content.fillGray(0.35)
  arrow(content, left, y, 1, 0)
  arrow(content, right, y, -1, 0)
  content
    .fillGray(0)
    .text(
      (left + right) / 2 - label.length * FONT_SIZE.dimension * 0.27,
      y + 3,
      FONT_SIZE.dimension,
      label,
    )
    .restore()
}

/** Dimension line to the left of the view, its text set above the line. */
function verticalDimension(
  content: PdfContent,
  bottom: number,
  top: number,
  left: number,
  label: string,
): void {
  const x = left - DIMENSION_OFFSET
  content.save().stroke(0.35, LINE_WIDTH.thin)
  content.line(left - 2, bottom, x - EXTENSION_OVERSHOOT, bottom)
  content.line(left - 2, top, x - EXTENSION_OVERSHOOT, top)
  content.line(x, bottom, x, top)
  content.fillGray(0.35)
  arrow(content, x, bottom, 0, 1)
  arrow(content, x, top, 0, -1)
  content
    .fillGray(0)
    // Kept horizontal and tucked beside the line: readable without a text
    // matrix rotation, which is more PDF machinery than a label is worth.
    .text(x - label.length * FONT_SIZE.dimension * 0.54, (bottom + top) / 2 + 2, FONT_SIZE.dimension, label)
    .restore()
}

/** A solid arrowhead at (x, y) pointing along the unit vector (dx, dy). */
function arrow(content: PdfContent, x: number, y: number, dx: number, dy: number): void {
  const tipX = x
  const tipY = y
  const baseX = x + dx * ARROW_LENGTH
  const baseY = y + dy * ARROW_LENGTH
  // Perpendicular to the direction, for the two base corners.
  const px = -dy * ARROW_HALF_WIDTH
  const py = dx * ARROW_HALF_WIDTH
  content.polygon([
    [tipX, tipY],
    [baseX + px, baseY + py],
    [baseX - px, baseY - py],
  ])
}

interface TitleBlockData {
  readonly partName: string
  readonly material: string
  readonly scale: string
  readonly units: LengthUnit
  readonly date: Date
  readonly author?: string
}

function drawTitleBlock(content: PdfContent, data: TitleBlockData): void {
  const x = PAGE_WIDTH - SHEET_MARGIN - TITLE_BLOCK_WIDTH
  const y = SHEET_MARGIN
  const rowHeight = TITLE_BLOCK_HEIGHT / 3
  const columnWidth = TITLE_BLOCK_WIDTH / 3

  content.save().stroke(0, LINE_WIDTH.frame)
  content.rect(x, y, TITLE_BLOCK_WIDTH, TITLE_BLOCK_HEIGHT).op('S')
  content.stroke(0, LINE_WIDTH.thin)
  for (let row = 1; row < 3; row += 1) {
    content.line(x, y + rowHeight * row, x + TITLE_BLOCK_WIDTH, y + rowHeight * row)
  }
  // Only the bottom two rows are split into columns; the name spans the top.
  for (let column = 1; column < 3; column += 1) {
    content.line(x + columnWidth * column, y, x + columnWidth * column, y + rowHeight * 2)
  }

  content.fillGray(0)
  const field = (
    column: number,
    row: number,
    caption: string,
    value: string,
    size: number = FONT_SIZE.value,
  ): void => {
    const cellX = x + columnWidth * column + 5
    const cellY = y + rowHeight * row
    content.text(cellX, cellY + rowHeight - 8, FONT_SIZE.caption, caption)
    content.text(cellX, cellY + 6, size, value)
  }

  content.text(x + 5, y + rowHeight * 2 + rowHeight - 8, FONT_SIZE.caption, 'PART')
  content.text(x + 5, y + rowHeight * 2 + 5, FONT_SIZE.title, truncate(data.partName, 34))
  field(0, 1, 'MATERIAL', truncate(data.material, 16), FONT_SIZE.dimension)
  field(1, 1, 'SCALE', data.scale)
  field(2, 1, 'UNITS', data.units)
  field(0, 0, 'DATE', isoDate(data.date), FONT_SIZE.dimension)
  field(1, 0, 'DRAWN BY', truncate(data.author ?? 'Tectonic', 14), FONT_SIZE.dimension)
  field(2, 0, 'SHEET', '1 / 1', FONT_SIZE.dimension)
  content.restore()
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, Math.max(limit - 3, 0))}...`
}

/**
 * Wraps a content stream in the smallest document that can display it. The
 * page object refers forward to the font and the stream, so the six objects
 * have to go in below in the order these constants name them.
 */
const PAGE_OBJECT = 3
const FONT_OBJECT = 4
const CONTENT_OBJECT = 5

function buildPdf(
  content: string,
  info: { title: string; author?: string; subject: string; creationDate: Date },
): string {
  const writer = new PdfWriter()
  const catalog = writer.add(`<< /Type /Catalog /Pages 2 0 R >>`)
  const pages = writer.add(`<< /Type /Pages /Kids [${PAGE_OBJECT} 0 R] /Count 1 >>`)
  writer.add(
    `<< /Type /Page /Parent ${pages} 0 R ` +
      `/MediaBox [0 0 ${roundPage(PAGE_WIDTH)} ${roundPage(PAGE_HEIGHT)}] ` +
      `/Resources << /Font << /F1 ${FONT_OBJECT} 0 R >> >> /Contents ${CONTENT_OBJECT} 0 R >>`,
  )
  writer.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  writer.addStream(content)
  const infoObject = writer.add(infoDictionary(info))
  return writer.build(catalog, infoObject)
}

function roundPage(value: number): string {
  return value.toFixed(2)
}
