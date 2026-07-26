import { readBoolean } from '../domain/parameters'
import { parameterPlane, replaceShape, sourceSolids } from './support'
import type { FeatureOperation } from './types'

/**
 * Reflects the solids a feature produced through a base plane. With `merge` on —
 * the default — the reflection is fused back into its original, which is what
 * makes a mirrored half into one symmetric body.
 */
export const mirrorOperation: FeatureOperation = async (context) => {
  const plane = parameterPlane(context, 'YZ')
  const merge = readBoolean(context.feature.parameters, 'merge', true)

  for (const source of sourceSolids(context)) {
    const reflection = await context.kernel.mirror(source.shape, plane)

    if (!merge) {
      context.solids.push({
        id: context.newSolidId(),
        name: `${source.name} mirrored`,
        shape: reflection,
        featureId: context.feature.id,
      })
      continue
    }

    const merged = await context.kernel.booleanUnion(source.shape, reflection)
    context.kernel.dispose(reflection)
    replaceShape(context, source, merged)
  }
}
