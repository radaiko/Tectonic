/**
 * Wall thickness analysis.
 *
 * Injection moulding, casting and sheet forming all care about the same thing:
 * how much material is between this face and whatever is behind it. Too thin
 * and it will not fill or will tear; too thick and it sinks, warps and wastes
 * cycle time.
 *
 * The measurement here is the ray method: fire a ray straight into the body
 * from the middle of each facet and take the distance to the first surface it
 * comes back out through. It is the same thing a caliper measures, it is fast,
 * and it degrades honestly — a ray that never exits reports no reading rather
 * than a wrong one.
 */

import type { MeshData } from '../../domain/MeshData'
import { triangleAt, triangleCount } from '../../domain/MeshData'
import type { Vec3 } from '../../domain/vec3'
import { add, cross, dot, length, normalize, scale, subtract } from '../../domain/vec3'
import type { Triangle } from '../types'
import { triangleArea } from '../primitives'
import type { AnalysisBand, ColorScale, Statistics } from './types'
import {
  ANALYSIS_COLORS,
  AnalysisError,
  normalize01,
  rampColor,
  statisticsOf,
} from './types'

export type ThicknessBandId = 'thin' | 'nominal' | 'thick'

export interface WallThicknessOptions {
  /** The thickness the part is supposed to be. */
  readonly target?: number
  /** How far either side of the target still counts as nominal. */
  readonly tolerance?: number
  /** Rays longer than this are treated as having missed. */
  readonly maxDistance?: number
  /** Ignore hits closer than this — self-intersections at the ray's own facet. */
  readonly minDistance?: number
}

export const DEFAULT_TARGET_THICKNESS = 2
export const DEFAULT_THICKNESS_TOLERANCE = 0.5
export const DEFAULT_MIN_HIT_DISTANCE = 1e-6

export interface ThicknessSample {
  /** Triangle the ray was fired from. */
  readonly index: number
  readonly origin: Vec3
  /** Direction fired, i.e. into the material. */
  readonly direction: Vec3
  /** Distance to the far wall, or null when the ray never came out. */
  readonly thickness: number | null
  /** Where it came out, when it did. */
  readonly exit: Vec3 | null
  readonly area: number
  readonly band: ThicknessBandId | null
  readonly color: string
}

export interface WallThicknessMap {
  readonly samples: readonly ThicknessSample[]
  readonly target: number
  readonly tolerance: number
  readonly statistics: Statistics
  readonly areaByBand: Readonly<Record<ThicknessBandId, number>>
  readonly countByBand: Readonly<Record<ThicknessBandId, number>>
  /** Facets whose ray never exited — an open or badly wound mesh. */
  readonly unmeasured: readonly number[]
  readonly thinnest: ThicknessSample | null
  readonly thickest: ThicknessSample | null
  /** True when every measured facet sits inside the tolerance band. */
  readonly withinTolerance: boolean
}

const BAND_COLORS: Readonly<Record<ThicknessBandId, string>> = {
  thin: ANALYSIS_COLORS.red,
  nominal: ANALYSIS_COLORS.green,
  thick: ANALYSIS_COLORS.blue,
}

/** Facets with no reading are drawn grey so they read as "unknown", not "fine". */
export const UNMEASURED_COLOR = ANALYSIS_COLORS.grey

export function thicknessColor(band: ThicknessBandId | null): string {
  return band === null ? UNMEASURED_COLOR : BAND_COLORS[band]
}

export function thicknessScale(options: WallThicknessOptions = {}): ColorScale {
  const target = options.target ?? DEFAULT_TARGET_THICKNESS
  const tolerance = Math.abs(options.tolerance ?? DEFAULT_THICKNESS_TOLERANCE)
  const bands: AnalysisBand[] = [
    { id: 'thin', label: 'Thin', color: BAND_COLORS.thin, min: 0, max: target - tolerance },
    {
      id: 'nominal',
      label: 'Nominal',
      color: BAND_COLORS.nominal,
      min: target - tolerance,
      max: target + tolerance,
    },
    {
      id: 'thick',
      label: 'Thick',
      color: BAND_COLORS.thick,
      min: target + tolerance,
      max: Number.POSITIVE_INFINITY,
    },
  ]
  return { id: 'thickness', label: 'Wall thickness', unit: 'mm', bands }
}

export function classifyThickness(
  thickness: number,
  options: WallThicknessOptions = {},
): ThicknessBandId {
  const target = options.target ?? DEFAULT_TARGET_THICKNESS
  const tolerance = Math.abs(options.tolerance ?? DEFAULT_THICKNESS_TOLERANCE)
  if (thickness < target - tolerance) return 'thin'
  return thickness > target + tolerance ? 'thick' : 'nominal'
}

/**
 * A continuous colour for a reading, thin through nominal to thick.
 *
 * The banded scale answers "is this acceptable"; the ramp answers "where does
 * it change", which is what makes a gradual thinning visible before it crosses
 * the threshold.
 */
