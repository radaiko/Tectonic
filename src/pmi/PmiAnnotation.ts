import type { Vec3 } from '../domain/vec3'
import { cross, normalize, subtract } from '../domain/vec3'
import { newId } from '../sketch/domain/ids'
import type { GdtModifier, GdtSymbol } from '../drawing/domain/Annotation'
import {
  GDT_GLYPHS,
  GDT_MODIFIERS,
  GDT_MODIFIER_GLYPHS,
  GDT_SYMBOLS,
  SURFACE_FINISH_KINDS,
  WELD_TYPES,
} from '../drawing/domain/Annotation'

/**
 * Product and Manufacturing Information: the dimensions, tolerances and symbols
 * that live on the 3D model rather than on a drawing sheet.
 *
 * This is the model-based-definition half of the annotation story, and it is
 * deliberately not the drawing half. A drawing annotation is a 2D record in a
 * view's local millimetres; a PMI annotation is a 3D record in model space,
 * sitting on an {@link AnnotationPlane} that decides which way the text faces.
 * The two never share a record — but they do share a vocabulary, so the GD&T
 * symbols, modifiers, weld types and surface-finish kinds are imported from the
 * drawing domain rather than written out twice. One drawing and one model that
 * disagreed about what ⊥ means would be a bug nobody could see.
 *
 * **Coordinates.** Every point-valued field is model space, in document units.
 * Sizes that describe how the annotation is *drawn* rather than what it
 * measures — `textHeight`, a leader's arrow size — are also document units, so
 * annotations scale with the model they belong to.
 *
 * **Values.** A dimension's `value` is an override. Left off, the value is
 * measured from the annotation's own geometry by {@link measuredPmiValue}.
 *
 * Annotations are plain immutable records, JSON-shaped as they stand.
 */

export const PMI_ANNOTATION_TYPES = [
  'linear-dimension',
  'angular-dimension',
  'radial-dimension',
  'diametric-dimension',
  'ordinate-dimension',
  'coordinate-dimension',
  'chamfer-dimension',
  'hole-callout',
  'datum-feature',
  'datum-target',
  'feature-control-frame',
  'surface-finish',
  'weld-symbol',
  'note',
] as const

export type PmiAnnotationType = (typeof PMI_ANNOTATION_TYPES)[number]

export function isPmiAnnotationType(value: unknown): value is PmiAnnotationType {
  return (PMI_ANNOTATION_TYPES as readonly string[]).includes(value as string)
}

/* ------------------------------------------------------------------ tolerance */

export const PMI_TOLERANCE_KINDS = [
  'none',
  'symmetrical',
  'deviation',
  'limits',
  'fit',
  'general',
] as const

export type PmiToleranceKind = (typeof PMI_TOLERANCE_KINDS)[number]

export interface PmiTolerance {
  readonly kind: PmiToleranceKind
  /** Upper deviation. Also the single value of a symmetrical tolerance. */
  readonly plus?: number
  /** Lower deviation, written as a positive magnitude. */
  readonly minus?: number
  /** ISO fit designation of the feature, e.g. "H7" or "g6". */
  readonly fit?: string
  /** The mating fit, when the callout states both, e.g. "H7/g6". */
  readonly mateFit?: string
  /** General tolerance class, e.g. "ISO 2768-m". */
  readonly generalClass?: string
}

export const NO_PMI_TOLERANCE: PmiTolerance = { kind: 'none' }

/** "±0.1", "+0.2/−0.1", "10.1/9.9", "H7/g6" — what the tolerance reads as. */
export function formatTolerance(tolerance: PmiTolerance, nominal = 0, precision = 2): string {
  const round = (value: number): string => value.toFixed(precision)

  switch (tolerance.kind) {
    case 'none':
      return ''
    case 'symmetrical':
      return `±${round(tolerance.plus ?? 0)}`
    case 'deviation':
      return `+${round(tolerance.plus ?? 0)}/−${round(tolerance.minus ?? 0)}`
    case 'limits':
      return `${round(nominal + (tolerance.plus ?? 0))}/${round(nominal - (tolerance.minus ?? 0))}`
    case 'fit':
      return tolerance.mateFit === undefined
        ? (tolerance.fit ?? '')
        : `${tolerance.fit ?? ''}/${tolerance.mateFit}`
    case 'general':
      return tolerance.generalClass ?? ''
  }
}

