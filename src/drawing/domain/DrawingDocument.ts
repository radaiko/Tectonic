import type { LengthUnit } from '../../domain/Document'
import type { Vec2 } from '../../sketch/domain/geometry'
import { newId } from '../../sketch/domain/ids'
import type { Annotation } from './Annotation'
import { annotationFromJSON } from './Annotation'
import type { DrawingView, ProjectionAngle } from './DrawingView'
import { viewFromJSON } from './DrawingView'
import type { RevisionInput, RevisionTable } from './RevisionTable'
import { addRevision, createRevisionTable, currentRevision, revisionTableFromJSON } from './RevisionTable'
import type { SheetExtent, SheetOrientation, SheetSizeName, SheetSpec } from './sheet'
import { isSheetOrientation, isSheetSizeName, sheetExtent, sheetFrame } from './sheet'
import type { TitleBlock } from './TitleBlock'
import { createTitleBlock, setTitleBlockValues, titleBlockFromJSON } from './TitleBlock'
import { formatScale } from './scale'

/**
 * A drawing: one sheet, the views on it, everything written on them, and the
 * blocks in the corner.
 *
 * This is the one mutable object in the drawing domain. Views and annotations
 * are immutable records held in arrays, so an edit replaces an entry rather
 * than mutating it — which is what lets the editor tell React that something
 * changed by bumping a revision counter instead of deep-comparing the sheet.
 *
 * Nothing here imports React, three.js or the kernel; the geometry a view shows
 * is produced by `drawing/views` from a mesh at render time and never stored.
 */

export const DRAWING_FORMAT_VERSION = 1

export interface DrawingDocumentJSON {
  readonly version: number
  readonly id: string
  readonly name: string
  readonly sheetSize: SheetSizeName
  readonly orientation: SheetOrientation
  readonly customSheet?: SheetExtent
  readonly scale: number
  readonly units: LengthUnit
  readonly projectionAngle: ProjectionAngle
  readonly precision: number
  readonly views: readonly DrawingView[]
  readonly annotations: readonly Annotation[]
  readonly titleBlock: TitleBlock
  readonly revisionTable: RevisionTable
}

/** Every field is nullable so `fromJSON` can pass a miss straight through. */
export interface DrawingDocumentInit {
  readonly id?: string | undefined
  readonly name?: string | undefined
  readonly sheetSize?: SheetSizeName | undefined
  readonly orientation?: SheetOrientation | undefined
  readonly customSheet?: SheetExtent | undefined
  readonly scale?: number | undefined
  readonly units?: LengthUnit | undefined
  readonly projectionAngle?: ProjectionAngle | undefined
  readonly precision?: number | undefined
  readonly titleBlock?: TitleBlock | undefined
  readonly revisionTable?: RevisionTable | undefined
}

export class DrawingDocument {
  readonly id: string
  name: string
  sheetSize: SheetSizeName
  orientation: SheetOrientation
  /** Portrait extent of a custom sheet. Ignored unless `sheetSize` is Custom. */
  customSheet: SheetExtent | null
  /** Paper-to-model ratio: 1 is full size, 0.5 is 1:2. */
  scale: number
  /** The unit the model's coordinates are in. */
  units: LengthUnit
  projectionAngle: ProjectionAngle
  /** Decimal places a dimension shows unless it overrides this. */
  precision: number
  views: DrawingView[]
  annotations: Annotation[]
  titleBlock: TitleBlock
  revisionTable: RevisionTable

  constructor(init: DrawingDocumentInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Drawing 1'
    this.sheetSize = init.sheetSize ?? 'A3'
    this.orientation = init.orientation ?? 'landscape'
    this.customSheet = init.customSheet ?? null
    this.scale = init.scale ?? 1
    this.units = init.units ?? 'mm'
    this.projectionAngle = init.projectionAngle ?? 'third'
    this.precision = init.precision ?? 2
    this.views = []
    this.annotations = []
    this.titleBlock = init.titleBlock ?? createTitleBlock({ scale: formatScale(this.scale) })
    this.revisionTable = init.revisionTable ?? createRevisionTable()
  }

  // ---------------------------------------------------------------- sheet

  get sheet(): SheetSpec {
    return this.customSheet
      ? { size: this.sheetSize, orientation: this.orientation, custom: this.customSheet }
      : { size: this.sheetSize, orientation: this.orientation }
  }

  /** Sheet width and height in millimetres, orientation applied. */
  get extent(): SheetExtent {
    return sheetExtent(this.sheet)
  }

  /** The drawing frame rectangle in sheet millimetres. */
  get frame(): { x: number; y: number; width: number; height: number } {
    return sheetFrame(this.sheet)
  }

  setSheetSize(size: SheetSizeName, custom?: SheetExtent): void {
    this.sheetSize = size
    if (custom) this.customSheet = custom
  }

  setOrientation(orientation: SheetOrientation): void {
    this.orientation = orientation
  }

