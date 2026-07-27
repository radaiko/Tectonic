/**
 * Curvature combs.
 *
 * A comb is the honest way to look at a curve. The curve itself always looks
 * smooth; the comb — a spike at every sample, as long as the curvature is high
 * — shows where the radius collapses, where two spans meet without matching
 * curvature, and where the bend changes sides. Class-A surfacing is largely the
 * business of making combs continuous.
 *
 * Curvature is estimated from three consecutive samples: the circle through
 * them has a known radius, and its reciprocal is the curvature. That is exact
 * for a circular arc at any sampling density and converges quickly for anything
 * else, which is all a display needs.
 */

import type { Vec3 } from '../../domain/vec3'
import {
  add,
  cross,
  distance,
  dot,
  length,
  normalize,
  perpendicular,
  scale as scaleVec,
  subtract,
} from '../../domain/vec3'
import type { AnalysisBand, ColorScale, Statistics } from './types'
import { ANALYSIS_COLORS, AnalysisError, statisticsOf } from './types'

/** Where a sample sits on the smooth-to-tight range. */
export type CurvatureBandId = 'flat' | 'smooth' | 'tight'

export interface CurvatureCombOptions {
  /** Tooth length per unit of curvature. Purely a display magnification. */
  readonly combScale?: number
  /**
   * Plane normal used to give the curvature a sign, so a bend one way and a
   * bend the other can be told apart — which is what makes an inflection
   * detectable. Defaults to the curve's own average binormal.
   */
  readonly referenceNormal?: Vec3
  /** Radius at or below which a sample is called tight. */
  readonly tightRadius?: number
  /** Curvature at or below which a sample is called flat. */
  readonly flatCurvature?: number
  /** Treats the last point as joined to the first. */
  readonly closed?: boolean
}

export const DEFAULT_COMB_SCALE = 20
export const DEFAULT_TIGHT_RADIUS = 1
export const DEFAULT_FLAT_CURVATURE = 1e-4

export interface CurvatureSample {
  readonly index: number
  readonly position: Vec3
  /** Unit direction of travel along the curve. */
  readonly tangent: Vec3
  /** Unit normal pointing away from the centre of curvature. */
  readonly normal: Vec3
  readonly curvature: number
  /** Curvature signed by which side of the reference normal the curve bends to. */
  readonly signedCurvature: number
  /** `1 / curvature`, or Infinity where the curve is straight. */
  readonly radius: number
  readonly band: CurvatureBandId
  readonly color: string
  /** True where the bend changes sides between this sample and the previous one. */
  readonly inflection: boolean
}

/** One spike of the comb: from the curve out to the curvature's length. */
export interface CombTooth {
  readonly index: number
  readonly root: Vec3
  readonly tip: Vec3
  readonly color: string
}

export interface CurvatureCombResult {
  readonly samples: readonly CurvatureSample[]
  readonly teeth: readonly CombTooth[]
  /** The line joining the tips — the shape the eye actually reads. */
  readonly envelope: readonly Vec3[]
  /** Sample indices where the curve changes which way it bends. */
  readonly inflections: readonly number[]
  readonly statistics: Statistics
  /** Smallest radius on the curve; Infinity for a straight line. */
  readonly minimumRadius: number
  /** Sample carrying the tightest curvature, or -1 when the curve is straight. */
  readonly tightestIndex: number
  readonly combScale: number
  readonly closed: boolean
}

/**
 * The banded legend for a comb. Built from the options rather than fixed,
 * because "tight" means something different on a phone housing and a wing.
 */
export function curvatureScale(options: CurvatureCombOptions = {}): ColorScale {
  const flat = options.flatCurvature ?? DEFAULT_FLAT_CURVATURE
  const tight = 1 / (options.tightRadius ?? DEFAULT_TIGHT_RADIUS)
  const bands: AnalysisBand[] = [
    { id: 'flat', label: 'Flat', color: ANALYSIS_COLORS.blue, min: 0, max: flat },
    {
      id: 'smooth',
      label: 'Smooth',
      color: ANALYSIS_COLORS.green,
      min: flat,
      max: Math.max(flat, tight),
    },
    {
      id: 'tight',
      label: 'Tight',
      color: ANALYSIS_COLORS.red,
      min: Math.max(flat, tight),
      max: Number.POSITIVE_INFINITY,
    },
  ]
  return { id: 'curvature', label: 'Curvature', unit: '1/mm', bands }
}

export function classifyCurvature(
  curvature: number,
  options: CurvatureCombOptions = {},
): CurvatureBandId {
  const flat = options.flatCurvature ?? DEFAULT_FLAT_CURVATURE
  const tight = 1 / (options.tightRadius ?? DEFAULT_TIGHT_RADIUS)
  if (curvature < flat) return 'flat'
  return curvature >= tight ? 'tight' : 'smooth'
}

