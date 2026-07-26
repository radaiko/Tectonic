import { HorizontalConstraint, VerticalConstraint } from './Constraint'
import type { Vec2 } from './geometry'
import { EPSILON, TAU, distance, pointOnCircle, sub } from './geometry'
import type { SketchModel } from './SketchModel'
import {
  ArcEntity,
  CircleEntity,
  EllipseEntity,
  LineEntity,
  PointEntity,
  PolygonEntity,
  RectangleEntity,
  SlotEntity,
  SplineEntity,
} from './SketchEntity'

/**
 * Composite entities (line, rectangle, slot, …) are assembled here so tools and
 * tests share one definition of "what a rectangle is made of".
 */

/** Either a position to create a point at, or an existing point to reuse. */
export type PointRef = Vec2 | { readonly pointId: string }

export interface BuildOptions {
  readonly isConstruction?: boolean
}

function isExistingPoint(ref: PointRef): ref is { pointId: string } {
  return 'pointId' in ref
}

/** Resolves a point reference to an entity id, creating the point if needed. */
export function resolvePoint(
  model: SketchModel,
  ref: PointRef,
  options: BuildOptions = {},
): string {
  if (isExistingPoint(ref)) return ref.pointId
  return model.addEntity(
    new PointEntity({ x: ref.x, y: ref.y, isConstruction: options.isConstruction ?? false }),
  ).id
}

export function buildLine(
  model: SketchModel,
  start: PointRef,
  end: PointRef,
  options: BuildOptions = {},
): LineEntity {
  return model.addEntity(
    new LineEntity({
      startPointId: resolvePoint(model, start, options),
      endPointId: resolvePoint(model, end, options),
      isConstruction: options.isConstruction ?? false,
    }),
  )
}

export function buildCircle(
  model: SketchModel,
  center: PointRef,
  radius: number,
  options: BuildOptions = {},
): CircleEntity {
  return model.addEntity(
    new CircleEntity({
      centerPointId: resolvePoint(model, center, options),
      radius,
      isConstruction: options.isConstruction ?? false,
    }),
  )
}

export interface RectangleOptions extends BuildOptions {
  /** When set, the first corner is the centre and the second a half-extent. */
  readonly fromCenter?: boolean
}

export function buildRectangle(
  model: SketchModel,
  first: Vec2,
  second: Vec2,
  options: RectangleOptions = {},
): RectangleEntity {
  const [min, max] = options.fromCenter
    ? [
        { x: first.x - Math.abs(second.x - first.x), y: first.y - Math.abs(second.y - first.y) },
        { x: first.x + Math.abs(second.x - first.x), y: first.y + Math.abs(second.y - first.y) },
      ]
    : [first, second]

  const construction = options.isConstruction ?? false
  const corners = [
    { x: min.x, y: min.y },
    { x: max.x, y: min.y },
    { x: max.x, y: max.y },
    { x: min.x, y: max.y },
  ].map((position) =>
    model.addEntity(new PointEntity({ ...position, isConstruction: construction })),
  )

  const lines = corners.map((corner, index) =>
    model.addEntity(
      new LineEntity({
        startPointId: corner.id,
        endPointId: (corners[(index + 1) % corners.length] as PointEntity).id,
        isConstruction: construction,
      }),
    ),
  )

  const rectangle = model.addEntity(
    new RectangleEntity({
      corner1PointId: (corners[0] as PointEntity).id,
      corner2PointId: (corners[1] as PointEntity).id,
      corner3PointId: (corners[2] as PointEntity).id,
      corner4PointId: (corners[3] as PointEntity).id,
      lineIds: lines.map((line) => line.id),
      isConstruction: construction,
    }),
  )

  // Bottom and top stay horizontal, left and right stay vertical.
  model.addConstraint(new HorizontalConstraint({ lineId: (lines[0] as LineEntity).id }))
  model.addConstraint(new VerticalConstraint({ lineId: (lines[1] as LineEntity).id }))
  model.addConstraint(new HorizontalConstraint({ lineId: (lines[2] as LineEntity).id }))
  model.addConstraint(new VerticalConstraint({ lineId: (lines[3] as LineEntity).id }))

  return rectangle
}

export function buildSlot(
  model: SketchModel,
  center1: PointRef,
  center2: PointRef,
  width: number,
  options: BuildOptions = {},
): SlotEntity {
  return model.addEntity(
    new SlotEntity({
      center1PointId: resolvePoint(model, center1, options),
      center2PointId: resolvePoint(model, center2, options),
      width,
      isConstruction: options.isConstruction ?? false,
    }),
  )
}

export interface PolygonOptions extends BuildOptions {
  readonly closed?: boolean
}

