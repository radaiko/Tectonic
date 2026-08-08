import { readNumber, readStringArray } from '../domain/parameters'
import { replaceShape, resolveGeometrySelection } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Hollows the target, leaving walls of `thickness` and opening the faces named
 * in `faceIds`. `alternateThickness`, when positive, applies to those solids
 * listed in `alternateBodyIds` instead — the usual way of asking for a thicker
 * base on an otherwise uniform shell.
 *
 * The open faces are resolved against the solid as it stands, so a shell whose
 * opening was left behind by an upstream edit says so instead of opening some
 * other face.
 */
export const shellOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const thickness = readNumber(params, 'thickness', 2)
  if (!(thickness > 0)) throw new FeatureError('A shell needs a positive thickness')

  const alternate = readNumber(params, 'alternateThickness', 0)
  const alternateBodyIds = readStringArray(params, 'alternateBodyIds')

  for (const { solid, ids: openFaceIds } of await resolveGeometrySelection(context, 'face')) {
    const wall = alternate > 0 && alternateBodyIds.includes(solid.id) ? alternate : thickness
    replaceShape(
      context,
      solid,
      await context.kernel.shell(solid.shape, { thickness: wall, openFaceIds }),
    )
  }
}
