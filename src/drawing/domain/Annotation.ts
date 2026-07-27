import type { Vec2 } from '../../sketch/domain/geometry'
import { newId } from '../../sketch/domain/ids'

/**
 * Everything a drawing says on top of its line work: dimensions, notes, GD&T,
 * balloons and the rest.
 *
 * **Coordinates.** Point-valued fields — `position`, `start`, `end`, `center`,
 * `attachment` and the rest — are in the referenced view's local coordinates:
 * model units, measured from the middle of that view's projected extent. That
 * is what keeps a dimension attached to the feature it measures when the view
 * moves or the drawing is rescaled, and what lets a dimension report a length
 * in model units without knowing the scale. When `viewId` is null they are
 * absolute sheet millimetres instead, with the origin at the lower-left corner
 * and y pointing up.
 *
 * **Distances that are not geometry** — a dimension's `offset`, an angular
 * dimension's arc `radius`, a centre mark's `size`, a balloon's `radius` — are
 * sheet millimetres either way. They describe how the annotation is drawn, not
 * what it measures, so they should not shrink when the drawing is scaled down.
 *
 * **Values.** A dimension's `value` is an override. Left off, the renderer
 * measures the annotation's own geometry, which is what keeps a dimension
 * honest when the view behind it is regenerated.
 *
 * Annotations are plain immutable records, JSON-shaped as they stand, so the
 * drawing format needs no conversion layer for them.
 */

export const ANNOTATION_TYPES = [
  'linear-dimension',
  'aligned-dimension',
  'angular-dimension',
  'radial-dimension',
  'diametric-dimension',
  'ordinate-dimension',
  'note',
  'datum-feature',
  'datum-target',
  'feature-control-frame',
  'surface-finish',
  'weld-symbol',
  'center-mark',
  'center-line',
  'hole-callout',
  'balloon',
  'leader',
] as const

export type AnnotationType = (typeof ANNOTATION_TYPES)[number]

export type GeometryReferenceKind = 'edge' | 'vertex' | 'face' | 'circle'

/** What a piece of the drawing an annotation was attached to. */
export interface GeometryReference {
  readonly kind: GeometryReferenceKind
  /** Identifies the geometry within the referenced view. */
  readonly id: string
  /** Where it sat when the annotation was made, in view-local millimetres. */
  readonly point?: Vec2
}

export type ToleranceKind = 'none' | 'symmetrical' | 'deviation' | 'limits' | 'fit'

export interface Tolerance {
  readonly kind: ToleranceKind
  /** Upper deviation. Also the single value of a symmetrical tolerance. */
  readonly plus?: number
  /** Lower deviation, written as a positive magnitude. */
  readonly minus?: number
  /** ISO fit designation, e.g. "H7" or "g6". */
  readonly fit?: string
}

export const NO_TOLERANCE: Tolerance = { kind: 'none' }

export interface AnnotationBase {
  readonly id: string
  readonly type: AnnotationType
  /** Where the annotation's text sits. See the coordinates note above. */
  readonly position: Vec2
  /** The view this annotation belongs to, or null for a free sheet note. */
  readonly viewId: string | null
  readonly references?: readonly GeometryReference[]
  /** Overrides the measured value. */
  readonly value?: number
  readonly tolerance?: Tolerance
  /** Decimal places shown. Defaults to the drawing's precision. */
  readonly precision?: number
  /** Text size in millimetres. Defaults to the dimension style's. */
  readonly textSize?: number
  /** Free text placed before the value, e.g. "4x". */
  readonly prefix?: string
  /** Free text placed after the value, e.g. "TYP". */
  readonly suffix?: string
}

export interface LinearDimension extends AnnotationBase {
  readonly type: 'linear-dimension' | 'aligned-dimension'
  readonly start: Vec2
  readonly end: Vec2
  /**
   * Distance from the measured line out to the dimension line. Its sign picks
   * the side: positive is left of start→end, negative is right.
   */
  readonly offset: number
  /**
   * What a linear dimension measures. Aligned dimensions ignore this and
   * always measure along start→end.
   */
  readonly axis?: 'horizontal' | 'vertical' | 'parallel'
}

export interface AngularDimension extends AnnotationBase {
  readonly type: 'angular-dimension'
  readonly vertex: Vec2
  /** A point on the first leg. */
  readonly start: Vec2
  /** A point on the second leg. */
  readonly end: Vec2
  /** Radius of the dimension arc, measured from the vertex. */
  readonly radius: number
}

export interface RadialDimension extends AnnotationBase {
  readonly type: 'radial-dimension' | 'diametric-dimension'
  readonly center: Vec2
  readonly radius: number
  /** Direction of the leader out of the circle, in radians. */
  readonly leaderAngle: number
}

export interface OrdinateDimension extends AnnotationBase {
  readonly type: 'ordinate-dimension'
  /** The zero the ordinate is measured from. */
  readonly origin: Vec2
  readonly point: Vec2
  readonly axis: 'x' | 'y'
}

