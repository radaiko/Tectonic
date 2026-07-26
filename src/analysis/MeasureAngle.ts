import type { Vec3 } from '../domain/vec3'
import { angleBetween, normalize, subtract } from '../domain/vec3'
import type { AngleMeasurement, EdgeTarget, FaceTarget, MeasureTarget } from './types'

const RIGHT_ANGLE_TOLERANCE = 1e-6

function measurement(radians: number): AngleMeasurement {
  const degrees = (radians * 180) / Math.PI
  return {
    radians,
    degrees,
    supplementDegrees: 180 - degrees,
    parallel: radians <= RIGHT_ANGLE_TOLERANCE || Math.abs(radians - Math.PI) <= RIGHT_ANGLE_TOLERANCE,
    perpendicular: Math.abs(radians - Math.PI / 2) <= RIGHT_ANGLE_TOLERANCE,
  }
}

/** Angle between two directions, reported in [0°, 180°]. */
export function measureDirectionAngle(first: Vec3, second: Vec3): AngleMeasurement {
  return measurement(angleBetween(first, second))
}

export function edgeDirection(edge: EdgeTarget): Vec3 {
  return normalize(subtract(edge.end, edge.start))
}

/**
 * Angle between two edges, taken between the directions they run in. An edge
 * drawn the other way round would otherwise read as its supplement.
 */
export function measureEdgeAngle(first: EdgeTarget, second: EdgeTarget): AngleMeasurement {
  return measureDirectionAngle(edgeDirection(first), edgeDirection(second))
}

/**
 * Angle between two faces — the dihedral angle, measured between their normals.
 * Two coplanar faces read as 0°, two facing each other as 180°.
 */
export function measureFaceAngle(first: FaceTarget, second: FaceTarget): AngleMeasurement {
  return measureDirectionAngle(normalize(first.normal), normalize(second.normal))
}

/**
 * Angle between an edge and a face: the complement of the angle to the normal,
 * so an edge lying in the face reads as 0°.
 */
export function measureEdgeFaceAngle(edge: EdgeTarget, face: FaceTarget): AngleMeasurement {
  const toNormal = angleBetween(edgeDirection(edge), normalize(face.normal))
  return measurement(Math.abs(Math.PI / 2 - toNormal))
}

/**
 * Angle between any two selections that have a direction. Points and bodies have
 * none, so those combinations come back as zero rather than throwing — the panel
 * shows the measurement as unavailable.
 */
export function measureAngle(first: MeasureTarget, second: MeasureTarget): AngleMeasurement {
  if (first.kind === 'edge' && second.kind === 'edge') return measureEdgeAngle(first, second)
  if (first.kind === 'face' && second.kind === 'face') return measureFaceAngle(first, second)
  if (first.kind === 'edge' && second.kind === 'face') return measureEdgeFaceAngle(first, second)
  if (first.kind === 'face' && second.kind === 'edge') return measureEdgeFaceAngle(second, first)
  return measurement(0)
}

/** Whether a pair of selections can be measured for angle at all. */
export function canMeasureAngle(first: MeasureTarget, second: MeasureTarget): boolean {
  const measurable = (target: MeasureTarget): boolean =>
    target.kind === 'edge' || target.kind === 'face'
  return measurable(first) && measurable(second)
}

/** Angle at `vertex` between the rays out to `first` and `second`. */
export function measureVertexAngle(vertex: Vec3, first: Vec3, second: Vec3): AngleMeasurement {
  return measureDirectionAngle(subtract(first, vertex), subtract(second, vertex))
}
