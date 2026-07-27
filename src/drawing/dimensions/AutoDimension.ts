import type { Vec2 } from '../../sketch/domain/geometry'
import type {
  Annotation,
  CenterMarkAnnotation,
  DimensionAnnotation,
  LinearDimension,
  RadialDimension,
  Tolerance,
} from '../domain/Annotation'
import { newAnnotationId } from '../domain/Annotation'
import type { Bounds2, Segment2 } from '../views/geometry2d'
import { boundsCenter, chainSegments, isClosedLoop } from '../views/geometry2d'
import type { ViewGeometry } from '../views/ViewGenerator'
import type { DimensionStyle } from './DimensionStyles'
import { DEFAULT_DIMENSION_STYLE } from './DimensionStyles'

/**
 * Putting the dimensions on for you.
 *
 * Automatic dimensioning is a placement problem more than a measuring one: what
 * to measure is mostly obvious, and what makes the result readable or useless
 * is whether the dimension lines land on top of each other. So every dimension
 * is assigned a lane on one of the four sides of the view, lanes are spaced by
 * the style's baseline spacing, and nothing is ever placed in an occupied one.
 * `dimensionBand` reports the strip a dimension takes up, which is both how the
 * placement decides and how a test can check the promise was kept.
 *
 * Round features are found by chaining the view's line work into loops and
 * asking whether a loop is the same distance from its own centre all the way
 * round — the tessellated circle test — which is what turns a hole into a
 * diameter callout rather than forty little lines.
 */

export type DimensionStrategy = 'overall' | 'baseline' | 'chain'

export interface AutoDimensionOptions {
  /** The view the dimensions belong to. */
  readonly viewId: string
  readonly style?: DimensionStyle
  readonly strategy?: DimensionStrategy
  /** Sheet millimetres per model unit — the view's scale times its unit size. */
  readonly scaleFactor?: number
  /** Dimension holes and round bosses. */
  readonly includeDiameters?: boolean
  /** Add a centre mark to every round feature found. */
  readonly includeCenterMarks?: boolean
  readonly precision?: number
  readonly tolerance?: Tolerance
  /** The point view-local coordinates are measured from. */
  readonly origin?: Vec2
  /** Stops runaway output on a busy view. */
  readonly maxDimensions?: number
  /** Features closer together than this, in model units, count as one. */
  readonly featureTolerance?: number
}

/** A round feature found in a view's line work. */
export interface RoundFeature {
  readonly center: Vec2
  readonly radius: number
  /** True when the loop went all the way round. */
  readonly closed: boolean
}

const DEFAULT_MAX_DIMENSIONS = 24

type Side = 'bottom' | 'top' | 'left' | 'right'

export function autoDimension(
  geometry: ViewGeometry,
  options: AutoDimensionOptions,
): Annotation[] {
  const style = options.style ?? DEFAULT_DIMENSION_STYLE
  const strategy = options.strategy ?? 'overall'
  const scaleFactor = options.scaleFactor ?? 1
  const limit = options.maxDimensions ?? DEFAULT_MAX_DIMENSIONS
  const origin = options.origin ?? boundsCenter(geometry.bounds)
  const featureTolerance =
    options.featureTolerance ?? Math.max(spanOf(geometry.bounds) * 1e-4, 1e-9)

  const local = (point: Vec2): Vec2 => ({ x: point.x - origin.x, y: point.y - origin.y })
  const bounds: Bounds2 = {
    minX: geometry.bounds.minX - origin.x,
    minY: geometry.bounds.minY - origin.y,
    maxX: geometry.bounds.maxX - origin.x,
    maxY: geometry.bounds.maxY - origin.y,
  }
  if (spanOf(bounds) <= 0) return []

  const lanes = new LaneAllocator(style)
  const annotations: Annotation[] = []

  const push = (annotation: Annotation): void => {
    if (annotations.length < limit) annotations.push(annotation)
  }

  const circles = options.includeDiameters === false ? [] : findRoundFeatures(geometry.visible)

  // Overall size first: it is the dimension nearest the geometry on each side,
  // and every other lane stacks outwards from it.
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  if (strategy === 'overall') {
    if (width > featureTolerance) {
      push(
        linear(
          options,
          style,
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          'horizontal',
          lanes.next('bottom'),
        ),
      )
    }
    if (height > featureTolerance) {
      push(
        linear(
          options,
          style,
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.minX, y: bounds.maxY },
          'vertical',
          lanes.next('left'),
        ),
      )
    }
  } else {
    const xs = featureCoordinates(geometry.visible, 'x', featureTolerance).map((value) => value - origin.x)
    const ys = featureCoordinates(geometry.visible, 'y', featureTolerance).map((value) => value - origin.y)
    for (const dimension of runDimensions(xs, bounds.minY, 'horizontal', strategy, options, style, lanes)) {
      push(dimension)
    }
    for (const dimension of runDimensions(ys, bounds.minX, 'vertical', strategy, options, style, lanes)) {
      push(dimension)
    }
  }

  // Round features get a diameter on a leader, fanned around the circle so two
  // holes in a row do not write over each other.
  circles.forEach((feature, index) => {
    const center = local(feature.center)
    push(diametric(options, style, center, feature.radius, index))
    if (options.includeCenterMarks !== false) push(centerMark(options, style, center))
  })

  return annotations
}