/* ----------------------------------------------------------------- attachment */

export const PMI_ATTACHMENT_KINDS = ['face', 'edge', 'vertex', 'axis', 'plane', 'body'] as const

export type PmiAttachmentKind = (typeof PMI_ATTACHMENT_KINDS)[number]

/** What piece of the model an annotation was hung off. */
export interface PmiAttachment {
  readonly kind: PmiAttachmentKind
  /** Identifies the topology within the body. */
  readonly id: string
  /** Where the leader lands, in model space. */
  readonly point?: Vec3
  /** The body the topology belongs to, when a document holds more than one. */
  readonly bodyId?: string
}

export const ARROWHEAD_TYPES = ['filled', 'open', 'closed', 'dot', 'slash', 'none'] as const

export type ArrowheadType = (typeof ARROWHEAD_TYPES)[number]

/**
 * A gap in a leader line where another leader crosses it. `segment` indexes the
 * leg of `path` the gap sits on and the two parameters are positions along it
 * in 0..1 — which keeps a break valid when the leader is dragged.
 */
export interface LeaderBreak {
  readonly segment: number
  readonly start: number
  readonly end: number
}

export interface PmiLeader {
  readonly attachment: PmiAttachment
  /**
   * The leader line, arrow end first, text end last, in model space. A straight
   * leader is two points; an elbowed one is three.
   */
  readonly path: readonly Vec3[]
  readonly arrowhead?: ArrowheadType
  readonly breaks?: readonly LeaderBreak[]
}

/* ---------------------------------------------------------------------- plane */

/**
 * The plane an annotation is drawn on, and which way up. `normal` faces the
 * reader and `xAxis` is the direction the text runs; both are unit vectors and
 * `xAxis` is expected to lie in the plane.
 */
export interface AnnotationPlane {
  readonly origin: Vec3
  readonly normal: Vec3
  readonly xAxis: Vec3
}

export const XY_ANNOTATION_PLANE: AnnotationPlane = {
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 0, z: 1 },
  xAxis: { x: 1, y: 0, z: 0 },
}

/** The plane's in-plane up direction, completing the right-handed frame. */
export function annotationPlaneYAxis(plane: AnnotationPlane): Vec3 {
  return normalize(cross(plane.normal, plane.xAxis))
}

/**
 * A plane facing `normal` with its origin at `origin`, picking any sensible text
 * direction. Used when an annotation is dropped on a face and nobody has said
 * which way the text should run.
 */
