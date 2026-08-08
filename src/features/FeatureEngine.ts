import type { Body } from '../domain/Document'
import type { IKernel, TessellationParams } from '../kernel/IKernel'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { FeatureTree } from './FeatureTree'
import type { Feature } from './domain/Feature'
import { featureOperation } from './operations/registry'
import type { OperationContext, Solid } from './operations/types'

/** What a single feature did to the part, as the tree panel reports it. */
export interface FeatureOutcome {
  readonly featureId: string
  readonly featureName: string
  /** Bodies this feature created or last modified. */
  readonly bodies: readonly Body[]
  readonly error: string | null
}

export interface FeatureEvaluation {
  /** Every body the part ends up with, in creation order. */
  readonly bodies: readonly Body[]
  /** The bodies each feature was responsible for, keyed by feature id. */
  readonly bodiesByFeature: ReadonlyMap<string, readonly Body[]>
  /**
   * The feature that last wrote to each body, keyed by body id — the same fact
   * as `bodiesByFeature` read the other way round. This is what a new feature
   * consults to work out what it is being built on: naming a body it will modify
   * is naming the feature that produced that body.
   */
  readonly ownerByBody: ReadonlyMap<string, string>
  readonly outcomes: readonly FeatureOutcome[]
  /** Features that failed, in tree order. Empty when the rebuild was clean. */
  readonly failures: readonly FeatureOutcome[]
}

export interface EvaluateOptions {
  readonly tessellation?: TessellationParams
}

/**
 * Rebuilds a part from its history.
 *
 * The engine walks the active features in tree order — which is already a valid
 * topological order, because {@link FeatureTree} refuses a reorder that would
 * put a feature in front of something it depends on — handing each one the
 * working set of solids the features before it left behind. A feature that
 * throws is marked with its error and the rebuild carries on, so one bad
 * parameter costs you that feature rather than the whole part.
 *
 * Kernel shapes are an implementation detail of a single rebuild: they are
 * created, passed along the chain, tessellated at the end and then released.
 * What survives is the {@link Body} list, which is pure data.
 */
export class FeatureEngine {
  readonly #kernel: IKernel

  constructor(kernel: IKernel) {
    this.#kernel = kernel
  }

  async evaluate(
    tree: FeatureTree,
    sketches: Iterable<SketchModel>,
    options: EvaluateOptions = {},
  ): Promise<FeatureEvaluation> {
    const sketchTable = new Map<string, SketchModel>()
    for (const sketch of sketches) sketchTable.set(sketch.id, sketch)

    tree.clearErrors()

    const solids: Solid[] = []
    const outcomes: FeatureOutcome[] = []
    let nextSolid = 0
    /** Features that failed, so what is built on them can say why it did not run. */
    const broken = new Map<string, string>()

    for (const feature of tree.getActiveFeatures()) {
      // A feature whose input never got built cannot be judged on its own terms:
      // running it anyway produces a second, misleading failure ("there is no
      // solid for this to modify") that says nothing about the real cause. Naming
      // the feature that actually broke is what makes the tree readable.
      const blocking = feature.parentFeatureIds.filter((parentId) => broken.has(parentId))
      if (blocking.length > 0) {
        const names = blocking.map((parentId) => tree.getFeature(parentId)?.name ?? parentId)
        feature.markError(`Waiting on ${names.join(', ')}, which did not build`)
        broken.set(feature.id, feature.name)
        continue
      }

      const context: OperationContext = {
        kernel: this.#kernel,
        feature,
        sketches: sketchTable,
        solids,
        newSolidId: () => `body-${(nextSolid += 1)}`,
      }

      try {
        await featureOperation(feature.featureType)(context)
      } catch (cause) {
        feature.markError((cause as Error).message)
        broken.set(feature.id, feature.name)
      }
    }

    const bodies = await this.#tessellate(solids, options.tessellation)
    const bodiesByFeature = groupByFeature(solids, bodies)

    for (const feature of tree.getActiveFeatures()) {
      outcomes.push(outcomeOf(feature, bodiesByFeature.get(feature.id) ?? []))
    }

    return {
      bodies,
      bodiesByFeature,
      ownerByBody: new Map(solids.map((solid) => [solid.id, solid.featureId])),
      outcomes,
      failures: outcomes.filter((outcome) => outcome.error !== null),
    }
  }

  /** Turns the working set into renderable bodies and releases the shapes. */
  async #tessellate(
    solids: readonly Solid[],
    tessellation?: TessellationParams,
  ): Promise<Body[]> {
    const bodies: Body[] = []
    for (const solid of solids) {
      try {
        bodies.push({
          id: solid.id,
          name: solid.name,
          mesh: await this.#kernel.triangulate(solid.shape, tessellation),
        })
      } finally {
        this.#kernel.dispose(solid.shape)
      }
    }
    return bodies
  }
}

/** Convenience wrapper for callers that do not hold on to an engine. */
export async function evaluateFeatures(
  tree: FeatureTree,
  sketches: Iterable<SketchModel>,
  kernel: IKernel,
  options: EvaluateOptions = {},
): Promise<FeatureEvaluation> {
  return new FeatureEngine(kernel).evaluate(tree, sketches, options)
}

function groupByFeature(
  solids: readonly Solid[],
  bodies: readonly Body[],
): Map<string, Body[]> {
  const grouped = new Map<string, Body[]>()
  solids.forEach((solid, index) => {
    const body = bodies[index]
    if (!body) return
    const existing = grouped.get(solid.featureId)
    if (existing) existing.push(body)
    else grouped.set(solid.featureId, [body])
  })
  return grouped
}

function outcomeOf(feature: Feature, bodies: readonly Body[]): FeatureOutcome {
  return {
    featureId: feature.id,
    featureName: feature.name,
    bodies,
    error: feature.status === 'error' ? (feature.errorMessage ?? 'Feature failed') : null,
  }
}
