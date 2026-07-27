export {
  DEFAULT_CREASE_ANGLE,
  DEFAULT_WELD_TOLERANCE,
  faceMesh,
  meshFaces,
  weldIndices,
} from './faceGroups'
export type { FaceGroupOptions, MeshFace } from './faceGroups'

export {
  DEFAULT_ANGLE_TOLERANCE,
  DEFAULT_AREA_TOLERANCE,
  DEFAULT_MATCH_ANGLE,
  DEFAULT_MATCH_FRACTION,
  DEFAULT_SEPARATION,
  DEFAULT_TOLERANCE_FRACTION,
  DIFF_COLORS,
  DIFF_OPACITY,
  DIFF_VIEW_MODES,
  FACE_CHANGES,
  compareBodies,
  describeDiff,
  diffLayers,
  diffScale,
  percentChange,
  placedMesh,
  resolveTolerances,
  sideBySideOffsets,
} from './VisualDiff'
export type {
  DiffDisplayOptions,
  DiffLayer,
  DiffSummary,
  DiffViewMode,
  FaceChange,
  FaceDiff,
  ResolvedTolerances,
  VisualDiffOptions,
  VisualDiffResult,
} from './VisualDiff'
