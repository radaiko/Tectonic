import type { Feature } from '../features/domain/Feature'
import { createFeature, nextFeatureName } from '../features/domain/factory'
import type { FeatureParameters, ParameterValue } from '../features/domain/parameters'
import type { FeatureType } from '../features/domain/FeatureType'
import { isFeatureType } from '../features/domain/FeatureType'
import type { FeatureTree } from '../features/FeatureTree'
import { evaluateCondition } from './expression'
import type { ParameterTable } from './ParameterTable'
import type { RuleContext, RuleTrigger, RulesEngine } from './RulesEngine'
import { isRuleTrigger } from './RulesEngine'

/**
 * Design automation as data: a script is a JSON array of operations, run top to
 * bottom against the parameter table and the feature tree.
 *
 * JSON rather than code because a script has to survive a round trip through a
 * .tectonic file, be editable in a panel, and — the part that matters most — be
 * undoable. Every operation reports the operation that reverses it, so the
 * runner hands back a script that puts the document back where it was. A
 * JavaScript dialect can be layered on top later; it would compile to this.
 */

export class ScriptError extends Error {
  /** Index of the operation that failed, or -1 when the script itself is bad. */
  readonly operationIndex: number

  constructor(message: string, operationIndex = -1) {
    super(message)
    this.name = 'ScriptError'
    this.operationIndex = operationIndex
  }
}

export const ScriptOperationType = {
  SetParameter: 'setParameter',
  AddParameter: 'addParameter',
  RemoveParameter: 'removeParameter',
  SetFeatureParameter: 'setFeatureParameter',
  SuppressFeature: 'suppressFeature',
  UnsuppressFeature: 'unsuppressFeature',
  RenameFeature: 'renameFeature',
  AddFeature: 'addFeature',
  RemoveFeature: 'removeFeature',
  RunRules: 'runRules',
  If: 'if',
  Repeat: 'repeat',
} as const

export type ScriptOperationType = (typeof ScriptOperationType)[keyof typeof ScriptOperationType]

export const SCRIPT_OPERATION_TYPES: readonly ScriptOperationType[] =
  Object.values(ScriptOperationType)

export type ScriptOperation =
  /** `{ "type": "setParameter", "name": "length", "value": 200 }` */
  | {
      readonly type: 'setParameter'
      readonly name: string
      readonly value?: number
      readonly expression?: string
    }
  | { readonly type: 'addParameter'; readonly name: string; readonly expression: string }
  | { readonly type: 'removeParameter'; readonly name: string }
  | {
      readonly type: 'setFeatureParameter'
      readonly feature: string
      readonly key: string
      readonly value?: ParameterValue
      readonly expression?: string
    }
  | { readonly type: 'suppressFeature'; readonly feature: string }
  | { readonly type: 'unsuppressFeature'; readonly feature: string }
  | { readonly type: 'renameFeature'; readonly feature: string; readonly name: string }
  | {
      readonly type: 'addFeature'
      readonly featureType: FeatureType
      readonly name?: string
      readonly sketchId?: string | null
      readonly parameters?: FeatureParameters
    }
  | { readonly type: 'removeFeature'; readonly feature: string }
  | { readonly type: 'runRules'; readonly trigger?: RuleTrigger }
  | {
      readonly type: 'if'
      readonly condition: string
      readonly then: readonly ScriptOperation[]
      readonly else?: readonly ScriptOperation[]
    }
  | {
      readonly type: 'repeat'
      readonly count?: number
      readonly countExpression?: string
      /** Name bound to the 0-based iteration number inside the body. */
      readonly indexName?: string
      readonly body: readonly ScriptOperation[]
    }

export interface DesignScriptJSON {
  readonly name: string
  readonly description: string
  readonly operations: readonly ScriptOperation[]
}

export interface ScriptContext extends RuleContext {
  readonly parameters: ParameterTable
  readonly rules?: RulesEngine
}

