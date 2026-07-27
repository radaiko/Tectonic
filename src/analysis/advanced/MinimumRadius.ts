/**
 * Minimum radius.
 *
 * The one number that decides whether a shape can be cut: no end mill can
 * produce an internal corner tighter than its own radius, and no press brake a
 * bend tighter than its tooling. Reporting the smallest radius on a body — and
 * where it is — turns "this will not machine" into a specific edge to fix.
 *
 * On a curve the radius comes from the circle through consecutive samples. On a
 * tessellated body it comes from the crease across each interior edge: two
 * facets meeting at angle `θ` over a facet width `w` are two chords of the same
 * circle, so `R = w / (2 sin(θ/2))`. That is exact for a prism tessellated into
 * regular strips whichever way the quads were split, which is what makes it
 * trustworthy on kernel output.
 */

import type { MeshData } from '../../domain/MeshData'
import { triangleCount } from '../../domain/MeshData'
import type { Vec3 } from '../../domain/vec3'
import { distance, dot, length, midpoint, normalize, subtract } from '../../domain/vec3'
import { buildTopology, parseEdgeKey } from '../../mesh/types'
import type { EdgeKey, MeshTopology } from '../../mesh/types'
import { AnalysisError, statisticsOf } from './types'
import { curvatureComb } from './CurvatureComb'
import type { CurvatureCombOptions } from './CurvatureComb'

export interface MinimumRadiusOptions extends CurvatureCombOptions {
  /**
   * Curvature at or below this counts as straight and is left out of the
   * report. Without it a planar face's numerical noise would dominate the
   * maximum, and "average radius" would be meaningless.
   */
  readonly straightTolerance?: number
  /**
   * Turn angle above which a reading is a sharp corner rather than a radius.
   * A box has no radii; without this it would report one the size of its
   * facets. Degrees.
   */
  readonly sharpAngle?: number
  /** Radius the manufacturing process can actually produce, for the verdict. */
  readonly toolRadius?: number
}

export const DEFAULT_STRAIGHT_TOLERANCE = 1e-6
export const DEFAULT_SHARP_ANGLE = 60

export interface RadiusSample {
  readonly radius: number
  readonly curvature: number
  /** How far the surface or curve turns at this reading, in degrees. */
  readonly turnDegrees: number
  /** Where on the geometry the reading was taken. */
  readonly position: Vec3
  /** Which measurement produced it. */
  readonly source: 'curve' | 'edge'
  /** Sample index along a curve, or the mesh edge key. */
  readonly reference: string
}

export interface RadiusReport {
  /** Number of curved readings; straight runs and sharp corners are excluded. */
  readonly count: number
  readonly minimum: number
  readonly maximum: number
  readonly average: number
  readonly minimumAt: Vec3 | null
  readonly samples: readonly RadiusSample[]
  /** Readings dropped for turning too hard to be a radius at all. */
  readonly sharp: readonly RadiusSample[]
  /** Readings tighter than `toolRadius`, when one was given. */
  readonly violations: readonly RadiusSample[]
  /** True when nothing is tighter than the tool, or no tool was named. */
  readonly machinable: boolean
}

/**
 * Assembles a report from readings, setting aside the ones that are straight
 * and the ones that are corners.
 */
export function radiusReport(
  samples: readonly RadiusSample[],
  options: MinimumRadiusOptions = {},
): RadiusReport {
  const tolerance = options.straightTolerance ?? DEFAULT_STRAIGHT_TOLERANCE
  const sharpAngle = options.sharpAngle ?? DEFAULT_SHARP_ANGLE

  const measurable = samples.filter(
    (sample) => sample.curvature > tolerance && Number.isFinite(sample.radius),
  )
  const sharp = measurable.filter((sample) => sample.turnDegrees > sharpAngle)
  const curved = measurable.filter((sample) => sample.turnDegrees <= sharpAngle)
  const statistics = statisticsOf(curved.map((sample) => sample.radius))

  const tightest =
    curved.length === 0
      ? null
      : curved.reduce((best, sample) => (sample.radius < best.radius ? sample : best))

  const violations =
    options.toolRadius === undefined
      ? []
      : curved.filter((sample) => sample.radius < (options.toolRadius as number))

  return {
    count: curved.length,
    minimum: curved.length === 0 ? Number.POSITIVE_INFINITY : statistics.min,
    maximum: curved.length === 0 ? Number.POSITIVE_INFINITY : statistics.max,
    average: curved.length === 0 ? Number.POSITIVE_INFINITY : statistics.average,
    minimumAt: tightest?.position ?? null,
    samples: curved,
    sharp,
    violations,
    machinable: violations.length === 0,
  }
}

