import type { ShapeHandle, SweepOrientation, Vec3 } from '../../kernel/IKernel'
import { toWorld } from '../geometry/plane'
import { sketchPath } from '../geometry/profile'
import {
  readChoice,
  readNumber,
  readOptionalString,
  readStringArray,
} from '../domain/parameters'
import { SWEEP_ORIENTATIONS } from '../domain/schema'
import { applyBoolean, requireProfiles, requireSketch, sketchFrame, unionAll } from './support'
import { extrudeBooleanMode } from './ExtrudeOperation'
import type { FeatureOperation, OperationContext } from './types'
import { FeatureError } from './types'

/**
 * Drags a sketch profile along a curve drawn in a second sketch. The path is the
 * longest open chain in that sketch, lifted onto its own plane.
 */
export const sweepOperation: FeatureOperation = async (context) => {
  const tool = await buildSweep(context)
  await applyBoolean(context, tool, extrudeBooleanMode(context))
}

export async function buildSweep(context: OperationContext): Promise<ShapeHandle> {
  const { kernel, feature } = context
  const params = feature.parameters
  const sketch = requireSketch(context)
  const profiles = requireProfiles(sketch, readStringArray(params, 'profileEntityIds'))

  const pathSketchId = readOptionalString(params, 'pathSketchId')
  if (!pathSketchId) throw new FeatureError('A sweep needs a sketch holding its path')
  const pathSketch = requireSketch(context, pathSketchId)
  const path = sketchPath(pathSketch)
  if (path.length < 2) {
    throw new FeatureError(`Sketch "${pathSketch.name}" has no curve for the sweep to follow`)
  }

  const pathFrame = sketchFrame(pathSketch)
  const worldPath: Vec3[] = path.map((point) => toWorld(pathFrame, point))
  const orientation = readChoice(
    params,
    'orientation',
    SWEEP_ORIENTATIONS,
    'follow-path',
  ) as SweepOrientation

  const shapes: ShapeHandle[] = []
  for (const profile of profiles) {
    shapes.push(
      await kernel.sweep({
        profile,
        path: worldPath,
        plane: sketchFrame(sketch),
        orientation,
        twistAngle: readNumber(params, 'twistAngle', 0),
      }),
    )
  }
  return unionAll(context, shapes)
}
