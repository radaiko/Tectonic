import type { Vec2 } from '../../sketch/domain/geometry'
import type {
  Annotation,
  AngularDimension,
  BalloonAnnotation,
  CenterLineAnnotation,
  CenterMarkAnnotation,
  DatumFeatureAnnotation,
  DatumTargetAnnotation,
  FeatureControlFrameAnnotation,
  HoleCalloutAnnotation,
  LeaderAnnotation,
  LinearDimension,
  NoteAnnotation,
  OrdinateDimension,
  RadialDimension,
  SurfaceFinishAnnotation,
  WeldSymbolAnnotation,
} from '../domain/Annotation'
import { GDT_GLYPHS, GDT_MODIFIER_GLYPHS, isDimension, measuredValue } from '../domain/Annotation'
import type { DimensionStyle } from '../dimensions/DimensionStyles'
import { DEFAULT_DIMENSION_STYLE, arrowheadIsFilled, arrowheadPolygon, formatDimension } from '../dimensions/DimensionStyles'
import type { RenderPrimitive } from './primitives'
import { arc, circle, line, polygon, polyline, rectangle, strokeFor, text, textWidth } from './primitives'

/**
 * Drawing the annotations.
 *
 * Everything here works in sheet millimetres and takes the model-to-sheet
 * mapping as a function, so the same code draws a dimension whether it hangs
 * off a view scaled 1:5 or sits loose on the sheet. Symbols are built out of
 * lines and text rather than a glyph font: a drawing has to export to DXF and
 * PDF as well as to the screen, and only the primitives survive all three.
 */

export interface AnnotationFrame {
  /** Maps a view-local model point to sheet millimetres. */
  readonly toSheet: (point: Vec2) => Vec2
  /** Sheet millimetres per model unit. */
  readonly scaleFactor: number
  readonly style: DimensionStyle
  /** Decimal places, unless the annotation says otherwise. */
  readonly precision: number
}

export const DIAMETER_SIGN = '⌀'
export const DEGREE_SIGN = '°'
export const DEPTH_SIGN = '↧'
export const COUNTERBORE_SIGN = '⌴'
export const COUNTERSINK_SIGN = '⌵'

export function identityFrame(style: DimensionStyle = DEFAULT_DIMENSION_STYLE): AnnotationFrame {
  return {
    toSheet: (point) => point,
    scaleFactor: 1,
    style,
    precision: style.precision,
  }
}

export function renderAnnotation(annotation: Annotation, frame: AnnotationFrame): RenderPrimitive[] {
  switch (annotation.type) {
    case 'linear-dimension':
    case 'aligned-dimension':
      return renderLinear(annotation, frame)
    case 'angular-dimension':
      return renderAngular(annotation, frame)
    case 'radial-dimension':
    case 'diametric-dimension':
      return renderRadial(annotation, frame)
    case 'ordinate-dimension':
      return renderOrdinate(annotation, frame)
    case 'note':
      return renderNote(annotation, frame)
    case 'datum-feature':
      return renderDatumFeature(annotation, frame)
    case 'datum-target':
      return renderDatumTarget(annotation, frame)
    case 'feature-control-frame':
      return renderFeatureControlFrame(annotation, frame)
    case 'surface-finish':
      return renderSurfaceFinish(annotation, frame)
    case 'weld-symbol':
      return renderWeldSymbol(annotation, frame)
    case 'center-mark':
      return renderCenterMark(annotation, frame)
    case 'center-line':
      return renderCenterLine(annotation, frame)
    case 'hole-callout':
      return renderHoleCallout(annotation, frame)
    case 'balloon':
      return renderBalloon(annotation, frame)
    case 'leader':
      return renderLeader(annotation, frame)
  }
}