/** Chains the line work into loops and keeps the ones that are round. */
export function findRoundFeatures(
  segments: readonly Segment2[],
  tolerance = 0.02,
): RoundFeature[] {
  const features: RoundFeature[] = []

  for (const loop of chainSegments(segments)) {
    // Fewer than six points is a polygon, not a tessellated circle.
    if (loop.length < 6 || !isClosedLoop(loop)) continue

    const points = loop.slice(0, loop.length - 1)
    const center = centroid(points)
    let minRadius = Infinity
    let maxRadius = 0
    let total = 0
    for (const point of points) {
      const radius = Math.hypot(point.x - center.x, point.y - center.y)
      minRadius = Math.min(minRadius, radius)
      maxRadius = Math.max(maxRadius, radius)
      total += radius
    }
    const mean = total / points.length
    if (mean <= 0) continue
    // A tessellated circle's corners sit on the true radius and its edge
    // midpoints just inside, so a few percent of spread is expected.
    if ((maxRadius - minRadius) / mean > tolerance) continue

    features.push({ center, radius: mean, closed: true })
  }
  return features
}

/**
 * The strip of sheet a dimension occupies, in view-local millimetres. Two
 * dimensions whose bands do not meet cannot be drawn on top of each other.
 */
export function dimensionBand(
  annotation: DimensionAnnotation,
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE,
  scaleFactor = 1,
): Bounds2 | null {
  const half = style.textSize + style.textGap

  switch (annotation.type) {
    case 'linear-dimension':
    case 'aligned-dimension': {
      const start = { x: annotation.start.x * scaleFactor, y: annotation.start.y * scaleFactor }
      const end = { x: annotation.end.x * scaleFactor, y: annotation.end.y * scaleFactor }
      const direction = { x: end.x - start.x, y: end.y - start.y }
      const length = Math.hypot(direction.x, direction.y)
      if (length === 0) return null

      // The dimension line sits `offset` away along the left-hand normal.
      const normal = { x: -direction.y / length, y: direction.x / length }
      const lineStart = { x: start.x + normal.x * annotation.offset, y: start.y + normal.y * annotation.offset }
      const lineEnd = { x: end.x + normal.x * annotation.offset, y: end.y + normal.y * annotation.offset }
      return {
        minX: Math.min(lineStart.x, lineEnd.x) - Math.abs(normal.x) * half,
        minY: Math.min(lineStart.y, lineEnd.y) - Math.abs(normal.y) * half,
        maxX: Math.max(lineStart.x, lineEnd.x) + Math.abs(normal.x) * half,
        maxY: Math.max(lineStart.y, lineEnd.y) + Math.abs(normal.y) * half,
      }
    }
    case 'radial-dimension':
    case 'diametric-dimension': {
      const center = { x: annotation.center.x * scaleFactor, y: annotation.center.y * scaleFactor }
      const reach = annotation.radius * scaleFactor + style.offset
      const tip = {
        x: center.x + Math.cos(annotation.leaderAngle) * reach,
        y: center.y + Math.sin(annotation.leaderAngle) * reach,
      }
      return {
        minX: Math.min(center.x, tip.x) - half,
        minY: Math.min(center.y, tip.y) - half,
        maxX: Math.max(center.x, tip.x) + half,
        maxY: Math.max(center.y, tip.y) + half,
      }
    }
    case 'angular-dimension': {
      const vertex = { x: annotation.vertex.x * scaleFactor, y: annotation.vertex.y * scaleFactor }
      const reach = annotation.radius + half
      return {
        minX: vertex.x - reach,
        minY: vertex.y - reach,
        maxX: vertex.x + reach,
        maxY: vertex.y + reach,
      }
    }
    case 'ordinate-dimension': {
      const point = { x: annotation.point.x * scaleFactor, y: annotation.point.y * scaleFactor }
      return {
        minX: point.x - half,
        minY: point.y - half,
        maxX: point.x + half,
        maxY: point.y + half,
      }
    }
  }
}

