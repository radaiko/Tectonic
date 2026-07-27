import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ConstraintSolver } from '../solver/ConstraintSolver'
import type { Constraint } from './domain/Constraint'
import { isDimensional } from './domain/Constraint'
import type { Vec2 } from './domain/geometry'
import { boundingBox } from './domain/hitTest'
import type { SketchModel } from './domain/SketchModel'
import { describeEntity } from './entityProperties'
import { SketchHistory } from './history'
import type { DimensionLabel } from './renderer/SketchRenderer'
import { CONSTRAINT_ICONS, SketchRenderer, formatDimension, formatNumber } from './renderer/SketchRenderer'
import type { SketchView } from './renderer/view'
import { createView, fitView, panView, screenToWorld, zoomView } from './renderer/view'
import type { SnapCandidate } from './snapping/SnapSystem'
import { SnapSystem } from './snapping/SnapSystem'
import { SelectTool } from './tools/SelectTool'
import type {
  SketchPointerEvent,
  ToolContext,
  ToolId,
  ToolResult,
  ToolSettings,
} from './tools/SketchTool'
import { DEFAULT_TOOL_SETTINGS } from './tools/SketchTool'
import {
  SKETCH_TOOLS,
  createTool,
  toolDefinition,
  toolForShortcut,
  withNumericSetting,
} from './tools/registry'
import './SketchEditor.css'

/** Viewport size assumed until the frame has been measured. */
const DEFAULT_VIEW_WIDTH = 800
const DEFAULT_VIEW_HEIGHT = 600
/** Pick and snap radii in CSS pixels — converted to world units per zoom level. */
const PICK_PIXELS = 6
const SNAP_PIXELS = 8
const ZOOM_STEP = 1.1

export interface SketchEditorProps {
  readonly model: SketchModel
  /** Fired whenever the sketch changed, so the shell can mark the file dirty. */
  readonly onChange?: () => void
  readonly initialTool?: ToolId
  /** Controlled tool selection. Left out, the editor tracks it itself. */
  readonly tool?: ToolId
  readonly onToolChange?: (tool: ToolId) => void
  /**
   * Whether the sketch is the surface the user is looking at. The shell keeps
   * both surfaces mounted, so the bare-letter tool shortcuts have to stand
   * down while the 3D view has the screen.
   */
  readonly active?: boolean
}

interface Diagnostics {
  readonly dof: number
  readonly errors: readonly string[]
  readonly underConstrainedEntityIds: readonly string[]
}

interface DimensionEdit {
  readonly constraintId: string
  readonly text: string
  readonly x: number
  readonly y: number
}

const NO_DIAGNOSTICS: Diagnostics = { dof: 0, errors: [], underConstrainedEntityIds: [] }

/**
 * The 2D sketching surface: canvas, tool palette, property and constraint
 * panels, status bar. The sketch model itself is mutable and lives outside
 * React state — every edit path here ends in a solve, a history commit and a
 * redraw, which is what keeps the two in step.
 */
