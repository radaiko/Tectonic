import { frameNormal } from '../geometry/plane'
import { readNumber, readStringArray, readVector3 } from '../domain/parameters'
import { parameterPlane, replaceShape, targetSolids } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Tapers faces away from a neutral plane so the part can leave a mould. The pull
 * direction defaults to the normal of the plane named in `plane`, and the
 * neutral plane is that plane's offset along it.
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

  const faceIds = readStringArray(params, 'faceIds')
  const neutralOffset = readNumber(params, 'neutralOffset', 0)

  for (const solid of targetSolids(context)) {
    replaceShape(
      context,
      solid,
      await context.kernel.draft(solid.shape, { angle, pullDirection, neutralOffset, faceIds }),
    )
  }
}
