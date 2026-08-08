import type { Body } from '../domain/Document'
import { frameFromNormal } from '../features/geometry/ReferenceGeometry'
import { offsetFrame, planeFrame, toWorld } from '../features/geometry/plane'
import type { PlaneFrame, Vec3 } from '../kernel/IKernel'
import type { FaceReference } from '../kernel/references'
import { isResolved, resolveFace, surveyMeshFaces } from '../kernel/references'
import { meshTopology } from '../kernel/topology'
import type { SketchEntity } from '../sketch/domain/SketchEntity'
import type { SketchModel } from '../sketch/domain/SketchModel'
import { isOriginPlaneSupport } from '../sketch/domain/SketchSupport'
import { tessellate } from '../sketch/domain/query'

/**
 * Sketch geometry, lifted onto its support plane so the 3D view can draw it.
 *
 * Until now a sketch existed only on the drawing surface: finish one and it
 * vanished, which left the 3D view unable to show what a part is *about* to be
 * built from and left the user with nothing to point at when a command asked
 * which sketch to consume. This module is the missing half — it turns each
 * sketch into world-space polylines, through the very same frame the feature
 * engine resolves when it builds from that sketch, so what is drawn is where the
 * geometry actually is rather than a second guess at it.
 *
 * It is deliberately pure data. The overlay knows nothing about three.js, holds
 * no scene objects and has no opinion about colour; the viewport decides how a
 * construction curve differs from a real one. That is what makes "does a sketch
 * on a face land on that face" a question a test can answer without a GPU.
 */

/** One tessellated curve of a sketch, in world space. */
export interface OverlayCurve {
  /** The entity this came from, so a pick can name it. */
  readonly entityId: string
  readonly points: readonly Vec3[]
  /**
   * Construction geometry — drawn dimmer and dashed, and never part of a
   * profile. The projected boundary of a support face is the common case.
   */
  readonly construction: boolean
}

export interface SketchOverlay {
  readonly sketchId: string
  readonly name: string
  /**
   * Whether the sketch is shown in 3D. A hidden sketch still produces an
   * overlay entry — it is still in the document, and the browser still lists it
   * — but the viewport draws nothing for it and it cannot be picked.
   */
  readonly visible: boolean
  /** Where the sketch sits, for anything that needs the plane rather than the curves. */
  readonly frame: PlaneFrame
  readonly curves: readonly OverlayCurve[]
}

/**
 * A sketch that could not be placed, and why.
 *
 * A face-attached sketch whose body has been deleted, or whose face an edit made
 * unrecognisable, has no plane to be drawn on. Saying so is the point: silently
 * dropping it from the 3D view would look exactly like a sketch that is empty.
 */
export interface SketchOverlayProblem {
  readonly sketchId: string
  readonly name: string
  readonly reason: string
}

export interface SketchOverlayResult {
  readonly overlays: readonly SketchOverlay[]
  readonly problems: readonly SketchOverlayProblem[]
}

const NO_OVERLAYS: SketchOverlayResult = { overlays: [], problems: [] }

/** Overlays for every sketch in the document, in document order. */
export function buildSketchOverlays(
  sketches: readonly SketchModel[],
  bodies: readonly Body[],
): SketchOverlayResult {
  if (sketches.length === 0) return NO_OVERLAYS

  const overlays: SketchOverlay[] = []
  const problems: SketchOverlayProblem[] = []

  for (const sketch of sketches) {
    const placed = resolveOverlayFrame(sketch, bodies)
    if (placed.status !== 'ok') {
      problems.push({ sketchId: sketch.id, name: sketch.name, reason: placed.reason })
      continue
    }
    overlays.push({
      sketchId: sketch.id,
      name: sketch.name,
      visible: sketch.visible,
      frame: placed.frame,
      curves: overlayCurves(sketch, placed.frame),
    })
  }

  return { overlays, problems }
}

type FramePlacement =
  | { readonly status: 'ok'; readonly frame: PlaneFrame }
  | { readonly status: 'unavailable'; readonly reason: string }

/**
 * Where a sketch's support puts it, from the tessellation the viewport is
 * already drawing.
 *
 * An origin plane is arithmetic. A face is looked up the same way the rebuild
 * looks it up — by identifier, falling back to the fingerprint the support
 * recorded — so the overlay follows the face through an edit exactly as far as
 * the model does, and gives up in exactly the same places.
 */
export function resolveOverlayFrame(
  sketch: SketchModel,
  bodies: readonly Body[],
): FramePlacement {
  const support = sketch.support
  if (isOriginPlaneSupport(support)) {
    return { status: 'ok', frame: planeFrame(support.plane, support.offset) }
  }

  const body = bodies.find((candidate) => candidate.id === support.bodyId)
  if (!body) {
    return {
      status: 'unavailable',
      reason: `${sketch.name} is attached to a face of ${support.bodyId}, which the part no longer has`,
    }
  }

  const survey = surveyMeshFaces(body.mesh)
  const reference: FaceReference = support.fingerprint
    ? { id: support.faceId, fingerprint: support.fingerprint }
    : { id: support.faceId }
  const resolution = resolveFace(survey, reference)
  if (!isResolved(resolution)) {
    return { status: 'unavailable', reason: `${sketch.name}: ${resolution.reason}` }
  }

  const face = meshTopology(body.mesh).faces.find(
    (candidate) => candidate.id === resolution.id,
  )
  if (!face) {
    return {
      status: 'unavailable',
      reason: `${sketch.name} names a face ${body.name} no longer has`,
    }
  }

  return {
    status: 'ok',
    frame: offsetFrame(frameFromNormal(face.centroid, face.normal), support.offset),
  }
}

/** Every drawable curve of a sketch, lifted onto its frame. */
function overlayCurves(sketch: SketchModel, frame: PlaneFrame): OverlayCurve[] {
  const curves: OverlayCurve[] = []
  for (const entity of sketch.entities.values()) {
    // Points carry no length, and drawing one per corner of every rectangle
    // would bury the model in dots. The curves are what says where a sketch is.
    if (entity.type === 'point') continue
    if (isOwnedByComposite(sketch, entity)) continue
    const points = tessellate(sketch, entity).map((point) => toWorld(frame, point))
    if (points.length < 2) continue
    curves.push({ entityId: entity.id, points, construction: entity.isConstruction })
  }
  return curves
}

/**
 * Whether a composite entity already draws this one.
 *
 * A rectangle owns its four lines; drawing both would put two coincident
 * polylines over every edge, which reads as a heavier line and picks
 * unpredictably.
 */
function isOwnedByComposite(sketch: SketchModel, entity: SketchEntity): boolean {
  for (const other of sketch.entities.values()) {
    if (other.id === entity.id) continue
    if (other.type !== 'rectangle') continue
    if (other.lineIds.includes(entity.id)) return true
  }
  return false
}