export function planeFacing(origin: Vec3, normal: Vec3): AnnotationPlane {
  const unitNormal = normalize(normal)
  // Text runs horizontally unless the plane is nearly horizontal itself, in
  // which case it runs along +X of the world instead of collapsing to zero.
  const helper = Math.abs(unitNormal.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
  return {
    origin,
    normal: unitNormal,
    xAxis: normalize(cross(helper, unitNormal)),
  }
}

/* ----------------------------------------------------------------- annotations */

export interface PmiAnnotationBase {
  readonly id: string
  readonly type: PmiAnnotationType
  /** Where the annotation's text sits, in model space. */
  readonly position: Vec3
  /** The plane the text is drawn on. */
  readonly plane: AnnotationPlane
  /** The annotation view this belongs to, or null for a view-independent one. */
  readonly viewId: string | null
  readonly leaders?: readonly PmiLeader[]
  readonly references?: readonly PmiAttachment[]
  /** Overrides the measured value. */
  readonly value?: number
  readonly tolerance?: PmiTolerance
  /** Decimal places shown. Defaults to the view's precision. */
  readonly precision?: number
  /** Text height in document units. */
  readonly textHeight?: number
  /** Free text before the value, e.g. "4x". */
  readonly prefix?: string
  /** Free text after the value, e.g. "TYP". */
  readonly suffix?: string
}

export interface PmiLinearDimension extends PmiAnnotationBase {
  readonly type: 'linear-dimension'
  readonly start: Vec3
  readonly end: Vec3
  /**
   * What the dimension measures. `parallel` is the true distance; the axis
   * options project onto that axis of the annotation plane's frame.
   */
  readonly axis?: 'x' | 'y' | 'z' | 'parallel'
  /** Distance from the measured line out to the dimension line. */
  readonly offset?: number
}

export interface PmiAngularDimension extends PmiAnnotationBase {
  readonly type: 'angular-dimension'
  readonly vertex: Vec3
  /** A point on the first leg. */
  readonly start: Vec3
  /** A point on the second leg. */
  readonly end: Vec3
  /** Radius of the dimension arc, from the vertex. */
  readonly radius: number
}

export interface PmiRadialDimension extends PmiAnnotationBase {
  readonly type: 'radial-dimension' | 'diametric-dimension'
  readonly center: Vec3
  readonly radius: number
  /** Axis of the circle or cylinder being measured. */
  readonly axis: Vec3
}

export interface PmiOrdinateDimension extends PmiAnnotationBase {
  readonly type: 'ordinate-dimension'
  /** The zero the ordinate is measured from. */
  readonly origin: Vec3
  readonly point: Vec3
  readonly axis: 'x' | 'y' | 'z'
}

/** A point called out by all three of its coordinates at once. */
export interface PmiCoordinateDimension extends PmiAnnotationBase {
  readonly type: 'coordinate-dimension'
  readonly origin: Vec3
  readonly point: Vec3
}

export interface PmiChamferDimension extends PmiAnnotationBase {
  readonly type: 'chamfer-dimension'
  readonly start: Vec3
  readonly end: Vec3
  /** Chamfer angle in degrees; 45 unless said otherwise. */
  readonly angle?: number
}

export interface PmiHoleCallout extends PmiAnnotationBase {
  readonly type: 'hole-callout'
  readonly center: Vec3
  /** Drilling direction. */
  readonly axis: Vec3
  readonly diameter: number
  /** Blind-hole depth. Left off, the hole is through. */
  readonly depth?: number
  /** Instance count, written as the "4x" prefix. */
  readonly count?: number
  readonly thread?: string
  readonly counterboreDiameter?: number
  readonly counterboreDepth?: number
  readonly countersinkDiameter?: number
  readonly countersinkAngle?: number
}

export interface PmiDatumFeature extends PmiAnnotationBase {
  readonly type: 'datum-feature'
  /** The datum letter, e.g. "A". */
  readonly letter: string
}

export interface PmiDatumTarget extends PmiAnnotationBase {
  readonly type: 'datum-target'
  readonly letter: string
  /** The target's number within the datum, e.g. the 2 of A2. */
  readonly index: number
  /** Diameter of the target area. Zero means a target point. */
  readonly targetSize: number
  readonly point: Vec3
}

export interface DatumReference {
  readonly letter: string
  readonly modifier?: GdtModifier
}

export interface PmiFeatureControlFrame extends PmiAnnotationBase {
  readonly type: 'feature-control-frame'
  readonly symbol: GdtSymbol
  readonly toleranceValue: number
  /** Whether the tolerance zone is diametral — the ⌀ before the value. */
  readonly diametral?: boolean
  readonly modifier?: GdtModifier
  readonly datums?: readonly DatumReference[]
  /** A second row, for a composite frame. */
  readonly lowerSegment?: {
    readonly toleranceValue: number
    readonly modifier?: GdtModifier
    readonly datums?: readonly DatumReference[]
  }
}

/** ISO 1302 lay symbols — which way the tool marks run. */
export const SURFACE_LAY_DIRECTIONS = [
  'none',
  'parallel',
  'perpendicular',
  'crossed',
  'multidirectional',
  'circular',
  'radial',
  'particulate',
] as const

export type SurfaceLayDirection = (typeof SURFACE_LAY_DIRECTIONS)[number]

export const SURFACE_LAY_GLYPHS: Readonly<Record<SurfaceLayDirection, string>> = {
  none: '',
  parallel: '=',
  perpendicular: '⊥',
  crossed: 'X',
  multidirectional: 'M',
  circular: 'C',
  radial: 'R',
  particulate: 'P',
}

export interface PmiSurfaceFinish extends PmiAnnotationBase {
  readonly type: 'surface-finish'
  readonly finish: (typeof SURFACE_FINISH_KINDS)[number]
  /** Ra in micrometres. */
  readonly roughness?: number
  /** Maximum Ra when a range is specified. */
  readonly roughnessMax?: number
  /** Rz in micrometres, when the callout uses ten-point height instead. */
  readonly rz?: number
  readonly lay?: SurfaceLayDirection
  readonly process?: string
  /** Machining allowance in millimetres. */
  readonly allowance?: number
  readonly allAround?: boolean
}

export interface PmiWeldSymbol extends PmiAnnotationBase {
  readonly type: 'weld-symbol'
  readonly weld: (typeof WELD_TYPES)[number]
  /** Leg length or throat, in document units. */
  readonly size?: number
  readonly length?: number
  readonly pitch?: number
  /** True puts the symbol below the reference line — the arrow side. */
  readonly arrowSide?: boolean
  readonly fieldWeld?: boolean
  readonly allAround?: boolean
}

export interface PmiNote extends PmiAnnotationBase {
  readonly type: 'note'
  readonly text: string
}

export type PmiAnnotation =
  | PmiLinearDimension
  | PmiAngularDimension
  | PmiRadialDimension
  | PmiOrdinateDimension
  | PmiCoordinateDimension
  | PmiChamferDimension
  | PmiHoleCallout
  | PmiDatumFeature
  | PmiDatumTarget
  | PmiFeatureControlFrame
  | PmiSurfaceFinish
  | PmiWeldSymbol
  | PmiNote

/** Every dimension kind, for the code paths that only care about those. */
export type PmiDimension =
  | PmiLinearDimension
  | PmiAngularDimension
  | PmiRadialDimension
  | PmiOrdinateDimension
  | PmiCoordinateDimension
  | PmiChamferDimension

const DIMENSION_TYPES: readonly PmiAnnotationType[] = [
  'linear-dimension',
  'angular-dimension',
  'radial-dimension',
  'diametric-dimension',
  'ordinate-dimension',
  'coordinate-dimension',
  'chamfer-dimension',
]

export function isPmiDimension(annotation: PmiAnnotation): annotation is PmiDimension {
  return DIMENSION_TYPES.includes(annotation.type)
}

/** The value a dimension shows: the override if it has one, else the measure. */
export function measuredPmiValue(annotation: PmiDimension): number {
  if (annotation.value !== undefined) return annotation.value

  switch (annotation.type) {
    case 'linear-dimension': {
      const delta = subtract(annotation.end, annotation.start)
      if (annotation.axis === 'x') return Math.abs(delta.x)
      if (annotation.axis === 'y') return Math.abs(delta.y)
      if (annotation.axis === 'z') return Math.abs(delta.z)
      return Math.hypot(delta.x, delta.y, delta.z)
    }
    case 'chamfer-dimension': {
      const delta = subtract(annotation.end, annotation.start)
      return Math.hypot(delta.x, delta.y, delta.z)
    }
    case 'angular-dimension': {
      const a = normalize(subtract(annotation.start, annotation.vertex))
      const b = normalize(subtract(annotation.end, annotation.vertex))
      const cosine = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z))
      return (Math.acos(cosine) * 180) / Math.PI
    }
    case 'radial-dimension':
      return annotation.radius
    case 'diametric-dimension':
      return annotation.radius * 2
    case 'ordinate-dimension': {
      const delta = subtract(annotation.point, annotation.origin)
      return delta[annotation.axis]
    }
    case 'coordinate-dimension': {
      // A coordinate callout has three numbers; the single value is the
      // distance from the origin, which is what a leader label shows.
      const delta = subtract(annotation.point, annotation.origin)
      return Math.hypot(delta.x, delta.y, delta.z)
    }
  }
}

