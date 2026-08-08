import type { MeshData } from '../../domain/MeshData'
import type { EdgeReference, FaceReference } from '../../kernel/references'
import { edgeReference, faceReference, surveyMeshEdges, surveyMeshFaces } from '../../kernel/references'
import type { FeatureParameters, ParameterValue } from './parameters'

/**
 * Feature parameters that name a face or an edge of a solid.
 *
 * The bare identifier a pick produces is not a durable name: both backends
 * derive it from the geometry, so the moment an upstream feature moves the face
 * the identifier stops naming it. Storing only that leaves a fillet to attach
 * itself to whatever inherited the name — a silent retarget the user finds out
 * about by looking.
 *
 * So a pick is recorded twice: the identifier, in the plain `faceIds`/`edgeIds`
 * the kernels already take, and alongside it a fingerprinted reference under
 * `faceRefs`/`edgeRefs`. The identifiers keep working for every caller that
 * never learned about references; the references are what {@link
 * resolveGeometrySelection} uses to either find the geometry again or say
 * plainly that it could not.
 */

/** Which kind of geometry a selection parameter names. */
export type GeometryKind = 'face' | 'edge'

/** The parameter key holding the bare identifiers, per kind. */
export const ID_KEYS: Readonly<Record<GeometryKind, string>> = {
  face: 'faceIds',
  edge: 'edgeIds',
}

/** The parameter key holding the fingerprinted references, per kind. */
export const REF_KEYS: Readonly<Record<GeometryKind, string>> = {
  face: 'faceRefs',
  edge: 'edgeRefs',
}

/**
 * A stored reference: which body it was picked on, plus the reference itself.
 *
 * The body is part of the reference and not inferred from the feature's target
 * list, because those are different questions. "Round these two edges" names
 * edges that belong to one body; the feature may still be pointed at several.
 */
export interface StoredFaceReference extends FaceReference {
  readonly bodyId: string
}

export interface StoredEdgeReference extends EdgeReference {
  readonly bodyId: string
}

export type StoredReference = StoredFaceReference | StoredEdgeReference

/** A body as reference-building sees it: an id and the mesh it drew as. */
export interface ReferenceBody {
  readonly id: string
  readonly mesh: MeshData
}

/**
 * Fingerprints a list of picked identifiers against the bodies as they stand.
 *
 * Identifiers that belong to none of the bodies are dropped rather than stored
 * unfingerprinted: a reference that cannot be checked is worse than no reference
 * at all, because resolution would take it at face value.
 */
export function buildReferences(
  bodies: readonly ReferenceBody[],
  kind: 'face',
  ids: readonly string[],
): StoredFaceReference[]
export function buildReferences(
  bodies: readonly ReferenceBody[],
  kind: 'edge',
  ids: readonly string[],
): StoredEdgeReference[]
export function buildReferences(
  bodies: readonly ReferenceBody[],
  kind: GeometryKind,
  ids: readonly string[],
): StoredReference[]
export function buildReferences(
  bodies: readonly ReferenceBody[],
  kind: GeometryKind,
  ids: readonly string[],
): StoredReference[] {
  const wanted = new Set(ids)
  if (wanted.size === 0) return []

  const built = new Map<string, StoredReference>()
  for (const body of bodies) {
    if (kind === 'face') {
      const survey = surveyMeshFaces(body.mesh)
      for (const face of survey) {
        if (!wanted.has(face.id) || built.has(face.id)) continue
        const reference = faceReference(survey, face.id)
        if (reference) built.set(face.id, { ...reference, bodyId: body.id })
      }
    } else {
      const survey = surveyMeshEdges(body.mesh)
      for (const edge of survey) {
        if (!wanted.has(edge.id) || built.has(edge.id)) continue
        const reference = edgeReference(survey, edge.id)
        if (reference) built.set(edge.id, { ...reference, bodyId: body.id })
      }
    }
  }

  // Pick order, not survey order: it is what a variable-radius fillet blends
  // along, and what the user sees in the chips.
  return ids.map((id) => built.get(id)).filter((entry): entry is StoredReference => entry !== undefined)
}

/**
 * The parameter patch that records a pick: the identifiers and their references,
 * written together so the two can never describe different selections.
 */
export function referencePatch(
  bodies: readonly ReferenceBody[],
  kind: GeometryKind,
  ids: readonly string[],
): FeatureParameters {
  return {
    [ID_KEYS[kind]]: [...ids],
    [REF_KEYS[kind]]: buildReferences(bodies, kind, ids) as unknown as ParameterValue,
  }
}

/**
 * The references a feature holds, read back out of its parameters.
 *
 * Anything malformed is skipped: parameters round-trip through a file that a
 * human may have edited, and a half-read fingerprint would match the wrong face
 * rather than failing.
 */
export function readReferences(
  parameters: FeatureParameters,
  kind: 'face',
): StoredFaceReference[]
export function readReferences(
  parameters: FeatureParameters,
  kind: 'edge',
): StoredEdgeReference[]
export function readReferences(
  parameters: FeatureParameters,
  kind: GeometryKind,
): StoredReference[]
export function readReferences(
  parameters: FeatureParameters,
  kind: GeometryKind,
): StoredReference[] {
  const raw = parameters[REF_KEYS[kind]]
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => (kind === 'face' ? faceRefFromValue(entry) : edgeRefFromValue(entry)))
    .filter((entry): entry is StoredReference => entry !== null)
}

function faceRefFromValue(value: ParameterValue): StoredFaceReference | null {
  const record = asRecord(value)
  if (!record) return null
  const { id, bodyId } = record
  if (typeof id !== 'string' || id === '' || typeof bodyId !== 'string' || bodyId === '') return null

  const print = asRecord(record.fingerprint)
  if (!print) return { id, bodyId }
  const normal = vec3(print.normal)
  const centroid = vec3(print.centroid)
  if (!normal || !centroid) return { id, bodyId }
  if (typeof print.offset !== 'number' || typeof print.area !== 'number') return { id, bodyId }

  return {
    id,
    bodyId,
    fingerprint: {
      normal,
      centroid,
      offset: print.offset,
      area: print.area,
      outermost: print.outermost === true,
    },
  }
}

function edgeRefFromValue(value: ParameterValue): StoredEdgeReference | null {
  const record = asRecord(value)
  if (!record) return null
  const { id, bodyId } = record
  if (typeof id !== 'string' || id === '' || typeof bodyId !== 'string' || bodyId === '') return null

  const print = asRecord(record.fingerprint)
  if (!print) return { id, bodyId }
  const midpoint = vec3(print.midpoint)
  const direction = vec3(print.direction)
  if (!midpoint || !direction || typeof print.length !== 'number') return { id, bodyId }

  return { id, bodyId, fingerprint: { midpoint, direction, length: print.length } }
}

function asRecord(value: ParameterValue | undefined): Record<string, ParameterValue> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, ParameterValue>
}

function vec3(value: ParameterValue | undefined): { x: number; y: number; z: number } | null {
  const record = asRecord(value)
  if (!record) return null
  const { x, y, z } = record
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
  return { x, y, z }
}
