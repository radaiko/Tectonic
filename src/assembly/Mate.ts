import { newId } from '../sketch/domain/ids'
import { AssemblyError } from './types'

/** Constraints between two components: what lines up with what. */
export const MATE_TYPES = [
  'coincident',
  'concentric',
  'parallel',
  'perpendicular',
  'tangent',
  'distance',
  'angle',
  'lock',
  'fastened',
] as const
export type MateType = (typeof MATE_TYPES)[number]

/** Mates that deliberately leave motion behind: the kinematic pairs. */
export const JOINT_TYPES = [
  'revolute',
  'slider',
  'cylindrical',
  'planar',
  'ball',
  'screw',
  'gear',
  'rack-and-pinion',
] as const
export type JointType = (typeof JOINT_TYPES)[number]

/** Everything that can constrain a pair of components. */
export type MateKind = MateType | JointType

export const MATE_KINDS: readonly MateKind[] = [...MATE_TYPES, ...JOINT_TYPES]

/** How many of a component's six degrees of freedom each kind takes away. */
const DEGREES_REMOVED: Record<MateKind, number> = {
  coincident: 3,
  concentric: 4,
  parallel: 2,
  perpendicular: 1,
  tangent: 1,
  distance: 1,
  angle: 1,
  lock: 6,
  fastened: 6,
  revolute: 5,
  slider: 5,
  cylindrical: 4,
  planar: 3,
  ball: 3,
  screw: 5,
  gear: 5,
  'rack-and-pinion': 5,
}

/** A component's full freedom in space, before any mate is applied. */
export const FULL_DEGREES_OF_FREEDOM = 6

export function isJointType(type: MateKind): type is JointType {
  return (JOINT_TYPES as readonly string[]).includes(type)
}

export function isMateType(type: MateKind): type is MateType {
  return (MATE_TYPES as readonly string[]).includes(type)
}

/** How much a mate of this kind constrains the pair it joins. */
export function degreesRemovedBy(type: MateKind): number {
  return DEGREES_REMOVED[type]
}

/** How much motion a joint of this kind leaves behind. */
export function degreesOfFreedomOf(type: MateKind): number {
  return FULL_DEGREES_OF_FREEDOM - DEGREES_REMOVED[type]
}

/** How far a joint is allowed to travel. `null` at either end means unbounded. */
export interface MateLimits {
  readonly min: number | null
  readonly max: number | null
}

export interface MateParameters {
  /** Offset along the mated axis, for distance mates and sliders. */
  readonly distance: number
  /** Offset about the mated axis, in degrees. */
  readonly angle: number
  /** Lead of a screw joint, in length per turn. */
  readonly pitch: number
  /** Drive ratio of a gear, belt or rack-and-pinion joint. */
  readonly ratio: number
  /** Aligns the mated entities the opposite way round. */
  readonly flip: boolean
  readonly limits: MateLimits
}

export interface MateParametersInit {
  readonly distance?: number
  readonly angle?: number
  readonly pitch?: number
  readonly ratio?: number
  readonly flip?: boolean
  readonly limits?: Partial<MateLimits>
}

export const DEFAULT_MATE_PARAMETERS: MateParameters = {
  distance: 0,
  angle: 0,
  pitch: 0,
  ratio: 1,
  flip: false,
  limits: { min: null, max: null },
}

export interface MateJSON {
  readonly id: string
  readonly name: string
  readonly type: MateKind
  readonly componentId1: string
  readonly componentId2: string
  /** Face, edge or vertex the mate grips on the first component. */
  readonly entityRef1: string
  readonly entityRef2: string
  readonly parameters: MateParameters
  /** A locked mate is left exactly as it stands, whatever the solver decides. */
  readonly isLocked: boolean
  readonly suppressed: boolean
}

export interface MateInit {
  readonly id?: string
  readonly name?: string
  readonly type: MateKind
  readonly componentId1: string
  readonly componentId2: string
  readonly entityRef1?: string
  readonly entityRef2?: string
  readonly parameters?: MateParametersInit
  readonly isLocked?: boolean
  readonly suppressed?: boolean
}

