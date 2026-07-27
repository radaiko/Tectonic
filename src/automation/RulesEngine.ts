import { createFeature, nextFeatureName } from '../features/domain/factory'
import type { Feature } from '../features/domain/Feature'
import type { FeatureParameters } from '../features/domain/parameters'
import type { FeatureType } from '../features/domain/FeatureType'
import { isFeatureType } from '../features/domain/FeatureType'
import type { FeatureTree } from '../features/FeatureTree'
import { newId } from '../sketch/domain/ids'
import { evaluateCondition, referencesOf } from './expression'
import type { ParameterTable } from './ParameterTable'

/**
 * If-then rules over the model: a condition written in the expression language,
 * and a list of actions to take when it holds.
 *
 * Rules fire in list order and each sees what the ones before it did — that is
 * the whole ordering model, and it is why {@link RulesEngine.validate} exists:
 * a rule that writes a parameter an earlier rule reads would need a second pass
 * to settle, which is a cycle by another name.
 */

export class RuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuleError'
  }
}

export const RuleTrigger = {
  /** Any parameter value changed. */
  ParameterChange: 'parameterChange',
  /** A feature was added to the tree. */
  FeatureCreated: 'featureCreated',
  /** Geometry arrived from an import. */
  Import: 'import',
  /** Before the feature engine rebuilds. */
  Rebuild: 'rebuild',
  /** Only when the user asks. */
  Manual: 'manual',
} as const

export type RuleTrigger = (typeof RuleTrigger)[keyof typeof RuleTrigger]

export const RULE_TRIGGERS: readonly RuleTrigger[] = Object.values(RuleTrigger)

export function isRuleTrigger(value: unknown): value is RuleTrigger {
  return typeof value === 'string' && (RULE_TRIGGERS as readonly string[]).includes(value)
}

export const RuleActionType = {
  SetParameter: 'setParameter',
  SuppressFeature: 'suppressFeature',
  UnsuppressFeature: 'unsuppressFeature',
  AddFeature: 'addFeature',
  RemoveFeature: 'removeFeature',
  SetMaterial: 'setMaterial',
} as const

export type RuleActionType = (typeof RuleActionType)[keyof typeof RuleActionType]

export const RULE_ACTION_TYPES: readonly RuleActionType[] = Object.values(RuleActionType)

export type RuleAction =
  | { readonly type: 'setParameter'; readonly name: string; readonly expression: string }
  | { readonly type: 'suppressFeature'; readonly feature: string }
  | { readonly type: 'unsuppressFeature'; readonly feature: string }
  | {
      readonly type: 'addFeature'
      readonly featureType: FeatureType
      readonly name?: string
      readonly sketchId?: string | null
      readonly parameters?: FeatureParameters
    }
  | { readonly type: 'removeFeature'; readonly feature: string }
  | { readonly type: 'setMaterial'; readonly target: string; readonly material: string }

export interface RuleJSON {
  readonly id: string
  readonly name: string
  readonly trigger: RuleTrigger
  /** Expression that has to read as true, e.g. `length > 100`. */
  readonly condition: string
  readonly actions: readonly RuleAction[]
  /** Taken instead when the condition is false. Usually the inverse action. */
  readonly elseActions: readonly RuleAction[]
  readonly enabled: boolean
}

export type Rule = RuleJSON

export interface RuleInit {
  readonly id?: string
  readonly name?: string
  readonly trigger?: RuleTrigger
  readonly condition: string
  readonly actions?: readonly RuleAction[]
  readonly elseActions?: readonly RuleAction[]
  readonly enabled?: boolean
}

export interface RuleContext {
  readonly parameters: ParameterTable
  readonly tree?: FeatureTree
  /** Material per feature, part or component id. Written by `setMaterial`. */
  readonly materials?: Record<string, string>
  /** Overrides how `addFeature` builds its feature — tests and the UI use it. */
  readonly buildFeature?: (action: Extract<RuleAction, { type: 'addFeature' }>) => Feature
}

export interface AppliedAction {
  readonly ruleId: string
  readonly action: RuleAction
  /** What actually happened, for the run log. */
  readonly detail: string
}

export interface RuleFailure {
  readonly ruleId: string
  readonly message: string
}

export interface RuleRunReport {
  /** Rules whose trigger matched and that were enabled. */
  readonly evaluated: readonly string[]
  /** Rules whose condition read as true. */
  readonly fired: readonly string[]
  readonly applied: readonly AppliedAction[]
  readonly failures: readonly RuleFailure[]
  /** How many ordered passes it took to settle. */
  readonly passes: number
}

export interface RuleConflict {
  readonly kind: 'self-cycle' | 'back-reference'
  readonly ruleIds: readonly string[]
  readonly message: string
}

export interface RunOptions {
  /**
   * How many ordered passes to make. One pass is the contract; more lets a
   * chain of rules settle, and the run stops as soon as nothing changed.
   */
  readonly maxPasses?: number
}

