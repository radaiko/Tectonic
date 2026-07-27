import { useCallback, useMemo, useState } from 'react'
import type { MeshData } from '../domain/MeshData'
import { triangleCount, vertexCount } from '../domain/MeshData'
import { vec3 } from '../domain/vec3'
import type { MeshValidation } from './MeshImport'
import { decimateMesh, repairMesh, smoothMesh, validateMesh } from './MeshImport'
import type { MeshSelection } from './MeshEdit'
import {
  EMPTY_SELECTION,
  bevelEdge,
  deleteFaces,
  extrudeFaces,
  fillHole,
  isSelectionEmpty,
  rotateSelection,
  scaleSelection,
  selectedVertices,
  splitEdge,
  translateSelection,
} from './MeshEdit'
import type { MeshElement } from './types'
import { MESH_ELEMENTS, MeshError, boundaryLoops, buildTopology } from './types'
import './MeshEditor.css'

/**
 * The mesh editing mode.
 *
 * The panel owns the edit history — every operation returns a whole new mesh, so
 * undo is a stack of them rather than a log of inverse operations. It reports
 * each new mesh outwards through `onChange` and never touches the viewport
 * itself; picking comes back in through `onSelectionChange`, because only the
 * viewport knows what the pointer hit.
 */

export interface MeshEditorProps {
  readonly mesh: MeshData
  readonly selection?: MeshSelection
  readonly onChange: (mesh: MeshData) => void
  readonly onSelectionChange?: (selection: MeshSelection) => void
  /** Called with the mesh to hand to the kernel. Absent hides the button. */
  readonly onConvertToSolid?: (mesh: MeshData) => void
}

/** How far a nudge moves the selection, in document units. */
export const NUDGE_STEP = 1

