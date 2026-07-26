import type { SketchPlane } from '../sketch/domain/SketchModel'
import { SketchModel } from '../sketch/domain/SketchModel'
import type { Vec2 } from '../sketch/domain/geometry'
import { distance } from '../sketch/domain/geometry'
import {
  buildCircle,
  buildEllipse,
  buildLine,
  buildPolygon,
  buildSpline,
} from '../sketch/domain/builders'
import { ArcEntity, PointEntity } from '../sketch/domain/SketchEntity'
import type { Matrix2D } from './matrix2d'
import {
  IDENTITY,
  applyMatrix,
  determinant,
  isUniformMatrix,
  multiply,
  parseTransform,
  uniformScaleOf,
} from './matrix2d'
import type { ArcSegment, PathSegment, SubPath } from './svgPath'
import { arcToCenter, parsePathData, sampleArc } from './svgPath'
import type { XmlNode } from './xml'
import { localName, parseXml } from './xml'
import { ImportError } from './types'

/**
 * SVG reading. Paths and the basic shapes become sketch geometry; groups and
 * element transforms are composed on the way down so a nested, transformed
 * drawing lands where it looks like it should.
 *
 * SVG's y axis points down and a sketch's points up, so the whole drawing is
 * mirrored on import. With a viewBox the mirror is about the box, which keeps
 * the artwork where the author put it rather than below the axis.
 */

export interface SvgViewBox {
  readonly minX: number
  readonly minY: number
  readonly width: number
  readonly height: number
}

export interface SvgImportOptions {
  readonly name?: string
  readonly plane?: SketchPlane
  /** Mirror the drawing so its y axis points up. On by default. */
  readonly flipY?: boolean
  /** Uniform scale applied after the flip. */
  readonly scale?: number
  /** Points per curve when a segment has to be tessellated. */
  readonly segments?: number
  /** Radii within this fraction of each other count as circular. */
  readonly circularTolerance?: number
}

export interface SvgImportResult {
  readonly sketch: SketchModel
  readonly viewBox: SvgViewBox | null
  readonly width: number | null
  readonly height: number | null
  /** How many drawable elements were converted. */
  readonly elementCount: number
}

const DEFAULT_SEGMENTS = 32
const CIRCULAR_TOLERANCE = 1e-6

export function importSvg(source: string, options: SvgImportOptions = {}): SvgImportResult {
  const root = parseXml(source)
  if (localName(root.tag) !== 'svg') throw new ImportError(`Root element is <${root.tag}>, not <svg>`)

  const viewBox = parseViewBox(root.attrs.viewBox)
  const width = parseLength(root.attrs.width)
  const height = parseLength(root.attrs.height)
  const sketch = new SketchModel({
    name: options.name ?? 'Imported SVG',
    plane: options.plane ?? 'XY',
  })

  const context: ImportContext = {
    sketch,
    segments: options.segments ?? DEFAULT_SEGMENTS,
    circularTolerance: options.circularTolerance ?? CIRCULAR_TOLERANCE,
    count: 0,
  }

  const root2d = rootMatrix(viewBox, options)
  for (const child of root.children) visit(child, root2d, context)

  return { sketch, viewBox, width, height, elementCount: context.count }
}

/** The flip and scale every element sits inside. */
function rootMatrix(viewBox: SvgViewBox | null, options: SvgImportOptions): Matrix2D {
  const scale = options.scale ?? 1
  if (options.flipY === false) {
    return { a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 }
  }
  // Mirror about the middle of the viewBox so the drawing stays put.
  const offset = viewBox ? 2 * viewBox.minY + viewBox.height : 0
  return { a: scale, b: 0, c: 0, d: -scale, e: 0, f: offset * scale }
}

export function parseViewBox(source: string | undefined): SvgViewBox | null {
  if (!source) return null
  const values = source
    .split(/[\s,]+/)
    .filter((token) => token.length > 0)
    .map(Number)
  if (values.length < 4 || values.some((value) => !Number.isFinite(value))) return null
  return {
    minX: values[0] as number,
    minY: values[1] as number,
    width: values[2] as number,
    height: values[3] as number,
  }
}

