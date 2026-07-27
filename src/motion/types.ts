/**
 * Shared vocabulary for the motion environment: what a joint can be driven
 * along, and how a value travels between two keyframes.
 *
 * Nothing here touches the assembly — these are the pure pieces the animation,
 * the motion study and the timeline panel all read.
 */

import type { MateKind } from '../assembly/Mate'

/** Raised when an animation or a motion study cannot be described as asked. */
export class MotionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MotionError'
  }
}

/**
 * The two things a joint value can mean: a distance along the mated axis, or an
 * angle about it. Every joint the animator drives moves one or both of these,
 * which is exactly what {@link MateParameters} already carries — so an animated
 * pose is a mate parameter change and nothing more.
 */
export const JOINT_CHANNELS = ['distance', 'angle'] as const
export type JointChannel = (typeof JOINT_CHANNELS)[number]

/** Joint kinds the animator can drive, and which channels each one moves. */
const DRIVEN_CHANNELS: Partial<Record<MateKind, readonly JointChannel[]>> = {
  revolute: ['angle'],
  slider: ['distance'],
  cylindrical: ['distance', 'angle'],
  // A planar joint slides in two directions and spins about the normal; the
  // slide is carried as a distance along the mate's reference axis.
  planar: ['distance', 'angle'],
  // A screw turns and advances together, so only its angle is keyed — the
  // travel follows from the pitch.
  screw: ['angle'],
}

/** The channels a joint of this kind moves. Empty for anything rigid. */
export function channelsOf(type: MateKind): readonly JointChannel[] {
  return DRIVEN_CHANNELS[type] ?? []
}

/** Whether a mate leaves motion the animator can drive. */
export function isAnimatableJoint(type: MateKind): boolean {
  return channelsOf(type).length > 0
}

/** The unit a channel is measured in, for labels and for velocity readouts. */
export function channelUnit(channel: JointChannel): 'mm' | 'deg' {
  return channel === 'distance' ? 'mm' : 'deg'
}

/** How a value crosses the gap between one keyframe and the next. */
export const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bezier', 'step'] as const
export type Easing = (typeof EASINGS)[number]

/** Cubic Bézier control points `[x1, y1, x2, y2]`, as CSS writes them. */
export type BezierControls = readonly [number, number, number, number]

export const DEFAULT_BEZIER: BezierControls = [0.42, 0, 0.58, 1]

export function isEasing(value: unknown): value is Easing {
  return typeof value === 'string' && (EASINGS as readonly string[]).includes(value)
}

/**
 * The eased fraction for a raw fraction in [0, 1].
 *
 * `step` holds the earlier keyframe's value until the next one arrives, which is
 * what makes a mechanism jump between discrete positions rather than glide.
 */
export function ease(kind: Easing, fraction: number, controls?: BezierControls): number {
  const t = clamp01(fraction)
  switch (kind) {
    case 'linear':
      return t
    case 'ease-in':
      return t * t
    case 'ease-out':
      return t * (2 - t)
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'bezier':
      return cubicBezier(controls ?? DEFAULT_BEZIER, t)
    case 'step':
      return t >= 1 ? 1 : 0
  }
}

/**
 * The y of a cubic Bézier easing curve at a given x.
 *
 * The curve is parameterised by its own variable, not by x, so x has to be
 * inverted first. Newton converges in a handful of steps for the well-behaved
 * curves easing uses; bisection picks up the rest rather than returning a wrong
 * answer when the derivative goes flat.
 */
export function cubicBezier(controls: BezierControls, x: number): number {
  const [x1, y1, x2, y2] = controls
  if (x1 === y1 && x2 === y2) return x

  const target = clamp01(x)
  let t = target

  for (let step = 0; step < 8; step += 1) {
    const error = bezierAxis(t, x1, x2) - target
    if (Math.abs(error) < 1e-7) return bezierAxis(t, y1, y2)
    const slope = bezierSlope(t, x1, x2)
    if (Math.abs(slope) < 1e-7) break
    t -= error / slope
  }

  let low = 0
  let high = 1
  t = target
  for (let step = 0; step < 40; step += 1) {
    const value = bezierAxis(t, x1, x2)
    if (Math.abs(value - target) < 1e-7) break
    if (value > target) high = t
    else low = t
    t = (low + high) / 2
  }
  return bezierAxis(t, y1, y2)
}

/** One axis of a unit cubic Bézier with endpoints 0 and 1. */
function bezierAxis(t: number, a: number, b: number): number {
  const inverse = 1 - t
  return 3 * inverse * inverse * t * a + 3 * inverse * t * t * b + t * t * t
}

function bezierSlope(t: number, a: number, b: number): number {
  const inverse = 1 - t
  return 3 * inverse * inverse * a + 6 * inverse * t * (b - a) + 3 * t * t * (1 - b)
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