/**
 * One relationship between two components.
 *
 * The mate holds only what the user chose — which entities, which kind, which
 * offsets. Where that puts a component is the solver's business, so the same
 * mate can be re-solved after any edit without carrying stale geometry.
 */
export class Mate {
  readonly id: string
  name: string
  type: MateKind
  componentId1: string
  componentId2: string
  entityRef1: string
  entityRef2: string
  parameters: MateParameters
  isLocked: boolean
  suppressed: boolean

  constructor(init: MateInit) {
    if (!MATE_KINDS.includes(init.type)) {
      throw new AssemblyError(`Unknown mate type: ${String(init.type)}`)
    }
    if (!init.componentId1 || !init.componentId2) {
      throw new AssemblyError('A mate joins two components')
    }
    if (init.componentId1 === init.componentId2) {
      throw new AssemblyError('A mate cannot join a component to itself')
    }

    this.id = init.id ?? newId()
    this.type = init.type
    this.name = init.name ?? defaultMateName(init.type)
    this.componentId1 = init.componentId1
    this.componentId2 = init.componentId2
    this.entityRef1 = init.entityRef1 ?? ''
    this.entityRef2 = init.entityRef2 ?? ''
    this.parameters = createMateParameters(init.parameters)
    this.isLocked = init.isLocked ?? false
    this.suppressed = init.suppressed ?? false
  }

  get isJoint(): boolean {
    return isJointType(this.type)
  }

  /** How many degrees of freedom this mate takes off the pair it joins. */
  get degreesRemoved(): number {
    return degreesRemovedBy(this.type)
  }

  /** Whether the mate touches a given component. */
  involves(componentId: string): boolean {
    return this.componentId1 === componentId || this.componentId2 === componentId
  }

  /** The component at the other end of the mate, if it holds this one. */
  other(componentId: string): string | undefined {
    if (this.componentId1 === componentId) return this.componentId2
    if (this.componentId2 === componentId) return this.componentId1
    return undefined
  }

  /** The entity this mate grips on a given component. */
  entityFor(componentId: string): string {
    if (this.componentId1 === componentId) return this.entityRef1
    if (this.componentId2 === componentId) return this.entityRef2
    throw new AssemblyError(`Mate "${this.name}" does not touch component "${componentId}"`)
  }

  setParameters(changes: MateParametersInit): MateParameters {
    this.parameters = createMateParameters({ ...this.parameters, ...changes })
    return this.parameters
  }

  toJSON(): MateJSON {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      componentId1: this.componentId1,
      componentId2: this.componentId2,
      entityRef1: this.entityRef1,
      entityRef2: this.entityRef2,
      parameters: {
        ...this.parameters,
        limits: { ...this.parameters.limits },
      },
      isLocked: this.isLocked,
      suppressed: this.suppressed,
    }
  }

  static fromJSON(json: MateJSON): Mate {
    return new Mate(json)
  }

  clone(overrides: Partial<MateInit> = {}): Mate {
    return new Mate({ ...this.toJSON(), id: newId(), ...overrides })
  }
}

export function createMateParameters(init: MateParametersInit = {}): MateParameters {
  const limits: MateLimits = {
    min: finiteOrNull(init.limits?.min),
    max: finiteOrNull(init.limits?.max),
  }
  if (limits.min !== null && limits.max !== null && limits.min > limits.max) {
    throw new AssemblyError('A mate limit cannot start after it ends')
  }
  return {
    distance: numberOr(init.distance, DEFAULT_MATE_PARAMETERS.distance),
    angle: numberOr(init.angle, DEFAULT_MATE_PARAMETERS.angle),
    pitch: numberOr(init.pitch, DEFAULT_MATE_PARAMETERS.pitch),
    ratio: numberOr(init.ratio, DEFAULT_MATE_PARAMETERS.ratio),
    flip: init.flip ?? false,
    limits,
  }
}

/** A value clamped to a joint's limits. */
export function clampToLimits(value: number, limits: MateLimits): number {
  let result = value
  if (limits.min !== null) result = Math.max(limits.min, result)
  if (limits.max !== null) result = Math.min(limits.max, result)
  return result
}

/** The name a new mate wears until it is renamed. */
export function defaultMateName(type: MateKind): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
