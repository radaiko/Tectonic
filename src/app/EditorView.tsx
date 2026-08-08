import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import type { MeshData } from '../domain/MeshData'
import type { Body, TectonicDocument } from '../domain/Document'
import {
  countBodies,
  createSketchOn,
  documentFeatureTree,
  documentSketches,
  nextSketchName,
  withFeatureTree,
  withSketches,
} from '../domain/Document'
import { triangleCount } from '../domain/MeshData'
import { FeatureEngine } from '../features/FeatureEngine'
import type { FeatureEvaluation } from '../features/FeatureEngine'
import {
  FEATURE_TYPES,
  FeatureType,
  featureLabel,
  isSheetMetalFeature,
  isSketchFeature,
  isSurfaceFeature,
} from '../features/domain/FeatureType'
import type { FeatureParameters } from '../features/domain/parameters'
import { createFeature, nextFeatureName } from '../features/domain/factory'
import { StubKernel } from '../kernel/StubKernel'
import { SketchEditor } from '../sketch/SketchEditor'
import type { SketchPlane } from '../sketch/domain/SketchSupport'
import { ORIGIN_PLANES, describeSupport, faceSupport, originPlaneSupport } from '../sketch/domain/SketchSupport'
import type { ToolId } from '../sketch/tools/SketchTool'
import { SKETCH_TOOLS } from '../sketch/tools/registry'
import { Button } from '../ui/Button'
import type { Command } from '../ui/commands'
import { FeaturePropertiesPanel } from '../ui/FeaturePropertiesPanel'
import type { ComputedValue } from '../ui/FeaturePropertiesPanel'
import { FeatureTreePanel } from '../ui/FeatureTreePanel'
import { ExportDialog } from './ExportDialog'
import { parseFaceTarget, planarFaceGroups } from './planarFaces'
import './EditorView.css'

/**
 * Features reachable by a bare letter. Everything else in the tree is added
 * from the command palette, which is where the full list lives.
 */
const FEATURE_SHORTCUTS: Partial<Record<FeatureType, string>> = {
  [FeatureType.Extrude]: 'E',
  [FeatureType.Shell]: 'S',
  [FeatureType.BaseFlange]: 'B',
}

const FEATURE_BY_KEY = new Map(
  Object.entries(FEATURE_SHORTCUTS).map(([type, key]) => [key.toLowerCase(), type as FeatureType]),
)

export type EditorSurface = 'sketch' | 'model'

export interface EditorViewProps {
  readonly document: TectonicDocument
  /** Receives the document with the live sketches and history folded back in. */
  readonly onSave: (document: TectonicDocument) => void
  readonly onClose: () => void
  /**
   * Starts a new document, after the shell has warned about anything unsaved.
   * Omitted when the editor is rendered without a shell around it, and the
   * header then leaves the button out rather than offering a dead one.
   */
  readonly onNewDocument?: () => void
  /**
   * Whether the document already carries edits that were never written to a
   * file — true for a session restored after a crash. Read once, as the
   * editor mounts: from then on the editor owns the flag, and the shell gives
   * a different document its own editor (by key) rather than pushing one in.
   */
  readonly initiallyUnsaved?: boolean
  /**
   * Mirrors the document out to the shell after every edit, along with whether
   * it still has changes that have not been written to a file. This is what
   * backs the unsaved-changes guard and the crash-recovery copy, so the shell
   * never has to guess at what the editor is holding.
   */
  readonly onDocumentChange?: (document: TectonicDocument, dirty: boolean) => void
  /**
   * Publishes what the editor can do to the shell's command palette. Called
   * again whenever the list changes, and with nothing left on unmount.
   */
  readonly onCommandsChange?: (commands: readonly Command[]) => void
}