export interface ScriptStep {
  readonly index: number
  readonly operation: ScriptOperation
  readonly status: 'applied' | 'skipped' | 'failed'
  readonly detail: string
}

export interface ScriptRunReport {
  readonly steps: readonly ScriptStep[]
  /** Operations that put the document back, already in reverse order. */
  readonly undo: readonly ScriptOperation[]
  readonly failures: readonly { readonly index: number; readonly message: string }[]
  readonly completed: boolean
}

export interface RunScriptOptions {
  /** Called after every operation, for a progress bar. */
  readonly onProgress?: (step: ScriptStep, done: number, total: number) => void
  /** Stop at the first failure instead of carrying on. Defaults to true. */
  readonly stopOnError?: boolean
}

/** A named, ordered list of operations. */
export class DesignScript {
  name: string
  description: string
  readonly operations: ScriptOperation[]

  constructor(init: Partial<DesignScriptJSON> = {}) {
    this.name = init.name ?? 'Script'
    this.description = init.description ?? ''
    this.operations = [...(init.operations ?? [])]
  }

  get length(): number {
    return this.operations.length
  }

  add(operation: ScriptOperation, index?: number): ScriptOperation {
    const at = index === undefined ? this.operations.length : Math.max(0, Math.min(index, this.operations.length))
    this.operations.splice(at, 0, operation)
    return operation
  }

  removeAt(index: number): boolean {
    if (index < 0 || index >= this.operations.length) return false
    this.operations.splice(index, 1)
    return true
  }

  run(context: ScriptContext, options: RunScriptOptions = {}): ScriptRunReport {
    return runScript(this.operations, context, options)
  }

  toJSON(): DesignScriptJSON {
    return { name: this.name, description: this.description, operations: [...this.operations] }
  }

  static fromJSON(json: unknown): DesignScript {
    return new DesignScript(parseScript(json))
  }
}

/* -------------------------------------------------------------------- runner */

export function runScript(
  operations: readonly ScriptOperation[],
  context: ScriptContext,
  options: RunScriptOptions = {},
): ScriptRunReport {
  const stopOnError = options.stopOnError ?? true
  const steps: ScriptStep[] = []
  const undo: ScriptOperation[] = []
  const failures: { index: number; message: string }[] = []
  let completed = true

  const total = operations.length
  for (const [index, operation] of operations.entries()) {
    let step: ScriptStep
    try {
      const outcome = applyOperation(operation, context, options)
      // Nested operations report their own undo, already reversed.
      undo.unshift(...outcome.undo)
      step = {
        index,
        operation,
        status: outcome.applied ? 'applied' : 'skipped',
        detail: outcome.detail,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ index, message })
      step = { index, operation, status: 'failed', detail: message }
    }

    steps.push(step)
    options.onProgress?.(step, index + 1, total)

    if (step.status === 'failed' && stopOnError) {
      completed = false
      break
    }
  }

  return { steps, undo, failures, completed: completed && failures.length === 0 }
}

/** Re-applies the undo list a run handed back, restoring the previous state. */
export function undoScript(report: ScriptRunReport, context: ScriptContext): ScriptRunReport {
  return runScript(report.undo, context, { stopOnError: false })
}

interface Outcome {
  readonly applied: boolean
  readonly detail: string
  /** Operations that reverse this one, in the order they must be replayed. */
  readonly undo: readonly ScriptOperation[]
}

