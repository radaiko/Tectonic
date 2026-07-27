import type { Vec3 } from '../domain/vec3'
import { normalize } from '../domain/vec3'
import { newId } from '../sketch/domain/ids'
import type { AnnotationPlane, PmiAnnotation } from './PmiAnnotation'
import { pmiAnnotationFromJSON, planeFacing } from './PmiAnnotation'

/**
 * Annotation views: the 3D answer to a drawing's views.
 *
 * PMI on a model gets unreadable the moment every dimension is visible at once,
 * so annotations are grouped the way a draughtsman would group them — the ones
 * you read looking at the front, the ones you read from the top, and so on.
 * Each view names an orientation, owns its annotations, and can be switched off
 * on its own. Turning to a view both points the camera and shows exactly the
 * annotations that were authored to be read from there.
 *
 * A view is a grouping, not a projection. Its annotations keep their own model-
 * space geometry; the orientation only says which way the reader is looking.
 */

export const PMI_VIEW_ORIENTATIONS = [
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
  'isometric',
  'custom',
] as const

export type PmiViewOrientation = (typeof PMI_VIEW_ORIENTATIONS)[number]

export function isPmiViewOrientation(value: unknown): value is PmiViewOrientation {
  return (PMI_VIEW_ORIENTATIONS as readonly string[]).includes(value as string)
}

/** Which way the reader looks, and which way is up, for each named orientation. */
export interface ViewDirection {
  /** From the model towards the eye — the direction annotations face. */
  readonly normal: Vec3
  readonly up: Vec3
}

const ISO = 1 / Math.sqrt(3)

export const ORIENTATION_DIRECTIONS: Readonly<
  Record<Exclude<PmiViewOrientation, 'custom'>, ViewDirection>
> = {
  front: { normal: { x: 0, y: -1, z: 0 }, up: { x: 0, y: 0, z: 1 } },
  back: { normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: 1 } },
  left: { normal: { x: -1, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } },
  right: { normal: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } },
  top: { normal: { x: 0, y: 0, z: 1 }, up: { x: 0, y: 1, z: 0 } },
  bottom: { normal: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } },
  isometric: { normal: { x: ISO, y: -ISO, z: ISO }, up: { x: 0, y: 0, z: 1 } },
}

export interface PmiViewJSON {
  readonly id: string
  readonly name: string
  readonly orientation: PmiViewOrientation
  /** Only meaningful when `orientation` is custom. */
  readonly direction: ViewDirection | null
  readonly visible: boolean
  readonly precision: number
  readonly annotations: readonly PmiAnnotation[]
}

/** Every field is nullable so `fromJSON` can pass a miss straight through. */
export interface PmiViewInit {
  readonly id?: string | undefined
  readonly name?: string | undefined
  readonly orientation?: PmiViewOrientation | undefined
  readonly direction?: ViewDirection | null | undefined
  readonly visible?: boolean | undefined
  readonly precision?: number | undefined
}

export class PmiView {
  readonly id: string
  name: string
  orientation: PmiViewOrientation
  /** The custom look direction. Ignored unless `orientation` is custom. */
  direction: ViewDirection | null
  visible: boolean
  /** Decimal places an annotation shows unless it overrides this. */
  precision: number
  annotations: PmiAnnotation[]

  constructor(init: PmiViewInit = {}) {
    this.id = init.id ?? newId()
    this.orientation = isPmiViewOrientation(init.orientation) ? init.orientation : 'front'
    this.name = init.name ?? defaultViewName(this.orientation)
    this.direction = init.direction ?? null
    this.visible = init.visible ?? true
    this.precision = init.precision ?? 2
    this.annotations = []
  }

  get annotationCount(): number {
    return this.annotations.length
  }

  /** Where the reader stands: the named direction, or the custom one. */
  get viewDirection(): ViewDirection {
    if (this.orientation === 'custom' && this.direction !== null) {
      return {
        normal: normalize(this.direction.normal),
        up: normalize(this.direction.up),
      }
    }
    const named = this.orientation === 'custom' ? 'front' : this.orientation
    return ORIENTATION_DIRECTIONS[named]
  }

  /** The plane a new annotation dropped at `origin` should sit on in this view. */
  planeAt(origin: Vec3): AnnotationPlane {
    return planeFacing(origin, this.viewDirection.normal)
  }

  // ---------------------------------------------------------- annotations

  add(annotation: PmiAnnotation): PmiAnnotation {
    // A view owns its annotations, so the id is stamped on the way in and the
    // caller never has to keep the two in step.
    const owned = annotation.viewId === this.id ? annotation : { ...annotation, viewId: this.id }
    this.annotations.push(owned)
    return owned
  }

  addAll(annotations: readonly PmiAnnotation[]): void {
    for (const annotation of annotations) this.add(annotation)
  }

  get(id: string): PmiAnnotation | undefined {
    return this.annotations.find((annotation) => annotation.id === id)
  }

  /** Replaces an annotation with the same annotation carrying `changes`. */
  update(id: string, changes: Partial<PmiAnnotation>): PmiAnnotation | null {
    const index = this.annotations.findIndex((annotation) => annotation.id === id)
    if (index < 0) return null
    const updated = {
      ...(this.annotations[index] as PmiAnnotation),
      ...changes,
      id,
    } as PmiAnnotation
    this.annotations[index] = updated
    return updated
  }

  remove(id: string): boolean {
    const before = this.annotations.length
    this.annotations = this.annotations.filter((annotation) => annotation.id !== id)
    return this.annotations.length < before
  }