export interface NoteAnnotation extends AnnotationBase {
  readonly type: 'note'
  readonly text: string
  /** Where a leader points, if the note has one. */
  readonly attachment?: Vec2
}

export interface DatumFeatureAnnotation extends AnnotationBase {
  readonly type: 'datum-feature'
  /** The datum letter, e.g. "A". */
  readonly letter: string
  /** Where the datum's leader lands on the geometry. */
  readonly attachment: Vec2
}

export interface DatumTargetAnnotation extends AnnotationBase {
  readonly type: 'datum-target'
  readonly letter: string
  /** The target's number within the datum, e.g. the 2 of A2. */
  readonly index: number
  /** Diameter of the target area. Zero means a target point. */
  readonly targetSize: number
  readonly attachment: Vec2
}

/** The fourteen geometric characteristics of ASME Y14.5 / ISO 1101. */
export const GDT_SYMBOLS = [
  'straightness',
  'flatness',
  'circularity',
  'cylindricity',
  'profile-of-a-line',
  'profile-of-a-surface',
  'angularity',
  'perpendicularity',
  'parallelism',
  'position',
  'concentricity',
  'symmetry',
  'circular-runout',
  'total-runout',
] as const

export type GdtSymbol = (typeof GDT_SYMBOLS)[number]

export const GDT_GLYPHS: Readonly<Record<GdtSymbol, string>> = {
  straightness: '—',
  flatness: '▱',
  circularity: '○',
  cylindricity: '⌭',
  'profile-of-a-line': '⌒',
  'profile-of-a-surface': '⌓',
  angularity: '∠',
  perpendicularity: '⊥',
  parallelism: '∥',
  position: '⌖',
  concentricity: '◎',
  symmetry: '⌯',
  'circular-runout': '↗',
  'total-runout': '⌰',
}

/** Material condition and other modifiers that follow a tolerance value. */
export const GDT_MODIFIERS = ['none', 'mmc', 'lmc', 'rfs', 'projected', 'free-state', 'tangent-plane'] as const

export type GdtModifier = (typeof GDT_MODIFIERS)[number]

export const GDT_MODIFIER_GLYPHS: Readonly<Record<GdtModifier, string>> = {
  none: '',
  mmc: 'Ⓜ',
  lmc: 'Ⓛ',
  rfs: 'Ⓢ',
  projected: 'Ⓟ',
  'free-state': 'Ⓕ',
  'tangent-plane': 'Ⓣ',
}

export interface DatumReference {
  readonly letter: string
  readonly modifier?: GdtModifier
}

export interface FeatureControlFrameAnnotation extends AnnotationBase {
  readonly type: 'feature-control-frame'
  readonly symbol: GdtSymbol
  readonly toleranceValue: number
  /** Whether the tolerance zone is diametral — the ⌀ before the value. */
  readonly diametral?: boolean
  readonly modifier?: GdtModifier
  readonly datums?: readonly DatumReference[]
  readonly attachment?: Vec2
}

export const SURFACE_FINISH_KINDS = ['basic', 'machining-required', 'machining-prohibited'] as const

export type SurfaceFinishKind = (typeof SURFACE_FINISH_KINDS)[number]

export interface SurfaceFinishAnnotation extends AnnotationBase {
  readonly type: 'surface-finish'
  readonly finish: SurfaceFinishKind
  /** Ra in micrometres. */
  readonly roughness?: number
  /** Maximum Ra when a range is specified. */
  readonly roughnessMax?: number
  readonly process?: string
  readonly allAround?: boolean
  readonly attachment: Vec2
}

export const WELD_TYPES = [
  'fillet',
  'square-groove',
  'v-groove',
  'bevel-groove',
  'u-groove',
  'j-groove',
  'plug',
  'spot',
  'seam',
] as const

export type WeldType = (typeof WELD_TYPES)[number]

export interface WeldSymbolAnnotation extends AnnotationBase {
  readonly type: 'weld-symbol'
  readonly weld: WeldType
  /** Leg length or throat, in drawing units. */
  readonly size?: number
  readonly length?: number
  readonly pitch?: number
  /** True puts the symbol below the reference line — the arrow side. */
  readonly arrowSide?: boolean
  readonly fieldWeld?: boolean
  readonly allAround?: boolean
  readonly attachment: Vec2
}

export interface CenterMarkAnnotation extends AnnotationBase {
  readonly type: 'center-mark'
  readonly center: Vec2
  /** Half-length of each arm of the cross, in millimetres. */
  readonly size: number
  /** Extends the arms out past the feature as centre lines. */
  readonly extended?: boolean
  /** Radius the extended arms reach to. */
  readonly extendTo?: number
}

export interface CenterLineAnnotation extends AnnotationBase {
  readonly type: 'center-line'
  readonly start: Vec2
  readonly end: Vec2
}

