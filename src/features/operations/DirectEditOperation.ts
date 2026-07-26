import type { ShapeHandle } from '../../kernel/IKernel'
import { readChoice, readNumber, readStringArray, readVector3 } from '../domain/parameters'
import type { DirectEditKind } from '../domain/schema'
import { DIRECT_EDITS } from '../domain/schema'
import { replaceShape, targetSolids } from './support'
import type { FeatureOperation, OperationContext } from './types'
import { FeatureError } from './types'

/**
 * Edits a solid's faces directly, without going back through the sketch that
 * made them. This is the escape hatch for geometry whose history is gone or not
 * worth unpicking — imported bodies, mostly — so it names faces by id and takes
 * whatever the previous feature left behind.
 */
export const directEditOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const editType = readChoice(params, 'editType', DIRECT_EDITS, 'move-face') as DirectEditKind
  const faceIds = readStringArray(params, 'faceIds')
  if (faceIds.length === 0) {
    throw new FeatureError('A direct edit needs at least one selected face')
  }

  for (const solid of targetSolids(context)) {
    replaceShape(context, solid, await applyEdit(context, editType, solid.shape, faceIds))
  }
}

function applyEdit(
  context: OperationContext,
  editType: DirectEditKind,
  shape: ShapeHandle,
  faceIds: readonly string[],
): Promise<ShapeHandle> {
  const params = context.feature.parameters

  switch (editType) {
    case 'delete-face':
      return context.kernel.deleteFace(shape, { faceIds })
    case 'offset-face':
      return context.kernel.offsetFace(shape, {
        faceIds,
        distance: requireDistance(readNumber(params, 'distance', 0)),
      })
    default: {
      const direction = readVector3(params, 'direction', { x: 0, y: 0, z: 1 })
      if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
        throw new FeatureError('Moving a face needs a direction')
      }
      return context.kernel.moveFace(shape, {
        faceIds,
        direction,
        distance: requireDistance(readNumber(params, 'distance', 0)),
      })
    }
  }
}

function requireDistance(distance: number): number {
  if (distance === 0) throw new FeatureError('A direct edit needs a non-zero distance')
  return distance
}
