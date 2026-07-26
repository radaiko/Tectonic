import type { Vec3 } from '../domain/vec3'
import {
  add,
  angleBetween,
  cross,
  dot,
  normalize,
  rotateAbout,
  scale,
  subtract,
  UNIT_Z,
} from '../domain/vec3'
import type { ProjectionMode, StandardView } from './types'

/**
 * The world is Z-up: sketches on XY extrude along +Z, and the XZ plane faces the
 * viewer in the front view. Every orientation below follows from that, so the
 * view cube and the standard-view menu agree with the modelling planes.
 *
 * `eye` is the unit direction *from the target towards the camera*, which is
 * what stays constant as the camera dollies in and out.
 */
export interface CameraOrientation {
  readonly eye: Vec3
  readonly up: Vec3
}

/** Where a camera sits and what it looks at, ready to hand to the renderer. */
export interface CameraPlacement {
  readonly position: Vec3
  readonly target: Vec3
  readonly up: Vec3
}

const DIAGONAL = 1 / Math.sqrt(3)

const ORIENTATIONS: Record<StandardView, CameraOrientation> = {
  front: { eye: { x: 0, y: -1, z: 0 }, up: UNIT_Z },
  back: { eye: { x: 0, y: 1, z: 0 }, up: UNIT_Z },
  right: { eye: { x: 1, y: 0, z: 0 }, up: UNIT_Z },
  left: { eye: { x: -1, y: 0, z: 0 }, up: UNIT_Z },
  // Looking straight down the Z axis: +Y reads as "up the screen" on the top
  // view and flips on the bottom one, matching every CAD package's convention.
  top: { eye: { x: 0, y: 0, z: 1 }, up: { x: 0, y: 1, z: 0 } },
  bottom: { eye: { x: 0, y: 0, z: -1 }, up: { x: 0, y: -1, z: 0 } },
  isometric: { eye: { x: DIAGONAL, y: -DIAGONAL, z: DIAGONAL }, up: UNIT_Z },
  dimetric: { eye: normalizeLiteral(1, -1, 0.6), up: UNIT_Z },
  trimetric: { eye: normalizeLiteral(1.2, -0.9, 0.5), up: UNIT_Z },
}

export const STANDARD_VIEWS: readonly StandardView[] = Object.keys(ORIENTATIONS) as StandardView[]

const LABELS: Record<StandardView, string> = {
  front: 'Front',
  back: 'Back',
  top: 'Top',
  bottom: 'Bottom',
  left: 'Left',
  right: 'Right',
  isometric: 'Isometric',
  dimetric: 'Dimetric',
  trimetric: 'Trimetric',
}

export function standardViewLabel(view: StandardView): string {
  return LABELS[view]
}

export function orientationFor(view: StandardView): CameraOrientation {
  return ORIENTATIONS[view]
}

/**
 * The standard view whose eye direction is closest to `eye`, so the UI can show
 * which named view a freely orbited camera is nearest to. Ties go to the view
 * declared first, which puts the six face views ahead of the diagonals.
 */
export function nearestStandardView(eye: Vec3): StandardView {
  const unit = normalize(eye)
  let best: StandardView = 'isometric'
  let bestScore = -Infinity
  for (const view of STANDARD_VIEWS) {
    const score = dot(unit, ORIENTATIONS[view].eye)
    if (score > bestScore + 1e-9) {
      bestScore = score
      best = view
    }
  }
  return best
}

/** Whether the camera is already sitting on a named view, within a degree. */
export function matchesStandardView(eye: Vec3, view: StandardView, toleranceRadians = 0.02): boolean {
  return angleBetween(eye, ORIENTATIONS[view].eye) <= toleranceRadians
}

export function placeCamera(
  orientation: CameraOrientation,
  target: Vec3,
  distance: number,
): CameraPlacement {
  return {
    position: add(target, scale(normalize(orientation.eye), Math.max(distance, 1e-6))),
    target,
    up: normalize(orientation.up),
  }
}