/** The text a dimension shows, tolerance and all. */
export function dimensionText(annotation: Annotation, frame: AnnotationFrame): string {
  if (!isDimension(annotation)) return ''

  const value = measuredValue(annotation)
  const precision = annotation.precision ?? frame.precision
  const prefix = annotation.prefix ?? ''
  const suffix = annotation.suffix ?? ''

  const options = {
    precision,
    trimTrailingZeros: frame.style.trimTrailingZeros,
    prefix: symbolPrefix(annotation.type) + prefix,
    suffix: annotation.type === 'angular-dimension' ? `${suffix}${DEGREE_SIGN}` : suffix,
  }
  return formatDimension(value, annotation.tolerance, options)
}

function symbolPrefix(type: Annotation['type']): string {
  if (type === 'diametric-dimension') return DIAMETER_SIGN
  if (type === 'radial-dimension') return 'R'
  return ''
}

// -------------------------------------------------------------- dimensions

function renderLinear(annotation: LinearDimension, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const start = frame.toSheet(annotation.start)
  const end = frame.toSheet(annotation.end)
  const axis = annotation.type === 'aligned-dimension' ? 'parallel' : (annotation.axis ?? 'parallel')

  // The direction the dimension is measured along, and the way out to its line.
  const measured =
    axis === 'horizontal'
      ? { x: 1, y: 0 }
      : axis === 'vertical'
        ? { x: 0, y: 1 }
        : unit({ x: end.x - start.x, y: end.y - start.y })
  const normal = { x: -measured.y, y: measured.x }

  // Both witness points are dropped onto a common line offset from the geometry.
  const base = Math.max(
    along(start, normal),
    along(end, normal),
  )
  const baseLow = Math.min(along(start, normal), along(end, normal))
  const reference = annotation.offset >= 0 ? base : baseLow
  const lineLevel = reference + annotation.offset

  const project = (point: Vec2): Vec2 => {
    const shift = lineLevel - along(point, normal)
    return { x: point.x + normal.x * shift, y: point.y + normal.y * shift }
  }
  const lineStart = project(start)
  const lineEnd = project(end)
  const length = Math.hypot(lineEnd.x - lineStart.x, lineEnd.y - lineStart.y)
  if (length <= 0) return []

  const primitives: RenderPrimitive[] = []
  const id = annotation.id

  // Witness lines: a gap at the geometry, a little overshoot past the line.
  for (const [point, projected] of [
    [start, lineStart],
    [end, lineEnd],
  ] as [Vec2, Vec2][]) {
    const direction = unit({ x: projected.x - point.x, y: projected.y - point.y })
    if (direction.x === 0 && direction.y === 0) continue
    const from = offsetPoint(point, direction, style.extensionGap)
    const to = offsetPoint(projected, direction, style.extensionOvershoot)
    primitives.push(line(from, to, 'dimension', id))
  }

  const label = dimensionText(annotation, frame)
  const labelWidth = textWidth(label, annotation.textSize ?? style.textSize)
  const midpoint = { x: (lineStart.x + lineEnd.x) / 2, y: (lineStart.y + lineEnd.y) / 2 }

  if (style.textPlacement === 'centred' && labelWidth + style.textGap * 2 < length) {
    // ASME style: break the dimension line and set the text in the gap.
    const half = labelWidth / 2 + style.textGap
    primitives.push(line(lineStart, offsetPoint(midpoint, measured, -half), 'dimension', id))
    primitives.push(line(offsetPoint(midpoint, measured, half), lineEnd, 'dimension', id))
  } else {
    primitives.push(line(lineStart, lineEnd, 'dimension', id))
  }

  primitives.push(...arrowhead(lineStart, measured, style, id))
  primitives.push(...arrowhead(lineEnd, { x: -measured.x, y: -measured.y }, style, id))

  const size = annotation.textSize ?? style.textSize
  const rotation = readableAngle(Math.atan2(measured.y, measured.x))
  const anchor =
    style.textPlacement === 'centred'
      ? midpoint
      : offsetPoint(midpoint, normal, style.textGap + size * 0.25)
  primitives.push(
    text(anchor, label, size, {
      anchor: 'middle',
      rotation,
      layer: 'text',
      sourceId: id,
    }),
  )
  return primitives
}