/** Minimum radius along one sampled curve. */
export function minimumRadiusOfPolyline(
  points: readonly Vec3[],
  options: MinimumRadiusOptions = {},
): RadiusReport {
  return radiusReport(polylineSamples(points, options, ''), options)
}

/** Minimum radius across several selected edges at once. */
export function minimumRadiusOfEdges(
  polylines: readonly (readonly Vec3[])[],
  options: MinimumRadiusOptions = {},
): RadiusReport {
  if (polylines.length === 0) throw new AnalysisError('Select at least one edge to measure')

  const samples: RadiusSample[] = []
  polylines.forEach((points, edgeIndex) => {
    samples.push(...polylineSamples(points, options, `${edgeIndex}:`))
  })
  return radiusReport(samples, options)
}

/**
 * Curvature across one interior edge of a mesh.
 *
 * The facet width is `2 × area / |edge|` — the height of the triangle standing
 * on the edge — which is the chord the surface turns over. Averaging the two
 * sides keeps an uneven tessellation from biasing the answer.
 */
export function edgeRadius(
  mesh: MeshData,
  edge: EdgeKey,
  topology: MeshTopology,
): RadiusSample | null {
  const owners = topology.edgeTriangles.get(edge)
  if (!owners || owners.length !== 2) return null

  const first = owners[0] as number
  const second = owners[1] as number
  const normalA = topology.faceNormals[first]
  const normalB = topology.faceNormals[second]
  if (!normalA || !normalB) return null

  const [a, b] = parseEdgeKey(edge)
  const start = pointAt(mesh, a)
  const end = pointAt(mesh, b)
  const edgeLength = distance(start, end)
  if (edgeLength === 0) return null

  const width =
    ((topology.doubleAreas[first] ?? 0) + (topology.doubleAreas[second] ?? 0)) / (2 * edgeLength)
  if (width === 0) return null

  const angle = Math.acos(Math.min(1, Math.max(-1, dot(normalA, normalB))))
  const position = midpoint(start, end)
  const turnDegrees = (angle * 180) / Math.PI

  if (angle < 1e-9) {
    return {
      radius: Number.POSITIVE_INFINITY,
      curvature: 0,
      turnDegrees,
      position,
      source: 'edge',
      reference: edge,
    }
  }

  const radius = width / (2 * Math.sin(angle / 2))
  return { radius, curvature: 1 / radius, turnDegrees, position, source: 'edge', reference: edge }
}

/** Minimum radius over an entire tessellated body. */
export function minimumRadiusOfMesh(
  mesh: MeshData,
  options: MinimumRadiusOptions = {},
): RadiusReport {
  if (triangleCount(mesh) === 0) {
    throw new AnalysisError('Minimum radius analysis needs a tessellated body')
  }

  const topology = buildTopology(mesh)
  const samples: RadiusSample[] = []
  for (const edge of topology.edgeTriangles.keys()) {
    const sample = edgeRadius(mesh, edge, topology)
    if (sample) samples.push(sample)
  }
  return radiusReport(samples, options)
}

/** A one-line summary for the results panel. */
export function describeRadiusReport(report: RadiusReport, precision = 3): string {
  if (report.count === 0) return 'No curvature found — the selection is flat.'
  return `min ${report.minimum.toFixed(precision)}, max ${report.maximum.toFixed(
    precision,
  )}, avg ${report.average.toFixed(precision)} (${report.count} readings)`
}

function polylineSamples(
  points: readonly Vec3[],
  options: MinimumRadiusOptions,
  prefix: string,
): RadiusSample[] {
  const comb = curvatureComb(points, options)
  return comb.samples.map((sample) => ({
    radius: sample.radius,
    curvature: sample.curvature,
    turnDegrees: turnDegreesAt(points, sample.index, comb.closed),
    position: sample.position,
    source: 'curve' as const,
    reference: `${prefix}${sample.index}`,
  }))
}

/** The angle between the chords either side of a sample, in degrees. */
function turnDegreesAt(points: readonly Vec3[], index: number, closed: boolean): number {
  const count = points.length
  const previous = closed ? points[(index - 1 + count) % count] : points[index - 1]
  const next = closed ? points[(index + 1) % count] : points[index + 1]
  const current = points[index]
  if (!previous || !next || !current) return 0

  const incoming = subtract(current, previous)
  const outgoing = subtract(next, current)
  if (length(incoming) < 1e-12 || length(outgoing) < 1e-12) return 0

  const cosine = Math.min(1, Math.max(-1, dot(normalize(incoming), normalize(outgoing))))
  return (Math.acos(cosine) * 180) / Math.PI
}

function pointAt(mesh: MeshData, vertex: number): Vec3 {
  return {
    x: mesh.positions[vertex * 3] ?? 0,
    y: mesh.positions[vertex * 3 + 1] ?? 0,
    z: mesh.positions[vertex * 3 + 2] ?? 0,
  }
}
