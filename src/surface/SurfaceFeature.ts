import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../kernel/IKernel'
import type { FeatureParameters } from '../features/domain/parameters'
import {
  readBoolean,
  readChoice,
  readNumber,
  readOptionalString,
  readStringArray,
  readVector3,
} from '../features/domain/parameters'
import type { TrimBoundaryKind } from '../features/domain/schema'
import { SKETCH_PLANES, TRIM_BOUNDARY_KINDS } from '../features/domain/schema'
import { frameNormal, negateVec3, planeFrame, toWorld } from '../features/geometry/plane'
import { sketchPath, sketchProfiles } from '../features/geometry/profile'
import type { FeatureOperation, OperationContext, Solid } from '../features/operations/types'
import { FeatureError } from '../features/operations/types'
import type { SketchModel } from '../sketch/domain/SketchModel'
import {
  boundarySurface,
  extrudeSurface,
  loftSurface,
  offsetSurface,
  patchSurface,
  revolveSurface,
  ruledSurface,
  sweepSurface,
} from './SurfaceCreation'
import type { TrimBoundary } from './SurfaceEditing'
import {
  extendSurface,
  knitSurfaces,
  splitSurface,
  trimSurface,
  untrimSurface,
} from './SurfaceEditing'
import { stitchSurfaces, thickenSurface } from './SurfaceToSolid'
import type { Curve3, SurfaceBody, SurfacePlane } from './types'
import {
  EXTEND_MODES,
  SURFACE_SWEEP_ORIENTATIONS,
  SurfaceError,
  THICKEN_SIDES,
  TRIM_KEEPS,
} from './types'

/**
 * Surface operations as the feature tree sees them.
 *
 * Surfaces live in the same working set as solids, tagged with the sheet they came
 * from (see `Solid.surface`), and are registered with the kernel as meshes so the
 * viewport shows them like anything else. A surface feature therefore reads its
 * inputs out of the working set or out of the sketch table, exactly as a solid
 * feature does — and a thicken or a stitch drops the tag, which is what lets a
 * solid feature further down the tree depend on a surface further up it.
 */

/* -------------------------------------------------------------------------- */
/* Creation                                                                   */
/* -------------------------------------------------------------------------- */

export const extrudeSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const sketch = requireSurfaceSketch(context)
  const offset = readNumber(params, 'offset', 0)
  const frame = planeFrame(sketch.plane, offset)
  const normal = frameNormal(frame)

  await pushSurface(
    context,
    guard(() =>
      extrudeSurface(
        {
          curve: sketchCurve(sketch, offset, readStringArray(params, 'profileEntityIds')),
          direction: readBoolean(params, 'reverse', false) ? negateVec3(normal) : normal,
          distance: Math.abs(readNumber(params, 'distance', 25)),
          symmetric: readBoolean(params, 'symmetric', false),
        },
        naming(context),
      ),
    ),
  )
}

export const revolveSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const sketch = requireSurfaceSketch(context)
  const segments = readNumber(params, 'segments', 0)

  await pushSurface(
    context,
    guard(() =>
      revolveSurface(
        {
          curve: sketchCurve(sketch, 0, readStringArray(params, 'profileEntityIds')),
          axisOrigin: readVector3(params, 'axisOrigin', { x: 0, y: 0, z: 0 }),
          axisDirection: readVector3(params, 'axisDirection', { x: 0, y: 1, z: 0 }),
          angle: readNumber(params, 'angle', 360),
          symmetric: readBoolean(params, 'symmetric', false),
          ...(segments >= 3 ? { segments } : {}),
        },
        naming(context),
      ),
    ),
  )
}

export const sweepSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const profileSketch = requireSurfaceSketch(context)
  const pathId = readOptionalString(params, 'pathSketchId')
  if (!pathId) throw new FeatureError('A swept surface needs a path sketch')

  await pushSurface(
    context,
    guard(() =>
      sweepSurface(
        {
          profile: sketchCurve(profileSketch, 0, readStringArray(params, 'profileEntityIds')),
          path: sketchCurve(namedSketch(context, pathId), 0),
          orientation: readChoice(params, 'orientation', SURFACE_SWEEP_ORIENTATIONS, 'follow-path'),
          twistAngle: readNumber(params, 'twistAngle', 0),
        },
        naming(context),
      ),
    ),
  )
}

