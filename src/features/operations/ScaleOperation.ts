import type { Vec3 } from '../../kernel/IKernel'
import { readBoolean, readNumber, readVector3 } from '../domain/parameters'
import { replaceShape, targetSolids } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/**
 * Resizes solids about a point, uniformly or per axis. A non-uniform scale is
 * deliberately allowed to break the part's own construction geometry — it is a
 * modelling operation on the result, not on the sketches behind it.
 */
export const scaleOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const uniform = readBoolean(params, 'uniform', true)

  const scale: number | Vec3 = uniform
    ? readNumber(params, 'factor', 1.5)
    : {
        x: readNumber(params, 'factorX', 1),
        y: readNumber(params, 'factorY', 1),
        z: readNumber(params, 'factorZ', 1),
      }

  const factors = typeof scale === 'number' ? [scale] : [scale.x, scale.y, scale.z]
  if (factors.some((factor) => factor === 0)) {
    throw new FeatureError('A scale factor cannot be zero')
  }

  const scaleOrigin = readVector3(params, 'originPoint', { x: 0, y: 0, z: 0 })

  for (const solid of targetSolids(context)) {
    replaceShape(
      context,
      solid,
      await context.kernel.transform(solid.shape, { scale, scaleOrigin }),
    )
  }
}
