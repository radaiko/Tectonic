import type { LoftSection, ShapeHandle, Vec3 } from '../../kernel/IKernel'
import { toWorld } from '../geometry/plane'
import { sketchPath } from '../geometry/profile'
import { readBoolean, readStringArray } from '../domain/parameters'
import { applyBoolean, requireProfiles, requireSketch, sketchFrame } from './support'
import { extrudeBooleanMode } from './ExtrudeOperation'
import type { FeatureOperation, OperationContext } from './types'
import { FeatureError } from './types'

/**
 * Blends between two or more sketch profiles. Sections are listed in
 * `sectionSketchIds`; the feature's own sketch leads when it is not already
 * named there. Guides are carried through to the kernel, which the stub records
 * but does not yet follow.
 */
export const loftOperation: FeatureOperation = async (context) => {
  const tool = await buildLoft(context)
  await applyBoolean(context, tool, extrudeBooleanMode(context))
}

export async function buildLoft(context: OperationContext): Promise<ShapeHandle> {
  const params = context.feature.parameters
  const sketchIds = sectionSketchIds(context)
  if (sketchIds.length < 2) {
    throw new FeatureError('A loft needs at least two section sketches')
  }

  const sections: LoftSection[] = []
  for (const sketchId of sketchIds) {
    const sketch = requireSketch(context, sketchId)
    sections.push({
      profile: requireProfiles(sketch)[0] as LoftSection['profile'],
      plane: await sketchFrame(context, sketch),
    })
  }

  const guides: Vec3[][] = []
  for (const sketchId of readStringArray(params, 'guideSketchIds')) {
    const sketch = requireSketch(context, sketchId)
    const frame = await sketchFrame(context, sketch)
    const guide = sketchPath(sketch).map((point) => toWorld(frame, point))
    if (guide.length >= 2) guides.push(guide)
  }

  return context.kernel.loft({
    sections,
    closed: readBoolean(params, 'closed', false),
    ...(guides.length > 0 ? { guides } : {}),
  })
}

function sectionSketchIds(context: OperationContext): string[] {
  const listed = readStringArray(context.feature.parameters, 'sectionSketchIds')
  const own = context.feature.sketchId
  return own && !listed.includes(own) ? [own, ...listed] : listed
}
