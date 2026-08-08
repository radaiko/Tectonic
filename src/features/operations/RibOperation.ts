import type { ShapeHandle, Vec3 } from '../../kernel/IKernel'
import { frameNormal, negateVec3 } from '../geometry/plane'
import { sketchPath, thickenPath } from '../geometry/profile'
import { readBoolean, readNumber, readStringArray } from '../domain/parameters'
import {
  applyBoolean,
  reachOfSolids,
  requireSketch,
  sketchFrame,
  targetSolids,
  unionAll,
} from './support'
import type { FeatureOperation, OperationContext } from './types'
import { FeatureError } from './types'

/** How far a rib runs when there is no solid for it to reach down to. */
const UNBOUNDED_REACH = 100

/**
 * Thickens an open sketch curve into a web and joins it to the part. The curve
 * is the rib's centreline; the material grows either side of it and is swept
 * along the sketch normal until it meets the solid it braces.
 */
export const ribOperation: FeatureOperation = async (context) => {
  const tool = await buildRib(context)
  await applyBoolean(context, tool, 'join')
}

async function buildRib(context: OperationContext): Promise<ShapeHandle> {
  const params = context.feature.parameters
  const sketch = requireSketch(context)
  const centreline = sketchPath(sketch, readStringArray(params, 'profileEntityIds'))
  if (centreline.length < 2) {
    throw new FeatureError(`Sketch "${sketch.name}" has no curve for the rib to follow`)
  }

  const thickness = readNumber(params, 'thickness', 3)
  if (!(thickness > 0)) throw new FeatureError('A rib needs a positive thickness')

  const profile = thickenPath(centreline, thickness)
  if (!profile) throw new FeatureError('The rib curve is too short to thicken')

  const bothSides = readBoolean(params, 'bothSides', false)
  const plane = await sketchFrame(context, sketch, readNumber(params, 'offset', 0))
  const reverse = readBoolean(params, 'reverse', true)
  const normal = frameNormal(plane)
  const direction: Vec3 = reverse ? negateVec3(normal) : normal

  const solids = context.solids.length > 0 ? targetSolids(context) : []
  const depth = await reachOfSolids(
    context,
    plane.origin,
    direction,
    solids,
    readNumber(params, 'depth', UNBOUNDED_REACH),
  )

  return unionAll(context, [
    await context.kernel.extrude({
      profile,
      distance: depth,
      direction,
      plane,
      draftAngle: readNumber(params, 'draftAngle', 0),
      side: bothSides ? 'symmetric' : 'one-sided',
    }),
  ])
}
