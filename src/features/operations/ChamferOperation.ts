import { readChoice, readNumber, readStringArray } from '../domain/parameters'
import { CHAMFER_METHODS } from '../domain/schema'
import { replaceShape, targetSolids } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Bevels the selected edges, either by two setback distances or by one distance
 * and the angle the bevel leaves the first face at.
 */
export const chamferOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const distance = readNumber(params, 'distance', 2)
  if (!(distance > 0)) throw new FeatureError('A chamfer needs a positive distance')

  const method = readChoice(params, 'method', CHAMFER_METHODS, 'distance-distance')
  const edgeIds = readStringArray(params, 'edgeIds')

  if (method === 'distance-angle') {
    const angle = readNumber(params, 'angle', 45)
    if (angle <= 0 || angle >= 90) {
      throw new FeatureError('A chamfer angle must be between 0 and 90 degrees')
    }
    for (const solid of targetSolids(context)) {
      replaceShape(
        context,
        solid,
        await context.kernel.chamfer(solid.shape, { distance, angle, edgeIds }),
      )
    }
    return
  }

  const secondDistance = readNumber(params, 'secondDistance', distance)
  if (!(secondDistance > 0)) {
    throw new FeatureError('A chamfer needs a positive second distance')
  }
  for (const solid of targetSolids(context)) {
    replaceShape(
      context,
      solid,
      await context.kernel.chamfer(solid.shape, { distance, secondDistance, edgeIds }),
    )
  }
}
