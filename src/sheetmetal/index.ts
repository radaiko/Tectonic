export { SheetMetalParameters } from './SheetMetalParameters'
export type {
  SheetMetalParametersInit,
  SheetMetalParametersJSON,
} from './SheetMetalParameters'
export { SheetMetalPart, buildEdgeFeature, edgeFeatureChain, edgeFeatureDevelopment, rebuildFeature } from './SheetMetalPart'
export type { EdgeFeatureSpec, SheetMetalPartInit, SheetMetalPartJSON } from './SheetMetalPart'

export {
  BASE_PROFILE_KINDS,
  baseFlangeEdges,
  baseFlangeFrame,
  baseFlangeFromSketch,
  buildBaseFlange,
  contourChain,
  createBaseFlange,
  validateBaseFlange,
} from './BaseFlange'
export type { BaseFlangeInit, BaseFlangeSpec } from './BaseFlange'

export { DEFAULT_FLANGE_ANGLE, createEdgeFlange, edgeFlangeChain, flangeRadius, validateEdgeFlange } from './EdgeFlange'
export type { EdgeFlangeInit, EdgeFlangeSpec } from './EdgeFlange'
export { createHem, hemChain, hemOpening, validateHem } from './Hem'
export type { HemInit, HemSpec } from './Hem'
export { createJog, jogChain, validateJog } from './Jog'
export type { JogInit, JogSpec } from './Jog'
export { cornerTrim, createMiterFlange, expandMiterFlange } from './MiterFlange'
export type { MiterFlangeInit, MiterFlangeSpec } from './MiterFlange'

export { FoldUnfold } from './FoldUnfold'
export type { FlatCut } from './FoldUnfold'
export {
  DXF_LAYERS,
  boundsOf,
  flatPattern,
  flatPatternToDXF,
  flatPatternToSVG,
} from './FlatPattern'
export type {
  BendDirection,
  FlatBendLine,
  FlatBendZone,
  FlatBounds,
  FlatPattern,
  FlatRelief,
  SvgOptions,
} from './FlatPattern'

export { chainFlatLength, chainProfile, chainTip, developChain, signedArea } from './bend'
export type { BendChain, BendZone, ChainDevelopment, ChainOptions } from './bend'
export { edgeFrame, loopEdges, normalizeLoop, planeDirection, requireEdge, segmentLengths, turnAngles } from './geometry'

export {
  BEND_METHODS,
  EDGE_FEATURE_KINDS,
  HEM_TYPES,
  LENGTH_MODES,
  RELIEF_TYPES,
  SheetMetalError,
} from './types'
export type {
  BendMethod,
  BendStep,
  EdgeFeatureBase,
  EdgeFeatureKind,
  HemType,
  LengthMode,
  ReliefType,
  SheetEdge,
} from './types'

export { SheetMetalEditor, buildSheetMetalPart, contourPoints, createFlangeRow } from './SheetMetalEditor'
export type { ExportedFile, FlangeRow, SheetMetalEditorProps, SheetMetalPartInput } from './SheetMetalEditor'
