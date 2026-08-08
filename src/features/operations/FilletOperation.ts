import { readBoolean, readNumber } from '../domain/parameters'
import { replaceShape, resolveGeometrySelection } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Rounds the selected edges. An empty edge list means every edge of the target,
 * matching how "fillet all" behaves in the packages this mirrors.
 *
 * A variable-radius fillet blends from `radius` at the first selected edge to
 * `endRadius` at the last; the kernel is handed each edge with its own radius.
 *
 * Which edges those are is resolved fresh each rebuild, so an edge that an
 * upstream edit moved is followed where it can be identified and reported where
 * it cannot — never quietly swapped for whichever edge took its name.
 */
export const filletOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const radius = readNumber(params, 'radius', 3)
  if (!(radius > 0)) throw new FeatureError('A fillet needs a positive radius')

  const variable = readBoolean(params, 'variableRadius', false)
  const endRadius = readNumber(params, 'endRadius', radius)
  if (variable && !(endRadius > 0)) {
    throw new FeatureError('A variable fillet needs a positive end radius')
  }

  for (const { solid, ids: edgeIds } of await resolveGeometrySelection(context, 'edge')) {
    if (variable && edgeIds.length > 1) {
      for (const [index, edgeId] of edgeIds.entries()) {
        const blend = index / (edgeIds.length - 1)
        replaceShape(
          context,
          solid,
          await context.kernel.fillet(solid.shape, {
            radius: radius + (endRadius - radius) * blend,
            edgeIds: [edgeId],
          }),
        )
      }
      continue
    }

    replaceShape(context, solid, await context.kernel.fillet(solid.shape, { radius, edgeIds }))
  }
}
