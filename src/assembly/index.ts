export { AssemblyComponent, AssemblyTree } from './AssemblyTree'
export type {
  AssemblyTreeInit,
  AssemblyTreeJSON,
  ComponentInit,
  ComponentJSON,
} from './AssemblyTree'
export { AssemblyError, COMPONENT_KINDS } from './types'
export type { ComponentKind } from './types'

export {
  IDENTITY_ROTATION,
  IDENTITY_TRANSFORM,
  ORIGIN,
  applyTransform,
  axisAngleOf,
  composeTransforms,
  conjugateQuaternion,
  createTransform,
  interpolateTransforms,
  invertTransform,
  matrixToQuaternion,
  mirrorPoint,
  mirrorTransform,
  multiplyMatrices,
  multiplyQuaternions,
  normalizeQuaternion,
  quaternionFromAxisAngle,
  quaternionToMatrix,
  rotateVector,
  rotationAbout,
  slerp,
  transformDirection,
  transformFromJSON,
  transformToJSON,
  transformsEqual,
  translation,
} from './Transform'
export type {
  ComponentTransform,
  ComponentTransformInit,
  Matrix3,
  Quaternion,
} from './Transform'

export {
  DEFAULT_MATE_PARAMETERS,
  FULL_DEGREES_OF_FREEDOM,
  JOINT_TYPES,
  MATE_KINDS,
  MATE_TYPES,
  Mate,
  clampToLimits,
  createMateParameters,
  defaultMateName,
  degreesOfFreedomOf,
  degreesRemovedBy,
  isJointType,
  isMateType,
} from './Mate'
export type {
  JointType,
  MateInit,
  MateJSON,
  MateKind,
  MateLimits,
  MateParameters,
  MateParametersInit,
  MateType,
} from './Mate'

export { DEFAULT_ENTITY_FRAME, MateSolver, SOLVE_TOLERANCE, entityFrameLookup, frameTransform } from './MateSolver'
export type {
  EntityFrame,
  EntityFrameResolver,
  MateSolution,
  MateSolverOptions,
  MateStatus,
  OverConstrainedComponent,
  UnsolvedComponent,
} from './MateSolver'

export {
  ExplodedView,
  billOfMaterials,
  bomMass,
  circularPattern,
  componentBounds,
  componentCenter,
  detectCollisions,
  detectInterference,
  duplicateComponent,
  mirrorComponents,
  rectangularPattern,
  replaceComponent,
} from './AssemblyFeatures'
export type {
  BomEntry,
  CircularPatternOptions,
  CollisionHit,
  ExplodedViewJSON,
  InterferenceOptions,
  InterferencePair,
  MirrorComponentsOptions,
  PartCatalog,
  PartDefinition,
  RectangularPatternOptions,
  ReplaceComponentOptions,
  ReplaceComponentResult,
} from './AssemblyFeatures'

export {
  EMPTY_BOX,
  boundsOfMesh,
  boundsOfPoints,
  boxCenter,
  boxCorners,
  boxVolume,
  boxesOverlap,
  intersectBoxes,
  transformBounds,
  transformMesh,
  unionBoxes,
} from './geometry'

export { AssemblyEditor } from './AssemblyEditor'
export type { AssemblyEditorProps } from './AssemblyEditor'
