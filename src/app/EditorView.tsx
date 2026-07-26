import { useCallback, useMemo, useState } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import type { MeshData } from '../domain/MeshData'
import type { TectonicDocument } from '../domain/Document'
import { countBodies, documentSketch, withSketch } from '../domain/Document'
import { triangleCount } from '../domain/MeshData'
import { SketchEditor } from '../sketch/SketchEditor'
import { Button } from '../ui/Button'
import './EditorView.css'

export type EditorSurface = 'sketch' | 'model'

export interface EditorViewProps {
  readonly document: TectonicDocument
  /** Receives the document with the current sketch folded back into it. */
  readonly onSave: (document: TectonicDocument) => void
  readonly onClose: () => void
}

export function EditorView({ document, onSave, onClose }: EditorViewProps): React.ReactElement {
  const meshes: MeshData[] = useMemo(
    () => document.parts.flatMap((part) => part.bodies.map((body) => body.mesh)),
    [document],
  )
  const triangles = useMemo(
    () => meshes.reduce((total, mesh) => total + triangleCount(mesh), 0),
    [meshes],
  )
  // Mutable and long-lived: the sketch editor edits this model in place.
  const sketch = useMemo(() => documentSketch(document), [document])

  const [surface, setSurface] = useState<EditorSurface>('sketch')
  const [modified, setModified] = useState(false)

  const handleSave = useCallback(() => {
    onSave(withSketch(document, sketch))
    setModified(false)
  }, [document, onSave, sketch])

  return (
    <div className="editor">
      <header className="editor__bar">
        <span className="editor__brand">Tectonic</span>
        <span className="editor__doc">{document.metadata.name}</span>
        <span className="editor__modified">{modified ? 'Modified' : 'Saved'}</span>
        <div className="editor__spacer" />
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
          <h2 className="editor__panel-title">Feature Tree</h2>
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
          {document.features.length > 0 ? (
            <ul className="editor__tree">
              {document.features.map((feature) => (
                <li key={feature.id} className="editor__node">
                  {feature.name}
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        {/* Both surfaces stay mounted so switching keeps their state and the
            3D viewport does not have to rebuild its scene. */}
        <section className="editor__viewport" hidden={surface !== 'sketch'}>
          <SketchEditor model={sketch} onChange={() => setModified(true)} />
        </section>
        <section className="editor__viewport" hidden={surface !== 'model'}>
          <ThreeViewport meshes={meshes} />
        </section>
      </div>

      <footer className="editor__status">
        <span>{document.parts.length} parts</span>
        <span>{countBodies(document)} bodies</span>
        <span>{triangles.toLocaleString()} triangles</span>
        <span>{document.metadata.units}</span>
      </footer>
    </div>
  )
}