export function buildPolygon(
  model: SketchModel,
  vertices: readonly Vec2[],
  options: PolygonOptions = {},
): PolygonEntity {
  if (vertices.length < 2) throw new Error('A polygon needs at least two vertices')
  const construction = options.isConstruction ?? false
  const pointIds = vertices.map(
    (vertex) => model.addEntity(new PointEntity({ ...vertex, isConstruction: construction })).id,
  )
  return model.addEntity(
    new PolygonEntity({
      pointIds,
      closed: options.closed ?? true,
      isConstruction: construction,
    }),
  )
}

/** N-sided polygon inscribed in the circle of `radius` about `center`. */
export function buildRegularPolygon(
  model: SketchModel,
  center: Vec2,
  radius: number,
  sides: number,
  options: BuildOptions = {},
): PolygonEntity {
  if (sides < 3) throw new Error('A regular polygon needs at least three sides')
  const vertices = Array.from({ length: sides }, (_unused, index) =>
    pointOnCircle(center, radius, (index / sides) * TAU),
  )
  return buildPolygon(model, vertices, { ...options, closed: true })
}

export function buildEllipse(
  model: SketchModel,
  center: PointRef,
  majorAxisPoint: PointRef,
  minorRadius: number,
  options: BuildOptions = {},
): EllipseEntity {
  return model.addEntity(
    new EllipseEntity({
      centerPointId: resolvePoint(model, center, options),
      majorAxisPointId: resolvePoint(model, majorAxisPoint, options),
      minorRadius,
      isConstruction: options.isConstruction ?? false,
    }),
  )
}

export interface SplineOptions extends BuildOptions {
  readonly degree?: number
}

export function buildSpline(
  model: SketchModel,
  controlPoints: readonly Vec2[],
  options: SplineOptions = {},
): SplineEntity {
  if (controlPoints.length < 2) throw new Error('A spline needs at least two control points')
  const construction = options.isConstruction ?? false
  const controlPointIds = controlPoints.map(
    (point) => model.addEntity(new PointEntity({ ...point, isConstruction: construction })).id,
  )
  return model.addEntity(
    new SplineEntity({
      controlPointIds,
      degree: options.degree ?? 3,
      isConstruction: construction,
    }),
  )
}

/** Arc from a centre, a start point and a signed sweep in radians. */
export function buildCenterArc(
  model: SketchModel,
  center: Vec2,
  start: Vec2,
  sweep: number,
  options: BuildOptions = {},
): ArcEntity {
  const construction = options.isConstruction ?? false
  const radius = distance(center, start)
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const end = pointOnCircle(center, radius, startAngle + sweep)

  const centerPoint = model.addEntity(new PointEntity({ ...center, isConstruction: construction }))
  const startPoint = model.addEntity(new PointEntity({ ...start, isConstruction: construction }))
  const endPoint = model.addEntity(new PointEntity({ ...end, isConstruction: construction }))

  return model.addEntity(
    new ArcEntity({
      centerPointId: centerPoint.id,
      startPointId: startPoint.id,
      endPointId: endPoint.id,
      radius,
      clockwise: sweep < 0,
      isConstruction: construction,
    }),
  )
}

/**
 * Arc through three points. Returns `null` when the points are collinear and no
 * finite circumcircle exists.
 */
export function buildArcThroughPoints(
  model: SketchModel,
  start: Vec2,
  end: Vec2,
  through: Vec2,
  options: BuildOptions = {},
): ArcEntity | null {
  const center = circumcenter(start, through, end)
  if (!center) return null

  const construction = options.isConstruction ?? false
  const radius = distance(center, start)
  const centerPoint = model.addEntity(new PointEntity({ ...center, isConstruction: construction }))
  const startPoint = model.addEntity(new PointEntity({ ...start, isConstruction: construction }))
  const endPoint = model.addEntity(new PointEntity({ ...end, isConstruction: construction }))

  // The sign of the triangle area tells us which way the sweep runs.
  const toThrough = sub(through, start)
  const toEnd = sub(end, start)
  const clockwise = toThrough.x * toEnd.y - toThrough.y * toEnd.x > 0

  return model.addEntity(
    new ArcEntity({
      centerPointId: centerPoint.id,
      startPointId: startPoint.id,
      endPointId: endPoint.id,
      radius,
      clockwise,
      isConstruction: construction,
    }),
  )
}

export function circumcenter(a: Vec2, b: Vec2, c: Vec2): Vec2 | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < EPSILON) return null

  const aSquared = a.x * a.x + a.y * a.y
  const bSquared = b.x * b.x + b.y * b.y
  const cSquared = c.x * c.x + c.y * c.y
  return {
    x: (aSquared * (b.y - c.y) + bSquared * (c.y - a.y) + cSquared * (a.y - b.y)) / d,
    y: (aSquared * (c.x - b.x) + bSquared * (a.x - c.x) + cSquared * (b.x - a.x)) / d,
  }
}
