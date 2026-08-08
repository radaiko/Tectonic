import type { MeshData } from '../domain/MeshData'
import type { EdgeInfo, FaceInfo, IKernel, ShapeHandle, Vec3 } from './IKernel'
import { isBRepKernel } from './IKernel'
import { meshTopology } from './topology'

/**
 * Naming a face or an edge in a way that survives a parametric edit.
 *
 * Both backends hand out identifiers derived from the geometry: the Rust kernel
 * hashes each face's centroid, normal and area; the mesh path numbers faces in a
 * canonical geometric order. Either way the identifier is a function of where
 * the face *is*, so the moment an upstream feature moves it, the identifier the
 * selection was made under stops naming anything.
 *
 * Falling back to position — "the face that now has that ordinal" — is the
 * failure mode this module exists to prevent: it silently reattaches a sketch or
 * a fillet to whatever geometry happened to inherit the name, and the user finds
 * out when they look. So a reference carries a *fingerprint* of the geometry it
 * was made against, and resolution is a search for the one face that can still
 * be shown to be the same one. When no such face can be singled out, that is a
 * dependency error and is reported as one.
 */

/** How far apart two unit normals may point and still be the same direction. */
const NORMAL_TOLERANCE = 1e-4
/** How far apart two planes may sit, along their shared normal, and still match. */
const PLANE_TOLERANCE = 1e-4
/**
 * How much a face may grow or shrink in its own plane and still be recognised.
 *
 * Generous on purpose: widening a profile changes a side wall's area without
 * making it a different face. It is the *uniqueness* of the match that carries
 * the weight here, not the tightness of this bound.
 */
const AREA_RATIO_TOLERANCE = 0.5

/** The geometry a face reference is matched by, recorded when it was made. */
export interface FaceFingerprint {
  /** Outward unit normal. */
  readonly normal: Vec3
  /** Distance from the origin to the face's plane, along `normal`. */
  readonly offset: number
  readonly centroid: Vec3
  readonly area: number
  /**
   * Whether no other face of the solid shared this normal at a greater offset.
   *
   * This is what makes "the face moved along its own normal" a sound match
   * rather than a guess: the top of an extrusion is the outermost +Z face both
   * before and after its depth changes, so the pair can be identified with each
   * other without appealing to where they happen to sit.
   */
  readonly outermost: boolean
}

/** The geometry an edge reference is matched by. */
export interface EdgeFingerprint {
  readonly midpoint: Vec3
  readonly length: number
  /** Unit direction, oriented so it points along the ascending end. */
  readonly direction: Vec3
}

/**
 * A face or edge named both by the identifier its backend issued and by the
 * geometry it had at the time. The identifier is the fast path; the fingerprint
 * is what makes the reference outlive an edit that renamed it.
 */
export interface TopologyReference<F> {
  readonly id: string
  /**
   * Absent on a reference made before fingerprints existed, or restored from a
   * file written then. Such a reference resolves by identifier alone and reports
   * itself as unverified rather than pretending to a certainty it has not got.
   */
  readonly fingerprint?: F
}

export type FaceReference = TopologyReference<FaceFingerprint>
export type EdgeReference = TopologyReference<EdgeFingerprint>

/** One face of a solid, in the uniform shape resolution works over. */
export interface FaceSurvey {
  readonly id: string
  readonly normal: Vec3
  readonly offset: number
  readonly centroid: Vec3
  readonly area: number
  /** The underlying surface, when the backend knows: "plane", "cylinder", … */
  readonly kind?: string
}

export interface EdgeSurvey {
  readonly id: string
  readonly midpoint: Vec3
  readonly length: number
  readonly direction: Vec3
}

