import type { Vec2 } from '../../sketch/domain/geometry'

/**
 * The block in the corner of the sheet that says what the drawing is of.
 *
 * The field list is data rather than a fixed schema so a user can add a
 * "Weight" row or drop "Checked By" without the renderer knowing about it. The
 * well-known keys below are only what a new block starts with, and what the
 * exporters look for when they need, say, the part number for PDF metadata.
 */

/** Field keys a fresh title block ships with. */
export const TITLE_BLOCK_KEYS = [
  'company',
  'partName',
  'partNumber',
  'material',
  'finish',
  'scale',
  'date',
  'drawnBy',
  'checkedBy',
  'approvedBy',
  'revision',
] as const

export type TitleBlockKey = (typeof TITLE_BLOCK_KEYS)[number]

export interface TitleBlockField {
  readonly key: string
  readonly label: string
  readonly value: string
  /**
   * Where the field sits inside the block, in millimetres from the block's
   * lower-left corner. The label is drawn at this point and the value just
   * below it.
   */
  readonly position: Vec2
  /** Cap height of the value text, in millimetres. */
  readonly fontSize: number
}

export interface TitleBlock {
  /** Width of the block in millimetres. */
  readonly width: number
  /** Height of the block in millimetres. */
  readonly height: number
  readonly fields: readonly TitleBlockField[]
}

export const DEFAULT_TITLE_BLOCK_WIDTH = 180
export const DEFAULT_TITLE_BLOCK_HEIGHT = 36

const LABEL_SIZE = 2
const VALUE_SIZE = 3

/** Column x positions and widths used by the stock layout, in millimetres. */
const COLUMNS = 4
const ROWS = 3

/**
 * A title block laid out as a 4 x 3 grid, filled in reading order from the top
 * left. The top row spans wider fields (company, part name) and the lower rows
 * hold the short ones.
 */
export function createTitleBlock(values: Partial<Record<TitleBlockKey, string>> = {}): TitleBlock {
  const cellWidth = DEFAULT_TITLE_BLOCK_WIDTH / COLUMNS
  const cellHeight = DEFAULT_TITLE_BLOCK_HEIGHT / ROWS

  const definitions: readonly { key: TitleBlockKey; label: string; column: number; row: number }[] =
    [
      { key: 'company', label: 'COMPANY', column: 0, row: 2 },
      { key: 'partName', label: 'TITLE', column: 1, row: 2 },
      { key: 'partNumber', label: 'PART NO', column: 3, row: 2 },
      { key: 'material', label: 'MATERIAL', column: 0, row: 1 },
      { key: 'finish', label: 'FINISH', column: 1, row: 1 },
      { key: 'scale', label: 'SCALE', column: 2, row: 1 },
      { key: 'revision', label: 'REV', column: 3, row: 1 },
      { key: 'drawnBy', label: 'DRAWN BY', column: 0, row: 0 },
      { key: 'checkedBy', label: 'CHECKED BY', column: 1, row: 0 },
      { key: 'approvedBy', label: 'APPROVED BY', column: 2, row: 0 },
      { key: 'date', label: 'DATE', column: 3, row: 0 },
    ]

  return {
    width: DEFAULT_TITLE_BLOCK_WIDTH,
    height: DEFAULT_TITLE_BLOCK_HEIGHT,
    fields: definitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      value: values[definition.key] ?? '',
      position: {
        x: definition.column * cellWidth + 2,
        y: definition.row * cellHeight + cellHeight - LABEL_SIZE - 1.5,
      },
      fontSize: definition.key === 'partName' ? VALUE_SIZE + 1 : VALUE_SIZE,
    })),
  }
}

export function titleBlockField(block: TitleBlock, key: string): TitleBlockField | undefined {
  return block.fields.find((field) => field.key === key)
}

export function titleBlockValue(block: TitleBlock, key: string): string {
  return titleBlockField(block, key)?.value ?? ''
}

/** The block with one field's value replaced. Unknown keys are left alone. */
export function setTitleBlockValue(block: TitleBlock, key: string, value: string): TitleBlock {
  return {
    ...block,
    fields: block.fields.map((field) => (field.key === key ? { ...field, value } : field)),
  }
}

/** The block with several values replaced in one pass. */
export function setTitleBlockValues(
  block: TitleBlock,
  values: Readonly<Record<string, string>>,
): TitleBlock {
  return {
    ...block,
    fields: block.fields.map((field) =>
      field.key in values ? { ...field, value: values[field.key] ?? field.value } : field,
    ),
  }
}

/**
 * The block with a field appended, or that field updated if the key is already
 * there — adding twice is an edit, not a duplicate row.
 */
export function addTitleBlockField(block: TitleBlock, field: TitleBlockField): TitleBlock {
  if (titleBlockField(block, field.key)) {
    return { ...block, fields: block.fields.map((existing) => (existing.key === field.key ? field : existing)) }
  }
  return { ...block, fields: [...block.fields, field] }
}

export function removeTitleBlockField(block: TitleBlock, key: string): TitleBlock {
  return { ...block, fields: block.fields.filter((field) => field.key !== key) }
}

/** Narrows parsed JSON back to a title block, falling back to a fresh one. */
export function titleBlockFromJSON(value: unknown): TitleBlock {
  if (typeof value !== 'object' || value === null) return createTitleBlock()
  const candidate = value as Record<string, unknown>
  if (!Array.isArray(candidate.fields)) return createTitleBlock()

  const fields: TitleBlockField[] = []
  for (const entry of candidate.fields) {
    const field = fieldFromJSON(entry)
    if (field) fields.push(field)
  }
  return {
    width: numberOr(candidate.width, DEFAULT_TITLE_BLOCK_WIDTH),
    height: numberOr(candidate.height, DEFAULT_TITLE_BLOCK_HEIGHT),
    fields,
  }
}

function fieldFromJSON(value: unknown): TitleBlockField | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.key !== 'string') return null
  const position = candidate.position as Record<string, unknown> | undefined
  return {
    key: candidate.key,
    label: typeof candidate.label === 'string' ? candidate.label : candidate.key,
    value: typeof candidate.value === 'string' ? candidate.value : '',
    position: {
      x: numberOr(position?.x, 0),
      y: numberOr(position?.y, 0),
    },
    fontSize: numberOr(candidate.fontSize, VALUE_SIZE),
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
