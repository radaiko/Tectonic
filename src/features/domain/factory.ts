import { Feature } from './Feature'
import type { FeatureType } from './FeatureType'
import { featureLabel } from './FeatureType'
import type { FeatureParameters } from './parameters'
import { defaultParameters } from './schema'

export interface CreateFeatureOptions {
  readonly id?: string
  readonly name?: string
  readonly sketchId?: string | null
  /** Overrides merged over the type's defaults. */
  readonly parameters?: FeatureParameters
  readonly parentFeatureIds?: readonly string[]
}

/** Builds a feature with its kind's default parameters already filled in. */
export function createFeature(type: FeatureType, options: CreateFeatureOptions = {}): Feature {
  return new Feature({
    featureType: type,
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(options.name !== undefined ? { name: options.name } : {}),
    sketchId: options.sketchId ?? null,
    parameters: { ...defaultParameters(type), ...(options.parameters ?? {}) },
    parentFeatureIds: options.parentFeatureIds ?? [],
  })
}

/**
 * The next free display name for a feature kind, e.g. "Extrude 2". Numbering is
 * per kind, matching how every mainstream CAD package names history entries.
 */
export function nextFeatureName(type: FeatureType, existing: readonly Feature[]): string {
  const label = featureLabel(type)
  const taken = new Set(existing.map((feature) => feature.name))
  let index = 1
  while (taken.has(`${label} ${index}`)) index += 1
  return `${label} ${index}`
}
