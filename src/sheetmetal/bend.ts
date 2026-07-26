import type { Vec2 } from '../sketch/domain/geometry'
import type { SheetMetalParameters } from './SheetMetalParameters'
import type { BendStep } from './types'
import { SheetMetalError } from './types'

const DEG = Math.PI / 180

/** Facets per 90° of arc. Enough to read as a radius without bloating a mesh. */
const DEFAULT_SEGMENTS_PER_90 = 6

/** Points closer than this collapse, so a zero-radius bend stays a valid loop. */
const WELD_TOLERANCE = 1e-9

export interface ChainOptions {
  /**
   * Station along the chain's own axis where the first bend's tangent sits.
   * Negative values reach back into the face the chain grows out of.
   */
  readonly startStation?: number
  /** How far behind `startStation` the material begins. */
  readonly startExtent?: number
  readonly segmentsPer90?: number
}

/** A chain of bends together with where it starts on the face it grows from. */
export interface BendChain {
  readonly steps: readonly BendStep[]
  readonly options: ChainOptions
}

/** Where one bend lands once the chain is rolled out flat. */
export interface BendZone {
  readonly index: number
  readonly angle: number
  readonly radius: number
  /** Distance from the chain origin to where the bend region starts. */
  readonly start: number
  /** Developed length of the bend region. */
  readonly allowance: number
}

export interface ChainDevelopment {
  /** Flat distance from the chain origin to the tip of the last run. */
  readonly length: number
  readonly zones: readonly BendZone[]
}

/**
 * Rolls a chain of bends out flat.
 *
 * Distances are measured from the chain's own origin — the edge line for a
 * flange, the first sketch point for a contour — so a negative `startStation`
 * simply means the first bend starts inside the parent face.
 */
export function developChain(
  steps: readonly BendStep[],
  parameters: SheetMetalParameters,
  options: ChainOptions = {},
): ChainDevelopment {
  validateSteps(steps)

  let cursor = options.startStation ?? 0
  const zones: BendZone[] = []

  steps.forEach((step, index) => {
    const allowance = parameters.allowanceFor(step.angle, step.radius)
    zones.push({ index, angle: step.angle, radius: step.radius, start: cursor, allowance })
    cursor += allowance + step.straight
  })

  return { length: cursor, zones }
}

/**
 * The folded cross-section of a chain of bends, as a closed loop in the chain's
 * own 2D frame: x runs along the sheet, y across its thickness.
 *
 * The loop is traced along one face out to the tip and back along the other, so
 * a jog that bends one way and then the other stays a simple polygon — the two
 * faces never swap places, only the radius each of them follows does.
 */
export function chainProfile(
  steps: readonly BendStep[],
  parameters: SheetMetalParameters,
  options: ChainOptions = {},
): Vec2[] {
  validateSteps(steps)

  const thickness = parameters.thickness
  const startStation = options.startStation ?? 0
  const startExtent = Math.max(0, options.startExtent ?? 0)
  const facets = Math.max(1, Math.round(options.segmentsPer90 ?? DEFAULT_SEGMENTS_PER_90))

  let origin: Vec2 = { x: startStation, y: 0 }
  let along: Vec2 = { x: 1, y: 0 }
  let across: Vec2 = { x: 0, y: 1 }

  const near: Vec2[] = [{ x: startStation - startExtent, y: 0 }]
  const far: Vec2[] = [{ x: startStation - startExtent, y: thickness }]

  for (const step of steps) {
    const sign = Math.sign(step.angle)
    const turn = Math.abs(step.angle) * DEG
    const centre = translate(origin, across, sign > 0 ? thickness + step.radius : -step.radius)
    const nearRadius = sign > 0 ? step.radius + thickness : step.radius
    const farRadius = sign > 0 ? step.radius : step.radius + thickness

    const count = Math.max(2, Math.ceil((Math.abs(step.angle) / 90) * facets))
    for (let index = 0; index <= count; index += 1) {
      const phi = (turn * index) / count
      const radial = combine(across, -sign * Math.cos(phi), along, Math.sin(phi))
      near.push(translate(centre, radial, nearRadius))
      far.push(translate(centre, radial, farRadius))
    }

    const nextAlong = combine(along, Math.cos(turn), across, sign * Math.sin(turn))
    const nextAcross = combine(along, -sign * Math.sin(turn), across, Math.cos(turn))
    origin = translate(near[near.length - 1] as Vec2, nextAlong, step.straight)
    along = nextAlong
    across = nextAcross
  }

  near.push(origin)
  far.push(translate(origin, across, thickness))

  return orientCounterClockwise(weld([...near, ...far.reverse()]))
}

