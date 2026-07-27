import type { MeshData } from '../domain/MeshData'
import { meshBounds, mergeMeshes } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { angleBetween } from '../domain/vec3'
import { measureSurfaceArea } from '../analysis/MeasureArea'
import { measureVolume } from '../analysis/MeasureVolume'
import type { RgbColor } from '../io/types'
import type { FaceGroupOptions, MeshFace } from './faceGroups'
import { faceMesh, meshFaces } from './faceGroups'

/**
 * Comparing two versions of a body.
 *
 * The question a user is actually asking — "what changed between these two
 * revisions?" — is about faces, not triangles, so the two meshes are grouped
 * into faces (see {@link meshFaces}) and those are matched against each other.
 * A face that has a partner in the other version is unchanged or modified; one
 * without a partner was added or removed.
 *
 * Matching is deliberately two-tiered. A generous window decides *whether* two
 * faces are the same face at all — a wall that moved 2mm is the same wall, not
 * one wall deleted and another created — while a tight threshold then decides
 * whether that same face actually changed. Collapsing the two would either
 * report every nudge as a delete-and-add or report a real move as no change.
 *
 * Every tolerance defaults to a fraction of the model's own size, so the same
 * comparison behaves the same way on a watch part and on a chassis.
 */

/** What happened to a face between the two versions. */
export type FaceChange = 'added' | 'removed' | 'modified' | 'unchanged'

export const FACE_CHANGES: readonly FaceChange[] = ['added', 'removed', 'modified', 'unchanged']

/**
 * Green for new material, red for what went away, amber for a face that is
 * still there but different, and a neutral grey for the rest — which is nearly
 * invisible at its opacity, so the eye goes straight to the changes.
 */
export const DIFF_COLORS: Readonly<Record<FaceChange, RgbColor>> = {
  added: { r: 0.16, g: 0.72, b: 0.32 },
  removed: { r: 0.85, g: 0.22, b: 0.19 },
  modified: { r: 0.95, g: 0.66, b: 0.16 },
  unchanged: { r: 0.62, g: 0.65, b: 0.69 },
}

export const DIFF_OPACITY: Readonly<Record<FaceChange, number>> = {
  added: 0.9,
  removed: 0.9,
  modified: 0.9,
  unchanged: 0.15,
}

/** One face's fate, with the measurements the comparison reached it by. */
export interface FaceDiff {
  readonly change: FaceChange
  /** The face in the older body. Absent for an added face. */
  readonly before: MeshFace | null
  /** The face in the newer body. Absent for a removed face. */
  readonly after: MeshFace | null
  /** After minus before. Zero when only one side exists. */
  readonly areaDelta: number
  /** How far the centroid moved. Zero when only one side exists. */
  readonly centroidShift: number
  /** Angle between the two normals, in radians. */
  readonly normalAngle: number
}

export interface DiffSummary {
  readonly facesBefore: number
  readonly facesAfter: number
  readonly facesAdded: number
  readonly facesRemoved: number
  readonly facesModified: number
  readonly facesUnchanged: number
  readonly volumeBefore: number
  readonly volumeAfter: number
  readonly volumeDelta: number
  readonly areaBefore: number
  readonly areaAfter: number
  readonly areaDelta: number
  /** True when nothing was added, removed or modified. */
  readonly identical: boolean
}

export interface VisualDiffResult {
  readonly before: MeshData
  readonly after: MeshData
  readonly faces: readonly FaceDiff[]
  readonly summary: DiffSummary
  /** The tolerances the comparison actually ran with, defaults resolved. */
  readonly tolerances: ResolvedTolerances
}

export interface VisualDiffOptions extends FaceGroupOptions {
  /** How far a face may move and still be recognised as the same face. */
  readonly matchTolerance?: number
  /** How far a normal may turn and still be the same face, in radians. */
  readonly matchAngle?: number
  /** Below this a matched face counts as unchanged. */
  readonly tolerance?: number
  /** Relative area difference below which a matched face counts as unchanged. */
  readonly areaTolerance?: number
  /** Normal difference below which a matched face counts as unchanged. */
  readonly angleTolerance?: number
}

