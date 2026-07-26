import type { Vec2 } from '../sketch/domain/geometry'
import type { SheetMetalParameters } from './SheetMetalParameters'
import { contourChain } from './BaseFlange'
import type { BendZone } from './bend'
import { developChain } from './bend'
import type { EdgeFeatureSpec, SheetMetalPart } from './SheetMetalPart'
import { edgeFeatureDevelopment } from './SheetMetalPart'
import { normalizeLoop } from './geometry'
import type { ReliefType, SheetEdge } from './types'

/** Facets used to draw the rounded end of a round relief. */
const RELIEF_ARC_SEGMENTS = 8

/** Which way a bend folds when the flat pattern is looked at from the front. */
export type BendDirection = 'up' | 'down'

export interface FlatBendLine {
  /** The feature that folds here; the base contour uses the part id. */
  readonly featureId: string
  /** Position of the bend within that feature's chain. */
  readonly index: number
  readonly start: Vec2
  readonly end: Vec2
  readonly angle: number
  readonly radius: number
  readonly allowance: number
  readonly direction: BendDirection
}

export interface FlatBendZone extends FlatBendLine {
  /** The four corners of the strip of material the bend consumes. */
  readonly corners: readonly Vec2[]
}

export interface FlatRelief {
  readonly featureId: string
  readonly type: ReliefType
  readonly loop: readonly Vec2[]
}

export interface FlatBounds {
  readonly min: Vec2
  readonly max: Vec2
  readonly width: number
  readonly height: number
}

export interface FlatPattern {
  readonly outline: readonly Vec2[]
  readonly holes: readonly (readonly Vec2[])[]
  readonly bendLines: readonly FlatBendLine[]
  readonly bendZones: readonly FlatBendZone[]
  /** Corner notches that let a bend run out. Cut alongside the outline. */
  readonly reliefs: readonly FlatRelief[]
  readonly bounds: FlatBounds
  readonly thickness: number
}

/**
 * Rolls a part out flat.
 *
 * A plate with flanges keeps the shape of its base face and grows a tab on every
 * flanged edge, each as deep as that feature's own development. A folded contour
 * has no base face to keep, so it becomes a plain rectangle as long as the
 * contour develops and as wide as it was swept.
 */
export function flatPattern(part: SheetMetalPart): FlatPattern {
  return part.base.profileKind === 'open' ? contourFlat(part) : plateFlat(part)
}

function plateFlat(part: SheetMetalPart): FlatPattern {
  const edges = part.edges
  const byEdge = new Map<number, EdgeFeatureSpec>()
  for (const feature of part.features) byEdge.set(feature.edgeIndex, feature)

  const outline: Vec2[] = []
  const bendLines: FlatBendLine[] = []
  const bendZones: FlatBendZone[] = []
  const reliefs: FlatRelief[] = []

  for (const edge of edges) {
    outline.push(edge.start)
    const feature = byEdge.get(edge.index)
    if (!feature) continue

    const development = edgeFeatureDevelopment(feature, part.parameters)
    const from = offsetAlong(edge.start, edge.direction, feature.trimStart)
    const to = offsetAlong(edge.end, edge.direction, -feature.trimEnd)

    if (development.length > 0) {
      if (feature.trimStart > 0) outline.push(from)
      outline.push(offsetAlong(from, edge.normal, development.length))
      outline.push(offsetAlong(to, edge.normal, development.length))
      if (feature.trimEnd > 0) outline.push(to)
    }

    for (const zone of development.zones) {
      const line = bendLineOf(feature.id, zone, from, to, edge.normal)
      bendLines.push(line)
      bendZones.push({
        ...line,
        corners: [
          offsetAlong(from, edge.normal, zone.start),
          offsetAlong(to, edge.normal, zone.start),
          offsetAlong(to, edge.normal, zone.start + zone.allowance),
          offsetAlong(from, edge.normal, zone.start + zone.allowance),
        ],
      })
    }

    reliefs.push(...reliefsFor(part, feature, edge, byEdge))
  }

  return {
    outline,
    holes: part.base.holes.map((hole) => normalizeLoop(hole)),
    bendLines,
    bendZones,
    reliefs,
    bounds: boundsOf(outline),
    thickness: part.parameters.thickness,
  }
}

