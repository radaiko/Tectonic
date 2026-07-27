import type { MeshPoint } from '../../domain/MeshData'
import type { Vec2 } from '../../sketch/domain/geometry'
import type { ViewOrientation } from '../domain/DrawingView'

/**
 * The frames a drawing projects through.
 *
 * A frame is three unit vectors: the direction the viewer looks *along*, and
 * the two model directions that land on the drawing's +x and +y. They are
 * right-handed in the sense that `right x up = -direction`, so -direction
 * points back at the viewer and a smaller `depth` means nearer the eye — which
 * is the whole basis of the hidden line removal.
 */

export interface ProjectionFrame {
  readonly direction: MeshPoint
  readonly right: MeshPoint
  readonly up: MeshPoint
}

/**
 * The six square-on views plus the pictorial ones. Front looks from -Y toward
 * +Y with X to the right and Z up, and every other frame is derived from that
 * the way a drawing board would.
 */
export const STANDARD_FRAMES: Readonly<Record<ViewOrientation, ProjectionFrame>> = {
  front: {
    direction: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  },
  back: {
    direction: { x: 0, y: -1, z: 0 },
    right: { x: -1, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  },
  top: {
    direction: { x: 0, y: 0, z: -1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  },
  bottom: {
    direction: { x: 0, y: 0, z: 1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: -1, z: 0 },
  },
  right: {
    direction: { x: -1, y: 0, z: 0 },
    right: { x: 0, y: 1, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  },
  left: {
    direction: { x: 1, y: 0, z: 0 },
    right: { x: 0, y: -1, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  },
  // Viewer at (1, -1, 1): the three axes come off at 120 degrees on paper.
  isometric: frameLookingFrom({ x: 1, y: -1, z: 1 }),
  // Two axes foreshortened equally, the third less so.
  dimetric: frameLookingFrom({ x: 1, y: -2, z: 1 }),
  trimetric: frameLookingFrom({ x: 1.2, y: -2, z: 0.8 }),
}

export function frameFor(orientation: ViewOrientation): ProjectionFrame {
  return STANDARD_FRAMES[orientation]
}

/** The eye at `position` looking at the origin. */
export function frameLookingFrom(position: MeshPoint): ProjectionFrame {
  return frameFromDirection(negate(position))
}

/**
 * A frame for an arbitrary line of sight. World +Z is kept as up wherever it
 * can be, which is what makes an auxiliary view read the same way up as the
 * view it was projected from.
 */
export function frameFromDirection(direction: MeshPoint, upHint?: MeshPoint): ProjectionFrame {
  const d = normalize(direction)
  if (d === null) return STANDARD_FRAMES.front

  const preferred = upHint ?? { x: 0, y: 0, z: 1 }
  let up = normalize(reject(preferred, d))
  if (up === null) {
    // Looking straight along the hint: fall back to world +Y, then +X.
    up = normalize(reject({ x: 0, y: 1, z: 0 }, d)) ?? normalize(reject({ x: 1, y: 0, z: 0 }, d))
  }
  if (up === null) return STANDARD_FRAMES.front

  const right = normalize(cross(d, up))
  if (right === null) return STANDARD_FRAMES.front
  return { direction: d, right, up }
}

/** Where a model point lands on the drawing. */
export function projectPoint(point: MeshPoint, frame: ProjectionFrame): Vec2 {
  return { x: dot(point, frame.right), y: dot(point, frame.up) }
}

/** How far a point sits along the line of sight. Smaller is nearer the eye. */
export function depthOf(point: MeshPoint, frame: ProjectionFrame): number {
  return dot(point, frame.direction)
}

export function dot(a: MeshPoint, b: MeshPoint): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross(a: MeshPoint, b: MeshPoint): MeshPoint {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function negate(a: MeshPoint): MeshPoint {
  return { x: -a.x, y: -a.y, z: -a.z }
}

export function subtract(a: MeshPoint, b: MeshPoint): MeshPoint {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function addPoints(a: MeshPoint, b: MeshPoint): MeshPoint {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function scalePoint3(a: MeshPoint, factor: number): MeshPoint {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor }
}

export function normalize(a: MeshPoint): MeshPoint | null {
  const magnitude = Math.hypot(a.x, a.y, a.z)
  if (magnitude < 1e-12) return null
  return { x: a.x / magnitude, y: a.y / magnitude, z: a.z / magnitude }
}

/** `a` with everything parallel to the unit vector `onto` taken out of it. */
function reject(a: MeshPoint, onto: MeshPoint): MeshPoint {
  const amount = dot(a, onto)
  return { x: a.x - onto.x * amount, y: a.y - onto.y * amount, z: a.z - onto.z * amount }
}

/**
 * The frame you get by looking square at a line drawn across another view.
 *
 * The plane holding the line and the parent's line of sight is what both a
 * section and an auxiliary view are taken across, so its normal is the new line
 * of sight. The paper axis the line ran along is kept pointing the same way,
 * which is what lines the new view up beside or under the one it came from —
 * and, for a line drawn square in a standard view, reproduces the standard
 * side, top or bottom frame exactly.
 */
export function frameAcrossLine(
  parentFrame: ProjectionFrame,
  start: Vec2,
  end: Vec2,
  flip = false,
): ProjectionFrame {
  const along = normalize({
    x: parentFrame.right.x * (end.x - start.x) + parentFrame.up.x * (end.y - start.y),
    y: parentFrame.right.y * (end.x - start.x) + parentFrame.up.y * (end.y - start.y),
    z: parentFrame.right.z * (end.x - start.x) + parentFrame.up.z * (end.y - start.y),
  })
  if (along === null) return parentFrame

  const sight = normalize(cross(along, parentFrame.direction))
  if (sight === null) return parentFrame
  const direction = flip ? negate(sight) : sight

  // Whichever paper axis the line mostly ran along is the one that is kept.
  const alongUp = Math.abs(dot(along, parentFrame.up)) >= Math.abs(dot(along, parentFrame.right))
  if (alongUp) {
    const up = dot(along, parentFrame.up) >= 0 ? along : negate(along)
    const right = normalize(cross(direction, up)) ?? parentFrame.right
    return { direction, right, up }
  }
  const right = dot(along, parentFrame.right) >= 0 ? along : negate(along)
  const up = normalize(cross(negate(direction), right)) ?? parentFrame.up
  return { direction, right, up }
}

/** Lifts a drawing-space point back into the model, on the plane through 0. */
export function unprojectPoint(point: Vec2, frame: ProjectionFrame, depth = 0): MeshPoint {
  return {
    x: frame.right.x * point.x + frame.up.x * point.y + frame.direction.x * depth,
    y: frame.right.y * point.x + frame.up.y * point.y + frame.direction.y * depth,
    z: frame.right.z * point.x + frame.up.z * point.y + frame.direction.z * depth,
  }
}