export interface ResolvedTolerances {
  readonly matchTolerance: number
  readonly matchAngle: number
  readonly tolerance: number
  readonly areaTolerance: number
  readonly angleTolerance: number
}

/** A face may drift this fraction of the model's diagonal and still match. */
export const DEFAULT_MATCH_FRACTION = 0.05
export const DEFAULT_MATCH_ANGLE = (15 * Math.PI) / 180
/** Anything below this fraction of the diagonal is tessellation noise. */
export const DEFAULT_TOLERANCE_FRACTION = 1e-6
export const DEFAULT_AREA_TOLERANCE = 1e-6
export const DEFAULT_ANGLE_TOLERANCE = 1e-6

/** Diagonal of the box holding both bodies — the comparison's sense of scale. */
export function diffScale(before: MeshData, after: MeshData): number {
  const bounds = meshBounds(mergeMeshes([before, after]))
  const diagonal = Math.hypot(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z,
  )
  // An empty or single-point comparison still needs a positive scale for the
  // tolerances below to mean anything.
  return diagonal > 0 ? diagonal : 1
}

export function resolveTolerances(
  before: MeshData,
  after: MeshData,
  options: VisualDiffOptions = {},
): ResolvedTolerances {
  const scale = diffScale(before, after)
  return {
    matchTolerance: options.matchTolerance ?? scale * DEFAULT_MATCH_FRACTION,
    matchAngle: options.matchAngle ?? DEFAULT_MATCH_ANGLE,
    tolerance: options.tolerance ?? scale * DEFAULT_TOLERANCE_FRACTION,
    areaTolerance: options.areaTolerance ?? DEFAULT_AREA_TOLERANCE,
    angleTolerance: options.angleTolerance ?? DEFAULT_ANGLE_TOLERANCE,
  }
}

/**
 * Compares two tessellated bodies.
 *
 * Faces come back in a stable order — every pairing first, then what was
 * removed, then what was added — so two runs over the same inputs produce the
 * same report and a UI can key rows on the position.
 */
export function compareBodies(
  before: MeshData,
  after: MeshData,
  options: VisualDiffOptions = {},
): VisualDiffResult {
  const tolerances = resolveTolerances(before, after, options)
  const groupOptions: FaceGroupOptions = {
    ...(options.creaseAngle === undefined ? {} : { creaseAngle: options.creaseAngle }),
    ...(options.weldTolerance === undefined ? {} : { weldTolerance: options.weldTolerance }),
  }
  const beforeFaces = meshFaces(before, groupOptions)
  const afterFaces = meshFaces(after, groupOptions)

  const pairs = matchFaces(beforeFaces, afterFaces, tolerances)
  const matchedBefore = new Set(pairs.map((pair) => pair.before.index))
  const matchedAfter = new Set(pairs.map((pair) => pair.after.index))
  const faces: FaceDiff[] = []

  for (const pair of pairs) {
    const areaDelta = pair.after.area - pair.before.area
    const relativeArea =
      Math.max(pair.before.area, pair.after.area) > 0
        ? Math.abs(areaDelta) / Math.max(pair.before.area, pair.after.area)
        : 0
    const unchanged =
      pair.centroidShift <= tolerances.tolerance &&
      pair.normalAngle <= tolerances.angleTolerance &&
      relativeArea <= tolerances.areaTolerance

    faces.push({
      change: unchanged ? 'unchanged' : 'modified',
      before: pair.before,
      after: pair.after,
      areaDelta,
      centroidShift: pair.centroidShift,
      normalAngle: pair.normalAngle,
    })
  }

  for (const face of beforeFaces) {
    if (matchedBefore.has(face.index)) continue
    faces.push({
      change: 'removed',
      before: face,
      after: null,
      areaDelta: 0,
      centroidShift: 0,
      normalAngle: 0,
    })
  }
  for (const face of afterFaces) {
    if (matchedAfter.has(face.index)) continue
    faces.push({
      change: 'added',
      before: null,
      after: face,
      areaDelta: 0,
      centroidShift: 0,
      normalAngle: 0,
    })
  }

  return {
    before,
    after,
    faces,
    summary: summarize(before, after, beforeFaces.length, afterFaces.length, faces),
    tolerances,
  }
}