function contourFlat(part: SheetMetalPart): FlatPattern {
  const chain = contourChain(part.base, part.parameters)
  const development = developChain(chain.steps, part.parameters, chain.options)
  const width = part.base.width

  const outline: Vec2[] = [
    { x: 0, y: 0 },
    { x: development.length, y: 0 },
    { x: development.length, y: width },
    { x: 0, y: width },
  ]

  const bendLines: FlatBendLine[] = []
  const bendZones: FlatBendZone[] = []

  for (const zone of development.zones) {
    const line = bendLineOf(
      part.id,
      zone,
      { x: 0, y: 0 },
      { x: 0, y: width },
      { x: 1, y: 0 },
    )
    bendLines.push(line)
    bendZones.push({
      ...line,
      corners: [
        { x: zone.start, y: 0 },
        { x: zone.start, y: width },
        { x: zone.start + zone.allowance, y: width },
        { x: zone.start + zone.allowance, y: 0 },
      ],
    })
  }

  return {
    outline,
    holes: [],
    bendLines,
    bendZones,
    reliefs: [],
    bounds: boundsOf(outline),
    thickness: part.parameters.thickness,
  }
}

function bendLineOf(
  featureId: string,
  zone: BendZone,
  from: Vec2,
  to: Vec2,
  normal: Vec2,
): FlatBendLine {
  const centre = zone.start + zone.allowance / 2
  return {
    featureId,
    index: zone.index,
    start: offsetAlong(from, normal, centre),
    end: offsetAlong(to, normal, centre),
    angle: zone.angle,
    radius: zone.radius,
    allowance: zone.allowance,
    direction: zone.angle >= 0 ? 'up' : 'down',
  }
}

/**
 * Notches at the ends of a bend that runs out into material which is staying
 * flat. A corner shared with another flange needs none — the mitre already
 * separates them.
 */
function reliefsFor(
  part: SheetMetalPart,
  feature: EdgeFeatureSpec,
  edge: SheetEdge,
  byEdge: ReadonlyMap<number, EdgeFeatureSpec>,
): FlatRelief[] {
  if (feature.relief === 'none') return []

  const count = part.edges.length
  const previous = (edge.index - 1 + count) % count
  const next = (edge.index + 1) % count
  const reliefs: FlatRelief[] = []

  if (!byEdge.has(previous)) {
    reliefs.push({
      featureId: feature.id,
      type: feature.relief,
      loop: reliefLoop(part.parameters, feature.relief, edge.start, edge.direction, edge.normal),
    })
  }
  if (!byEdge.has(next)) {
    reliefs.push({
      featureId: feature.id,
      type: feature.relief,
      loop: reliefLoop(part.parameters, feature.relief, edge.end, negate(edge.direction), edge.normal),
    })
  }
  return reliefs
}

/**
 * One notch, drawn from a corner: `along` runs into the edge, and the notch
 * sinks into the face away from the flange.
 */
function reliefLoop(
  parameters: SheetMetalParameters,
  type: ReliefType,
  corner: Vec2,
  along: Vec2,
  normal: Vec2,
): Vec2[] {
  const width = parameters.reliefWidth
  const depth = parameters.reliefDepth
  const inward = negate(normal)

  if (type === 'tear') {
    return [corner, offsetAlong(corner, along, width), offsetAlong(corner, inward, depth)]
  }

  const mouth = offsetAlong(corner, along, width)
  if (type === 'round') {
    const centre = offsetAlong(offsetAlong(corner, along, width / 2), inward, depth - width / 2)
    const arc: Vec2[] = []
    for (let index = 0; index <= RELIEF_ARC_SEGMENTS; index += 1) {
      const phi = Math.PI * (index / RELIEF_ARC_SEGMENTS)
      arc.push({
        x: centre.x + (along.x * Math.cos(phi) + inward.x * Math.sin(phi)) * (width / 2),
        y: centre.y + (along.y * Math.cos(phi) + inward.y * Math.sin(phi)) * (width / 2),
      })
    }
    return [mouth, ...arc.reverse(), corner]
  }

  return [
    corner,
    mouth,
    offsetAlong(mouth, inward, depth),
    offsetAlong(corner, inward, depth),
  ]
}

