import type { PlaneFrame, Profile, ShapeHandle, Vec3 } from '../../kernel/IKernel'
import { KernelError } from '../../kernel/IKernel'
import type { SketchModel, SketchPlane } from '../../sketch/domain/SketchModel'
import { offsetFrame, planeFrame } from '../geometry/plane'
import { SupportResolutionError, resolveSupportFrame } from '../geometry/supportFrame'
import { sketchProfiles } from '../geometry/profile'
import { readChoice, readNumber, readOptionalString, readStringArray } from '../domain/parameters'
import type { BooleanOperation } from '../domain/schema'
import { SKETCH_PLANES } from '../domain/schema'
import type { OperationContext, Solid } from './types'
import { FeatureError } from './types'

/** The sketch a feature consumes, resolved from the document's sketch table. */
export function requireSketch(context: OperationContext, sketchId?: string | null): SketchModel {
  const id = sketchId ?? context.feature.sketchId
  if (!id) throw new FeatureError('No sketch is attached to this feature')
  const sketch = context.sketches.get(id)
  if (!sketch) throw new FeatureError(`Sketch ${id} is missing from the document`)
  return sketch
}

/** The closed regions of a sketch, or a clear error when it has none. */
export function requireProfiles(
  sketch: SketchModel,
  entityIds: readonly string[] = [],
): Profile[] {
  const profiles = sketchProfiles(sketch, entityIds)
  if (profiles.length === 0) {
    throw new FeatureError(`Sketch "${sketch.name}" has no closed profile to build from`)
  }
  return profiles
}

/**
 * The world plane a sketch sits on, resolved against the part as it stands at
 * this point in the history.
 *
 * A sketch on a base plane needs nothing from the part; one attached to a face
 * is placed by reading that face off the solid the working set currently holds,
 * which is why this is async and takes the context rather than the sketch alone.
 */
export async function sketchFrame(
  context: OperationContext,
  sketch: SketchModel,
  offset = 0,
): Promise<PlaneFrame> {
  const solids = context.solids
  try {
    return offsetFrame(
      await resolveSupportFrame(sketch.support, {
        kernel: context.kernel,
        shapeOf: (bodyId) => solids.find((solid) => solid.id === bodyId)?.shape,
      }),
      offset,
    )
  } catch (cause) {
    if (cause instanceof SupportResolutionError) throw new FeatureError(cause.message)
    throw cause
  }
}

/** Solids a modifying feature applies to: its explicit targets, or everything. */
export function targetSolids(context: OperationContext): Solid[] {
  const ids = readStringArray(context.feature.parameters, 'bodyIds')
  if (ids.length === 0) {
    if (context.solids.length === 0) {
      throw new FeatureError('There is no solid for this feature to modify')
    }
    return [...context.solids]
  }

  const targets = context.solids.filter((solid) => ids.includes(solid.id))
  if (targets.length === 0) {
    throw new FeatureError('The solids this feature targets no longer exist')
  }
  return targets
}

/** The single solid a feature joins to or cuts from, when one is named. */
export function namedSolid(context: OperationContext, key: string): Solid | undefined {
  const id = readOptionalString(context.feature.parameters, key)
  return id ? context.solids.find((solid) => solid.id === id) : undefined
}

/**
 * Solids a pattern, mirror or combine draws its instances from: the ones the
 * named features last wrote, falling back to the feature's explicit body list.
 */
export function sourceSolids(context: OperationContext): Solid[] {
  const featureIds = readStringArray(context.feature.parameters, 'sourceFeatureIds')
  if (featureIds.length === 0) return targetSolids(context)

  const sources = context.solids.filter((solid) => featureIds.includes(solid.featureId))
  if (sources.length === 0) {
    throw new FeatureError('The features this one copies produced no solid')
  }
  return sources
}

/** A base plane named by a `plane` parameter, shifted by an `offset` one. */
export function parameterPlane(context: OperationContext, fallback: SketchPlane = 'XY'): PlaneFrame {
  const params = context.feature.parameters
  const plane = readChoice(params, 'plane', SKETCH_PLANES, fallback)
  return planeFrame(plane, readNumber(params, 'offset', 0))
}

