import { newId } from './ids'

/**
 * Sketch geometry. Points carry the only positional degrees of freedom; every
 * other entity references points by id so a constraint solve that moves a point
 * automatically moves everything attached to it.
 *
 * Any entity may be flagged `isConstruction`: it is drawn dashed and ignored
 * when the sketch is turned into a solid profile.
 */
export type EntityType =
  | 'point'
  | 'line'
  | 'circle'
  | 'arc'
  | 'rectangle'
  | 'slot'
  | 'polygon'
  | 'ellipse'
  | 'spline'

interface EntityJSONBase {
  readonly id: string
  readonly isConstruction: boolean
}

interface EntityInitBase {
  readonly id?: string
  readonly isConstruction?: boolean
}

abstract class SketchEntityBase {
  readonly id: string
  isConstruction: boolean

  protected constructor(init: EntityInitBase) {
    this.id = init.id ?? newId()
    this.isConstruction = init.isConstruction ?? false
  }

  /** Ids of the entities this one is built from — drives cascade deletion. */
  abstract get referencedIds(): string[]
}

/* -------------------------------------------------------------------------- */
/* Point                                                                       */
/* -------------------------------------------------------------------------- */

export interface PointEntityJSON extends EntityJSONBase {
  readonly type: 'point'
  readonly x: number
  readonly y: number
}

export interface PointEntityInit extends EntityInitBase {
  readonly x: number
  readonly y: number
}

export class PointEntity extends SketchEntityBase {
  readonly type = 'point' as const
  x: number
  y: number

  constructor(init: PointEntityInit) {
    super(init)
    this.x = init.x
    this.y = init.y
  }

  override get referencedIds(): string[] {
    return []
  }

  toJSON(): PointEntityJSON {
    return { type: 'point', id: this.id, isConstruction: this.isConstruction, x: this.x, y: this.y }
  }

