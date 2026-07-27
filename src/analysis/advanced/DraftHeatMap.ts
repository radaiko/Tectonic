/**
 * Draft analysis.
 *
 * A moulded part has to come out of the tool. Every face must lean away from
 * the pull direction by enough that it separates from the steel instead of
 * scraping down it; a face that leans the wrong way locks the part in and needs
 * a side action or a design change.
 *
 * The number is the angle between the face and the plane perpendicular to the
 * pull: zero for a wall running straight up the pull direction, positive when
 * it opens out, negative when it undercuts. `asin(n · pull)` gives exactly that
 * for a unit normal, and works equally well for the near-horizontal faces where
 * a naive angle-to-axis reading would be hard to interpret.
 */

import type { MeshData } from '../../domain/MeshData'
import { triangleAt, triangleCount } from '../../domain/MeshData'
import type { Vec3 } from '../../domain/vec3'
import { UNIT_Z, cross, dot, length, normalize, scale, subtract } from '../../domain/vec3'
import type { Triangle } from '../types'
import { triangleArea } from '../primitives'
import type { AnalysisBand, ColorScale, Statistics } from './types'
import { ANALYSIS_COLORS, AnalysisError, statisticsOf } from './types'

/** The four verdicts a face gets, worst first. */
export type DraftBandId = 'undercut' | 'risky' | 'draft' | 'safe'

export interface DraftOptions {
  /** Direction the tool opens in. Defaults to +Z. */
  readonly pull?: Vec3
  /** Below this the face is only just drafted. Degrees. */
  readonly minimumDraft?: number
  /** At or above this the face is comfortably drafted. Degrees. */
  readonly safeDraft?: number
  /**
   * Faces this close to perpendicular to the pull are the top and bottom of the
   * part; they never need draft, so they are reported as safe. Degrees.
   */
  readonly perpendicularTolerance?: number
}

export const DEFAULT_MINIMUM_DRAFT = 1
export const DEFAULT_SAFE_DRAFT = 3
export const DEFAULT_PERPENDICULAR_TOLERANCE = 5

export interface DraftFace {
  /** Triangle index in the source mesh. */
  readonly index: number
  readonly normal: Vec3
  readonly centroid: Vec3
  readonly area: number
  /** Degrees; negative is an undercut. */
  readonly angle: number
  readonly band: DraftBandId
  readonly color: string
  /** True for the faces the pull direction stares straight at. */
  readonly perpendicular: boolean
}

export interface DraftHeatMap {
  readonly faces: readonly DraftFace[]
  readonly pull: Vec3
  /** Surface area in each band — the number that decides if a tool is viable. */
  readonly areaByBand: Readonly<Record<DraftBandId, number>>
  readonly countByBand: Readonly<Record<DraftBandId, number>>
  readonly totalArea: number
  readonly statistics: Statistics
  /** Indices of the faces that lock the part in the tool. */
  readonly undercuts: readonly number[]
  /** True when nothing undercuts and nothing is below the minimum. */
  readonly mouldable: boolean
}

const BAND_COLORS: Readonly<Record<DraftBandId, string>> = {
  undercut: ANALYSIS_COLORS.red,
  risky: ANALYSIS_COLORS.yellow,
  draft: ANALYSIS_COLORS.green,
  safe: ANALYSIS_COLORS.blue,
}

const BAND_LABELS: Readonly<Record<DraftBandId, string>> = {
  undercut: 'Undercut',
  risky: 'Insufficient',
  draft: 'Drafted',
  safe: 'Ample',
}

export function draftColor(band: DraftBandId): string {
  return BAND_COLORS[band]
}

/** The legend, in degrees, built from whatever thresholds the tool needs. */
export function draftScale(options: DraftOptions = {}): ColorScale {
  const minimum = options.minimumDraft ?? DEFAULT_MINIMUM_DRAFT
  const safe = Math.max(minimum, options.safeDraft ?? DEFAULT_SAFE_DRAFT)
  const bands: AnalysisBand[] = [
    {
      id: 'undercut',
      label: BAND_LABELS.undercut,
      color: BAND_COLORS.undercut,
      min: Number.NEGATIVE_INFINITY,
      max: 0,
    },
    { id: 'risky', label: BAND_LABELS.risky, color: BAND_COLORS.risky, min: 0, max: minimum },
    { id: 'draft', label: BAND_LABELS.draft, color: BAND_COLORS.draft, min: minimum, max: safe },
    {
      id: 'safe',
      label: BAND_LABELS.safe,
      color: BAND_COLORS.safe,
      min: safe,
      max: Number.POSITIVE_INFINITY,
    },
  ]
  return { id: 'draft', label: 'Draft angle', unit: '°', bands }
}