function renderAngular(annotation: AngularDimension, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const vertex = frame.toSheet(annotation.vertex)
  const first = frame.toSheet(annotation.start)
  const second = frame.toSheet(annotation.end)
  const radius = Math.max(annotation.radius, style.arrowSize)

  const startAngle = Math.atan2(first.y - vertex.y, first.x - vertex.x)
  const rawEnd = Math.atan2(second.y - vertex.y, second.x - vertex.x)
  // Always draw the angle actually being measured, never its reflex twin.
  const sweep = normalizeSigned(rawEnd - startAngle)
  const endAngle = startAngle + sweep

  const primitives: RenderPrimitive[] = [
    arc(vertex, radius, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle), 'dimension', annotation.id),
  ]

  for (const [angle, direction] of [
    [startAngle, Math.sign(sweep)],
    [endAngle, -Math.sign(sweep)],
  ] as [number, number][]) {
    const point = polar(vertex, radius, angle)
    // The arrow lies along the tangent, pointing round the arc.
    const tangent = { x: -Math.sin(angle) * direction, y: Math.cos(angle) * direction }
    primitives.push(line(vertex, polar(vertex, radius + style.extensionOvershoot, angle), 'dimension', annotation.id))
    primitives.push(...arrowhead(point, tangent, style, annotation.id))
  }

  const middle = polar(vertex, radius + style.textGap + style.textSize * 0.4, startAngle + sweep / 2)
  primitives.push(
    text(middle, dimensionText(annotation, frame), annotation.textSize ?? style.textSize, {
      anchor: 'middle',
      layer: 'text',
      sourceId: annotation.id,
    }),
  )
  return primitives
}

function renderRadial(annotation: RadialDimension, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const center = frame.toSheet(annotation.center)
  const radius = annotation.radius * frame.scaleFactor
  const angle = annotation.leaderAngle

  const touch = polar(center, radius, angle)
  const elbow = polar(center, radius + style.offset, angle)
  const towardRight = Math.cos(angle) >= 0
  const shelf = { x: elbow.x + (towardRight ? style.textSize : -style.textSize), y: elbow.y }

  const label = dimensionText(annotation, frame)
  return [
    line(touch, elbow, 'dimension', annotation.id),
    line(elbow, shelf, 'dimension', annotation.id),
    ...arrowhead(touch, { x: -Math.cos(angle), y: -Math.sin(angle) }, style, annotation.id),
    text(
      { x: shelf.x + (towardRight ? style.textGap : -style.textGap), y: shelf.y + style.textGap },
      label,
      annotation.textSize ?? style.textSize,
      { anchor: towardRight ? 'start' : 'end', layer: 'text', sourceId: annotation.id },
    ),
  ]
}

function renderOrdinate(annotation: OrdinateDimension, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const point = frame.toSheet(annotation.point)
  const origin = frame.toSheet(annotation.origin)
  const horizontal = annotation.axis === 'x'

  // The leader runs away from the origin along the axis being read off.
  const direction = horizontal
    ? { x: 0, y: point.y >= origin.y ? 1 : -1 }
    : { x: point.x >= origin.x ? 1 : -1, y: 0 }
  const end = offsetPoint(point, direction, style.offset)

  return [
    line(point, end, 'dimension', annotation.id),
    text(offsetPoint(end, direction, style.textGap), dimensionText(annotation, frame), annotation.textSize ?? style.textSize, {
      anchor: horizontal ? 'middle' : direction.x > 0 ? 'start' : 'end',
      layer: 'text',
      sourceId: annotation.id,
    }),
  ]
}

// ------------------------------------------------------------ text and GD&T

