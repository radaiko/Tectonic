import type { Tolerance } from '../domain/Annotation'

/**
 * How a dimension is drawn and how its number is written.
 *
 * A style is plain data so a drawing can carry its own and an exporter can read
 * one without knowing which renderer produced it. The two named styles below
 * are the ISO and ASME defaults, which differ in more than arrowheads: ISO sets
 * its text above an unbroken dimension line, ASME breaks the line and centres
 * the text in the gap.
 */

export const ARROWHEAD_KINDS = ['filled', 'open', 'dot', 'slash', 'architectural', 'none'] as const

export type ArrowheadKind = (typeof ARROWHEAD_KINDS)[number]

/** Where the number sits relative to the dimension line. */
export const TEXT_PLACEMENTS = ['above', 'centred', 'aligned'] as const

export type TextPlacement = (typeof TEXT_PLACEMENTS)[number]

export interface DimensionStyle {
  readonly name: string
  readonly arrowhead: ArrowheadKind
  /** Length of an arrowhead, in millimetres on the sheet. */
  readonly arrowSize: number
  /** Text cap height, in millimetres. */
  readonly textSize: number
  readonly textPlacement: TextPlacement
  /** Gap between the text and the dimension line, in millimetres. */
  readonly textGap: number
  /** Distance from the geometry out to the first dimension line. */
  readonly offset: number
  /** Distance between stacked dimension lines in a baseline run. */
  readonly baselineSpacing: number
  /** How far an extension line runs past the dimension line. */
  readonly extensionOvershoot: number
  /** Gap between the geometry and the start of its extension line. */
  readonly extensionGap: number
  readonly precision: number
  /** Written after the number, e.g. a degree sign or a unit. */
  readonly suffix?: string
  /** Drops trailing zeroes: 10 rather than 10.00. */
  readonly trimTrailingZeros: boolean
  readonly lineWidth: number
}

export const ISO_DIMENSION_STYLE: DimensionStyle = {
  name: 'ISO',
  arrowhead: 'filled',
  arrowSize: 3.5,
  textSize: 3.5,
  textPlacement: 'above',
  textGap: 1,
  offset: 10,
  baselineSpacing: 8,
  extensionOvershoot: 2,
  extensionGap: 1,
  precision: 2,
  trimTrailingZeros: false,
  lineWidth: 0.25,
}

export const ASME_DIMENSION_STYLE: DimensionStyle = {
  ...ISO_DIMENSION_STYLE,
  name: 'ASME',
  textPlacement: 'centred',
  arrowSize: 3,
  textSize: 3,
}

export const DEFAULT_DIMENSION_STYLE = ISO_DIMENSION_STYLE

export function dimensionStyle(name: 'ISO' | 'ASME'): DimensionStyle {
  return name === 'ASME' ? ASME_DIMENSION_STYLE : ISO_DIMENSION_STYLE
}

export interface FormatOptions {
  readonly precision?: number
  readonly trimTrailingZeros?: boolean
  readonly prefix?: string
  readonly suffix?: string
}

/** The number on its own, without any tolerance. */
export function formatValue(value: number, options: FormatOptions = {}): string {
  const precision = Math.max(Math.floor(options.precision ?? DEFAULT_DIMENSION_STYLE.precision), 0)
  if (!Number.isFinite(value)) return '—'

  const fixed = value.toFixed(precision)
  const text =
    options.trimTrailingZeros && fixed.includes('.')
      ? fixed.replace(/0+$/, '').replace(/\.$/, '')
      : fixed
  // A value that rounds to zero from below should not read "-0.00".
  const normalized = /^-0(\.0*)?$/.test(text) ? text.slice(1) : text
  return `${options.prefix ?? ''}${normalized}${options.suffix ?? ''}`
}

/**
 * The full dimension text: the number, whatever tolerance goes with it, and any
 * prefix or suffix the annotation carries.
 *
 * Limits come back as two numbers separated by a slash rather than stacked,
 * because a single line of text is what every one of the renderers can draw and
 * "10.05/9.95" is unambiguous.
 */
export function formatDimension(
  value: number,
  tolerance: Tolerance | undefined,
  options: FormatOptions = {},
): string {
  const base = formatValue(value, options)
  if (!tolerance || tolerance.kind === 'none') return base

  const precision = options.precision ?? DEFAULT_DIMENSION_STYLE.precision
  const asDeviation = (amount: number): string => formatValue(amount, { precision })

  switch (tolerance.kind) {
    case 'symmetrical': {
      const amount = Math.abs(tolerance.plus ?? 0)
      return `${base} ±${asDeviation(amount)}`
    }
    case 'deviation': {
      const plus = tolerance.plus ?? 0
      const minus = Math.abs(tolerance.minus ?? 0)
      return `${base} +${asDeviation(plus)}/-${asDeviation(minus)}`
    }
    case 'limits': {
      const upper = value + (tolerance.plus ?? 0)
      const lower = value - Math.abs(tolerance.minus ?? 0)
      return `${formatValue(upper, options)}/${formatValue(lower, options)}`
    }
    case 'fit':
      return tolerance.fit ? `${base} ${tolerance.fit}` : base
  }
}

/** The upper and lower limits a tolerance puts on a value. */
export function toleranceLimits(
  value: number,
  tolerance: Tolerance | undefined,
): { readonly upper: number; readonly lower: number } {
  if (!tolerance || tolerance.kind === 'none' || tolerance.kind === 'fit') {
    return { upper: value, lower: value }
  }
  if (tolerance.kind === 'symmetrical') {
    const amount = Math.abs(tolerance.plus ?? 0)
    return { upper: value + amount, lower: value - amount }
  }
  return {
    upper: value + (tolerance.plus ?? 0),
    lower: value - Math.abs(tolerance.minus ?? 0),
  }
}

/**
 * The outline of an arrowhead, as points around a tip at the origin pointing
 * along +x. Renderers rotate and translate it into place; `none` and `slash`
 * come back with no fill and are drawn as strokes instead.
 */
export function arrowheadPolygon(kind: ArrowheadKind, size: number): { x: number; y: number }[] {
  const half = size / 3
  switch (kind) {
    case 'filled':
    case 'open':
      return [
        { x: 0, y: 0 },
        { x: size, y: half / 1.5 },
        { x: size, y: -half / 1.5 },
      ]
    case 'dot': {
      const radius = size / 4
      const points: { x: number; y: number }[] = []
      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * Math.PI * 2
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
      }
      return points
    }
    case 'architectural':
      return [
        { x: 0, y: 0 },
        { x: size, y: half / 2 },
        { x: size, y: 0 },
      ]
    case 'slash':
      return [
        { x: -size / 2, y: -size / 2 },
        { x: size / 2, y: size / 2 },
      ]
    case 'none':
      return []
  }
}

/** Whether the arrowhead is a filled shape or a stroked one. */
export function arrowheadIsFilled(kind: ArrowheadKind): boolean {
  return kind === 'filled' || kind === 'dot' || kind === 'architectural'
}
