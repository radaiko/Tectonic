import { newId } from '../sketch/domain/ids'
import type { SheetMetalParameters } from './SheetMetalParameters'
import type { BendChain } from './bend'
import type { EdgeFeatureBase, LengthMode, ReliefType } from './types'
import { LENGTH_MODES, RELIEF_TYPES, SheetMetalError } from './types'

/** A square corner: what a flange folds to unless told otherwise. */
export const DEFAULT_FLANGE_ANGLE = 90

/**
 * How far a chain reaches back into the face it grows from, so the union of the
 * two overlaps instead of meeting on a single coincident face.
 */
export const OVERLAP_FACTOR = 1

export interface EdgeFlangeSpec extends EdgeFeatureBase {
  readonly kind: 'edge-flange'
  /** Length of the flange, measured as `lengthMode` says. */
  readonly length: number
  /** Bend angle away from the base face, in degrees. */
  readonly angle: number
  /** Inner radius for this flange alone; null follows the part's setting. */
  readonly radius: number | null
  readonly lengthMode: LengthMode
  /** Folds towards the near face of the sheet rather than the far one. */
  readonly flip: boolean
  /** Mitres this flange where it meets another one at a shared corner. */
  readonly miteredCorners: boolean
}

export interface EdgeFlangeInit {
  readonly id?: string
  readonly edgeIndex: number
  readonly length?: number
  readonly angle?: number
  readonly radius?: number | null
  readonly lengthMode?: LengthMode
  readonly flip?: boolean
  readonly miteredCorners?: boolean
  readonly trimStart?: number
  readonly trimEnd?: number
  readonly relief?: ReliefType
}

export function createEdgeFlange(init: EdgeFlangeInit): EdgeFlangeSpec {
  const spec: EdgeFlangeSpec = {
    kind: 'edge-flange',
    id: init.id ?? newId(),
    edgeIndex: Math.trunc(init.edgeIndex),
    length: init.length ?? 10,
    angle: init.angle ?? DEFAULT_FLANGE_ANGLE,
    radius: init.radius ?? null,
    lengthMode: LENGTH_MODES.includes(init.lengthMode as LengthMode)
      ? (init.lengthMode as LengthMode)
      : 'outside',
    flip: init.flip ?? false,
    miteredCorners: init.miteredCorners ?? false,
    trimStart: Math.max(0, init.trimStart ?? 0),
    trimEnd: Math.max(0, init.trimEnd ?? 0),
    relief: RELIEF_TYPES.includes(init.relief as ReliefType)
      ? (init.relief as ReliefType)
      : 'rectangular',
  }
  validateEdgeFlange(spec)
  return spec
}

export function validateEdgeFlange(spec: EdgeFlangeSpec): void {
  if (spec.edgeIndex < 0) throw new SheetMetalError('A flange needs an edge to attach to')
  if (!(spec.length > 0)) throw new SheetMetalError('A flange needs a positive length')
  if (!(Math.abs(spec.angle) > 0) || Math.abs(spec.angle) >= 180) {
    throw new SheetMetalError('A flange angle must be between 0 and 180 degrees')
  }
  if (spec.radius !== null && !(spec.radius >= 0)) {
    throw new SheetMetalError('A flange bend radius cannot be negative')
  }
}

/** The inner radius this flange bends at. */
export function flangeRadius(
  spec: { readonly radius: number | null },
  parameters: SheetMetalParameters,
): number {
  return spec.radius ?? parameters.innerRadius
}

/**
 * The single bend a flange folds through.
 *
 * A length quoted to the outside includes the material the bend eats, so the
 * straight run is shortened by the setback and the bend's tangent moves the
 * same distance back inside the face.
 */
export function edgeFlangeChain(
  spec: EdgeFlangeSpec,
  parameters: SheetMetalParameters,
): BendChain {
  validateEdgeFlange(spec)
  const radius = flangeRadius(spec, parameters)
  const setback = spec.lengthMode === 'outside' ? parameters.outsideSetback(spec.angle, radius) : 0
  const straight = spec.length - setback

  if (straight < 0) {
    throw new SheetMetalError(
      'This flange is shorter than the bend it would need — increase the length or reduce the radius',
    )
  }

  return {
    steps: [{ angle: spec.flip ? -spec.angle : spec.angle, radius, straight }],
    options: {
      startStation: -setback,
      startExtent: parameters.thickness * OVERLAP_FACTOR,
    },
  }
}