export function SketchEditor({
  model,
  onChange,
  initialTool = 'select',
  tool: controlledTool,
  onToolChange,
  active = true,
}: SketchEditorProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<readonly DimensionLabel[]>([])
  const selectionRef = useRef<Set<string>>(new Set<string>())
  const panRef = useRef<Vec2 | null>(null)

  const [ownToolId, setOwnToolId] = useState<ToolId>(initialTool)
  const toolId = controlledTool ?? ownToolId
  const [settings, setSettings] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS)
  const [view, setView] = useState<SketchView>(() =>
    createView(DEFAULT_VIEW_WIDTH, DEFAULT_VIEW_HEIGHT),
  )
  const [, redraw] = useReducer((tick: number) => tick + 1, 0)
  const [status, setStatus] = useState('Ready')
  const [cursor, setCursor] = useState<Vec2>({ x: 0, y: 0 })
  const [snap, setSnap] = useState<SnapCandidate | null>(null)
  const [editing, setEditing] = useState<DimensionEdit | null>(null)
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(NO_DIAGNOSTICS)

  const solver = useMemo(() => new ConstraintSolver(), [])
  const history = useMemo(() => new SketchHistory(model), [model])
  const tool = useMemo(() => createTool(toolId), [toolId])
  const definition = toolDefinition(toolId)

  /** Switches tools from the toolbar or a shortcut, controlled or not. */
  const selectTool = useCallback(
    (id: ToolId) => {
      setOwnToolId(id)
      onToolChange?.(id)
      setStatus(toolDefinition(id).hint)
    },
    [onToolChange],
  )

  const context = useMemo<ToolContext>(
    () => ({
      model,
      solver,
      snap: new SnapSystem({ tolerance: SNAP_PIXELS / view.scale }),
      pickTolerance: PICK_PIXELS / view.scale,
      selection: selectionRef.current,
      settings,
    }),
    [model, settings, solver, view.scale],
  )

  const runSolve = useCallback(() => {
    const result = solver.solve(model)
    setDiagnostics({
      dof: result.dof,
      errors: result.errors,
      underConstrainedEntityIds: result.underConstrainedEntityIds,
    })
    return result
  }, [model, solver])

  useEffect(() => {
    runSolve()
  }, [runSolve])

  /** Folds a tool's answer back into the editor: status, solve, history, redraw. */
  const applyResult = useCallback(
    (result: ToolResult | null, record: boolean): void => {
      if (result?.error) setStatus(result.error)
      else if (result?.status) setStatus(result.status)

      if (result?.changed) {
        runSolve()
        if (record) history.commit()
        onChange?.()
      }
      redraw()
    },
    [history, onChange, runSolve],
  )

  /* ---------------------------------------------------------------------- */
  /* Viewport                                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined

    const measure = (): void => {
      const rect = frame.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      setView((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { ...current, width: rect.width, height: rect.height },
      )
    }

    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  // Redraws after every render: the model is mutable, so React's own change
  // detection cannot be trusted to know when the picture is stale.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    // jsdom and headless environments have no 2D context; the rest still works.
    if (!canvas || !ctx) return

    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(view.width * ratio))
    canvas.height = Math.max(1, Math.round(view.height * ratio))

    const layout = new SketchRenderer(ctx).render(model, {
      view,
      devicePixelRatio: ratio,
      selectedEntityIds: [...selectionRef.current],
      hoveredEntityId: tool instanceof SelectTool ? tool.getHoveredEntityId() : null,
      underConstrainedEntityIds: diagnostics.underConstrainedEntityIds,
      snap,
      preview: tool.getPreview(),
    })
    labelsRef.current = layout.dimensionLabels
  })

  const fitToSketch = useCallback(() => {
    setView((current) => fitView(current.width, current.height, boundingBox(model)))
    setStatus('Zoomed to fit')
  }, [model])

  /* ---------------------------------------------------------------------- */
  /* Pointer input                                                           */
  /* ---------------------------------------------------------------------- */

  const localPoint = useCallback((clientX: number, clientY: number): Vec2 => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
  }, [])

  const sketchEvent = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>, screen: Vec2): SketchPointerEvent => ({
      world: screenToWorld(view, screen),
      screen,
      button: event.button,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      detail: event.detail || 1,
    }),
    [view],
  )

  const labelAt = useCallback(
    (screen: Vec2): DimensionLabel | undefined =>
      labelsRef.current.find(
        (label) =>
          Math.abs(screen.x - label.x) <= label.width / 2 &&
          Math.abs(screen.y - label.y) <= label.height / 2,
      ),
    [],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const screen = localPoint(event.clientX, event.clientY)

    // Middle button pans, whatever tool is active.
    if (event.button === 1) {
      panRef.current = screen
      return
    }

    const label = labelAt(screen)
    if (label && event.button === 0) {
      const constraint = model.constraints.get(label.constraintId)
      if (constraint && isDimensional(constraint)) {
        setEditing({
          constraintId: label.constraintId,
          text: formatNumber(constraint.value),
          x: label.x,
          y: label.y,
        })
        setStatus('Type a value, Enter to apply')
        return
      }
    }

    setEditing(null)
    applyResult(tool.onPointerDown(sketchEvent(event, screen), context), true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const screen = localPoint(event.clientX, event.clientY)

    if (panRef.current) {
      const from = panRef.current
      panRef.current = screen
      setView((current) => panView(current, screen.x - from.x, screen.y - from.y))
      return
    }

    const world = screenToWorld(view, screen)
    setCursor(world)
    setSnap(context.snap.findSnap(world, model))
    applyResult(tool.onPointerMove(sketchEvent(event, screen), context), false)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (panRef.current) {
      panRef.current = null
      return
    }
    const screen = localPoint(event.clientX, event.clientY)
    applyResult(tool.onPointerUp(sketchEvent(event, screen), context), true)
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>): void => {
    const anchor = localPoint(event.clientX, event.clientY)
    setView((current) => zoomView(current, event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, anchor))
  }

  /* ---------------------------------------------------------------------- */
  /* Keyboard                                                                */
  /* ---------------------------------------------------------------------- */

  const undo = useCallback(() => {
    if (!history.undo()) {
      setStatus('Nothing to undo')
      redraw()
      return
    }
    selectionRef.current.clear()
    runSolve()
    onChange?.()
    setStatus('Undo')
    redraw()
  }, [history, onChange, runSolve])

  const redo = useCallback(() => {
    if (!history.redo()) {
      setStatus('Nothing to redo')
      redraw()
      return
    }
    selectionRef.current.clear()
    runSolve()
    onChange?.()
    setStatus('Redo')
    redraw()
  }, [history, onChange, runSolve])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      // The inline dimension box owns its own keys.
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT') return

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault()
        redo()
        return
      }

      // Bare letters pick a tool, but only while the sketch is the surface on
      // screen — the 3D view and the shell claim letters of their own.
      if (active && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const shortcutTool = toolForShortcut(event.key)
        if (shortcutTool) {
          event.preventDefault()
          selectTool(shortcutTool)
          redraw()
          return
        }
      }

      if (event.key === 'Escape') setEditing(null)
      applyResult(tool.onKeyDown(event.key, context), true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, applyResult, context, redo, selectTool, tool, undo])

  /* ---------------------------------------------------------------------- */
  /* Dimensions and constraints                                              */
  /* ---------------------------------------------------------------------- */

  const commitDimension = useCallback(() => {
    if (!editing) return
    const constraint = model.constraints.get(editing.constraintId)
    const value = Number(editing.text)
    setEditing(null)

    if (!constraint || !isDimensional(constraint)) return
    if (editing.text.trim() === '' || !Number.isFinite(value)) {
      setStatus(`"${editing.text}" is not a number`)
      return
    }

    const previousValue = constraint.value
    const wasDriving = constraint.isDriving
    constraint.value = value
    constraint.isDriving = true

    const result = solver.solve(model)
    if (!result.success) {
      // Put it back exactly as it was rather than leave a sketch that cannot solve.
      constraint.value = previousValue
      constraint.isDriving = wasDriving
      solver.solve(model)
      setStatus('That value cannot be satisfied')
    } else {
      history.commit()
      onChange?.()
      setStatus(`${constraint.name ?? constraint.type} = ${formatNumber(value)}`)
    }
    runSolve()
    redraw()
  }, [editing, history, model, onChange, runSolve, solver])

  const removeConstraint = useCallback(
    (constraintId: string) => {
      if (!model.removeConstraint(constraintId)) return
      runSolve()
      history.commit()
      onChange?.()
      setStatus('Constraint deleted')
      redraw()
    },
    [history, model, onChange, runSolve],
  )

  /* ---------------------------------------------------------------------- */

  const selectedIds = [...selectionRef.current].filter((id) => model.entities.has(id))
  const selectedEntity = selectedIds.length > 0 ? model.getEntity(selectedIds[0] as string) : undefined
  const description = selectedEntity ? describeEntity(model, selectedEntity) : null
  const constraints = [...model.constraints.values()]

  return (
    <div className="sketch">
      <div className="sketch__tools" role="toolbar" aria-label="Sketch tools">
        {SKETCH_TOOLS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`sketch__tool${entry.id === toolId ? ' sketch__tool--active' : ''}`}
            aria-pressed={entry.id === toolId}
            aria-label={entry.label}
            title={`${entry.label}${entry.shortcut ? ` (${entry.shortcut})` : ''} — ${entry.hint}`}
            onClick={() => selectTool(entry.id)}
          >
            <span aria-hidden="true">{entry.icon}</span>
          </button>
        ))}
      </div>

      <div className="sketch__frame" ref={frameRef}>
        <canvas
          className="sketch__canvas"
          data-testid="sketch-canvas"
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(event) => event.preventDefault()}
        />
        {editing ? (
          <input
            className="sketch__dimension-input"
            aria-label="Dimension value"
            autoFocus
            value={editing.text}
            style={{ left: `${editing.x}px`, top: `${editing.y}px` }}
            onChange={(event) => setEditing({ ...editing, text: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitDimension()
              else if (event.key === 'Escape') setEditing(null)
            }}
          />
        ) : null}
        <button type="button" className="sketch__fit" onClick={fitToSketch}>
          Fit
        </button>
      </div>

      <aside className="sketch__panels">
        <section className="sketch__panel">
          <h3 className="sketch__panel-title">Tool options</h3>
          <label className="sketch__option">
            <span>Construction</span>
            <input
              type="checkbox"
              checked={settings.isConstruction}
              onChange={(event) =>
                setSettings((current) => ({ ...current, isConstruction: event.target.checked }))
              }
            />
          </label>
          {definition.options.map((option) =>
            option.kind === 'patternMode' ? (
              <label className="sketch__option" key={option.key}>
                <span>{option.label}</span>
                <select
                  value={settings.patternMode}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      patternMode: event.target.value === 'circular' ? 'circular' : 'rectangular',
                    }))
                  }
                >
                  <option value="rectangular">Rectangular</option>
                  <option value="circular">Circular</option>
                </select>
              </label>
            ) : (
              <label className="sketch__option" key={option.key}>
                <span>{option.label}</span>
                <input
                  type="number"
                  value={String(settings[option.key])}
                  min={option.min}
                  step={option.step}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (!Number.isFinite(value)) return
                    setSettings((current) => withNumericSetting(current, option.key, value))
                  }}
                />
              </label>
            ),
          )}
        </section>

        <section className="sketch__panel">
          <h3 className="sketch__panel-title">Properties</h3>
          {description ? (
            <dl className="sketch__properties">
              <dt>Type</dt>
              <dd>{description.isConstruction ? `${description.kind} (construction)` : description.kind}</dd>
              {description.properties.map((property) => (
                <div className="sketch__property" key={property.label}>
                  <dt>{property.label}</dt>
                  <dd>{property.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="sketch__empty">Nothing selected.</p>
          )}
          {selectedIds.length > 1 ? (
            <p className="sketch__empty">{selectedIds.length} entities selected.</p>
          ) : null}
        </section>

        <section className="sketch__panel">
          <h3 className="sketch__panel-title">Constraints</h3>
          {constraints.length === 0 ? (
            <p className="sketch__empty">No constraints yet.</p>
          ) : (
            <ul className="sketch__constraints">
              {constraints.map((constraint) => (
                <li className="sketch__constraint" key={constraint.id}>
                  <span aria-hidden="true">{CONSTRAINT_ICONS[constraint.type] ?? '↔'}</span>
                  <span>{constraintLabel(constraint)}</span>
                  <button
                    type="button"
                    className="sketch__constraint-delete"
                    aria-label={`Delete ${constraint.type} constraint`}
                    onClick={() => removeConstraint(constraint.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <footer className="sketch__status">
        <span>
          X {formatNumber(cursor.x)} Y {formatNumber(cursor.y)} mm
        </span>
        <span>{definition.label}</span>
        <span>{snap ? `Snap: ${snap.label}` : 'Snap: none'}</span>
        <span>{diagnostics.dof === 0 ? 'Fully constrained' : `${diagnostics.dof} DOF`}</span>
        <span>{Math.round(view.scale * 100)}%</span>
        <span className="sketch__message">{diagnostics.errors[0] ?? status}</span>
      </footer>
    </div>
  )
}

function constraintLabel(constraint: Constraint): string {
  if (!isDimensional(constraint)) return constraint.type
  const value = formatDimension(constraint.type, constraint.value)
  return constraint.name ? `${constraint.name} = ${value}` : value
}
