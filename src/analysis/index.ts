export type {
  AngleMeasurement,
  BodyTarget,
  DistanceMeasurement,
  EdgeTarget,
  FaceTarget,
  MeasureTarget,
  PointTarget,
  Triangle,
} from './types'
export { bodyTarget, edgeTarget, faceTarget, pointTarget } from './types'

export {
  boundsGap,
  closestPointOnSegment,
  closestPointOnTriangle,
  closestPointsOnSegments,
  meshTriangles,
  pointTriangleDistance,
  segmentTriangleDistance,
  segmentTriangleIntersection,
  triangleArea,
  triangleBounds,
  triangleNormal,
  triangleTriangleDistance,
} from './primitives'
export type { Bounds, ClosestPair } from './primitives'

export { areParallel, measureDistance, measurePointDistance } from './MeasureDistance'

export {
  canMeasureAngle,
  edgeDirection,
  measureAngle,
  measureDirectionAngle,
  measureEdgeAngle,
  measureEdgeFaceAngle,
  measureFaceAngle,
  measureVertexAngle,
} from './MeasureAngle'

export { measureEdgeLength, measureLength, measurePolylineLength } from './MeasureLength'
export type { LengthMeasurement } from './MeasureLength'

export {
  measureArea,
  measureSurfaceArea,
  measureTriangleArea,
  measureTriangleSetArea,
} from './MeasureArea'
export type { AreaMeasurement } from './MeasureArea'

export {
  isOutwardWound,
  measureBoundingVolume,
  measureVolume,
  signedTetrahedronVolume6,
  signedVolume,
  tetrahedronVolume,
} from './MeasureVolume'

export {
  DEFAULT_DENSITY,
  addMatrix,
  massProperties,
  scaleMatrix,
  subtractMatrix,
  symmetricEigen,
} from './MassProperties'
export type { EigenDecomposition, MassProperties, MassPropertiesOptions, Matrix3 } from './MassProperties'

export {
  bodiesInterfere,
  minimumDistance,
  minimumDistanceBetweenTriangles,
} from './MinimumDistance'
export type { MinimumDistanceResult } from './MinimumDistance'

export * from './advanced'
