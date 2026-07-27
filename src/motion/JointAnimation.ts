import type { Mate } from '../assembly/Mate'
import { clampToLimits } from '../assembly/Mate'
import type { MateSolver } from '../assembly/MateSolver'
import type { ComponentTransform } from '../assembly/Transform'
import { newId } from '../sketch/domain/ids'
import type { BezierControls, Easing, JointChannel } from './types'
import { DEFAULT_BEZIER, MotionError, channelsOf, ease, isEasing } from './types'

/**
 * A keyframed pose for the joints of an assembly.
 *
 * The animation stores only joint values against time — never transforms. Where
 * a keyed joint value puts the components is the {@link MateSolver}'s business,
 * exactly as it is when the user drags a slider by hand, so an animation stays
 * valid when the assembly is re-mated, re-grounded or has parts replaced.
 */

/** One keyed value. `easing` governs the run from here to the next keyframe. */
export interface Keyframe {
  /** Seconds from the start of the animation. */
  readonly time: number
  readonly value: number
  readonly easing: Easing
  /** Control points, read only when `easing` is `bezier`. */
  readonly controls?: BezierControls
}

export interface KeyframeInit {
  readonly time: number
  readonly value: number
  readonly easing?: Easing
  readonly controls?: BezierControls
}

/** Every keyframe for one channel of one joint, in time order. */
export interface JointTrackJSON {
  readonly mateId: string
  readonly channel: JointChannel
  readonly keyframes: readonly Keyframe[]
}

/** Where a joint stands at an instant. Absent channels are not animated. */
export interface JointPose {
  readonly distance?: number
  readonly angle?: number
}

export interface JointAnimationJSON {
  readonly id: string
  readonly name: string
  readonly tracks: readonly JointTrackJSON[]
  /** Explicit run time. `null` takes it from the last keyframe. */
  readonly duration: number | null
  readonly loop: boolean
}

export interface JointAnimationInit {
  readonly id?: string
  readonly name?: string
  readonly tracks?: readonly JointTrackJSON[]
  readonly duration?: number | null
  readonly loop?: boolean
}

/** A placement per component at one instant — what a viewport needs to draw. */
export type AnimationSampler = (time: number) => ReadonlyMap<string, ComponentTransform>

export class JointAnimation {
  readonly id: string
  name: string
  loop: boolean
  /** Keyed by `${mateId}:${channel}`, so a joint's two channels stay separate. */
  readonly #tracks = new Map<string, Keyframe[]>()
  #duration: number | null

  constructor(init: JointAnimationInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Animation 1'
    this.loop = init.loop ?? false
    this.#duration = normalizeDuration(init.duration ?? null)

    for (const track of init.tracks ?? []) {
      for (const keyframe of track.keyframes) {
        this.addKeyframe(track.mateId, track.channel, keyframe)
      }
    }
  }