/** Swaps a solid's shape for a new one, releasing the geometry it replaces. */
export function replaceShape(
  context: OperationContext,
  solid: Solid,
  shape: ShapeHandle,
): void {
  context.kernel.dispose(solid.shape)
  solid.shape = shape
  solid.featureId = context.feature.id
}

/** Fuses several tool shapes into one, disposing the intermediates. */
export async function unionAll(
  context: OperationContext,
  shapes: readonly ShapeHandle[],
): Promise<ShapeHandle> {
  const [first, ...rest] = shapes
  if (!first) throw new FeatureError('Nothing to build')

  let combined = first
  for (const shape of rest) {
    const merged = await context.kernel.booleanUnion(combined, shape)
    context.kernel.dispose(combined)
    context.kernel.dispose(shape)
    combined = merged
  }
  return combined
}

/**
 * Folds a freshly built tool shape into the working set according to the
 * feature's boolean mode. The tool is consumed either way.
 */
export async function applyBoolean(
  context: OperationContext,
  tool: ShapeHandle,
  operation: BooleanOperation,
): Promise<void> {
  const { kernel, feature } = context

  if (operation === 'new-body' || (operation === 'join' && context.solids.length === 0)) {
    context.solids.push({
      id: context.newSolidId(),
      name: feature.name,
      shape: tool,
      featureId: feature.id,
    })
    return
  }

  if (context.solids.length === 0) {
    kernel.dispose(tool)
    throw new FeatureError(`There is no solid for this ${operation} to act on`)
  }

  if (operation === 'join') {
    const target = namedSolid(context, 'targetBodyId') ?? (context.solids[0] as Solid)
    const merged = await kernel.booleanUnion(target.shape, tool)
    kernel.dispose(target.shape)
    kernel.dispose(tool)
    target.shape = merged
    target.featureId = feature.id
    return
  }

  const named = namedSolid(context, 'targetBodyId')
  const targets = named ? [named] : [...context.solids]
  const consumed: Solid[] = []

  for (const target of targets) {
    try {
      const result =
        operation === 'cut'
          ? await kernel.booleanSubtract(target.shape, tool)
          : await kernel.booleanIntersect(target.shape, tool)
      kernel.dispose(target.shape)
      target.shape = result
      target.featureId = feature.id
    } catch (cause) {
      // An empty result means the tool swallowed the solid whole, which is a
      // legitimate outcome — the body simply stops existing.
      if (cause instanceof KernelError && /empty solid/.test(cause.message)) {
        consumed.push(target)
        continue
      }
      kernel.dispose(tool)
      throw cause
    }
  }

  kernel.dispose(tool)
  for (const solid of consumed) {
    const index = context.solids.indexOf(solid)
    if (index !== -1) context.solids.splice(index, 1)
    kernel.dispose(solid.shape)
  }
  if (context.solids.length === 0) {
    throw new FeatureError('This feature removed every solid in the part')
  }
}

/**
 * How far a sweep starting at `origin` has to travel along `direction` to clear
 * every solid in the working set — what "through all" and "up to body" resolve
 * to without B-Rep faces to aim at.
 */
export async function reachOfSolids(
  context: OperationContext,
  origin: Vec3,
  direction: Vec3,
  solids: readonly Solid[],
  fallback: number,
): Promise<number> {
  if (solids.length === 0) return fallback

  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (const solid of solids) {
    const box = await context.kernel.boundingBox(solid.shape)
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const projection = x * direction.x + y * direction.y + z * direction.z
          low = Math.min(low, projection)
          high = Math.max(high, projection)
        }
      }
    }
  }

  const span = high - low
  if (!Number.isFinite(span) || span <= 0) return fallback

  const start = origin.x * direction.x + origin.y * direction.y + origin.z * direction.z
  const margin = span * 0.01 + 1e-3
  return Math.max(high - start + margin, span)
}