/** How a reference was resolved, or why it could not be. */
export type ReferenceResolution =
  | {
      readonly status: 'exact'
      readonly id: string
    }
  | {
      /** The identifier moved, but exactly one face is demonstrably the same one. */
      readonly status: 'matched'
      readonly id: string
      readonly by: 'plane' | 'sweep'
    }
  | {
      /** Resolved by identifier alone, with no fingerprint to check it against. */
      readonly status: 'unverified'
      readonly id: string
    }
  | {
      readonly status: 'missing'
      readonly reason: string
    }
  | {
      /** More than one candidate fits, so picking one would be a coin toss. */
      readonly status: 'ambiguous'
      readonly reason: string
      readonly candidates: readonly string[]
    }

export function isResolved(
  resolution: ReferenceResolution,
): resolution is Extract<ReferenceResolution, { id: string }> {
  return resolution.status !== 'missing' && resolution.status !== 'ambiguous'
}

/* -------------------------------------------------------------------------- */
/* Surveying a shape                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Every face of a shape, with the geometry a reference is matched by.
 *
 * A B-Rep backend is asked directly. A mesh backend has no faces to ask, so the
 * same derivation that hands out its face identifiers is run over the triangles —
 * which is what keeps an identifier meaning the same thing on both sides.
 */
export async function surveyFaces(
  kernel: IKernel,
  shape: ShapeHandle,
): Promise<FaceSurvey[]> {
  if (isBRepKernel(kernel)) {
    return surveyFaceInfo(await kernel.faceInfo(shape))
  }
  return surveyMeshFaces(await kernel.triangulate(shape))
}

/** The same, from a backend's own face report. */
export function surveyFaceInfo(infos: readonly FaceInfo[]): FaceSurvey[] {
  return infos.map((info) => ({
    id: info.id,
    normal: info.normal,
    offset: dot(info.normal, info.centroid),
    centroid: info.centroid,
    area: info.area,
    kind: info.kind,
  }))
}

/** The same, straight off a tessellation the caller already holds. */
export function surveyMeshFaces(mesh: MeshData): FaceSurvey[] {
  return meshTopology(mesh).faces.map((face) => ({
    id: face.id,
    normal: face.normal,
    offset: face.offset,
    centroid: face.centroid,
    area: face.area,
    // Every face a mesh derivation produces is a plane by construction: it is
    // built by gathering coplanar triangles.
    kind: 'plane',
  }))
}

export async function surveyEdges(
  kernel: IKernel,
  shape: ShapeHandle,
): Promise<EdgeSurvey[]> {
  if (isBRepKernel(kernel)) {
    return surveyEdgeInfo(await kernel.edgeInfo(shape))
  }
  return surveyMeshEdges(await kernel.triangulate(shape))
}

/**
 * The same, from a backend's own edge report.
 *
 * A B-Rep edge reports no direction of its own; the midpoint and length are what
 * a reference matches on, and a zero direction is honest about that.
 */
export function surveyEdgeInfo(infos: readonly EdgeInfo[]): EdgeSurvey[] {
  return infos.map((info) => ({
    id: info.id,
    midpoint: info.midpoint,
    length: info.length,
    direction: ZERO,
  }))
}

/** The same, from a tessellation. Edge direction comes from its two endpoints. */
export function surveyMeshEdges(mesh: MeshData): EdgeSurvey[] {
  const topology = meshTopology(mesh)
  const positions = new Map(topology.vertices.map((vertex) => [vertex.id, vertex.position]))
  const surveys: EdgeSurvey[] = []
  for (const edge of topology.edges) {
    const from = positions.get(edge.vertexIds[0])
    const to = positions.get(edge.vertexIds[1])
    if (!from || !to) continue
    const span = subtract(to, from)
    const length = magnitude(span)
    surveys.push({
      id: edge.id,
      midpoint: scale(add(from, to), 0.5),
      length,
      direction: length === 0 ? span : scale(span, 1 / length),
    })
  }
  return surveys
}

/* -------------------------------------------------------------------------- */
/* Making references                                                           */
/* -------------------------------------------------------------------------- */

/** A reference to one surveyed face, fingerprinted against its siblings. */
export function faceReference(
  survey: readonly FaceSurvey[],
  faceId: string,
): FaceReference | null {
  const face = survey.find((candidate) => candidate.id === faceId)
  if (!face) return null
  return { id: face.id, fingerprint: fingerprintFace(survey, face) }
}

