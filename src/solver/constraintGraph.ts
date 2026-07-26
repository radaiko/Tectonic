import type { SketchModel } from '../sketch/domain/SketchModel'

/**
 * Bipartite dependency graph between constraints and the entities they touch,
 * plus the connected clusters of geometry those links form. The solver uses the
 * clusters to reason about independent sub-sketches; the UI uses the adjacency
 * to list "constraints on this entity".
 */
export interface ConstraintGraph {
  readonly entityIds: string[]
  readonly constraintIds: string[]
  entitiesOf(constraintId: string): string[]
  constraintsOf(entityId: string): string[]
  /** Entity ids grouped into connected components. */
  clusters(): string[][]
}

export function buildConstraintGraph(model: SketchModel): ConstraintGraph {
  const entitiesByConstraint = new Map<string, string[]>()
  const constraintsByEntity = new Map<string, string[]>()

  for (const constraint of model.constraints.values()) {
    const touched = constraint.entityIds.filter((id) => model.entities.has(id))
    entitiesByConstraint.set(constraint.id, touched)
    for (const entityId of touched) {
      const existing = constraintsByEntity.get(entityId)
      if (existing) existing.push(constraint.id)
      else constraintsByEntity.set(entityId, [constraint.id])
    }
  }

  return {
    entityIds: [...model.entities.keys()],
    constraintIds: [...model.constraints.keys()],
    entitiesOf: (constraintId) => entitiesByConstraint.get(constraintId) ?? [],
    constraintsOf: (entityId) => constraintsByEntity.get(entityId) ?? [],
    clusters: () => findClusters(model, entitiesByConstraint),
  }
}

function findClusters(
  model: SketchModel,
  entitiesByConstraint: ReadonlyMap<string, readonly string[]>,
): string[][] {
  const parent = new Map<string, string>()
  for (const entityId of model.entities.keys()) parent.set(entityId, entityId)

  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root) as string
    let cursor = id
    while (cursor !== root) {
      const next = parent.get(cursor) as string
      parent.set(cursor, root)
      cursor = next
    }
    return root
  }
  const union = (a: string, b: string): void => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent.set(rootB, rootA)
  }

  // Composite geometry owns its points, so they always share a cluster.
  for (const entity of model.entities.values()) {
    for (const referenced of entity.referencedIds) {
      if (model.entities.has(referenced)) union(entity.id, referenced)
    }
  }
  for (const touched of entitiesByConstraint.values()) {
    const [first] = touched
    if (first === undefined) continue
    for (const entityId of touched) union(first, entityId)
  }

  const groups = new Map<string, string[]>()
  for (const entityId of model.entities.keys()) {
    const root = find(entityId)
    const group = groups.get(root)
    if (group) group.push(entityId)
    else groups.set(root, [entityId])
  }
  return [...groups.values()]
}
