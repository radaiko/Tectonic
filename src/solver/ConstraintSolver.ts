import type { Constraint, DimensionalConstraint } from '../sketch/domain/Constraint'
import { constraintFromJSON, isDimensional } from '../sketch/domain/Constraint'
import type { SketchEntity } from '../sketch/domain/SketchEntity'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { Vec2 } from '../sketch/domain/geometry'
import { angleBetween, cross, distance, dot, length, midpoint, sub } from '../sketch/domain/geometry'
import { ExpressionError, evaluateExpression, expressionReferences } from './expression'
import { Matrix, rowEchelon, solveLinearSystem } from './linalg'

/** Position data the solver produced for one entity. */
export interface EntityPosition {
  readonly x?: number
  readonly y?: number
  readonly radius?: number
  readonly minorRadius?: number
}

export interface SolveResult {
  readonly success: boolean
  /** New geometry per entity id — points get x/y, circles and arcs get radius. */
  readonly entityPositions: Map<string, EntityPosition>
  /** Solved value per constraint id: the target for driving dimensions, the measurement for driven ones. */
  readonly constraints: Map<string, number>
  readonly errors: string[]
  /** Degrees of freedom left in the sketch. */
  readonly dof: number
  readonly iterations: number
  /** Entities that still have freedom — rendered in the under-constrained colour. */
  readonly underConstrainedEntityIds: string[]
}

export interface SolverOptions {
  readonly maxIterations?: number
  readonly tolerance?: number
  /** Points held still for this solve — typically the one the user is dragging. */
  readonly pinnedPointIds?: readonly string[]
  /** When false the model is left untouched and only the result is returned. */
  readonly apply?: boolean
}

export interface ConstraintOutcome {
  readonly ok: boolean
  readonly error?: string
}

type Read = (key: string) => number

interface Equation {
  readonly constraintId: string
  readonly residual: (read: Read) => number
}

const DEFAULT_MAX_ITERATIONS = 200
const DEFAULT_TOLERANCE = 1e-8

/* -------------------------------------------------------------------------- */
/* Variables                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The free variables of a sketch: every unfixed point coordinate, plus the
 * radius of each circle/arc and the minor radius of each ellipse. Fixed values
 * are stored as constants so the residual functions do not need to know which
 * is which.
 */
class VariableTable {
  readonly owners: string[] = []
  readonly initialValues: number[] = []
  private readonly columns = new Map<string, number>()
  private readonly constants = new Map<string, number>()

  get size(): number {
    return this.owners.length
  }

  addFree(key: string, owner: string, value: number): void {
    this.columns.set(key, this.owners.length)
    this.owners.push(owner)
    this.initialValues.push(value)
  }

  addConstant(key: string, value: number): void {
    this.constants.set(key, value)
  }

  columnOf(key: string): number | undefined {
    return this.columns.get(key)
  }

  read(key: string, values: readonly number[]): number {
    const column = this.columns.get(key)
    if (column !== undefined) return values[column] as number
    return this.constants.get(key) ?? 0
  }
}

const pointXKey = (id: string): string => `${id}.x`
const pointYKey = (id: string): string => `${id}.y`
const radiusKey = (id: string): string => `${id}.r`
const minorRadiusKey = (id: string): string => `${id}.mr`

function buildVariables(model: SketchModel, frozenPointIds: ReadonlySet<string>): VariableTable {
  const table = new VariableTable()
  for (const entity of model.entities.values()) {
    switch (entity.type) {
      case 'point':
        if (frozenPointIds.has(entity.id)) {
          table.addConstant(pointXKey(entity.id), entity.x)
          table.addConstant(pointYKey(entity.id), entity.y)
        } else {
          table.addFree(pointXKey(entity.id), entity.id, entity.x)
          table.addFree(pointYKey(entity.id), entity.id, entity.y)
        }
        break
      case 'circle':
      case 'arc':
        table.addFree(radiusKey(entity.id), entity.id, entity.radius)
        break
      case 'ellipse':
        table.addFree(minorRadiusKey(entity.id), entity.id, entity.minorRadius)
        break
      default:
        break
    }
  }
  return table
}