function offsetAlong(point: Vec2, direction: Vec2, distance: number): Vec2 {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance }
}

function negate(vector: Vec2): Vec2 {
  return { x: -vector.x, y: -vector.y }
}

export function boundsOf(points: readonly Vec2[]): FlatBounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  if (!Number.isFinite(minX)) {
    return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 }, width: 0, height: 0 }
  }
  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    width: maxX - minX,
    height: maxY - minY,
  }
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

/** DXF layer each kind of geometry is written to. */
export const DXF_LAYERS = {
  outline: 'OUTLINE',
  hole: 'HOLES',
  bend: 'BEND',
  relief: 'RELIEF',
} as const

/**
 * The pattern as a minimal R12 DXF: closed loops as line segments on their own
 * layers, which is all a laser or a punch needs to read.
 */
export function flatPatternToDXF(pattern: FlatPattern): string {
  const lines: string[] = ['0', 'SECTION', '2', 'ENTITIES']

  const emit = (loop: readonly Vec2[], layer: string, closed: boolean): void => {
    for (let index = 0; index < loop.length - (closed ? 0 : 1); index += 1) {
      const from = loop[index] as Vec2
      const to = loop[(index + 1) % loop.length] as Vec2
      lines.push(...dxfLine(from, to, layer))
    }
  }

  emit(pattern.outline, DXF_LAYERS.outline, true)
  for (const hole of pattern.holes) emit(hole, DXF_LAYERS.hole, true)
  for (const relief of pattern.reliefs) emit(relief.loop, DXF_LAYERS.relief, true)
  for (const bend of pattern.bendLines) {
    lines.push(...dxfLine(bend.start, bend.end, DXF_LAYERS.bend))
  }

  lines.push('0', 'ENDSEC', '0', 'EOF')
  return `${lines.join('\n')}\n`
}

function dxfLine(from: Vec2, to: Vec2, layer: string): string[] {
  return [
    '0',
    'LINE',
    '8',
    layer,
    '10',
    format(from.x),
    '20',
    format(from.y),
    '30',
    '0.0',
    '11',
    format(to.x),
    '21',
    format(to.y),
    '31',
    '0.0',
  ]
}

export interface SvgOptions {
  /** Blank space left around the pattern, in the pattern's own units. */
  readonly margin?: number
  readonly outlineColor?: string
  readonly bendColor?: string
}

/** The pattern as an SVG document: outline filled, bend lines dashed over it. */
export function flatPatternToSVG(pattern: FlatPattern, options: SvgOptions = {}): string {
  const margin = options.margin ?? 5
  const { min, width, height } = pattern.bounds
  const viewBox = [min.x - margin, min.y - margin, width + margin * 2, height + margin * 2]
    .map(format)
    .join(' ')

  const paths = [
    `<path d="${loopPath(pattern.outline)}${pattern.holes.map(loopPath).join('')}" fill="#dfe6ef" fill-rule="evenodd" stroke="${options.outlineColor ?? '#1c2b3a'}" stroke-width="0.2" />`,
    ...pattern.reliefs.map(
      (relief) =>
        `<path d="${loopPath(relief.loop)}" fill="none" stroke="${options.outlineColor ?? '#1c2b3a'}" stroke-width="0.2" />`,
    ),
    ...pattern.bendLines.map(
      (bend) =>
        `<line x1="${format(bend.start.x)}" y1="${format(bend.start.y)}" x2="${format(bend.end.x)}" y2="${format(bend.end.y)}" stroke="${options.bendColor ?? '#c2410c'}" stroke-width="0.15" stroke-dasharray="1.5 1" />`,
    ),
  ]

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${format(width + margin * 2)}mm" height="${format(height + margin * 2)}mm">`,
    ...paths,
    '</svg>',
  ].join('\n')
}

function loopPath(loop: readonly Vec2[]): string {
  if (loop.length === 0) return ''
  const [first, ...rest] = loop as [Vec2, ...Vec2[]]
  return `M ${format(first.x)} ${format(first.y)} ${rest
    .map((point) => `L ${format(point.x)} ${format(point.y)}`)
    .join(' ')} Z `
}

function format(value: number): string {
  return (Math.round(value * 1e6) / 1e6).toString()
}
