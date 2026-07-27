import type { Feature } from '../features/domain/Feature'
import type { FeatureTree } from '../features/FeatureTree'
import { measureSurfaceArea } from '../analysis/MeasureArea'
import { measureVolume } from '../analysis/MeasureVolume'
import type { Part } from '../domain/Document'
import { isDimensional } from '../sketch/domain/Constraint'
import { isLine } from '../sketch/domain/SketchEntity'
import type { SketchModel } from '../sketch/domain/SketchModel'
import { distance } from '../sketch/domain/geometry'
import type { ExpressionNode, ReferenceResolver } from './expression'
import {
  CONSTANTS,
  ExpressionError,
  FUNCTIONS,
  UNIT_FACTORS,
  evaluate,
  expressionReferences,
  isUnitName,
  parseExpression,
} from './expression'

/**
 * Global named parameters. Every feature, every sketch dimension and every rule
 * reads from one table, so a change to `width` reaches the whole document
 * without anything having to know who else depends on it.
 *
 * A parameter is stored as its source text, never as a number: the number is
 * what falls out of evaluating the whole table in dependency order, and it is
 * recomputed rather than cached across edits. Names that contain a dot are not
 * parameters at all — they are references into the model, answered by the
 * resolver, which is what makes `d1 = Sketch1.line1.length` work.
 */

export class ParameterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterError'
  }
}

/** What a parameter measures. Drives the unit the editor offers, nothing else. */
export const ParameterQuantity = {
  Number: 'number',
  Length: 'length',
  Angle: 'angle',
} as const

export type ParameterQuantity = (typeof ParameterQuantity)[keyof typeof ParameterQuantity]

export const PARAMETER_QUANTITIES: readonly ParameterQuantity[] = Object.values(ParameterQuantity)

export interface ParameterJSON {
  readonly name: string
  /** Source text, e.g. `width * 2 + 5`. Always a string, even for a constant. */
  readonly expression: string
  readonly quantity: ParameterQuantity
  readonly description: string
  /** Unit the editor displays in. Base units (mm, degrees) when null. */
  readonly displayUnit: string | null
}

export interface ParameterInit {
  readonly name: string
  readonly expression: string | number
  readonly quantity?: ParameterQuantity
  readonly description?: string
  readonly displayUnit?: string | null
}

export type Parameter = ParameterJSON

export interface ParameterFailure {
  readonly name: string
  readonly message: string
}

export interface ParameterEvaluation {
  /** Value per parameter that evaluated. A failed parameter is absent. */
  readonly values: Readonly<Record<string, number>>
  readonly failures: readonly ParameterFailure[]
  /** The order the table was evaluated in — dependencies first. */
  readonly order: readonly string[]
}

export interface ParameterTableJSON {
  readonly parameters: readonly ParameterJSON[]
}

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Names an expression already means something else by. */
function reservedReason(name: string): string | null {
  if (CONSTANTS[name] !== undefined) return `"${name}" is a built-in constant`
  if (isUnitName(name)) return `"${name}" is a unit`
  if (FUNCTIONS[name]) return `"${name}" is a built-in function`
  return null
}

export function isValidParameterName(name: string): boolean {
  return NAME_PATTERN.test(name) && reservedReason(name) === null
}

export class ParameterTable {
  readonly #parameters = new Map<string, ParameterJSON>()
  readonly #parsed = new Map<string, ExpressionNode>()
  #resolver: ReferenceResolver | null = null
  #evaluation: ParameterEvaluation | null = null

  constructor(init: readonly ParameterInit[] = []) {
    for (const parameter of init) this.set(parameter)
  }