function frozenPoints(model: SketchModel, pinned: readonly string[]): Set<string> {
  const frozen = new Set<string>(pinned)
  for (const constraint of model.constraints.values()) {
    if (constraint.type === 'fix') frozen.add(constraint.pointId)
  }
  return frozen
}

/* -------------------------------------------------------------------------- */
/* Residuals                                                                   */
/* -------------------------------------------------------------------------- */

interface Accessors {
  point(id: string): Vec2
  radius(id: string): number
}

function accessors(read: Read): Accessors {
  return {
    point: (id) => ({ x: read(pointXKey(id)), y: read(pointYKey(id)) }),
    radius: (id) => read(radiusKey(id)),
  }
}

function lineEndpoints(model: SketchModel, lineId: string): [string, string] | null {
  const entity = model.getEntity(lineId)
  if (entity?.type !== 'line') return null
  return [entity.startPointId, entity.endPointId]
}

function centerOf(entity: SketchEntity): string | null {
  if (entity.type === 'circle' || entity.type === 'arc') return entity.centerPointId
  return null
}

/** Unit direction of a line at the current variable values. */
function lineDirection(read: Read, start: string, end: string): Vec2 {
  const access = accessors(read)
  return sub(access.point(end), access.point(start))
}

interface EquationBuild {
  readonly equations: Equation[]
  readonly errors: string[]
}

