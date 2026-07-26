import { newId } from '../sketch/domain/ids'
import type { SheetMetalParameters } from './SheetMetalParameters'
import type { BendChain } from './bend'
import { OVERLAP_FACTOR } from './EdgeFlange'
import type { EdgeFeatureBase, HemType, ReliefType } from './types'
import { HEM_TYPES, RELIEF_TYPES, SheetMetalError } from './types'

/** How far a teardrop curls past the flat-back of an open hem. */
export const DEFAULT_TEARDROP_ANGLE = 225

/** A rolled edge wraps three quarters of a turn unless told otherwise. */
export const DEFAULT_ROLL_ANGLE = 270

export interface HemSpec extends EdgeFeatureBase {
  readonly kind: 'hem'
  readonly hemType: HemType
  /** Length of the returned material, measured from the bend's exit tangent. */
  readonly length: number
  /** Opening between the return and the face it folds back over. */
  readonly gap: number
  /** Roll radius for teardrop and rolled hems; null follows the part. */
  readonly radius: number | null
  /** Wrap angle for teardrop and rolled hems. */
  readonly angle: number
  /** Folds towards the near face of the sheet rather than the far one. */
  readonly flip: boolean
}

export interface HemInit {
  readonly id?: string
  readonly edgeIndex: number
  readonly hemType?: HemType
  readonly length?: number
  readonly gap?: number
  readonly radius?: number | null
  readonly angle?: number
  readonly flip?: boolean
  readonly trimStart?: number
  readonly trimEnd?: number
  readonly relief?: ReliefType
}

export function createHem(init: HemInit): HemSpec {
  const hemType = HEM_TYPES.includes(init.hemType as HemType)
    ? (init.hemType as HemType)
    : 'open'
  const spec: HemSpec = {
    kind: 'hem',
    id: init.id ?? newId(),
    edgeIndex: Math.trunc(init.edgeIndex),
    hemType,
    length: init.length ?? 5,
    gap: init.gap ?? 1,
    radius: init.radius ?? null,
    angle: init.angle ?? defaultWrap(hemType),
    flip: init.flip ?? false,
    trimStart: Math.max(0, init.trimStart ?? 0),
    trimEnd: Math.max(0, init.trimEnd ?? 0),
    relief: RELIEF_TYPES.includes(init.relief as ReliefType)
      ? (init.relief as ReliefType)
      : 'rectangular',
  }
  validateHem(spec)
  return spec
}

export function validateHem(spec: HemSpec): void {
  if (spec.edgeIndex < 0) throw new SheetMetalError('A hem needs an edge to attach to')
  if (!(spec.length >= 0)) throw new SheetMetalError('A hem length cannot be negative')
  if (!(spec.gap >= 0)) throw new SheetMetalError('A hem gap cannot be negative')
  if (spec.hemType === 'open' && !(spec.gap > 0)) {
    throw new SheetMetalError('An open hem needs a gap — use a closed hem for none')
  }
  if (spec.radius !== null && !(spec.radius >= 0)) {
    throw new SheetMetalError('A hem radius cannot be negative')
  }
  if (!(spec.angle > 0) || spec.angle > 360) {
    throw new SheetMetalError('A hem wrap angle must be between 0 and 360 degrees')
  }
}

function defaultWrap(hemType: HemType): number {
  switch (hemType) {
    case 'teardrop':
      return DEFAULT_TEARDROP_ANGLE
    case 'rolled':
      return DEFAULT_ROLL_ANGLE
    default:
      return 180
  }
}

/**
 * The bend a hem folds through.
 *
 * Open and closed hems fold flat back on themselves, so the gap between the two
 * faces is twice the inner radius and that is what sets it. Teardrop and rolled
 * hems curl further round; the teardrop's return is capped at the roll radius so
 * the tip closes the opening without driving back through the face below it.
 */
export function hemChain(spec: HemSpec, parameters: SheetMetalParameters): BendChain {
  validateHem(spec)
  const sign = spec.flip ? -1 : 1

  const step = (() => {
    switch (spec.hemType) {
      case 'closed':
        return { angle: 180 * sign, radius: 0, straight: spec.length }
      case 'teardrop': {
        const radius = spec.radius ?? parameters.innerRadius
        return { angle: spec.angle * sign, radius, straight: Math.min(spec.length, radius) }
      }
      case 'rolled':
        return { angle: spec.angle * sign, radius: spec.radius ?? parameters.innerRadius, straight: 0 }
      default:
        return { angle: 180 * sign, radius: spec.gap / 2, straight: spec.length }
    }
  })()

  return {
    steps: [step],
    options: { startStation: 0, startExtent: parameters.thickness * OVERLAP_FACTOR },
  }
}

/** The opening a hem leaves between its return and the face it folds over. */
export function hemOpening(spec: HemSpec, parameters: SheetMetalParameters): number {
  switch (spec.hemType) {
    case 'closed':
      return 0
    case 'teardrop':
    case 'rolled':
      return 2 * (spec.radius ?? parameters.innerRadius)
    default:
      return spec.gap
  }
}