const BAND_COLORS: Readonly<Record<CurvatureBandId, string>> = {
  flat: ANALYSIS_COLORS.blue,
  smooth: ANALYSIS_COLORS.green,
  tight: ANALYSIS_COLORS.red,
}

export function curvatureColor(band: CurvatureBandId): string {
  return BAND_COLORS[band]
}

/**
 * Curvature of the circle through three points, by Menger's formula.
 *
 * Zero when the points are collinear or two of them coincide, which is the
 * right answer for a straight run and avoids dividing by nothing.
 */
export function mengerCurvature(a: Vec3, b: Vec3, c: Vec3): number {
  const ab = distance(a, b)
  const bc = distance(b, c)
  const ca = distance(c, a)
  if (ab === 0 || bc === 0 || ca === 0) return 0
  const area2 = length(cross(subtract(b, a), subtract(c, a)))
  return (2 * area2) / (ab * bc * ca)
}

/** The unit binormal at `b`, i.e. the axis the curve turns about there. */
export function turnAxis(a: Vec3, b: Vec3, c: Vec3): Vec3 | null {
  const axis = cross(subtract(b, a), subtract(c, b))
  return length(axis) < 1e-12 ? null : normalize(axis)
}

/**
 * The comb for a sampled curve.
 *
 * The end samples of an open curve borrow their neighbour's reading — a single
 * end point has no three-point neighbourhood, and repeating the adjacent value
 * is both stable and what every CAD package draws.
 */
export function curvatureComb(
  points: readonly Vec3[],
  options: CurvatureCombOptions = {},
): CurvatureCombResult {
  if (points.length < 3) {
    throw new AnalysisError('A curvature comb needs at least three sample points')
  }

  const closed = options.closed ?? false
  const combScale = options.combScale ?? DEFAULT_COMB_SCALE
  const count = points.length
  const reference = options.referenceNormal ?? averageTurnAxis(points, closed)

  const raw: {
    curvature: number
    axis: Vec3 | null
    tangent: Vec3
  }[] = []

  for (let index = 0; index < count; index += 1) {
    const previous = neighbour(points, index - 1, closed)
    const next = neighbour(points, index + 1, closed)
    const current = points[index] as Vec3

    if (previous === undefined || next === undefined) {
      raw.push({ curvature: Number.NaN, axis: null, tangent: endTangent(points, index) })
      continue
    }
    raw.push({
      curvature: mengerCurvature(previous, current, next),
      axis: turnAxis(previous, current, next),
      tangent: safeDirection(subtract(next, previous), endTangent(points, index)),
    })
  }

  // Open ends borrow inward, so the comb starts and finishes with a real value.
  if (!closed) {
    const first = raw[1]
    const last = raw[count - 2]
    if (first) raw[0] = { ...(raw[0] as (typeof raw)[number]), curvature: first.curvature, axis: first.axis }
    if (last) {
      raw[count - 1] = {
        ...(raw[count - 1] as (typeof raw)[number]),
        curvature: last.curvature,
        axis: last.axis,
      }
    }
  }

  const samples: CurvatureSample[] = []
  let previousSign = 0
  const inflections: number[] = []

  for (let index = 0; index < count; index += 1) {
    const entry = raw[index] as (typeof raw)[number]
    const curvature = Number.isFinite(entry.curvature) ? entry.curvature : 0
    const sign = entry.axis === null ? 0 : Math.sign(dot(entry.axis, reference)) || 0
    const outward = outwardNormal(entry.axis, entry.tangent)
    const band = classifyCurvature(curvature, options)

    // Only a real swap of sides counts; a straight run between two bends does
    // not turn one inflection into two.
    const inflection = sign !== 0 && previousSign !== 0 && sign !== previousSign
    if (inflection) inflections.push(index)
    if (sign !== 0) previousSign = sign

    samples.push({
      index,
      position: points[index] as Vec3,
      tangent: entry.tangent,
      normal: outward,
      curvature,
      signedCurvature: curvature * (sign === 0 ? 1 : sign),
      radius: curvature === 0 ? Number.POSITIVE_INFINITY : 1 / curvature,
      band,
      color: curvatureColor(band),
      inflection,
    })
  }

  const teeth = samples.map((sample) => ({
    index: sample.index,
    root: sample.position,
    tip: add(sample.position, scaleVec(sample.normal, sample.curvature * combScale)),
    color: sample.color,
  }))

  const curvatures = samples.map((sample) => sample.curvature)
  const statistics = statisticsOf(curvatures)
  const tightestIndex = curvatures.some((value) => value > 0)
    ? curvatures.indexOf(Math.max(...curvatures))
    : -1

  return {
    samples,
    teeth,
    envelope: teeth.map((tooth) => tooth.tip),
    inflections,
    statistics,
    minimumRadius: statistics.max > 0 ? 1 / statistics.max : Number.POSITIVE_INFINITY,
    tightestIndex,
    combScale,
    closed,
  }
}