function buildEquations(model: SketchModel, initialRead: Read): EquationBuild {
  const equations: Equation[] = []
  const errors: string[] = []
  const push = (constraintId: string, residual: (read: Read) => number): void => {
    equations.push({ constraintId, residual })
  }

  // Arc endpoints must sit on the arc's own radius, otherwise moving the centre
  // would tear the arc apart.
  for (const entity of model.entities.values()) {
    if (entity.type !== 'arc') continue
    const { id, centerPointId, startPointId, endPointId } = entity
    push(`${id}:arc-start`, (read) => {
      const access = accessors(read)
      return distance(access.point(centerPointId), access.point(startPointId)) - access.radius(id)
    })
    push(`${id}:arc-end`, (read) => {
      const access = accessors(read)
      return distance(access.point(centerPointId), access.point(endPointId)) - access.radius(id)
    })
  }

  for (const constraint of model.constraints.values()) {
    const id = constraint.id
    switch (constraint.type) {
      case 'fix':
        // Handled by freezing variables — contributes no equation.
        break

      case 'coincident': {
        const { pointId, targetPointId, targetEntityId } = constraint
        if (targetPointId) {
          push(id, (read) => accessors(read).point(pointId).x - accessors(read).point(targetPointId).x)
          push(id, (read) => accessors(read).point(pointId).y - accessors(read).point(targetPointId).y)
          break
        }
        const target = model.getEntity(targetEntityId as string)
        if (target?.type === 'line') {
          const { startPointId, endPointId } = target
          push(id, (read) => {
            const access = accessors(read)
            const direction = sub(access.point(endPointId), access.point(startPointId))
            const span = length(direction)
            if (span === 0) return 0
            return cross(sub(access.point(pointId), access.point(startPointId)), direction) / span
          })
          break
        }
        if (target && (target.type === 'circle' || target.type === 'arc')) {
          const centerId = target.centerPointId
          push(id, (read) => {
            const access = accessors(read)
            return distance(access.point(pointId), access.point(centerId)) - access.radius(target.id)
          })
          break
        }
        errors.push(`Coincident constraint cannot attach a point to a ${target?.type ?? 'missing'} entity`)
        break
      }

      case 'horizontal': {
        const ends = lineEndpoints(model, constraint.lineId)
        if (!ends) {
          errors.push('Horizontal constraint needs a line')
          break
        }
        const [start, end] = ends
        push(id, (read) => accessors(read).point(start).y - accessors(read).point(end).y)
        break
      }

      case 'vertical': {
        const ends = lineEndpoints(model, constraint.lineId)
        if (!ends) {
          errors.push('Vertical constraint needs a line')
          break
        }
        const [start, end] = ends
        push(id, (read) => accessors(read).point(start).x - accessors(read).point(end).x)
        break
      }

      case 'parallel':
      case 'perpendicular': {
        const first = lineEndpoints(model, constraint.lineId1)
        const second = lineEndpoints(model, constraint.lineId2)
        if (!first || !second) {
          errors.push(`${constraint.type} constraint needs two lines`)
          break
        }
        const isParallel = constraint.type === 'parallel'
        push(id, (read) => {
          const a = lineDirection(read, first[0], first[1])
          const b = lineDirection(read, second[0], second[1])
          const scale = length(a) * length(b)
          if (scale === 0) return 0
          return (isParallel ? cross(a, b) : dot(a, b)) / scale
        })
        break
      }

      case 'collinear': {
        const first = lineEndpoints(model, constraint.lineId1)
        const second = lineEndpoints(model, constraint.lineId2)
        if (!first || !second) {
          errors.push('Collinear constraint needs two lines')
          break
        }
        push(id, (read) => {
          const a = lineDirection(read, first[0], first[1])
          const b = lineDirection(read, second[0], second[1])
          const scale = length(a) * length(b)
          return scale === 0 ? 0 : cross(a, b) / scale
        })
        push(id, (read) => {
          const access = accessors(read)
          const a = lineDirection(read, first[0], first[1])
          const span = length(a)
          if (span === 0) return 0
          return cross(a, sub(access.point(second[0]), access.point(first[0]))) / span
        })
        break
      }

      case 'concentric': {
        const first = model.getEntity(constraint.circleId1)
        const second = model.getEntity(constraint.circleId2)
        const centerA = first ? centerOf(first) : null
        const centerB = second ? centerOf(second) : null
        if (!centerA || !centerB) {
          errors.push('Concentric constraint needs two circles or arcs')
          break
        }
        push(id, (read) => accessors(read).point(centerA).x - accessors(read).point(centerB).x)
        push(id, (read) => accessors(read).point(centerA).y - accessors(read).point(centerB).y)
        break
      }

      case 'tangent': {
        const tangentEquation = buildTangent(model, constraint.entityId1, constraint.entityId2, initialRead)
        if (!tangentEquation) {
          errors.push('Tangent constraint needs a line and a circle, or two circles')
          break
        }
        push(id, tangentEquation)
        break
      }

      case 'equal': {
        const first = model.getEntity(constraint.entityId1)
        const second = model.getEntity(constraint.entityId2)
        if (first?.type === 'line' && second?.type === 'line') {
          const a = first
          const b = second
          push(id, (read) => {
            const access = accessors(read)
            return (
              distance(access.point(a.startPointId), access.point(a.endPointId)) -
              distance(access.point(b.startPointId), access.point(b.endPointId))
            )
          })
          break
        }
        if (first && second && centerOf(first) && centerOf(second)) {
          push(id, (read) => accessors(read).radius(first.id) - accessors(read).radius(second.id))
          break
        }
        errors.push('Equal constraint needs two lines, or two circles or arcs')
        break
      }

      case 'midpoint': {
        const ends = lineEndpoints(model, constraint.lineId)
        if (!ends) {
          errors.push('Midpoint constraint needs a line')
          break
        }
        const pointId = constraint.pointId
        push(id, (read) => {
          const access = accessors(read)
          return access.point(pointId).x - midpoint(access.point(ends[0]), access.point(ends[1])).x
        })
        push(id, (read) => {
          const access = accessors(read)
          return access.point(pointId).y - midpoint(access.point(ends[0]), access.point(ends[1])).y
        })
        break
      }

      case 'symmetric': {
        const axis = lineEndpoints(model, constraint.symmetryLineId)
        const pairs = symmetricPairs(model, constraint.entityId1, constraint.entityId2)
        if (!axis || !pairs) {
          errors.push('Symmetric constraint needs two points or two lines and a mirror line')
          break
        }
        for (const [left, right] of pairs) {
          push(id, (read) => {
            const access = accessors(read)
            const direction = lineDirection(read, axis[0], axis[1])
            const span = length(direction)
            if (span === 0) return 0
            return dot(sub(access.point(right), access.point(left)), direction) / span
          })
          push(id, (read) => {
            const access = accessors(read)
            const direction = lineDirection(read, axis[0], axis[1])
            const span = length(direction)
            if (span === 0) return 0
            const center = midpoint(access.point(left), access.point(right))
            return cross(direction, sub(center, access.point(axis[0]))) / span
          })
        }
        break
      }

      case 'distance': {
        if (!constraint.isDriving) break
        const { pointId1, pointId2 } = constraint
        push(id, (read) => {
          const access = accessors(read)
          return distance(access.point(pointId1), access.point(pointId2)) - constraint.value
        })
        break
      }

      case 'length': {
        if (!constraint.isDriving) break
        const ends = lineEndpoints(model, constraint.lineId)
        if (!ends) {
          errors.push('Length dimension needs a line')
          break
        }
        push(id, (read) => {
          const access = accessors(read)
          return distance(access.point(ends[0]), access.point(ends[1])) - constraint.value
        })
        break
      }

      case 'angle': {
        if (!constraint.isDriving) break
        const first = lineEndpoints(model, constraint.lineId1)
        const second = lineEndpoints(model, constraint.lineId2)
        if (!first || !second) {
          errors.push('Angle dimension needs two lines')
          break
        }
        push(id, (read) => {
          const a = lineDirection(read, first[0], first[1])
          const b = lineDirection(read, second[0], second[1])
          const scale = length(a) * length(b)
          if (scale === 0) return 0
          const target = (constraint.value * Math.PI) / 180
          // sin(actual - target), scaled to unit length so the residual stays bounded.
          return (cross(a, b) * Math.cos(target) - dot(a, b) * Math.sin(target)) / scale
        })
        break
      }

      case 'radius':
      case 'diameter': {
        if (!constraint.isDriving) break
        const entity = model.getEntity(constraint.circleId)
        if (!entity || !centerOf(entity)) {
          errors.push(`${constraint.type} dimension needs a circle or arc`)
          break
        }
        const factor = constraint.type === 'diameter' ? 2 : 1
        push(id, (read) => accessors(read).radius(entity.id) * factor - constraint.value)
        break
      }
    }
  }

  return { equations, errors }
}