export interface HoleCalloutAnnotation extends AnnotationBase {
  readonly type: 'hole-callout'
  readonly center: Vec2
  readonly diameter: number
  /** Blind-hole depth. Left off, the hole is through. */
  readonly depth?: number
  /** Instance count, written as the "4x" prefix. */
  readonly count?: number
  /** Thread designation, e.g. "M6x1". */
  readonly thread?: string
  readonly counterboreDiameter?: number
  readonly counterboreDepth?: number
  readonly countersinkDiameter?: number
  readonly countersinkAngle?: number
}

export const BALLOON_SHAPES = ['circle', 'hexagon', 'square', 'triangle'] as const

export type BalloonShape = (typeof BALLOON_SHAPES)[number]

export interface BalloonAnnotation extends AnnotationBase {
  readonly type: 'balloon'
  readonly label: string
  readonly radius: number
  readonly shape?: BalloonShape
  readonly attachment: Vec2
  /** Quantity written under the item number, as an assembly balloon does. */
  readonly quantity?: number
}

export interface LeaderAnnotation extends AnnotationBase {
  readonly type: 'leader'
  readonly text: string
  readonly attachment: Vec2
  /** Elbow between the arrow and the text. Straight leader when absent. */
  readonly bend?: Vec2
}

export type Annotation =
  | LinearDimension
  | AngularDimension
  | RadialDimension
  | OrdinateDimension
  | NoteAnnotation
  | DatumFeatureAnnotation
  | DatumTargetAnnotation
  | FeatureControlFrameAnnotation
  | SurfaceFinishAnnotation
  | WeldSymbolAnnotation
  | CenterMarkAnnotation
  | CenterLineAnnotation
  | HoleCalloutAnnotation
  | BalloonAnnotation
  | LeaderAnnotation

/** Every dimension kind, for the code paths that only care about those. */
export type DimensionAnnotation =
  | LinearDimension
  | AngularDimension
  | RadialDimension
  | OrdinateDimension

const DIMENSION_TYPES: readonly AnnotationType[] = [
  'linear-dimension',
  'aligned-dimension',
  'angular-dimension',
  'radial-dimension',
  'diametric-dimension',
  'ordinate-dimension',
]

export function isDimension(annotation: Annotation): annotation is DimensionAnnotation {
  return DIMENSION_TYPES.includes(annotation.type)
}

export function isAnnotationType(value: unknown): value is AnnotationType {
  return (ANNOTATION_TYPES as readonly string[]).includes(value as string)
}

/** The value a dimension shows: the override if it has one, else the measure. */
export function measuredValue(annotation: DimensionAnnotation): number {
  if (annotation.value !== undefined) return annotation.value

  switch (annotation.type) {
    case 'linear-dimension': {
      const dx = annotation.end.x - annotation.start.x
      const dy = annotation.end.y - annotation.start.y
      if (annotation.axis === 'horizontal') return Math.abs(dx)
      if (annotation.axis === 'vertical') return Math.abs(dy)
      return Math.hypot(dx, dy)
    }
    case 'aligned-dimension':
      return Math.hypot(
        annotation.end.x - annotation.start.x,
        annotation.end.y - annotation.start.y,
      )
    case 'angular-dimension': {
      const a = Math.atan2(
        annotation.start.y - annotation.vertex.y,
        annotation.start.x - annotation.vertex.x,
      )
      const b = Math.atan2(
        annotation.end.y - annotation.vertex.y,
        annotation.end.x - annotation.vertex.x,
      )
      // The angle actually swept between the legs, never the reflex one.
      const swept = Math.abs(b - a) % (Math.PI * 2)
      const inner = swept > Math.PI ? Math.PI * 2 - swept : swept
      return (inner * 180) / Math.PI
    }
    case 'radial-dimension':
      return annotation.radius
    case 'diametric-dimension':
      return annotation.radius * 2
    case 'ordinate-dimension':
      return annotation.axis === 'x'
        ? annotation.point.x - annotation.origin.x
        : annotation.point.y - annotation.origin.y
  }
}

/** A fresh id for an annotation, so callers do not have to reach for `newId`. */
export function newAnnotationId(): string {
  return newId()
}

/**
 * Narrows one parsed JSON entry to an annotation, or null when it is not one.
 * Only the fields every annotation must have are checked — a kind-specific
 * field that went missing leaves that annotation drawing degenerately rather
 * than failing the whole file open.
 */
export function annotationFromJSON(value: unknown): Annotation | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (!isAnnotationType(candidate.type)) return null
  if (typeof candidate.id !== 'string') return null
  if (candidate.viewId !== null && typeof candidate.viewId !== 'string') return null
  if (!isVec2(candidate.position)) return null
  return candidate as unknown as Annotation
}

function isVec2(value: unknown): value is Vec2 {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.x === 'number' && typeof candidate.y === 'number'
}
