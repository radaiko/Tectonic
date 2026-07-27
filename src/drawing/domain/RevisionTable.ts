/**
 * The revision history block. Rows are append-only in practice — a released
 * drawing never rewrites history — so the only mutation offered is adding a
 * revision, which picks the next letter for you.
 */

export interface RevisionRow {
  /** A, B, C ... AA, AB. Skips I, O and Q, which ASME Y14.35 reserves. */
  readonly revision: string
  readonly description: string
  /** ISO 8601 date, YYYY-MM-DD. */
  readonly date: string
  readonly approvedBy: string
}

export interface RevisionTable {
  readonly rows: readonly RevisionRow[]
  /** Width of the table in millimetres. */
  readonly width: number
  /** Height of one row in millimetres. */
  readonly rowHeight: number
}

export const DEFAULT_REVISION_TABLE_WIDTH = 120
export const DEFAULT_REVISION_ROW_HEIGHT = 6

/** I, O and Q read as 1, 0 and O, so drawings skip them. */
const REVISION_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

export function createRevisionTable(rows: readonly RevisionRow[] = []): RevisionTable {
  return {
    rows,
    width: DEFAULT_REVISION_TABLE_WIDTH,
    rowHeight: DEFAULT_REVISION_ROW_HEIGHT,
  }
}

/**
 * The nth revision label, counting from zero: A, B ... Z, AA, AB. Two-letter
 * labels use the same reduced alphabet, so AA follows Z and AJ follows AH.
 */
export function revisionLetter(index: number): string {
  const base = REVISION_LETTERS.length
  const position = Math.max(Math.floor(index), 0)
  if (position < base) return REVISION_LETTERS[position] as string

  const remainder = position - base
  const high = Math.floor(remainder / base)
  const low = remainder % base
  // Three-letter labels would mean 500-plus revisions; wrapping is fine there.
  const highLetter = REVISION_LETTERS[high % base] as string
  return `${highLetter}${REVISION_LETTERS[low] as string}`
}

/** The label the next revision would carry. */
export function nextRevision(table: RevisionTable): string {
  return revisionLetter(table.rows.length)
}

/** The most recent revision label, or an empty string before the first one. */
export function currentRevision(table: RevisionTable): string {
  return table.rows[table.rows.length - 1]?.revision ?? ''
}

export interface RevisionInput {
  readonly description: string
  /** Defaults to today. Injected so a drawing can be reproduced exactly. */
  readonly date?: string
  readonly approvedBy?: string
  /** Overrides the auto-assigned letter. */
  readonly revision?: string
}

/** The table with one more row on the end, lettered automatically. */
export function addRevision(table: RevisionTable, input: RevisionInput): RevisionTable {
  const row: RevisionRow = {
    revision: input.revision ?? nextRevision(table),
    description: input.description,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    approvedBy: input.approvedBy ?? '',
  }
  return { ...table, rows: [...table.rows, row] }
}

/** Height of the whole block including its header row, in millimetres. */
export function revisionTableHeight(table: RevisionTable): number {
  return (table.rows.length + 1) * table.rowHeight
}

export function revisionTableFromJSON(value: unknown): RevisionTable {
  if (typeof value !== 'object' || value === null) return createRevisionTable()
  const candidate = value as Record<string, unknown>
  const rows: RevisionRow[] = []
  if (Array.isArray(candidate.rows)) {
    for (const entry of candidate.rows) {
      const row = rowFromJSON(entry)
      if (row) rows.push(row)
    }
  }
  return {
    rows,
    width: numberOr(candidate.width, DEFAULT_REVISION_TABLE_WIDTH),
    rowHeight: numberOr(candidate.rowHeight, DEFAULT_REVISION_ROW_HEIGHT),
  }
}

function rowFromJSON(value: unknown): RevisionRow | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.revision !== 'string') return null
  return {
    revision: candidate.revision,
    description: typeof candidate.description === 'string' ? candidate.description : '',
    date: typeof candidate.date === 'string' ? candidate.date : '',
    approvedBy: typeof candidate.approvedBy === 'string' ? candidate.approvedBy : '',
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