function symmetricPairs(
  model: SketchModel,
  firstId: string,
  secondId: string,
): [string, string][] | null {
  const first = model.getEntity(firstId)
  const second = model.getEntity(secondId)
  if (first?.type === 'point' && second?.type === 'point') return [[first.id, second.id]]
  if (first?.type === 'line' && second?.type === 'line') {
    return [
      [first.startPointId, second.startPointId],
      [first.endPointId, second.endPointId],
    ]
  }
  return null
}

/**
 * Tangency between a line and a circle/arc, or between two circles/arcs. The
 * branch (which side of the line, inner or outer tangency) is locked in from the
 * geometry as it stands so the solve does not flip the sketch inside out.
 */
function buildTangent(
  model: SketchModel,
  firstId: string,
  secondId: string,
  initialRead: Read,
): ((read: Read) => number) | null {
  const first = model.getEntity(firstId)
  const second = model.getEntity(secondId)
  if (!first || !second) return null

  const line = first.type === 'line' ? first : second.type === 'line' ? second : null
  const curve = line === first ? second : first

  if (line && curve && centerOf(curve)) {
    const centerId = centerOf(curve) as string
    const { startPointId, endPointId } = line
    const access = accessors(initialRead)
    const direction = sub(access.point(endPointId), access.point(startPointId))
    const offset = cross(sub(access.point(centerId), access.point(startPointId)), direction)
    const side = offset >= 0 ? 1 : -1
    return (read) => {
      const current = accessors(read)
      const dir = sub(current.point(endPointId), current.point(startPointId))
      const span = length(dir)
      if (span === 0) return 0
      return cross(sub(current.point(centerId), current.point(startPointId)), dir) / span -
        side * current.radius(curve.id)
    }
  }

  const centerA = centerOf(first)
  const centerB = centerOf(second)
  if (!centerA || !centerB) return null

  const access = accessors(initialRead)
  const separation = distance(access.point(centerA), access.point(centerB))
  const internal = separation < Math.max(access.radius(first.id), access.radius(second.id))
  return (read) => {
    const current = accessors(read)
    const gap = distance(current.point(centerA), current.point(centerB))
    const radiusA = current.radius(first.id)
    const radiusB = current.radius(second.id)
    return internal ? gap - Math.abs(radiusA - radiusB) : gap - (radiusA + radiusB)
  }
}

