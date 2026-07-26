import { useMemo } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import type { MeshData } from '../domain/MeshData'
import type { TectonicDocument } from '../domain/Document'
import { countBodies } from '../domain/Document'
import { triangleCount } from '../domain/MeshData'
import { Button } from '../ui/Button'
import './EditorView.css'

export interface EditorViewProps {
  readonly document: TectonicDocument
  readonly onSave: () => void
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

  return (
    <div className="editor">
      <header className="editor__bar">
        <span className="editor__brand">Tectonic</span>
        <span className="editor__doc">{document.metadata.name}</span>
        <div className="editor__spacer" />
        <Button onClick={onSave}>Save</Button>
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

        <section className="editor__viewport">
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
