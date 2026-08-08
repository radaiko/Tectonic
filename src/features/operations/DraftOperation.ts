import { frameNormal } from '../geometry/plane'
import { readNumber, readVector3 } from '../domain/parameters'
import { parameterPlane, replaceShape, resolveGeometrySelection } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Tapers faces away from a neutral plane so the part can leave a mould. The pull
 * direction defaults to the normal of the plane named in `plane`, and the
 * neutral plane is that plane's offset along it.
 *
 * The drafted faces are resolved against the solid as it stands, so a selection
 * an upstream edit left behind fails the feature rather than tapering whatever
 * inherited the name.
 */
export const draftOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const angle = readNumber(params, 'angle', 3)
  if (angle === 0) throw new FeatureError('A draft needs a non-zero angle')
  if (Math.abs(angle) >= 90) throw new FeatureError('A draft angle must be under 90 degrees')

  const neutral = parameterPlane(context)
  const pullDirection = readVector3(params, 'pullDirection', frameNormal(neutral))
  if (pullDirection.x === 0 && pullDirection.y === 0 && pullDirection.z === 0) {
    throw new FeatureError('A draft needs a pull direction')
  }

  const neutralOffset = readNumber(params, 'neutralOffset', 0)

  for (const { solid, ids: faceIds } of await resolveGeometrySelection(context, 'face')) {
    replaceShape(
      context,
      solid,
      await context.kernel.draft(solid.shape, { angle, pullDirection, neutralOffset, faceIds }),
    )
  }
}