/* -------------------------------------------------------------------------- */
/* Dimensions                                                                  */
/* -------------------------------------------------------------------------- */

/** Current measured value of a dimension, or `null` if it cannot be measured. */
export function measureConstraint(
  model: SketchModel,
  constraint: DimensionalConstraint,
): number | null {
  switch (constraint.type) {
    case 'distance': {
      const a = model.getEntity(constraint.pointId1)
      const b = model.getEntity(constraint.pointId2)
      if (a?.type !== 'point' || b?.type !== 'point') return null
      return distance(a, b)
    }
    case 'length': {
      const line = model.getEntity(constraint.lineId)
      if (line?.type !== 'line') return null
      return distance(model.requirePoint(line.startPointId), model.requirePoint(line.endPointId))
    }
    case 'angle': {
      const first = model.getEntity(constraint.lineId1)
      const second = model.getEntity(constraint.lineId2)
      if (first?.type !== 'line' || second?.type !== 'line') return null
      const a = sub(model.requirePoint(first.endPointId), model.requirePoint(first.startPointId))
      const b = sub(model.requirePoint(second.endPointId), model.requirePoint(second.startPointId))
      return (angleBetween(a, b) * 180) / Math.PI
    }
    case 'radius':
    case 'diameter': {
      const entity = model.getEntity(constraint.circleId)
      if (entity?.type !== 'circle' && entity?.type !== 'arc') return null
      return constraint.type === 'diameter' ? entity.radius * 2 : entity.radius
    }
  }
}

/**
 * Evaluates every dimension formula in dependency order, writing the result back
 * onto the constraint. Returns one message per formula that could not be resolved.
 */
function resolveExpressions(model: SketchModel): string[] {
  const errors: string[] = []
  const dimensions = [...model.constraints.values()].filter(isDimensional)
  const byName = new Map<string, DimensionalConstraint>()
  for (const dimension of dimensions) {
    if (dimension.name !== undefined) byName.set(dimension.name, dimension)
  }

  const values: Record<string, number> = {}
  for (const dimension of dimensions) {
    if (dimension.name !== undefined && !dimension.expression) values[dimension.name] = dimension.value
  }

  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (dimension: DimensionalConstraint): void => {
    const formula = dimension.expression
    if (!formula) return
    if (state.get(dimension.id) === 'done') return
    if (state.get(dimension.id) === 'visiting') {
      throw new ExpressionError(
        `Circular reference in dimension expression for ${dimension.name ?? dimension.id}`,
      )
    }
    state.set(dimension.id, 'visiting')
    for (const reference of expressionReferences(formula)) {
      const dependency = byName.get(reference)
      if (dependency) visit(dependency)
    }
    dimension.value = evaluateExpression(formula, values)
    if (dimension.name !== undefined) values[dimension.name] = dimension.value
    state.set(dimension.id, 'done')
  }

  for (const dimension of dimensions) {
    try {
      visit(dimension)
    } catch (cause) {
      errors.push(`Dimension ${dimension.name ?? dimension.id}: ${(cause as Error).message}`)
      for (const [key, value] of state) if (value === 'visiting') state.set(key, 'done')
    }
  }
  return errors
}

/* -------------------------------------------------------------------------- */
/* Solver                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Simultaneous constraint solver. All active constraints are turned into
 * residual equations and driven to zero with a damped Gauss-Newton
 * (Levenberg-Marquardt) iteration over the sketch's free variables.
 */
