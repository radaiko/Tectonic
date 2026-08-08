import type { SketchModel } from '../../sketch/domain/SketchModel'
import type { FeatureTree } from '../FeatureTree'
import type { Feature } from './Feature'
import { readOptionalString, readStringArray } from './parameters'

/**
 * One ordered history for a document that holds two kinds of thing.
 *
 * Sketches are independent document entities — each carries its own support, and
 * a sketch outlives every feature built on it — so they are stored as their own
 * list rather than as entries in the feature tree. That storage is right and this
 * module does not change it. What it fixes is that the *history* was then only
 * half visible: the tree showed the features in order and the sketches sat in a
 * flat list beside it, so "what happened, in what order" could not be read off
 * the screen at all.
 *
 * ## Where a sketch belongs in the order
 *
 * A sketch is placed immediately before the earliest feature that consumes it,
 * and sketches nothing consumes yet come last, in document order.
 *
 * That is derived rather than recorded, which is deliberate: it cannot fall out
 * of step with the model. Recording a position would mean a second ordering to
 * keep honest, and a sketch could then be stored *after* the extrude built on it
 * — a history that says the impossible. Deriving it makes the one invariant that
 * matters true by construction: a sketch always appears ahead of everything built
 * on it.
 *
 * It also lands where a user expects. Drawing a profile and extruding it, then
 * drawing the next and extruding that, reads as `Sketch 1, Extrude 1, Sketch 2,
 * Extrude 2` — which is both the creation order and the dependency order. The two
 * only part company when a sketch drawn early is first used late, and there the
 * useful answer is where it takes effect, not when it was drawn.
 *
 * ## What the roll bar means here
 *
 * The bar still counts features, because features are what a rebuild replays. A
 * sketch sitting in front of the bar is drawn as built and one behind it as rolled
 * back, which falls out of the placement above: rolling back to just before an
 * extrude leaves the sketch it consumes ahead of the bar, exactly as rolling back
 * in a CAD package does.
 */

export interface SketchTimelineEntry {
  readonly kind: 'sketch'
  readonly id: string
  readonly sketch: SketchModel
  /** Position in the timeline, counting both kinds. */
  readonly position: number
  /** How many features precede this entry, which is what the roll bar counts. */
  readonly featuresBefore: number
}

export interface FeatureTimelineEntry {
  readonly kind: 'feature'
  readonly id: string
  readonly feature: Feature
  readonly position: number
  readonly featuresBefore: number
  /** The feature's own index in the tree, which reorder and rollback speak in. */
  readonly featureIndex: number
}

export type TimelineEntry = SketchTimelineEntry | FeatureTimelineEntry

/**
 * The parameter keys that name a sketch. A feature's own `sketchId` is its
 * profile; the rest are the extra sketches the multi-sketch operations take.
 */
const SKETCH_KEYS = ['pathSketchId', 'curveSketchId'] as const
const SKETCH_LIST_KEYS = ['sectionSketchIds', 'guideSketchIds', 'curveSketchIds'] as const

/** Every sketch this feature consumes, however it names it. */
export function sketchReferenceIds(feature: Feature): string[] {
  const ids = new Set<string>()
  if (feature.sketchId) ids.add(feature.sketchId)
  for (const key of SKETCH_KEYS) {
    const id = readOptionalString(feature.parameters, key)
    if (id) ids.add(id)
  }
  for (const key of SKETCH_LIST_KEYS) {
    for (const id of readStringArray(feature.parameters, key)) ids.add(id)
  }
  return [...ids]
}

/**
 * The document's sketches and features as one ordered history.
 *
 * Every sketch given appears exactly once, and every feature in the tree appears
 * exactly once, so the result is the whole document rather than a view of part of
 * it — a sketch that no feature mentions is still the user's work and still has to
 * be findable.
 */
export function buildTimeline(
  tree: FeatureTree,
  sketches: readonly SketchModel[],
): TimelineEntry[] {
  const features = tree.features

  // The earliest feature each sketch is consumed by. A sketch used by several
  // features belongs in front of the first of them, which is the only placement
  // that keeps it ahead of all of them.
  const firstUse = new Map<string, number>()
  features.forEach((feature, index) => {
    for (const sketchId of sketchReferenceIds(feature)) {
      if (!firstUse.has(sketchId)) firstUse.set(sketchId, index)
    }
  })

  const entries: TimelineEntry[] = []
  let featuresBefore = 0
  const emitSketchesFor = (featureIndex: number | null): void => {
    for (const sketch of sketches) {
      if ((firstUse.get(sketch.id) ?? null) !== featureIndex) continue
      entries.push({
        kind: 'sketch',
        id: sketch.id,
        sketch,
        position: entries.length,
        featuresBefore,
      })
    }
  }

  features.forEach((feature, featureIndex) => {
    emitSketchesFor(featureIndex)
    entries.push({
      kind: 'feature',
      id: feature.id,
      feature,
      position: entries.length,
      featuresBefore,
      featureIndex,
    })
    featuresBefore += 1
  })

  // Whatever nothing has consumed yet: the sketch just drawn, waiting for the
  // feature that will use it.
  emitSketchesFor(null)

  return entries
}

/**
 * Where the roll bar sits in the timeline — the position the marker is drawn at,
 * so that everything before it is built and everything from it on is rolled back.
 */
export function rollBarPosition(entries: readonly TimelineEntry[], rollBarIndex: number): number {
  const feature = entries.find(
    (entry) => entry.kind === 'feature' && entry.featureIndex === rollBarIndex,
  )
  return feature ? feature.position : entries.length
}

/**
 * Whether an entry sits behind the roll bar, and so is not part of the model.
 *
 * Asked of the marker's own position rather than worked out a second way, so what
 * a row is drawn as can never contradict where the line is drawn.
 */
export function isRolledBack(
  entries: readonly TimelineEntry[],
  entry: TimelineEntry,
  rollBarIndex: number,
): boolean {
  return entry.position >= rollBarPosition(entries, rollBarIndex)
}