export function MeshEditor({
  mesh,
  selection = EMPTY_SELECTION,
  onChange,
  onSelectionChange,
  onConvertToSolid,
}: MeshEditorProps): React.ReactElement {
  const [mode, setMode] = useState<MeshElement>('face')
  const [amount, setAmount] = useState(NUDGE_STEP)
  const [message, setMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<readonly MeshData[]>([])

  const validation: MeshValidation = useMemo(() => validateMesh(mesh), [mesh])
  const holes = useMemo(() => boundaryLoops(buildTopology(mesh)).length, [mesh])

  const commit = useCallback(
    (next: MeshData, note?: string) => {
      setHistory((stack) => [...stack, mesh])
      setMessage(note ?? null)
      onChange(next)
    },
    [mesh, onChange],
  )

  /** Runs an edit, turning a refusal into a message instead of a crash. */
  const attempt = useCallback(
    (label: string, edit: () => MeshData) => {
      try {
        commit(edit(), label)
      } catch (error) {
        setMessage(error instanceof MeshError ? error.message : String(error))
      }
    },
    [commit],
  )

  const undo = (): void => {
    const previous = history[history.length - 1]
    if (!previous) return
    setHistory((stack) => stack.slice(0, -1))
    setMessage('Undone')
    onChange(previous)
  }

  const clearSelection = (): void => onSelectionChange?.(EMPTY_SELECTION)

  const nudge = (axis: 'x' | 'y' | 'z', sign: 1 | -1): void => {
    attempt(
      `Moved ${axis.toUpperCase()}`,
      () =>
        translateSelection(
          mesh,
          selection,
          vec3(
            axis === 'x' ? amount * sign : 0,
            axis === 'y' ? amount * sign : 0,
            axis === 'z' ? amount * sign : 0,
          ),
        ),
    )
  }

  const empty = isSelectionEmpty(selection)
  const selectedCount = selectedVertices(mesh, selection).length

  return (
    <section className="mesh-editor" aria-label="Mesh editor">
      <header className="mesh-editor__header">
        <div className="mesh-editor__modes" role="radiogroup" aria-label="Selection mode">
          {MESH_ELEMENTS.map((element) => (
            <button
              key={element}
              type="button"
              role="radio"
              aria-checked={mode === element}
              className={`mesh-editor__mode${mode === element ? ' mesh-editor__mode--active' : ''}`}
              onClick={() => {
                setMode(element)
                clearSelection()
              }}
            >
              {element}
            </button>
          ))}
        </div>
        <span className="mesh-editor__stats">
          {vertexCount(mesh)} verts · {triangleCount(mesh)} tris · {selectedCount} selected
        </span>
      </header>

      <dl className="mesh-editor__health">
        <div>
          <dt>Watertight</dt>
          <dd className={validation.closed ? 'mesh-editor__ok' : 'mesh-editor__bad'}>
            {validation.closed ? 'yes' : `no — ${validation.boundaryEdgeCount} open edges`}
          </dd>
        </div>
        <div>
          <dt>Manifold</dt>
          <dd className={validation.manifold ? 'mesh-editor__ok' : 'mesh-editor__bad'}>
            {validation.manifold ? 'yes' : `no — ${validation.nonManifoldEdges.length} bad edges`}
          </dd>
        </div>
        <div>
          <dt>Holes</dt>
          <dd className={holes === 0 ? 'mesh-editor__ok' : 'mesh-editor__bad'}>{holes}</dd>
        </div>
        <div>
          <dt>Degenerate</dt>
          <dd
            className={
              validation.degenerateTriangles.length === 0 ? 'mesh-editor__ok' : 'mesh-editor__bad'
            }
          >
            {validation.degenerateTriangles.length}
          </dd>
        </div>
      </dl>

      <fieldset className="mesh-editor__group" disabled={empty}>
        <legend>Transform</legend>
        <label className="mesh-editor__amount">
          Amount
          <input
            type="number"
            step={0.5}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </label>
        <div className="mesh-editor__row">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <span key={axis} className="mesh-editor__axis">
              <button type="button" onClick={() => nudge(axis, -1)}>
                −{axis.toUpperCase()}
              </button>
              <button type="button" onClick={() => nudge(axis, 1)}>
                +{axis.toUpperCase()}
              </button>
            </span>
          ))}
        </div>
        <div className="mesh-editor__row">
          <button
            type="button"
            onClick={() =>
              attempt('Rotated', () => rotateSelection(mesh, selection, vec3(0, 0, 1), amount))
            }
          >
            Rotate Z {amount}°
          </button>
          <button
            type="button"
            onClick={() => attempt('Scaled', () => scaleSelection(mesh, selection, 1.1))}
          >
            Scale ×1.1
          </button>
        </div>
      </fieldset>

      <fieldset className="mesh-editor__group">
        <legend>Modify</legend>
        <div className="mesh-editor__row">
          <button
            type="button"
            disabled={selection.faces.length === 0}
            onClick={() =>
              attempt('Extruded', () => extrudeFaces(mesh, selection.faces, amount))
            }
          >
            Extrude faces
          </button>
          <button
            type="button"
            disabled={selection.edges.length === 0}
            onClick={() =>
              attempt('Bevelled', () => bevelEdge(mesh, selection.edges[0] as string, amount))
            }
          >
            Bevel edge
          </button>
          <button
            type="button"
            disabled={selection.edges.length === 0}
            onClick={() => attempt('Split', () => splitEdge(mesh, selection.edges[0] as string))}
          >
            Split edge
          </button>
          <button
            type="button"
            disabled={selection.faces.length === 0}
            onClick={() => {
              attempt('Deleted faces', () => deleteFaces(mesh, selection.faces))
              clearSelection()
            }}
          >
            Delete faces
          </button>
          <button type="button" disabled={holes === 0} onClick={() => attempt('Hole filled', () => fillHole(mesh))}>
            Fill hole
          </button>
        </div>
      </fieldset>

      <fieldset className="mesh-editor__group">
        <legend>Repair &amp; simplify</legend>
        <div className="mesh-editor__row">
          <button
            type="button"
            onClick={() =>
              attempt('Repaired', () => {
                const report = repairMesh(mesh)
                return report.mesh
              })
            }
          >
            Repair all
          </button>
          <button type="button" onClick={() => attempt('Smoothed', () => smoothMesh(mesh, 1, 0.5))}>
            Smooth
          </button>
          <button
            type="button"
            onClick={() => attempt('Decimated', () => decimateMesh(mesh, 0.5))}
          >
            Decimate 50%
          </button>
        </div>
      </fieldset>

      <footer className="mesh-editor__footer">
        <button type="button" disabled={history.length === 0} onClick={undo}>
          Undo
        </button>
        {onConvertToSolid ? (
          <button
            type="button"
            className="mesh-editor__primary"
            onClick={() => onConvertToSolid(mesh)}
          >
            Convert to solid
          </button>
        ) : null}
        {message ? (
          <span className="mesh-editor__message" role="status">
            {message}
          </span>
        ) : null}
      </footer>
    </section>
  )
}
