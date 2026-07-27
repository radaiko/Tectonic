import { useEffect, useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../domain/vec3'
import { add, scale, subtract } from '../domain/vec3'
import type {
  PmiAnnotation,
  PmiAttachment,
  PmiTolerance,
  PmiToleranceKind,
} from './PmiAnnotation'
import {
  GDT_SYMBOLS,
  PMI_TOLERANCE_KINDS,
  SURFACE_FINISH_KINDS,
  formatPmiAnnotation,
  isPmiDimension,
  measuredPmiValue,
  newPmiAnnotationId,
} from './PmiAnnotation'
import type { PmiView, PmiViewSet } from './PmiView'
import { layoutAnnotations, overlappingPairs, labelBoxes, viewFrame } from './collision'
import './PmiEditor.css'

/**
 * The PMI panel: the annotation tools, the annotation views and the properties
 * of whatever is selected.
 *
 * The panel owns no geometry. Picking happens in the 3D viewport, which reports
 * the face, edge or vertex the user clicked as a {@link PmiPick}; when a tool is
 * armed the panel turns that pick into an annotation and hands it back through
 * `onCreate`. Dragging a leader also happens in the viewport, which calls
 * {@link moveLeaderPoint} — a pure function, so the drag has nothing to do with
 * React and the panel's numeric leader fields and the drag produce identical
 * results.
 */

export const PMI_TOOLS = ['select', 'dimension', 'gdt', 'datum', 'surface-finish', 'note'] as const

export type PmiTool = (typeof PMI_TOOLS)[number]

export const PMI_TOOL_LABELS: Readonly<Record<PmiTool, string>> = {
  select: 'Select',
  dimension: 'Dimension',
  gdt: 'GD&T',
  datum: 'Datum',
  'surface-finish': 'Surface finish',
  note: 'Note',
}

/** What the viewport reports when the user clicks a piece of the model. */
export interface PmiPick {
  readonly attachment: PmiAttachment
  /** Where the click landed, in model space. */
  readonly point: Vec3
  /** Outward normal at the pick, when the picked topology has one. */
  readonly normal?: Vec3
  /**
   * The second point of a two-point pick — the far end of a measured distance.
   * Absent for the single-point tools.
   */
  readonly secondPoint?: Vec3
  /** Bumped by the viewport per click so a repeated pick still registers. */
  readonly sequence?: number
}

export interface BuildAnnotationOptions {
  /** How far off the geometry the label starts, in document units. */
  readonly offset?: number
  /** Datum letter for the datum tool. Defaults to the next free letter. */
  readonly datumLetter?: string
}

/**
 * The annotation a tool makes from a pick.
 *
 * Every tool produces something immediately usable and immediately editable: a
 * dimension of the picked distance, a position tolerance to be retyped, the
 * next datum letter, a basic surface-finish symbol or an empty note. Nothing
 * here opens a dialog — the properties panel below is the dialog.
 */
export function buildAnnotation(
  tool: PmiTool,
  pick: PmiPick,
  view: PmiView,
  options: BuildAnnotationOptions = {},
): PmiAnnotation | null {
  if (tool === 'select') return null

  const offset = options.offset ?? 10
  const plane = view.planeAt(pick.point)
  // The label starts pushed off the geometry along the plane's text direction,
  // so a fresh annotation is never buried in the face it points at.
  const position = add(pick.point, scale(plane.xAxis, offset))
  const base = {
    id: newPmiAnnotationId(),
    viewId: view.id,
    position,
    plane,
    references: [pick.attachment],
    leaders: [
      {
        attachment: { ...pick.attachment, point: pick.point },
        path: [pick.point, position],
        arrowhead: 'filled' as const,
      },
    ],
  }

  switch (tool) {
    case 'dimension': {
      const end = pick.secondPoint ?? add(pick.point, scale(plane.xAxis, offset))
      return { ...base, type: 'linear-dimension', start: pick.point, end, axis: 'parallel' }
    }
    case 'gdt':
      return {
        ...base,
        type: 'feature-control-frame',
        symbol: 'position',
        toleranceValue: 0.1,
        diametral: true,
        modifier: 'mmc',
        datums: [{ letter: 'A' }],
      }
    case 'datum':
      return {
        ...base,
        type: 'datum-feature',
        letter: options.datumLetter ?? 'A',
      }
    case 'surface-finish':
      return {
        ...base,
        type: 'surface-finish',
        finish: 'machining-required',
        roughness: 3.2,
        lay: 'none',
      }
    case 'note':
      return { ...base, type: 'note', text: 'Note' }
  }
}

/** A, B, C … skipping the letters already spoken for in the model. */
export function nextDatumLetter(annotations: readonly PmiAnnotation[]): string {
  const taken = new Set(
    annotations
      .filter((annotation) => annotation.type === 'datum-feature')
      .map((annotation) => annotation.letter),
  )
  // I, O and Q read as 1, 0 and O, so datums skip them exactly as revisions do.
  for (const letter of 'ABCDEFGHJKLMNPRSTUVWXYZ') {
    if (!taken.has(letter)) return letter
  }
  return `A${taken.size}`
}

/**
 * A leader point moved by a world-space delta. Pure, so the viewport's pointer
 * drag and the panel's numeric fields go through the same code.
 */
export function moveLeaderPoint(
  annotation: PmiAnnotation,
  leaderIndex: number,
  pointIndex: number,
  delta: Vec3,
): PmiAnnotation {
  const leaders = annotation.leaders ?? []
  const leader = leaders[leaderIndex]
  if (!leader) return annotation
  const point = leader.path[pointIndex]
  if (!point) return annotation

  const path = leader.path.map((entry, index) =>
    index === pointIndex ? add(entry, delta) : entry,
  )
  const moved = { ...leader, path }
  const updatedLeaders = leaders.map((entry, index) => (index === leaderIndex ? moved : entry))

  // Dragging the last point of a leader is dragging the label itself, so the
  // text follows rather than being left behind by its own leader.
  const isTextEnd = pointIndex === leader.path.length - 1
  return {
    ...annotation,
    leaders: updatedLeaders,
    ...(isTextEnd ? { position: add(annotation.position, delta) } : {}),
  } as PmiAnnotation
}

/** The whole annotation dragged: label and every leader end move together. */
export function moveAnnotation(annotation: PmiAnnotation, delta: Vec3): PmiAnnotation {
  const leaders = (annotation.leaders ?? []).map((leader) => ({
    ...leader,
    // The arrow stays on the geometry; everything downstream of it travels.
    path: leader.path.map((point, index) => (index === 0 ? point : add(point, delta))),
  }))
  return {
    ...annotation,
    position: add(annotation.position, delta),
    ...(leaders.length > 0 ? { leaders } : {}),
  } as PmiAnnotation
}

export interface PmiEditorProps {
  readonly views: PmiViewSet
  /** The most recent viewport pick. A new object arms the active tool. */
  readonly pick?: PmiPick | null
  readonly selectedAnnotationId?: string | null
  readonly tool?: PmiTool
  readonly onToolChange?: (tool: PmiTool) => void
  readonly onCreate?: (annotation: PmiAnnotation, view: PmiView) => void
  readonly onUpdate?: (id: string, changes: Partial<PmiAnnotation>) => void
  readonly onRemove?: (id: string) => void
  readonly onSelect?: (id: string | null) => void
  readonly onActivateView?: (viewId: string) => void
  readonly onToggleView?: (viewId: string, visible: boolean) => void
  readonly onShowAll?: () => void
  readonly onHideAll?: () => void
  /** Fired with the laid-out annotations when the user asks to declutter. */
  readonly onRelayout?: (viewId: string, annotations: readonly PmiAnnotation[]) => void
}

export function PmiEditor({
  views,
  pick = null,
  selectedAnnotationId = null,
  tool,
  onToolChange,
  onCreate,
  onUpdate,
  onRemove,
  onSelect,
  onActivateView,
  onToggleView,
  onShowAll,
  onHideAll,
  onRelayout,
}: PmiEditorProps): React.ReactElement {
  const [internalTool, setInternalTool] = useState<PmiTool>('select')
  const activeTool = tool ?? internalTool
  const chooseTool = (next: PmiTool): void => {
    setInternalTool(next)
    onToolChange?.(next)
  }

  // Each pick is consumed once. Without this a re-render for any other reason
  // would place a second copy of the same annotation.
  const consumed = useRef<PmiPick | null>(null)
  const activeView = views.activeView

  useEffect(() => {
    if (pick === null || pick === consumed.current) return
    consumed.current = pick
    if (activeTool === 'select' || activeView === null) return

    const annotation = buildAnnotation(activeTool, pick, activeView, {
      datumLetter: nextDatumLetter(views.allAnnotations()),
    })
    if (annotation) onCreate?.(annotation, activeView)
  }, [pick, activeTool, activeView, views, onCreate])

  const selected = selectedAnnotationId === null ? null : findAnnotation(views, selectedAnnotationId)

  const collisions = useMemo(() => {
    if (activeView === null) return []
    const frame = viewFrame(activeView.viewDirection)
    return overlappingPairs(labelBoxes(activeView.annotations, frame))
  }, [activeView])

  return (
    <div className="pmi-editor">
      <header className="pmi-editor__header">
        <h2 className="pmi-editor__title">Annotations</h2>
        <span className="pmi-editor__master">
          <button type="button" className="pmi-editor__action" onClick={onShowAll}>
            Show all
          </button>
          <button type="button" className="pmi-editor__action" onClick={onHideAll}>
            Hide all
          </button>
        </span>
      </header>

      <div className="pmi-editor__toolbar" role="toolbar" aria-label="Annotation tools">
        {PMI_TOOLS.map((name) => (
          <button
            key={name}
            type="button"
            className={[
              'pmi-editor__tool',
              name === activeTool ? 'pmi-editor__tool--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={name === activeTool}
            data-tool={name}
            onClick={() => chooseTool(name)}
          >
            {PMI_TOOL_LABELS[name]}
          </button>
        ))}
      </div>

      {activeTool === 'select' ? null : (
        <p className="pmi-editor__hint">
          Click a face, edge or vertex to place a {PMI_TOOL_LABELS[activeTool].toLowerCase()}.
        </p>
      )}

      <ul className="pmi-editor__views" aria-label="Annotation views">
        {views.views.map((view) => (
          <li
            key={view.id}
            className={[
              'pmi-view',
              view.id === views.activeViewId ? 'pmi-view--active' : '',
              view.visible ? '' : 'pmi-view--hidden',
            ]
              .filter(Boolean)
              .join(' ')}
            data-view-id={view.id}
            data-visible={view.visible}
          >
            <div className="pmi-view__row">
              <button
                type="button"
                className="pmi-view__visibility"
                aria-label={`${view.visible ? 'Hide' : 'Show'} ${view.name}`}
                aria-pressed={view.visible}
                onClick={() => onToggleView?.(view.id, !view.visible)}
              >
                <span aria-hidden="true">{view.visible ? '👁' : '◌'}</span>
              </button>
              <button
                type="button"
                className="pmi-view__name"
                aria-pressed={view.id === views.activeViewId}
                onClick={() => onActivateView?.(view.id)}
              >
                {view.name}
              </button>
              <span className="pmi-view__count">{view.annotationCount}</span>
            </div>

            {view.id === views.activeViewId ? (
              <ul className="pmi-view__annotations" aria-label={`${view.name} list`}>
                {view.annotations.map((annotation) => (
                  <li
                    key={annotation.id}
                    className={[
                      'pmi-annotation',
                      annotation.id === selectedAnnotationId ? 'pmi-annotation--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    data-annotation-id={annotation.id}
                    data-annotation-type={annotation.type}
                  >
                    <button
                      type="button"
                      className="pmi-annotation__label"
                      onClick={() => onSelect?.(annotation.id)}
                    >
                      {formatPmiAnnotation(annotation, view.precision) || annotation.type}
                    </button>
                    <button
                      type="button"
                      className="pmi-annotation__remove"
                      aria-label={`Remove ${annotation.type}`}
                      onClick={() => onRemove?.(annotation.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {collisions.length > 0 && activeView !== null ? (
        <p className="pmi-editor__collisions" role="status">
          {collisions.length} overlapping {collisions.length === 1 ? 'label' : 'labels'}
          <button
            type="button"
            className="pmi-editor__action"
            onClick={() =>
              onRelayout?.(
                activeView.id,
                layoutAnnotations(activeView.annotations, activeView.viewDirection).annotations,
              )
            }
          >
            Arrange
          </button>
        </p>
      ) : null}

      <AnnotationProperties annotation={selected} onUpdate={onUpdate} />
    </div>
  )
}

interface AnnotationPropertiesProps {
  readonly annotation: PmiAnnotation | null
  readonly onUpdate: ((id: string, changes: Partial<PmiAnnotation>) => void) | undefined
}

/** Value, tolerance, text and leader geometry for the selected annotation. */
function AnnotationProperties({
  annotation,
  onUpdate,
}: AnnotationPropertiesProps): React.ReactElement {
  if (!annotation) {
    return (
      <div className="pmi-properties">
        <h3 className="pmi-properties__title">Properties</h3>
        <p className="pmi-properties__empty">Select an annotation to edit it.</p>
      </div>
    )
  }

  const emit = (changes: Partial<PmiAnnotation>): void => onUpdate?.(annotation.id, changes)
  const tolerance = annotation.tolerance ?? { kind: 'none' as PmiToleranceKind }

  return (
    <div className="pmi-properties" data-annotation-id={annotation.id}>
      <h3 className="pmi-properties__title">Properties</h3>

      {isPmiDimension(annotation) ? (
        <label className="pmi-properties__row">
          <span>Value</span>
          <input
            type="number"
            aria-label="Dimension value"
            value={String(measuredPmiValue(annotation))}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              if (Number.isFinite(parsed)) emit({ value: parsed } as Partial<PmiAnnotation>)
            }}
          />
        </label>
      ) : null}

      {annotation.type === 'note' ? (
        <label className="pmi-properties__row">
          <span>Text</span>
          <input
            type="text"
            aria-label="Note text"
            value={annotation.text}
            onChange={(event) =>
              emit({ text: event.target.value } as unknown as Partial<PmiAnnotation>)
            }
          />
        </label>
      ) : null}

      {annotation.type === 'datum-feature' ? (
        <label className="pmi-properties__row">
          <span>Datum</span>
          <input
            type="text"
            aria-label="Datum letter"
            maxLength={2}
            value={annotation.letter}
            onChange={(event) =>
              emit({ letter: event.target.value.toUpperCase() } as unknown as Partial<PmiAnnotation>)
            }
          />
        </label>
      ) : null}

      {annotation.type === 'feature-control-frame' ? (
        <>
          <label className="pmi-properties__row">
            <span>Characteristic</span>
            <select
              aria-label="Geometric characteristic"
              value={annotation.symbol}
              onChange={(event) =>
                emit({ symbol: event.target.value } as unknown as Partial<PmiAnnotation>)
              }
            >
              {GDT_SYMBOLS.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="pmi-properties__row">
            <span>Tolerance zone</span>
            <input
              type="number"
              aria-label="Tolerance zone"
              value={String(annotation.toleranceValue)}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                if (Number.isFinite(parsed)) {
                  emit({ toleranceValue: parsed } as unknown as Partial<PmiAnnotation>)
                }
              }}
            />
          </label>
        </>
      ) : null}

      {annotation.type === 'surface-finish' ? (
        <>
          <label className="pmi-properties__row">
            <span>Finish</span>
            <select
              aria-label="Surface finish kind"
              value={annotation.finish}
              onChange={(event) =>
                emit({ finish: event.target.value } as unknown as Partial<PmiAnnotation>)
              }
            >
              {SURFACE_FINISH_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label className="pmi-properties__row">
            <span>Ra (µm)</span>
            <input
              type="number"
              aria-label="Roughness"
              value={annotation.roughness === undefined ? '' : String(annotation.roughness)}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                if (Number.isFinite(parsed)) {
                  emit({ roughness: parsed } as unknown as Partial<PmiAnnotation>)
                }
              }}
            />
          </label>
        </>
      ) : null}

      <label className="pmi-properties__row">
        <span>Tolerance</span>
        <select
          aria-label="Tolerance kind"
          value={tolerance.kind}
          onChange={(event) =>
            emit({
              tolerance: { ...tolerance, kind: event.target.value as PmiToleranceKind },
            })
          }
        >
          {PMI_TOLERANCE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>

      {tolerance.kind === 'none' || tolerance.kind === 'general' ? null : (
        <ToleranceValues tolerance={tolerance} onChange={(next) => emit({ tolerance: next })} />
      )}

      <LeaderFields annotation={annotation} onUpdate={onUpdate} />
    </div>
  )
}

interface ToleranceValuesProps {
  readonly tolerance: PmiTolerance
  readonly onChange: (tolerance: PmiTolerance) => void
}

function ToleranceValues({ tolerance, onChange }: ToleranceValuesProps): React.ReactElement {
  if (tolerance.kind === 'fit') {
    return (
      <label className="pmi-properties__row">
        <span>Fit</span>
        <input
          type="text"
          aria-label="Fit designation"
          value={tolerance.fit ?? ''}
          onChange={(event) => onChange({ ...tolerance, fit: event.target.value })}
        />
      </label>
    )
  }

  return (
    <>
      <label className="pmi-properties__row">
        <span>Upper</span>
        <input
          type="number"
          aria-label="Upper deviation"
          value={tolerance.plus === undefined ? '' : String(tolerance.plus)}
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (Number.isFinite(parsed)) onChange({ ...tolerance, plus: parsed })
          }}
        />
      </label>
      {tolerance.kind === 'symmetrical' ? null : (
        <label className="pmi-properties__row">
          <span>Lower</span>
          <input
            type="number"
            aria-label="Lower deviation"
            value={tolerance.minus === undefined ? '' : String(tolerance.minus)}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              if (Number.isFinite(parsed)) onChange({ ...tolerance, minus: parsed })
            }}
          />
        </label>
      )}
    </>
  )
}

interface LeaderFieldsProps {
  readonly annotation: PmiAnnotation
  readonly onUpdate: ((id: string, changes: Partial<PmiAnnotation>) => void) | undefined
}

/**
 * The leader's points, one row each. Editing a coordinate goes through
 * {@link moveLeaderPoint} so a typed nudge and a dragged one behave the same.
 */
function LeaderFields({ annotation, onUpdate }: LeaderFieldsProps): React.ReactElement | null {
  const leaders = annotation.leaders ?? []
  if (leaders.length === 0) return null

  return (
    <div className="pmi-leaders">
      <h4 className="pmi-leaders__title">Leader</h4>
      {leaders.map((leader, leaderIndex) =>
        leader.path.map((point, pointIndex) => (
          <div className="pmi-leaders__point" key={`${leaderIndex}-${pointIndex}`}>
            <span>{pointIndex === 0 ? 'Arrow' : pointIndex === leader.path.length - 1 ? 'Text' : `Bend ${pointIndex}`}</span>
            {(['x', 'y', 'z'] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                aria-label={`Leader ${leaderIndex + 1} point ${pointIndex + 1} ${axis}`}
                value={String(point[axis])}
                onChange={(event) => {
                  const parsed = Number(event.target.value)
                  if (!Number.isFinite(parsed)) return
                  const target = { ...point, [axis]: parsed }
                  const moved = moveLeaderPoint(
                    annotation,
                    leaderIndex,
                    pointIndex,
                    subtract(target, point),
                  )
                  onUpdate?.(annotation.id, {
                    position: moved.position,
                    ...(moved.leaders === undefined ? {} : { leaders: moved.leaders }),
                  })
                }}
              />
            ))}
          </div>
        )),
      )}
    </div>
  )
}

function findAnnotation(views: PmiViewSet, id: string): PmiAnnotation | null {
  for (const view of views.views) {
    const found = view.get(id)
    if (found) return found
  }
  return null
}
