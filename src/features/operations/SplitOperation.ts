import { readChoice } from '../domain/parameters'
import { SPLIT_KEEPS } from '../domain/schema'
import { parameterPlane, targetSolids } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Cuts solids with a plane. Each piece becomes a body in its own right, so a
 * later feature can act on one half without touching the other.
 */
export const splitOperation: FeatureOperation = async (context) => {
  const plane = parameterPlane(context)
  const keep = readChoice(context.feature.parameters, 'keep', SPLIT_KEEPS, 'both')

  for (const solid of targetSolids(context)) {
    const pieces = await context.kernel.split(solid.shape, { plane, keep })
    const [first, ...rest] = pieces
    if (!first) throw new FeatureError('The split plane misses this body')

    context.kernel.dispose(solid.shape)
    solid.shape = first
    solid.featureId = context.feature.id

    // The extra pieces sit next to the original in the working set, taking
    // their names from it so the tree reads as one body having been divided.
    const at = context.solids.indexOf(solid)
    rest.forEach((shape, index) => {
      context.solids.splice(at + index + 1, 0, {
        id: context.newSolidId(),
        name: `${solid.name} (${index + 2})`,
        shape,
        featureId: context.feature.id,
      })
    })
  }
}
