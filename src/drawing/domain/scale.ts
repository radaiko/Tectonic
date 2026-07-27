/**
 * Drawing scales. A scale is stored as the ratio of paper to model: 1 is full
 * size, 0.5 is 1:2, 2 is 2:1.
 */

/** The ratios a drawing is allowed to be at, largest first. */
export const STANDARD_SCALES: readonly number[] = [
  100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001,
]

/** The largest standard ratio that still fits, or the fit itself if none do. */
export function chooseScale(fit: number): number {
  if (!Number.isFinite(fit) || fit <= 0) return 1
  return STANDARD_SCALES.find((ratio) => ratio <= fit) ?? fit
}

/** "2:1", "1:1", "1:5" — how a title block spells a ratio. */
export function formatScale(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '1:1'
  return ratio >= 1 ? `${trim(ratio)}:1` : `1:${trim(1 / ratio)}`
}

/** Reads "1:2", "2:1" or a bare number back into a ratio. */
export function parseScale(text: string): number | null {
  const parts = text.split(':')
  if (parts.length === 1) {
    const value = Number(text.trim())
    return Number.isFinite(value) && value > 0 ? value : null
  }
  if (parts.length !== 2) return null
  const numerator = Number((parts[0] ?? '').trim())
  const denominator = Number((parts[1] ?? '').trim())
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  if (numerator <= 0 || denominator <= 0) return null
  return numerator / denominator
}

function trim(value: number): string {
  const fixed = value.toFixed(3)
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
}
