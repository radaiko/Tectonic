import type { ShapeHandle } from '../../kernel/IKernel'
import { KernelError } from '../../kernel/IKernel'
import { readBoolean, readChoice, readStringArray } from '../domain/parameters'
import { COMBINE_OPERATIONS } from '../domain/schema'
import { namedSolid, replaceShape } from './support'
import type { FeatureOperation, OperationContext, Solid } from './types'
import { FeatureError } from './types'

/**
 * Booleans two or more existing bodies together. Unlike the boolean mode carried
 * by extrude and its kin, this acts on solids already in the part rather than on
 * a freshly swept tool — it is how separate bodies become one.
 */
export const combineOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const operation = readChoice(params, 'operation', COMBINE_OPERATIONS, 'union')

  const target = namedSolid(context, 'targetBodyId') ?? context.solids[0]
  if (!target) throw new FeatureError('A combine needs a target body')

  const tools = resolveTools(context, target)
  if (tools.length === 0) throw new FeatureError('A combine needs at least one tool body')

  for (const tool of tools) {
    try {
      replaceShape(context, target, await apply(context, operation, target.shape, tool.shape))
    } catch (cause) {
      if (cause instanceof KernelError && /empty solid/.test(cause.message)) {
        throw new FeatureError('This combine would leave nothing behind')
      }
      throw cause
    }
  }

  if (!readBoolean(params, 'keepTools', false)) {
    for (const tool of tools) {
      const index = context.solids.indexOf(tool)
      if (index !== -1) context.solids.splice(index, 1)
      context.kernel.dispose(tool.shape)
    }
  }
}

function apply(
  context: OperationContext,
  operation: (typeof COMBINE_OPERATIONS)[number],
  target: ShapeHandle,
  tool: ShapeHandle,
): Promise<ShapeHandle> {
  switch (operation) {
    case 'union':
      return context.kernel.booleanUnion(target, tool)
    case 'subtract':
      return context.kernel.booleanSubtract(target, tool)
    default:
      return context.kernel.booleanIntersect(target, tool)
  }
}

/** Named tool bodies, or everything else in the part when none are named. */
function resolveTools(context: OperationContext, target: Solid): Solid[] {
  const ids = readStringArray(context.feature.parameters, 'toolBodyIds')
  const candidates = context.solids.filter((solid) => solid !== target)
  return ids.length === 0 ? candidates : candidates.filter((solid) => ids.includes(solid.id))
}