function renderNote(annotation: NoteAnnotation, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const size = annotation.textSize ?? style.textSize
  const lines = annotation.text.split('\n')

  const primitives: RenderPrimitive[] = lines.map((content, index) =>
    text({ x: position.x, y: position.y - index * size * 1.6 }, content, size, {
      layer: 'text',
      sourceId: annotation.id,
    }),
  )
  if (annotation.attachment) {
    const attachment = frame.toSheet(annotation.attachment)
    primitives.push(line(position, attachment, 'dimension', annotation.id))
    primitives.push(...arrowhead(attachment, direction(position, attachment), style, annotation.id))
  }
  return primitives
}

function renderDatumFeature(
  annotation: DatumFeatureAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const attachment = frame.toSheet(annotation.attachment)
  const size = annotation.textSize ?? style.textSize
  const box = size * 1.8

  const toward = direction(position, attachment)
  return [
    line(position, attachment, 'dimension', annotation.id),
    // The filled triangle at the feature is what makes it a datum and not a note.
    ...datumTriangle(attachment, toward, size, annotation.id),
    rectangle(position.x - box / 2, position.y - box / 2, box, box, 'dimension', annotation.id),
    text({ x: position.x, y: position.y - size * 0.35 }, annotation.letter, size, {
      anchor: 'middle',
      layer: 'text',
      sourceId: annotation.id,
    }),
  ]
}

function datumTriangle(tip: Vec2, toward: Vec2, size: number, id: string): RenderPrimitive[] {
  const back = offsetPoint(tip, { x: -toward.x, y: -toward.y }, size)
  const across = { x: -toward.y, y: toward.x }
  return [
    polygon(
      [tip, offsetPoint(back, across, size / 2), offsetPoint(back, across, -size / 2)],
      '#000000',
      'dimension',
      id,
    ),
  ]
}

function renderDatumTarget(
  annotation: DatumTargetAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const attachment = frame.toSheet(annotation.attachment)
  const size = annotation.textSize ?? style.textSize
  const radius = size * 1.6

  const primitives: RenderPrimitive[] = [
    line(position, attachment, 'dimension', annotation.id),
    circle(position, radius, 'dimension', { sourceId: annotation.id }),
    // The circle is split: area above, datum below.
    line({ x: position.x - radius, y: position.y }, { x: position.x + radius, y: position.y }, 'dimension', annotation.id),
    text({ x: position.x, y: position.y + size * 0.4 }, targetArea(annotation), size * 0.8, {
      anchor: 'middle',
      layer: 'text',
      sourceId: annotation.id,
    }),
    text({ x: position.x, y: position.y - size * 1.1 }, `${annotation.letter}${annotation.index}`, size * 0.8, {
      anchor: 'middle',
      layer: 'text',
      sourceId: annotation.id,
    }),
  ]

  if (annotation.targetSize > 0) {
    const drawn = (annotation.targetSize / 2) * frame.scaleFactor
    if (drawn > 0) primitives.push(circle(attachment, drawn, 'dimension', { sourceId: annotation.id }))
  } else {
    // A target point is drawn as a cross where the leader lands.
    const arm = size / 2
    primitives.push(line({ x: attachment.x - arm, y: attachment.y - arm }, { x: attachment.x + arm, y: attachment.y + arm }, 'dimension', annotation.id))
    primitives.push(line({ x: attachment.x - arm, y: attachment.y + arm }, { x: attachment.x + arm, y: attachment.y - arm }, 'dimension', annotation.id))
  }
  return primitives
}

function targetArea(annotation: DatumTargetAnnotation): string {
  return annotation.targetSize > 0 ? `${DIAMETER_SIGN}${trimNumber(annotation.targetSize)}` : ''
}