export function thicknessRamp(thickness: number, options: WallThicknessOptions = {}): string {
  const target = options.target ?? DEFAULT_TARGET_THICKNESS
  const tolerance = Math.abs(options.tolerance ?? DEFAULT_THICKNESS_TOLERANCE) || target / 2
  return rampColor(
    [BAND_COLORS.thin, BAND_COLORS.nominal, BAND_COLORS.thick],
    normalize01(thickness, target - 2 * tolerance, target + 2 * tolerance),
  )
}

/**
 * Möller–Trumbore, without the back-face cull.
 *
 * Both sides matter here: a ray fired into a wall leaves through a facet whose
 * normal points the other way, and culling would make every wall unmeasurable.
 */
export function rayTriangleDistance(
  origin: Vec3,
  direction: Vec3,
  triangle: Triangle,
): number | null {
  const edge1 = subtract(triangle.b, triangle.a)
  const edge2 = subtract(triangle.c, triangle.a)
  const pvec = cross(direction, edge2)
  const determinant = dot(edge1, pvec)
  if (Math.abs(determinant) < 1e-12) return null // Ray runs parallel to the facet.

  const inverse = 1 / determinant
  const tvec = subtract(origin, triangle.a)
  const u = dot(tvec, pvec) * inverse
  if (u < -1e-9 || u > 1 + 1e-9) return null

  const qvec = cross(tvec, edge1)
  const v = dot(direction, qvec) * inverse
  if (v < -1e-9 || u + v > 1 + 1e-9) return null

  const distance = dot(edge2, qvec) * inverse
  return distance > 0 ? distance : null
}

/**
 * Distance from a point to the first surface a ray meets, ignoring the facet it
 * started on and anything nearer than `minDistance`.
 */
export function wallThicknessAt(
  mesh: MeshData,
  origin: Vec3,
  direction: Vec3,
  options: WallThicknessOptions = {},
): number | null {
  if (length(direction) < 1e-12) throw new AnalysisError('A ray needs a direction')
  const ray = normalize(direction)
  const minimum = options.minDistance ?? DEFAULT_MIN_HIT_DISTANCE
  const maximum = options.maxDistance ?? Number.POSITIVE_INFINITY

  let nearest: number | null = null
  for (let index = 0; index < triangleCount(mesh); index += 1) {
    const [a, b, c] = triangleAt(mesh, index)
    const hit = rayTriangleDistance(origin, ray, { a, b, c })
    if (hit === null || hit < minimum || hit > maximum) continue
    if (nearest === null || hit < nearest) nearest = hit
  }
  return nearest
}

/** The whole body, one reading per facet. */
export function wallThicknessMap(
  mesh: MeshData,
  options: WallThicknessOptions = {},
): WallThicknessMap {
  const count = triangleCount(mesh)
  if (count === 0) throw new AnalysisError('Wall thickness analysis needs a tessellated body')

  const target = options.target ?? DEFAULT_TARGET_THICKNESS
  const tolerance = Math.abs(options.tolerance ?? DEFAULT_THICKNESS_TOLERANCE)
  const samples: ThicknessSample[] = []
  const areaByBand: Record<ThicknessBandId, number> = { thin: 0, nominal: 0, thick: 0 }
  const countByBand: Record<ThicknessBandId, number> = { thin: 0, nominal: 0, thick: 0 }
  const unmeasured: number[] = []

  for (let index = 0; index < count; index += 1) {
    const [a, b, c] = triangleAt(mesh, index)
    const triangle: Triangle = { a, b, c }
    const raw = cross(subtract(b, a), subtract(c, a))
    if (length(raw) < 1e-12) {
      unmeasured.push(index)
      continue
    }

    // Straight into the material, from the middle of the facet.
    const direction = scale(normalize(raw), -1)
    const origin = scale({ x: a.x + b.x + c.x, y: a.y + b.y + c.y, z: a.z + b.z + c.z }, 1 / 3)
    const thickness = wallThicknessAt(mesh, origin, direction, options)
    const area = triangleArea(triangle)

    if (thickness === null) {
      unmeasured.push(index)
      samples.push({
        index,
        origin,
        direction,
        thickness: null,
        exit: null,
        area,
        band: null,
        color: UNMEASURED_COLOR,
      })
      continue
    }

    const band = classifyThickness(thickness, { target, tolerance })
    areaByBand[band] += area
    countByBand[band] += 1
    samples.push({
      index,
      origin,
      direction,
      thickness,
      exit: add(origin, scale(direction, thickness)),
      area,
      band,
      color: BAND_COLORS[band],
    })
  }

  const measured = samples.filter(
    (sample): sample is ThicknessSample & { thickness: number } => sample.thickness !== null,
  )
  const sorted = [...measured].sort((first, second) => first.thickness - second.thickness)

  return {
    samples,
    target,
    tolerance,
    statistics: statisticsOf(measured.map((sample) => sample.thickness)),
    areaByBand,
    countByBand,
    unmeasured,
    thinnest: sorted[0] ?? null,
    thickest: sorted[sorted.length - 1] ?? null,
    withinTolerance: measured.length > 0 && countByBand.thin === 0 && countByBand.thick === 0,
  }
}
