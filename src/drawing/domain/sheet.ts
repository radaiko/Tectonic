/**
 * Sheet sizes for a drawing. Every dimension here is in millimetres, which is
 * the one unit a sheet is always measured in no matter what units the model
 * uses — an A3 is 420 x 297 mm whether the part is drawn in inches or metres.
 *
 * Stock sizes are recorded portrait (height >= width); `sheetExtent` swaps them
 * for landscape so the rest of the system only ever sees a width and a height.
 */

export const SHEET_SIZE_NAMES = [
  'A0',
  'A1',
  'A2',
  'A3',
  'A4',
  'Letter',
  'Legal',
  'Tabloid',
  'Custom',
] as const

export type SheetSizeName = (typeof SHEET_SIZE_NAMES)[number]

export type SheetOrientation = 'portrait' | 'landscape'

export interface SheetExtent {
  /** Millimetres across the sheet. */
  readonly width: number
  /** Millimetres up the sheet. */
  readonly height: number
}

/** Portrait extents of every stock size. `Custom` carries no fixed extent. */
export const STOCK_SHEET_SIZES: Readonly<Record<Exclude<SheetSizeName, 'Custom'>, SheetExtent>> = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
  Tabloid: { width: 279.4, height: 431.8 },
}

/** Fallback extent for a custom sheet that never had one set. */
export const DEFAULT_CUSTOM_EXTENT: SheetExtent = { width: 297, height: 210 }

export interface SheetSpec {
  readonly size: SheetSizeName
  readonly orientation: SheetOrientation
  /** Portrait extent of a custom sheet. Ignored for stock sizes. */
  readonly custom?: SheetExtent
}

export function isSheetSizeName(value: unknown): value is SheetSizeName {
  return (SHEET_SIZE_NAMES as readonly string[]).includes(value as string)
}

export function isSheetOrientation(value: unknown): value is SheetOrientation {
  return value === 'portrait' || value === 'landscape'
}

/** The sheet's width and height in millimetres, with orientation applied. */
export function sheetExtent(spec: SheetSpec): SheetExtent {
  const portrait =
    spec.size === 'Custom'
      ? normalizeExtent(spec.custom ?? DEFAULT_CUSTOM_EXTENT)
      : STOCK_SHEET_SIZES[spec.size]
  return spec.orientation === 'landscape'
    ? { width: portrait.height, height: portrait.width }
    : { width: portrait.width, height: portrait.height }
}

/** A custom extent is stored portrait, so a wide one is turned on its side. */
function normalizeExtent(extent: SheetExtent): SheetExtent {
  const width = Math.max(extent.width, 1)
  const height = Math.max(extent.height, 1)
  return width <= height ? { width, height } : { width: height, height: width }
}

/** Margin between the sheet edge and the drawing frame, in millimetres. */
export function sheetMargin(spec: SheetSpec): number {
  const { width, height } = sheetExtent(spec)
  // ISO 5457 asks for a wider left margin for filing; a single even margin is
  // enough here and keeps the frame centred under a moved view.
  return Math.min(width, height) >= 400 ? 20 : 10
}

/** The frame rectangle in sheet coordinates: origin bottom-left, y up. */
export function sheetFrame(spec: SheetSpec): {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
} {
  const extent = sheetExtent(spec)
  const margin = sheetMargin(spec)
  return {
    x: margin,
    y: margin,
    width: Math.max(extent.width - margin * 2, 1),
    height: Math.max(extent.height - margin * 2, 1),
  }
}
