import * as THREE from 'three'

/** Leaves the model just inside the frame rather than touching its edges. */
const MARGIN = 1.2
/** A degenerate body — a single point — still needs a radius to stand off from. */
const MIN_RADIUS = 1
/** Direction used when the camera is sitting on the point it is looking at. */
const DEFAULT_DIRECTION = new THREE.Vector3(1, 0.75, 1.15)
/**
 * How much bigger or smaller a model may get before the camera is put back on
 * it. A tenth is well clear of the nudges that come from editing a parameter —
 * a fillet radius, a few millimetres of extrude depth — and well under the jump
 * that comes from a feature adding a body the current view has no room for.
 */
const RADIUS_TOLERANCE = 1.1
/** How far a model may drift, as a fraction of the radius it was framed at. */
const CENTRE_TOLERANCE = 0.1

/** The ball a model occupies. Framing decisions are made against this. */
export interface ModelSphere {
  readonly center: THREE.Vector3
  readonly radius: number
}

/** Where a camera has to sit, and what it can see from there. */
export interface Framing {
  readonly position: THREE.Vector3
  readonly target: THREE.Vector3
  readonly near: number
  readonly far: number
}

/** The ball enclosing a model, or null when there is no model. */
export function boundingSphere(box: THREE.Box3): ModelSphere | null {
  if (box.isEmpty()) return null
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  return { center: sphere.center.clone(), radius: Math.max(sphere.radius, MIN_RADIUS) }
}

/**
 * Whether a model has changed enough since it was framed to be worth framing
 * again.
 *
 * The camera belongs to the user once they have moved it, so a rebuild on its
 * own is not reason enough to take it back — nudging an extrude depth must not
 * throw away the angle they orbited to. What does earn a re-frame is the model
 * turning into something else: a feature that adds a body several times the
 * size of what was there, or moves the part off to a sketch's coordinates,
 * leaves a camera aimed at the old model looking at nothing, or close enough
 * inside the new one that back-face culling draws nothing at all.
 */
export function needsReframing(framed: ModelSphere | null, current: ModelSphere): boolean {
  if (!framed) return true
  const ratio = current.radius / framed.radius
  if (ratio > RADIUS_TOLERANCE || ratio < 1 / RADIUS_TOLERANCE) return true
  return current.center.distanceTo(framed.center) > framed.radius * CENTRE_TOLERANCE
}

/**
 * Frames `box`, keeping the direction the camera is already looking from.
 *
 * Both halves of the field of view are checked, not just the vertical one the
 * camera stores: a viewport taller than it is wide is bounded by its width, and
 * fitting the vertical angle alone would let the model run off the sides.
 *
 * Returns null for an empty box — there is nothing to frame, and moving the
 * camera anyway would only lose the view the user is on.
 */
export function frameBox(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  box: THREE.Box3,
): Framing | null {
  const sphere = boundingSphere(box)
  if (!sphere) return null

  // An unmeasured container leaves the aspect ratio at 0 or NaN, which would
  // put the camera at an infinite distance; a square frame is the safe reading
  // until the ResizeObserver reports a real size.
  const aspect = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1
  const halfVertical = (camera.fov * Math.PI) / 360
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect)
  // The tighter of the two is what the sphere has to clear.
  const distance = (sphere.radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * MARGIN

  const direction = camera.position.clone().sub(target)
  if (direction.lengthSq() === 0) direction.copy(DEFAULT_DIRECTION)
  direction.normalize()

  return {
    position: sphere.center.clone().addScaledVector(direction, distance),
    target: sphere.center.clone(),
    near: distance / 100,
    far: distance * 100,
  }
}
