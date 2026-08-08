import type { Body } from '../domain/Document'
import type { Vec3 } from '../kernel/IKernel'
import { meshTopology } from '../kernel/topology'

/**
 * The faces a sketch can be attached to, read off the bodies the last rebuild
 * produced.
 *
 * This stands in for picking a face in the viewport, which does not exist yet.
 * The ids come from {@link meshTopology}, which is the same derivation the
 * support resolver runs when it places the sketch — so an id chosen here means
 * the same face there. Every face it reports is planar by construction: it
 * builds them by gathering coplanar triangles.
 *
 * The identity is geometric, not historical. A face keeps its id as long as the
 * solid's shape keeps it in the same place; a feature that moves or splits it
 * will invalidate the reference, and the sketch then reports the failure rather
 * than silently landing somewhere else.
 */

/** Faces listed per body. Beyond this the list stops being a usable menu. */
export const MAX_FACES_PER_BODY = 12

/** A face named the way a sketch support names it: body first, then face. */
export interface FaceReference {
  readonly bodyId: string
  readonly faceId: string
}

export interface PlanarFaceOption extends FaceReference {
  /** How the face reads in the picker, e.g. "Face 1 — facing +Z". */
  readonly label: string
  /** The picker's option value. See {@link faceTargetValue}. */
  readonly value: string
}

/**
 * Packs a face reference into the single string a `<select>` option can carry.
 *
 * It is a JSON pair rather than two ids joined by a separator character: ids
 * arrive from opened files, so no character can be assumed absent from them,
 * and a separator that turns up inside an id would silently split it in the
 * wrong place. This encoding belongs to the picker alone — what ends up on the
 * sketch is a `FaceSupport` with the two ids apart, which is the form the file
 * format stores.
 */
export function faceTargetValue(face: FaceReference): string {
  return JSON.stringify([face.bodyId, face.faceId])
}

/**
 * Reads a picker value back into its two ids, or null if it is not one
 * {@link faceTargetValue} wrote — the empty "choose a face…" value included.
 */
export function parseFaceTarget(value: string): FaceReference | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length !== 2) return null
  const [bodyId, faceId] = parsed as readonly unknown[]
  if (typeof bodyId !== 'string' || bodyId === '') return null
  if (typeof faceId !== 'string' || faceId === '') return null
  return { bodyId, faceId }
}

export interface PlanarFaceGroup {
  readonly bodyId: string
  readonly bodyName: string
  readonly faces: readonly PlanarFaceOption[]
  /** How many of the body's faces the cap left out. Zero when all are listed. */
  readonly omitted: number
}

/**
 * Every attachable face, grouped by body and largest first, so the faces a user
 * is likely to want are the ones that survive the cap.
 */
export function planarFaceGroups(
  bodies: readonly Body[],
  limit: number = MAX_FACES_PER_BODY,
): PlanarFaceGroup[] {
  return bodies
    .map((body) => {
      // Triangle count stands in for area: within one tessellation the bigger
      // face gets more triangles, and it needs no extra geometry pass.
      const ranked = [...meshTopology(body.mesh).faces].sort(
        (a, b) => b.triangles.length - a.triangles.length,
      )
      const shown = ranked.slice(0, Math.max(0, limit))
      return {
        bodyId: body.id,
        bodyName: body.name,
        faces: shown.map((face, index) => ({
          bodyId: body.id,
          faceId: face.id,
          label: `Face ${index + 1} — facing ${describeNormal(face.normal)}`,
          value: faceTargetValue({ bodyId: body.id, faceId: face.id }),
        })),
        omitted: ranked.length - shown.length,
      }
    })
    .filter((group) => group.faces.length > 0)
}

/** An axis name when the normal is along one, otherwise a plain description. */
export function describeNormal(normal: Vec3): string {
  const axes: readonly (readonly [keyof Vec3, string])[] = [
    ['x', 'X'],
    ['y', 'Y'],
    ['z', 'Z'],
  ]
  for (const [component, name] of axes) {
    const value = normal[component]
    if (value > 0.999) return `+${name}`
    if (value < -0.999) return `−${name}`
  }
  return 'an angle'
}
