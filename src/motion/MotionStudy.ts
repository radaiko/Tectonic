import type { InterferencePair, PartCatalog } from '../assembly/AssemblyFeatures'
import { detectInterference } from '../assembly/AssemblyFeatures'
import type { Mate } from '../assembly/Mate'
import { clampToLimits } from '../assembly/Mate'
import type { MateSolver } from '../assembly/MateSolver'
import type { ComponentTransform } from '../assembly/Transform'
import { axisAngleOf, conjugateQuaternion, multiplyQuaternions } from '../assembly/Transform'
import type { Vec3 } from '../domain/vec3'
import { length, scale, subtract } from '../domain/vec3'
import type { JointAnimation } from './JointAnimation'
import { DEFAULT_FPS, animationFrames } from './JointAnimation'
import type { JointChannel } from './types'
import { MotionError, channelsOf } from './types'

/**
 * What an assembly does when something drives it.
 *
 * A study is a sampled simulation, not a solved one: each frame's joint values
 * come from the drivers, the mate solver places the components, and velocity and
 * acceleration fall out of finite differences between neighbouring frames. That
 * is enough to answer the questions a CAD motion study is asked — does it clash,
 * how fast does that end move, where does the linkage sweep — without a dynamics
 * engine the rest of Tectonic has no use for.
 */

/** How a driver decides what its joint is doing at a given moment. */
export const DRIVER_KINDS = ['motor', 'force', 'prescribed'] as const
export type DriverKind = (typeof DRIVER_KINDS)[number]

export interface MotionDriver {
  readonly mateId: string
  readonly channel: JointChannel
  readonly kind: DriverKind
  /** Where the joint starts, in mm or degrees. */
  readonly initialValue?: number
  /** Motor: constant rate, in units per second. */
  readonly velocity?: number
  /**
   * Force or torque, expressed as the constant acceleration it produces on the
   * driven joint — units per second squared. A real inertia solve is out of
   * scope, so the mass is folded into this number by the caller.
   */
  readonly acceleration?: number
  /** Motor or force: when the drive starts, in seconds. Defaults to 0. */
  readonly startTime?: number
}

/** Motion of one component at one instant, in assembly space. */
export interface ComponentMotion {
  readonly componentId: string
  readonly position: Vec3
  /** mm per second. */
  readonly velocity: Vec3
  /** mm per second squared. */
  readonly acceleration: Vec3
  readonly speed: number
  /** Magnitude of the rotation rate, in degrees per second. */
  readonly angularSpeed: number
}

export interface MotionSample {
  readonly index: number
  readonly time: number
  /** Driven joint values, keyed `${mateId}:${channel}`. */
  readonly jointValues: ReadonlyMap<string, number>
  readonly transforms: ReadonlyMap<string, ComponentTransform>
  readonly components: readonly ComponentMotion[]
  readonly interference: readonly InterferencePair[]
  /** True when the solver could not satisfy every mate at this instant. */
  readonly solved: boolean
}

/** The first moment a pair of components ran into each other. */
export interface MotionCollision {
  readonly componentIdA: string
  readonly componentIdB: string
  readonly time: number
  readonly frame: number
  /** The worst overlap seen across the whole run. */
  readonly peakVolume: number
}

export interface MotionStudyResult {
  readonly samples: readonly MotionSample[]
  readonly duration: number
  readonly fps: number
  readonly collisions: readonly MotionCollision[]
  /** Frames where at least one mate could not be satisfied. */
  readonly unsolvedFrames: readonly number[]
}

export interface MotionStudyOptions {
  readonly duration: number
  readonly fps?: number
  readonly drivers?: readonly MotionDriver[]
  /** Supplies the values for `prescribed` drivers, and nothing else. */
  readonly animation?: JointAnimation
  /** Part extents. Without it, collisions cannot be checked and are skipped. */
  readonly catalog?: PartCatalog
  readonly checkCollisions?: boolean
  /** Overlaps smaller than this do not count as a clash. */
  readonly collisionTolerance?: number
}

export class MotionStudy {
  readonly solver: MateSolver
  readonly options: MotionStudyOptions

  constructor(solver: MateSolver, options: MotionStudyOptions) {
    if (!(options.duration > 0)) {
      throw new MotionError(`A motion study needs a positive duration, got ${String(options.duration)}`)
    }
    this.solver = solver
    this.options = options
  }

  get fps(): number {
    return this.options.fps ?? DEFAULT_FPS
  }

  get drivers(): readonly MotionDriver[] {
    return this.options.drivers ?? []
  }

