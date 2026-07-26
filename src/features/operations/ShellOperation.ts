import { readNumber, readStringArray } from '../domain/parameters'
import { replaceShape, targetSolids } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Hollows the target, leaving walls of `thickness` and opening the faces named
 * in `faceIds`. `alternateThickness`, when positive, applies to those solids
 * listed in `alternateBodyIds` instead — the usual way of asking for a thicker
 * base on an otherwise uniform shell.
 */
export const shellOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const thickness = readNumber(params, 'thickness', 2)
  if (!(thickness > 0)) throw new FeatureError('A shell needs a positive thickness')

  const openFaceIds = readStringArray(params, 'faceIds')
  const alternate = readNumber(params, 'alternateThickness', 0)
  const alternateBodyIds = readStringArray(params, 'alternateBodyIds')

  for (const solid of targetSolids(context)) {
    const wall = alternate > 0 && alternateBodyIds.includes(solid.id) ? alternate : thickness
    replaceShape(
      context,
      solid,
      await context.kernel.shell(solid.shape, { thickness: wall, openFaceIds }),
    )
  }
}