export function EditorView({
  document,
  onSave,
  onClose,
  onNewDocument,
  initiallyUnsaved = false,
  onDocumentChange,
  onCommandsChange,
}: EditorViewProps): React.ReactElement {
  // Mutable and long-lived: the panels edit these models in place, and a
  // revision counter — not a new object — is what tells React to redraw.
  //
  // They are built once, from the document this editor was opened with, and a
  // `useState` initializer is what guarantees that: the shell replaces the
  // editor (by key) when a different document is loaded, so re-deriving them
  // from a later prop could only throw away edits in progress.
  const [sketches] = useState(() => documentSketches(document))
  const [tree] = useState(() => documentFeatureTree(document))
  const kernel = useMemo(() => new StubKernel(), [])
  const engine = useMemo(() => new FeatureEngine(kernel), [kernel])

  const [revision, bumpRevision] = useReducer((count: number) => count + 1, 0)
  const [surface, setSurface] = useState<EditorSurface>('sketch')
  // A restored document arrives already modified, and saying so is what makes
  // the header honest and the shell's discard guard fire on the first close.
  const [modified, setModified] = useState(initiallyUnsaved)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<FeatureEvaluation | null>(null)
  // The document title, edited in the header. Kept here rather than read
  // straight off the prop because the prop is the document as it was opened.
  const [name, setName] = useState(document.metadata.name)
  // Which sketch the sketch surface is editing and which one a new profile
  // feature will consume. Falls back to the first when the selection is stale.
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null)
  // Held here rather than inside the sketch editor so the palette can switch
  // tools without the sketch having to be on screen already.
  const [sketchTool, setSketchTool] = useState<ToolId>('select')
  const [exportOpen, setExportOpen] = useState(false)
  const [faceTarget, setFaceTarget] = useState<string>('')

  const activeSketch =
    sketches.find((entry) => entry.id === selectedSketchId) ?? sketches[0] ?? null

  // Every edit to the tree or its parameters ends here: one rebuild, whose
  // result is dropped when a newer one has already started.
  useEffect(() => {
    let current = true
    void engine
      .evaluate(tree, sketches)
      .then((result) => {
        if (current) setEvaluation(result)
      })
      .catch(() => {
        if (current) setEvaluation(null)
      })
    return () => {
      current = false
    }
  }, [engine, revision, sketches, tree])

  // Memoised so the "no bodies yet" case does not hand out a fresh array on
  // every render, which would re-derive the meshes and the face list each time.
  const modelledBodies: readonly Body[] = useMemo(() => evaluation?.bodies ?? [], [evaluation])
  const staticBodies: readonly Body[] = useMemo(
    () => document.parts.flatMap((part) => part.bodies),
    [document],
  )
  const allBodies: readonly Body[] = useMemo(
    () => [...staticBodies, ...modelledBodies],
    [modelledBodies, staticBodies],
  )
  const meshes: MeshData[] = useMemo(() => allBodies.map((body) => body.mesh), [allBodies])
  const triangles = useMemo(
    () => meshes.reduce((total, mesh) => total + triangleCount(mesh), 0),
    [meshes],
  )

  /** Faces a new sketch can be attached to. Empty until something is built. */
  const faceGroups = useMemo(() => planarFaceGroups(allBodies), [allBodies])

  const selectedFeature = selectedFeatureId ? (tree.getFeature(selectedFeatureId) ?? null) : null
  const computed = useMemo<ComputedValue[]>(
    () => computedValues(evaluation, selectedFeatureId),
    [evaluation, selectedFeatureId],
  )

  /**
   * The document as it currently stands: the opened file, restamped with the
   * title, the live sketches and the live history. This is what gets saved,
   * exported and mirrored to the shell, so all three see exactly one model.
   */
  const compose = useCallback(
    (title: string = name): TectonicDocument =>
      withFeatureTree(
        withSketches({ ...document, metadata: { ...document.metadata, name: title } }, sketches),
        tree,
      ),
    [document, name, sketches, tree],
  )

  /** Records an edit to the model: mark dirty, rebuild, and tell the shell. */
  const touch = useCallback(() => {
    setModified(true)
    bumpRevision()
    onDocumentChange?.(compose(), true)
  }, [compose, onDocumentChange])

  // The shell needs a copy of the document even if nothing is ever edited, so
  // a reload right after opening it still has something to recover. Guarded by
  // a ref rather than an empty dependency list, which would go stale.
  //
  // It reports the flag the editor was opened with, not a flat `false`: a
  // restored session arrives dirty, and announcing it clean here would tell the
  // shell to drop its discard guard before the first edit.
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current) return
    announced.current = true
    onDocumentChange?.(compose(), initiallyUnsaved)
  }, [compose, initiallyUnsaved, onDocumentChange])

  const handleSave = useCallback(() => {
    const saved = compose()
    onSave(saved)
    setModified(false)
    onDocumentChange?.(saved, false)
  }, [compose, onDocumentChange, onSave])

  const handleRenameDocument = useCallback(
    (title: string) => {
      setName(title)
      setModified(true)
      // Composed with the new title explicitly: `compose`'s default still
      // closes over the previous render's state at this point.
      onDocumentChange?.(compose(title), true)
    },
    [compose, onDocumentChange],
  )

  /**
   * Appends a feature of the given kind and shows it. Kinds that consume a
   * profile are pointed at the selected sketch — not at an implicit singleton —
   * so which sketch gets built is the one the user picked. The rest work off
   * whatever the tree has built so far.
   */
  const addFeature = useCallback(
    (type: FeatureType) => {
      const feature = createFeature(type, {
        name: nextFeatureName(type, tree.features),
        sketchId: isSketchFeature(type) ? (activeSketch?.id ?? null) : null,
      })
      tree.addFeature(feature)
      setSelectedFeatureId(feature.id)
      setSurface('model')
      touch()
    },
    [activeSketch, touch, tree],
  )

  /** Adds an empty sketch on a base plane and opens it for drawing. */
  const addSketch = useCallback(
    (plane: SketchPlane) => {
      const sketch = createSketchOn(originPlaneSupport(plane), nextSketchName(sketches))
      sketches.push(sketch)
      setSelectedSketchId(sketch.id)
      setSurface('sketch')
      touch()
    },
    [sketches, touch],
  )

  /**
   * Adds a sketch attached to a face of a built solid. The reference is the
   * body and face id, so a rebuild places the sketch from the face's own
   * geometry rather than from wherever it happened to be when it was created.
   */
  const addFaceSketch = useCallback(
    (target: string) => {
      const face = parseFaceTarget(target)
      if (!face) return
      const sketch = createSketchOn(
        faceSupport(face.bodyId, face.faceId),
        nextSketchName(sketches),
      )
      sketches.push(sketch)
      setSelectedSketchId(sketch.id)
      setSurface('sketch')
      touch()
    },
    [sketches, touch],
  )

  const selectSketch = useCallback((sketchId: string) => {
    setSelectedSketchId(sketchId)
    setSurface('sketch')
  }, [])

  const handleExtrude = useCallback(() => addFeature(FeatureType.Extrude), [addFeature])

  const showSketchTool = useCallback((tool: ToolId) => {
    setSketchTool(tool)
    setSurface('sketch')
  }, [])

  const handleReorder = useCallback(
    (featureId: string, newIndex: number) => {
      if (tree.reorderFeature(featureId, newIndex)) touch()
    },
    [touch, tree],
  )

  const handleToggleSuppress = useCallback(
    (featureId: string) => {
      const feature = tree.getFeature(featureId)
      if (!feature) return
      if (feature.suppressed) tree.unsuppressFeature(featureId)
      else tree.suppressFeature(featureId)
      touch()
    },
    [touch, tree],
  )

  const handleDelete = useCallback(
    (featureId: string) => {
      const removed = tree.removeFeature(featureId)
      if (removed.length === 0) return
      setSelectedFeatureId((current) => (current && removed.includes(current) ? null : current))
      touch()
    },
    [touch, tree],
  )

  const handleRename = useCallback(
    (featureId: string, featureName: string) => {
      if (tree.renameFeature(featureId, featureName)) touch()
    },
    [touch, tree],
  )

  const handleRollBar = useCallback(
    (index: number) => {
      tree.moveRollBar(index)
      touch()
    },
    [touch, tree],
  )

  const handleParameterChange = useCallback(
    (featureId: string, changes: FeatureParameters) => {
      const feature = tree.getFeature(featureId)
      if (!feature) return
      feature.setParameters(changes)
      touch()
    },
    [touch, tree],
  )

  /* ---------------------------------------------------------------------- */
  /* Commands and shortcuts                                                  */
  /* ---------------------------------------------------------------------- */

  const commands = useMemo<readonly Command[]>(
    () => [
      { id: 'file:save', title: 'Save Document', category: 'File', shortcut: 'Ctrl+S', run: handleSave },
      {
        id: 'file:export',
        title: 'Export As…',
        category: 'File',
        shortcut: 'Ctrl+E',
        run: () => setExportOpen(true),
      },
      { id: 'file:close', title: 'Close Document', category: 'File', run: onClose },
      {
        id: 'view:sketch',
        title: 'Show Sketch Surface',
        category: 'View',
        run: () => setSurface('sketch'),
      },
      { id: 'view:model', title: 'Show 3D Surface', category: 'View', run: () => setSurface('model') },
      ...ORIGIN_PLANES.map((plane) => ({
        id: `sketch:new:${plane}`,
        title: `New Sketch on ${plane}`,
        category: 'Sketch',
        run: () => addSketch(plane),
      })),
      ...SKETCH_TOOLS.map((definition) => ({
        id: `sketch:${definition.id}`,
        title: `${definition.label} Tool`,
        category: 'Sketch',
        ...(definition.shortcut ? { shortcut: definition.shortcut } : {}),
        run: () => showSketchTool(definition.id),
      })),
      // Every feature kind the tree accepts, so the palette is the complete
      // catalogue rather than a hand-picked subset that drifts out of date.
      ...FEATURE_TYPES.map((type) => ({
        id: `feature:${type}`,
        title: featureLabel(type),
        category: isSheetMetalFeature(type)
          ? 'Sheet metal'
          : isSurfaceFeature(type)
            ? 'Surface'
            : 'Model',
        ...(FEATURE_SHORTCUTS[type] ? { shortcut: FEATURE_SHORTCUTS[type] } : {}),
        run: () => addFeature(type),
      })),
    ],
    [addFeature, addSketch, handleSave, onClose, showSketchTool],
  )

  useEffect(() => {
    onCommandsChange?.(commands)
    // The editor's commands are only runnable while it is on screen.
    return () => onCommandsChange?.([])
  }, [commands, onCommandsChange])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT' || target?.isContentEditable) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        const key = event.key.toLowerCase()
        if (key === 's') {
          event.preventDefault()
          handleSave()
        } else if (key === 'e') {
          event.preventDefault()
          setExportOpen(true)
        }
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === 'Escape') {
        setSelectedFeatureId(null)
        return
      }
      // Only in the 3D surface: in a sketch the same key deletes geometry.
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (surface === 'model' && selectedFeatureId) {
          event.preventDefault()
          handleDelete(selectedFeatureId)
        }
        return
      }

      const type = FEATURE_BY_KEY.get(event.key.toLowerCase())
      if (type) {
        event.preventDefault()
        addFeature(type)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addFeature, handleDelete, handleSave, selectedFeatureId, surface])

  return (
    <div className="editor">
      <header className="editor__bar">
        <span className="editor__brand">Tectonic</span>
        <input
          className="editor__doc"
          aria-label="Document name"
          value={name}
          onChange={(event) => handleRenameDocument(event.target.value)}
        />
        <span className="editor__modified">{modified ? 'Modified' : 'Saved'}</span>
        <div className="editor__spacer" />
        {surface === 'sketch' ? (
          <Button variant="primary" onClick={handleExtrude} disabled={activeSketch === null}>
            Extrude
          </Button>
        ) : null}
        <div className="editor__surfaces" role="group" aria-label="Editing surface">
          <Button
            variant={surface === 'sketch' ? 'primary' : 'ghost'}
            aria-pressed={surface === 'sketch'}
            onClick={() => setSurface('sketch')}
          >
            Sketch
          </Button>
          <Button
            variant={surface === 'model' ? 'primary' : 'ghost'}
            aria-pressed={surface === 'model'}
            onClick={() => setSurface('model')}
          >
            3D
          </Button>
        </div>
        {onNewDocument ? (
          <Button variant="ghost" onClick={onNewDocument}>
            New Document
          </Button>
        ) : null}
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={() => setExportOpen(true)}>Export</Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </header>

      <div className="editor__body">
        <aside className="editor__panel">
          {surface === 'model' ? (
            <FeatureTreePanel
              tree={tree}
              selectedFeatureId={selectedFeatureId}
              onSelect={setSelectedFeatureId}
              onReorder={handleReorder}
              onToggleSuppress={handleToggleSuppress}
              onDelete={handleDelete}
              onRename={handleRename}
              onRollBarChange={handleRollBar}
            />
          ) : (
            <>
              <h2 className="editor__panel-title">Sketches</h2>
              {sketches.length === 0 ? (
                <p className="editor__empty">No sketches yet.</p>
              ) : (
                <ul className="editor__tree" aria-label="Sketches">
                  {sketches.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="editor__node editor__node--sketch"
                        aria-pressed={entry.id === activeSketch?.id}
                        onClick={() => selectSketch(entry.id)}
                      >
                        <span>{entry.name}</span>
                        <span className="editor__node-detail">{describeSupport(entry.support)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="editor__actions" role="group" aria-label="New sketch on plane">
                <span className="editor__actions-label">New sketch on</span>
                {ORIGIN_PLANES.map((plane) => (
                  <Button key={plane} onClick={() => addSketch(plane)}>
                    {plane}
                  </Button>
                ))}
              </div>

              <div className="editor__actions editor__actions--stacked">
                <span className="editor__actions-label">New sketch on a face</span>
                {faceGroups.length === 0 ? (
                  <p className="editor__note">
                    No solid has been built yet, so there is no face to sketch on.
                  </p>
                ) : (
                  <>
                    <select
                      className="editor__select"
                      aria-label="Face to sketch on"
                      value={faceTarget}
                      onChange={(event) => setFaceTarget(event.target.value)}
                    >
                      <option value="">Choose a face…</option>
                      {faceGroups.map((group) => (
                        <optgroup key={group.bodyId} label={group.bodyName}>
                          {group.faces.map((face) => (
                            <option key={face.faceId} value={face.value}>
                              {face.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <Button disabled={faceTarget === ''} onClick={() => addFaceSketch(faceTarget)}>
                      Add face sketch
                    </Button>
                  </>
                )}
              </div>

              <h2 className="editor__panel-title">Parts</h2>
              {document.parts.length === 0 ? (
                <p className="editor__empty">No parts yet.</p>
              ) : (
                <ul className="editor__tree">
                  {document.parts.map((part) => (
                    <li key={part.id}>
                      <span className="editor__node editor__node--part">{part.name}</span>
                      <ul>
                        {part.bodies.map((body) => (
                          <li key={body.id} className="editor__node">
                            {body.name}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>

        {/* Both surfaces stay mounted so switching keeps their state and the
            3D viewport does not have to rebuild its scene. */}
        <section className="editor__viewport" hidden={surface !== 'sketch'}>
          {activeSketch ? (
            <SketchEditor
              model={activeSketch}
              onChange={touch}
              tool={sketchTool}
              onToolChange={setSketchTool}
              active={surface === 'sketch'}
            />
          ) : (
            <p className="editor__empty">
              This document has no sketches. Add one from the panel to start drawing.
            </p>
          )}
        </section>
        <section className="editor__viewport" hidden={surface !== 'model'}>
          <ThreeViewport meshes={meshes} active={surface === 'model'} />
        </section>

        <aside className="editor__panel editor__panel--right">
          <FeaturePropertiesPanel
            feature={selectedFeature}
            computed={computed}
            onChange={handleParameterChange}
          />
        </aside>
      </div>

      <footer className="editor__status">
        <span>{document.parts.length} parts</span>
        <span>{countBodies(document) + modelledBodies.length} bodies</span>
        <span>{triangles.toLocaleString()} triangles</span>
        <span>{document.metadata.units}</span>
        {evaluation && evaluation.failures.length > 0 ? (
          <span className="editor__failures">
            {evaluation.failures.length} feature errors
          </span>
        ) : null}
      </footer>

      {/* Mounted only while it is on screen. Its source is the document as it
          stands right now, and composing that means serialising every sketch —
          not something to repeat on each pointer move. */}
      {exportOpen ? (
        <ExportDialog
          open
          source={{ document: compose(), bodies: allBodies, sketch: activeSketch }}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </div>
  )
}

/** What the last rebuild made of the selected feature, as read-only rows. */
function computedValues(
  evaluation: FeatureEvaluation | null,
  featureId: string | null,
): ComputedValue[] {
  if (!evaluation || !featureId) return []
  const bodies = evaluation.bodiesByFeature.get(featureId) ?? []
  const triangles = bodies.reduce((total, body) => total + triangleCount(body.mesh), 0)
  return [
    { label: 'Bodies', value: String(bodies.length) },
    { label: 'Triangles', value: triangles.toLocaleString() },
  ]
}