/**
 * What the annotation reads as, ready to draw: the prefix, the symbol, the
 * value and the tolerance, in the order a print puts them.
 */
export function formatPmiAnnotation(annotation: PmiAnnotation, precision?: number): string {
  const digits = annotation.precision ?? precision ?? 2

  switch (annotation.type) {
    case 'note':
      return annotation.text
    case 'datum-feature':
      return annotation.letter
    case 'datum-target':
      return `${annotation.letter}${annotation.index}`
    case 'feature-control-frame': {
      const zone = `${annotation.diametral === true ? '⌀' : ''}${annotation.toleranceValue.toFixed(digits)}`
      const modifier = GDT_MODIFIER_GLYPHS[annotation.modifier ?? 'none']
      const datums = (annotation.datums ?? [])
        .map((datum) => `${datum.letter}${GDT_MODIFIER_GLYPHS[datum.modifier ?? 'none']}`)
        .join('|')
      const body = [GDT_GLYPHS[annotation.symbol], `${zone}${modifier}`, datums].filter(
        (part) => part !== '',
      )
      return `|${body.join('|')}|`
    }
    case 'surface-finish': {
      const values = [
        annotation.roughness === undefined ? '' : `Ra ${annotation.roughness}`,
        annotation.roughnessMax === undefined ? '' : `max ${annotation.roughnessMax}`,
        annotation.rz === undefined ? '' : `Rz ${annotation.rz}`,
        SURFACE_LAY_GLYPHS[annotation.lay ?? 'none'],
        annotation.process ?? '',
      ].filter((part) => part !== '')
      return values.join(' ')
    }
    case 'weld-symbol': {
      const size = annotation.size === undefined ? '' : String(annotation.size)
      const run =
        annotation.length === undefined
          ? ''
          : `${annotation.length}${annotation.pitch === undefined ? '' : `-${annotation.pitch}`}`
      return [size, annotation.weld, run].filter((part) => part !== '').join(' ')
    }
    case 'hole-callout': {
      const parts = [
        annotation.count === undefined ? '' : `${annotation.count}x`,
        annotation.thread ?? `⌀${annotation.diameter.toFixed(digits)}`,
        annotation.depth === undefined ? '' : `↧${annotation.depth.toFixed(digits)}`,
        annotation.counterboreDiameter === undefined
          ? ''
          : `⌴⌀${annotation.counterboreDiameter.toFixed(digits)}`,
        annotation.countersinkDiameter === undefined
          ? ''
          : `⌵⌀${annotation.countersinkDiameter.toFixed(digits)}`,
      ]
      return parts.filter((part) => part !== '').join(' ')
    }
    case 'coordinate-dimension': {
      const { x, y, z } = subtract(annotation.point, annotation.origin)
      return `(${x.toFixed(digits)}, ${y.toFixed(digits)}, ${z.toFixed(digits)})`
    }
    default: {
      const value = measuredPmiValue(annotation)
      const symbol = annotation.type === 'diametric-dimension' ? '⌀' : ''
      const unit = annotation.type === 'angular-dimension' ? '°' : ''
      const tolerance = annotation.tolerance
        ? formatTolerance(annotation.tolerance, value, digits)
        : ''
      return [
        `${annotation.prefix ?? ''}${symbol}${value.toFixed(digits)}${unit}`,
        tolerance,
        annotation.suffix ?? '',
      ]
        .filter((part) => part !== '')
        .join(' ')
    }
  }
}

