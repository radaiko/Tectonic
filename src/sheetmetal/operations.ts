import { requireSketch } from '../features/operations/support'
import type { FeatureOperation, OperationContext, Solid } from '../features/operations/types'
import { FeatureError } from '../features/operations/types'
import type { FeatureParameters, ParameterValue } from '../features/domain/parameters'
import {
  readBoolean,
  readChoice,
  readNumber,
  readString,
  readStringArray,
} from '../features/domain/parameters'
import { SheetMetalParameters } from './SheetMetalParameters'
import type { BaseProfileKind } from './BaseFlange'
import { BASE_PROFILE_KINDS, baseFlangeFromSketch } from './BaseFlange'
import { createEdgeFlange } from './EdgeFlange'
import { createHem } from './Hem'
import { createJog } from './Jog'
import { createMiterFlange } from './MiterFlange'
import { FoldUnfold } from './FoldUnfold'
import { SheetMetalPart } from './SheetMetalPart'
import type { EdgeFeatureSpec } from './SheetMetalPart'
import type { HemType, LengthMode, ReliefType } from './types'
import { BEND_METHODS, HEM_TYPES, LENGTH_MODES, RELIEF_TYPES, SheetMetalError } from './types'

/**
 * Sheet metal features as the feature tree sees them.
 *
 * The tree stores parameters, not geometry, so every operation reads its spec
 * out of the feature and hands it to the sheet metal model. Each edge feature
 * rebuilds the whole body: folding is cheap next to the boolean that would be
 * needed to graft a flange onto an existing solid, and it keeps the folded body
 * and the flat pattern derived from exactly the same specs.
 */

/** Starts a sheet metal body from the feature's sketch. */
export const baseFlangeOperation: FeatureOperation = async (context) => {
  const sketch = requireSketch(context)
  const params = context.feature.parameters
  const profileKind = readChoice(params, 'profileKind', BASE_PROFILE_KINDS, 'closed')

  const part = new SheetMetalPart({
    id: context.feature.id,
    name: context.feature.name,
    parameters: readParameters(params),
    base: guard(() =>
      baseFlangeFromSketch(sketch, {
        profileKind: profileKind as BaseProfileKind,
        width: readNumber(params, 'width', 50),
        planeOffset: readNumber(params, 'planeOffset', 0),
        entityIds: readStringArray(params, 'profileEntityIds'),
      }),
    ),
  })

  const fold = new FoldUnfold(part)
  context.solids.push({
    id: context.newSolidId(),
    name: context.feature.name,
    shape: await guardAsync(() => fold.build(context.kernel)),
    featureId: context.feature.id,
    sheetMetal: fold,
  })
}

export const edgeFlangeOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  await applyEdgeFeatures(context, [
    guard(() =>
      createEdgeFlange({
        id: context.feature.id,
        edgeIndex: readNumber(params, 'edgeIndex', 0),
        length: readNumber(params, 'length', 10),
        angle: readNumber(params, 'angle', 90),
        radius: optionalRadius(params),
        lengthMode: readChoice(params, 'lengthMode', LENGTH_MODES, 'outside') as LengthMode,
        flip: readBoolean(params, 'flip', false),
        miteredCorners: readBoolean(params, 'miteredCorners', false),
        relief: readChoice(params, 'relief', RELIEF_TYPES, 'rectangular') as ReliefType,
      }),
    ),
  ])
}

export const miterFlangeOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  const solid = sheetMetalSolid(context)
  const spec = guard(() =>
    createMiterFlange({
      id: context.feature.id,
      edgeIndices: readNumberArray(params, 'edgeIndices'),
      length: readNumber(params, 'length', 10),
      angle: readNumber(params, 'angle', 90),
      radius: optionalRadius(params),
      lengthMode: readChoice(params, 'lengthMode', LENGTH_MODES, 'outside') as LengthMode,
      flip: readBoolean(params, 'flip', false),
      gap: readNumber(params, 'gap', 0),
      relief: readChoice(params, 'relief', RELIEF_TYPES, 'rectangular') as ReliefType,
    }),
  )

  await rebuild(context, solid, () => {
    solid.sheetMetal?.part.addMiterFlange(spec)
  })
}

export const hemOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  await applyEdgeFeatures(context, [
    guard(() =>
      createHem({
        id: context.feature.id,
        edgeIndex: readNumber(params, 'edgeIndex', 0),
        hemType: readChoice(params, 'hemType', HEM_TYPES, 'open') as HemType,
        length: readNumber(params, 'length', 5),
        gap: readNumber(params, 'gap', 1),
        radius: optionalRadius(params),
        angle: readNumber(params, 'angle', 180),
        flip: readBoolean(params, 'flip', false),
        relief: readChoice(params, 'relief', RELIEF_TYPES, 'rectangular') as ReliefType,
      }),
    ),
  ])
}