  get tracks(): JointTrackJSON[] {
    return [...this.#tracks.entries()].map(([key, keyframes]) => {
      const { mateId, channel } = splitKey(key)
      return { mateId, channel, keyframes: keyframes.map(cloneKeyframe) }
    })
  }

  get trackCount(): number {
    return this.#tracks.size
  }

  /** How long the animation runs: the explicit length, or the last keyframe. */
  get duration(): number {
    if (this.#duration !== null) return this.#duration
    let last = 0
    for (const keyframes of this.#tracks.values()) {
      const final = keyframes[keyframes.length - 1]
      if (final) last = Math.max(last, final.time)
    }
    return last
  }

  /** Pins the run time. `null` lets the last keyframe decide again. */
  setDuration(duration: number | null): void {
    this.#duration = normalizeDuration(duration)
  }

  get isEmpty(): boolean {
    return this.#tracks.size === 0
  }

  /** The mate ids this animation touches, in insertion order. */
  get mateIds(): string[] {
    const ids: string[] = []
    for (const key of this.#tracks.keys()) {
      const { mateId } = splitKey(key)
      if (!ids.includes(mateId)) ids.push(mateId)
    }
    return ids
  }

  keyframes(mateId: string, channel: JointChannel): readonly Keyframe[] {
    return (this.#tracks.get(trackKey(mateId, channel)) ?? []).map(cloneKeyframe)
  }

  /**
   * Adds a key, or replaces the one already at that time. Keeping one key per
   * time is what lets the timeline treat a drag onto an existing key as an edit
   * rather than as a second key nobody can select.
   */
  addKeyframe(mateId: string, channel: JointChannel, init: KeyframeInit): Keyframe {
    if (!mateId) throw new MotionError('A keyframe needs a joint to belong to')
    if (!Number.isFinite(init.time) || init.time < 0) {
      throw new MotionError(`Keyframe time must be a time in seconds, got ${String(init.time)}`)
    }
    if (!Number.isFinite(init.value)) {
      throw new MotionError(`Keyframe value must be a number, got ${String(init.value)}`)
    }

    const keyframe: Keyframe = {
      time: init.time,
      value: init.value,
      easing: isEasing(init.easing) ? init.easing : 'linear',
      ...(init.controls ? { controls: [...init.controls] as unknown as BezierControls } : {}),
    }

    const key = trackKey(mateId, channel)
    const keyframes = this.#tracks.get(key) ?? []
    const existing = keyframes.findIndex((entry) => entry.time === keyframe.time)
    if (existing >= 0) keyframes[existing] = keyframe
    else keyframes.push(keyframe)
    keyframes.sort((a, b) => a.time - b.time)
    this.#tracks.set(key, keyframes)
    return cloneKeyframe(keyframe)
  }

  removeKeyframe(mateId: string, channel: JointChannel, time: number): boolean {
    const key = trackKey(mateId, channel)
    const keyframes = this.#tracks.get(key)
    if (!keyframes) return false
    const index = keyframes.findIndex((entry) => entry.time === time)
    if (index < 0) return false
    keyframes.splice(index, 1)
    if (keyframes.length === 0) this.#tracks.delete(key)
    return true
  }

  /** Drops every key of a joint, both channels. */
  removeTrack(mateId: string, channel?: JointChannel): boolean {
    if (channel) return this.#tracks.delete(trackKey(mateId, channel))
    let removed = false
    for (const key of [...this.#tracks.keys()]) {
      if (splitKey(key).mateId === mateId) removed = this.#tracks.delete(key) || removed
    }
    return removed
  }

  /** Slides a key to a new time, keeping its value and easing. */
  moveKeyframe(
    mateId: string,
    channel: JointChannel,
    from: number,
    to: number,
  ): Keyframe | undefined {
    const keyframes = this.#tracks.get(trackKey(mateId, channel))
    const keyframe = keyframes?.find((entry) => entry.time === from)
    if (!keyframe) return undefined
    this.removeKeyframe(mateId, channel, from)
    return this.addKeyframe(mateId, channel, { ...keyframe, time: Math.max(0, to) })
  }

  /**
   * The value of one channel at an instant, or `undefined` when the joint is not
   * animated. Times outside the keyed range hold the first or last value rather
   * than extrapolating, so a short track simply parks its joint.
   */
  valueAt(mateId: string, channel: JointChannel, time: number): number | undefined {
    const keyframes = this.#tracks.get(trackKey(mateId, channel))
    if (!keyframes || keyframes.length === 0) return undefined
    return interpolateKeyframes(keyframes, time)
  }

  /** Every animated joint's pose at an instant, keyed by mate id. */
  sample(time: number): Map<string, JointPose> {
    const poses = new Map<string, JointPose>()
    for (const [key, keyframes] of this.#tracks) {
      const { mateId, channel } = splitKey(key)
      const value = interpolateKeyframes(keyframes, time)
      const pose = poses.get(mateId) ?? {}
      poses.set(
        mateId,
        channel === 'distance' ? { ...pose, distance: value } : { ...pose, angle: value },
      )
    }
    return poses
  }

  /**
   * Writes the pose at `time` into the mates, clamped to each joint's limits.
   *
   * A screw is keyed by its angle alone: its travel is the pitch times the
   * turns, so keying both would let the two disagree.
   */
  applyTo(mates: readonly Mate[], time: number): Mate[] {
    const poses = this.sample(time)
    const touched: Mate[] = []

    for (const mate of mates) {
      const pose = poses.get(mate.id)
      if (!pose) continue

      const channels = channelsOf(mate.type)
      const changes: { distance?: number; angle?: number } = {}
      if (pose.distance !== undefined && channels.includes('distance')) {
        changes.distance = clampToLimits(pose.distance, mate.parameters.limits)
      }
      if (pose.angle !== undefined && channels.includes('angle')) {
        changes.angle = clampToLimits(pose.angle, mate.parameters.limits)
        if (mate.type === 'screw') {
          changes.distance = (changes.angle / 360) * mate.parameters.pitch
        }
      }
      if (Object.keys(changes).length === 0) continue

      mate.setParameters(changes)
      touched.push(mate)
    }
    return touched
  }

  toJSON(): JointAnimationJSON {
    return {
      id: this.id,
      name: this.name,
      tracks: this.tracks,
      duration: this.#duration,
      loop: this.loop,
    }
  }

  static fromJSON(json: JointAnimationJSON): JointAnimation {
    return new JointAnimation(json)
  }

  clone(overrides: JointAnimationInit = {}): JointAnimation {
    return new JointAnimation({ ...this.toJSON(), id: newId(), ...overrides })
  }
}

/**
 * The value a keyed channel holds at an instant.
 *
 * The easing belongs to the keyframe the segment leaves, not the one it arrives
 * at, so a single key can be told to hold (step), accelerate away (ease-in) or
 * glide (bezier) without touching its neighbour.
 */
export function interpolateKeyframes(keyframes: readonly Keyframe[], time: number): number {
  const first = keyframes[0]
  if (!first) return 0
  if (time <= first.time) return first.value

  const last = keyframes[keyframes.length - 1] as Keyframe
  if (time >= last.time) return last.value

  for (let index = 0; index + 1 < keyframes.length; index += 1) {
    const from = keyframes[index] as Keyframe
    const to = keyframes[index + 1] as Keyframe
    if (time < from.time || time > to.time) continue

    const span = to.time - from.time
    if (span <= 0) return to.value
    const fraction = ease(from.easing, (time - from.time) / span, from.controls ?? DEFAULT_BEZIER)
    return from.value + (to.value - from.value) * fraction
  }
  return last.value
}

/**
 * A sampler that poses the assembly through the mate solver.
 *
 * Every frame goes through the same solve the user's own edits do, so an
 * animation cannot drift out of agreement with the mates — a joint stopped by
 * its limits stops in the animation too.
 */
export function mateSolverSampler(
  solver: MateSolver,
  animation: JointAnimation,
): AnimationSampler {
  return (time) => {
    animation.applyTo(solver.mates, time)
    return solver.solve().worldTransforms
  }
}

/* -------------------------------------------------------------------------- */
/* Playback                                                                    */
/* -------------------------------------------------------------------------- */

export interface PlaybackInit {
  /** Multiplier on real time. 1 plays at the keyed rate. */
  readonly speed?: number
  readonly loop?: boolean
  readonly reversed?: boolean
}

/**
 * The transport: where the playhead is and which way it is going.
 *
 * Time is advanced by the host's animation frame rather than by a timer of its
 * own, so scrubbing, stepping and playing all go through one path and a paused
 * animation costs nothing.
 */
export class AnimationPlayback {
  readonly animation: JointAnimation
  speed: number
  loop: boolean
  #time = 0
  #playing = false
  #direction: 1 | -1

  constructor(animation: JointAnimation, init: PlaybackInit = {}) {
    this.animation = animation
    this.speed = init.speed !== undefined && init.speed > 0 ? init.speed : 1
    this.loop = init.loop ?? animation.loop
    this.#direction = init.reversed ? -1 : 1
    if (init.reversed) this.#time = animation.duration
  }

  get time(): number {
    return this.#time
  }

  get playing(): boolean {
    return this.#playing
  }

  get reversed(): boolean {
    return this.#direction === -1
  }

  /** How far through the run the playhead sits, in [0, 1]. */
  get progress(): number {
    const duration = this.animation.duration
    return duration > 0 ? Math.min(1, Math.max(0, this.#time / duration)) : 0
  }

  play(): void {
    this.#playing = true
  }

  pause(): void {
    this.#playing = false
  }

  toggle(): void {
    this.#playing = !this.#playing
  }

  /** Stops and rewinds to whichever end the playhead is travelling from. */
  stop(): void {
    this.#playing = false
    this.#time = this.#direction === 1 ? 0 : this.animation.duration
  }

  reverse(): void {
    this.#direction = this.#direction === 1 ? -1 : 1
  }

  seek(time: number): number {
    this.#time = Math.min(this.animation.duration, Math.max(0, Number.isFinite(time) ? time : 0))
    return this.#time
  }

  /** Seeks by fraction of the run — what dragging the timeline does. */
  scrub(fraction: number): number {
    return this.seek(this.animation.duration * fraction)
  }

  /**
   * Moves the playhead on by `deltaSeconds` of real time. Returns the new time.
   *
   * Running off the end loops or stops depending on `loop`; stopping pauses
   * rather than silently parking, so the UI's play button reflects reality.
   */
  advance(deltaSeconds: number): number {
    if (!this.#playing || !Number.isFinite(deltaSeconds)) return this.#time
    const duration = this.animation.duration
    if (duration <= 0) return this.#time

    const next = this.#time + deltaSeconds * this.speed * this.#direction
    if (next >= 0 && next <= duration) {
      this.#time = next
      return this.#time
    }

    if (!this.loop) {
      this.#time = next < 0 ? 0 : duration
      this.#playing = false
      return this.#time
    }

    // Wrap into range; a big delta or a high speed can overshoot several times.
    const wrapped = next % duration
    this.#time = wrapped < 0 ? wrapped + duration : wrapped
    return this.#time
  }
}

/* -------------------------------------------------------------------------- */
/* Frame timings and glTF export                                               */
/* -------------------------------------------------------------------------- */

export interface AnimationFrame {
  readonly index: number
  readonly time: number
}

export const DEFAULT_FPS = 30

/** The instants a capture at `fps` samples, from 0 to the duration inclusive. */
export function animationFrames(duration: number, fps: number = DEFAULT_FPS): AnimationFrame[] {
  if (!(fps > 0)) throw new MotionError(`Frame rate must be positive, got ${String(fps)}`)
  if (!(duration > 0)) return [{ index: 0, time: 0 }]

  const count = Math.max(1, Math.round(duration * fps))
  const frames: AnimationFrame[] = []
  for (let index = 0; index <= count; index += 1) {
    frames.push({ index, time: Math.min(duration, index / fps) })
  }
  return frames
}

export interface GltfAnimationSampler {
  readonly input: readonly number[]
  readonly output: readonly number[]
  readonly interpolation: 'LINEAR' | 'STEP'
}

export interface GltfAnimationChannel {
  readonly sampler: number
  readonly target: { readonly node: number; readonly path: 'translation' | 'rotation' }
}

export interface GltfAnimation {
  readonly name: string
  readonly samplers: readonly GltfAnimationSampler[]
  readonly channels: readonly GltfAnimationChannel[]
}

export interface GltfAnimationOptions {
  /** Poses the assembly at an instant — see {@link mateSolverSampler}. */
  readonly sample: AnimationSampler
  /** The glTF node index each component was written to. */
  readonly nodes: ReadonlyMap<string, number>
  readonly fps?: number
  readonly name?: string
}

/**
 * The animation as glTF sampler and channel data.
 *
 * glTF animates nodes, not joints, so the joint values are baked: every frame is
 * solved and the resulting placements are written as translation and rotation
 * keys. That loses the parametric link on purpose — a viewer has no mate solver.
 *
 * The arrays are returned raw rather than packed into a buffer so the existing
 * glTF exporter stays the one place that lays bytes out.
 */
export function toGltfAnimation(
  animation: JointAnimation,
  options: GltfAnimationOptions,
): GltfAnimation {
  const frames = animationFrames(animation.duration, options.fps ?? DEFAULT_FPS)
  const times = frames.map((frame) => frame.time)

  const translations = new Map<string, number[]>()
  const rotations = new Map<string, number[]>()

  for (const frame of frames) {
    const transforms = options.sample(frame.time)
    for (const [componentId, node] of options.nodes) {
      if (node < 0) continue
      const transform = transforms.get(componentId)
      if (!transform) continue
      const translation = translations.get(componentId) ?? []
      const rotation = rotations.get(componentId) ?? []
      translation.push(transform.position.x, transform.position.y, transform.position.z)
      rotation.push(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.w,
      )
      translations.set(componentId, translation)
      rotations.set(componentId, rotation)
    }
  }

  const samplers: GltfAnimationSampler[] = []
  const channels: GltfAnimationChannel[] = []

  for (const [componentId, node] of options.nodes) {
    const translation = translations.get(componentId)
    const rotation = rotations.get(componentId)
    if (!translation || !rotation) continue

    channels.push({ sampler: samplers.length, target: { node, path: 'translation' } })
    samplers.push({ input: times, output: translation, interpolation: 'LINEAR' })
    channels.push({ sampler: samplers.length, target: { node, path: 'rotation' } })
    samplers.push({ input: times, output: rotation, interpolation: 'LINEAR' })
  }

  return { name: options.name ?? animation.name, samplers, channels }
}

function trackKey(mateId: string, channel: JointChannel): string {
  return `${mateId}:${channel}`
}

function splitKey(key: string): { mateId: string; channel: JointChannel } {
  const separator = key.lastIndexOf(':')
  return {
    mateId: key.slice(0, separator),
    channel: key.slice(separator + 1) as JointChannel,
  }
}

function cloneKeyframe(keyframe: Keyframe): Keyframe {
  return keyframe.controls
    ? { ...keyframe, controls: [...keyframe.controls] as unknown as BezierControls }
    : { ...keyframe }
}

function normalizeDuration(duration: number | null): number | null {
  if (duration === null) return null
  if (!Number.isFinite(duration) || duration < 0) {
    throw new MotionError(`Duration must be a length in seconds, got ${String(duration)}`)
  }
  return duration
}
