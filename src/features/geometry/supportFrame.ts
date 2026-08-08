import type { IKernel, PlaneFrame, ShapeHandle, Vec3 } from '../../kernel/IKernel'
import { isBRepKernel } from '../../kernel/IKernel'
import { meshTopology } from '../../kernel/topology'
import type { SketchSupport } from '../../sketch/domain/SketchSupport'
import { isOriginPlaneSupport } from '../../sketch/domain/SketchSupport'
import { frameFromNormal } from './ReferenceGeometry'
import { addVec3, offsetFrame, planeFrame, scaleVec3 } from './plane'

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
  if (isOriginPlaneSupport(support)) return planeFrame(support.plane, support.offset)

  const shape = context.shapeOf(support.bodyId)
  if (!shape) {
    throw new SupportResolutionError(
      `This sketch is attached to a face of ${support.bodyId}, which the part no longer has`,
    )
  }

  const face = await facePlane(context.kernel, shape, support.faceId)
  if (!face) {
    throw new SupportResolutionError(
      `Face ${support.faceId} is no longer part of ${support.bodyId}`,
    )
  }
  return offsetFrame(face, support.offset)
}

/**
 * The plane of one named face.
 *
 * A B-Rep backend is asked directly. A tessellation backend has no faces to
 * ask, so the same derivation the kernel itself uses to hand out face ids is
 * run over its triangles — which keeps the ids on both sides of this call
 * meaning the same thing.
 */
async function facePlane(
  kernel: IKernel,
  shape: ShapeHandle,
  faceId: string,
): Promise<PlaneFrame | null> {
  if (isBRepKernel(kernel)) {
    const info = (await kernel.faceInfo(shape)).find((entry) => entry.id === faceId)
    if (!info) return null
    if (info.kind !== 'plane') {
      throw new SupportResolutionError(`Face ${faceId} is not planar, so no sketch can sit on it`)
    }
    return frameFromNormal(info.centroid, info.normal)
  }

  const derived = meshTopology(await kernel.triangulate(shape))
  const face = derived.faces.find((entry) => entry.id === faceId)
  if (!face) return null

  // Anchored on the middle of the face, matching what the B-Rep path reports,
  // so the sketch origin lands in the same place whichever backend is loaded.
  const positions = new Map(derived.vertices.map((vertex) => [vertex.id, vertex.position]))
  let center: Vec3 = { x: 0, y: 0, z: 0 }
  let counted = 0
  for (const vertexId of face.vertexIds) {
    const position = positions.get(vertexId)
    if (!position) continue
    center = addVec3(center, position)
    counted += 1
  }
  const origin = counted === 0 ? scaleVec3(face.normal, face.offset) : scaleVec3(center, 1 / counted)
  return frameFromNormal(origin, face.normal)
}