/** One accepted pairing, with the measurements that justified it. */
interface FacePair {
  readonly before: MeshFace
  readonly after: MeshFace
  readonly centroidShift: number
  readonly normalAngle: number
}

/**
 * Pairs faces off, best candidates first.
 *
 * Every pair within the matching window is scored, then taken in ascending
 * order and kept if neither side is already spoken for. Greedy rather than
 * optimal: a true assignment solve would cost far more and only differ where
 * two faces are near-interchangeable, in which case either answer describes the
 * change equally well.
 */
function matchFaces(
  before: readonly MeshFace[],
  after: readonly MeshFace[],
  tolerances: ResolvedTolerances,
): FacePair[] {
  const candidates: (FacePair & { readonly cost: number })[] = []

  for (const source of before) {
    for (const target of after) {
      const centroidShift = distance(source.centroid, target.centroid)
      if (centroidShift > tolerances.matchTolerance) continue
      const normalAngle = angleBetween(source.normal, target.normal)
      if (normalAngle > tolerances.matchAngle) continue

      // Both terms are normalised against their own window, so neither can
      // dominate simply by being measured in larger units.
      const cost =
        centroidShift / (tolerances.matchTolerance || 1) +
        normalAngle / (tolerances.matchAngle || 1)
      candidates.push({ before: source, after: target, centroidShift, normalAngle, cost })
    }
  }

  candidates.sort((left, right) =>
    left.cost !== right.cost
      ? left.cost - right.cost
      : left.before.index !== right.before.index
        ? left.before.index - right.before.index
        : left.after.index - right.after.index,
  )

  const takenBefore = new Set<number>()
  const takenAfter = new Set<number>()
  const pairs: FacePair[] = []
  for (const candidate of candidates) {
    if (takenBefore.has(candidate.before.index) || takenAfter.has(candidate.after.index)) continue
    takenBefore.add(candidate.before.index)
    takenAfter.add(candidate.after.index)
    pairs.push(candidate)
  }
  return pairs.sort((left, right) => left.before.index - right.before.index)
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

function summarize(
  before: MeshData,
  after: MeshData,
  facesBefore: number,
  facesAfter: number,
  faces: readonly FaceDiff[],
): DiffSummary {
  const counted = (change: FaceChange): number =>
    faces.reduce((total, face) => total + (face.change === change ? 1 : 0), 0)

  const volumeBefore = measureVolume(before)
  const volumeAfter = measureVolume(after)
  const areaBefore = measureSurfaceArea(before)
  const areaAfter = measureSurfaceArea(after)
  const facesAdded = counted('added')
  const facesRemoved = counted('removed')
  const facesModified = counted('modified')

  return {
    facesBefore,
    facesAfter,
    facesAdded,
    facesRemoved,
    facesModified,
    facesUnchanged: counted('unchanged'),
    volumeBefore,
    volumeAfter,
    volumeDelta: volumeAfter - volumeBefore,
    areaBefore,
    areaAfter,
    areaDelta: areaAfter - areaBefore,
    identical: facesAdded === 0 && facesRemoved === 0 && facesModified === 0,
  }
}

/* -------------------------------------------------------------------------- */
/* Display                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How the two versions are laid out on screen. `overlay` puts them in the same
 * place, `sideBySide` separates them along X, `difference` drops everything
 * that did not change, and the two single-version modes are the A/B toggle.
 */
export type DiffViewMode = 'overlay' | 'sideBySide' | 'difference' | 'before' | 'after'

export const DIFF_VIEW_MODES: readonly DiffViewMode[] = [
  'overlay',
  'sideBySide',
  'difference',
  'before',
  'after',
]

/** One coloured lump of geometry for the viewport to draw. */
export interface DiffLayer {
  readonly name: string
  readonly change: FaceChange
  /** Which version the geometry came from. */
  readonly version: 'before' | 'after'
  readonly mesh: MeshData
  readonly color: RgbColor
  readonly opacity: number
  /** Translation to apply — non-zero only in side-by-side. */
  readonly offset: Vec3
}

export interface DiffDisplayOptions {
  /**
   * Gap between the two bodies in side-by-side, as a multiple of the model's
   * width. The default leaves a clear channel without pushing either body out
   * of a fitted view.
   */
  readonly separation?: number
}

export const DEFAULT_SEPARATION = 0.15

/**
 * Turns a comparison into drawable layers.
 *
 * One layer per face rather than one per category, because the viewport needs
 * to hit-test individual faces to report what a user clicked, and merging them
 * would throw that away.
 */
export function diffLayers(
  result: VisualDiffResult,
  mode: DiffViewMode = 'overlay',
  options: DiffDisplayOptions = {},
): DiffLayer[] {
  const offsets = sideBySideOffsets(result, options.separation ?? DEFAULT_SEPARATION)
  const layers: DiffLayer[] = []

  for (const face of result.faces) {
    for (const version of ['before', 'after'] as const) {
      const source = version === 'before' ? face.before : face.after
      if (source === null) continue
      if (!showsFace(mode, face.change, version)) continue

      layers.push({
        name: `${version === 'before' ? 'Before' : 'After'} face ${source.index + 1}`,
        change: face.change,
        version,
        mesh: faceMesh(version === 'before' ? result.before : result.after, source),
        color: DIFF_COLORS[face.change],
        opacity: DIFF_OPACITY[face.change],
        offset: mode === 'sideBySide' ? offsets[version] : ZERO_OFFSET,
      })
    }
  }
  return layers
}

const ZERO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 }