export const jogOperation: FeatureOperation = async (context) => {
  const params = context.feature.parameters
  await applyEdgeFeatures(context, [
    guard(() =>
      createJog({
        id: context.feature.id,
        edgeIndex: readNumber(params, 'edgeIndex', 0),
        offset: readNumber(params, 'offset', 5),
        angle: readNumber(params, 'angle', 90),
        length: readNumber(params, 'length', 10),
        radius: optionalRadius(params),
        flip: readBoolean(params, 'flip', false),
        relief: readChoice(params, 'relief', RELIEF_TYPES, 'rectangular') as ReliefType,
      }),
    ),
  ])
}

/** Flattens the body so the features after it can cut across its bends. */
export const unfoldOperation: FeatureOperation = async (context) => {
  const solid = sheetMetalSolid(context)
  await rebuild(context, solid, () => {
    solid.sheetMetal?.unfold()
  })
}

/** Puts the bends back, keeping whatever was cut while the part was flat. */
export const refoldOperation: FeatureOperation = async (context) => {
  const solid = sheetMetalSolid(context)
  await rebuild(context, solid, () => {
    solid.sheetMetal?.refold()
  })
}

/* -------------------------------------------------------------------------- */

/** The sheet metal body a feature acts on: the one it names, or the last one. */
export function sheetMetalSolid(context: OperationContext): Solid {
  const named = readString(context.feature.parameters, 'targetBodyId', '')
  const candidates = context.solids.filter((solid) => solid.sheetMetal)
  const solid = named
    ? candidates.find((candidate) => candidate.id === named)
    : candidates[candidates.length - 1]

  if (!solid) {
    throw new FeatureError('This feature needs a sheet metal body to work on')
  }
  return solid
}

async function applyEdgeFeatures(
  context: OperationContext,
  specs: readonly EdgeFeatureSpec[],
): Promise<void> {
  const solid = sheetMetalSolid(context)
  await rebuild(context, solid, () => {
    for (const spec of specs) solid.sheetMetal?.part.addFeature(spec)
  })
}

/** Applies a change to the model and swaps the solid's shape for the result. */
async function rebuild(
  context: OperationContext,
  solid: Solid,
  change: () => void,
): Promise<void> {
  guard(change)
  const shape = await guardAsync(() =>
    (solid.sheetMetal as FoldUnfold).build(context.kernel),
  )
  context.kernel.dispose(solid.shape)
  solid.shape = shape
  solid.featureId = context.feature.id
}

/** The material settings a base flange feature carries. */
export function readParameters(params: FeatureParameters): SheetMetalParameters {
  return guard(
    () =>
      new SheetMetalParameters({
        material: readString(params, 'material', 'Steel'),
        thickness: readNumber(params, 'thickness', 1),
        innerRadius: readNumber(params, 'innerRadius', 1),
        kFactor: readNumber(params, 'kFactor', 0.33),
        bendMethod: readChoice(params, 'bendMethod', BEND_METHODS, 'k-factor'),
        reliefType: readChoice(params, 'reliefType', RELIEF_TYPES, 'rectangular'),
        ...optionalNumber(params, 'bendAllowance'),
        ...optionalNumber(params, 'bendDeduction'),
        ...optionalNumber(params, 'reliefWidth'),
        ...optionalNumber(params, 'reliefDepth'),
      }),
  )
}

/** A radius of zero or less means "use whatever the part is set to". */
function optionalRadius(params: FeatureParameters): number | null {
  const radius = readNumber(params, 'radius', 0)
  return radius > 0 ? radius : null
}

function optionalNumber(params: FeatureParameters, key: string): Record<string, number> {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? { [key]: value } : {}
}

function readNumberArray(params: FeatureParameters, key: string): number[] {
  const value = params[key]
  if (!Array.isArray(value)) return []
  return (value as readonly ParameterValue[])
    .map((entry) => (typeof entry === 'number' ? entry : Number(entry)))
    .filter((entry) => Number.isFinite(entry))
}

/** Sheet metal errors are feature errors as far as the tree is concerned. */
function guard<T>(work: () => T): T {
  try {
    return work()
  } catch (cause) {
    if (cause instanceof SheetMetalError) throw new FeatureError(cause.message)
    throw cause
  }
}

async function guardAsync<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (cause) {
    if (cause instanceof SheetMetalError) throw new FeatureError(cause.message)
    throw cause
  }
}
