export type {
  Curve3,
  ExtendMode,
  SurfaceBody,
  SurfaceNaming,
  SurfacePlane,
  SurfaceSweepOrientation,
  ThickenSide,
  TrimKeep,
} from './types'
export {
  EXTEND_MODES,
  SURFACE_SWEEP_ORIENTATIONS,
  SURFACE_TOLERANCE,
  SurfaceError,
  THICKEN_SIDES,
  TRIM_KEEPS,
} from './types'

export {
  createSurfaceBody,
  openBoundaryCount,
  resetSurfaceIds,
  surfaceBodyArea,
  withMesh,
} from './SurfaceBody'
export type { SurfaceBodyOptions } from './SurfaceBody'

export * from './geometry'

export {
  CURVE_JOIN_TOLERANCE,
  boundarySurface,
  chainCurves,
  extrudeSurface,
  loftSurface,
  offsetSurface,
  patchSurface,
  revolveSurface,
  ruledSurface,
  sweepSurface,
} from './SurfaceCreation'
export type {
  BoundarySurfaceParams,
  ExtrudeSurfaceParams,
  LoftSurfaceParams,
  PatchSurfaceParams,
  RevolveSurfaceParams,
  RuledSurfaceParams,
  SweepSurfaceParams,
} from './SurfaceCreation'

export {
  clipMeshByPlane,
  cuttingPlane,
  extendSurface,
  knitSurfaces,
  splitSurface,
  trimSurface,
  untrimSurface,
} from './SurfaceEditing'
export type {
  ClippedMesh,
  ExtendSurfaceParams,
  KnitParams,
  TrimBoundary,
  TrimParams,
} from './SurfaceEditing'

export { stitchSurfaces, thickenSurface } from './SurfaceToSolid'
export type { SolidFromSurface, StitchParams, ThickenParams } from './SurfaceToSolid'

export {
  boundarySurfaceOperation,
  extendSurfaceOperation,
  extrudeSurfaceOperation,
  knitSurfaceOperation,
  loftSurfaceOperation,
  offsetSurfaceOperation,
  patchSurfaceOperation,
  revolveSurfaceOperation,
  ruledSurfaceOperation,
  sketchCurve,
  splitSurfaceOperation,
  stitchSurfaceOperation,
  surfaceTargets,
  sweepSurfaceOperation,
  thickenSurfaceOperation,
  trimSurfaceOperation,
  untrimSurfaceOperation,
} from './SurfaceFeature'
