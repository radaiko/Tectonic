/**
 * Shared vocabulary for the visual analyses.
 *
 * Every one of them answers a numeric question about geometry — how tight is
 * this curve, how much draft is on this face, how thin is this wall — and then
 * paints the answer. Painting is the part they have in common, so the banded
 * scale and the colour ramp live here rather than being restated four times.
 */

/** Raised when an analysis cannot be run on the geometry it was handed. */
export class AnalysisError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalysisError'
  }
}

/**
 * The palette the analyses share. Red always means "the problem", blue always
 * means "past the far end", so a user who has learned one heat map has learned
 * all of them.
 */
export const ANALYSIS_COLORS = {
  red: '#e2493c',
  orange: '#e2823c',
  yellow: '#e2c93c',
  green: '#3ca85a',
  blue: '#3c74e2',
  grey: '#8a8f98',
} as const

export type AnalysisColor = (typeof ANALYSIS_COLORS)[keyof typeof ANALYSIS_COLORS]

/**
 * One stripe of a legend: a half-open interval `[min, max)` and the colour it
 * paints. Half-open so a value landing exactly on a threshold belongs to the
 * better band, which is how CAD packages report a face at exactly 3° of draft.
 */
export interface AnalysisBand {
  readonly id: string
  readonly label: string
  readonly color: string
  readonly min: number
  readonly max: number
}

export interface ColorScale {
  readonly id: string
  readonly label: string
  /** Unit the band bounds are expressed in, for the legend. */
  readonly unit: string
  readonly bands: readonly AnalysisBand[]
}

/** The band a value falls in, or the last band when it runs off the end. */
export function bandFor(scale: ColorScale, value: number): AnalysisBand {
  const found = scale.bands.find((band) => value >= band.min && value < band.max)
  if (found) return found
  const last = scale.bands[scale.bands.length - 1]
  if (!last) throw new AnalysisError(`Colour scale ${scale.id} has no bands`)
  return value < (scale.bands[0]?.min ?? 0) ? (scale.bands[0] as AnalysisBand) : last
}

export function bandIndexFor(scale: ColorScale, value: number): number {
  const band = bandFor(scale, value)
  return scale.bands.indexOf(band)
}

/** The colour a value paints under this scale. */
export function colorFor(scale: ColorScale, value: number): string {
  return bandFor(scale, value).color
}

/** How many entries of a set land in each band — the legend's counts. */
export function bandHistogram(
  scale: ColorScale,
  values: Iterable<number>,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const band of scale.bands) counts.set(band.id, 0)
  for (const value of values) {
    const band = bandFor(scale, value)
    counts.set(band.id, (counts.get(band.id) ?? 0) + 1)
  }
  return counts
}

export type Rgb = readonly [number, number, number]

/** Reads `#rgb` or `#rrggbb`. Anything else is a mistake worth surfacing. */
export function parseHex(color: string): Rgb {
  const text = color.trim().replace(/^#/, '')
  const expanded =
    text.length === 3
      ? text
          .split('')
          .map((char) => char + char)
          .join('')
      : text
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new AnalysisError(`Not a hex colour: ${color}`)
  }
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

export function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`
}

/** Blends two colours. `t` outside [0, 1] is clamped, not extrapolated. */
export function mixColor(from: string, to: string, t: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  const fraction = clamp01(t)
  return toHex([
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
    a[2] + (b[2] - a[2]) * fraction,
  ])
}

/**
 * A continuous colour along a list of stops. Used where a banded scale would
 * lie — wall thickness varies smoothly, so a smooth ramp reads the truth.
 */
export function rampColor(stops: readonly string[], t: number): string {
  if (stops.length === 0) throw new AnalysisError('A colour ramp needs at least one stop')
  if (stops.length === 1) return stops[0] as string
  const fraction = clamp01(t) * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(fraction))
  return mixColor(stops[index] as string, stops[index + 1] as string, fraction - index)
}

/** Where a value sits between two bounds, as a fraction in [0, 1]. */
export function normalize01(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return 0
  if (high === low) return 0.5
  return clamp01((value - low) / (high - low))
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** min / max / mean / count over a set of readings, for the results panel. */
export interface Statistics {
  readonly count: number
  readonly min: number
  readonly max: number
  readonly average: number
}

export function statisticsOf(values: readonly number[]): Statistics {
  const finite = values.filter((value) => Number.isFinite(value))
  if (finite.length === 0) return { count: 0, min: 0, max: 0, average: 0 }
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let total = 0
  for (const value of finite) {
    if (value < min) min = value
    if (value > max) max = value
    total += value
  }
  return { count: finite.length, min, max, average: total / finite.length }
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}