  /** Sets the drawing scale and keeps the title block's SCALE field honest. */
  setScale(scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0) return
    this.scale = scale
    this.titleBlock = setTitleBlockValues(this.titleBlock, { scale: formatScale(scale) })
  }

  // ---------------------------------------------------------------- views

  addView(view: DrawingView): DrawingView {
    this.views.push(view)
    return view
  }

  getView(id: string): DrawingView | undefined {
    return this.views.find((view) => view.id === id)
  }

  /** Views projected, sectioned or detailed from `id`. */
  childViews(id: string): DrawingView[] {
    return this.views.filter((view) => view.parentViewId === id)
  }

  /** Replaces a view with the same view carrying `changes`. */
  updateView(id: string, changes: Partial<DrawingView>): DrawingView | null {
    const index = this.views.findIndex((view) => view.id === id)
    if (index < 0) return null
    const updated = { ...(this.views[index] as DrawingView), ...changes, id }
    this.views[index] = updated
    return updated
  }

  /**
   * Moves a view to a sheet position. Children that are aligned to it — the
   * projected views lined up beside it — travel the same delta, so a standard
   * three-view layout stays square when the front view is dragged.
   */
  moveView(id: string, position: Vec2): DrawingView | null {
    const view = this.getView(id)
    if (!view) return null
    const delta = { x: position.x - view.position.x, y: position.y - view.position.y }
    const moved = this.updateView(id, { position })
    if (delta.x !== 0 || delta.y !== 0) this.#dragChildren(id, delta)
    return moved
  }

  #dragChildren(id: string, delta: Vec2): void {
    for (const child of this.childViews(id)) {
      if (!child.alignedToParent) continue
      const position = { x: child.position.x + delta.x, y: child.position.y + delta.y }
      this.updateView(child.id, { position })
      this.#dragChildren(child.id, delta)
    }
  }

  /**
   * Removes a view along with everything built on it and every annotation that
   * pointed at any of them — a dimension with no view to sit on is worse than
   * no dimension. Returns the ids that went.
   */
  removeView(id: string): string[] {
    if (!this.getView(id)) return []

    const removed: string[] = []
    const collect = (viewId: string): void => {
      removed.push(viewId)
      for (const child of this.childViews(viewId)) collect(child.id)
    }
    collect(id)

    const gone = new Set(removed)
    this.views = this.views.filter((view) => !gone.has(view.id))
    this.annotations = this.annotations.filter(
      (annotation) => annotation.viewId === null || !gone.has(annotation.viewId),
    )
    return removed
  }

  // ---------------------------------------------------------- annotations

  addAnnotation(annotation: Annotation): Annotation {
    this.annotations.push(annotation)
    return annotation
  }

  addAnnotations(annotations: readonly Annotation[]): void {
    this.annotations.push(...annotations)
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.find((annotation) => annotation.id === id)
  }

  annotationsForView(viewId: string | null): Annotation[] {
    return this.annotations.filter((annotation) => annotation.viewId === viewId)
  }

  updateAnnotation(id: string, changes: Partial<Annotation>): Annotation | null {
    const index = this.annotations.findIndex((annotation) => annotation.id === id)
    if (index < 0) return null
    const updated = {
      ...(this.annotations[index] as Annotation),
      ...changes,
      id,
    } as Annotation
    this.annotations[index] = updated
    return updated
  }

  removeAnnotation(id: string): boolean {
    const before = this.annotations.length
    this.annotations = this.annotations.filter((annotation) => annotation.id !== id)
    return this.annotations.length < before
  }

  // ------------------------------------------------------------- revision

  /** Adds a revision row and mirrors the new letter into the title block. */
  reviseDrawing(input: RevisionInput): RevisionTable {
    this.revisionTable = addRevision(this.revisionTable, input)
    this.titleBlock = setTitleBlockValues(this.titleBlock, {
      revision: currentRevision(this.revisionTable),
    })
    return this.revisionTable
  }

  // --------------------------------------------------------------- format

  toJSON(): DrawingDocumentJSON {
    const json: DrawingDocumentJSON = {
      version: DRAWING_FORMAT_VERSION,
      id: this.id,
      name: this.name,
      sheetSize: this.sheetSize,
      orientation: this.orientation,
      scale: this.scale,
      units: this.units,
      projectionAngle: this.projectionAngle,
      precision: this.precision,
      views: this.views,
      annotations: this.annotations,
      titleBlock: this.titleBlock,
      revisionTable: this.revisionTable,
    }
    return this.customSheet ? { ...json, customSheet: this.customSheet } : json
  }

  /**
   * Reads a drawing back. Entries this build cannot make sense of are dropped
   * rather than failing the open, matching how the feature tree loads.
   */
  static fromJSON(value: unknown): DrawingDocument {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Drawing must be a JSON object')
    }
    const candidate = value as Record<string, unknown>

    const drawing = new DrawingDocument({
      id: typeof candidate.id === 'string' ? candidate.id : undefined,
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      sheetSize: isSheetSizeName(candidate.sheetSize) ? candidate.sheetSize : undefined,
      orientation: isSheetOrientation(candidate.orientation) ? candidate.orientation : undefined,
      customSheet: extentFromJSON(candidate.customSheet),
      scale: positiveOr(candidate.scale, undefined),
      units: typeof candidate.units === 'string' ? (candidate.units as LengthUnit) : undefined,
      projectionAngle: candidate.projectionAngle === 'first' ? 'first' : 'third',
      precision:
        typeof candidate.precision === 'number' && candidate.precision >= 0
          ? Math.floor(candidate.precision)
          : undefined,
      titleBlock: titleBlockFromJSON(candidate.titleBlock),
      revisionTable: revisionTableFromJSON(candidate.revisionTable),
    })

    if (Array.isArray(candidate.views)) {
      for (const entry of candidate.views) {
        const view = viewFromJSON(entry)
        if (view) drawing.views.push(view)
      }
    }
    if (Array.isArray(candidate.annotations)) {
      for (const entry of candidate.annotations) {
        const annotation = annotationFromJSON(entry)
        if (annotation) drawing.annotations.push(annotation)
      }
    }
    return drawing
  }
}

function extentFromJSON(value: unknown): SheetExtent | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  const width = candidate.width
  const height = candidate.height
  if (typeof width !== 'number' || typeof height !== 'number') return undefined
  if (!(width > 0) || !(height > 0)) return undefined
  return { width, height }
}

function positiveOr(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}