/** Hands out non-overlapping lanes on each side of a view. */
class LaneAllocator {
  readonly #used: Record<Side, number> = { bottom: 0, top: 0, left: 0, right: 0 }
  readonly #style: DimensionStyle

  constructor(style: DimensionStyle) {
    this.#style = style
  }

  /** The signed offset, in millimetres, of the next free lane on this side. */
  next(side: Side): number {
    const lane = this.#used[side]
    this.#used[side] = lane + 1
    const distance = this.#style.offset + lane * this.#style.baselineSpacing
    // A dimension's offset is measured along the left normal of start→end, so
    // the sign depends on which way the run was written.
    return side === 'bottom' || side === 'right' ? -distance : distance
  }
}

function linear(
  options: AutoDimensionOptions,
  style: DimensionStyle,
  start: Vec2,
  end: Vec2,
  axis: 'horizontal' | 'vertical',
  offset: number,
): LinearDimension {
  const dimension: LinearDimension = {
    id: newAnnotationId(),
    type: 'linear-dimension',
    viewId: options.viewId,
    position: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    start,
    end,
    offset,
    axis,
    precision: options.precision ?? style.precision,
  }
  return options.tolerance ? { ...dimension, tolerance: options.tolerance } : dimension
}

function diametric(
  options: AutoDimensionOptions,
  style: DimensionStyle,
  center: Vec2,
  radius: number,
  index: number,
): RadialDimension {
  // Fan the leaders around the clock so a row of holes reads cleanly.
  const angle = (Math.PI / 4) * (1 + (index % 8))
  return {
    id: newAnnotationId(),
    type: 'diametric-dimension',
    viewId: options.viewId,
    position: center,
    center,
    radius,
    leaderAngle: angle,
    precision: options.precision ?? style.precision,
  }
}

function centerMark(
  options: AutoDimensionOptions,
  style: DimensionStyle,
  center: Vec2,
): CenterMarkAnnotation {
  return {
    id: newAnnotationId(),
    type: 'center-mark',
    viewId: options.viewId,
    position: center,
    center,
    size: style.textSize,
  }
}

/** Baseline runs measure from the first coordinate; chains measure neighbours. */
function runDimensions(
  coordinates: readonly number[],
  base: number,
  axis: 'horizontal' | 'vertical',
  strategy: DimensionStrategy,
  options: AutoDimensionOptions,
  style: DimensionStyle,
  lanes: LaneAllocator,
): LinearDimension[] {
  if (coordinates.length < 2) return []

  const side: Side = axis === 'horizontal' ? 'bottom' : 'left'
  const at = (value: number): Vec2 => (axis === 'horizontal' ? { x: value, y: base } : { x: base, y: value })
  const first = coordinates[0] as number

  const dimensions: LinearDimension[] = []
  for (let index = 1; index < coordinates.length; index += 1) {
    const from = strategy === 'chain' ? (coordinates[index - 1] as number) : first
    const to = coordinates[index] as number
    // A chain sits in one lane: its dimensions are end to end, not stacked.
    const offset = strategy === 'chain' && index > 1 ? lastOffset(dimensions) : lanes.next(side)
    dimensions.push(linear(options, style, at(from), at(to), axis, offset))
  }
  return dimensions
}

function lastOffset(dimensions: readonly LinearDimension[]): number {
  return dimensions[dimensions.length - 1]?.offset ?? 0
}

/**
 * Distinct x or y coordinates where the line work has an edge square to that
 * axis — the places a dimension would sensibly start or stop.
 */
export function featureCoordinates(
  segments: readonly Segment2[],
  axis: 'x' | 'y',
  tolerance: number,
): number[] {
  const values: number[] = []
  for (const segment of segments) {
    const along = axis === 'x' ? segment.b.y - segment.a.y : segment.b.x - segment.a.x
    const across = axis === 'x' ? segment.b.x - segment.a.x : segment.b.y - segment.a.y
    // Square to the axis: no travel along it, some across.
    if (Math.abs(across) > tolerance || Math.abs(along) <= tolerance) continue
    values.push(axis === 'x' ? segment.a.x : segment.a.y)
  }

  values.sort((first, second) => first - second)
  const distinct: number[] = []
  for (const value of values) {
    const previous = distinct[distinct.length - 1]
    if (previous === undefined || Math.abs(value - previous) > tolerance) distinct.push(value)
  }
  return distinct
}

function centroid(points: readonly Vec2[]): Vec2 {
  let x = 0
  let y = 0
  for (const point of points) {
    x += point.x
    y += point.y
  }
  return { x: x / points.length, y: y / points.length }
}

function spanOf(bounds: Bounds2): number {
  return Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
}
