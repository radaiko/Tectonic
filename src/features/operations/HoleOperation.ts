import type { HoleKind, Vec3 } from '../../kernel/IKernel'
import { isPoint } from '../../sketch/domain/SketchEntity'
import type { SketchModel } from '../../sketch/domain/SketchModel'
import type { Vec2 } from '../../sketch/domain/geometry'
import { frameNormal, negateVec3, toWorld } from '../geometry/plane'
import {
  readBoolean,
  readChoice,
  readNumber,
  readStringArray,
  readVector3,
} from '../domain/parameters'
import { HOLE_KINDS } from '../domain/schema'
import { reachOfSolids, replaceShape, requireSketch, sketchFrame, targetSolids } from './support'
import type { FeatureOperation } from './types'
import { FeatureError } from './types'

/** Depth used for a through-all hole when nothing bounds it. */
const UNBOUNDED_DEPTH = 1000

/**
 * Drills one hole per point in the feature's sketch. Holes are placed by sketch
 * geometry rather than by parameters so they move with the part when the sketch
 * that positions them is edited — which is the whole reason a hole is a feature
 * and not a cut extrude.
 */
export const holeOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const sketch = requireSketch(context)
  const centers = holeCenters(sketch, readStringArray(params, 'pointEntityIds'))
  if (centers.length === 0) {
    throw new FeatureError(`Sketch "${sketch.name}" has no point to place a hole on`)
  }

  const diameter = readNumber(params, 'diameter', 6)
  if (!(diameter > 0)) throw new FeatureError('A hole needs a positive diameter')

  const frame = sketchFrame(sketch)
  // Holes drill into the material, i.e. against the sketch plane's normal,
  // unless the feature names a direction of its own.
  const fallback = negateVec3(frameNormal(frame))
  const direction = readVector3(params, 'direction', fallback)
  if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
    throw new FeatureError('A hole needs a drilling direction')
  }

  const kind = readChoice(params, 'holeType', HOLE_KINDS, 'simple') as HoleKind
  const headDiameter = readNumber(params, 'headDiameter', diameter * 2)
  const headDepth = readNumber(params, 'headDepth', diameter / 2)

  for (const solid of targetSolids(context)) {
    const depth = await resolveDepth(context, frame.origin, direction, solid)
    if (!(depth > 0)) throw new FeatureError('A hole needs a positive depth')

    for (const center of centers) {
      const world: Vec3 = toWorld(frame, center)
      replaceShape(
        context,
        solid,
        await context.kernel.hole(solid.shape, {
          center: world,
          direction,
          diameter,
          depth,
          kind,
          headDiameter,
          headDepth,
        }),
      )
    }
  }
}

/**
 * The sketch points a hole sits on. Points that another entity owns — a line's
 * endpoint, a circle's centre — are skipped, since they position that entity
 * rather than mark a hole.
 */
function holeCenters(sketch: SketchModel, entityIds: readonly string[]): Vec2[] {
  if (entityIds.length > 0) {
    return entityIds.map((id) => {
      const point = sketch.requirePoint(id)
      return { x: point.x, y: point.y }
    })
  }

  const owned = new Set<string>()
  for (const entity of sketch.entities.values()) {
    if (isPoint(entity)) continue
    for (const id of entity.referencedIds) owned.add(id)
  }

  return [...sketch.entities.values()]
    .filter((entity) => isPoint(entity) && !owned.has(entity.id))
    .map((entity) => ({ x: (entity as { x: number }).x, y: (entity as { y: number }).y }))
}

async function resolveDepth(
  context: Parameters<FeatureOperation>[0],
  origin: Vec3,
  direction: Vec3,
  solid: Parameters<typeof reachOfSolids>[3][number],
): Promise<number> {
  const params = context.feature.parameters
  if (!readBoolean(params, 'throughAll', false)) {
    return Math.abs(readNumber(params, 'depth', 10))
  }
  return reachOfSolids(context, origin, direction, [solid], UNBOUNDED_DEPTH)
}
