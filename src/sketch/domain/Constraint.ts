import { newId } from './ids'

/**
 * Sketch constraints. Geometric constraints express relationships; dimensional
 * constraints additionally carry a value. A *driving* dimension controls the
 * geometry; a *driven* dimension is a read-only measurement the solver fills in.
 */
export type GeometricConstraintType =
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'concentric'
  | 'collinear'
  | 'equal'
  | 'midpoint'
  | 'symmetric'
  | 'fix'

export type DimensionalConstraintType =
  | 'distance'
  | 'angle'
  | 'length'
  | 'radius'
  | 'diameter'

export type ConstraintType = GeometricConstraintType | DimensionalConstraintType

interface ConstraintJSONBase {
  readonly id: string
}

interface ConstraintInitBase {
  readonly id?: string
}

abstract class ConstraintBase {
  readonly id: string

  protected constructor(init: ConstraintInitBase) {
    this.id = init.id ?? newId()
  }

  /** Every entity this constraint touches — drives cascade deletion and UI lists. */
  abstract get entityIds(): string[]
}

interface DimensionalInitBase extends ConstraintInitBase {
  readonly value: number
  readonly isDriving?: boolean
  /** Optional formula, e.g. `= d1 * 2 + 5`, evaluated before each solve. */
  readonly expression?: string | undefined
  /** Parameter name other expressions can reference. Auto-assigned by SketchModel. */
  readonly name?: string | undefined
}

interface DimensionalJSONBase extends ConstraintJSONBase {
  readonly value: number
  readonly isDriving: boolean
  readonly expression?: string | undefined
  readonly name?: string | undefined
}

abstract class DimensionalConstraintBase extends ConstraintBase {
  value: number
  isDriving: boolean
  expression: string | undefined
  name: string | undefined

  protected constructor(init: DimensionalInitBase) {
    super(init)
    this.value = init.value
    this.isDriving = init.isDriving ?? true
    this.expression = init.expression
    this.name = init.name
  }

