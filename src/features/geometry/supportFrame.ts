import type { IKernel, PlaneFrame, ShapeHandle } from '../../kernel/IKernel'
import type { FaceReference, ReferenceResolution } from '../../kernel/references'
import { isResolved, resolveFace, surveyFaces } from '../../kernel/references'
import type { SketchSupport } from '../../sketch/domain/SketchSupport'
import { isOriginPlaneSupport } from '../../sketch/domain/SketchSupport'
import { frameFromNormal } from './ReferenceGeometry'
import { offsetFrame, planeFrame } from './plane'

/**
 * Turning a sketch support into a world-space plane.
 *
 * An origin plane is pure arithmetic and resolves without asking anyone. A face
 * needs the solid it belongs to, which only exists mid-rebuild — so that path
 * is async and goes through the kernel, reading the face's own geometry rather
 * than anything cached when the sketch was created.
 */

/** Raised when a support names geometry the document no longer holds. */
export class SupportResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupportResolutionError'
  }
}

/** How a face support finds the shape it is attached to. */
export interface SupportContext {
  readonly kernel: IKernel
  /** The live shape for a body id, or undefined when it is not in the part. */
  shapeOf(bodyId: string): ShapeHandle | undefined
}

/**
 * The frame for a support that needs nothing but itself — an origin plane.
 * Returns null for a face support, which cannot be placed without the model.
 */
export function staticSupportFrame(support: SketchSupport): PlaneFrame | null {
  return isOriginPlaneSupport(support) ? planeFrame(support.plane, support.offset) : null
}

/** The world plane a sketch on `support` sits on. */
export async function resolveSupportFrame(
  support: SketchSupport,
  context: SupportContext,
): Promise<PlaneFrame> {
  return offsetFrame((await resolveSupport(support, context)).frame, support.offset)
}

/** A resolved support: where it sits, and how confidently it was identified. */
export interface ResolvedSupport {
  readonly frame: PlaneFrame
  /**
   * How the face was found again. `exact` and `unverified` mean the identifier
   * still named a face; `matched` means the identifier had moved on and the face
   * was recognised by its geometry instead. Null for an origin plane, which is
   * arithmetic and cannot be lost.
   */
  readonly resolution: ReferenceResolution | null
}

/**
 * The support's placement, together with how it was arrived at.
 *
 * Splitting this out from {@link resolveSupportFrame} is what lets the UI say
 * "this sketch followed its face through the edit" rather than leaving a
 * recovered reference indistinguishable from one that never moved.
 */
export async function resolveSupport(
  support: SketchSupport,
  context: SupportContext,
): Promise<ResolvedSupport> {
  if (isOriginPlaneSupport(support)) {
    return { frame: planeFrame(support.plane, support.offset), resolution: null }
  }

  const shape = context.shapeOf(support.bodyId)
  if (!shape) {
    throw new SupportResolutionError(
      `This sketch is attached to a face of ${support.bodyId}, which the part no longer has`,
    )
  }

  const survey = await surveyFaces(context.kernel, shape)
  const reference: FaceReference = support.fingerprint
    ? { id: support.faceId, fingerprint: support.fingerprint }
    : { id: support.faceId }
  const resolution = resolveFace(survey, reference)

  if (!isResolved(resolution)) {
    // Deliberately not "use whatever now carries that id" and not "use the
    // nearest face": either would move the sketch somewhere nobody chose and
    // say nothing about it. A reference that cannot be pinned down is a
    // dependency error, and the user is the one who gets to resolve it.
    throw new SupportResolutionError(
      `${resolution.reason}. Reattach this sketch to the face you want.`,
    )
  }

  const face = survey.find((candidate) => candidate.id === resolution.id)
  if (!face) {
    throw new SupportResolutionError(
      `Face ${support.faceId} is no longer part of ${support.bodyId}`,
    )
  }
  if (face.kind !== undefined && face.kind !== 'plane') {
    throw new SupportResolutionError(
      `Face ${face.id} is not planar, so no sketch can sit on it`,
    )
  }

  return { frame: frameFromNormal(face.centroid, face.normal), resolution }
}