/** A fresh id, so callers do not have to reach for `newId`. */
export function newPmiAnnotationId(): string {
  return newId()
}

/** The GD&T vocabulary, re-exported so PMI callers read it from one place. */
export { GDT_GLYPHS, GDT_MODIFIERS, GDT_MODIFIER_GLYPHS, GDT_SYMBOLS, SURFACE_FINISH_KINDS, WELD_TYPES }
export type { GdtModifier, GdtSymbol }

/**
 * Annotations are already JSON-shaped, so writing one is the identity. The
 * function exists so callers do not have to know that, and so a future format
 * change has one place to happen.
 */
export function pmiAnnotationToJSON(annotation: PmiAnnotation): PmiAnnotation {
  return annotation
}

/**
 * Narrows one parsed JSON entry to an annotation, or null when it is not one.
 * Only the fields every annotation must have are checked — a kind-specific
 * field that went missing leaves that annotation drawing degenerately rather
 * than failing the whole file open, which is how the drawing domain reads its
 * annotations too.
 */
export function pmiAnnotationFromJSON(value: unknown): PmiAnnotation | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>

  if (!isPmiAnnotationType(candidate.type)) return null
  if (typeof candidate.id !== 'string') return null
  if (candidate.viewId !== null && typeof candidate.viewId !== 'string') return null
  if (!isVec3(candidate.position)) return null
  if (!isAnnotationPlane(candidate.plane)) return null

  return candidate as unknown as PmiAnnotation
}

function isVec3(value: unknown): value is Vec3 {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.z === 'number'
  )
}

function isAnnotationPlane(value: unknown): value is AnnotationPlane {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return isVec3(candidate.origin) && isVec3(candidate.normal) && isVec3(candidate.xAxis)
}