/**
 * Turntable orbit: azimuth spins about the world up axis, elevation about the
 * camera's own right axis. Elevation is clamped just short of the poles so the
 * up vector never collapses onto the view direction.
 */
export const MAX_ELEVATION = Math.PI / 2 - 1e-3

export function orbit(
  orientation: CameraOrientation,
  deltaAzimuth: number,
  deltaElevation: number,
): CameraOrientation {
  const eye = normalize(orientation.eye)
  const worldUp = normalize(orientation.up)
  const spun = normalize(rotateAbout(eye, worldUp, deltaAzimuth))

  const right = cross(spun, worldUp)
  // Looking straight down the up axis leaves no right vector to tilt about.
  if (Math.hypot(right.x, right.y, right.z) < 1e-9) {
    return { eye: spun, up: worldUp }
  }

  const elevation = Math.asin(Math.min(1, Math.max(-1, dot(spun, worldUp))))
  const clamped = Math.min(MAX_ELEVATION, Math.max(-MAX_ELEVATION, elevation + deltaElevation))
  const tilted = rotateAbout(spun, normalize(right), clamped - elevation)
  return { eye: normalize(tilted), up: worldUp }
}

/** Rolls the camera about its own view direction, keeping the eye where it is. */
export function roll(orientation: CameraOrientation, radians: number): CameraOrientation {
  const eye = normalize(orientation.eye)
  return { eye, up: normalize(rotateAbout(normalize(orientation.up), eye, radians)) }
}

/**
 * The screen basis of a camera: `right` and `up` span the image plane and
 * `forward` points from the target towards the viewer. Used by the view cube to
 * project, and by the section tools to drag a plane in screen space.
 */
export interface ScreenBasis {
  readonly right: Vec3
  readonly up: Vec3
  readonly forward: Vec3
}

export function screenBasis(orientation: CameraOrientation): ScreenBasis {
  const forward = normalize(orientation.eye)
  let right = cross(normalize(orientation.up), forward)
  if (Math.hypot(right.x, right.y, right.z) < 1e-9) {
    // Degenerate up vector: pick any axis perpendicular to the view direction.
    right = cross({ x: 1, y: 0, z: 0 }, forward)
    if (Math.hypot(right.x, right.y, right.z) < 1e-9) right = cross({ x: 0, y: 1, z: 0 }, forward)
  }
  const unitRight = normalize(right)
  return { right: unitRight, up: cross(forward, unitRight), forward }
}

/**
 * Orthographic half-height that frames a sphere of `radius`, and the equivalent
 * perspective distance for a given vertical field of view. Keeping both in one
 * place is what lets a viewport toggle projection without the model jumping.
 */
export function distanceToFit(radius: number, fovDegrees: number, projection: ProjectionMode): number {
  const safeRadius = Math.max(radius, 1e-6)
  if (projection === 'orthographic') return safeRadius * 2.5
  const fov = (Math.max(1, Math.min(179, fovDegrees)) * Math.PI) / 180
  return safeRadius / Math.sin(fov / 2)
}

/** Orthographic half-height that shows the same amount as a perspective camera. */
export function orthographicHalfHeight(distance: number, fovDegrees: number): number {
  const fov = (Math.max(1, Math.min(179, fovDegrees)) * Math.PI) / 180
  return Math.tan(fov / 2) * Math.max(distance, 1e-6)
}

/** Screen-space pan converted into a world-space shift of the camera target. */
export function panTarget(
  orientation: CameraOrientation,
  target: Vec3,
  deltaRight: number,
  deltaUp: number,
): Vec3 {
  const basis = screenBasis(orientation)
  return subtract(target, add(scale(basis.right, deltaRight), scale(basis.up, deltaUp)))
}

function normalizeLiteral(x: number, y: number, z: number): Vec3 {
  return normalize({ x, y, z })
}
