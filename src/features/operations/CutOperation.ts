import type { ShapeHandle } from '../../kernel/IKernel'
import { FeatureType, additiveEquivalent } from '../domain/FeatureType'
import { readBoolean, readChoice, readNumber } from '../domain/parameters'
import { applyBoolean } from './support'
import { buildExtrusion } from './ExtrudeOperation'
import { buildLoft } from './LoftOperation'
import { buildRevolution } from './RevolveOperation'
import { buildSweep } from './SweepOperation'
import type { FeatureOperation, OperationContext } from './types'
import { FeatureError } from './types'

/** A cut may only remove material or keep the overlap — never add any. */
const CUT_MODES = ['cut', 'intersect'] as const

/**
 * Removes material with a swept sketch. The tool is built exactly as its
 * additive twin would build it — an extrude cut and an extrude read the same
 * parameters — and is then subtracted instead of joined.
 */
export const cutOperation: FeatureOperation = async (context) => {
  const tool = await buildCutTool(context)
  await applyBoolean(context, tool, readChoice(context.feature.parameters, 'operation', CUT_MODES, 'cut'))
}

/**
 * The tool shape a cut removes. `thin` hollows it first, so the cut leaves a
 * walled channel rather than clearing the whole profile.
 */
export async function buildCutTool(context: OperationContext): Promise<ShapeHandle> {
  const solid = await buildAdditiveTool(context)
  if (!readBoolean(context.feature.parameters, 'thin', false)) return solid

  const thickness = readNumber(context.feature.parameters, 'thinThickness', 1)
  if (!(thickness > 0)) throw new FeatureError('A thin cut needs a positive wall thickness')

  const walled = await context.kernel.shell(solid, { thickness })
  context.kernel.dispose(solid)
  return walled
}

/** Dispatches to whichever sweep the cut feature is the cutting twin of. */
async function buildAdditiveTool(context: OperationContext): Promise<ShapeHandle> {
  switch (additiveEquivalent(context.feature.featureType)) {
    case FeatureType.Extrude:
      return buildExtrusion(context)
    case FeatureType.Revolve:
      return buildRevolution(context)
    case FeatureType.Sweep:
      return buildSweep(context)
    case FeatureType.Loft:
      return buildLoft(context)
    default:
      throw new FeatureError(`${context.feature.featureType} is not a cutting feature`)
  }
}