  /**
   * Runs the study.
   *
   * The assembly is left exactly as it was found: the mate parameters and the
   * component placements are captured up front and restored at the end, so a
   * study is a measurement and never an edit.
   */
  run(): MotionStudyResult {
    const frames = animationFrames(this.options.duration, this.fps)
    const restoreMates = captureMates(this.solver.mates)
    const restoreTree = new Map(
      this.solver.tree.components.map((component) => [component.id, component.transform]),
    )

    const jointValues: Map<string, number>[] = []
    const transforms: ReadonlyMap<string, ComponentTransform>[] = []
    const interference: InterferencePair[][] = []
    const solvedFlags: boolean[] = []

    try {
      for (const frame of frames) {
        const values = this.#driveAt(frame.time)
        jointValues.push(values)

        const solution = this.solver.solve()
        solvedFlags.push(solution.isSolved)
        transforms.push(new Map(solution.worldTransforms))

        if (this.options.checkCollisions && this.options.catalog) {
          this.solver.apply(solution)
          interference.push(
            detectInterference(this.solver.tree, this.options.catalog, {
              ...(this.options.collisionTolerance === undefined
                ? {}
                : { tolerance: this.options.collisionTolerance }),
            }),
          )
        } else {
          interference.push([])
        }
      }
    } finally {
      restoreMates()
      for (const [id, transform] of restoreTree) {
        this.solver.tree.setTransform(id, transform)
      }
    }

    const dt = 1 / this.fps
    const samples: MotionSample[] = frames.map((frame, index) => ({
      index: frame.index,
      time: frame.time,
      jointValues: jointValues[index] as Map<string, number>,
      transforms: transforms[index] as ReadonlyMap<string, ComponentTransform>,
      components: componentMotion(transforms, index, dt),
      interference: interference[index] as InterferencePair[],
      solved: solvedFlags[index] ?? true,
    }))

    return {
      samples,
      duration: this.options.duration,
      fps: this.fps,
      collisions: firstCollisions(samples),
      unsolvedFrames: samples.filter((sample) => !sample.solved).map((sample) => sample.index),
    }
  }

  /** Writes every driver's value for `time` into the mates it drives. */
  #driveAt(time: number): Map<string, number> {
    const values = new Map<string, number>()

    for (const driver of this.drivers) {
      const mate = this.solver.getMate(driver.mateId)
      if (!mate) continue
      if (!channelsOf(mate.type).includes(driver.channel)) continue

      const raw = driverValue(driver, time, this.options.animation)
      if (raw === undefined) continue

      const value = clampToLimits(raw, mate.parameters.limits)
      values.set(`${driver.mateId}:${driver.channel}`, value)
      if (driver.channel === 'distance') mate.setParameters({ distance: value })
      else {
        mate.setParameters({ angle: value })
        if (mate.type === 'screw') {
          mate.setParameters({ distance: (value / 360) * mate.parameters.pitch })
        }
      }
    }
    return values
  }
}

/**
 * A driver's joint value at an instant.
 *
 * `prescribed` reads the animation, so a hand-keyed motion and a motor-driven
 * one can appear in the same study. It returns `undefined` when the animation
 * has nothing for that joint, which leaves the mate wherever the user put it.
 */
export function driverValue(
  driver: MotionDriver,
  time: number,
  animation?: JointAnimation,
): number | undefined {
  const initial = driver.initialValue ?? 0

  if (driver.kind === 'prescribed') {
    return animation?.valueAt(driver.mateId, driver.channel, time)
  }

  const elapsed = Math.max(0, time - (driver.startTime ?? 0))
  if (driver.kind === 'motor') {
    return initial + (driver.velocity ?? 0) * elapsed
  }
  // A constant force: v = a·t, so the travel is ½·a·t² from the start value.
  const acceleration = driver.acceleration ?? 0
  return initial + (driver.velocity ?? 0) * elapsed + 0.5 * acceleration * elapsed * elapsed
}

/* -------------------------------------------------------------------------- */
/* Derivatives                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Velocity and acceleration of every component at one frame.
 *
 * Central differences are used in the interior and one-sided ones at the ends,
 * which keeps the whole run second-order accurate except at the two boundary
 * frames — where there is simply no neighbour to look at.
 */
