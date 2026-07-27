import type { Vec2 } from '../../sketch/domain/geometry'
import { newId } from '../../sketch/domain/ids'

/**
 * One view on a drawing sheet: what it looks at, from where, and how big.
 *
 * A view is plain immutable data — the geometry it shows is regenerated from
 * the model on demand rather than stored, so a view survives the part changing
 * underneath it. `position` is where the middle of the view sits on the sheet,
 * in millimetres from the sheet's lower-left corner with y pointing up, and the
 * projected geometry is centred on it. Centres rather than origins, because
 * what a drafter drags is the picture, not the part's origin — which may not
 * even be inside it.
 *
 * The specialised fields are nullable rather than split into a union so the
 * editor can hold one shape for every view and the format stays flat.
 */

export const VIEW_TYPES = ['orthographic', 'section', 'detail', 'auxiliary', 'isometric'] as const

export type ViewType = (typeof VIEW_TYPES)[number]

/** The directions a standard view can look from. */
export const VIEW_ORIENTATIONS = [
  'front',
  'back',
  'top',
  'bottom',
  'left',
  'right',
  'isometric',
  'dimetric',
  'trimetric',
] as const

export type ViewOrientation = (typeof VIEW_ORIENTATIONS)[number]

/** First angle is the ISO convention, third angle the ANSI one. */
export type ProjectionAngle = 'first' | 'third'

export interface ViewDisplayOptions {
  readonly visibleEdges: boolean
  readonly hiddenEdges: boolean
  readonly tangentEdges: boolean
  readonly shading: boolean
}

export const DEFAULT_DISPLAY_OPTIONS: ViewDisplayOptions = {
  visibleEdges: true,
  hiddenEdges: false,
  tangentEdges: false,
  shading: false,
}

export const SECTION_KINDS = ['full', 'half', 'offset', 'broken-out', 'rotated'] as const

export type SectionKind = (typeof SECTION_KINDS)[number]

/**
 * Points on a section line, a detail circle and an auxiliary reference are all
 * in the parent view's local coordinates: model units, measured from the middle
 * of that view's projected extent — the same frame the annotations use.
 */
export interface SectionLine {
  /** Start of the cut, in the parent view's local coordinates. */
  readonly start: Vec2
  readonly end: Vec2
  /** The letter pair the section is labelled with, e.g. "A". */
  readonly reference: string
  readonly kind?: SectionKind
  /**
   * Intermediate points of an offset section's jogged cut. The full path is
   * start, these points, then end.
   */
  readonly points?: readonly Vec2[]
  /** Flips which side of the cut is kept. */
  readonly flip?: boolean
  /**
   * Half sections stop the cut at this point on the perpendicular; broken-out
   * sections use it as the depth the break reaches to.
   */
  readonly depth?: number
  /** Rotation applied to a rotated (aligned) section, in degrees. */
  readonly rotation?: number
  readonly hatchAngle?: number
  readonly hatchSpacing?: number
}

export interface DetailCircle {
  /** Centre in the parent view's local coordinates. */
  readonly center: Vec2
  readonly radius: number
  /** The letter the detail is labelled with, e.g. "B". */
  readonly reference?: string
  /** Draws the detail's own boundary as a broken line rather than a circle. */
  readonly broken?: boolean
}

/** The edge an auxiliary view is projected square to. */
export interface AuxiliaryReference {
  /** Start of the reference edge, in the parent view's local coordinates. */
  readonly start: Vec2
  readonly end: Vec2
  /** Flips the side the auxiliary is projected to. */
  readonly flip?: boolean
}

export interface DrawingView {
  readonly id: string
  readonly name: string
  readonly type: ViewType
  readonly orientation: ViewOrientation
  /** Where the middle of the view sits on the sheet, in millimetres. */
  readonly position: Vec2
  /** Per-view scale override. Null takes the drawing's scale. */
  readonly scale: number | null
  /** Which part or assembly body set this view shows. */
  readonly sourcePartId: string
  /** The view this one is projected, sectioned or detailed from. */
  readonly parentViewId: string | null
  readonly sectionLine: SectionLine | null
  readonly detailCircle: DetailCircle | null
  readonly auxiliaryReference: AuxiliaryReference | null
  readonly displayOptions: ViewDisplayOptions
  /** Rotation of the projected geometry on the sheet, in degrees. */
  readonly rotation: number
  /** Drawn under the view. Left off, one is derived from the view's kind. */
  readonly label: string | null
  /** Keeps a projected view lined up with its parent when the parent moves. */
  readonly alignedToParent: boolean
}

export interface CreateViewOptions {
  readonly id?: string
  readonly name?: string
  readonly type?: ViewType
  readonly orientation?: ViewOrientation
  readonly position?: Vec2
  readonly scale?: number | null
  readonly sourcePartId?: string
  readonly parentViewId?: string | null
  readonly sectionLine?: SectionLine | null
  readonly detailCircle?: DetailCircle | null
  readonly auxiliaryReference?: AuxiliaryReference | null
  readonly displayOptions?: Partial<ViewDisplayOptions>
  readonly rotation?: number
  readonly label?: string | null
  readonly alignedToParent?: boolean
}

