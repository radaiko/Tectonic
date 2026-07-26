import type { Vec2 } from '../sketch/domain/geometry'
import { TAU } from '../sketch/domain/geometry'
import { ImportError } from './types'

/**
 * SVG path data, turned into explicit segments with absolute endpoints. Every
 * shorthand — relative commands, H/V, the smooth S/T reflections — is resolved
 * here so consumers only ever see four segment kinds.
 */

export interface LineSegment {
  readonly kind: 'line'
  readonly from: Vec2
  readonly to: Vec2
}

export interface CubicSegment {
  readonly kind: 'cubic'
  readonly from: Vec2
  readonly control1: Vec2
  readonly control2: Vec2
  readonly to: Vec2
}

export interface QuadraticSegment {
  readonly kind: 'quadratic'
  readonly from: Vec2
  readonly control: Vec2
  readonly to: Vec2
}

export interface ArcSegment {
  readonly kind: 'arc'
  readonly from: Vec2
  readonly to: Vec2
  readonly rx: number
  readonly ry: number
  /** Rotation of the ellipse's x axis, in radians. */
  readonly xAxisRotation: number
  readonly largeArc: boolean
  /** True when the arc sweeps in the direction of increasing angle. */
  readonly sweep: boolean
}

export type PathSegment = LineSegment | CubicSegment | QuadraticSegment | ArcSegment

export interface SubPath {
  readonly start: Vec2
  readonly segments: readonly PathSegment[]
  readonly closed: boolean
}

const COMMAND_PATTERN = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g
const NUMBER_PATTERN = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g

function readArgs(source: string): number[] {
  return (source.match(NUMBER_PATTERN) ?? []).map(Number).filter((value) => Number.isFinite(value))
}

/** Splits path data into its sub-paths. Throws only on unreadable commands. */
export function parsePathData(data: string): SubPath[] {
  const subPaths: SubPath[] = []
  let segments: PathSegment[] = []
  let start: Vec2 = { x: 0, y: 0 }
  let current: Vec2 = { x: 0, y: 0 }
  let open = false
  /** Reflection anchors for the smooth S/T shorthands. */
  let lastCubicControl: Vec2 | null = null
  let lastQuadraticControl: Vec2 | null = null

  const flush = (closed: boolean): void => {
    if (open && segments.length > 0) subPaths.push({ start, segments, closed })
    segments = []
    open = false
  }

  COMMAND_PATTERN.lastIndex = 0
  let match = COMMAND_PATTERN.exec(data)
  if (match === null && data.trim() !== '') {
    throw new ImportError(`Path data does not begin with a command: "${data.trim().slice(0, 20)}"`)
  }

  while (match) {
    const command = match[1] as string
    const relative = command === command.toLowerCase() && command !== 'Z' && command !== 'z'
    const upper = command.toUpperCase()
    const args = readArgs(match[2] ?? '')
    const point = (x: number, y: number): Vec2 =>
      relative ? { x: current.x + x, y: current.y + y } : { x, y }

    if (upper === 'Z') {
      if (open && segments.length > 0) {
        if (current.x !== start.x || current.y !== start.y) {
          segments.push({ kind: 'line', from: current, to: start })
        }
        flush(true)
      }
      // A command after Z starts a fresh sub-path from the same point.
      current = start
      open = true
      lastCubicControl = null
      lastQuadraticControl = null
      match = COMMAND_PATTERN.exec(data)
      continue
    }

    const stride = STRIDE[upper]
    if (stride === undefined) throw new ImportError(`Unsupported path command "${command}"`)
    if (args.length < stride) {
      throw new ImportError(`Path command "${command}" needs ${stride} numbers, got ${args.length}`)
    }

    for (let offset = 0; offset + stride <= args.length; offset += stride) {
      const value = (index: number): number => args[offset + index] as number

      switch (upper) {
        case 'M': {
          // A moveto starts a new sub-path; repeated pairs are implicit linetos.
          const target = point(value(0), value(1))
          if (offset === 0) {
            flush(false)
            start = target
            open = true
          } else {
            segments.push({ kind: 'line', from: current, to: target })
          }
          current = target
          break
        }
        case 'L': {
          const target = point(value(0), value(1))
          segments.push({ kind: 'line', from: current, to: target })
          current = target
          break
        }
        case 'H': {
          const target = { x: relative ? current.x + value(0) : value(0), y: current.y }
          segments.push({ kind: 'line', from: current, to: target })
          current = target
          break
        }
        case 'V': {
          const target = { x: current.x, y: relative ? current.y + value(0) : value(0) }
          segments.push({ kind: 'line', from: current, to: target })
          current = target
          break
        }
        case 'C': {
          const control1 = point(value(0), value(1))
          const control2 = point(value(2), value(3))
          const target = point(value(4), value(5))
          segments.push({ kind: 'cubic', from: current, control1, control2, to: target })
          lastCubicControl = control2
          current = target
          break
        }
        case 'S': {
          const control1 = lastCubicControl ? reflect(current, lastCubicControl) : current
          const control2 = point(value(0), value(1))
          const target = point(value(2), value(3))
          segments.push({ kind: 'cubic', from: current, control1, control2, to: target })
          lastCubicControl = control2
          current = target
          break
        }
        case 'Q': {
          const control = point(value(0), value(1))
          const target = point(value(2), value(3))
          segments.push({ kind: 'quadratic', from: current, control, to: target })
          lastQuadraticControl = control
          current = target
          break
        }
        case 'T': {
          const control = lastQuadraticControl ? reflect(current, lastQuadraticControl) : current
          const target = point(value(0), value(1))
          segments.push({ kind: 'quadratic', from: current, control, to: target })
          lastQuadraticControl = control
          current = target
          break
        }
        case 'A': {
          const target = point(value(5), value(6))
          segments.push({
            kind: 'arc',
            from: current,
            to: target,
            rx: Math.abs(value(0)),
            ry: Math.abs(value(1)),
            xAxisRotation: (value(2) * Math.PI) / 180,
            largeArc: value(3) !== 0,
            sweep: value(4) !== 0,
          })
          current = target
          break
        }
      }

      if (upper !== 'C' && upper !== 'S') lastCubicControl = null
      if (upper !== 'Q' && upper !== 'T') lastQuadraticControl = null
    }

    match = COMMAND_PATTERN.exec(data)
  }

  flush(false)
  return subPaths
}

