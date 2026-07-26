import type { ShapeHandle, TransformParams, Vec3 } from '../../kernel/IKernel'
import { readBoolean, readChoice, readNumber, readVector3 } from '../domain/parameters'
import { PATTERN_TYPES } from '../domain/schema'
import { replaceShape, sourceSolids } from './support'
import type { FeatureOperation, OperationContext, Solid } from './types'
import { FeatureError } from './types'

/** A full circle needs no instance at 360°, since that is the seed itself. */
const FULL_TURN = 360

/**
 * Repeats the solids a feature produced, in a grid or around an axis. Copies are
 * fused back into the solid they came from unless `merge` is off, in which case
 * each instance becomes a body of its own.
 */
export const patternOperation: FeatureOperation = async (context) => {
  const placements = instancePlacements(context)
  if (placements.length === 0) {
    throw new FeatureError('This pattern produces no instances beyond the original')
  }

  const merge = readBoolean(context.feature.parameters, 'merge', true)

  for (const source of sourceSolids(context)) {
    const copies: ShapeHandle[] = []
    for (const placement of placements) {
      copies.push(await context.kernel.transform(source.shape, placement))
    }

    if (!merge) {
      for (const copy of copies) {
        context.solids.push({
          id: context.newSolidId(),
          name: `${context.feature.name} instance`,
          shape: copy,
          featureId: context.feature.id,
        })
      }
      continue
    }

    await fuseInto(context, source, copies)
  }
}

/** Unions every instance into its seed solid, releasing the copies as it goes. */
async function fuseInto(
  context: OperationContext,
  source: Solid,
  copies: readonly ShapeHandle[],
): Promise<void> {
  for (const copy of copies) {
    const merged = await context.kernel.booleanUnion(source.shape, copy)
    context.kernel.dispose(copy)
    replaceShape(context, source, merged)
  }
}

/** Where each instance goes, excluding the seed's own position. */
export function instancePlacements(context: OperationContext): TransformParams[] {
  const params = context.feature.parameters
  const type = readChoice(params, 'patternType', PATTERN_TYPES, 'rectangular')

  if (type === 'circular') {
    const count = wholeCount(readNumber(params, 'count1', 3))
    const total = readNumber(params, 'totalAngle', FULL_TURN)
    const axis = readVector3(params, 'axisDirection', { x: 0, y: 0, z: 1 })
    if (axis.x === 0 && axis.y === 0 && axis.z === 0) {
      throw new FeatureError('A circular pattern needs an axis direction')
    }
    const origin = readVector3(params, 'axisOrigin', { x: 0, y: 0, z: 0 })
    // A full turn wraps, so the last instance would land on the seed; a partial
    // sweep spans its ends instead.
    const divisor = Math.abs(Math.abs(total) - FULL_TURN) < 1e-9 ? count : Math.max(1, count - 1)

    return Array.from({ length: count - 1 }, (_, index) => ({
      rotate: { axis, origin, angle: (total / divisor) * (index + 1) },
    }))
  }

  const count1 = wholeCount(readNumber(params, 'count1', 3))
  const count2 = wholeCount(readNumber(params, 'count2', 1))
  const spacing1 = readNumber(params, 'spacing1', 20)
  const spacing2 = readNumber(params, 'spacing2', 20)
  const direction1 = unit(readVector3(params, 'direction1', { x: 1, y: 0, z: 0 }))
  const direction2 = unit(readVector3(params, 'direction2', { x: 0, y: 1, z: 0 }))

  const placements: TransformParams[] = []
  for (let first = 0; first < count1; first += 1) {
    for (let second = 0; second < count2; second += 1) {
      if (first === 0 && second === 0) continue
      placements.push({
        translate: {
          x: direction1.x * spacing1 * first + direction2.x * spacing2 * second,
          y: direction1.y * spacing1 * first + direction2.y * spacing2 * second,
          z: direction1.z * spacing1 * first + direction2.z * spacing2 * second,
        },
      })
    }
  }
  return placements
}

function wholeCount(value: number): number {
  const count = Math.trunc(value)
  if (count < 1) throw new FeatureError('A pattern needs a count of at least one')
  return count
}

function unit(vector: Vec3): Vec3 {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z)
  if (magnitude === 0) throw new FeatureError('A pattern direction cannot be zero')
  return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude }
}
