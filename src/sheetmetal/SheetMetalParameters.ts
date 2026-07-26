import type { BendMethod, ReliefType } from './types'
import { BEND_METHODS, RELIEF_TYPES, SheetMetalError } from './types'

const DEG = Math.PI / 180

/**
 * A 180° bend has no finite sharp corner, so the setback of anything folded
 * that far is clamped just short of it rather than running off to infinity.
 */
const MAX_SETBACK_ANGLE = 179

export interface SheetMetalParametersJSON {
  readonly material: string
  readonly thickness: number
  readonly innerRadius: number
  readonly kFactor: number
  readonly bendMethod: BendMethod
  /** Allowance for a 90° bend; other angles scale with the angle. */
  readonly bendAllowance: number
  /** Deduction for a 90° bend; other angles scale with the angle. */
  readonly bendDeduction: number
  readonly reliefType: ReliefType
  readonly reliefWidth: number
  readonly reliefDepth: number
}

export interface SheetMetalParametersInit {
  readonly material?: string
  readonly thickness?: number
  readonly innerRadius?: number
  readonly kFactor?: number
  readonly bendMethod?: BendMethod
  readonly bendAllowance?: number
  readonly bendDeduction?: number
  readonly reliefType?: ReliefType
  /** Defaults to half the thickness. */
  readonly reliefWidth?: number
  /** Defaults to the thickness plus the inner radius. */
  readonly reliefDepth?: number
}

/**
 * The material settings every bend in a part is developed from.
 *
 * The outer radius is not stored: it is always the inner radius plus the
 * thickness, so there is one place a radius can be edited and no way for the
 * two to disagree.
 */
export class SheetMetalParameters {
  readonly material: string
  readonly thickness: number
  readonly innerRadius: number
  readonly kFactor: number
  readonly bendMethod: BendMethod
  readonly bendAllowance: number
  readonly bendDeduction: number
  readonly reliefType: ReliefType
  readonly reliefWidth: number
  readonly reliefDepth: number

  constructor(init: SheetMetalParametersInit = {}) {
    this.material = init.material ?? 'Steel'
    this.thickness = init.thickness ?? 1
    this.innerRadius = init.innerRadius ?? 1
    this.kFactor = init.kFactor ?? 0.33
    this.bendMethod = BEND_METHODS.includes(init.bendMethod as BendMethod)
      ? (init.bendMethod as BendMethod)
      : 'k-factor'
    this.reliefType = RELIEF_TYPES.includes(init.reliefType as ReliefType)
      ? (init.reliefType as ReliefType)
      : 'rectangular'

    if (!(this.thickness > 0)) {
      throw new SheetMetalError('Sheet thickness must be greater than zero')
    }
    if (!(this.innerRadius >= 0)) {
      throw new SheetMetalError('Inner bend radius cannot be negative')
    }
    if (!(this.kFactor >= 0 && this.kFactor <= 1)) {
      throw new SheetMetalError('K-factor must be between 0 and 1')
    }

    // A 90° bend is the reference both tabulated quantities are quoted at.
    this.bendAllowance = init.bendAllowance ?? kFactorAllowance(90, this.innerRadius, this)
    this.bendDeduction =
      init.bendDeduction ?? 2 * this.outsideSetback(90) - kFactorAllowance(90, this.innerRadius, this)
    this.reliefWidth = init.reliefWidth ?? this.thickness / 2
    this.reliefDepth = init.reliefDepth ?? this.thickness + this.innerRadius
  }

  /** Inner radius plus thickness — the radius the outside of a bend follows. */
  get outerRadius(): number {
    return this.innerRadius + this.thickness
  }

  /**
   * Developed length of the bend region itself, i.e. how much flat material a
   * bend of this angle consumes.
   */
  allowanceFor(angle: number, radius = this.innerRadius): number {
    const turn = Math.abs(angle)
    if (turn === 0) return 0

    switch (this.bendMethod) {
      case 'bend-allowance':
        return (this.bendAllowance * turn) / 90
      case 'bend-deduction':
        return 2 * this.outsideSetback(turn, radius) - (this.bendDeduction * turn) / 90
      default:
        return kFactorAllowance(turn, radius, this)
    }
  }

  /**
   * How far the bend's tangent sits inside the virtual sharp corner the two
   * outside faces would meet at.
   */
  outsideSetback(angle: number, radius = this.innerRadius): number {
    const turn = Math.min(Math.abs(angle), MAX_SETBACK_ANGLE)
    if (turn === 0) return 0
    return (radius + this.thickness) * Math.tan((turn / 2) * DEG)
  }

  /**
   * How much shorter the flat is than the sum of the two outside legs it folds
   * into: `BD = 2 · setback − allowance`.
   */
  deductionFor(angle: number, radius = this.innerRadius): number {
    return 2 * this.outsideSetback(angle, radius) - this.allowanceFor(angle, radius)
  }

  /** A copy with `changes` applied, re-validated on the way through. */
  with(changes: SheetMetalParametersInit): SheetMetalParameters {
    return new SheetMetalParameters({ ...this.toJSON(), ...changes })
  }

  toJSON(): SheetMetalParametersJSON {
    return {
      material: this.material,
      thickness: this.thickness,
      innerRadius: this.innerRadius,
      kFactor: this.kFactor,
      bendMethod: this.bendMethod,
      bendAllowance: this.bendAllowance,
      bendDeduction: this.bendDeduction,
      reliefType: this.reliefType,
      reliefWidth: this.reliefWidth,
      reliefDepth: this.reliefDepth,
    }
  }

  static fromJSON(json: Partial<SheetMetalParametersJSON>): SheetMetalParameters {
    return new SheetMetalParameters(json)
  }
}

/** `BA = θ · (R + K · T)`, the textbook neutral-axis development. */
function kFactorAllowance(
  angle: number,
  radius: number,
  parameters: { readonly kFactor: number; readonly thickness: number },
): number {
  return Math.abs(angle) * DEG * (radius + parameters.kFactor * parameters.thickness)
}