  /** Every annotation attached to a piece of topology. */
  annotationsOn(attachmentId: string): PmiAnnotation[] {
    return this.annotations.filter(
      (annotation) =>
        (annotation.references ?? []).some((reference) => reference.id === attachmentId) ||
        (annotation.leaders ?? []).some((leader) => leader.attachment.id === attachmentId),
    )
  }

  // --------------------------------------------------------------- format

  toJSON(): PmiViewJSON {
    return {
      id: this.id,
      name: this.name,
      orientation: this.orientation,
      direction: this.direction,
      visible: this.visible,
      precision: this.precision,
      annotations: this.annotations,
    }
  }

  static fromJSON(value: unknown): PmiView {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Annotation view must be a JSON object')
    }
    const candidate = value as Record<string, unknown>

    const view = new PmiView({
      id: typeof candidate.id === 'string' ? candidate.id : undefined,
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      orientation: isPmiViewOrientation(candidate.orientation) ? candidate.orientation : undefined,
      direction: directionFromJSON(candidate.direction),
      visible: candidate.visible !== false,
      precision:
        typeof candidate.precision === 'number' && candidate.precision >= 0
          ? Math.floor(candidate.precision)
          : undefined,
    })

    if (Array.isArray(candidate.annotations)) {
      for (const entry of candidate.annotations) {
        const annotation = pmiAnnotationFromJSON(entry)
        if (annotation) view.annotations.push(annotation)
      }
    }
    return view
  }
}

export function defaultViewName(orientation: PmiViewOrientation): string {
  const capitalized = orientation.charAt(0).toUpperCase() + orientation.slice(1)
  return `${capitalized} annotations`
}

function directionFromJSON(value: unknown): ViewDirection | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  const normal = vec3FromJSON(candidate.normal)
  const up = vec3FromJSON(candidate.up)
  return normal && up ? { normal, up } : null
}

function vec3FromJSON(value: unknown): Vec3 | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.x !== 'number' ||
    typeof candidate.y !== 'number' ||
    typeof candidate.z !== 'number'
  ) {
    return null
  }
  return { x: candidate.x, y: candidate.y, z: candidate.z }
}

export interface PmiViewSetJSON {
  readonly views: readonly PmiViewJSON[]
  readonly activeViewId: string | null
  readonly showAnnotations: boolean
}

/**
 * Every annotation view on a model, plus the master switch.
 *
 * `showAnnotations` is deliberately separate from each view's `visible`: the
 * "hide all PMI" button should not lose which views were on when it is turned
 * back off again.
 */
export class PmiViewSet {
  views: PmiView[] = []
  activeViewId: string | null = null
  /** Master switch. False hides every annotation whatever its view says. */
  showAnnotations = true

  get viewCount(): number {
    return this.views.length
  }

  get activeView(): PmiView | null {
    return this.activeViewId === null ? null : (this.get(this.activeViewId) ?? null)
  }

  addView(view: PmiView): PmiView {
    this.views.push(view)
    if (this.activeViewId === null) this.activeViewId = view.id
    return view
  }

  /** Creates and adds a view for a named orientation. */
  createView(orientation: PmiViewOrientation, name?: string): PmiView {
    return this.addView(new PmiView(name === undefined ? { orientation } : { orientation, name }))
  }

  get(id: string): PmiView | undefined {
    return this.views.find((view) => view.id === id)
  }

  removeView(id: string): boolean {
    const before = this.views.length
    this.views = this.views.filter((view) => view.id !== id)
    if (this.activeViewId === id) this.activeViewId = this.views[0]?.id ?? null
    return this.views.length < before
  }

  setActive(id: string | null): PmiView | null {
    if (id === null) {
      this.activeViewId = null
      return null
    }
    const view = this.get(id)
    if (!view) return null
    this.activeViewId = id
    return view
  }

  /** Toggles one view and reports what it ended up as. */
  toggleView(id: string): boolean {
    const view = this.get(id)
    if (!view) return false
    view.visible = !view.visible
    return view.visible
  }

  showAll(): void {
    this.showAnnotations = true
    for (const view of this.views) view.visible = true
  }

  hideAll(): void {
    this.showAnnotations = false
  }

  /** Every annotation a reader would currently see. */
  visibleAnnotations(): PmiAnnotation[] {
    if (!this.showAnnotations) return []
    return this.views.filter((view) => view.visible).flatMap((view) => view.annotations)
  }

  allAnnotations(): PmiAnnotation[] {
    return this.views.flatMap((view) => view.annotations)
  }

  /** The view an annotation belongs to, or null when nothing owns it. */
  viewOf(annotationId: string): PmiView | null {
    return this.views.find((view) => view.get(annotationId) !== undefined) ?? null
  }

  toJSON(): PmiViewSetJSON {
    return {
      views: this.views.map((view) => view.toJSON()),
      activeViewId: this.activeViewId,
      showAnnotations: this.showAnnotations,
    }
  }

  static fromJSON(value: unknown): PmiViewSet {
    const set = new PmiViewSet()
    if (typeof value !== 'object' || value === null) return set
    const candidate = value as Record<string, unknown>

    if (Array.isArray(candidate.views)) {
      for (const entry of candidate.views) {
        try {
          set.views.push(PmiView.fromJSON(entry))
        } catch {
          // A view this build cannot read is dropped, not fatal to the open.
        }
      }
    }
    set.showAnnotations = candidate.showAnnotations !== false
    set.activeViewId =
      typeof candidate.activeViewId === 'string' && set.get(candidate.activeViewId)
        ? candidate.activeViewId
        : (set.views[0]?.id ?? null)
    return set
  }
}