function renderFeatureControlFrame(
  annotation: FeatureControlFrameAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const size = annotation.textSize ?? style.textSize
  const height = size * 2

  const cells: string[] = [
    GDT_GLYPHS[annotation.symbol],
    `${annotation.diametral ? DIAMETER_SIGN : ''}${trimNumber(annotation.toleranceValue)}${
      annotation.modifier ? GDT_MODIFIER_GLYPHS[annotation.modifier] : ''
    }`,
    ...(annotation.datums ?? []).map(
      (datum) => `${datum.letter}${datum.modifier ? GDT_MODIFIER_GLYPHS[datum.modifier] : ''}`,
    ),
  ]

  const primitives: RenderPrimitive[] = []
  let cursor = position.x
  for (const cell of cells) {
    const width = Math.max(textWidth(cell, size) + size, height)
    primitives.push(rectangle(cursor, position.y, width, height, 'dimension', annotation.id))
    primitives.push(
      text({ x: cursor + width / 2, y: position.y + height / 2 - size * 0.35 }, cell, size, {
        anchor: 'middle',
        layer: 'text',
        sourceId: annotation.id,
      }),
    )
    cursor += width
  }

  if (annotation.attachment) {
    const attachment = frame.toSheet(annotation.attachment)
    const anchor = { x: position.x, y: position.y + height / 2 }
    primitives.push(line(anchor, attachment, 'dimension', annotation.id))
    primitives.push(...arrowhead(attachment, direction(anchor, attachment), style, annotation.id))
  }
  return primitives
}

function renderSurfaceFinish(
  annotation: SurfaceFinishAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const style = frame.style
  const attachment = frame.toSheet(annotation.attachment)
  const size = annotation.textSize ?? style.textSize
  const height = size * 2

  // The tick: a short leg up-left, a long leg up-right.
  const left = { x: attachment.x - height * 0.5, y: attachment.y + height * 0.5 }
  const apex = attachment
  const right = { x: attachment.x + height * 0.6, y: attachment.y + height * 1.2 }

  const primitives: RenderPrimitive[] = [
    line(left, apex, 'dimension', annotation.id),
    line(apex, right, 'dimension', annotation.id),
  ]

  if (annotation.finish === 'machining-required') {
    primitives.push(line(left, { x: right.x, y: left.y + height * 0.5 }, 'dimension', annotation.id))
  } else if (annotation.finish === 'machining-prohibited') {
    const radius = height * 0.35
    primitives.push(circle({ x: apex.x + radius * 0.4, y: apex.y + radius * 1.1 }, radius, 'dimension', { sourceId: annotation.id }))
  }
  if (annotation.allAround) {
    primitives.push(circle(right, size * 0.5, 'dimension', { sourceId: annotation.id }))
  }

  const roughness =
    annotation.roughnessMax !== undefined && annotation.roughness !== undefined
      ? `${trimNumber(annotation.roughness)}-${trimNumber(annotation.roughnessMax)}`
      : annotation.roughness !== undefined
        ? trimNumber(annotation.roughness)
        : ''
  if (roughness) {
    primitives.push(
      text({ x: left.x - style.textGap, y: left.y + size * 0.2 }, roughness, size, {
        anchor: 'end',
        layer: 'text',
        sourceId: annotation.id,
      }),
    )
  }
  if (annotation.process) {
    primitives.push(
      text({ x: right.x + style.textGap, y: right.y }, annotation.process, size * 0.85, {
        layer: 'text',
        sourceId: annotation.id,
      }),
    )
  }
  return primitives
}