export class RulesEngine {
  readonly #rules: RuleJSON[] = []

  constructor(rules: readonly RuleInit[] = []) {
    for (const rule of rules) this.addRule(rule)
  }

  get rules(): readonly RuleJSON[] {
    return this.#rules
  }

  get length(): number {
    return this.#rules.length
  }

  getRule(id: string): RuleJSON | undefined {
    return this.#rules.find((rule) => rule.id === id)
  }

  requireRule(id: string): RuleJSON {
    const rule = this.getRule(id)
    if (!rule) throw new RuleError(`No rule with id ${id}`)
    return rule
  }

  addRule(init: RuleInit, index?: number): RuleJSON {
    if (init.condition.trim().length === 0) throw new RuleError('A rule needs a condition')
    const rule: RuleJSON = {
      id: init.id ?? newId(),
      name: init.name ?? `Rule ${this.#rules.length + 1}`,
      trigger: init.trigger ?? RuleTrigger.ParameterChange,
      condition: init.condition.trim(),
      actions: [...(init.actions ?? [])],
      elseActions: [...(init.elseActions ?? [])],
      enabled: init.enabled ?? true,
    }
    if (this.getRule(rule.id)) throw new RuleError(`Rule "${rule.id}" is already in this engine`)

    const at = index === undefined ? this.#rules.length : clamp(index, this.#rules.length)
    this.#rules.splice(at, 0, rule)
    return rule
  }

  updateRule(id: string, changes: Partial<Omit<RuleJSON, 'id'>>): RuleJSON {
    const index = this.#rules.findIndex((rule) => rule.id === id)
    if (index === -1) throw new RuleError(`No rule with id ${id}`)
    const updated: RuleJSON = { ...(this.#rules[index] as RuleJSON), ...changes, id }
    this.#rules[index] = updated
    return updated
  }

  setEnabled(id: string, enabled: boolean): RuleJSON {
    return this.updateRule(id, { enabled })
  }

  removeRule(id: string): boolean {
    const index = this.#rules.findIndex((rule) => rule.id === id)
    if (index === -1) return false
    this.#rules.splice(index, 1)
    return true
  }

  /** Rules fire in list order, so moving one is how priority is expressed. */
  moveRule(id: string, newIndex: number): boolean {
    const index = this.#rules.findIndex((rule) => rule.id === id)
    if (index === -1) return false
    const [rule] = this.#rules.splice(index, 1)
    this.#rules.splice(clamp(newIndex, this.#rules.length), 0, rule as RuleJSON)
    return true
  }

  /**
   * Ordering problems that would stop a single pass from settling: a rule whose
   * condition reads a parameter it writes, and a rule that writes a parameter an
   * earlier rule already read.
   */
  validate(): RuleConflict[] {
    const conflicts: RuleConflict[] = []
    const readBefore = new Map<string, string[]>()

    this.#rules.forEach((rule) => {
      const reads = new Set(ruleReads(rule))
      const writes = ruleWrites(rule)

      for (const parameter of writes) {
        if (reads.has(parameter)) {
          conflicts.push({
            kind: 'self-cycle',
            ruleIds: [rule.id],
            message: `"${rule.name}" reads and writes "${parameter}"`,
          })
        }
        for (const earlier of readBefore.get(parameter) ?? []) {
          if (earlier === rule.id) continue
          conflicts.push({
            kind: 'back-reference',
            ruleIds: [earlier, rule.id],
            message: `"${rule.name}" writes "${parameter}" after "${
              this.getRule(earlier)?.name ?? earlier
            }" read it`,
          })
        }
      }

      for (const parameter of reads) {
        const readers = readBefore.get(parameter)
        if (readers) readers.push(rule.id)
        else readBefore.set(parameter, [rule.id])
      }
    })

    return conflicts
  }

  /**
   * Runs every enabled rule for a trigger, in order. Actions are applied as they
   * fire, so a later rule sees the parameters an earlier one set.
   */
  run(trigger: RuleTrigger, context: RuleContext, options: RunOptions = {}): RuleRunReport {
    const maxPasses = Math.max(1, Math.trunc(options.maxPasses ?? 1))
    const matching = this.#rules.filter((rule) => rule.enabled && rule.trigger === trigger)

    const evaluated: string[] = []
    const fired: string[] = []
    const applied: AppliedAction[] = []
    const failures: RuleFailure[] = []
    let passes = 0

    for (let pass = 0; pass < maxPasses; pass += 1) {
      passes = pass + 1
      const before = applied.length
      const snapshot = JSON.stringify(context.parameters.values())

      for (const rule of matching) {
        if (!evaluated.includes(rule.id)) evaluated.push(rule.id)

        let holds: boolean
        try {
          holds = evaluateCondition(rule.condition, { resolve: context.parameters.resolver })
        } catch (error) {
          failures.push({
            ruleId: rule.id,
            message: `Condition failed: ${error instanceof Error ? error.message : String(error)}`,
          })
          continue
        }

        if (holds && !fired.includes(rule.id)) fired.push(rule.id)

        for (const action of holds ? rule.actions : rule.elseActions) {
          try {
            const detail = applyAction(action, context)
            if (detail !== null) applied.push({ ruleId: rule.id, action, detail })
          } catch (error) {
            failures.push({
              ruleId: rule.id,
              message: error instanceof Error ? error.message : String(error),
            })
          }
        }
      }

      // Settled: nothing new was applied and no parameter moved.
      if (applied.length === before && JSON.stringify(context.parameters.values()) === snapshot) {
        break
      }
    }

    return { evaluated, fired, applied, failures, passes }
  }