/**
 * Which side of a pairing a mode draws.
 *
 * Overlay shows the newer geometry for anything that survived and the older
 * geometry only for what was removed — drawing both halves of an unchanged
 * pair would double every surface and make the depth buffer fight itself.
 */
function showsFace(mode: DiffViewMode, change: FaceChange, version: 'before' | 'after'): boolean {
  if (mode === 'before') return version === 'before'
  if (mode === 'after') return version === 'after'
  if (mode === 'sideBySide') return true
  if (mode === 'difference' && change === 'unchanged') return false
  return change === 'removed' ? version === 'before' : version === 'after'
}

/** Where each version sits in side-by-side: half the gap either side of centre. */
export function sideBySideOffsets(
  result: VisualDiffResult,
  separation: number,
): { readonly before: Vec3; readonly after: Vec3 } {
  const bounds = meshBounds(mergeMeshes([result.before, result.after]))
  const width = bounds.max.x - bounds.min.x
  const shift = (width * (1 + separation)) / 2
  return { before: { x: -shift, y: 0, z: 0 }, after: { x: shift, y: 0, z: 0 } }
}

/** A layer's mesh with its offset baked in, ready to hand to a renderer. */
export function placedMesh(layer: DiffLayer): MeshData {
  if (layer.offset.x === 0 && layer.offset.y === 0 && layer.offset.z === 0) return layer.mesh
  const positions = layer.mesh.positions.map((value, index) =>
    index % 3 === 0
      ? value + layer.offset.x
      : index % 3 === 1
        ? value + layer.offset.y
        : value + layer.offset.z,
  )
  return { positions, normals: [...layer.mesh.normals], indices: [...layer.mesh.indices] }
}

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

/** A one-line plain-English summary, for a status bar or a report header. */
export function describeDiff(summary: DiffSummary): string {
  if (summary.identical) return 'No changes'

  const parts: string[] = []
  if (summary.facesAdded > 0) parts.push(`${summary.facesAdded} added`)
  if (summary.facesRemoved > 0) parts.push(`${summary.facesRemoved} removed`)
  if (summary.facesModified > 0) parts.push(`${summary.facesModified} modified`)
  return `${parts.join(', ')} of ${summary.facesAfter} face${summary.facesAfter === 1 ? '' : 's'}`
}

/** Signed change as a percentage of the starting value, or zero from nothing. */
export function percentChange(before: number, after: number): number {
  if (before === 0) return after === 0 ? 0 : 100
  return ((after - before) / Math.abs(before)) * 100
}