  protected dimensionJSON(): DimensionalJSONBase {
    return {
      id: this.id,
      value: this.value,
      isDriving: this.isDriving,
      expression: this.expression,
      name: this.name,
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Geometric                                                                   */
/* -------------------------------------------------------------------------- */

export interface CoincidentConstraintJSON extends ConstraintJSONBase {
  readonly type: 'coincident'
  readonly pointId: string
  readonly targetPointId?: string | undefined
  readonly targetEntityId?: string | undefined
}

export interface CoincidentConstraintInit extends ConstraintInitBase {
  readonly pointId: string
  readonly targetPointId?: string | undefined
  readonly targetEntityId?: string | undefined
}

/** Point-on-point when `targetPointId` is set, point-on-curve otherwise. */
export class CoincidentConstraint extends ConstraintBase {
  readonly type = 'coincident' as const
  pointId: string
  targetPointId: string | undefined
  targetEntityId: string | undefined

  constructor(init: CoincidentConstraintInit) {
    super(init)
    if (!init.targetPointId && !init.targetEntityId) {
      throw new Error('Coincident constraint needs a target point or target entity')
    }
    this.pointId = init.pointId
    this.targetPointId = init.targetPointId
    this.targetEntityId = init.targetEntityId
  }

  override get entityIds(): string[] {
    return [this.pointId, (this.targetPointId ?? this.targetEntityId) as string]
  }

  toJSON(): CoincidentConstraintJSON {
    return {
      type: 'coincident',
      id: this.id,
      pointId: this.pointId,
      targetPointId: this.targetPointId,
      targetEntityId: this.targetEntityId,
    }
  }

  static fromJSON(json: CoincidentConstraintJSON): CoincidentConstraint {
    return new CoincidentConstraint(json)
  }
}

export interface SingleLineConstraintJSON<T extends string> extends ConstraintJSONBase {
  readonly type: T
  readonly lineId: string
}

export interface SingleLineConstraintInit extends ConstraintInitBase {
  readonly lineId: string
}

export class HorizontalConstraint extends ConstraintBase {
  readonly type = 'horizontal' as const
  lineId: string

  constructor(init: SingleLineConstraintInit) {
    super(init)
    this.lineId = init.lineId
  }

  override get entityIds(): string[] {
    return [this.lineId]
  }

  toJSON(): SingleLineConstraintJSON<'horizontal'> {
    return { type: 'horizontal', id: this.id, lineId: this.lineId }
  }

  static fromJSON(json: SingleLineConstraintJSON<'horizontal'>): HorizontalConstraint {
    return new HorizontalConstraint(json)
  }
}

export class VerticalConstraint extends ConstraintBase {
  readonly type = 'vertical' as const
  lineId: string

  constructor(init: SingleLineConstraintInit) {
    super(init)
    this.lineId = init.lineId
  }

  override get entityIds(): string[] {
    return [this.lineId]
  }

  toJSON(): SingleLineConstraintJSON<'vertical'> {
    return { type: 'vertical', id: this.id, lineId: this.lineId }
  }

  static fromJSON(json: SingleLineConstraintJSON<'vertical'>): VerticalConstraint {
    return new VerticalConstraint(json)
  }
}

export interface LinePairConstraintJSON<T extends string> extends ConstraintJSONBase {
  readonly type: T
  readonly lineId1: string
  readonly lineId2: string
}

export interface LinePairConstraintInit extends ConstraintInitBase {
  readonly lineId1: string
  readonly lineId2: string
}

export class ParallelConstraint extends ConstraintBase {
  readonly type = 'parallel' as const
  lineId1: string
  lineId2: string

  constructor(init: LinePairConstraintInit) {
    super(init)
    this.lineId1 = init.lineId1
    this.lineId2 = init.lineId2
  }

  override get entityIds(): string[] {
    return [this.lineId1, this.lineId2]
  }

  toJSON(): LinePairConstraintJSON<'parallel'> {
    return { type: 'parallel', id: this.id, lineId1: this.lineId1, lineId2: this.lineId2 }
  }

  static fromJSON(json: LinePairConstraintJSON<'parallel'>): ParallelConstraint {
    return new ParallelConstraint(json)
  }
}

export class PerpendicularConstraint extends ConstraintBase {
  readonly type = 'perpendicular' as const
  lineId1: string
  lineId2: string

  constructor(init: LinePairConstraintInit) {
    super(init)
    this.lineId1 = init.lineId1
    this.lineId2 = init.lineId2
  }

  override get entityIds(): string[] {
    return [this.lineId1, this.lineId2]
  }

  toJSON(): LinePairConstraintJSON<'perpendicular'> {
    return { type: 'perpendicular', id: this.id, lineId1: this.lineId1, lineId2: this.lineId2 }
  }

  static fromJSON(json: LinePairConstraintJSON<'perpendicular'>): PerpendicularConstraint {
    return new PerpendicularConstraint(json)
  }
}

export class CollinearConstraint extends ConstraintBase {
  readonly type = 'collinear' as const
  lineId1: string
  lineId2: string

  constructor(init: LinePairConstraintInit) {
    super(init)
    this.lineId1 = init.lineId1
    this.lineId2 = init.lineId2
  }

  override get entityIds(): string[] {
    return [this.lineId1, this.lineId2]
  }

  toJSON(): LinePairConstraintJSON<'collinear'> {
    return { type: 'collinear', id: this.id, lineId1: this.lineId1, lineId2: this.lineId2 }
  }

  static fromJSON(json: LinePairConstraintJSON<'collinear'>): CollinearConstraint {
    return new CollinearConstraint(json)
  }
}

export interface EntityPairConstraintJSON<T extends string> extends ConstraintJSONBase {
  readonly type: T
  readonly entityId1: string
  readonly entityId2: string
}

export interface EntityPairConstraintInit extends ConstraintInitBase {
  readonly entityId1: string
  readonly entityId2: string
}

/** Line-to-circle/arc or circle-to-circle tangency. */
export class TangentConstraint extends ConstraintBase {
  readonly type = 'tangent' as const
  entityId1: string
  entityId2: string

  constructor(init: EntityPairConstraintInit) {
    super(init)
    this.entityId1 = init.entityId1
    this.entityId2 = init.entityId2
  }

  override get entityIds(): string[] {
    return [this.entityId1, this.entityId2]
  }

  toJSON(): EntityPairConstraintJSON<'tangent'> {
    return { type: 'tangent', id: this.id, entityId1: this.entityId1, entityId2: this.entityId2 }
  }

  static fromJSON(json: EntityPairConstraintJSON<'tangent'>): TangentConstraint {
    return new TangentConstraint(json)
  }
}

/** Equal length for lines, equal radius for circles and arcs. */
export class EqualConstraint extends ConstraintBase {
  readonly type = 'equal' as const
  entityId1: string
  entityId2: string

  constructor(init: EntityPairConstraintInit) {
    super(init)
    this.entityId1 = init.entityId1
    this.entityId2 = init.entityId2
  }

  override get entityIds(): string[] {
    return [this.entityId1, this.entityId2]
  }

  toJSON(): EntityPairConstraintJSON<'equal'> {
    return { type: 'equal', id: this.id, entityId1: this.entityId1, entityId2: this.entityId2 }
  }

  static fromJSON(json: EntityPairConstraintJSON<'equal'>): EqualConstraint {
    return new EqualConstraint(json)
  }
}

export interface ConcentricConstraintJSON extends ConstraintJSONBase {
  readonly type: 'concentric'
  readonly circleId1: string
  readonly circleId2: string
}

export interface ConcentricConstraintInit extends ConstraintInitBase {
  readonly circleId1: string
  readonly circleId2: string
}

export class ConcentricConstraint extends ConstraintBase {
  readonly type = 'concentric' as const
  circleId1: string
  circleId2: string

  constructor(init: ConcentricConstraintInit) {
    super(init)
    this.circleId1 = init.circleId1
    this.circleId2 = init.circleId2
  }

  override get entityIds(): string[] {
    return [this.circleId1, this.circleId2]
  }

  toJSON(): ConcentricConstraintJSON {
    return {
      type: 'concentric',
      id: this.id,
      circleId1: this.circleId1,
      circleId2: this.circleId2,
    }
  }

  static fromJSON(json: ConcentricConstraintJSON): ConcentricConstraint {
    return new ConcentricConstraint(json)
  }
}

export interface MidpointConstraintJSON extends ConstraintJSONBase {
  readonly type: 'midpoint'
  readonly pointId: string
  readonly lineId: string
}

export interface MidpointConstraintInit extends ConstraintInitBase {
  readonly pointId: string
  readonly lineId: string
}

export class MidpointConstraint extends ConstraintBase {
  readonly type = 'midpoint' as const
  pointId: string
  lineId: string

  constructor(init: MidpointConstraintInit) {
    super(init)
    this.pointId = init.pointId
    this.lineId = init.lineId
  }

  override get entityIds(): string[] {
    return [this.pointId, this.lineId]
  }

  toJSON(): MidpointConstraintJSON {
    return { type: 'midpoint', id: this.id, pointId: this.pointId, lineId: this.lineId }
  }

  static fromJSON(json: MidpointConstraintJSON): MidpointConstraint {
    return new MidpointConstraint(json)
  }
}

export interface SymmetricConstraintJSON extends ConstraintJSONBase {
  readonly type: 'symmetric'
  readonly entityId1: string
  readonly entityId2: string
  readonly symmetryLineId: string
}

export interface SymmetricConstraintInit extends ConstraintInitBase {
  readonly entityId1: string
  readonly entityId2: string
  readonly symmetryLineId: string
}

export class SymmetricConstraint extends ConstraintBase {
  readonly type = 'symmetric' as const
  entityId1: string
  entityId2: string
  symmetryLineId: string

  constructor(init: SymmetricConstraintInit) {
    super(init)
    this.entityId1 = init.entityId1
    this.entityId2 = init.entityId2
    this.symmetryLineId = init.symmetryLineId
  }

  override get entityIds(): string[] {
    return [this.entityId1, this.entityId2, this.symmetryLineId]
  }

  toJSON(): SymmetricConstraintJSON {
    return {
      type: 'symmetric',
      id: this.id,
      entityId1: this.entityId1,
      entityId2: this.entityId2,
      symmetryLineId: this.symmetryLineId,
    }
  }

  static fromJSON(json: SymmetricConstraintJSON): SymmetricConstraint {
    return new SymmetricConstraint(json)
  }
}

export interface FixConstraintJSON extends ConstraintJSONBase {
  readonly type: 'fix'
  readonly pointId: string
}

export interface FixConstraintInit extends ConstraintInitBase {
  readonly pointId: string
}

/** Anchors a point — the solver never moves it. */
export class FixConstraint extends ConstraintBase {
  readonly type = 'fix' as const
  pointId: string

  constructor(init: FixConstraintInit) {
    super(init)
    this.pointId = init.pointId
  }

  override get entityIds(): string[] {
    return [this.pointId]
  }

  toJSON(): FixConstraintJSON {
    return { type: 'fix', id: this.id, pointId: this.pointId }
  }

  static fromJSON(json: FixConstraintJSON): FixConstraint {
    return new FixConstraint(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Dimensional                                                                 */
/* -------------------------------------------------------------------------- */

export interface DistanceConstraintJSON extends DimensionalJSONBase {
  readonly type: 'distance'
  readonly pointId1: string
  readonly pointId2: string
}

export interface DistanceConstraintInit extends DimensionalInitBase {
  readonly pointId1: string
  readonly pointId2: string
}

export class DistanceConstraint extends DimensionalConstraintBase {
  readonly type = 'distance' as const
  pointId1: string
  pointId2: string

  constructor(init: DistanceConstraintInit) {
    super(init)
    this.pointId1 = init.pointId1
    this.pointId2 = init.pointId2
  }

  override get entityIds(): string[] {
    return [this.pointId1, this.pointId2]
  }

  toJSON(): DistanceConstraintJSON {
    return {
      ...this.dimensionJSON(),
      type: 'distance',
      pointId1: this.pointId1,
      pointId2: this.pointId2,
    }
  }

  static fromJSON(json: DistanceConstraintJSON): DistanceConstraint {
    return new DistanceConstraint(json)
  }
}

export interface AngleConstraintJSON extends DimensionalJSONBase {
  readonly type: 'angle'
  readonly lineId1: string
  readonly lineId2: string
}

export interface AngleConstraintInit extends DimensionalInitBase {
  readonly lineId1: string
  readonly lineId2: string
}

/** Angle between two lines, in degrees. */
export class AngleConstraint extends DimensionalConstraintBase {
  readonly type = 'angle' as const
  lineId1: string
  lineId2: string

  constructor(init: AngleConstraintInit) {
    super(init)
    this.lineId1 = init.lineId1
    this.lineId2 = init.lineId2
  }

  override get entityIds(): string[] {
    return [this.lineId1, this.lineId2]
  }

  toJSON(): AngleConstraintJSON {
    return { ...this.dimensionJSON(), type: 'angle', lineId1: this.lineId1, lineId2: this.lineId2 }
  }

  static fromJSON(json: AngleConstraintJSON): AngleConstraint {
    return new AngleConstraint(json)
  }
}

export interface LengthConstraintJSON extends DimensionalJSONBase {
  readonly type: 'length'
  readonly lineId: string
}

export interface LengthConstraintInit extends DimensionalInitBase {
  readonly lineId: string
}

export class LengthConstraint extends DimensionalConstraintBase {
  readonly type = 'length' as const
  lineId: string

  constructor(init: LengthConstraintInit) {
    super(init)
    this.lineId = init.lineId
  }

  override get entityIds(): string[] {
    return [this.lineId]
  }

  toJSON(): LengthConstraintJSON {
    return { ...this.dimensionJSON(), type: 'length', lineId: this.lineId }
  }

  static fromJSON(json: LengthConstraintJSON): LengthConstraint {
    return new LengthConstraint(json)
  }
}

export interface RadiusConstraintJSON extends DimensionalJSONBase {
  readonly type: 'radius'
  readonly circleId: string
}

export interface RadiusConstraintInit extends DimensionalInitBase {
  /** A circle or an arc. */
  readonly circleId: string
}

export class RadiusConstraint extends DimensionalConstraintBase {
  readonly type = 'radius' as const
  circleId: string

  constructor(init: RadiusConstraintInit) {
    super(init)
    this.circleId = init.circleId
  }

  override get entityIds(): string[] {
    return [this.circleId]
  }

  toJSON(): RadiusConstraintJSON {
    return { ...this.dimensionJSON(), type: 'radius', circleId: this.circleId }
  }

  static fromJSON(json: RadiusConstraintJSON): RadiusConstraint {
    return new RadiusConstraint(json)
  }
}

export interface DiameterConstraintJSON extends DimensionalJSONBase {
  readonly type: 'diameter'
  readonly circleId: string
}

export interface DiameterConstraintInit extends DimensionalInitBase {
  readonly circleId: string
}

export class DiameterConstraint extends DimensionalConstraintBase {
  readonly type = 'diameter' as const
  circleId: string

  constructor(init: DiameterConstraintInit) {
    super(init)
    this.circleId = init.circleId
  }

  override get entityIds(): string[] {
    return [this.circleId]
  }

  toJSON(): DiameterConstraintJSON {
    return { ...this.dimensionJSON(), type: 'diameter', circleId: this.circleId }
  }

  static fromJSON(json: DiameterConstraintJSON): DiameterConstraint {
    return new DiameterConstraint(json)
  }
}

/* -------------------------------------------------------------------------- */

export type DimensionalConstraint =
  | DistanceConstraint
  | AngleConstraint
  | LengthConstraint
  | RadiusConstraint
  | DiameterConstraint

export type GeometricConstraint =
  | CoincidentConstraint
  | HorizontalConstraint
  | VerticalConstraint
  | ParallelConstraint
  | PerpendicularConstraint
  | TangentConstraint
  | ConcentricConstraint
  | CollinearConstraint
  | EqualConstraint
  | MidpointConstraint
  | SymmetricConstraint
  | FixConstraint

export type Constraint = GeometricConstraint | DimensionalConstraint

export type ConstraintJSON =
  | CoincidentConstraintJSON
  | SingleLineConstraintJSON<'horizontal'>
  | SingleLineConstraintJSON<'vertical'>
  | LinePairConstraintJSON<'parallel'>
  | LinePairConstraintJSON<'perpendicular'>
  | LinePairConstraintJSON<'collinear'>
  | EntityPairConstraintJSON<'tangent'>
  | EntityPairConstraintJSON<'equal'>
  | ConcentricConstraintJSON
  | MidpointConstraintJSON
  | SymmetricConstraintJSON
  | FixConstraintJSON
  | DistanceConstraintJSON
  | AngleConstraintJSON
  | LengthConstraintJSON
  | RadiusConstraintJSON
  | DiameterConstraintJSON

const DIMENSIONAL_TYPES: ReadonlySet<string> = new Set<DimensionalConstraintType>([
  'distance',
  'angle',
  'length',
  'radius',
  'diameter',
])

export function isDimensional(constraint: Constraint): constraint is DimensionalConstraint {
  return DIMENSIONAL_TYPES.has(constraint.type)
}

export function constraintFromJSON(json: ConstraintJSON): Constraint {
  switch (json.type) {
    case 'coincident':
      return CoincidentConstraint.fromJSON(json)
    case 'horizontal':
      return HorizontalConstraint.fromJSON(json)
    case 'vertical':
      return VerticalConstraint.fromJSON(json)
    case 'parallel':
      return ParallelConstraint.fromJSON(json)
    case 'perpendicular':
      return PerpendicularConstraint.fromJSON(json)
    case 'collinear':
      return CollinearConstraint.fromJSON(json)
    case 'tangent':
      return TangentConstraint.fromJSON(json)
    case 'equal':
      return EqualConstraint.fromJSON(json)
    case 'concentric':
      return ConcentricConstraint.fromJSON(json)
    case 'midpoint':
      return MidpointConstraint.fromJSON(json)
    case 'symmetric':
      return SymmetricConstraint.fromJSON(json)
    case 'fix':
      return FixConstraint.fromJSON(json)
    case 'distance':
      return DistanceConstraint.fromJSON(json)
    case 'angle':
      return AngleConstraint.fromJSON(json)
    case 'length':
      return LengthConstraint.fromJSON(json)
    case 'radius':
      return RadiusConstraint.fromJSON(json)
    case 'diameter':
      return DiameterConstraint.fromJSON(json)
    default: {
      const unknown = json as { type: string }
      throw new Error(`Unknown constraint type: ${unknown.type}`)
    }
  }
}
