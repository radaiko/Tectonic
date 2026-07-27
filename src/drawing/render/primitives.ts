import type { Vec2 } from '../../sketch/domain/geometry'

/**
 * What a drawing turns into before anybody draws it.
 *
 * One flat list of lines, arcs, text and filled shapes in sheet millimetres,
 * origin bottom-left and y pointing up. Four things consume it — the editor's
 * SVG canvas, and the SVG, DXF and PDF exporters — and none of them has to know
 * what a feature control frame is. Anything that reads as "drafting" belongs on
 * this side of the boundary; anything that reads as "file format" belongs on
 * the other.
 */

export const RENDER_LAYERS = [
  'sheet',
  'frame',
  'visible',
  'hidden',
  'tangent',
  'section',
  'hatch',
  'centerline',
  'phantom',
  'dimension',
  'text',
] as const

export type RenderLayer = (typeof RENDER_LAYERS)[number]

export interface StrokeStyle {
  /** Line width in millimetres. */
  readonly width: number
  /** Dash pattern in millimetres. Solid when absent. */
  readonly dash?: readonly number[]
  readonly color: string
}

export type TextAnchor = 'start' | 'middle' | 'end'

export interface RenderBase {
  readonly layer: RenderLayer
  /** The view or annotation this came from, for picking in the editor. */
  readonly sourceId?: string
}

export interface RenderLine extends RenderBase {
  readonly kind: 'line'
  readonly a: Vec2
  readonly b: Vec2
  readonly stroke: StrokeStyle
}

export interface RenderPolyline extends RenderBase {
  readonly kind: 'polyline'
  readonly points: readonly Vec2[]
  readonly closed: boolean
  readonly stroke: StrokeStyle
  readonly fill?: string
}

export interface RenderPolygon extends RenderBase {
  readonly kind: 'polygon'
  readonly points: readonly Vec2[]
  readonly fill: string
  readonly stroke?: StrokeStyle
}

export interface RenderCircle extends RenderBase {
  readonly kind: 'circle'
  readonly center: Vec2
  readonly radius: number
  readonly stroke: StrokeStyle
  readonly fill?: string
}

export interface RenderArc extends RenderBase {
  readonly kind: 'arc'
  readonly center: Vec2
  readonly radius: number
  /** Radians, counter-clockwise from +x. */
  readonly startAngle: number
  readonly endAngle: number
  readonly stroke: StrokeStyle
}

export interface RenderText extends RenderBase {
  readonly kind: 'text'
  readonly position: Vec2
  readonly text: string
  /** Cap height in millimetres. */
  readonly size: number
  readonly anchor: TextAnchor
  /** Radians, counter-clockwise. */
  readonly rotation?: number
  readonly color: string
}

export type RenderPrimitive =
  | RenderLine
  | RenderPolyline
  | RenderPolygon
  | RenderCircle
  | RenderArc
  | RenderText

/** Line weights and colours, per ISO 128 line types. */
export const LINE_STYLES: Readonly<Record<RenderLayer, StrokeStyle>> = {
  sheet: { width: 0.18, color: '#c8ccd4' },
  frame: { width: 0.7, color: '#000000' },
  visible: { width: 0.5, color: '#000000' },
  hidden: { width: 0.25, color: '#000000', dash: [2.5, 1.2] },
  tangent: { width: 0.18, color: '#555555', dash: [4, 1.5] },
  section: { width: 0.7, color: '#000000' },
  hatch: { width: 0.18, color: '#333333' },
  centerline: { width: 0.25, color: '#000000', dash: [8, 1.5, 1.5, 1.5] },
  phantom: { width: 0.25, color: '#000000', dash: [10, 1.5, 2.5, 1.5, 2.5, 1.5] },
  dimension: { width: 0.25, color: '#000000' },
  text: { width: 0.25, color: '#000000' },
}

export function strokeFor(layer: RenderLayer): StrokeStyle {
  return LINE_STYLES[layer]
}

export function line(a: Vec2, b: Vec2, layer: RenderLayer, sourceId?: string): RenderLine {
  const base = { kind: 'line' as const, a, b, layer, stroke: strokeFor(layer) }
  return sourceId === undefined ? base : { ...base, sourceId }
}