/**
 * Draft angle of one face, in degrees.
 *
 * Positive means the face opens towards the pull, negative means it undercuts,
 * and ±90 means it faces the tool head on.
 */
export function draftAngleOf(normal: Vec3, pull: Vec3 = UNIT_Z): number {
  if (length(normal) < 1e-12) throw new AnalysisError('A face normal cannot be zero length')
  if (length(pull) < 1e-12) throw new AnalysisError('A pull direction cannot be zero length')
  const projection = dot(normalize(normal), normalize(pull))
  return (Math.asin(Math.min(1, Math.max(-1, projection))) * 180) / Math.PI
}

export function classifyDraft(angle: number, options: DraftOptions = {}): DraftBandId {
  const minimum = options.minimumDraft ?? DEFAULT_MINIMUM_DRAFT
  const safe = Math.max(minimum, options.safeDraft ?? DEFAULT_SAFE_DRAFT)
  const tolerance = options.perpendicularTolerance ?? DEFAULT_PERPENDICULAR_TOLERANCE

  // The face the tool pulls straight off never needs draft. Its opposite is the
  // parting face and is equally fine.
  if (Math.abs(angle) >= 90 - tolerance) return 'safe'
  if (angle < 0) return 'undercut'
  if (angle < minimum) return 'risky'
  return angle < safe ? 'draft' : 'safe'
}

/** Whether a face would lock the part in a tool pulled this way. */
export function isUndercut(normal: Vec3, options: DraftOptions = {}): boolean {
  return classifyDraft(draftAngleOf(normal, options.pull ?? UNIT_Z), options) === 'undercut'
}

/** The whole body, face by face. */
export function draftHeatMap(mesh: MeshData, options: DraftOptions = {}): DraftHeatMap {
  const count = triangleCount(mesh)
  if (count === 0) throw new AnalysisError('Draft analysis needs a tessellated body')

  const pull = normalize(options.pull ?? UNIT_Z)
  const tolerance = options.perpendicularTolerance ?? DEFAULT_PERPENDICULAR_TOLERANCE
  const faces: DraftFace[] = []
  const areaByBand: Record<DraftBandId, number> = { undercut: 0, risky: 0, draft: 0, safe: 0 }
  const countByBand: Record<DraftBandId, number> = { undercut: 0, risky: 0, draft: 0, safe: 0 }
  const undercuts: number[] = []
  let totalArea = 0

  for (let index = 0; index < count; index += 1) {
    const [a, b, c] = triangleAt(mesh, index)
    const triangle: Triangle = { a, b, c }
    const raw = cross(subtract(b, a), subtract(c, a))
    if (length(raw) < 1e-12) continue // A degenerate facet has no direction to report.

    const normal = normalize(raw)
    const angle = draftAngleOf(normal, pull)
    const band = classifyDraft(angle, options)
    const area = triangleArea(triangle)

    faces.push({
      index,
      normal,
      centroid: scale(
        { x: a.x + b.x + c.x, y: a.y + b.y + c.y, z: a.z + b.z + c.z },
        1 / 3,
      ),
      area,
      angle,
      band,
      color: BAND_COLORS[band],
      perpendicular: Math.abs(angle) >= 90 - tolerance,
    })

    areaByBand[band] += area
    countByBand[band] += 1
    totalArea += area
    if (band === 'undercut') undercuts.push(index)
  }

  return {
    faces,
    pull,
    areaByBand,
    countByBand,
    totalArea,
    statistics: statisticsOf(faces.map((face) => face.angle)),
    undercuts,
    mouldable: countByBand.undercut === 0 && countByBand.risky === 0,
  }
}

/**
 * The pull direction that drafts the most surface area, chosen from candidates.
 *
 * A first pass at "which way up should this mould?" — cheap, and usually right
 * for a part that was designed with one obvious opening direction.
 */
export function bestPullDirection(
  mesh: MeshData,
  candidates: readonly Vec3[],
  options: DraftOptions = {},
): { readonly pull: Vec3; readonly map: DraftHeatMap } {
  if (candidates.length === 0) throw new AnalysisError('Need at least one candidate pull direction')

  let best: { pull: Vec3; map: DraftHeatMap } | null = null
  for (const candidate of candidates) {
    const map = draftHeatMap(mesh, { ...options, pull: candidate })
    const good = map.areaByBand.draft + map.areaByBand.safe
    const bestGood = best === null ? -1 : best.map.areaByBand.draft + best.map.areaByBand.safe
    if (good > bestGood) best = { pull: normalize(candidate), map }
  }
  return best as { pull: Vec3; map: DraftHeatMap }
}
