import { newId } from '../../sketch/domain/ids'
import type { FeatureType } from './FeatureType'
import { featureLabel, isFeatureType } from './FeatureType'
import type { FeatureParameters } from './parameters'
import { cloneParameters } from './parameters'

/**
 * Whether a feature contributes geometry on the next rebuild. `error` is set by
 * the engine, never by the user; `suppressed` is the other way round.
 */
export type FeatureStatus = 'active' | 'suppressed' | 'error'

export interface FeatureJSON {
  readonly id: string
  readonly name: string
  readonly featureType: FeatureType
  readonly sketchId: string | null
  readonly parameters: FeatureParameters
  readonly status: FeatureStatus
  readonly errorMessage: string | null
  readonly parentFeatureIds: readonly string[]
  readonly childFeatureIds: readonly string[]
}

export interface FeatureInit {
  readonly id?: string
  readonly name?: string
  readonly featureType: FeatureType
  readonly sketchId?: string | null
  readonly parameters?: FeatureParameters
  readonly status?: FeatureStatus
  readonly errorMessage?: string | null
  readonly parentFeatureIds?: readonly string[]
  readonly childFeatureIds?: readonly string[]
}

/**
 * One entry of the modelling history. A feature is pure data: it names the
 * sketch it consumes, the features it depends on, and the parameters an
 * operation reads. Evaluating it is the {@link FeatureEngine}'s job.
 */
export class Feature {
  readonly id: string
  name: string
  readonly featureType: FeatureType
  sketchId: string | null
  parameters: FeatureParameters
  status: FeatureStatus
  errorMessage: string | null
  parentFeatureIds: string[]
  childFeatureIds: string[]

  constructor(init: FeatureInit) {
    this.id = init.id ?? newId()
    this.featureType = init.featureType
    this.name = init.name ?? featureLabel(init.featureType)
    this.sketchId = init.sketchId ?? null
    this.parameters = cloneParameters(init.parameters ?? {})
    this.status = init.status ?? 'active'
    this.errorMessage = init.errorMessage ?? null
    this.parentFeatureIds = [...(init.parentFeatureIds ?? [])]
    this.childFeatureIds = [...(init.childFeatureIds ?? [])]
  }

  get suppressed(): boolean {
    return this.status === 'suppressed'
  }

  /** Merges `changes` into the parameters, leaving the rest untouched. */
  setParameters(changes: FeatureParameters): void {
    this.parameters = cloneParameters({ ...this.parameters, ...changes })
  }

  /** Records an evaluation failure; the feature keeps its place in the tree. */
  markError(message: string): void {
    this.status = 'error'
    this.errorMessage = message
  }

  /** Clears an error from a previous rebuild without touching suppression. */
  clearError(): void {
    if (this.status === 'error') this.status = 'active'
    this.errorMessage = null
  }

  addParent(featureId: string): void {
    if (featureId !== this.id && !this.parentFeatureIds.includes(featureId)) {
      this.parentFeatureIds.push(featureId)
    }
  }

  addChild(featureId: string): void {
    if (featureId !== this.id && !this.childFeatureIds.includes(featureId)) {
      this.childFeatureIds.push(featureId)
    }
  }

  removeLink(featureId: string): void {
    this.parentFeatureIds = this.parentFeatureIds.filter((id) => id !== featureId)
    this.childFeatureIds = this.childFeatureIds.filter((id) => id !== featureId)
  }

  toJSON(): FeatureJSON {
    return {
      id: this.id,
      name: this.name,
      featureType: this.featureType,
      sketchId: this.sketchId,
      parameters: cloneParameters(this.parameters),
      status: this.status,
      errorMessage: this.errorMessage,
      parentFeatureIds: [...this.parentFeatureIds],
      childFeatureIds: [...this.childFeatureIds],
    }
  }

  static fromJSON(json: FeatureJSON): Feature {
    if (!isFeatureType(json.featureType)) {
      throw new Error(`Unknown feature type: ${String(json.featureType)}`)
    }
    return new Feature(json)
  }

  clone(): Feature {
    return Feature.fromJSON(this.toJSON())
  }
}

const STATUSES: readonly FeatureStatus[] = ['active', 'suppressed', 'error']

/** Narrows untrusted parsed JSON into a feature, filling in what it can. */
export function featureFromUnknown(value: unknown): Feature {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Feature must be a JSON object')
  }
  const candidate = value as Record<string, unknown>
  if (!isFeatureType(candidate.featureType)) {
    throw new Error(`Unknown feature type: ${String(candidate.featureType)}`)
  }

  const status = candidate.status
  return new Feature({
    id: typeof candidate.id === 'string' ? candidate.id : newId(),
    featureType: candidate.featureType,
    ...(typeof candidate.name === 'string' ? { name: candidate.name } : {}),
    sketchId: typeof candidate.sketchId === 'string' ? candidate.sketchId : null,
    parameters:
      typeof candidate.parameters === 'object' &&
      candidate.parameters !== null &&
      !Array.isArray(candidate.parameters)
        ? (candidate.parameters as FeatureParameters)
        : {},
    status: STATUSES.includes(status as FeatureStatus) ? (status as FeatureStatus) : 'active',
    errorMessage: typeof candidate.errorMessage === 'string' ? candidate.errorMessage : null,
    parentFeatureIds: stringArray(candidate.parentFeatureIds),
    childFeatureIds: stringArray(candidate.childFeatureIds),
  })
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
