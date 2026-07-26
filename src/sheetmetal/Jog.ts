import { newId } from '../sketch/domain/ids'
import type { SheetMetalParameters } from './SheetMetalParameters'
import type { BendChain } from './bend'
import { OVERLAP_FACTOR } from './EdgeFlange'
import type { EdgeFeatureBase, ReliefType } from './types'
import { RELIEF_TYPES, SheetMetalError } from './types'

const DEG = Math.PI / 180

export interface JogSpec extends EdgeFeatureBase {
  readonly kind: 'jog'
  /** Perpendicular step the sheet takes across the two bends. */
  readonly offset: number
  /** Angle of each bend. 90° steps straight across; shallower angles ramp. */
  readonly angle: number
  /** Length of the run after the jog, measured to the outside corner. */
  readonly length: number
  readonly radius: number | null
  /** Steps towards the near face of the sheet rather than the far one. */
  readonly flip: boolean
}

export interface JogInit {
  readonly id?: string
  readonly edgeIndex: number
  readonly offset?: number
  readonly angle?: number
  readonly length?: number
  readonly radius?: number | null
  readonly flip?: boolean
  readonly trimStart?: number
  readonly trimEnd?: number
  readonly relief?: ReliefType
}

export function createJog(init: JogInit): JogSpec {
  const spec: JogSpec = {
    kind: 'jog',
    id: init.id ?? newId(),
    edgeIndex: Math.trunc(init.edgeIndex),
    offset: init.offset ?? 5,
    angle: init.angle ?? 90,
    length: init.length ?? 10,
    radius: init.radius ?? null,
    flip: init.flip ?? false,
    trimStart: Math.max(0, init.trimStart ?? 0),
    trimEnd: Math.max(0, init.trimEnd ?? 0),
    relief: RELIEF_TYPES.includes(init.relief as ReliefType)
      ? (init.relief as ReliefType)
      : 'rectangular',
  }
  validateJog(spec)
  return spec
}

export function validateJog(spec: JogSpec): void {
  if (spec.edgeIndex < 0) throw new SheetMetalError('A jog needs an edge to attach to')
  if (!(spec.offset > 0)) throw new SheetMetalError('A jog needs a positive offset')
  if (!(spec.length > 0)) throw new SheetMetalError('A jog needs a positive run after it')
  if (!(spec.angle > 0) || spec.angle >= 180) {
    throw new SheetMetalError('A jog angle must be between 0 and 180 degrees')
  }
  if (spec.radius !== null && !(spec.radius >= 0)) {
    throw new SheetMetalError('A jog bend radius cannot be negative')
  }
}

/**
 * The two opposed bends a jog folds through: out to the offset, then back
 * parallel to where it started.
 *
 * The web between them is sized from the virtual sharp corners — its outside
 * length is `offset / sin(angle)` — and then shortened by the setback each bend
 * eats out of it.
 */
export function jogChain(spec: JogSpec, parameters: SheetMetalParameters): BendChain {
  validateJog(spec)
  const radius = spec.radius ?? parameters.innerRadius
  const sign = spec.flip ? -1 : 1
  const setback = parameters.outsideSetback(spec.angle, radius)
  const web = spec.offset / Math.sin(spec.angle * DEG) - 2 * setback
  const runout = spec.length - setback

  if (web < 0) {
    throw new SheetMetalError(
      'This jog offset is too small for its bend radius — reduce the radius or increase the offset',
    )
  }
  if (runout < 0) {
    throw new SheetMetalError('This jog leaves no material after its second bend')
  }

  return {
    steps: [
      { angle: spec.angle * sign, radius, straight: web },
      { angle: -spec.angle * sign, radius, straight: runout },
    ],
    options: {
      startStation: -setback,
      startExtent: parameters.thickness * OVERLAP_FACTOR,
    },
  }
}
