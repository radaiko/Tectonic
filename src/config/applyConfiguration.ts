import type { FeatureTree } from '../features/FeatureTree'
import { isDimensional } from '../sketch/domain/Constraint'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { ConfigurationTable, ConfigurationValue } from './ConfigurationTable'
import { ParameterKind } from './ConfigurationTable'

export interface ConfigurationTargets {
  /** Every sketch the dimensions could live in. */
  readonly sketches?: readonly SketchModel[]
  readonly tree?: FeatureTree
}

export interface ApplyReport {
  /** Parameter ids that were pushed into the model. */
  readonly applied: readonly string[]
  /** Parameter ids whose target was missing or of the wrong type, with a reason. */
  readonly skipped: readonly { readonly parameterId: string; readonly reason: string }[]
  /**
   * Resolved include/exclude state per component instance. Assemblies are not
   * touched directly — the caller owns the assembly tree and applies this.
   */
  readonly instances: Readonly<Record<string, boolean>>
}

/**
 * Pushes one configuration into the model: sketch dimensions, feature
 * parameters and suppression states are written in place.
 *
 * Nothing is re-solved or rebuilt here. The caller re-runs the constraint solver
 * and the feature engine once, after every cell has landed, rather than once per
 * cell.
 */
export function applyConfiguration(
  table: ConfigurationTable,
  configurationId: string,
  targets: ConfigurationTargets = {},
): ApplyReport {
  const resolved = table.resolve(configurationId)
  const applied: string[] = []
  const skipped: { parameterId: string; reason: string }[] = []
  const instances: Record<string, boolean> = {}

  if (!table.getConfiguration(configurationId)) {
    return {
      applied: [],
      skipped: table.parameters.map((parameter) => ({
        parameterId: parameter.id,
        reason: 'Unknown configuration',
      })),
      instances: {},
    }
  }

  for (const parameter of table.parameters) {
    const value = resolved[parameter.id]
    if (value === undefined) {
      skipped.push({ parameterId: parameter.id, reason: 'No value' })
      continue
    }

    switch (parameter.kind) {
      case ParameterKind.Dimension: {
        const failure = applyDimension(targets.sketches ?? [], parameter.targetId, value)
        if (failure) skipped.push({ parameterId: parameter.id, reason: failure })
        else applied.push(parameter.id)
        break
      }
      case ParameterKind.FeatureParameter: {
        const feature = targets.tree?.getFeature(parameter.targetId)
        if (!feature) {
          skipped.push({ parameterId: parameter.id, reason: 'No such feature' })
        } else if (!parameter.parameterKey) {
          skipped.push({ parameterId: parameter.id, reason: 'No parameter key' })
        } else {
          feature.setParameters({ [parameter.parameterKey]: value })
          applied.push(parameter.id)
        }
        break
      }
      case ParameterKind.Suppression: {
        const tree = targets.tree
        if (!tree || !tree.getFeature(parameter.targetId)) {
          skipped.push({ parameterId: parameter.id, reason: 'No such feature' })
          break
        }
        if (asBoolean(value)) tree.suppressFeature(parameter.targetId)
        else tree.unsuppressFeature(parameter.targetId)
        applied.push(parameter.id)
        break
      }
      case ParameterKind.Instance: {
        instances[parameter.targetId] = asBoolean(value)
        applied.push(parameter.id)
        break
      }
    }
  }

  return { applied, skipped, instances }
}

/** Applies the table's active configuration, or nothing when none is selected. */
export function applyActiveConfiguration(
  table: ConfigurationTable,
  targets: ConfigurationTargets = {},
): ApplyReport {
  const activeId = table.activeId
  if (!activeId) return { applied: [], skipped: [], instances: {} }
  return applyConfiguration(table, activeId, targets)
}

/**
 * Reads the model's current state back into a configuration, so "capture
 * current values" fills a row from what is on screen.
 */
export function captureConfiguration(
  table: ConfigurationTable,
  configurationId: string,
  targets: ConfigurationTargets = {},
): number {
  let captured = 0

  for (const parameter of table.parameters) {
    const value = readCurrentValue(parameter.kind, parameter.targetId, parameter.parameterKey, targets)
    if (value === undefined) continue
    if (table.setValue(configurationId, parameter.id, value)) captured += 1
  }
  return captured
}

function readCurrentValue(
  kind: string,
  targetId: string,
  parameterKey: string | undefined,
  targets: ConfigurationTargets,
): ConfigurationValue | undefined {
  if (kind === ParameterKind.Dimension) {
    for (const sketch of targets.sketches ?? []) {
      const constraint = sketch.constraints.get(targetId)
      if (constraint && isDimensional(constraint)) return constraint.value
    }
    return undefined
  }

  const feature = targets.tree?.getFeature(targetId)
  if (!feature) return undefined
  if (kind === ParameterKind.Suppression) return feature.suppressed
  if (kind === ParameterKind.FeatureParameter && parameterKey) {
    const value = feature.parameters[parameterKey]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }
  }
  return undefined
}

function applyDimension(
  sketches: readonly SketchModel[],
  constraintId: string,
  value: ConfigurationValue,
): string | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'Not a number'

  for (const sketch of sketches) {
    const constraint = sketch.constraints.get(constraintId)
    if (!constraint) continue
    if (!isDimensional(constraint)) return 'Not a driving dimension'
    constraint.value = numeric
    constraint.isDriving = true
    return null
  }
  return 'No such dimension'
}

function asBoolean(value: ConfigurationValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return value.trim().toLowerCase() === 'true'
}