  static fromJSON(json: PointEntityJSON): PointEntity {
    return new PointEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Line                                                                        */
/* -------------------------------------------------------------------------- */

export interface LineEntityJSON extends EntityJSONBase {
  readonly type: 'line'
  readonly startPointId: string
  readonly endPointId: string
}

export interface LineEntityInit extends EntityInitBase {
  readonly startPointId: string
  readonly endPointId: string
}

export class LineEntity extends SketchEntityBase {
  readonly type = 'line' as const
  startPointId: string
  endPointId: string

  constructor(init: LineEntityInit) {
    super(init)
    this.startPointId = init.startPointId
    this.endPointId = init.endPointId
  }

  get pointIds(): string[] {
    return [this.startPointId, this.endPointId]
  }

  override get referencedIds(): string[] {
    return this.pointIds
  }

  toJSON(): LineEntityJSON {
    return {
      type: 'line',
      id: this.id,
      isConstruction: this.isConstruction,
      startPointId: this.startPointId,
      endPointId: this.endPointId,
    }
  }

  static fromJSON(json: LineEntityJSON): LineEntity {
    return new LineEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Circle                                                                      */
/* -------------------------------------------------------------------------- */

export interface CircleEntityJSON extends EntityJSONBase {
  readonly type: 'circle'
  readonly centerPointId: string
  readonly radius: number
}

export interface CircleEntityInit extends EntityInitBase {
  readonly centerPointId: string
  readonly radius: number
}

export class CircleEntity extends SketchEntityBase {
  readonly type = 'circle' as const
  centerPointId: string
  radius: number

  constructor(init: CircleEntityInit) {
    super(init)
    this.centerPointId = init.centerPointId
    this.radius = init.radius
  }

  override get referencedIds(): string[] {
    return [this.centerPointId]
  }

  toJSON(): CircleEntityJSON {
    return {
      type: 'circle',
      id: this.id,
      isConstruction: this.isConstruction,
      centerPointId: this.centerPointId,
      radius: this.radius,
    }
  }

  static fromJSON(json: CircleEntityJSON): CircleEntity {
    return new CircleEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Arc                                                                         */
/* -------------------------------------------------------------------------- */

export interface ArcEntityJSON extends EntityJSONBase {
  readonly type: 'arc'
  readonly centerPointId: string
  readonly startPointId: string
  readonly endPointId: string
  readonly radius: number
  readonly clockwise: boolean
}

export interface ArcEntityInit extends EntityInitBase {
  readonly centerPointId: string
  readonly startPointId: string
  readonly endPointId: string
  readonly radius: number
  readonly clockwise?: boolean
}

export class ArcEntity extends SketchEntityBase {
  readonly type = 'arc' as const
  centerPointId: string
  startPointId: string
  endPointId: string
  radius: number
  clockwise: boolean

  constructor(init: ArcEntityInit) {
    super(init)
    this.centerPointId = init.centerPointId
    this.startPointId = init.startPointId
    this.endPointId = init.endPointId
    this.radius = init.radius
    this.clockwise = init.clockwise ?? false
  }

  override get referencedIds(): string[] {
    return [this.centerPointId, this.startPointId, this.endPointId]
  }

  toJSON(): ArcEntityJSON {
    return {
      type: 'arc',
      id: this.id,
      isConstruction: this.isConstruction,
      centerPointId: this.centerPointId,
      startPointId: this.startPointId,
      endPointId: this.endPointId,
      radius: this.radius,
      clockwise: this.clockwise,
    }
  }

  static fromJSON(json: ArcEntityJSON): ArcEntity {
    return new ArcEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Rectangle                                                                   */
/* -------------------------------------------------------------------------- */

export interface RectangleEntityJSON extends EntityJSONBase {
  readonly type: 'rectangle'
  readonly corner1PointId: string
  readonly corner2PointId: string
  readonly corner3PointId: string
  readonly corner4PointId: string
  readonly lineIds: readonly string[]
}

export interface RectangleEntityInit extends EntityInitBase {
  readonly corner1PointId: string
  readonly corner2PointId: string
  readonly corner3PointId: string
  readonly corner4PointId: string
  readonly lineIds: readonly string[]
}

/** Four corner points plus the four edge lines that join them. */
export class RectangleEntity extends SketchEntityBase {
  readonly type = 'rectangle' as const
  corner1PointId: string
  corner2PointId: string
  corner3PointId: string
  corner4PointId: string
  lineIds: string[]

  constructor(init: RectangleEntityInit) {
    super(init)
    this.corner1PointId = init.corner1PointId
    this.corner2PointId = init.corner2PointId
    this.corner3PointId = init.corner3PointId
    this.corner4PointId = init.corner4PointId
    this.lineIds = [...init.lineIds]
  }

  get cornerPointIds(): string[] {
    return [
      this.corner1PointId,
      this.corner2PointId,
      this.corner3PointId,
      this.corner4PointId,
    ]
  }

  override get referencedIds(): string[] {
    return [...this.cornerPointIds, ...this.lineIds]
  }

  toJSON(): RectangleEntityJSON {
    return {
      type: 'rectangle',
      id: this.id,
      isConstruction: this.isConstruction,
      corner1PointId: this.corner1PointId,
      corner2PointId: this.corner2PointId,
      corner3PointId: this.corner3PointId,
      corner4PointId: this.corner4PointId,
      lineIds: [...this.lineIds],
    }
  }

  static fromJSON(json: RectangleEntityJSON): RectangleEntity {
    return new RectangleEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Slot                                                                        */
/* -------------------------------------------------------------------------- */

export interface SlotEntityJSON extends EntityJSONBase {
  readonly type: 'slot'
  readonly center1PointId: string
  readonly center2PointId: string
  readonly width: number
}

export interface SlotEntityInit extends EntityInitBase {
  readonly center1PointId: string
  readonly center2PointId: string
  readonly width: number
}

/** Full-round slot: two arc centres joined by parallel flanks of `width`. */
export class SlotEntity extends SketchEntityBase {
  readonly type = 'slot' as const
  center1PointId: string
  center2PointId: string
  width: number

  constructor(init: SlotEntityInit) {
    super(init)
    this.center1PointId = init.center1PointId
    this.center2PointId = init.center2PointId
    this.width = init.width
  }

  override get referencedIds(): string[] {
    return [this.center1PointId, this.center2PointId]
  }

  toJSON(): SlotEntityJSON {
    return {
      type: 'slot',
      id: this.id,
      isConstruction: this.isConstruction,
      center1PointId: this.center1PointId,
      center2PointId: this.center2PointId,
      width: this.width,
    }
  }

  static fromJSON(json: SlotEntityJSON): SlotEntity {
    return new SlotEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Polygon                                                                     */
/* -------------------------------------------------------------------------- */

export interface PolygonEntityJSON extends EntityJSONBase {
  readonly type: 'polygon'
  readonly pointIds: readonly string[]
  readonly closed: boolean
}

export interface PolygonEntityInit extends EntityInitBase {
  readonly pointIds: readonly string[]
  readonly closed?: boolean
}

export class PolygonEntity extends SketchEntityBase {
  readonly type = 'polygon' as const
  pointIds: string[]
  closed: boolean

  constructor(init: PolygonEntityInit) {
    super(init)
    this.pointIds = [...init.pointIds]
    this.closed = init.closed ?? true
  }

  override get referencedIds(): string[] {
    return [...this.pointIds]
  }

  toJSON(): PolygonEntityJSON {
    return {
      type: 'polygon',
      id: this.id,
      isConstruction: this.isConstruction,
      pointIds: [...this.pointIds],
      closed: this.closed,
    }
  }

  static fromJSON(json: PolygonEntityJSON): PolygonEntity {
    return new PolygonEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Ellipse                                                                     */
/* -------------------------------------------------------------------------- */

export interface EllipseEntityJSON extends EntityJSONBase {
  readonly type: 'ellipse'
  readonly centerPointId: string
  readonly majorAxisPointId: string
  readonly minorRadius: number
}

export interface EllipseEntityInit extends EntityInitBase {
  readonly centerPointId: string
  readonly majorAxisPointId: string
  readonly minorRadius: number
}

/** The major axis is the vector from centre to `majorAxisPointId`. */
export class EllipseEntity extends SketchEntityBase {
  readonly type = 'ellipse' as const
  centerPointId: string
  majorAxisPointId: string
  minorRadius: number

  constructor(init: EllipseEntityInit) {
    super(init)
    this.centerPointId = init.centerPointId
    this.majorAxisPointId = init.majorAxisPointId
    this.minorRadius = init.minorRadius
  }

  override get referencedIds(): string[] {
    return [this.centerPointId, this.majorAxisPointId]
  }

  toJSON(): EllipseEntityJSON {
    return {
      type: 'ellipse',
      id: this.id,
      isConstruction: this.isConstruction,
      centerPointId: this.centerPointId,
      majorAxisPointId: this.majorAxisPointId,
      minorRadius: this.minorRadius,
    }
  }

  static fromJSON(json: EllipseEntityJSON): EllipseEntity {
    return new EllipseEntity(json)
  }
}

/* -------------------------------------------------------------------------- */
/* Spline                                                                      */
/* -------------------------------------------------------------------------- */

export interface SplineEntityJSON extends EntityJSONBase {
  readonly type: 'spline'
  readonly controlPointIds: readonly string[]
  readonly degree: number
}

export interface SplineEntityInit extends EntityInitBase {
  readonly controlPointIds: readonly string[]
  readonly degree?: number
}

export class SplineEntity extends SketchEntityBase {
  readonly type = 'spline' as const
  controlPointIds: string[]
  degree: number

  constructor(init: SplineEntityInit) {
    super(init)
    this.controlPointIds = [...init.controlPointIds]
    this.degree = init.degree ?? 3
  }

  override get referencedIds(): string[] {
    return [...this.controlPointIds]
  }

  toJSON(): SplineEntityJSON {
    return {
      type: 'spline',
      id: this.id,
      isConstruction: this.isConstruction,
      controlPointIds: [...this.controlPointIds],
      degree: this.degree,
    }
  }

  static fromJSON(json: SplineEntityJSON): SplineEntity {
    return new SplineEntity(json)
  }
}

/* -------------------------------------------------------------------------- */

export type SketchEntity =
  | PointEntity
  | LineEntity
  | CircleEntity
  | ArcEntity
  | RectangleEntity
  | SlotEntity
  | PolygonEntity
  | EllipseEntity
  | SplineEntity

export type SketchEntityJSON =
  | PointEntityJSON
  | LineEntityJSON
  | CircleEntityJSON
  | ArcEntityJSON
  | RectangleEntityJSON
  | SlotEntityJSON
  | PolygonEntityJSON
  | EllipseEntityJSON
  | SplineEntityJSON

export function entityFromJSON(json: SketchEntityJSON): SketchEntity {
  switch (json.type) {
    case 'point':
      return PointEntity.fromJSON(json)
    case 'line':
      return LineEntity.fromJSON(json)
    case 'circle':
      return CircleEntity.fromJSON(json)
    case 'arc':
      return ArcEntity.fromJSON(json)
    case 'rectangle':
      return RectangleEntity.fromJSON(json)
    case 'slot':
      return SlotEntity.fromJSON(json)
    case 'polygon':
      return PolygonEntity.fromJSON(json)
    case 'ellipse':
      return EllipseEntity.fromJSON(json)
    case 'spline':
      return SplineEntity.fromJSON(json)
    default: {
      const unknown = json as { type: string }
      throw new Error(`Unknown sketch entity type: ${unknown.type}`)
    }
  }
}

export function isPoint(entity: SketchEntity): entity is PointEntity {
  return entity.type === 'point'
}

export function isLine(entity: SketchEntity): entity is LineEntity {
  return entity.type === 'line'
}

export function isCircle(entity: SketchEntity): entity is CircleEntity {
  return entity.type === 'circle'
}

export function isArc(entity: SketchEntity): entity is ArcEntity {
  return entity.type === 'arc'
}