function componentMotion(
  frames: readonly ReadonlyMap<string, ComponentTransform>[],
  index: number,
  dt: number,
): ComponentMotion[] {
  const current = frames[index]
  if (!current) return []

  const previous = frames[index - 1]
  const next = frames[index + 1]
  const motion: ComponentMotion[] = []

  for (const [componentId, transform] of current) {
    const before = previous?.get(componentId) ?? transform
    const after = next?.get(componentId) ?? transform
    const span = (previous ? 1 : 0) + (next ? 1 : 0)

    const velocity =
      span === 0
        ? { x: 0, y: 0, z: 0 }
        : scale(subtract(after.position, before.position), 1 / (span * dt))

    const acceleration =
      previous && next
        ? scale(
            {
              x: after.position.x - 2 * transform.position.x + before.position.x,
              y: after.position.y - 2 * transform.position.y + before.position.y,
              z: after.position.z - 2 * transform.position.z + before.position.z,
            },
            1 / (dt * dt),
          )
        : { x: 0, y: 0, z: 0 }

    motion.push({
      componentId,
      position: transform.position,
      velocity,
      acceleration,
      speed: length(velocity),
      angularSpeed:
        span === 0
          ? 0
          : Math.abs(
              axisAngleOf(
                multiplyQuaternions(after.rotation, conjugateQuaternion(before.rotation)),
              ).angle,
            ) /
            (span * dt),
    })
  }
  return motion
}

/** Each interfering pair reduced to when it first happened and how bad it got. */
function firstCollisions(samples: readonly MotionSample[]): MotionCollision[] {
  const found = new Map<string, MotionCollision>()

  for (const sample of samples) {
    for (const pair of sample.interference) {
      const key = `${pair.componentIdA}|${pair.componentIdB}`
      const existing = found.get(key)
      if (!existing) {
        found.set(key, {
          componentIdA: pair.componentIdA,
          componentIdB: pair.componentIdB,
          time: sample.time,
          frame: sample.index,
          peakVolume: pair.volume,
        })
      } else if (pair.volume > existing.peakVolume) {
        found.set(key, { ...existing, peakVolume: pair.volume })
      }
    }
  }
  return [...found.values()]
}

function captureMates(mates: readonly Mate[]): () => void {
  const saved = mates.map((mate) => ({ mate, parameters: { ...mate.parameters } }))
  return () => {
    for (const entry of saved) entry.mate.parameters = entry.parameters
  }
}

/* -------------------------------------------------------------------------- */
/* Visualisation                                                               */
/* -------------------------------------------------------------------------- */

/** The path a component swept, as a polyline the viewport can draw. */
export function motionTrail(result: MotionStudyResult, componentId: string): Vec3[] {
  const trail: Vec3[] = []
  for (const sample of result.samples) {
    const transform = sample.transforms.get(componentId)
    if (transform) trail.push(transform.position)
  }
  return trail
}

/** An arrow to draw: where it starts, where it points, and what it measures. */
export interface MotionArrow {
  readonly componentId: string
  readonly from: Vec3
  readonly to: Vec3
  readonly magnitude: number
}

/**
 * Velocity arrows for one frame.
 *
 * `scaleFactor` is seconds of travel, so an arrow shows how far the component
 * would get in that much time at its current rate — which reads correctly at any
 * model size, unlike a fixed pixel length.
 */
export function velocityArrows(sample: MotionSample, scaleFactor = 0.25): MotionArrow[] {
  return arrowsFrom(sample, scaleFactor, (motion) => motion.velocity, (motion) => motion.speed)
}

/** Acceleration arrows for one frame, scaled the same way. */
export function accelerationArrows(sample: MotionSample, scaleFactor = 0.05): MotionArrow[] {
  return arrowsFrom(
    sample,
    scaleFactor,
    (motion) => motion.acceleration,
    (motion) => length(motion.acceleration),
  )
}

function arrowsFrom(
  sample: MotionSample,
  scaleFactor: number,
  vector: (motion: ComponentMotion) => Vec3,
  magnitude: (motion: ComponentMotion) => number,
): MotionArrow[] {
  const arrows: MotionArrow[] = []
  for (const motion of sample.components) {
    const size = magnitude(motion)
    if (size <= 0) continue
    const direction = vector(motion)
    arrows.push({
      componentId: motion.componentId,
      from: motion.position,
      to: {
        x: motion.position.x + direction.x * scaleFactor,
        y: motion.position.y + direction.y * scaleFactor,
        z: motion.position.z + direction.z * scaleFactor,
      },
      magnitude: size,
    })
  }
  return arrows
}

/** The fastest a component moved during the run, and when. */
export function peakSpeed(
  result: MotionStudyResult,
  componentId: string,
): { readonly speed: number; readonly time: number } {
  let best = { speed: 0, time: 0 }
  for (const sample of result.samples) {
    const motion = sample.components.find((entry) => entry.componentId === componentId)
    if (motion && motion.speed > best.speed) best = { speed: motion.speed, time: sample.time }
  }
  return best
}