export function fingerprintFace(
  survey: readonly FaceSurvey[],
  face: FaceSurvey,
): FaceFingerprint {
  return {
    normal: face.normal,
    offset: face.offset,
    centroid: face.centroid,
    area: face.area,
    outermost: !survey.some(
      (other) =>
        other.id !== face.id &&
        sameDirection(other.normal, face.normal) &&
        other.offset > face.offset + PLANE_TOLERANCE,
    ),
  }
}

/** A reference to one surveyed edge. */
export function edgeReference(
  survey: readonly EdgeSurvey[],
  edgeId: string,
): EdgeReference | null {
  const edge = survey.find((candidate) => candidate.id === edgeId)
  if (!edge) return null
  return {
    id: edge.id,
    fingerprint: { midpoint: edge.midpoint, length: edge.length, direction: edge.direction },
  }
}

/* -------------------------------------------------------------------------- */
/* Resolving references                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Which face of the shape as it now stands the reference names.
 *
 * Three ways a reference can still be honoured, tried in order of how much they
 * assume:
 *
 * 1. The identifier is still there and the geometry under it has not moved.
 * 2. Exactly one face lies in the recorded plane, facing the recorded way. The
 *    face was resized or re-identified, not replaced.
 * 3. The recorded face was the outermost one facing its way, and exactly one
 *    face is outermost facing that way now. This is the case that makes editing
 *    an extrusion's depth work: the top face slides along its own normal and is
 *    still, unambiguously, the top.
 *
 * Anything else is a dependency failure. Notably a reference is *not* resolved
 * to "the nearest face" or "the face that inherited the id" — either would be a
 * silent retarget, and the caller is told to look instead.
 */
export function resolveFace(
  survey: readonly FaceSurvey[],
  reference: FaceReference,
): ReferenceResolution {
  const byId = survey.find((candidate) => candidate.id === reference.id)
  const fingerprint = reference.fingerprint

  if (!fingerprint) {
    return byId
      ? { status: 'unverified', id: byId.id }
      : { status: 'missing', reason: `Face ${reference.id} is no longer part of this solid` }
  }

  if (byId && matchesPlane(byId, fingerprint) && matchesArea(byId, fingerprint)) {
    return { status: 'exact', id: byId.id }
  }

  const coplanar = survey.filter(
    (candidate) => matchesPlane(candidate, fingerprint) && matchesArea(candidate, fingerprint),
  )
  if (coplanar.length === 1) {
    return { status: 'matched', id: (coplanar[0] as FaceSurvey).id, by: 'plane' }
  }
  if (coplanar.length > 1) {
    return {
      status: 'ambiguous',
      reason: `${coplanar.length} faces now lie where face ${reference.id} was, so it cannot be told which one was meant`,
      candidates: coplanar.map((candidate) => candidate.id),
    }
  }

  if (fingerprint.outermost) {
    const facing = survey.filter((candidate) => sameDirection(candidate.normal, fingerprint.normal))
    const outermost = extremeFaces(facing)
    if (outermost.length === 1) {
      return { status: 'matched', id: (outermost[0] as FaceSurvey).id, by: 'sweep' }
    }
    if (outermost.length > 1) {
      return {
        status: 'ambiguous',
        reason: `${outermost.length} faces are now the outermost ones facing the way face ${reference.id} did`,
        candidates: outermost.map((candidate) => candidate.id),
      }
    }
  }

  return {
    status: 'missing',
    reason: `Face ${reference.id} is no longer part of this solid, and no face has taken its place`,
  }
}

/**
 * The same for an edge, matched on where it runs.
 *
 * Edges get the plane rule's equivalent — same midpoint and same length — and
 * nothing more. An edge has no outward direction to sweep along, so there is no
 * sound second tier for it: a reference to an edge that moved is a reference
 * that has to be remade.
 */