/** A length attribute, ignoring any CSS unit suffix. */
export function parseLength(source: string | undefined): number | null {
  if (!source) return null
  const match = /^\s*([-+]?[\d.]+(?:[eE][-+]?\d+)?)/.exec(source)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

interface ImportContext {
  readonly sketch: SketchModel
  readonly segments: number
  readonly circularTolerance: number
  count: number
}

function visit(node: XmlNode, parent: Matrix2D, context: ImportContext): void {
  const matrix = node.attrs.transform
    ? multiply(parent, parseTransform(node.attrs.transform))
    : parent

  switch (localName(node.tag)) {
    case 'g':
    case 'svg':
      break
    case 'path':
      if (node.attrs.d) {
        for (const subPath of parsePathData(node.attrs.d)) {
          convertSubPath(subPath, matrix, context)
        }
        context.count += 1
      }
      return
    case 'line': {
      const start = { x: number(node.attrs.x1), y: number(node.attrs.y1) }
      const end = { x: number(node.attrs.x2), y: number(node.attrs.y2) }
      buildLine(context.sketch, applyMatrix(matrix, start), applyMatrix(matrix, end))
      context.count += 1
      return
    }
    case 'circle': {
      const center = { x: number(node.attrs.cx), y: number(node.attrs.cy) }
      addCircleOrEllipse(center, number(node.attrs.r), number(node.attrs.r), matrix, context)
      context.count += 1
      return
    }
    case 'ellipse': {
      const center = { x: number(node.attrs.cx), y: number(node.attrs.cy) }
      addCircleOrEllipse(center, number(node.attrs.rx), number(node.attrs.ry), matrix, context)
      context.count += 1
      return
    }
    case 'rect': {
      const x = number(node.attrs.x)
      const y = number(node.attrs.y)
      const width = number(node.attrs.width)
      const height = number(node.attrs.height)
      if (width > 0 && height > 0) {
        buildPolygon(
          context.sketch,
          [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height },
          ].map((corner) => applyMatrix(matrix, corner)),
          { closed: true },
        )
        context.count += 1
      }
      return
    }
    case 'polyline':
    case 'polygon': {
      const points = parsePoints(node.attrs.points ?? '').map((point) => applyMatrix(matrix, point))
      if (points.length >= 2) {
        buildPolygon(context.sketch, points, { closed: localName(node.tag) === 'polygon' })
        context.count += 1
      }
      return
    }
    default:
      return
  }

  for (const child of node.children) visit(child, matrix, context)
}

function number(source: string | undefined): number {
  return parseLength(source) ?? 0
}

export function parsePoints(source: string): Vec2[] {
  const values = source
    .split(/[\s,]+/)
    .filter((token) => token.length > 0)
    .map(Number)
  const points: Vec2[] = []
  for (let index = 0; index + 1 < values.length; index += 2) {
    const x = values[index] as number
    const y = values[index + 1] as number
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y })
  }
  return points
}

function addCircleOrEllipse(
  center: Vec2,
  rx: number,
  ry: number,
  matrix: Matrix2D,
  context: ImportContext,
): void {
  if (rx <= 0 || ry <= 0) return
  const placed = applyMatrix(matrix, center)

  if (Math.abs(rx - ry) <= context.circularTolerance * Math.max(rx, ry) && isUniformMatrix(matrix)) {
    buildCircle(context.sketch, placed, rx * uniformScaleOf(matrix))
    return
  }

  const majorAxis = applyMatrix(matrix, { x: center.x + rx, y: center.y })
  const minorTip = applyMatrix(matrix, { x: center.x, y: center.y + ry })
  buildEllipse(context.sketch, placed, majorAxis, distance(placed, minorTip))
}

function convertSubPath(subPath: SubPath, matrix: Matrix2D, context: ImportContext): void {
  for (const segment of subPath.segments) convertSegment(segment, matrix, context)
}

function convertSegment(segment: PathSegment, matrix: Matrix2D, context: ImportContext): void {
  const at = (point: Vec2): Vec2 => applyMatrix(matrix, point)

  switch (segment.kind) {
    case 'line':
      if (segment.from.x === segment.to.x && segment.from.y === segment.to.y) return
      buildLine(context.sketch, at(segment.from), at(segment.to))
      return
    case 'cubic':
      buildSpline(
        context.sketch,
        [segment.from, segment.control1, segment.control2, segment.to].map(at),
        { degree: 3 },
      )
      return
    case 'quadratic':
      buildSpline(context.sketch, [segment.from, segment.control, segment.to].map(at), {
        degree: 2,
      })
      return
    case 'arc':
      convertArc(segment, matrix, context)
  }
}

function convertArc(segment: ArcSegment, matrix: Matrix2D, context: ImportContext): void {
  const arc = arcToCenter(segment)
  if (!arc) {
    // The spec says a degenerate arc is drawn as a straight line.
    buildLine(context.sketch, applyMatrix(matrix, segment.from), applyMatrix(matrix, segment.to))
    return
  }

  const circular = Math.abs(arc.rx - arc.ry) <= context.circularTolerance * Math.max(arc.rx, arc.ry)
  if (!circular || !isUniformMatrix(matrix)) {
    const points = sampleArc(arc, context.segments).map((point) => applyMatrix(matrix, point))
    buildPolygon(context.sketch, points, { closed: false })
    return
  }

  const center = applyMatrix(matrix, arc.center)
  const start = applyMatrix(matrix, segment.from)
  const end = applyMatrix(matrix, segment.to)
  // A mirroring transform reverses which way the sweep runs.
  const sweepsForward = arc.deltaAngle >= 0 === determinant(matrix) > 0

  context.sketch.addEntity(
    new ArcEntity({
      centerPointId: context.sketch.addEntity(new PointEntity(center)).id,
      startPointId: context.sketch.addEntity(new PointEntity(start)).id,
      endPointId: context.sketch.addEntity(new PointEntity(end)).id,
      radius: arc.rx * uniformScaleOf(matrix),
      clockwise: !sweepsForward,
    }),
  )
}

/** Exposed for callers that want the composed transform of a nested element. */
export function elementMatrix(node: XmlNode, parent: Matrix2D = IDENTITY): Matrix2D {
  return node.attrs.transform ? multiply(parent, parseTransform(node.attrs.transform)) : parent
}
