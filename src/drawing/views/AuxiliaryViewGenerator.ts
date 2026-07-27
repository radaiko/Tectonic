import type { MeshData, MeshPoint } from '../../domain/MeshData'
import type { AuxiliaryReference } from '../domain/DrawingView'
import type { ViewGeometry, ViewGeometryOptions } from './ViewGenerator'
import { generateViewGeometry } from './ViewGenerator'
import type { ProjectionFrame } from './viewAxes'
import { frameAcrossLine, frameFromDirection, negate } from './viewAxes'

/**
 * Auxiliary views: looking square at something that is square to nothing.
 *
 * An inclined face shows up in an ordinary view as a line, and the true shape
 * of that face is what you see looking along its normal. Since the face
 * contains the parent's line of sight, its normal is fixed by that line alone —
 * the same construction a section view uses — so an auxiliary view is taken by
 * pointing at the edge the face appears as, exactly as it is on the board.
 *
 * A face normal can also be given directly, for callers that have the model's
 * topology to hand rather than a line the user drew.
 */

export interface AuxiliaryOptions extends ViewGeometryOptions {
  readonly parentFrame: ProjectionFrame
  /** The edge in the parent view the auxiliary is taken square to. */
  readonly reference: AuxiliaryReference
}

export interface AuxiliaryFaceOptions extends ViewGeometryOptions {
  /** Outward normal of the face to look at, in model space. */
  readonly faceNormal: MeshPoint
  /** Keeps the auxiliary the same way up as this frame where it can. */
  readonly upHint?: MeshPoint
}

export interface AuxiliaryGeometry extends ViewGeometry {
  readonly frame: ProjectionFrame
}

/** The frame an auxiliary taken across `reference` is seen through. */
export function auxiliaryFrame(
  parentFrame: ProjectionFrame,
  reference: AuxiliaryReference,
): ProjectionFrame {
  return frameAcrossLine(parentFrame, reference.start, reference.end, reference.flip ?? false)
}

export function generateAuxiliaryView(
  mesh: MeshData,
  options: AuxiliaryOptions,
): AuxiliaryGeometry {
  const frame = auxiliaryFrame(options.parentFrame, options.reference)
  return { ...generateViewGeometry(mesh, frame, options), frame }
}

/**
 * An auxiliary taken square to a face. The eye sits on the outward side of it,
 * so the line of sight runs back along the normal.
 */
export function generateFaceAuxiliaryView(
  mesh: MeshData,
  options: AuxiliaryFaceOptions,
): AuxiliaryGeometry {
  const frame = options.upHint
    ? frameFromDirection(negate(options.faceNormal), options.upHint)
    : frameFromDirection(negate(options.faceNormal))
  return { ...generateViewGeometry(mesh, frame, options), frame }
}