export function text(
  position: Vec2,
  content: string,
  size: number,
  options: {
    readonly anchor?: TextAnchor
    readonly rotation?: number
    readonly color?: string
    readonly layer?: RenderLayer
    readonly sourceId?: string
  } = {},
): RenderText {
  const base: RenderText = {
    kind: 'text',
    position,
    text: content,
    size,
    anchor: options.anchor ?? 'start',
    color: options.color ?? LINE_STYLES.text.color,
    layer: options.layer ?? 'text',
  }
  const withRotation = options.rotation === undefined ? base : { ...base, rotation: options.rotation }
  return options.sourceId === undefined ? withRotation : { ...withRotation, sourceId: options.sourceId }
}

/**
 * A workable width for a run of text, in millimetres.
 *
 * The renderers use a single-weight sans face and none of them can measure it
 * without a DOM, so one ratio stands in everywhere. It only has to be close:
 * it decides how wide a box is drawn around a symbol, not whether the text
 * fits on the sheet.
 */
export const TEXT_WIDTH_RATIO = 0.6

export function textWidth(content: string, size: number): number {
  return content.length * size * TEXT_WIDTH_RATIO
}

/** Turns a run of points into one polyline primitive. */
export function polyline(
  points: readonly Vec2[],
  layer: RenderLayer,
  options: { readonly closed?: boolean; readonly fill?: string; readonly sourceId?: string } = {},
): RenderPolyline {
  const base: RenderPolyline = {
    kind: 'polyline',
    points,
    closed: options.closed ?? false,
    layer,
    stroke: strokeFor(layer),
  }
  const withFill = options.fill === undefined ? base : { ...base, fill: options.fill }
  return options.sourceId === undefined ? withFill : { ...withFill, sourceId: options.sourceId }
}

export function polygon(
  points: readonly Vec2[],
  fill: string,
  layer: RenderLayer,
  sourceId?: string,
): RenderPolygon {
  const base: RenderPolygon = { kind: 'polygon', points, fill, layer }
  return sourceId === undefined ? base : { ...base, sourceId }
}

export function circle(
  center: Vec2,
  radius: number,
  layer: RenderLayer,
  options: { readonly fill?: string; readonly sourceId?: string } = {},
): RenderCircle {
  const base: RenderCircle = { kind: 'circle', center, radius, layer, stroke: strokeFor(layer) }
  const withFill = options.fill === undefined ? base : { ...base, fill: options.fill }
  return options.sourceId === undefined ? withFill : { ...withFill, sourceId: options.sourceId }
}

export function arc(
  center: Vec2,
  radius: number,
  startAngle: number,
  endAngle: number,
  layer: RenderLayer,
  sourceId?: string,
): RenderArc {
  const base: RenderArc = { kind: 'arc', center, radius, startAngle, endAngle, layer, stroke: strokeFor(layer) }
  return sourceId === undefined ? base : { ...base, sourceId }
}

/** A rectangle as a closed polyline, the way every block on a sheet is drawn. */
export function rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  layer: RenderLayer,
  sourceId?: string,
): RenderPolyline {
  const points: Vec2[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
  return polyline(points, layer, sourceId === undefined ? { closed: true } : { closed: true, sourceId })
}

/** The box every primitive in the list fits inside, in sheet millimetres. */
export function primitiveBounds(primitives: readonly RenderPrimitive[]): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const include = (point: Vec2): void => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  for (const primitive of primitives) {
    switch (primitive.kind) {
      case 'line':
        include(primitive.a)
        include(primitive.b)
        break
      case 'polyline':
      case 'polygon':
        for (const point of primitive.points) include(point)
        break
      case 'circle':
      case 'arc':
        include({ x: primitive.center.x - primitive.radius, y: primitive.center.y - primitive.radius })
        include({ x: primitive.center.x + primitive.radius, y: primitive.center.y + primitive.radius })
        break
      case 'text':
        include(primitive.position)
        include({
          x: primitive.position.x + textWidth(primitive.text, primitive.size),
          y: primitive.position.y + primitive.size,
        })
        break
    }
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}
