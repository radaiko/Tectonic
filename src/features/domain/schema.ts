import type { SelectionKind } from '../../view/selection'
import { FeatureType } from './FeatureType'
import { cloneParameters, type FeatureParameters } from './parameters'
import {
  BASE_PROFILE_KINDS,
  BEND_METHODS,
  HEM_TYPES,
  LENGTH_MODES,
  RELIEF_TYPES,
} from '../../sheetmetal/types'
import {
  EXTEND_MODES,
  SURFACE_SWEEP_ORIENTATIONS,
  THICKEN_SIDES,
  TRIM_KEEPS,
} from '../../surface/types'

/** What a surface trim or split cuts against — see `surface/SurfaceEditing`. */
export const TRIM_BOUNDARY_KINDS = ['plane', 'curve', 'surface'] as const
export type TrimBoundaryKind = (typeof TRIM_BOUNDARY_KINDS)[number]

/** How a solid feature combines with what is already modelled. */
export const BOOLEAN_OPERATIONS = ['new-body', 'join', 'cut', 'intersect'] as const
export type BooleanOperation = (typeof BOOLEAN_OPERATIONS)[number]

/** Where an extrusion stops. Everything but `blind` resolves against geometry. */
export const END_CONDITIONS = [
  'blind',
  'through-all',
  'up-to-face',
  'up-to-surface',
  'up-to-body',
  'offset-from-face',
] as const
export type EndCondition = (typeof END_CONDITIONS)[number]

export const EXTRUDE_SIDES = ['one-sided', 'symmetric', 'two-sided'] as const
export const SWEEP_ORIENTATIONS = ['follow-path', 'perpendicular'] as const
export const LOFT_CONDITIONS = ['normal', 'tangent', 'curvature'] as const
export const CHAMFER_METHODS = ['distance-distance', 'distance-angle'] as const
export const HOLE_KINDS = ['simple', 'countersink', 'counterbore'] as const
export const PATTERN_TYPES = ['rectangular', 'circular'] as const
/** The base planes a feature can name — the same three a sketch can sit on. */
export const SKETCH_PLANES = ['XY', 'XZ', 'YZ'] as const
export const MIRROR_PLANES = SKETCH_PLANES
export const COMBINE_OPERATIONS = ['union', 'subtract', 'intersect'] as const
/** What a split does with the pieces the cutting plane produces. */
export const SPLIT_KEEPS = ['both', 'front', 'back'] as const
export const DIRECT_EDITS = ['move-face', 'offset-face', 'delete-face'] as const
export type DirectEditKind = (typeof DIRECT_EDITS)[number]

/**
 * One editable parameter, as the properties panel renders it.
 *
 * A `selection` field is filled from the viewport rather than typed. Everything
 * that names a piece of geometry is one: an edge id or a face id is something a
 * user points at, and asking them to type `face-3` was only ever a placeholder
 * for a picker that did not exist yet.
 */
export interface ParameterField {
  readonly key: string
  readonly label: string
  readonly kind: 'number' | 'text' | 'boolean' | 'choice' | 'selection'
  readonly options?: readonly string[]
  readonly unit?: 'mm' | 'deg'
  readonly step?: number
  readonly min?: number
  /** What a `selection` field accepts. */
  readonly select?: SelectionKind
  /** Whether a `selection` field holds a list or a single reference. */
  readonly multiple?: boolean
}

/**
 * A field filled by pointing at geometry.
 *
 * `multiple` defaults to true because almost every one of these is a list —
 * the edges to round, the faces to open — and the single-reference cases say so.
 */
function pick(
  key: string,
  label: string,
  select: SelectionKind,
  multiple = true,
): ParameterField {
  return { key, label, kind: 'selection', select, multiple }
}

function num(
  key: string,
  label: string,
  extra: Omit<ParameterField, 'key' | 'label' | 'kind'> = {},
): ParameterField {
  return { key, label, kind: 'number', ...extra }
}

function choice(key: string, label: string, options: readonly string[]): ParameterField {
  return { key, label, kind: 'choice', options }
}

function flag(key: string, label: string): ParameterField {
  return { key, label, kind: 'boolean' }
}

const BOOLEAN_FIELD = choice('operation', 'Operation', BOOLEAN_OPERATIONS)

