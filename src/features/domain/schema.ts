import { FeatureType } from './FeatureType'
import type { FeatureParameters } from './parameters'

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

/** One editable parameter, as the properties panel renders it. */
export interface ParameterField {
  readonly key: string
  readonly label: string
  readonly kind: 'number' | 'text' | 'boolean' | 'choice'
  readonly options?: readonly string[]
  readonly unit?: 'mm' | 'deg'
  readonly step?: number
  readonly min?: number
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
    { key: 'edgeIds', label: 'Edges', kind: 'text' },
  ],
  [FeatureType.Chamfer]: [
    num('distance', 'Distance', { unit: 'mm', min: 0, step: 0.5 }),
    choice('method', 'Method', CHAMFER_METHODS),
    num('secondDistance', 'Second distance', { unit: 'mm', min: 0, step: 0.5 }),
    num('angle', 'Angle', { unit: 'deg', step: 1 }),
    { key: 'edgeIds', label: 'Edges', kind: 'text' },
  ],
  [FeatureType.Shell]: [
    num('thickness', 'Thickness', { unit: 'mm', min: 0, step: 0.5 }),
    { key: 'faceIds', label: 'Faces to remove', kind: 'text' },
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
    { key: 'faceIds', label: 'Faces', kind: 'text' },
  ],
  [FeatureType.Pattern]: [
    choice('patternType', 'Type', PATTERN_TYPES),
    num('count1', 'Count', { min: 1, step: 1 }),
    num('spacing1', 'Spacing', { unit: 'mm', step: 1 }),
    num('count2', 'Second count', { min: 1, step: 1 }),
    num('spacing2', 'Second spacing', { unit: 'mm', step: 1 }),
    num('totalAngle', 'Total angle', { unit: 'deg', step: 5 }),
  ],
  [FeatureType.Mirror]: [choice('plane', 'Mirror plane', MIRROR_PLANES)],
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
  ],
  [FeatureType.Split]: [
    choice('keep', 'Keep', SPLIT_KEEPS),
    num('offset', 'Plane offset', { unit: 'mm', step: 1 }),
    choice('plane', 'Split plane', MIRROR_PLANES),
  ],
  [FeatureType.DirectEdit]: [
    choice('editType', 'Edit', DIRECT_EDITS),
    num('distance', 'Distance', { unit: 'mm', step: 1 }),
    { key: 'faceIds', label: 'Faces', kind: 'text' },
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
}

/** The parameter set a freshly created feature of this kind starts with. */
export function defaultParameters(type: FeatureType): FeatureParameters {
  return { ...DEFAULTS[type] }
}