/**
 * Where the chain ends up: the point on the near face at the tip, plus the two
 * axes of the frame the last run sits in.
 */
export function chainTip(
  steps: readonly BendStep[],
  parameters: SheetMetalParameters,
  options: ChainOptions = {},
): { readonly origin: Vec2; readonly along: Vec2; readonly across: Vec2 } {
  validateSteps(steps)

  let origin: Vec2 = { x: options.startStation ?? 0, y: 0 }
  let along: Vec2 = { x: 1, y: 0 }
  let across: Vec2 = { x: 0, y: 1 }

  for (const step of steps) {
    const sign = Math.sign(step.angle)
    const turn = Math.abs(step.angle) * DEG
    const centre = translate(
      origin,
      across,
      sign > 0 ? parameters.thickness + step.radius : -step.radius,
    )
    const nearRadius = sign > 0 ? step.radius + parameters.thickness : step.radius
    const radial = combine(across, -sign * Math.cos(turn), along, Math.sin(turn))
    const exit = translate(centre, radial, nearRadius)

    const nextAlong = combine(along, Math.cos(turn), across, sign * Math.sin(turn))
    across = combine(along, -sign * Math.sin(turn), across, Math.cos(turn))
    along = nextAlong
    origin = translate(exit, along, step.straight)
  }

  return { origin, along, across }
}

/**
 * Total developed length of a chain, i.e. how much flat material it consumes
 * beyond the origin it grows from.
 */
export function chainFlatLength(
  steps: readonly BendStep[],
  parameters: SheetMetalParameters,
  options: ChainOptions = {},
): number {
  return developChain(steps, parameters, options).length
}

function validateSteps(steps: readonly BendStep[]): void {
  for (const step of steps) {
    if (!Number.isFinite(step.angle) || step.angle === 0) {
      throw new SheetMetalError('A bend needs a non-zero angle')
    }
    if (Math.abs(step.angle) > 360) {
      throw new SheetMetalError('A bend cannot turn more than a full circle')
    }
    if (!(step.radius >= 0)) {
      throw new SheetMetalError('A bend radius cannot be negative')
    }
    if (!(step.straight >= 0)) {
      throw new SheetMetalError('A bend leaves too little material for its own setback')
    }
  }
}

function translate(point: Vec2, direction: Vec2, distance: number): Vec2 {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance }
}

function combine(a: Vec2, scaleA: number, b: Vec2, scaleB: number): Vec2 {
  return { x: a.x * scaleA + b.x * scaleB, y: a.y * scaleA + b.y * scaleB }
}

function weld(points: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = []
  for (const point of points) {
    const previous = result[result.length - 1]
    if (previous && isSame(previous, point)) continue
    result.push({ x: point.x, y: point.y })
  }
  const first = result[0]
  const last = result[result.length - 1]
  if (result.length > 1 && first && last && isSame(first, last)) result.pop()
  return result
}

function isSame(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) < WELD_TOLERANCE && Math.abs(a.y - b.y) < WELD_TOLERANCE
}

export function signedArea(loop: readonly Vec2[]): number {
  let total = 0
  for (let index = 0; index < loop.length; index += 1) {
    const a = loop[index] as Vec2
    const b = loop[(index + 1) % loop.length] as Vec2
    total += a.x * b.y - b.x * a.y
  }
  return total / 2
}

function orientCounterClockwise(loop: Vec2[]): Vec2[] {
  return signedArea(loop) >= 0 ? loop : loop.reverse()
}
