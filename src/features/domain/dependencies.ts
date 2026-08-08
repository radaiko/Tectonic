import type { SketchModel } from '../../sketch/domain/SketchModel'
import { isFaceSupport } from '../../sketch/domain/SketchSupport'
import type { FeatureType } from './FeatureType'
import { isSketchFeature } from './FeatureType'
import type { FeatureParameters } from './parameters'
import { readChoice, readOptionalString, readStringArray } from './parameters'
import { BOOLEAN_OPERATIONS } from './schema'

/**
 * Working out what a new feature depends on.
 *
 * The tree already knows how to keep a feature behind the things it is built on
 * — {@link FeatureTree.reorderFeature} refuses a move that would break that, and
 * {@link FeatureTree.removeFeature} takes dependents with it. What was missing
 * was anything ever telling it: features were created with an empty parent list,
 * so every one of those guarantees was vacuously true and a user could drag a
 * fillet in front of the extrude it rounds.
 *
 * A parent is recorded where there is a real reason for one, and nowhere else.
 * Ordering a feature behind something it does not use would be its own kind of
 * wrong: it locks the timeline down harder than the model warrants.
 */

/** What the part looked like when the feature was added. */
export interface DependencyContext {
  /** The feature that last wrote to each body, by body id. */
  readonly ownerByBody: ReadonlyMap<string, string>
  /** The sketch the feature consumes, when it consumes one. */
  readonly sketch?: SketchModel | null | undefined
}

/**
 * The features a new one of this kind, with these parameters, is built on.
 *
 * Three sources, and a feature can have any combination of them:
 *
 * - the body its sketch is attached to, for a sketch on a face;
 * - the bodies it names as targets, or every body there is when it names none
 *   and modifies whatever it finds;
 * - the features it explicitly copies, for a pattern, mirror or combine.
 */
export function inferParentFeatureIds(
  type: FeatureType,
  parameters: FeatureParameters,
  context: DependencyContext,
): string[] {
  const parents = new Set<string>()

  // A sketch on a face is only placeable once the body holding that face exists,
  // so anything consuming it comes after the feature that built the body.
  const support = context.sketch?.support
  if (support && isFaceSupport(support)) {
    const owner = context.ownerByBody.get(support.bodyId)
    if (owner) parents.add(owner)
  }

  // Features named outright: a pattern's seed, a combine's tool.
  for (const featureId of readStringArray(parameters, 'sourceFeatureIds')) {
    parents.add(featureId)
  }

  for (const bodyId of targetBodyIds(parameters)) {
    const owner = context.ownerByBody.get(bodyId)
    if (owner) parents.add(owner)
  }

  // A feature that reworks the part without naming what it acts on takes
  // whatever the history has left it, so it depends on all of it.
  if (actsOnEveryBody(type, parameters)) {
    for (const owner of context.ownerByBody.values()) parents.add(owner)
  }

  return [...parents]
}

/** Bodies a feature names explicitly, across the several keys used for it. */
function targetBodyIds(parameters: FeatureParameters): string[] {
  const named = [
    ...readStringArray(parameters, 'bodyIds'),
    ...readStringArray(parameters, 'alternateBodyIds'),
    ...readStringArray(parameters, 'surfaceBodyIds'),
  ]
  const single = readOptionalString(parameters, 'targetBodyId')
  if (single) named.push(single)
  return named
}

/**
 * Whether this feature reaches for the whole working set.
 *
 * Two cases. A modifying feature — a fillet, a shell, a draft — that names no
 * bodies falls back to every solid in the part, so it depends on all of them.
 * And a sketch feature does too whenever its boolean mode is anything but
 * `new-body`: cutting from or joining to the part means the part has to be there.
 */
function actsOnEveryBody(type: FeatureType, parameters: FeatureParameters): boolean {
  if (targetBodyIds(parameters).length > 0) return false
  if (!isSketchFeature(type)) return true
  return readChoice(parameters, 'operation', BOOLEAN_OPERATIONS, 'new-body') !== 'new-body'
}