function applyOperation(
  operation: ScriptOperation,
  context: ScriptContext,
  options: RunScriptOptions,
): Outcome {
  switch (operation.type) {
    case 'setParameter': {
      const value = operationValue(operation.value, operation.expression, context)
      if (!context.parameters.has(operation.name)) {
        throw new ScriptError(`No parameter named "${operation.name}"`)
      }
      const previous = context.parameters.get(operation.name)
      context.parameters.set(operation.name, String(value))
      return {
        applied: true,
        detail: `${operation.name} = ${value}`,
        undo: [
          {
            type: 'setParameter',
            name: operation.name,
            expression: previous?.expression ?? String(value),
          },
        ],
      }
    }

    case 'addParameter': {
      if (context.parameters.has(operation.name)) {
        const previous = context.parameters.get(operation.name)
        context.parameters.set(operation.name, operation.expression)
        return {
          applied: true,
          detail: `${operation.name} redefined`,
          undo: [
            {
              type: 'setParameter',
              name: operation.name,
              expression: previous?.expression ?? operation.expression,
            },
          ],
        }
      }
      context.parameters.set(operation.name, operation.expression)
      return {
        applied: true,
        detail: `${operation.name} added`,
        undo: [{ type: 'removeParameter', name: operation.name }],
      }
    }

    case 'removeParameter': {
      const previous = context.parameters.get(operation.name)
      if (!previous) return { applied: false, detail: `No parameter "${operation.name}"`, undo: [] }
      context.parameters.remove(operation.name)
      return {
        applied: true,
        detail: `${operation.name} removed`,
        undo: [
          { type: 'addParameter', name: previous.name, expression: previous.expression },
        ],
      }
    }

    case 'setFeatureParameter': {
      const feature = requireFeature(context, operation.feature)
      const value: ParameterValue =
        operation.expression !== undefined
          ? context.parameters.resolveExpression(operation.expression)
          : (operation.value ?? null)
      const previous = feature.parameters[operation.key] ?? null
      feature.setParameters({ [operation.key]: value })
      return {
        applied: true,
        detail: `${feature.name}.${operation.key} = ${JSON.stringify(value)}`,
        undo: [
          { type: 'setFeatureParameter', feature: feature.id, key: operation.key, value: previous },
        ],
      }
    }

    case 'suppressFeature': {
      const feature = requireFeature(context, operation.feature)
      if (feature.status === 'suppressed') {
        return { applied: false, detail: `${feature.name} was already suppressed`, undo: [] }
      }
      requireTree(context).suppressFeature(feature.id)
      return {
        applied: true,
        detail: `${feature.name} suppressed`,
        undo: [{ type: 'unsuppressFeature', feature: feature.id }],
      }
    }

    case 'unsuppressFeature': {
      const feature = requireFeature(context, operation.feature)
      if (feature.status !== 'suppressed') {
        return { applied: false, detail: `${feature.name} was not suppressed`, undo: [] }
      }
      requireTree(context).unsuppressFeature(feature.id)
      return {
        applied: true,
        detail: `${feature.name} unsuppressed`,
        undo: [{ type: 'suppressFeature', feature: feature.id }],
      }
    }

    case 'renameFeature': {
      const feature = requireFeature(context, operation.feature)
      const previous = feature.name
      if (!requireTree(context).renameFeature(feature.id, operation.name)) {
        throw new ScriptError(`"${operation.name}" is not a usable feature name`)
      }
      return {
        applied: true,
        detail: `${previous} renamed to ${operation.name}`,
        undo: [{ type: 'renameFeature', feature: feature.id, name: previous }],
      }
    }

    case 'addFeature': {
      const tree = requireTree(context)
      if (!isFeatureType(operation.featureType)) {
        throw new ScriptError(`Unknown feature type "${String(operation.featureType)}"`)
      }
      const feature = createFeature(operation.featureType, {
        name: operation.name ?? nextFeatureName(operation.featureType, tree.features),
        sketchId: operation.sketchId ?? null,
        parameters: operation.parameters ?? {},
      })
      tree.addFeature(feature)
      return {
        applied: true,
        detail: `${feature.name} added`,
        undo: [{ type: 'removeFeature', feature: feature.id }],
      }
    }

    case 'removeFeature': {
      const feature = requireFeature(context, operation.feature)
      const snapshot = feature.toJSON()
      const removed = requireTree(context).removeFeature(feature.id)
      return {
        applied: true,
        detail: `${removed.length} feature${removed.length === 1 ? '' : 's'} removed`,
        // Only the named feature comes back — its dependents cannot be rebuilt
        // from an id alone, which the report says plainly.
        undo: [
          {
            type: 'addFeature',
            featureType: snapshot.featureType,
            name: snapshot.name,
            sketchId: snapshot.sketchId,
            parameters: snapshot.parameters,
          },
        ],
      }
    }

    case 'runRules': {
      if (!context.rules) throw new ScriptError('No rules engine in this context')
      const trigger: RuleTrigger = isRuleTrigger(operation.trigger) ? operation.trigger : 'manual'
      const report = context.rules.run(trigger, context)
      return {
        applied: report.applied.length > 0,
        detail: `${report.fired.length} rule${report.fired.length === 1 ? '' : 's'} fired`,
        undo: [],
      }
    }

    case 'if': {
      const holds = evaluateCondition(operation.condition, {
        resolve: context.parameters.resolver,
      })
      const branch = holds ? operation.then : (operation.else ?? [])
      const report = runScript(branch, context, { ...options, stopOnError: true })
      if (!report.completed) {
        throw new ScriptError(report.failures[0]?.message ?? 'Branch failed')
      }
      return {
        applied: report.steps.some((step) => step.status === 'applied'),
        detail: `${holds ? 'then' : 'else'}: ${report.steps.length} operation${report.steps.length === 1 ? '' : 's'}`,
        undo: report.undo,
      }
    }

    case 'repeat': {
      const count = Math.trunc(
        operationValue(operation.count, operation.countExpression, context),
      )
      if (!Number.isFinite(count) || count < 0) throw new ScriptError('Repeat needs a count of zero or more')
      if (count > MAX_REPEAT) throw new ScriptError(`Repeat is capped at ${MAX_REPEAT} iterations`)

      const undo: ScriptOperation[] = []
      let applied = false
      for (let iteration = 0; iteration < count; iteration += 1) {
        if (operation.indexName) context.parameters.set(operation.indexName, String(iteration))
        const report = runScript(operation.body, context, { ...options, stopOnError: true })
        undo.unshift(...report.undo)
        applied = applied || report.steps.some((step) => step.status === 'applied')
        if (!report.completed) {
          throw new ScriptError(report.failures[0]?.message ?? `Iteration ${iteration} failed`)
        }
      }
      return { applied, detail: `${count} iteration${count === 1 ? '' : 's'}`, undo }
    }
  }
}