export class ConstraintSolver {
  solve(model: SketchModel, options: SolverOptions = {}): SolveResult {
    const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS
    const tolerance = options.tolerance ?? DEFAULT_TOLERANCE
    const errors = resolveExpressions(model)

    const table = buildVariables(model, frozenPoints(model, options.pinnedPointIds ?? []))
    const initialRead: Read = (key) => table.read(key, table.initialValues)
    const { equations, errors: buildErrors } = buildEquations(model, initialRead)
    errors.push(...buildErrors)

    const variableCount = table.size
    const equationCount = equations.length
    const evaluate = (values: readonly number[]): number[] =>
      equations.map((equation) => equation.residual((key) => table.read(key, values)))

    let values = [...table.initialValues]
    let residuals = evaluate(values)
    let cost = sumOfSquares(residuals)
    let iterations = 0
    let damping = 1e-3

    while (
      iterations < maxIterations &&
      variableCount > 0 &&
      equationCount > 0 &&
      maxAbs(residuals) > tolerance
    ) {
      iterations += 1
      const jacobian = numericJacobian(evaluate, values, equationCount)
      const gradient = new Array<number>(variableCount).fill(0)
      const normal = new Matrix(variableCount, variableCount)

      for (let column = 0; column < variableCount; column += 1) {
        let sum = 0
        for (let row = 0; row < equationCount; row += 1) {
          sum += jacobian.get(row, column) * (residuals[row] as number)
        }
        gradient[column] = sum
      }
      for (let a = 0; a < variableCount; a += 1) {
        for (let b = a; b < variableCount; b += 1) {
          let sum = 0
          for (let row = 0; row < equationCount; row += 1) {
            sum += jacobian.get(row, a) * jacobian.get(row, b)
          }
          normal.set(a, b, sum)
          normal.set(b, a, sum)
        }
      }

      let improved = false
      for (let attempt = 0; attempt < 16 && !improved; attempt += 1) {
        const damped = new Matrix(variableCount, variableCount)
        for (let a = 0; a < variableCount; a += 1) {
          for (let b = 0; b < variableCount; b += 1) {
            damped.set(a, b, normal.get(a, b) + (a === b ? damping : 0))
          }
        }
        const step = solveLinearSystem(
          damped,
          gradient.map((value) => -value),
        )
        if (step) {
          const candidate = values.map((value, index) => value + (step[index] as number))
          const candidateResiduals = evaluate(candidate)
          const candidateCost = sumOfSquares(candidateResiduals)
          if (candidateCost < cost) {
            values = candidate
            residuals = candidateResiduals
            cost = candidateCost
            damping = Math.max(damping / 10, 1e-12)
            improved = true
            break
          }
        }
        damping *= 10
        if (damping > 1e12) break
      }
      if (!improved) break
    }

    const success = equationCount === 0 || maxAbs(residuals) <= Math.max(tolerance, 1e-6)
    const jacobian = numericJacobian(evaluate, values, equationCount)
    const { rank, pivotColumns } = rowEchelon(jacobian)
    const dof = variableCount - rank

    if (rank < equationCount) {
      const redundant = equationCount - rank
      errors.push(
        `Sketch is over-constrained: ${redundant} redundant or conflicting equation${
          redundant === 1 ? '' : 's'
        }`,
      )
    }
    if (!success) {
      errors.push(
        `Could not satisfy all constraints (largest residual ${maxAbs(residuals).toPrecision(3)})`,
      )
    }

    const entityPositions = collectPositions(model, table, values)
    if (options.apply !== false) applyPositions(model, entityPositions)

    const solvedConstraints = new Map<string, number>()
    for (const constraint of model.constraints.values()) {
      if (!isDimensional(constraint)) continue
      if (constraint.isDriving) {
        solvedConstraints.set(constraint.id, constraint.value)
        continue
      }
      const measured = measureConstraint(model, constraint)
      if (measured === null) continue
      constraint.value = measured
      solvedConstraints.set(constraint.id, measured)
    }

    return {
      success,
      entityPositions,
      constraints: solvedConstraints,
      errors,
      dof,
      iterations,
      underConstrainedEntityIds: freeEntityIds(model, table, pivotColumns),
    }
  }

