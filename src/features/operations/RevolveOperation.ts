import type { RevolveAxis, ShapeHandle } from '../../kernel/IKernel'
import { isLine } from '../../sketch/domain/SketchEntity'
import type { SketchModel } from '../../sketch/domain/SketchModel'
import {
  readBoolean,
  readNumber,
  readOptionalString,
  readStringArray,
  readVector2,
} from '../domain/parameters'
import { applyBoolean, requireProfiles, requireSketch, sketchFrame, unionAll } from './support'
import { extrudeBooleanMode } from './ExtrudeOperation'
import type { FeatureOperation, OperationContext } from './types'
import { FeatureError } from './types'

/**
 * Spins a sketch profile about an axis in its own plane. The axis is either a
 * line drawn in the sketch (usually a construction line) or an explicit
 * origin/direction pair on the feature.
 */
export const revolveOperation: FeatureOperation = async (context) => {
  const tool = await buildRevolution(context)
  await applyBoolean(context, tool, extrudeBooleanMode(context))
}

export async function buildRevolution(context: OperationContext): Promise<ShapeHandle> {
  const { kernel, feature } = context
  const params = feature.parameters
  const sketch = requireSketch(context)
  const profiles = requireProfiles(sketch, readStringArray(params, 'profileEntityIds'))

  const angle = readNumber(params, 'angle', 360)
  if (angle === 0) throw new FeatureError('A revolve needs a non-zero angle')

  const axis = resolveAxis(sketch, params)
  const plane = await sketchFrame(context, sketch)
  const symmetric = readBoolean(params, 'symmetric', false)

  const shapes: ShapeHandle[] = []
  for (const profile of profiles) {
    shapes.push(await kernel.revolve({ profile, axis, angle, plane, symmetric }))
  }
  return unionAll(context, shapes)
}

function resolveAxis(
  sketch: SketchModel,
  params: Parameters<typeof readVector2>[0],
): RevolveAxis {
  const entityId = readOptionalString(params, 'axisEntityId')
  if (entityId) {
    const entity = sketch.getEntity(entityId)
    if (!entity || !isLine(entity)) {
      throw new FeatureError('The revolve axis is not a line in this sketch')
    }
    const start = sketch.requirePoint(entity.startPointId)
    const end = sketch.requirePoint(entity.endPointId)
    const direction = { x: end.x - start.x, y: end.y - start.y }
    if (direction.x === 0 && direction.y === 0) {
      throw new FeatureError('The revolve axis line has no length')
    }
    return { origin: { x: start.x, y: start.y }, direction }
  }

  const direction = readVector2(params, 'axisDirection', { x: 0, y: 1 })
  if (direction.x === 0 && direction.y === 0) {
    throw new FeatureError('The revolve axis has no direction')
  }
  return { origin: readVector2(params, 'axisOrigin', { x: 0, y: 0 }), direction }
}