const EXTRUDE_FIELDS: readonly ParameterField[] = [
  num('distance', 'Distance', { unit: 'mm', min: 0, step: 1 }),
  choice('endCondition', 'End condition', END_CONDITIONS),
  choice('side', 'Direction', EXTRUDE_SIDES),
  num('secondDistance', 'Second distance', { unit: 'mm', min: 0, step: 1 }),
  num('offset', 'Offset', { unit: 'mm', step: 1 }),
  num('draftAngle', 'Draft angle', { unit: 'deg', step: 1 }),
  flag('reverse', 'Reverse'),
  BOOLEAN_FIELD,
]

const REVOLVE_FIELDS: readonly ParameterField[] = [
  num('angle', 'Angle', { unit: 'deg', step: 5 }),
  flag('symmetric', 'Symmetric'),
  { key: 'axisEntityId', label: 'Axis line', kind: 'text' },
  BOOLEAN_FIELD,
]

const SWEEP_FIELDS: readonly ParameterField[] = [
  { key: 'pathSketchId', label: 'Path sketch', kind: 'text' },
  choice('orientation', 'Orientation', SWEEP_ORIENTATIONS),
  num('twistAngle', 'Twist', { unit: 'deg', step: 5 }),
  BOOLEAN_FIELD,
]

/** Trim and split ask the same question: what cuts, and which side survives. */
const TRIM_FIELDS: readonly ParameterField[] = [
  choice('boundaryKind', 'Cut with', TRIM_BOUNDARY_KINDS),
  choice('plane', 'Cutting plane', SKETCH_PLANES),
  num('offset', 'Plane offset', { unit: 'mm', step: 1 }),
  { key: 'curveSketchId', label: 'Trim curve sketch', kind: 'text' },
  { key: 'toolSurfaceBodyId', label: 'Trim surface', kind: 'text' },
  choice('keep', 'Keep', TRIM_KEEPS),
  { key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' },
]

const LOFT_FIELDS: readonly ParameterField[] = [
  { key: 'sectionSketchIds', label: 'Sections', kind: 'text' },
  { key: 'guideSketchIds', label: 'Guides', kind: 'text' },
  choice('startCondition', 'Start condition', LOFT_CONDITIONS),
  choice('endCondition', 'End condition', LOFT_CONDITIONS),
  flag('closed', 'Closed loop'),
  BOOLEAN_FIELD,
]

const FIELDS: Record<FeatureType, readonly ParameterField[]> = {
  [FeatureType.Extrude]: EXTRUDE_FIELDS,
  [FeatureType.CutExtrude]: EXTRUDE_FIELDS,
  [FeatureType.Revolve]: REVOLVE_FIELDS,
  [FeatureType.CutRevolve]: REVOLVE_FIELDS,
  [FeatureType.Sweep]: SWEEP_FIELDS,
  [FeatureType.CutSweep]: SWEEP_FIELDS,
  [FeatureType.Loft]: LOFT_FIELDS,
  [FeatureType.CutLoft]: LOFT_FIELDS,
  [FeatureType.Fillet]: [
    num('radius', 'Radius', { unit: 'mm', min: 0, step: 0.5 }),
    flag('variableRadius', 'Variable radius'),
    num('endRadius', 'End radius', { unit: 'mm', min: 0, step: 0.5 }),
    pick('edgeIds', 'Edges', 'edge'),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.Chamfer]: [
    num('distance', 'Distance', { unit: 'mm', min: 0, step: 0.5 }),
    choice('method', 'Method', CHAMFER_METHODS),
    num('secondDistance', 'Second distance', { unit: 'mm', min: 0, step: 0.5 }),
    num('angle', 'Angle', { unit: 'deg', step: 1 }),
    pick('edgeIds', 'Edges', 'edge'),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.Shell]: [
    num('thickness', 'Thickness', { unit: 'mm', min: 0, step: 0.5 }),
    pick('faceIds', 'Faces to remove', 'face'),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.Hole]: [
    num('diameter', 'Diameter', { unit: 'mm', min: 0, step: 0.5 }),
    num('depth', 'Depth', { unit: 'mm', min: 0, step: 1 }),
    choice('holeType', 'Type', HOLE_KINDS),
    num('headDiameter', 'Head diameter', { unit: 'mm', min: 0, step: 0.5 }),
    num('headDepth', 'Head depth', { unit: 'mm', min: 0, step: 0.5 }),
    flag('throughAll', 'Through all'),
    { key: 'threadSpec', label: 'Thread', kind: 'text' },
  ],
  [FeatureType.Rib]: [
    num('thickness', 'Thickness', { unit: 'mm', min: 0, step: 0.5 }),
    num('draftAngle', 'Draft angle', { unit: 'deg', step: 1 }),
  ],
  [FeatureType.Draft]: [
    num('angle', 'Angle', { unit: 'deg', step: 1 }),
    num('neutralOffset', 'Neutral offset', { unit: 'mm', step: 1 }),
    pick('faceIds', 'Faces', 'face'),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.Pattern]: [
    choice('patternType', 'Type', PATTERN_TYPES),
    num('count1', 'Count', { min: 1, step: 1 }),
    num('spacing1', 'Spacing', { unit: 'mm', step: 1 }),
    num('count2', 'Second count', { min: 1, step: 1 }),
    num('spacing2', 'Second spacing', { unit: 'mm', step: 1 }),
    num('totalAngle', 'Total angle', { unit: 'deg', step: 5 }),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.Mirror]: [choice('plane', 'Mirror plane', MIRROR_PLANES), pick('bodyIds', 'Bodies', 'body'),],
  [FeatureType.Scale]: [
    flag('uniform', 'Uniform'),
    num('factor', 'Factor', { min: 0, step: 0.1 }),
    num('factorX', 'X factor', { min: 0, step: 0.1 }),
    num('factorY', 'Y factor', { min: 0, step: 0.1 }),
    num('factorZ', 'Z factor', { min: 0, step: 0.1 }),
  ],
  [FeatureType.Combine]: [
    choice('operation', 'Operation', COMBINE_OPERATIONS),
    flag('keepTools', 'Keep tools'),
    pick('bodyIds', 'Bodies', 'body'),
    pick('targetBodyId', 'Target body', 'body', false),
  ],
  [FeatureType.Split]: [
    choice('keep', 'Keep', SPLIT_KEEPS),
    num('offset', 'Plane offset', { unit: 'mm', step: 1 }),
    choice('plane', 'Split plane', MIRROR_PLANES),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.DirectEdit]: [
    choice('editType', 'Edit', DIRECT_EDITS),
    num('distance', 'Distance', { unit: 'mm', step: 1 }),
    pick('faceIds', 'Faces', 'face'),
    pick('bodyIds', 'Bodies', 'body'),
  ],
  [FeatureType.BaseFlange]: [
    { key: 'material', label: 'Material', kind: 'text' },
    num('thickness', 'Thickness', { unit: 'mm', min: 0, step: 0.5 }),
    num('innerRadius', 'Inner radius', { unit: 'mm', min: 0, step: 0.5 }),
    num('kFactor', 'K-factor', { min: 0, step: 0.01 }),
    choice('bendMethod', 'Bend method', BEND_METHODS),
    num('bendAllowance', 'Bend allowance', { unit: 'mm', min: 0, step: 0.1 }),
    num('bendDeduction', 'Bend deduction', { unit: 'mm', min: 0, step: 0.1 }),
    choice('reliefType', 'Relief', RELIEF_TYPES),
    choice('profileKind', 'Profile', BASE_PROFILE_KINDS),
    num('width', 'Width', { unit: 'mm', min: 0, step: 1 }),
  ],
  [FeatureType.EdgeFlange]: [
    num('edgeIndex', 'Edge', { min: 0, step: 1 }),
    num('length', 'Length', { unit: 'mm', min: 0, step: 1 }),
    num('angle', 'Angle', { unit: 'deg', step: 5 }),
    num('radius', 'Radius override', { unit: 'mm', min: 0, step: 0.5 }),
    choice('lengthMode', 'Measured', LENGTH_MODES),
    flag('flip', 'Flip direction'),
    flag('miteredCorners', 'Mitred corners'),
    choice('relief', 'Relief', RELIEF_TYPES),
  ],
  [FeatureType.MiterFlange]: [
    { key: 'edgeIndices', label: 'Edges', kind: 'text' },
    num('length', 'Length', { unit: 'mm', min: 0, step: 1 }),
    num('angle', 'Angle', { unit: 'deg', step: 5 }),
    num('radius', 'Radius override', { unit: 'mm', min: 0, step: 0.5 }),
    num('gap', 'Mitre gap', { unit: 'mm', min: 0, step: 0.1 }),
    choice('lengthMode', 'Measured', LENGTH_MODES),
    flag('flip', 'Flip direction'),
    choice('relief', 'Relief', RELIEF_TYPES),
  ],
  [FeatureType.Hem]: [
    num('edgeIndex', 'Edge', { min: 0, step: 1 }),
    choice('hemType', 'Type', HEM_TYPES),
    num('length', 'Length', { unit: 'mm', min: 0, step: 1 }),
    num('gap', 'Gap', { unit: 'mm', min: 0, step: 0.1 }),
    num('radius', 'Radius override', { unit: 'mm', min: 0, step: 0.5 }),
    num('angle', 'Wrap angle', { unit: 'deg', step: 5 }),
    flag('flip', 'Flip direction'),
  ],
  [FeatureType.Jog]: [
    num('edgeIndex', 'Edge', { min: 0, step: 1 }),
    num('offset', 'Offset', { unit: 'mm', min: 0, step: 1 }),
    num('angle', 'Angle', { unit: 'deg', step: 5 }),
    num('length', 'Run', { unit: 'mm', min: 0, step: 1 }),
    num('radius', 'Radius override', { unit: 'mm', min: 0, step: 0.5 }),
    flag('flip', 'Flip direction'),
  ],
  [FeatureType.Unfold]: [pick('targetBodyId', 'Body', 'body', false)],
  [FeatureType.Refold]: [pick('targetBodyId', 'Body', 'body', false)],
  [FeatureType.ExtrudeSurface]: [
    num('distance', 'Distance', { unit: 'mm', min: 0, step: 1 }),
    flag('symmetric', 'Symmetric'),
    flag('reverse', 'Reverse'),
    num('offset', 'Plane offset', { unit: 'mm', step: 1 }),
  ],
  [FeatureType.RevolveSurface]: [
    num('angle', 'Angle', { unit: 'deg', step: 5 }),
    flag('symmetric', 'Symmetric'),
    num('segments', 'Segments', { min: 3, step: 1 }),
  ],
  [FeatureType.SweepSurface]: [
    { key: 'pathSketchId', label: 'Path sketch', kind: 'text' },
    choice('orientation', 'Orientation', SURFACE_SWEEP_ORIENTATIONS),
    num('twistAngle', 'Twist', { unit: 'deg', step: 5 }),
  ],
  [FeatureType.LoftSurface]: [
    { key: 'sectionSketchIds', label: 'Sections', kind: 'text' },
    flag('closed', 'Closed loop'),
    num('samples', 'Samples', { min: 0, step: 1 }),
  ],
  [FeatureType.BoundarySurface]: [
    { key: 'curveSketchIds', label: 'Boundary curves', kind: 'text' },
    num('rows', 'Rows', { min: 2, step: 1 }),
    num('columns', 'Columns', { min: 2, step: 1 }),
  ],
  [FeatureType.RuledSurface]: [
    { key: 'curveSketchIds', label: 'Curves', kind: 'text' },
    num('samples', 'Samples', { min: 0, step: 1 }),
  ],
  [FeatureType.PatchSurface]: [
    { key: 'curveSketchIds', label: 'Boundary curves', kind: 'text' },
  ],
  [FeatureType.OffsetSurface]: [
    num('distance', 'Distance', { unit: 'mm', step: 0.5 }),
    { key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' },
  ],
  [FeatureType.ExtendSurface]: [
    choice('mode', 'Extend to', EXTEND_MODES),
    num('distance', 'Distance', { unit: 'mm', min: 0, step: 1 }),
    choice('plane', 'Limit plane', SKETCH_PLANES),
    num('offset', 'Plane offset', { unit: 'mm', step: 1 }),
    num('boundaryIndex', 'Boundary', { step: 1 }),
    { key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' },
  ],
  [FeatureType.TrimSurface]: TRIM_FIELDS,
  [FeatureType.UntrimSurface]: [{ key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' }],
  [FeatureType.KnitSurface]: [
    num('tolerance', 'Tolerance', { unit: 'mm', min: 0, step: 0.01 }),
    { key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' },
  ],
  [FeatureType.SplitSurface]: TRIM_FIELDS,
  [FeatureType.ThickenSurface]: [
    num('thickness', 'Thickness', { unit: 'mm', min: 0, step: 0.5 }),
    choice('side', 'Direction', THICKEN_SIDES),
    { key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' },
  ],
  [FeatureType.StitchSurface]: [
    num('tolerance', 'Tolerance', { unit: 'mm', min: 0, step: 0.01 }),
    flag('requireClosed', 'Must be watertight'),
    { key: 'surfaceBodyIds', label: 'Surfaces', kind: 'text' },
  ],
}

/** The editable parameters of a feature kind, in display order. */
export function parameterFields(type: FeatureType): readonly ParameterField[] {
  return FIELDS[type]
}

const SOLID_DEFAULTS = {
  operation: 'new-body' as const,
  targetBodyId: '',
}

const EXTRUDE_DEFAULTS: FeatureParameters = {
  ...SOLID_DEFAULTS,
  distance: 25,
  endCondition: 'blind',
  side: 'one-sided',
  secondDistance: 0,
  offset: 0,
  draftAngle: 0,
  reverse: false,
  upToBodyId: '',
  profileEntityIds: [],
}

const REVOLVE_DEFAULTS: FeatureParameters = {
  ...SOLID_DEFAULTS,
  angle: 360,
  symmetric: false,
  axisEntityId: '',
  axisOrigin: { x: 0, y: 0 },
  axisDirection: { x: 0, y: 1 },
  profileEntityIds: [],
}

const SWEEP_DEFAULTS: FeatureParameters = {
  ...SOLID_DEFAULTS,
  pathSketchId: '',
  orientation: 'follow-path',
  twistAngle: 0,
  profileEntityIds: [],
}

const LOFT_DEFAULTS: FeatureParameters = {
  ...SOLID_DEFAULTS,
  sectionSketchIds: [],
  guideSketchIds: [],
  startCondition: 'normal',
  endCondition: 'normal',
  closed: false,
}

const TRIM_DEFAULTS: FeatureParameters = {
  boundaryKind: 'plane',
  plane: 'XY',
  offset: 0,
  curveSketchId: '',
  toolSurfaceBodyId: '',
  keep: 'front',
  surfaceBodyIds: [],
}

const DEFAULTS: Record<FeatureType, FeatureParameters> = {
  [FeatureType.Extrude]: EXTRUDE_DEFAULTS,
  [FeatureType.CutExtrude]: { ...EXTRUDE_DEFAULTS, operation: 'cut' },
  [FeatureType.Revolve]: REVOLVE_DEFAULTS,
  [FeatureType.CutRevolve]: { ...REVOLVE_DEFAULTS, operation: 'cut' },
  [FeatureType.Sweep]: SWEEP_DEFAULTS,
  [FeatureType.CutSweep]: { ...SWEEP_DEFAULTS, operation: 'cut' },
  [FeatureType.Loft]: LOFT_DEFAULTS,
  [FeatureType.CutLoft]: { ...LOFT_DEFAULTS, operation: 'cut' },
  [FeatureType.Fillet]: {
    radius: 3,
    variableRadius: false,
    endRadius: 3,
    edgeIds: [],
    bodyIds: [],
  },
  [FeatureType.Chamfer]: {
    distance: 2,
    method: 'distance-distance',
    secondDistance: 2,
    angle: 45,
    edgeIds: [],
    bodyIds: [],
  },
  [FeatureType.Shell]: { thickness: 2, faceIds: [], bodyIds: [] },
  [FeatureType.Hole]: {
    diameter: 6,
    depth: 10,
    holeType: 'simple',
    headDiameter: 12,
    headDepth: 3,
    threadSpec: '',
    throughAll: false,
    direction: { x: 0, y: 0, z: -1 },
    bodyIds: [],
  },
  [FeatureType.Rib]: { thickness: 3, draftAngle: 0, targetBodyId: '' },
  [FeatureType.Draft]: {
    angle: 3,
    neutralOffset: 0,
    pullDirection: { x: 0, y: 0, z: 1 },
    faceIds: [],
    bodyIds: [],
  },
  [FeatureType.Pattern]: {
    patternType: 'rectangular',
    count1: 3,
    spacing1: 20,
    direction1: { x: 1, y: 0, z: 0 },
    count2: 1,
    spacing2: 20,
    direction2: { x: 0, y: 1, z: 0 },
    axisOrigin: { x: 0, y: 0, z: 0 },
    axisDirection: { x: 0, y: 0, z: 1 },
    totalAngle: 360,
    sourceFeatureIds: [],
    bodyIds: [],
  },
  [FeatureType.Mirror]: { plane: 'YZ', sourceFeatureIds: [], bodyIds: [], merge: true },
  [FeatureType.Scale]: {
    uniform: true,
    factor: 1.5,
    factorX: 1.5,
    factorY: 1.5,
    factorZ: 1.5,
    bodyIds: [],
  },
  [FeatureType.Combine]: {
    operation: 'union',
    targetBodyId: '',
    toolBodyIds: [],
    keepTools: false,
  },
  [FeatureType.Split]: {
    plane: 'XY',
    offset: 0,
    keep: 'both',
    bodyIds: [],
  },
  [FeatureType.DirectEdit]: {
    editType: 'move-face',
    distance: 5,
    direction: { x: 0, y: 0, z: 1 },
    faceIds: [],
    bodyIds: [],
  },
  [FeatureType.BaseFlange]: {
    material: 'Steel',
    thickness: 1,
    innerRadius: 1,
    kFactor: 0.33,
    bendMethod: 'k-factor',
    bendAllowance: 0,
    bendDeduction: 0,
    reliefType: 'rectangular',
    reliefWidth: 0,
    reliefDepth: 0,
    profileKind: 'closed',
    width: 50,
    planeOffset: 0,
    profileEntityIds: [],
  },
  [FeatureType.EdgeFlange]: {
    edgeIndex: 0,
    length: 10,
    angle: 90,
    radius: 0,
    lengthMode: 'outside',
    flip: false,
    miteredCorners: false,
    relief: 'rectangular',
    targetBodyId: '',
  },
  [FeatureType.MiterFlange]: {
    edgeIndices: [],
    length: 10,
    angle: 90,
    radius: 0,
    gap: 0,
    lengthMode: 'outside',
    flip: false,
    relief: 'rectangular',
    targetBodyId: '',
  },
  [FeatureType.Hem]: {
    edgeIndex: 0,
    hemType: 'open',
    length: 5,
    gap: 1,
    radius: 0,
    angle: 180,
    flip: false,
    relief: 'rectangular',
    targetBodyId: '',
  },
  [FeatureType.Jog]: {
    edgeIndex: 0,
    offset: 5,
    angle: 90,
    length: 10,
    radius: 0,
    flip: false,
    relief: 'rectangular',
    targetBodyId: '',
  },
  [FeatureType.Unfold]: { targetBodyId: '' },
  [FeatureType.Refold]: { targetBodyId: '' },
  [FeatureType.ExtrudeSurface]: {
    distance: 25,
    symmetric: false,
    reverse: false,
    offset: 0,
    profileEntityIds: [],
  },
  [FeatureType.RevolveSurface]: {
    angle: 360,
    symmetric: false,
    segments: 0,
    axisOrigin: { x: 0, y: 0, z: 0 },
    axisDirection: { x: 0, y: 1, z: 0 },
    profileEntityIds: [],
  },
  [FeatureType.SweepSurface]: {
    pathSketchId: '',
    orientation: 'follow-path',
    twistAngle: 0,
    profileEntityIds: [],
  },
  [FeatureType.LoftSurface]: { sectionSketchIds: [], closed: false, samples: 0 },
  [FeatureType.BoundarySurface]: { curveSketchIds: [], rows: 0, columns: 0 },
  [FeatureType.RuledSurface]: { curveSketchIds: [], samples: 0 },
  [FeatureType.PatchSurface]: { curveSketchIds: [], profileEntityIds: [] },
  [FeatureType.OffsetSurface]: { distance: 5, surfaceBodyIds: [] },
  [FeatureType.ExtendSurface]: {
    mode: 'distance',
    distance: 10,
    plane: 'XY',
    offset: 0,
    boundaryIndex: -1,
    surfaceBodyIds: [],
  },
  [FeatureType.TrimSurface]: TRIM_DEFAULTS,
  [FeatureType.UntrimSurface]: { surfaceBodyIds: [] },
  [FeatureType.KnitSurface]: { tolerance: 0, surfaceBodyIds: [] },
  [FeatureType.SplitSurface]: TRIM_DEFAULTS,
  [FeatureType.ThickenSurface]: { thickness: 2, side: 'normal', surfaceBodyIds: [] },
  [FeatureType.StitchSurface]: { tolerance: 0, requireClosed: false, surfaceBodyIds: [] },
}

/**
 * The parameter set a freshly created feature of this kind starts with. Cloned
 * deeply: a shallow copy would hand out the very array the defaults hold, so a
 * caller pushing an id onto `surfaceBodyIds` would corrupt the defaults for
 * every later feature — and for every kind sharing them, as trim and split do.
 */
export function defaultParameters(type: FeatureType): FeatureParameters {
  return cloneParameters(DEFAULTS[type])
}