  toJSON(): readonly RuleJSON[] {
    return this.#rules.map((rule) => ({ ...rule, actions: [...rule.actions], elseActions: [...rule.elseActions] }))
  }

  static fromJSON(rules: readonly RuleJSON[] | undefined): RulesEngine {
    const engine = new RulesEngine()
    for (const rule of rules ?? []) {
      try {
        const { trigger, ...rest } = rule
        engine.addRule({ ...rest, ...(isRuleTrigger(trigger) ? { trigger } : {}) })
      } catch {
        // A rule this build cannot read is dropped rather than failing the open.
      }
    }
    return engine
  }

  clone(): RulesEngine {
    return RulesEngine.fromJSON(this.toJSON())
  }
}

/* ------------------------------------------------------------------ actions */

/** Applies one action, returning what it did — or null when it was a no-op. */
function applyAction(action: RuleAction, context: RuleContext): string | null {
  switch (action.type) {
    case 'setParameter': {
      const value = context.parameters.resolveExpression(action.expression)
      const previous = context.parameters.has(action.name)
        ? context.parameters.valueOr(action.name, Number.NaN)
        : null
      if (previous !== null && previous === value) return null
      // Written as a literal, not as the source expression: a rule sets a value,
      // it does not hand the parameter a new formula to re-evaluate forever.
      context.parameters.set(action.name, String(value))
      return `${action.name} = ${value}`
    }

    case 'suppressFeature': {
      const feature = requireFeature(context, action.feature)
      if (feature.status === 'suppressed') return null
      context.tree?.suppressFeature(feature.id)
      return `suppressed ${feature.name}`
    }

    case 'unsuppressFeature': {
      const feature = requireFeature(context, action.feature)
      if (feature.status !== 'suppressed') return null
      context.tree?.unsuppressFeature(feature.id)
      return `unsuppressed ${feature.name}`
    }

    case 'addFeature': {
      const tree = requireTree(context)
      if (!isFeatureType(action.featureType)) {
        throw new RuleError(`Unknown feature type "${String(action.featureType)}"`)
      }
      const feature =
        context.buildFeature?.(action) ??
        createFeature(action.featureType, {
          name: action.name ?? nextFeatureName(action.featureType, tree.features),
          sketchId: action.sketchId ?? null,
          parameters: action.parameters ?? {},
        })
      tree.addFeature(feature)
      return `added ${feature.name}`
    }

    case 'removeFeature': {
      const feature = requireFeature(context, action.feature)
      const removed = requireTree(context).removeFeature(feature.id)
      return `removed ${removed.length} feature${removed.length === 1 ? '' : 's'}`
    }

    case 'setMaterial': {
      if (!context.materials) throw new RuleError('No material map to write to')
      if (context.materials[action.target] === action.material) return null
      context.materials[action.target] = action.material
      return `${action.target} is ${action.material}`
    }
  }
}

function requireTree(context: RuleContext): FeatureTree {
  if (!context.tree) throw new RuleError('No feature tree in this context')
  return context.tree
}

/** Rules name features by id or by the name shown in the tree, whichever is to hand. */
function requireFeature(context: RuleContext, reference: string): Feature {
  const tree = requireTree(context)
  const feature =
    tree.getFeature(reference) ?? tree.features.find((candidate) => candidate.name === reference)
  if (!feature) throw new RuleError(`No feature "${reference}"`)
  return feature
}

/** Parameter names a rule reads, from its condition and its action expressions. */
export function ruleReads(rule: RuleJSON): string[] {
  const names = referencesOf(rule.condition)
  for (const action of [...rule.actions, ...rule.elseActions]) {
    if (action.type === 'setParameter') {
      for (const name of referencesOf(action.expression)) {
        if (!names.includes(name)) names.push(name)
      }
    }
  }
  return names
}

/** Parameter names a rule writes. */
export function ruleWrites(rule: RuleJSON): string[] {
  const names: string[] = []
  for (const action of [...rule.actions, ...rule.elseActions]) {
    if (action.type === 'setParameter' && !names.includes(action.name)) names.push(action.name)
  }
  return names
}

function clamp(index: number, length: number): number {
  if (!Number.isFinite(index)) return length
  return Math.max(0, Math.min(length, Math.trunc(index)))
}