export const loftSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const sections = curvesFromSketches(context, 'sectionSketchIds', 2)
  const samples = readNumber(params, 'samples', 0)

  await pushSurface(
    context,
    guard(() =>
      loftSurface(
        {
          sections,
          closed: readBoolean(params, 'closed', false),
          ...(samples >= 2 ? { samples } : {}),
        },
        naming(context),
      ),
    ),
  )
}

export const boundarySurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const curves = curvesFromSketches(context, 'curveSketchIds', 2)
  const rows = readNumber(params, 'rows', 0)
  const columns = readNumber(params, 'columns', 0)

  await pushSurface(
    context,
    guard(() =>
      boundarySurface(
        {
          curves,
          ...(rows >= 2 ? { rows } : {}),
          ...(columns >= 2 ? { columns } : {}),
        },
        naming(context),
      ),
    ),
  )
}

export const ruledSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const curves = curvesFromSketches(context, 'curveSketchIds', 2)
  const samples = readNumber(params, 'samples', 0)

  await pushSurface(
    context,
    guard(() =>
      ruledSurface(
        {
          from: curves[0] as Curve3,
          to: curves[1] as Curve3,
          ...(samples >= 2 ? { samples } : {}),
        },
        naming(context),
      ),
    ),
  )
}

export const patchSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const named = readStringArray(params, 'curveSketchIds')
  const curves =
    named.length > 0
      ? curvesFromSketches(context, 'curveSketchIds', 1)
      : [sketchCurve(requireSurfaceSketch(context), 0, readStringArray(params, 'profileEntityIds'))]

  await pushSurface(context, guard(() => patchSurface({ curves }, naming(context))))
}

export const offsetSurfaceOperation: FeatureOperation = async (context) => {
  const distance = readNumber(context.feature.parameters, 'distance', 5)
  for (const solid of surfaceTargets(context)) {
    const offset = guard(() => offsetSurface(surfaceOf(solid), distance, naming(context)))
    await replaceSurface(context, solid, offset)
  }
}

/* -------------------------------------------------------------------------- */
/* Editing                                                                    */
/* -------------------------------------------------------------------------- */

export const extendSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const mode = readChoice(params, 'mode', EXTEND_MODES, 'distance')
  const boundaryIndex = readNumber(params, 'boundaryIndex', -1)

  for (const solid of surfaceTargets(context)) {
    const extended = guard(() =>
      extendSurface(
        surfaceOf(solid),
        {
          mode,
          distance: Math.abs(readNumber(params, 'distance', 10)),
          ...(mode === 'to-plane' ? { toPlane: parameterSurfacePlane(params) } : {}),
          ...(boundaryIndex >= 0 ? { boundaryIndex } : {}),
        },
        naming(context),
      ),
    )
    await replaceSurface(context, solid, extended)
  }
}

export const trimSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const keep = readChoice(params, 'keep', TRIM_KEEPS, 'front')

  for (const solid of surfaceTargets(context)) {
    const body = surfaceOf(solid)
    const trimmed = guard(() =>
      trimSurface(body, { boundary: trimBoundary(context, body), keep }, naming(context)),
    )
    await replaceSurface(context, solid, trimmed)
  }
}

export const untrimSurfaceOperation: FeatureOperation = async (context) => {
  for (const solid of surfaceTargets(context)) {
    const restored = guard(() => untrimSurface(surfaceOf(solid), naming(context)))
    await replaceSurface(context, solid, restored)
  }
}

