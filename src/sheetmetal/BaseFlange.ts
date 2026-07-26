import type { IKernel, PlaneFrame, ShapeHandle } from '../kernel/IKernel'
import { planeFrame, toWorld } from '../features/geometry/plane'
import { sketchPath, sketchProfiles } from '../features/geometry/profile'
import type { SketchModel, SketchPlane } from '../sketch/domain/SketchModel'
import type { Vec2 } from '../sketch/domain/geometry'
import type { SheetMetalParameters } from './SheetMetalParameters'
import { chainProfile } from './bend'
import type { ChainOptions } from './bend'
import { loopEdges, normalizeLoop, planeDirection, segmentLengths, turnAngles } from './geometry'
import type { BaseProfileKind, BendStep, SheetEdge } from './types'
import { SheetMetalError } from './types'

export type { BaseProfileKind } from './types'
export { BASE_PROFILE_KINDS } from './types'

export interface BaseFlangeSpec {
  readonly profileKind: BaseProfileKind
  /** Outline of the face, or the cross-section to sweep, in sketch 2D space. */
  readonly points: readonly Vec2[]
  /** Openings in a closed face. Ignored by an open cross-section. */
  readonly holes: readonly (readonly Vec2[])[]
  /** How far an open cross-section is swept along the sketch normal. */
  readonly width: number
  readonly plane: SketchPlane
  readonly planeOffset: number
}

export interface BaseFlangeInit {
  readonly profileKind?: BaseProfileKind
  readonly points: readonly Vec2[]
  readonly holes?: readonly (readonly Vec2[])[]
  readonly width?: number
  readonly plane?: SketchPlane
  readonly planeOffset?: number
}

export function createBaseFlange(init: BaseFlangeInit): BaseFlangeSpec {
  const spec: BaseFlangeSpec = {
    profileKind: init.profileKind ?? 'closed',
    points: init.points.map((point) => ({ x: point.x, y: point.y })),
    holes: (init.holes ?? []).map((hole) => hole.map((point) => ({ x: point.x, y: point.y }))),
    width: init.width ?? 50,
    plane: init.plane ?? 'XY',
    planeOffset: init.planeOffset ?? 0,
  }
  validateBaseFlange(spec)
  return spec
}

export function validateBaseFlange(spec: BaseFlangeSpec): void {
  if (spec.profileKind === 'closed') {
    if (spec.points.length < 3) {
      throw new SheetMetalError('A closed base flange needs at least three points')
    }
    return
  }
  if (spec.points.length < 2) {
    throw new SheetMetalError('An open base flange needs at least two points')
  }
  if (!(spec.width > 0)) {
    throw new SheetMetalError('An open base flange needs a positive width')
  }
}

/** World placement of the sketch the base flange was drawn on. */
export function baseFlangeFrame(spec: BaseFlangeSpec): PlaneFrame {
  return planeFrame(spec.plane, spec.planeOffset)
}

/**
 * The edges further features can attach to. An open cross-section already
 * carries its own bends, so it exposes none — flanges belong on the closed
 * face a plate starts from.
 */
export function baseFlangeEdges(spec: BaseFlangeSpec): SheetEdge[] {
  return spec.profileKind === 'closed' ? loopEdges(spec.points) : []
}

/**
 * The bend chain an open cross-section folds through: one bend per interior
 * vertex, with every straight run shortened by the setback of the bends at
 * either end of it.
 */
export function contourChain(
  spec: BaseFlangeSpec,
  parameters: SheetMetalParameters,
): { readonly steps: BendStep[]; readonly options: ChainOptions } {
  if (spec.profileKind !== 'open') {
    throw new SheetMetalError('Only an open base flange folds through a contour')
  }

  const lengths = segmentLengths(spec.points)
  const turns = turnAngles(spec.points)
  const radius = parameters.innerRadius
  const setbacks = turns.map((turn) => parameters.outsideSetback(turn, radius))

  const startStation = (lengths[0] as number) - (setbacks[0] ?? 0)
  const steps: BendStep[] = turns.map((turn, index) => ({
    angle: turn,
    radius,
    straight: round(
      (lengths[index + 1] as number) - (setbacks[index] as number) - (setbacks[index + 1] ?? 0),
    ),
  }))

  if (startStation < 0) {
    throw new SheetMetalError('The first segment of the contour is shorter than its bend')
  }
  return { steps, options: { startStation, startExtent: startStation } }
}

/**
 * The folded body, as a kernel shape.
 *
 * A closed profile becomes a flat plate of the sheet's thickness; an open one is
 * folded through its own bends and swept sideways by the flange's width.
 */
export async function buildBaseFlange(
  kernel: IKernel,
  spec: BaseFlangeSpec,
  parameters: SheetMetalParameters,
): Promise<ShapeHandle> {
  validateBaseFlange(spec)
  const frame = baseFlangeFrame(spec)

  if (spec.profileKind === 'closed') {
    return kernel.extrude({
      profile: { points: normalizeLoop(spec.points), holes: spec.holes },
      distance: parameters.thickness,
      plane: frame,
    })
  }

  const { steps, options } = contourChain(spec, parameters)
  const first = spec.points[0] as Vec2
  const second = spec.points[1] as Vec2
  const along = unit({ x: second.x - first.x, y: second.y - first.y })

  return kernel.extrude({
    profile: { points: chainProfile(steps, parameters, options) },
    distance: spec.width,
    plane: {
      origin: toWorld(frame, first),
      xAxis: planeDirection(frame, along),
      // Left of the sweep direction: the side the sheet's thickness grows into.
      yAxis: planeDirection(frame, { x: -along.y, y: along.x }),
    },
  })
}

/**
 * Reads a base flange out of a sketch: its first closed region, or its longest
 * open chain when the sketch is a cross-section.
 */
export function baseFlangeFromSketch(
  sketch: SketchModel,
  options: {
    readonly profileKind?: BaseProfileKind
    readonly width?: number
    readonly planeOffset?: number
    readonly entityIds?: readonly string[]
  } = {},
): BaseFlangeSpec {
  const kind = options.profileKind ?? 'closed'
  const entityIds = options.entityIds ?? []

  if (kind === 'closed') {
    const profile = sketchProfiles(sketch, entityIds)[0]
    if (!profile) {
      throw new SheetMetalError(`Sketch "${sketch.name}" has no closed profile to build from`)
    }
    return createBaseFlange({
      profileKind: 'closed',
      points: profile.points,
      holes: profile.holes ?? [],
      plane: sketch.plane,
      ...(options.planeOffset === undefined ? {} : { planeOffset: options.planeOffset }),
    })
  }

  const path = sketchPath(sketch, entityIds)
  if (path.length < 2) {
    throw new SheetMetalError(`Sketch "${sketch.name}" has no open contour to fold`)
  }
  return createBaseFlange({
    profileKind: 'open',
    points: path,
    plane: sketch.plane,
    ...(options.width === undefined ? {} : { width: options.width }),
    ...(options.planeOffset === undefined ? {} : { planeOffset: options.planeOffset }),
  })
}

function unit(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y)
  if (!(length > 0)) throw new SheetMetalError('A contour cannot start with a zero-length segment')
  return { x: vector.x / length, y: vector.y / length }
}

/** Trims floating point dust so a straight run of exactly zero is not negative. */
function round(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value
}