const STRIDE: Readonly<Record<string, number>> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
}

function reflect(about: Vec2, point: Vec2): Vec2 {
  return { x: 2 * about.x - point.x, y: 2 * about.y - point.y }
}

/** An SVG arc in centre parameterisation, the form geometry code can use. */
export interface ArcCenter {
  readonly center: Vec2
  readonly rx: number
  readonly ry: number
  readonly xAxisRotation: number
  readonly startAngle: number
  readonly deltaAngle: number
}

/**
 * Endpoint to centre parameterisation, following SVG's implementation notes
 * (F.6.5). Returns `null` for the degenerate cases the spec says to draw as a
 * straight line: a zero radius, or coincident endpoints.
 */
export function arcToCenter(segment: ArcSegment): ArcCenter | null {
  const { from, to, xAxisRotation, largeArc, sweep } = segment
  if (segment.rx === 0 || segment.ry === 0) return null
  if (from.x === to.x && from.y === to.y) return null

  const cos = Math.cos(xAxisRotation)
  const sin = Math.sin(xAxisRotation)
  const dx = (from.x - to.x) / 2
  const dy = (from.y - to.y) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy

  // Radii too small to reach both endpoints are scaled up, as the spec requires.
  let rx = segment.rx
  let ry = segment.ry
  const oversize = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (oversize > 1) {
    const factor = Math.sqrt(oversize)
    rx *= factor
    ry *= factor
  }

  const numerator = Math.max(0, rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1)
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const factor = (largeArc === sweep ? -1 : 1) * Math.sqrt(denominator === 0 ? 0 : numerator / denominator)
  const cx1 = (factor * rx * y1) / ry
  const cy1 = (-factor * ry * x1) / rx

  const center = {
    x: cos * cx1 - sin * cy1 + (from.x + to.x) / 2,
    y: sin * cx1 + cos * cy1 + (from.y + to.y) / 2,
  }

  const startAngle = Math.atan2((y1 - cy1) / ry, (x1 - cx1) / rx)
  const endAngle = Math.atan2((-y1 - cy1) / ry, (-x1 - cx1) / rx)
  let deltaAngle = endAngle - startAngle
  if (!sweep && deltaAngle > 0) deltaAngle -= TAU
  if (sweep && deltaAngle < 0) deltaAngle += TAU

  return { center, rx, ry, xAxisRotation, startAngle, deltaAngle }
}

/** Samples an arc into `segments + 1` points, endpoints included. */
export function sampleArc(arc: ArcCenter, segments: number): Vec2[] {
  const cos = Math.cos(arc.xAxisRotation)
  const sin = Math.sin(arc.xAxisRotation)

  return Array.from({ length: segments + 1 }, (_unused, index) => {
    const angle = arc.startAngle + (index / segments) * arc.deltaAngle
    const localX = arc.rx * Math.cos(angle)
    const localY = arc.ry * Math.sin(angle)
    return {
      x: arc.center.x + localX * cos - localY * sin,
      y: arc.center.y + localX * sin + localY * cos,
    }
  })
}

export function cubicPoint(segment: CubicSegment, t: number): Vec2 {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * segment.from.x + b * segment.control1.x + c * segment.control2.x + d * segment.to.x,
    y: a * segment.from.y + b * segment.control1.y + c * segment.control2.y + d * segment.to.y,
  }
}

export function quadraticPoint(segment: QuadraticSegment, t: number): Vec2 {
  const u = 1 - t
  return {
    x: u * u * segment.from.x + 2 * u * t * segment.control.x + t * t * segment.to.x,
    y: u * u * segment.from.y + 2 * u * t * segment.control.y + t * t * segment.to.y,
  }
}