export const knitSurfaceOperation: FeatureOperation = async (context) => {
  const targets = surfaceTargets(context)
  if (targets.length < 2) throw new FeatureError('Knitting needs at least two surfaces')

  const tolerance = readNumber(context.feature.parameters, 'tolerance', 0)
  const knitted = guard(() =>
    knitSurfaces(
      targets.map(surfaceOf),
      tolerance > 0 ? { tolerance } : {},
      naming(context),
    ),
  )

  // The first target becomes the knitted body; the rest are consumed.
  const [survivor, ...consumed] = targets as [Solid, ...Solid[]]
  await replaceSurface(context, survivor, knitted)
  removeSolids(context, consumed)
}

export const splitSurfaceOperation: FeatureOperation = async (context) => {
  for (const solid of surfaceTargets(context)) {
    const body = surfaceOf(solid)
    const [first, ...rest] = guard(() =>
      splitSurface(body, trimBoundary(context, body), naming(context)),
    ) as [SurfaceBody, ...SurfaceBody[]]

    await replaceSurface(context, solid, first)
    for (const piece of rest) await pushSurface(context, piece)
  }
}

/* -------------------------------------------------------------------------- */
/* Leaving the surface environment                                            */
/* -------------------------------------------------------------------------- */

export const thickenSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const thickness = Math.abs(readNumber(params, 'thickness', 2))
  const side = readChoice(params, 'side', THICKEN_SIDES, 'normal')

  for (const solid of surfaceTargets(context)) {
    const solidified = guard(() => thickenSurface(surfaceOf(solid), { thickness, side }))
    await replaceWithSolid(context, solid, solidified.mesh, context.feature.name)
  }
}

export const stitchSurfaceOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const targets = surfaceTargets(context)
  const tolerance = readNumber(params, 'tolerance', 0)

  const stitched = guard(() =>
    stitchSurfaces(targets.map(surfaceOf), {
      ...(tolerance > 0 ? { tolerance } : {}),
      requireClosed: readBoolean(params, 'requireClosed', false),
    }),
  )

  const [survivor, ...consumed] = targets as [Solid, ...Solid[]]
  await replaceWithSolid(context, survivor, stitched.mesh, context.feature.name)
  removeSolids(context, consumed)
}

/* -------------------------------------------------------------------------- */
/* Support                                                                    */
/* -------------------------------------------------------------------------- */

/** The surfaces a feature acts on: the ones it names, or every one in the part. */
export function surfaceTargets(context: OperationContext): Solid[] {
  const named = readStringArray(context.feature.parameters, 'surfaceBodyIds')
  const sheets = context.solids.filter((solid) => solid.surface !== undefined)
  const targets = named.length === 0 ? sheets : sheets.filter((solid) => named.includes(solid.id))

  if (targets.length === 0) {
    throw new FeatureError('This feature needs a surface body to work on')
  }
  return targets
}

function surfaceOf(solid: Solid): SurfaceBody {
  if (!solid.surface) throw new FeatureError(`Body ${solid.id} is not a surface`)
  return solid.surface
}

/** Adds a freshly built sheet to the working set, backed by a kernel mesh. */
async function pushSurface(context: OperationContext, body: SurfaceBody): Promise<void> {
  context.solids.push({
    id: context.newSolidId(),
    name: body.name,
    shape: await context.kernel.createFromMesh(body.mesh),
    featureId: context.feature.id,
    surface: body,
  })
}

async function replaceSurface(
  context: OperationContext,
  solid: Solid,
  body: SurfaceBody,
): Promise<void> {
  const shape = await context.kernel.createFromMesh(body.mesh)
  context.kernel.dispose(solid.shape)
  solid.shape = shape
  solid.name = body.name
  solid.surface = body
  solid.featureId = context.feature.id
}

/** Turns a sheet in the working set into a plain solid, dropping the surface tag. */
async function replaceWithSolid(
  context: OperationContext,
  solid: Solid,
  mesh: MeshData,
  name: string,
): Promise<void> {
  const shape = await context.kernel.createFromMesh(mesh)
  context.kernel.dispose(solid.shape)
  solid.shape = shape
  solid.name = name
  solid.surface = undefined
  solid.featureId = context.feature.id
}