/** A runaway loop should stop as a script error, not as a hung tab. */
const MAX_REPEAT = 10_000

function operationValue(
  value: number | undefined,
  expression: string | undefined,
  context: ScriptContext,
): number {
  if (expression !== undefined) return context.parameters.resolveExpression(expression)
  if (value !== undefined) return value
  throw new ScriptError('Operation needs a value or an expression')
}

function requireTree(context: ScriptContext): FeatureTree {
  if (!context.tree) throw new ScriptError('No feature tree in this context')
  return context.tree
}

function requireFeature(context: ScriptContext, reference: string): Feature {
  const tree = requireTree(context)
  const feature =
    tree.getFeature(reference) ?? tree.features.find((candidate) => candidate.name === reference)
  if (!feature) throw new ScriptError(`No feature "${reference}"`)
  return feature
}

/* -------------------------------------------------------------------- parsing */

/**
 * Narrows untrusted JSON into a script. Anything malformed is refused outright
 * rather than half-run: a script edits the model, so a typo has to fail before
 * the first operation lands, not halfway through.
 */
export function parseScript(value: unknown): DesignScriptJSON {
  if (Array.isArray(value)) {
    return { name: 'Script', description: '', operations: value.map((entry, index) => parseOperation(entry, index)) }
  }
  if (typeof value !== 'object' || value === null) {
    throw new ScriptError('A script is a JSON object or an array of operations')
  }

  const candidate = value as Record<string, unknown>
  const operations = candidate.operations
  if (!Array.isArray(operations)) throw new ScriptError('A script needs an "operations" array')

  return {
    name: typeof candidate.name === 'string' ? candidate.name : 'Script',
    description: typeof candidate.description === 'string' ? candidate.description : '',
    operations: operations.map((entry, index) => parseOperation(entry, index)),
  }
}

