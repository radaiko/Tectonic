import type { Constraint, ConstraintJSON } from './Constraint'
import { constraintFromJSON, isDimensional } from './Constraint'
import type { EntityType, PointEntity, SketchEntity, SketchEntityJSON } from './SketchEntity'
import { entityFromJSON, isPoint } from './SketchEntity'
import { newId } from './ids'

/** Sketch plane reference. Only the three base planes exist in M1. */
export type SketchPlane = 'XY' | 'XZ' | 'YZ'

export const DEFAULT_GRID_SPACING = 10

export interface SketchModelJSON {
  readonly id: string
  readonly name: string
  readonly plane: SketchPlane
  readonly gridSpacing: number
  readonly entities: readonly SketchEntityJSON[]
  readonly constraints: readonly ConstraintJSON[]
}

export interface SketchModelInit {
  readonly id?: string
  readonly name?: string
  readonly plane?: SketchPlane
  readonly gridSpacing?: number
}

/**
 * A single 2D sketch: its geometry, its constraints and the plane it lives on.
 * Renderer-agnostic by design — nothing here imports React, three.js or Canvas.
 */
export class SketchModel {
  readonly id: string
  name: string
  plane: SketchPlane
  gridSpacing: number
  readonly entities: Map<string, SketchEntity>
  readonly constraints: Map<string, Constraint>

  constructor(init: SketchModelInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Sketch'
    this.plane = init.plane ?? 'XY'
    this.gridSpacing = init.gridSpacing ?? DEFAULT_GRID_SPACING
    this.entities = new Map()
    this.constraints = new Map()
  }

  addEntity<T extends SketchEntity>(entity: T): T {
    this.entities.set(entity.id, entity)
    return entity
  }

  getEntity(id: string): SketchEntity | undefined {
    return this.entities.get(id)
  }

  requireEntity(id: string): SketchEntity {
    const entity = this.entities.get(id)
    if (!entity) throw new Error(`No sketch entity with id ${id}`)
    return entity
  }

  requirePoint(id: string): PointEntity {
    const entity = this.requireEntity(id)
    if (!isPoint(entity)) throw new Error(`Sketch entity ${id} is not a point`)
    return entity
  }

  entitiesOfType(type: EntityType): SketchEntity[] {
    return [...this.entities.values()].filter((entity) => entity.type === type)
  }

  /**
   * Removes an entity along with everything built on top of it — dependent
   * entities first, then any constraint left pointing at a missing id.
   */
  removeEntity(id: string): boolean {
    if (!this.entities.has(id)) return false

    const doomed = new Set<string>([id])
    let grew = true
    while (grew) {
      grew = false
      for (const entity of this.entities.values()) {
        if (doomed.has(entity.id)) continue
        if (entity.referencedIds.some((ref) => doomed.has(ref))) {
          doomed.add(entity.id)
          grew = true
        }
      }
    }

    for (const doomedId of doomed) this.entities.delete(doomedId)
    for (const [constraintId, constraint] of this.constraints) {
      if (constraint.entityIds.some((ref) => doomed.has(ref))) {
        this.constraints.delete(constraintId)
      }
    }
    return true
  }

  addConstraint<T extends Constraint>(constraint: T): T {
    for (const entityId of constraint.entityIds) {
      if (!this.entities.has(entityId)) {
        throw new Error(
          `Constraint ${constraint.type} references unknown entity ${entityId}`,
        )
      }
    }
    if (isDimensional(constraint) && constraint.name === undefined) {
      constraint.name = this.nextDimensionName()
    }
    this.constraints.set(constraint.id, constraint)
    return constraint
  }

  removeConstraint(id: string): boolean {
    return this.constraints.delete(id)
  }

  constraintsFor(entityId: string): Constraint[] {
    return [...this.constraints.values()].filter((constraint) =>
      constraint.entityIds.includes(entityId),
    )
  }

  /** Next free `d<n>` parameter name for a dimension. */
  nextDimensionName(): string {
    const taken = new Set<string>()
    for (const constraint of this.constraints.values()) {
      if (isDimensional(constraint) && constraint.name !== undefined) taken.add(constraint.name)
    }
    let index = 1
    while (taken.has(`d${index}`)) index += 1
    return `d${index}`
  }

  toJSON(): SketchModelJSON {
    return {
      id: this.id,
      name: this.name,
      plane: this.plane,
      gridSpacing: this.gridSpacing,
      entities: [...this.entities.values()].map((entity) => entity.toJSON()),
      constraints: [...this.constraints.values()].map((constraint) => constraint.toJSON()),
    }
  }

  static fromJSON(json: SketchModelJSON): SketchModel {
    const model = new SketchModel({
      id: json.id,
      name: json.name,
      plane: json.plane,
      gridSpacing: json.gridSpacing,
    })
    for (const entity of json.entities) model.entities.set(entity.id, entityFromJSON(entity))
    for (const constraint of json.constraints) {
      model.constraints.set(constraint.id, constraintFromJSON(constraint))
    }
    return model
  }

  /** Deep copy that keeps every id — used to trial-solve a speculative edit. */
  clone(): SketchModel {
    return SketchModel.fromJSON(this.toJSON())
  }
}