/**
 * Resamples a polyline to `count` evenly spaced points by arc length.
 *
 * A comb reads badly on unevenly sampled input — long spans look flat purely
 * because nothing was measured there — so the display resamples first.
 */
export function resamplePolyline(points: readonly Vec3[], count: number): Vec3[] {
  if (points.length < 2) throw new AnalysisError('A polyline needs at least two points')
  if (count < 2) throw new AnalysisError('A resampled polyline needs at least two points')

  const cumulative: number[] = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      (cumulative[index - 1] as number) +
        distance(points[index - 1] as Vec3, points[index] as Vec3),
    )
  }
  const total = cumulative[cumulative.length - 1] as number
  if (total === 0) return Array.from({ length: count }, () => points[0] as Vec3)

  const result: Vec3[] = []
  let segment = 1
  for (let step = 0; step < count; step += 1) {
    const target = (total * step) / (count - 1)
    while (segment < cumulative.length - 1 && (cumulative[segment] as number) < target) {
      segment += 1
    }
    const start = cumulative[segment - 1] as number
    const end = cumulative[segment] as number
    const fraction = end === start ? 0 : (target - start) / (end - start)
    const a = points[segment - 1] as Vec3
    const b = points[segment] as Vec3
    result.push(add(a, scaleVec(subtract(b, a), fraction)))
  }
  return result
}

/** Total turning of the curve in degrees — a quick read on how wound it is. */
export function totalTurning(points: readonly Vec3[], closed = false): number {
  let total = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const a = points[index - 1] as Vec3
    const b = points[index] as Vec3
    const c = points[index + 1] as Vec3
    total += turnAngle(a, b, c)
  }
  if (closed && points.length >= 3) {
    const last = points[points.length - 1] as Vec3
    const first = points[0] as Vec3
    const second = points[1] as Vec3
    total += turnAngle(points[points.length - 2] as Vec3, last, first)
    total += turnAngle(last, first, second)
  }
  return total
}

function turnAngle(a: Vec3, b: Vec3, c: Vec3): number {
  const first = subtract(b, a)
  const second = subtract(c, b)
  if (length(first) === 0 || length(second) === 0) return 0
  const cosine = dot(normalize(first), normalize(second))
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI
}

function neighbour(points: readonly Vec3[], index: number, closed: boolean): Vec3 | undefined {
  if (index >= 0 && index < points.length) return points[index]
  if (!closed) return undefined
  const wrapped = ((index % points.length) + points.length) % points.length
  return points[wrapped]
}

function endTangent(points: readonly Vec3[], index: number): Vec3 {
  const forward = index === 0 ? 1 : index
  const a = points[forward - 1] as Vec3
  const b = points[forward] as Vec3
  return safeDirection(subtract(b, a), { x: 1, y: 0, z: 0 })
}

function safeDirection(vector: Vec3, fallback: Vec3): Vec3 {
  return length(vector) < 1e-12 ? fallback : normalize(vector)
}

/**
 * The normal pointing away from the centre of curvature, so a tooth grows on
 * the outside of a bend. Straight runs have no centre, so any perpendicular
 * does — the tooth there has zero length anyway.
 */
function outwardNormal(axis: Vec3 | null, tangent: Vec3): Vec3 {
  if (axis === null) return normalize(perpendicular(tangent))
  return normalize(cross(tangent, axis))
}

function averageTurnAxis(points: readonly Vec3[], closed: boolean): Vec3 {
  let total: Vec3 = { x: 0, y: 0, z: 0 }
  for (let index = 0; index < points.length; index += 1) {
    const previous = neighbour(points, index - 1, closed)
    const next = neighbour(points, index + 1, closed)
    if (previous === undefined || next === undefined) continue
    const axis = turnAxis(previous, points[index] as Vec3, next)
    if (axis === null) continue
    // Fold onto one side first, or a curve with an inflection averages to zero
    // and leaves the sign meaningless.
    total = add(total, dot(axis, total) < 0 ? scaleVec(axis, -1) : axis)
  }
  return length(total) < 1e-12 ? { x: 0, y: 0, z: 1 } : normalize(total)
}