  /**
   * Adds a constraint only when the sketch stays solvable. The trial runs on a
   * clone, so a rejected constraint leaves the model exactly as it was.
   */
  tryAddConstraint(model: SketchModel, constraint: Constraint): ConstraintOutcome {
    const trial = model.clone()
    try {
      trial.addConstraint(constraintFromJSON(constraint.toJSON()))
    } catch (cause) {
      return { ok: false, error: (cause as Error).message }
    }

    const result = this.solve(trial)
    if (!result.success || result.errors.length > 0) {
      return {
        ok: false,
        error: result.errors[0] ?? 'Adding this constraint would over-constrain the sketch',
      }
    }

    model.addConstraint(constraint)
    this.solve(model)
    return { ok: true }
  }
}

function numericJacobian(
  evaluate: (values: readonly number[]) => number[],
  values: readonly number[],
  equationCount: number,
): Matrix {
  const jacobian = new Matrix(equationCount, values.length)
  for (let column = 0; column < values.length; column += 1) {
    const step = 1e-6 * Math.max(1, Math.abs(values[column] as number))
    const forward = [...values]
    const backward = [...values]
    forward[column] = (values[column] as number) + step
    backward[column] = (values[column] as number) - step
    const high = evaluate(forward)
    const low = evaluate(backward)
    for (let row = 0; row < equationCount; row += 1) {
      jacobian.set(row, column, ((high[row] as number) - (low[row] as number)) / (2 * step))
    }
  }
  return jacobian
}

function collectPositions(
  model: SketchModel,
  table: VariableTable,
  values: readonly number[],
): Map<string, EntityPosition> {
  const positions = new Map<string, EntityPosition>()
  for (const entity of model.entities.values()) {
    switch (entity.type) {
      case 'point':
        positions.set(entity.id, {
          x: table.read(pointXKey(entity.id), values),
          y: table.read(pointYKey(entity.id), values),
        })
        break
      case 'circle':
      case 'arc':
        positions.set(entity.id, { radius: table.read(radiusKey(entity.id), values) })
        break
      case 'ellipse':
        positions.set(entity.id, { minorRadius: table.read(minorRadiusKey(entity.id), values) })
        break
      default:
        break
    }
  }
  return positions
}

function applyPositions(model: SketchModel, positions: ReadonlyMap<string, EntityPosition>): void {
  for (const [entityId, position] of positions) {
    const entity = model.getEntity(entityId)
    if (!entity) continue
    if (entity.type === 'point' && position.x !== undefined && position.y !== undefined) {
      entity.x = position.x
      entity.y = position.y
    } else if (
      (entity.type === 'circle' || entity.type === 'arc') &&
      position.radius !== undefined
    ) {
      entity.radius = position.radius
    } else if (entity.type === 'ellipse' && position.minorRadius !== undefined) {
      entity.minorRadius = position.minorRadius
    }
  }
}

/** Entities owning a variable the constraints do not pin down, plus their dependants. */
function freeEntityIds(
  model: SketchModel,
  table: VariableTable,
  pivotColumns: readonly number[],
): string[] {
  const pivots = new Set(pivotColumns)
  const free = new Set<string>()
  for (let column = 0; column < table.size; column += 1) {
    if (!pivots.has(column)) free.add(table.owners[column] as string)
  }
  if (free.size === 0) return []

  let grew = true
  while (grew) {
    grew = false
    for (const entity of model.entities.values()) {
      if (free.has(entity.id)) continue
      if (entity.referencedIds.some((referenced) => free.has(referenced))) {
        free.add(entity.id)
        grew = true
      }
    }
  }
  return [...free]
}

function sumOfSquares(values: readonly number[]): number {
  return values.reduce((total, value) => total + value * value, 0)
}

function maxAbs(values: readonly number[]): number {
  return values.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0)
}