function removeSolids(context: OperationContext, doomed: readonly Solid[]): void {
  for (const solid of doomed) {
    const index = context.solids.indexOf(solid)
    if (index !== -1) context.solids.splice(index, 1)
    context.kernel.dispose(solid.shape)
  }
}

function naming(context: OperationContext): { id: string; name: string } {
  return { id: `${context.feature.id}-surface`, name: context.feature.name }
}

function requireSurfaceSketch(context: OperationContext): SketchModel {
  const id = context.feature.sketchId
  if (!id) throw new FeatureError('No sketch is attached to this feature')
  return namedSketch(context, id)
}

function namedSketch(context: OperationContext, id: string): SketchModel {
  const sketch = context.sketches.get(id)
  if (!sketch) throw new FeatureError(`Sketch ${id} is missing from the document`)
  return sketch
}

/** The curves named by a list-of-sketch-ids parameter, in the order given. */
function curvesFromSketches(
  context: OperationContext,
  key: string,
  minimum: number,
): Curve3[] {
  const ids = readStringArray(context.feature.parameters, key)
  const curves = ids.map((id) => sketchCurve(namedSketch(context, id), 0))
  if (curves.length < minimum) {
    throw new FeatureError(
      `This feature needs at least ${String(minimum)} curve sketch(es) in "${key}"`,
    )
  }
  return curves
}

/**
 * A sketch as a single world-space curve.
 *
 * A closed region wins over an open chain, so a sketched rectangle sweeps as a
 * loop rather than as a polyline that happens to come back to its start. Closed
 * curves are handed on with their first point repeated, which is how `surface/`
 * recognises them.
 */
export function sketchCurve(
  sketch: SketchModel,
  planeOffset = 0,
  entityIds: readonly string[] = [],
): Curve3 {
  const frame = planeFrame(sketch.plane, planeOffset)

  const [region] = sketchProfiles(sketch, entityIds)
  if (region && region.points.length >= 3) {
    const loop = region.points.map((point) => toWorld(frame, point))
    return [...loop, loop[0] as Vec3]
  }

  const path = sketchPath(sketch, entityIds)
  if (path.length >= 2) return path.map((point) => toWorld(frame, point))

  throw new FeatureError(`Sketch "${sketch.name}" has no curve to build a surface from`)
}

/** The cutting plane a `plane`/`offset` parameter pair names, as a surface plane. */
function parameterSurfacePlane(params: FeatureParameters): SurfacePlane {
  const plane = readChoice(params, 'plane', SKETCH_PLANES, 'XY')
  const frame = planeFrame(plane, readNumber(params, 'offset', 0))
  return { origin: frame.origin, normal: frameNormal(frame) }
}

/** What a trim or split feature cuts against, resolved from its parameters. */
function trimBoundary(context: OperationContext, body: SurfaceBody): TrimBoundary {
  const params = context.feature.parameters
  const kind: TrimBoundaryKind = readChoice(params, 'boundaryKind', TRIM_BOUNDARY_KINDS, 'plane')

  if (kind === 'curve') {
    const sketchId = readOptionalString(params, 'curveSketchId')
    if (!sketchId) throw new FeatureError('A curve trim needs a trim curve sketch')
    return { kind: 'curve', curve: sketchCurve(namedSketch(context, sketchId), 0) }
  }

  if (kind === 'surface') {
    const toolId = readOptionalString(params, 'toolSurfaceBodyId')
    const tool = context.solids.find((solid) => solid.id === toolId && solid.surface)
    if (!tool) throw new FeatureError('A surface trim needs another surface to cut with')
    if (tool.surface === body) throw new FeatureError('A surface cannot trim itself')
    return { kind: 'surface', surface: surfaceOf(tool) }
  }

  return { kind: 'plane', plane: parameterSurfacePlane(params) }
}

/** Surface errors are feature errors as far as the tree is concerned. */
function guard<T>(work: () => T): T {
  try {
    return work()
  } catch (cause) {
    if (cause instanceof SurfaceError) throw new FeatureError(cause.message)
    throw cause
  }
}