function parseOperation(value: unknown, index: number): ScriptOperation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ScriptError('Each operation is a JSON object', index)
  }
  const candidate = value as Record<string, unknown>
  const type = candidate.type
  if (typeof type !== 'string' || !(SCRIPT_OPERATION_TYPES as readonly string[]).includes(type)) {
    throw new ScriptError(`Unknown operation type "${String(type)}"`, index)
  }

  const requireText = (key: string): string => {
    const text = candidate[key]
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new ScriptError(`"${type}" needs a "${key}"`, index)
    }
    return text
  }

  switch (type as ScriptOperationType) {
    case 'setParameter': {
      const name = requireText('name')
      if (typeof candidate.value === 'number') {
        return { type: 'setParameter', name, value: candidate.value }
      }
      return { type: 'setParameter', name, expression: requireText('expression') }
    }
    case 'addParameter':
      return { type: 'addParameter', name: requireText('name'), expression: requireText('expression') }
    case 'removeParameter':
      return { type: 'removeParameter', name: requireText('name') }
    case 'setFeatureParameter':
      return {
        type: 'setFeatureParameter',
        feature: requireText('feature'),
        key: requireText('key'),
        ...(typeof candidate.expression === 'string'
          ? { expression: candidate.expression }
          : { value: (candidate.value ?? null) as ParameterValue }),
      }
    case 'suppressFeature':
      return { type: 'suppressFeature', feature: requireText('feature') }
    case 'unsuppressFeature':
      return { type: 'unsuppressFeature', feature: requireText('feature') }
    case 'renameFeature':
      return { type: 'renameFeature', feature: requireText('feature'), name: requireText('name') }
    case 'addFeature': {
      const featureType = candidate.featureType
      if (!isFeatureType(featureType)) {
        throw new ScriptError(`Unknown feature type "${String(featureType)}"`, index)
      }
      return {
        type: 'addFeature',
        featureType,
        ...(typeof candidate.name === 'string' ? { name: candidate.name } : {}),
        ...(typeof candidate.sketchId === 'string' ? { sketchId: candidate.sketchId } : {}),
        ...(isParameterObject(candidate.parameters)
          ? { parameters: candidate.parameters }
          : {}),
      }
    }
    case 'removeFeature':
      return { type: 'removeFeature', feature: requireText('feature') }
    case 'runRules':
      return {
        type: 'runRules',
        ...(isRuleTrigger(candidate.trigger) ? { trigger: candidate.trigger } : {}),
      }
    case 'if':
      return {
        type: 'if',
        condition: requireText('condition'),
        then: parseBody(candidate.then, 'then', index),
        ...(candidate.else === undefined ? {} : { else: parseBody(candidate.else, 'else', index) }),
      }
    case 'repeat':
      return {
        type: 'repeat',
        ...(typeof candidate.count === 'number'
          ? { count: candidate.count }
          : { countExpression: requireText('countExpression') }),
        ...(typeof candidate.indexName === 'string' ? { indexName: candidate.indexName } : {}),
        body: parseBody(candidate.body, 'body', index),
      }
  }
}

function parseBody(value: unknown, key: string, index: number): ScriptOperation[] {
  if (!Array.isArray(value)) throw new ScriptError(`"${key}" must be an array of operations`, index)
  return value.map((entry, inner) => parseOperation(entry, inner))
}

function isParameterObject(value: unknown): value is FeatureParameters {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
