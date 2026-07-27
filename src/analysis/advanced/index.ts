export {
  ANALYSIS_COLORS,
  AnalysisError,
  bandFor,
  bandHistogram,
  bandIndexFor,
  clamp01,
  colorFor,
  mixColor,
  normalize01,
  parseHex,
  rampColor,
  statisticsOf,
  toHex,
} from './types'
export type { AnalysisBand, AnalysisColor, ColorScale, Rgb, Statistics } from './types'

export {
  DEFAULT_COMB_SCALE,
  DEFAULT_FLAT_CURVATURE,
  DEFAULT_TIGHT_RADIUS,
  classifyCurvature,
  curvatureColor,
  curvatureComb,
  curvatureScale,
  mengerCurvature,
  resamplePolyline,
  totalTurning,
  turnAxis,
} from './CurvatureComb'
export type {
  CombTooth,
  CurvatureBandId,
  CurvatureCombOptions,
  CurvatureCombResult,
  CurvatureSample,
} from './CurvatureComb'

export {
  DEFAULT_CURVATURE_TOLERANCE,
  DEFAULT_TANGENT_TOLERANCE,
  DEFAULT_ZEBRA_DENSITY,
  advanceStripes,
  detectDiscontinuities,
  groupDiscontinuities,
  stripeAxis,
  vertexNormals,
  zebraShading,
  zebraStripe,
} from './ZebraStripes'
export type {
  ContinuityDefect,
  Discontinuity,
  ZebraOptions,
  ZebraResult,
  ZebraSample,
} from './ZebraStripes'

export {
  DEFAULT_MINIMUM_DRAFT,
  DEFAULT_PERPENDICULAR_TOLERANCE,
  DEFAULT_SAFE_DRAFT,
  bestPullDirection,
  classifyDraft,
  draftAngleOf,
  draftColor,
  draftHeatMap,
  draftScale,
  isUndercut,
} from './DraftHeatMap'
export type { DraftBandId, DraftFace, DraftHeatMap, DraftOptions } from './DraftHeatMap'

export {
  DEFAULT_MIN_HIT_DISTANCE,
  DEFAULT_TARGET_THICKNESS,
  DEFAULT_THICKNESS_TOLERANCE,
  UNMEASURED_COLOR,
  classifyThickness,
  rayTriangleDistance,
  thicknessColor,
  thicknessRamp,
  thicknessScale,
  wallThicknessAt,
  wallThicknessMap,
} from './WallThicknessMap'
export type {
  ThicknessBandId,
  ThicknessSample,
  WallThicknessMap as WallThicknessMapResult,
  WallThicknessOptions,
} from './WallThicknessMap'

export {
  DEFAULT_SHARP_ANGLE,
  DEFAULT_STRAIGHT_TOLERANCE,
  describeRadiusReport,
  edgeRadius,
  minimumRadiusOfEdges,
  minimumRadiusOfMesh,
  minimumRadiusOfPolyline,
  radiusReport,
} from './MinimumRadius'
export type { MinimumRadiusOptions, RadiusReport, RadiusSample } from './MinimumRadius'

export {
  ADVANCED_ANALYSES,
  ANALYSIS_HINTS,
  ANALYSIS_LABELS,
  AnalysisOverlay,
  AnalysisPanel,
  ColorScaleLegend,
  formatRange,
  overlayLines,
} from './AnalysisUI'
export type {
  AdvancedAnalysis,
  AnalysisOverlayProps,
  AnalysisPanelProps,
  AnalysisResults,
  ColorScaleLegendProps,
  OverlayLine,
} from './AnalysisUI'
