export { FeatureEngine, evaluateFeatures } from './FeatureEngine'
export type { EvaluateOptions, FeatureEvaluation, FeatureOutcome } from './FeatureEngine'
export { FeatureTree } from './FeatureTree'
export type { FeatureTreeJSON } from './FeatureTree'

export { Feature, featureFromUnknown } from './domain/Feature'
export type { FeatureInit, FeatureJSON, FeatureStatus } from './domain/Feature'
export {
  FEATURE_TYPES,
  FeatureType,
  additiveEquivalent,
  cutEquivalent,
  featureLabel,
  isCutFeature,
  isFeatureType,
  isSketchFeature,
} from './domain/FeatureType'
export { createFeature, nextFeatureName } from './domain/factory'
export type { CreateFeatureOptions } from './domain/factory'
export * from './domain/parameters'
export * from './domain/schema'

export * from './geometry/plane'
export * from './geometry/profile'
export * from './geometry/ReferenceGeometry'

export { featureOperation } from './operations/registry'
export { FeatureError } from './operations/types'
export type { FeatureOperation, OperationContext, Solid } from './operations/types'
