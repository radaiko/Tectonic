import type { ExtrudeSide, ShapeHandle, Vec3 } from '../../kernel/IKernel'
import { frameNormal, negateVec3 } from '../geometry/plane'
import {
  readBoolean,
  readChoice,
  readNumber,
  readStringArray,
} from '../domain/parameters'
import type { BooleanOperation, EndCondition } from '../domain/schema'
import {
  BOOLEAN_OPERATIONS,
  END_CONDITIONS,
  EXTRUDE_SIDES,
} from '../domain/schema'
import {
  applyBoolean,
  namedSolid,
  reachOfSolids,
  requireProfiles,
  requireSketch,
  sketchFrame,
  unionAll,
} from './support'
import type { FeatureOperation, OperationContext } from './types'

/** Distance used when nothing in the document bounds a "through all" sweep. */
const UNBOUNDED_DISTANCE = 1000

/**
 * Sweeps a sketch profile perpendicular to its plane. Every end condition other
 * than `blind` resolves against the bounding extent of the solids already in the
 * part, since the stub kernel has no faces to aim at.
 */
export const extrudeOperation: FeatureOperation = async (context) => {
  const tool = await buildExtrusion(context)
  await applyBoolean(context, tool, extrudeBooleanMode(context))
}

export function extrudeBooleanMode(context: OperationContext): BooleanOperation {
  return readChoice(context.feature.parameters, 'operation', BOOLEAN_OPERATIONS, 'new-body')
}

/** Builds the extruded tool shape without deciding how it joins the part. */
export async function buildExtrusion(context: OperationContext): Promise<ShapeHandle> {
  const { kernel, feature } = context
  const params = feature.parameters
  const sketch = requireSketch(context)
  const profiles = requireProfiles(sketch, readStringArray(params, 'profileEntityIds'))

  const offset = readNumber(params, 'offset', 0)
  const plane = await sketchFrame(context, sketch, offset)
  const reverse = readBoolean(params, 'reverse', false)
  const normal = frameNormal(plane)
  const direction: Vec3 = reverse ? negateVec3(normal) : normal

  const distance = await resolveDistance(context, direction, plane.origin)
  const side = readChoice(params, 'side', EXTRUDE_SIDES, 'one-sided') as ExtrudeSide
  const draftAngle = readNumber(params, 'draftAngle', 0)
  const secondDistance = Math.max(0, readNumber(params, 'secondDistance', 0))

  const shapes: ShapeHandle[] = []
  for (const profile of profiles) {
    shapes.push(
      await kernel.extrude({
        profile,
        distance,
        direction,
        plane,
        draftAngle,
        side,
        secondDistance,
      }),
    )
  }
  return unionAll(context, shapes)
}

async function resolveDistance(
  context: OperationContext,
  direction: Vec3,
  origin: Vec3,
): Promise<number> {
  const params = context.feature.parameters
  const blind = Math.abs(readNumber(params, 'distance', 25))
  const condition = readChoice(params, 'endCondition', END_CONDITIONS, 'blind') as EndCondition

  switch (condition) {
    case 'blind':
      return blind
    case 'offset-from-face':
      return Math.max(blind + readNumber(params, 'offset', 0), 0) || blind
    case 'up-to-body': {
      const target = namedSolid(context, 'upToBodyId')
      return reachOfSolids(context, origin, direction, target ? [target] : context.solids, blind)
    }
    default:
      // through-all, up-to-face and up-to-surface all clear the whole part.
      return reachOfSolids(context, origin, direction, context.solids, UNBOUNDED_DISTANCE)
  }
}