export function resolveEdge(
  survey: readonly EdgeSurvey[],
  reference: EdgeReference,
): ReferenceResolution {
  const byId = survey.find((candidate) => candidate.id === reference.id)
  const fingerprint = reference.fingerprint

  if (!fingerprint) {
    return byId
      ? { status: 'unverified', id: byId.id }
      : { status: 'missing', reason: `Edge ${reference.id} is no longer part of this solid` }
  }

  if (byId && matchesEdge(byId, fingerprint)) return { status: 'exact', id: byId.id }

  const matches = survey.filter((candidate) => matchesEdge(candidate, fingerprint))
  if (matches.length === 1) {
    return { status: 'matched', id: (matches[0] as EdgeSurvey).id, by: 'plane' }
  }
  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      reason: `${matches.length} edges now run where edge ${reference.id} did`,
      candidates: matches.map((candidate) => candidate.id),
    }
  }
  return {
    status: 'missing',
    reason: `Edge ${reference.id} is no longer part of this solid`,
  }
}

/**
 * Resolves a list of references, keeping what resolved and reporting what did
 * not. Callers use the failures to mark a feature in error rather than building
 * quietly from a shorter list than the user selected.
 */
export interface ResolvedList {
  readonly ids: readonly string[]
  readonly failures: readonly string[]
}

export function resolveFaces(
  survey: readonly FaceSurvey[],
  references: readonly FaceReference[],
): ResolvedList {
  return collect(references.map((reference) => resolveFace(survey, reference)))
}

export function resolveEdges(
  survey: readonly EdgeSurvey[],
  references: readonly EdgeReference[],
): ResolvedList {
  return collect(references.map((reference) => resolveEdge(survey, reference)))
}

function collect(resolutions: readonly ReferenceResolution[]): ResolvedList {
  const ids: string[] = []
  const failures: string[] = []
  for (const resolution of resolutions) {
    if (isResolved(resolution)) ids.push(resolution.id)
    else failures.push(resolution.reason)
  }
  return { ids, failures }
}

/* -------------------------------------------------------------------------- */

function matchesPlane(candidate: FaceSurvey, fingerprint: FaceFingerprint): boolean {
  return (
    sameDirection(candidate.normal, fingerprint.normal) &&
    Math.abs(candidate.offset - fingerprint.offset) <= PLANE_TOLERANCE
  )
}

/**
 * Whether a face is the same size to within the slack a parametric edit gets.
 *
 * Two faces in the same plane facing the same way are usually the same face
 * already; this is what keeps a solid whose plane happens to hold two unrelated
 * faces of very different sizes from matching the wrong one.
 */
function matchesArea(candidate: FaceSurvey, fingerprint: FaceFingerprint): boolean {
  if (fingerprint.area <= 0) return true
  const ratio = candidate.area / fingerprint.area
  return ratio >= AREA_RATIO_TOLERANCE && ratio <= 1 / AREA_RATIO_TOLERANCE
}

function matchesEdge(candidate: EdgeSurvey, fingerprint: EdgeFingerprint): boolean {
  return (
    Math.abs(candidate.length - fingerprint.length) <= PLANE_TOLERANCE &&
    magnitude(subtract(candidate.midpoint, fingerprint.midpoint)) <= PLANE_TOLERANCE
  )
}

/** The faces sitting furthest along their shared normal. */
function extremeFaces(facing: readonly FaceSurvey[]): FaceSurvey[] {
  if (facing.length === 0) return []
  const furthest = Math.max(...facing.map((candidate) => candidate.offset))
  return facing.filter((candidate) => candidate.offset >= furthest - PLANE_TOLERANCE)
}

function sameDirection(a: Vec3, b: Vec3): boolean {
  return (
    Math.abs(a.x - b.x) <= NORMAL_TOLERANCE &&
    Math.abs(a.y - b.y) <= NORMAL_TOLERANCE &&
    Math.abs(a.z - b.z) <= NORMAL_TOLERANCE
  )
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 }

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function scale(vector: Vec3, factor: number): Vec3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }
}

function magnitude(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z)
}