/** The glyph each weld type is drawn with, as points on a unit reference line. */
const WELD_GLYPHS: Readonly<Record<WeldSymbolAnnotation['weld'], readonly Vec2[]>> = {
  fillet: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ],
  'square-groove': [
    { x: 0.2, y: 0 },
    { x: 0.2, y: 1 },
    { x: 0.8, y: 1 },
    { x: 0.8, y: 0 },
  ],
  'v-groove': [
    { x: 0, y: 1 },
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
  ],
  'bevel-groove': [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 1 },
  ],
  'u-groove': [
    { x: 0, y: 1 },
    { x: 0.2, y: 0 },
    { x: 0.8, y: 0 },
    { x: 1, y: 1 },
  ],
  'j-groove': [
    { x: 0.5, y: 1 },
    { x: 0.5, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
  plug: [
    { x: 0, y: 0 },
    { x: 0, y: 0.7 },
    { x: 1, y: 0.7 },
    { x: 1, y: 0 },
  ],
  spot: [
    { x: 0.5, y: 0.5 },
  ],
  seam: [
    { x: 0, y: 0.2 },
    { x: 1, y: 0.2 },
    { x: 1, y: 0.8 },
    { x: 0, y: 0.8 },
  ],
}

function renderWeldSymbol(
  annotation: WeldSymbolAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const attachment = frame.toSheet(annotation.attachment)
  const size = annotation.textSize ?? style.textSize
  const shelf = size * 6

  const toward = position.x <= attachment.x ? 1 : -1
  const tail = { x: position.x + shelf * toward, y: position.y }

  const primitives: RenderPrimitive[] = [
    line(position, attachment, 'dimension', annotation.id),
    line(position, tail, 'dimension', annotation.id),
    ...arrowhead(attachment, direction(position, attachment), style, annotation.id),
  ]

  // Arrow side sits under the reference line, other side above it.
  const below = annotation.arrowSide !== false
  const glyph = WELD_GLYPHS[annotation.weld]
  const glyphSize = size * 1.4
  const originX = position.x + shelf * toward * 0.35 - (glyphSize / 2) * toward
  const points = glyph.map((point) => ({
    x: originX + point.x * glyphSize * toward,
    y: position.y + (below ? -point.y * glyphSize : point.y * glyphSize),
  }))

  if (annotation.weld === 'spot') {
    primitives.push(circle(points[0] as Vec2, glyphSize * 0.35, 'dimension', { sourceId: annotation.id }))
  } else {
    primitives.push(polyline(points, 'dimension', { sourceId: annotation.id }))
  }

  if (annotation.allAround) {
    primitives.push(circle(position, size * 0.7, 'dimension', { sourceId: annotation.id }))
  }
  if (annotation.fieldWeld) {
    // The flag at the kink of the reference line.
    const flagTop = { x: position.x, y: position.y + size * 2.4 }
    primitives.push(line(position, flagTop, 'dimension', annotation.id))
    primitives.push(
      polygon(
        [flagTop, { x: flagTop.x + size * 1.2 * toward, y: flagTop.y - size * 0.5 }, { x: flagTop.x, y: flagTop.y - size }],
        '#000000',
        'dimension',
        annotation.id,
      ),
    )
  }

  const caption = [
    annotation.size !== undefined ? trimNumber(annotation.size) : '',
    annotation.length !== undefined ? `${trimNumber(annotation.length)}` : '',
    annotation.pitch !== undefined ? `-${trimNumber(annotation.pitch)}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  if (caption) {
    primitives.push(
      text(
        { x: position.x + size * 0.4 * toward, y: position.y + (below ? -size * 1.6 : size * 0.8) },
        caption,
        size * 0.9,
        { anchor: toward > 0 ? 'start' : 'end', layer: 'text', sourceId: annotation.id },
      ),
    )
  }
  return primitives
}

// ------------------------------------------------------------------ marks

function renderCenterMark(
  annotation: CenterMarkAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const center = frame.toSheet(annotation.center)
  const arm = Math.max(annotation.size, 0.5)

  const primitives: RenderPrimitive[] = [
    line({ x: center.x - arm, y: center.y }, { x: center.x + arm, y: center.y }, 'centerline', annotation.id),
    line({ x: center.x, y: center.y - arm }, { x: center.x, y: center.y + arm }, 'centerline', annotation.id),
  ]

  if (annotation.extended) {
    const reach = (annotation.extendTo ?? arm * 3) * (annotation.extendTo === undefined ? 1 : frame.scaleFactor)
    primitives.push(
      line({ x: center.x - reach, y: center.y }, { x: center.x - arm * 1.5, y: center.y }, 'centerline', annotation.id),
      line({ x: center.x + arm * 1.5, y: center.y }, { x: center.x + reach, y: center.y }, 'centerline', annotation.id),
      line({ x: center.x, y: center.y - reach }, { x: center.x, y: center.y - arm * 1.5 }, 'centerline', annotation.id),
      line({ x: center.x, y: center.y + arm * 1.5 }, { x: center.x, y: center.y + reach }, 'centerline', annotation.id),
    )
  }
  return primitives
}

function renderCenterLine(
  annotation: CenterLineAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  return [line(frame.toSheet(annotation.start), frame.toSheet(annotation.end), 'centerline', annotation.id)]
}

function renderHoleCallout(
  annotation: HoleCalloutAnnotation,
  frame: AnnotationFrame,
): RenderPrimitive[] {
  const style = frame.style
  const center = frame.toSheet(annotation.center)
  const position = frame.toSheet(annotation.position)
  const size = annotation.textSize ?? style.textSize
  const toward = position.x >= center.x

  const lines = holeCalloutLines(annotation)
  const shelf = { x: position.x + (toward ? size * 2 : -size * 2), y: position.y }

  const primitives: RenderPrimitive[] = [
    line(center, position, 'dimension', annotation.id),
    line(position, shelf, 'dimension', annotation.id),
    ...arrowhead(center, direction(position, center), style, annotation.id),
  ]
  lines.forEach((content, index) => {
    primitives.push(
      text(
        { x: shelf.x + (toward ? style.textGap : -style.textGap), y: shelf.y + style.textGap - index * size * 1.6 },
        content,
        size,
        { anchor: toward ? 'start' : 'end', layer: 'text', sourceId: annotation.id },
      ),
    )
  })
  return primitives
}

/** The lines of a hole callout, in the order a drawing stacks them. */
export function holeCalloutLines(annotation: HoleCalloutAnnotation): string[] {
  const count = annotation.count && annotation.count > 1 ? `${annotation.count}x ` : ''
  const size = annotation.thread ?? `${DIAMETER_SIGN}${trimNumber(annotation.diameter)}`
  const depth = annotation.depth === undefined ? ' THRU' : ` ${DEPTH_SIGN}${trimNumber(annotation.depth)}`

  const lines = [`${count}${size}${depth}`]
  if (annotation.counterboreDiameter !== undefined) {
    const bore = `${COUNTERBORE_SIGN}${DIAMETER_SIGN}${trimNumber(annotation.counterboreDiameter)}`
    const boreDepth =
      annotation.counterboreDepth === undefined ? '' : ` ${DEPTH_SIGN}${trimNumber(annotation.counterboreDepth)}`
    lines.push(`${bore}${boreDepth}`)
  }
  if (annotation.countersinkDiameter !== undefined) {
    const sink = `${COUNTERSINK_SIGN}${DIAMETER_SIGN}${trimNumber(annotation.countersinkDiameter)}`
    const angle = annotation.countersinkAngle === undefined ? '' : ` x ${trimNumber(annotation.countersinkAngle)}${DEGREE_SIGN}`
    lines.push(`${sink}${angle}`)
  }
  return lines
}

function renderBalloon(annotation: BalloonAnnotation, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const attachment = frame.toSheet(annotation.attachment)
  const radius = Math.max(annotation.radius, style.textSize)
  const size = annotation.textSize ?? style.textSize

  const toward = direction(position, attachment)
  const edge = offsetPoint(position, toward, radius)

  const primitives: RenderPrimitive[] = [
    line(edge, attachment, 'dimension', annotation.id),
    // A balloon lands on the part with a dot, not an arrow.
    circle(attachment, style.arrowSize * 0.25, 'dimension', { fill: '#000000', sourceId: annotation.id }),
    ...balloonOutline(annotation, position, radius),
    text({ x: position.x, y: position.y - size * 0.35 }, annotation.label, size, {
      anchor: 'middle',
      layer: 'text',
      sourceId: annotation.id,
    }),
  ]

  if (annotation.quantity !== undefined) {
    primitives.push(
      line({ x: position.x - radius, y: position.y }, { x: position.x + radius, y: position.y }, 'dimension', annotation.id),
    )
    primitives.push(
      text({ x: position.x, y: position.y - radius + size * 0.3 }, String(annotation.quantity), size * 0.8, {
        anchor: 'middle',
        layer: 'text',
        sourceId: annotation.id,
      }),
    )
  }
  return primitives
}

function balloonOutline(annotation: BalloonAnnotation, position: Vec2, radius: number): RenderPrimitive[] {
  const shape = annotation.shape ?? 'circle'
  if (shape === 'circle') {
    return [circle(position, radius, 'dimension', { fill: '#ffffff', sourceId: annotation.id })]
  }

  const sides = shape === 'square' ? 4 : shape === 'triangle' ? 3 : 6
  const turn = shape === 'square' ? Math.PI / 4 : shape === 'triangle' ? Math.PI / 2 : 0
  const points: Vec2[] = []
  for (let index = 0; index < sides; index += 1) {
    const angle = turn + (index / sides) * Math.PI * 2
    points.push(polar(position, radius, angle))
  }
  return [polyline(points, 'dimension', { closed: true, fill: '#ffffff', sourceId: annotation.id })]
}

function renderLeader(annotation: LeaderAnnotation, frame: AnnotationFrame): RenderPrimitive[] {
  const style = frame.style
  const position = frame.toSheet(annotation.position)
  const attachment = frame.toSheet(annotation.attachment)
  const bend = annotation.bend ? frame.toSheet(annotation.bend) : null
  const size = annotation.textSize ?? style.textSize

  const elbow = bend ?? position
  return [
    line(position, elbow, 'dimension', annotation.id),
    line(elbow, attachment, 'dimension', annotation.id),
    ...arrowhead(attachment, direction(elbow, attachment), style, annotation.id),
    text({ x: position.x, y: position.y + style.textGap }, annotation.text, size, {
      anchor: position.x <= attachment.x ? 'end' : 'start',
      layer: 'text',
      sourceId: annotation.id,
    }),
  ]
}

// ---------------------------------------------------------------- helpers

/** An arrowhead with its tip at `tip`, opening along `towards`. */
export function arrowhead(
  tip: Vec2,
  towards: Vec2,
  style: DimensionStyle,
  sourceId?: string,
): RenderPrimitive[] {
  const shape = arrowheadPolygon(style.arrowhead, style.arrowSize)
  if (shape.length === 0) return []

  const angle = Math.atan2(towards.y, towards.x)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const points = shape.map((point) => ({
    x: tip.x + point.x * cos - point.y * sin,
    y: tip.y + point.x * sin + point.y * cos,
  }))

  if (arrowheadIsFilled(style.arrowhead)) {
    return [polygon(points, strokeFor('dimension').color, 'dimension', sourceId)]
  }
  return [polyline(points, 'dimension', sourceId === undefined ? {} : { sourceId })]
}

function unit(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y)
  return length === 0 ? { x: 1, y: 0 } : { x: vector.x / length, y: vector.y / length }
}

function direction(from: Vec2, to: Vec2): Vec2 {
  return unit({ x: to.x - from.x, y: to.y - from.y })
}

function along(point: Vec2, axis: Vec2): number {
  return point.x * axis.x + point.y * axis.y
}

function offsetPoint(point: Vec2, direction: Vec2, distance: number): Vec2 {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance }
}

function polar(center: Vec2, radius: number, angle: number): Vec2 {
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
}

/** Keeps dimension text from being written upside down. */
function readableAngle(angle: number): number {
  const half = Math.PI / 2
  if (angle > half) return angle - Math.PI
  if (angle <= -half) return angle + Math.PI
  return angle
}

/** Wraps to (-pi, pi], so an angular dimension never draws the reflex angle. */
function normalizeSigned(angle: number): number {
  const wrapped = ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  return wrapped
}

function trimNumber(value: number): string {
  const fixed = value.toFixed(2)
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
}
