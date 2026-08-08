/**
 * What a sketch is attached to.
 *
 * A sketch is not free-floating 2D: it lives on a support, and its coordinates
 * only mean something once that support has been placed in the world. Two kinds
 * exist — one of the three planes every document starts with, or a planar face
 * of a solid the history has already built.
 *
 * Supports are plain, immutable data addressed by stable identifiers, never by
 * a frame captured at the moment of creation. That is what lets a face-attached
 * sketch move with the face when the feature that made it is edited: the
 * reference survives the rebuild, and the plane is recomputed from it.
 */

/** One of the three planes every document starts with. */
export type SketchPlane = 'XY' | 'XZ' | 'YZ'

export const ORIGIN_PLANES: readonly SketchPlane[] = ['XY', 'XZ', 'YZ']

export function isSketchPlane(value: unknown): value is SketchPlane {
  return value === 'XY' || value === 'XZ' || value === 'YZ'
}

/** A sketch on a base plane, optionally shifted along that plane's normal. */
export interface OriginPlaneSupport {
  readonly kind: 'origin-plane'
  readonly plane: SketchPlane
  /** Distance along the plane's normal. Zero for a sketch on the plane itself. */
  readonly offset: number
}

/**
 * A sketch on a planar face of a solid. The face is named by the body it
 * belongs to and the face id that body's topology hands out, so the reference
 * outlives a rebuild that leaves the face where it was.
 */
export interface FaceSupport {
  readonly kind: 'face'
  readonly bodyId: string
  readonly faceId: string
  /** Distance along the face's outward normal. Zero for a sketch on the face. */
  readonly offset: number
}

export type SketchSupport = OriginPlaneSupport | FaceSupport

/** Serialised form. Identical to the live one — a support is already plain data. */
export type SketchSupportJSON = SketchSupport

export function originPlaneSupport(plane: SketchPlane, offset = 0): OriginPlaneSupport {
  return { kind: 'origin-plane', plane, offset }
}

export function faceSupport(bodyId: string, faceId: string, offset = 0): FaceSupport {
  return { kind: 'face', bodyId, faceId, offset }
}

export function isOriginPlaneSupport(support: SketchSupport): support is OriginPlaneSupport {
  return support.kind === 'origin-plane'
}

export function isFaceSupport(support: SketchSupport): support is FaceSupport {
  return support.kind === 'face'
}

export function sameSupport(a: SketchSupport, b: SketchSupport): boolean {
  if (a.kind !== b.kind) return false
  if (a.offset !== b.offset) return false
  return a.kind === 'origin-plane'
    ? a.plane === (b as OriginPlaneSupport).plane
    : a.bodyId === (b as FaceSupport).bodyId && a.faceId === (b as FaceSupport).faceId
}

/**
 * Reads a support back from untrusted JSON.
 *
 * Anything unrecognised falls back to the XY plane rather than failing the
 * open — a sketch on a plane the user did not choose is worth more than a file
 * that will not load, and it matches how the rest of the format treats damage.
 */
export function supportFromJSON(value: unknown, fallback: SketchPlane = 'XY'): SketchSupport {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return originPlaneSupport(fallback)
  }
  const candidate = value as Record<string, unknown>
  const offset = typeof candidate.offset === 'number' ? candidate.offset : 0

  if (candidate.kind === 'face') {
    const { bodyId, faceId } = candidate
    if (typeof bodyId === 'string' && bodyId !== '' && typeof faceId === 'string' && faceId !== '') {
      return faceSupport(bodyId, faceId, offset)
    }
    return originPlaneSupport(fallback, offset)
  }

  return originPlaneSupport(isSketchPlane(candidate.plane) ? candidate.plane : fallback, offset)
}

/** How a support reads in the sketch list, e.g. "XZ plane" or "Face of body-1". */
export function describeSupport(support: SketchSupport): string {
  const base =
    support.kind === 'origin-plane'
      ? `${support.plane} plane`
      : `Face of ${support.bodyId}`
  return support.offset === 0 ? base : `${base} ${formatOffset(support.offset)}`
}

function formatOffset(offset: number): string {
  return `${offset > 0 ? '+' : '−'}${Math.abs(offset)}`
}