export function createView(options: CreateViewOptions = {}): DrawingView {
  const type = options.type ?? 'orthographic'
  const orientation = options.orientation ?? (type === 'isometric' ? 'isometric' : 'front')
  return {
    id: options.id ?? newId(),
    name: options.name ?? defaultViewName(type, orientation),
    type,
    orientation,
    position: options.position ?? { x: 0, y: 0 },
    scale: options.scale ?? null,
    sourcePartId: options.sourcePartId ?? '',
    parentViewId: options.parentViewId ?? null,
    sectionLine: options.sectionLine ?? null,
    detailCircle: options.detailCircle ?? null,
    auxiliaryReference: options.auxiliaryReference ?? null,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, ...options.displayOptions },
    rotation: options.rotation ?? 0,
    label: options.label ?? null,
    alignedToParent: options.alignedToParent ?? options.parentViewId != null,
  }
}

function defaultViewName(type: ViewType, orientation: ViewOrientation): string {
  if (type === 'orthographic' || type === 'isometric') return capitalize(orientation)
  return capitalize(type)
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase() ?? ''}${text.slice(1)}`
}

/** What is written under the view: "SECTION A-A", "DETAIL B", or its name. */
export function viewLabel(view: DrawingView, scaleText?: string): string {
  if (view.label !== null) return view.label

  const base = ((): string => {
    if (view.type === 'section' && view.sectionLine) {
      const reference = view.sectionLine.reference
      return `SECTION ${reference}-${reference}`
    }
    if (view.type === 'detail') return `DETAIL ${view.detailCircle?.reference ?? 'A'}`
    if (view.type === 'auxiliary') return 'AUXILIARY VIEW'
    return view.name.toUpperCase()
  })()
  return scaleText ? `${base} (${scaleText})` : base
}

/** The effective scale of a view: its own, or the drawing's when it has none. */
export function viewScale(view: DrawingView, drawingScale: number): number {
  const scale = view.scale ?? drawingScale
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

/** The full cut path of a section line, including any offset jogs. */
export function sectionPath(line: SectionLine): readonly Vec2[] {
  return [line.start, ...(line.points ?? []), line.end]
}

export function isViewType(value: unknown): value is ViewType {
  return (VIEW_TYPES as readonly string[]).includes(value as string)
}

export function isViewOrientation(value: unknown): value is ViewOrientation {
  return (VIEW_ORIENTATIONS as readonly string[]).includes(value as string)
}

/**
 * Narrows one parsed JSON entry to a view, or null when it is not one. Missing
 * optional structure is filled from the defaults rather than rejected, so an
 * older drawing still opens.
 */
export function viewFromJSON(value: unknown): DrawingView | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string') return null
  if (!isViewType(candidate.type)) return null

  const position = candidate.position as Record<string, unknown> | undefined
  const display = (candidate.displayOptions ?? {}) as Record<string, unknown>

  return {
    id: candidate.id,
    name: typeof candidate.name === 'string' ? candidate.name : candidate.id,
    type: candidate.type,
    orientation: isViewOrientation(candidate.orientation) ? candidate.orientation : 'front',
    position: {
      x: numberOr(position?.x, 0),
      y: numberOr(position?.y, 0),
    },
    scale: typeof candidate.scale === 'number' && candidate.scale > 0 ? candidate.scale : null,
    sourcePartId: typeof candidate.sourcePartId === 'string' ? candidate.sourcePartId : '',
    parentViewId: typeof candidate.parentViewId === 'string' ? candidate.parentViewId : null,
    sectionLine: sectionLineFromJSON(candidate.sectionLine),
    detailCircle: detailCircleFromJSON(candidate.detailCircle),
    auxiliaryReference: auxiliaryFromJSON(candidate.auxiliaryReference),
    displayOptions: {
      visibleEdges: booleanOr(display.visibleEdges, DEFAULT_DISPLAY_OPTIONS.visibleEdges),
      hiddenEdges: booleanOr(display.hiddenEdges, DEFAULT_DISPLAY_OPTIONS.hiddenEdges),
      tangentEdges: booleanOr(display.tangentEdges, DEFAULT_DISPLAY_OPTIONS.tangentEdges),
      shading: booleanOr(display.shading, DEFAULT_DISPLAY_OPTIONS.shading),
    },
    rotation: numberOr(candidate.rotation, 0),
    label: typeof candidate.label === 'string' ? candidate.label : null,
    alignedToParent: booleanOr(candidate.alignedToParent, typeof candidate.parentViewId === 'string'),
  }
}

function sectionLineFromJSON(value: unknown): SectionLine | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  const start = vec2FromJSON(candidate.start)
  const end = vec2FromJSON(candidate.end)
  if (!start || !end) return null
  return {
    ...(candidate as object),
    start,
    end,
    reference: typeof candidate.reference === 'string' ? candidate.reference : 'A',
  } as SectionLine
}

function detailCircleFromJSON(value: unknown): DetailCircle | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  const center = vec2FromJSON(candidate.center)
  if (!center) return null
  const radius = numberOr(candidate.radius, 0)
  if (radius <= 0) return null
  return { ...(candidate as object), center, radius } as DetailCircle
}

function auxiliaryFromJSON(value: unknown): AuxiliaryReference | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  const start = vec2FromJSON(candidate.start)
  const end = vec2FromJSON(candidate.end)
  if (!start || !end) return null
  return { ...(candidate as object), start, end } as AuxiliaryReference
}

function vec2FromJSON(value: unknown): Vec2 | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.x !== 'number' || typeof candidate.y !== 'number') return null
  return { x: candidate.x, y: candidate.y }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