  /** Every parameter, in the order they were added. */
  get parameters(): readonly ParameterJSON[] {
    return [...this.#parameters.values()]
  }

  get names(): string[] {
    return [...this.#parameters.keys()]
  }

  get length(): number {
    return this.#parameters.size
  }

  has(name: string): boolean {
    return this.#parameters.has(name)
  }

  get(name: string): ParameterJSON | undefined {
    return this.#parameters.get(name)
  }

  /**
   * Answers dotted references — `Sketch1.d1`, `Part1.Body1.volume` — that name
   * something in the model rather than a parameter. See
   * {@link createModelResolver} for the one that reads a document.
   */
  setResolver(resolver: ReferenceResolver | null): void {
    this.#resolver = resolver
    this.#evaluation = null
  }

  /** Adds a parameter, or replaces the expression of one already there. */
  set(parameter: ParameterInit): ParameterJSON
  set(name: string, expression: string | number): ParameterJSON
  set(first: ParameterInit | string, expression?: string | number): ParameterJSON {
    const init: ParameterInit =
      typeof first === 'string' ? { name: first, expression: expression ?? 0 } : first

    const name = init.name.trim()
    if (!NAME_PATTERN.test(name)) {
      throw new ParameterError(
        `"${init.name}" is not a valid parameter name — use a letter or underscore, then letters, digits or underscores`,
      )
    }
    const reserved = reservedReason(name)
    if (reserved) throw new ParameterError(`${reserved}, so it cannot name a parameter`)

    const source = typeof init.expression === 'number' ? String(init.expression) : init.expression.trim()
    if (source.length === 0) throw new ParameterError(`Parameter "${name}" needs an expression`)

    const existing = this.#parameters.get(name)
    const stored: ParameterJSON = {
      name,
      expression: source,
      quantity: init.quantity ?? existing?.quantity ?? ParameterQuantity.Number,
      description: init.description ?? existing?.description ?? '',
      displayUnit: init.displayUnit ?? existing?.displayUnit ?? null,
    }

    // Parse eagerly: a syntax error belongs to the edit that introduced it, not
    // to the next rebuild that happens to read the table.
    this.#parsed.set(name, parseExpression(source))
    this.#parameters.set(name, stored)
    this.#evaluation = null
    return stored
  }

  /** Changes the description or display unit without touching the expression. */
  annotate(
    name: string,
    changes: { readonly description?: string; readonly displayUnit?: string | null; readonly quantity?: ParameterQuantity },
  ): ParameterJSON {
    const existing = this.#parameters.get(name)
    if (!existing) throw new ParameterError(`No parameter named "${name}"`)
    const updated: ParameterJSON = { ...existing, ...changes }
    this.#parameters.set(name, updated)
    return updated
  }

  /**
   * Renames a parameter and rewrites every expression that referred to it, so a
   * rename never silently breaks the rest of the table.
   */
  rename(from: string, to: string): ParameterJSON {
    const existing = this.#parameters.get(from)
    if (!existing) throw new ParameterError(`No parameter named "${from}"`)
    if (from === to) return existing
    if (this.#parameters.has(to)) throw new ParameterError(`"${to}" is already taken`)

    const entries = [...this.#parameters.values()]
    this.#parameters.clear()
    this.#parsed.clear()

    for (const parameter of entries) {
      const renamed = parameter.name === from ? to : parameter.name
      this.set({
        ...parameter,
        name: renamed,
        expression: rewriteReference(parameter.expression, from, to),
      })
    }
    return this.#parameters.get(to) as ParameterJSON
  }

  remove(name: string): boolean {
    const removed = this.#parameters.delete(name)
    this.#parsed.delete(name)
    if (removed) this.#evaluation = null
    return removed
  }

  clear(): void {
    this.#parameters.clear()
    this.#parsed.clear()
    this.#evaluation = null
  }

  /** The names a parameter reads directly, parameters and model refs alike. */
  dependencies(name: string): string[] {
    const node = this.#parsed.get(name)
    return node ? expressionReferences(node) : []
  }

  /** Every parameter that would change if `name` did, transitively. */
  dependents(name: string): string[] {
    const found = new Set<string>()
    let grew = true
    while (grew) {
      grew = false
      for (const parameter of this.#parameters.keys()) {
        if (found.has(parameter) || parameter === name) continue
        const reads = this.dependencies(parameter)
        if (reads.includes(name) || reads.some((reference) => found.has(reference))) {
          found.add(parameter)
          grew = true
        }
      }
    }
    return [...this.#parameters.keys()].filter((parameter) => found.has(parameter))
  }

  /**
   * Evaluates the whole table in dependency order. A parameter that cannot be
   * worked out — a cycle, a bad reference, a division by zero — is reported as a
   * failure and left out of `values`; everything independent of it still
   * evaluates, so one broken cell never blanks the table.
   */
  evaluate(): ParameterEvaluation {
    if (this.#evaluation) return this.#evaluation

    const values: Record<string, number> = {}
    const failures: ParameterFailure[] = []
    const order: string[] = []
    const state = new Map<string, 'visiting' | 'done' | 'failed'>()

    // Dependencies are always visited before the expression that reads them, so
    // a parameter with no value here is one that already failed — say so rather
    // than letting it surface as "unknown name".
    const resolve: ReferenceResolver = (reference) => {
      if (this.#parameters.has(reference)) {
        const value = values[reference]
        if (value === undefined) throw new ExpressionError(`"${reference}" could not be evaluated`)
        return value
      }
      return this.#resolver?.(reference)
    }

    const fail = (name: string, message: string): void => {
      state.set(name, 'failed')
      if (!failures.some((failure) => failure.name === name)) failures.push({ name, message })
    }

    const visit = (name: string, stack: readonly string[]): void => {
      const status = state.get(name)
      if (status === 'done' || status === 'failed') return
      if (status === 'visiting') {
        // Report the cycle against every parameter in it, so the editor can
        // mark the whole loop rather than one arbitrary member of it.
        const cycle = [...stack.slice(stack.indexOf(name)), name]
        for (const member of cycle) fail(member, `Circular reference: ${cycle.join(' → ')}`)
        throw new ExpressionError(`Circular reference: ${cycle.join(' → ')}`)
      }

      state.set(name, 'visiting')
      const node = this.#parsed.get(name)
      if (!node) {
        fail(name, `No parameter named "${name}"`)
        return
      }

      try {
        for (const reference of expressionReferences(node)) {
          if (this.#parameters.has(reference)) visit(reference, [...stack, name])
        }
        values[name] = evaluate(node, { resolve })
        state.set(name, 'done')
        order.push(name)
      } catch (error) {
        if (state.get(name) !== 'failed') {
          fail(name, error instanceof Error ? error.message : String(error))
        }
        delete values[name]
      }
    }

    for (const name of this.#parameters.keys()) {
      try {
        visit(name, [])
      } catch {
        // A cycle unwinds through here; every member is already recorded.
      }
    }

    this.#evaluation = { values, failures, order }
    return this.#evaluation
  }

  /** Current value of a parameter. Throws when it did not evaluate. */
  value(name: string): number {
    const evaluation = this.evaluate()
    const value = evaluation.values[name]
    if (value === undefined) {
      const failure = evaluation.failures.find((entry) => entry.name === name)
      throw new ParameterError(failure?.message ?? `No parameter named "${name}"`)
    }
    return value
  }

  valueOr(name: string, fallback: number): number {
    return this.evaluate().values[name] ?? fallback
  }

  values(): Readonly<Record<string, number>> {
    return this.evaluate().values
  }

  get failures(): readonly ParameterFailure[] {
    return this.evaluate().failures
  }

  /** Whether every parameter in the table evaluated. */
  get isValid(): boolean {
    return this.evaluate().failures.length === 0
  }

  /**
   * Evaluates an expression written elsewhere — a feature's driving formula, a
   * rule condition — against this table.
   */
  resolveExpression(source: string): number {
    const values = this.values()
    return evaluate(parseExpression(source), {
      resolve: (name) => values[name] ?? this.#resolver?.(name),
    })
  }

  /** A resolver over this table, for anything that evaluates on its own. */
  get resolver(): ReferenceResolver {
    const values = this.values()
    return (name) => values[name] ?? this.#resolver?.(name)
  }

  toJSON(): ParameterTableJSON {
    return { parameters: this.parameters }
  }

  static fromJSON(json: ParameterTableJSON | undefined): ParameterTable {
    const table = new ParameterTable()
    for (const parameter of json?.parameters ?? []) {
      try {
        table.set(parameter)
      } catch {
        // A parameter this build cannot parse is dropped rather than failing
        // the open — the same bargain the feature tree makes.
      }
    }
    return table
  }

  clone(): ParameterTable {
    const copy = ParameterTable.fromJSON(this.toJSON())
    copy.setResolver(this.#resolver)
    return copy
  }
}

/** Replaces whole-word occurrences of a name, leaving `widths` alone for `width`. */
function rewriteReference(source: string, from: string, to: string): string {
  return source.replace(
    new RegExp(`(?<![A-Za-z0-9_.])${escapeForRegExp(from)}(?![A-Za-z0-9_])`, 'g'),
    to,
  )
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* ------------------------------------------------------- model references */

export interface ModelReferenceTargets {
  readonly sketches?: readonly SketchModel[]
  readonly tree?: FeatureTree
  readonly parts?: readonly Part[]
  /** Density used by `<part>.<body>.mass`, in kg per mm³. */
  readonly density?: number
}

/** Matches {@link DEFAULT_DENSITY} in the analysis module: steel, kg/mm³. */
const DEFAULT_DENSITY = 7.85e-6

/**
 * Reads dotted names out of the model:
 *
 * - `Sketch1.d1` — a driving dimension, by the name the sketch gave it
 * - `Sketch1.line1.length` — the measured length of a line, by entity id
 * - `Extrude1.distance` — one numeric parameter of a feature
 * - `Part1.Body1.volume` — and `.area`, `.mass`, of a tessellated body
 *
 * Anything it does not recognise comes back undefined, which the expression
 * evaluator turns into an "unknown name" the user can see and fix.
 */
export function createModelResolver(targets: ModelReferenceTargets): ReferenceResolver {
  return (name) => {
    const path = name.split('.')
    if (path.length < 2) return undefined

    const [head, second, third] = path as [string, string, string | undefined]

    const sketch = targets.sketches?.find((candidate) => candidate.name === head)
    if (sketch) {
      const dimension = [...sketch.constraints.values()].find(
        (constraint) => isDimensional(constraint) && constraint.name === second,
      )
      if (dimension && isDimensional(dimension)) return dimension.value
      if (third === 'length') return lineLength(sketch, second)
      return undefined
    }

    const part = targets.parts?.find((candidate) => candidate.name === head)
    if (part && third !== undefined) {
      const body = part.bodies.find((candidate) => candidate.name === second)
      if (!body) return undefined
      switch (third) {
        case 'volume':
          return measureVolume(body.mesh)
        case 'area':
          return measureSurfaceArea(body.mesh)
        case 'mass':
          return measureVolume(body.mesh) * (targets.density ?? DEFAULT_DENSITY)
        default:
          return undefined
      }
    }

    const feature = targets.tree?.features.find((candidate: Feature) => candidate.name === head)
    if (feature) {
      const value = feature.parameters[second]
      return typeof value === 'number' ? value : undefined
    }

    return undefined
  }
}

function lineLength(sketch: SketchModel, entityId: string): number | undefined {
  const entity = sketch.getEntity(entityId)
  if (!entity || !isLine(entity)) return undefined
  const start = sketch.getEntity(entity.startPointId)
  const end = sketch.getEntity(entity.endPointId)
  if (!start || start.type !== 'point' || !end || end.type !== 'point') return undefined
  return distance(start, end)
}

/** Millimetres (or degrees) expressed in the parameter's display unit. */
export function inDisplayUnit(value: number, unit: string | null): number {
  if (!unit) return value
  const factor = UNIT_FACTORS[unit]
  return factor === undefined ? value : value / factor
}
