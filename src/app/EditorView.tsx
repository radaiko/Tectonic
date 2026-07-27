import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import type { MeshData } from '../domain/MeshData'
import type { Body, TectonicDocument } from '../domain/Document'
import {
  countBodies,
  documentFeatureTree,
  documentSketch,
  withFeatureTree,
  withSketch,
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
import type { ToolId } from '../sketch/tools/SketchTool'
import { SKETCH_TOOLS } from '../sketch/tools/registry'
import { Button } from '../ui/Button'
import type { Command } from '../ui/commands'
import { FeaturePropertiesPanel } from '../ui/FeaturePropertiesPanel'
import type { ComputedValue } from '../ui/FeaturePropertiesPanel'
import { FeatureTreePanel } from '../ui/FeatureTreePanel'
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
  /** Receives the document with the current sketch folded back into it. */
  readonly onSave: (document: TectonicDocument) => void
  readonly onClose: () => void
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
  onCommandsChange,
}: EditorViewProps): React.ReactElement {
  // Mutable and long-lived: the panels edit these models in place, and a
  // revision counter — not a new object — is what tells React to redraw.
  const sketch = useMemo(() => documentSketch(document), [document])
  const tree = useMemo(() => documentFeatureTree(document), [document])
  const kernel = useMemo(() => new StubKernel(), [])
  const engine = useMemo(() => new FeatureEngine(kernel), [kernel])

  const [revision, bumpRevision] = useReducer((count: number) => count + 1, 0)
  const [surface, setSurface] = useState<EditorSurface>('sketch')
  const [modified, setModified] = useState(false)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<FeatureEvaluation | null>(null)
  // Held here rather than inside the sketch editor so the palette can switch
  // tools without the sketch having to be on screen already.
  const [sketchTool, setSketchTool] = useState<ToolId>('select')

  // Every edit to the tree or its parameters ends here: one rebuild, whose
  // result is dropped when a newer one has already started.
  useEffect(() => {
    let current = true
    void engine
      .evaluate(tree, [sketch])
      .then((result) => {
        if (current) setEvaluation(result)
      })
      .catch(() => {
        if (current) setEvaluation(null)
      })
    return () => {
      current = false
    }
  }, [engine, revision, sketch, tree])

  const modelledBodies: readonly Body[] = evaluation?.bodies ?? []
  const meshes: MeshData[] = useMemo(
    () => [
      ...document.parts.flatMap((part) => part.bodies.map((body) => body.mesh)),
      ...modelledBodies.map((body) => body.mesh),
    ],
    [document, modelledBodies],
  )
  const triangles = useMemo(
    () => meshes.reduce((total, mesh) => total + triangleCount(mesh), 0),
    [meshes],
  )

  const selectedFeature = selectedFeatureId ? (tree.getFeature(selectedFeatureId) ?? null) : null
  const computed = useMemo<ComputedValue[]>(
    () => computedValues(evaluation, selectedFeatureId),
    [evaluation, selectedFeatureId],
  )

  /** Records an edit to the model: mark dirty and schedule a rebuild. */
  const touch = useCallback(() => {
    setModified(true)
    bumpRevision()
  }, [])

  const handleSave = useCallback(() => {
    onSave(withFeatureTree(withSketch(document, sketch), tree))
    setModified(false)
  }, [document, onSave, sketch, tree])

  /**
   * Appends a feature of the given kind and shows it. Kinds that consume a
   * profile are pointed at the sketch being edited; the rest work off whatever
   * the tree has built so far.
   */
  const addFeature = useCallback(
    (type: FeatureType) => {
      const feature = createFeature(type, {
        name: nextFeatureName(type, tree.features),
        sketchId: isSketchFeature(type) ? sketch.id : null,
      })
      tree.addFeature(feature)
      setSelectedFeatureId(feature.id)
      setSurface('model')
      touch()
    },
    [sketch, touch, tree],
  )

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
    (featureId: string, name: string) => {
      if (tree.renameFeature(featureId, name)) touch()
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
      { id: 'file:save', title: 'Save / Export', category: 'File', shortcut: 'Ctrl+S', run: handleSave },
      { id: 'file:close', title: 'Close Document', category: 'File', run: onClose },
      {
        id: 'view:sketch',
        title: 'Show Sketch Surface',
        category: 'View',
        run: () => setSurface('sketch'),
      },
      { id: 'view:model', title: 'Show 3D Surface', category: 'View', run: () => setSurface('model') },
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
    [addFeature, handleSave, onClose, showSketchTool],
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
        if (event.key.toLowerCase() === 's') {
          event.preventDefault()
          handleSave()
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
        <span className="editor__doc">{document.metadata.name}</span>
        <span className="editor__modified">{modified ? 'Modified' : 'Saved'}</span>
        <div className="editor__spacer" />
        {surface === 'sketch' ? (
          <Button variant="primary" onClick={handleExtrude}>
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
        <Button onClick={handleSave}>Save</Button>
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
          <SketchEditor
            model={sketch}
            onChange={touch}
            tool={sketchTool}
            onToolChange={setSketchTool}
            active={surface === 'sketch'}
          />
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
