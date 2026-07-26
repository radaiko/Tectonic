import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import type { ClipPlane } from '../3d/ThreeViewport'
import type { MeshData } from '../domain/MeshData'
import { Button } from '../ui/Button'
import type { AssemblyComponent, AssemblyTree } from './AssemblyTree'
import type { PartCatalog } from './AssemblyFeatures'
import {
  ExplodedView,
  billOfMaterials,
  detectInterference,
  replaceComponent,
} from './AssemblyFeatures'
import type { BomEntry, InterferencePair } from './AssemblyFeatures'
import { MATE_KINDS, Mate } from './Mate'
import type { MateKind } from './Mate'
import { MateSolver } from './MateSolver'
import type { MateSolution, MateStatus } from './MateSolver'
import { transformMesh } from './geometry'
import type { ComponentTransform } from './Transform'
import { axisAngleOf, createTransform, quaternionFromAxisAngle } from './Transform'
import './AssemblyEditor.css'

/** The axes a section view can cut along. */
const SECTION_AXES = ['X', 'Y', 'Z'] as const
type SectionAxis = (typeof SECTION_AXES)[number]

const AXIS_NORMALS: Record<SectionAxis, { x: number; y: number; z: number }> = {
  X: { x: 1, y: 0, z: 0 },
  Y: { x: 0, y: 1, z: 0 },
  Z: { x: 0, y: 0, z: 1 },
}

export interface AssemblyEditorProps {
  readonly tree: AssemblyTree
  readonly mates?: readonly Mate[]
  /** What the assembly knows about the parts it places. */
  readonly catalog?: PartCatalog
  /** One tessellation per part; every instance of it is placed from this. */
  readonly meshes?: ReadonlyMap<string, MeshData>
  /** Called after any edit to the assembly or its mates. */
  readonly onChange?: (tree: AssemblyTree) => void
  readonly onClose?: () => void
}

interface MenuState {
  readonly componentId: string
  readonly x: number
  readonly y: number
}

interface MateDraft {
  readonly componentId1: string
  readonly componentId2: string
  readonly type: MateKind
  readonly distance: number
  readonly angle: number
}

/**
 * The assembly environment: the tree of components on the left, their solved
 * placements in the middle, and the mates, parts list and exploded view along
 * the right.
 *
 * Every edit ends in one place — a re-solve of the whole mate graph — so what
 * the viewport shows is always what the constraints actually produce, not an
 * incrementally patched-up guess.
 */
export function AssemblyEditor({
  tree,
  mates = [],
  catalog = new Map(),
  meshes = new Map(),
  onChange,
  onClose,
}: AssemblyEditorProps): React.ReactElement {
  const solver = useMemo(() => new MateSolver(tree, mates), [mates, tree])
  const explode = useMemo(() => new ExplodedView(), [])

  const [revision, bumpRevision] = useReducer((count: number) => count + 1, 0)
  const [solution, setSolution] = useState<MateSolution | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<readonly string[]>([])
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [dialog, setDialog] = useState<'mate' | 'replace' | null>(null)
  const [selectedMateId, setSelectedMateId] = useState<string | null>(null)
  const [explodeAmount, setExplodeAmount] = useState(0)
  const [sectionAxis, setSectionAxis] = useState<SectionAxis | null>(null)
  const [sectionOffset, setSectionOffset] = useState(0)
  const [interference, setInterference] = useState<readonly InterferencePair[] | null>(null)

  // Solving writes the result straight back into the tree, so the placements the
  // panels read and the ones the viewport draws are the same numbers.
  useEffect(() => {
    const result = solver.solve()
    solver.apply(result)
    setSolution(result)
  }, [revision, solver])

  const touch = useCallback(() => {
    setInterference(null)
    bumpRevision()
    onChange?.(tree)
  }, [onChange, tree])

  const components = tree.components
  const selected = selectedId ? (tree.getComponent(selectedId) ?? null) : null
  const selectedMate = selectedMateId ? (solver.getMate(selectedMateId) ?? null) : null

  const interferingIds = useMemo(() => {
    const ids = new Set<string>()
    for (const pair of interference ?? []) {
      ids.add(pair.componentIdA)
      ids.add(pair.componentIdB)
    }
    return ids
  }, [interference])

  const placements = useMemo(
    () => explode.transformsAt(tree, explodeAmount),
    // The explode offsets and the tree are edited in place, so `revision` and
    // `solution` are what say the numbers behind them have moved on.
    [explode, explodeAmount, revision, solution, tree],
  )

  const scene = useMemo(() => {
    const bodies: MeshData[] = []
    const highlighted: MeshData[] = []
    for (const component of components) {
      const mesh = component.partId ? meshes.get(component.partId) : undefined
      const placement = placements.get(component.id)
      if (!mesh || !placement) continue
      const placed = transformMesh(mesh, placement)
      if (interferingIds.has(component.id)) highlighted.push(placed)
      else bodies.push(placed)
    }
    return { bodies, highlighted }
  }, [components, interferingIds, meshes, placements])

  const bom = useMemo<BomEntry[]>(
    () => billOfMaterials(tree, catalog),
    // Recomputed whenever the tree changes, which `revision` stands for.
    [catalog, revision, tree],
  )

  const clipPlane: ClipPlane | null = sectionAxis
    ? { normal: AXIS_NORMALS[sectionAxis], constant: sectionOffset }
    : null

  /* ---------------------------------------------------------------------- */

  const handleGround = useCallback(
    (componentId: string) => {
      const component = tree.requireComponent(componentId)
      tree.setGrounded(componentId, !component.isGrounded)
      touch()
    },
    [touch, tree],
  )

  const handleDelete = useCallback(
    (componentId: string) => {
      const removed = new Set(tree.removeComponent(componentId))
      if (removed.size === 0) return
      for (const mate of [...solver.mates]) {
        if (removed.has(mate.componentId1) || removed.has(mate.componentId2)) {
          solver.removeMate(mate.id)
        }
      }
      setSelectedId((current) => (current && removed.has(current) ? null : current))
      touch()
    },
    [solver, touch, tree],
  )

  const handleTransform = useCallback(
    (componentId: string, transform: ComponentTransform) => {
      tree.setTransform(componentId, transform)
      touch()
    },
    [touch, tree],
  )

  const handleReplace = useCallback(
    (componentId: string, partId: string) => {
      const result = replaceComponent(tree, {
        componentId,
        partId,
        mates: solver.mates,
        // A mate survives only if the new part still carries what it grips.
        entityExists: (part, entityRef) =>
          entityRef.length === 0 || meshes.has(part) || catalog.has(part),
      })
      for (const mate of result.dropped) solver.removeMate(mate.id)
      setDialog(null)
      touch()
    },
    [catalog, meshes, solver, touch, tree],
  )

  const handleAddMate = useCallback(
    (draft: MateDraft) => {
      const mate = new Mate({
        type: draft.type,
        componentId1: draft.componentId1,
        componentId2: draft.componentId2,
        entityRef1: 'origin',
        entityRef2: 'origin',
        parameters: { distance: draft.distance, angle: draft.angle },
      })
      solver.addMate(mate)
      setSelectedMateId(mate.id)
      setDialog(null)
      touch()
    },
    [solver, touch],
  )

  const handleDeleteMate = useCallback(
    (mateId: string) => {
      if (!solver.removeMate(mateId)) return
      setSelectedMateId((current) => (current === mateId ? null : current))
      touch()
    },
    [solver, touch],
  )

  const handleCheckInterference = useCallback(() => {
    setInterference(detectInterference(tree, catalog))
  }, [catalog, tree])

  /* ---------------------------------------------------------------------- */

  return (
    <div className="assembly" onClick={() => setMenu(null)}>
      <header className="assembly__bar">
        <span className="assembly__brand">Assembly</span>
        <span className="assembly__doc">{tree.name}</span>
        <div className="assembly__spacer" />
        <Button onClick={() => setDialog('mate')} disabled={components.length < 2}>
          Add mate
        </Button>
        <Button onClick={handleCheckInterference}>Check interference</Button>
        {onClose ? (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </header>

      <div className="assembly__body">
        <aside className="assembly__panel">
          <h2 className="assembly__title">Components</h2>
          {components.length === 0 ? (
            <p className="assembly__empty">No components yet.</p>
          ) : (
            <ComponentTree
              tree={tree}
              selectedId={selectedId}
              collapsedIds={collapsedIds}
              interferingIds={interferingIds}
              onSelect={setSelectedId}
              onToggle={(id) =>
                setCollapsedIds((current) =>
                  current.includes(id)
                    ? current.filter((entry) => entry !== id)
                    : [...current, id],
                )
              }
              onContextMenu={(componentId, x, y) => setMenu({ componentId, x, y })}
            />
          )}

          {selected ? (
            <TransformEditor
              component={selected}
              explode={explode}
              explodeAmount={explodeAmount}
              onTransform={handleTransform}
              onExplodeOffset={touch}
            />
          ) : null}
        </aside>

        <section className="assembly__viewport">
          <ThreeViewport
            meshes={scene.bodies}
            highlights={scene.highlighted}
            clipPlane={clipPlane}
          />
          <div className="assembly__overlay">
            <label className="assembly__slider">
              <span>Explode</span>
              <input
                type="range"
                aria-label="Explode amount"
                min={0}
                max={1}
                step={0.01}
                value={explodeAmount}
                onChange={(event) => setExplodeAmount(Number(event.target.value))}
              />
            </label>
            <Button
              variant={explode.size > 0 ? 'primary' : 'secondary'}
              onClick={() => {
                for (const [id, offset] of ExplodedView.auto(tree).offsets) {
                  explode.setOffset(id, offset)
                }
                bumpRevision()
              }}
            >
              Auto explode
            </Button>
            <label className="assembly__slider">
              <span>Section</span>
              <select
                aria-label="Section axis"
                value={sectionAxis ?? 'off'}
                onChange={(event) =>
                  setSectionAxis(
                    event.target.value === 'off' ? null : (event.target.value as SectionAxis),
                  )
                }
              >
                <option value="off">Off</option>
                {SECTION_AXES.map((axis) => (
                  <option key={axis} value={axis}>
                    {axis}
                  </option>
                ))}
              </select>
              <input
                type="range"
                aria-label="Section offset"
                min={-200}
                max={200}
                step={1}
                value={sectionOffset}
                disabled={sectionAxis === null}
                onChange={(event) => setSectionOffset(Number(event.target.value))}
              />
            </label>
          </div>
        </section>

        <aside className="assembly__panel assembly__panel--right">
          <MateList
            mates={solver.mates}
            tree={tree}
            solution={solution}
            selectedMateId={selectedMateId}
            onSelect={setSelectedMateId}
            onDelete={handleDeleteMate}
          />

          {selectedMate ? (
            <MateParameters mate={selectedMate} onChange={touch} />
          ) : null}

          <h2 className="assembly__title">Bill of materials</h2>
          <BomTable entries={bom} />

          {interference ? (
            <div className="assembly__interference" data-testid="interference-report">
              <h2 className="assembly__title">Interference</h2>
              {interference.length === 0 ? (
                <p className="assembly__empty">No components overlap.</p>
              ) : (
                <ul className="assembly__list">
                  {interference.map((pair) => (
                    <li key={`${pair.componentIdA}-${pair.componentIdB}`} className="assembly__clash">
                      {tree.requireComponent(pair.componentIdA).name} ↔{' '}
                      {tree.requireComponent(pair.componentIdB).name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="assembly__status">
        <span>{components.length} components</span>
        <span>{solver.mates.length} mates</span>
        <span>{solution?.unsolved.length ?? 0} under-constrained</span>
        {solution && solution.overConstrained.length > 0 ? (
          <span className="assembly__warning">
            {solution.overConstrained.length} over-constrained
          </span>
        ) : null}
        {solution && solution.conflicts.length > 0 ? (
          <span className="assembly__error">{solution.conflicts.length} conflicting mates</span>
        ) : null}
      </footer>

      {menu ? (
        <ComponentMenu
          state={menu}
          component={tree.requireComponent(menu.componentId)}
          onGround={() => {
            handleGround(menu.componentId)
            setMenu(null)
          }}
          onEditTransform={() => {
            setSelectedId(menu.componentId)
            setMenu(null)
          }}
          onReplace={() => {
            setSelectedId(menu.componentId)
            setDialog('replace')
            setMenu(null)
          }}
          onDelete={() => {
            handleDelete(menu.componentId)
            setMenu(null)
          }}
        />
      ) : null}

      {dialog === 'mate' ? (
        <AddMateDialog
          components={components}
          onCancel={() => setDialog(null)}
          onAdd={handleAddMate}
        />
      ) : null}

      {dialog === 'replace' && selected ? (
        <ReplacePartDialog
          component={selected}
          partIds={[...new Set([...catalog.keys(), ...meshes.keys()])]}
          onCancel={() => setDialog(null)}
          onReplace={(partId) => handleReplace(selected.id, partId)}
        />
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

interface ComponentTreeProps {
  readonly tree: AssemblyTree
  readonly selectedId: string | null
  readonly collapsedIds: readonly string[]
  readonly interferingIds: ReadonlySet<string>
  readonly onSelect: (id: string) => void
  readonly onToggle: (id: string) => void
  readonly onContextMenu: (id: string, x: number, y: number) => void
}

/** The assembly structure, one nested list per sub-assembly. */
function ComponentTree(props: ComponentTreeProps): React.ReactElement {
  const renderLevel = (parentId: string | null): React.ReactElement => (
    <ul className="assembly__tree" aria-label={parentId === null ? 'Assembly tree' : undefined}>
      {props.tree.getComponents(parentId).map((component) => {
        const children = props.tree.getChildren(component.id)
        const collapsed = props.collapsedIds.includes(component.id)
        const classes = [
          'assembly__node',
          component.id === props.selectedId ? 'assembly__node--selected' : '',
          component.isGrounded ? 'assembly__node--grounded' : '',
          props.interferingIds.has(component.id) ? 'assembly__node--clash' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li
            key={component.id}
            className={classes}
            data-component-id={component.id}
            data-grounded={component.isGrounded}
            onContextMenu={(event) => {
              event.preventDefault()
              props.onContextMenu(component.id, event.clientX, event.clientY)
            }}
          >
            <div className="assembly__row">
              {children.length > 0 ? (
                <button
                  type="button"
                  className="assembly__disclosure"
                  aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${component.name}`}
                  aria-expanded={!collapsed}
                  onClick={() => props.onToggle(component.id)}
                >
                  {collapsed ? '▸' : '▾'}
                </button>
              ) : (
                <span className="assembly__disclosure assembly__disclosure--leaf" />
              )}
              <button
                type="button"
                className="assembly__name"
                aria-pressed={component.id === props.selectedId}
                onClick={() => props.onSelect(component.id)}
              >
                {component.name}
              </button>
              {component.isGrounded ? (
                <span className="assembly__badge" title="Grounded">
                  ⏚
                </span>
              ) : null}
            </div>
            {children.length > 0 && !collapsed ? renderLevel(component.id) : null}
          </li>
        )
      })}
    </ul>
  )

  return renderLevel(null)
}

interface ComponentMenuProps {
  readonly state: MenuState
  readonly component: AssemblyComponent
  readonly onEditTransform: () => void
  readonly onGround: () => void
  readonly onReplace: () => void
  readonly onDelete: () => void
}

function ComponentMenu({
  state,
  component,
  onEditTransform,
  onGround,
  onReplace,
  onDelete,
}: ComponentMenuProps): React.ReactElement {
  return (
    <ul
      className="assembly__menu"
      role="menu"
      aria-label={`${component.name} actions`}
      style={{ left: state.x, top: state.y }}
    >
      <li>
        <button type="button" role="menuitem" onClick={onEditTransform}>
          Edit Transform
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onGround}>
          {component.isGrounded ? 'Unground' : 'Ground'}
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onReplace} disabled={component.isAssembly}>
          Replace Part
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onDelete}>
          Delete
        </button>
      </li>
    </ul>
  )
}

interface TransformEditorProps {
  readonly component: AssemblyComponent
  readonly explode: ExplodedView
  readonly explodeAmount: number
  readonly onTransform: (componentId: string, transform: ComponentTransform) => void
  readonly onExplodeOffset: () => void
}

/** Position, orientation and explode offset of the selected component. */
function TransformEditor({
  component,
  explode,
  onTransform,
  onExplodeOffset,
}: TransformEditorProps): React.ReactElement {
  const { position, rotation } = component.transform
  const { axis, angle } = axisAngleOf(rotation)
  const offset = explode.getOffset(component.id)?.position ?? { x: 0, y: 0, z: 0 }

  const move = (changes: Partial<{ x: number; y: number; z: number }>): void => {
    onTransform(component.id, {
      position: { ...position, ...changes },
      rotation,
    })
  }

  const turn = (value: number): void => {
    onTransform(
      component.id,
      createTransform({ position, rotation: quaternionFromAxisAngle(axis, value) }),
    )
  }

  return (
    <div className="assembly__transform">
      <h2 className="assembly__title">Transform — {component.name}</h2>
      <div className="assembly__axes">
        <NumberField label="Position X" value={position.x} onChange={(x) => move({ x })} />
        <NumberField label="Position Y" value={position.y} onChange={(y) => move({ y })} />
        <NumberField label="Position Z" value={position.z} onChange={(z) => move({ z })} />
      </div>
      <NumberField label="Rotation" value={round(angle)} step={5} onChange={turn} />

      <h2 className="assembly__title">Explode offset</h2>
      <div className="assembly__axes">
        {(['x', 'y', 'z'] as const).map((key) => (
          <NumberField
            key={key}
            label={`Explode ${key.toUpperCase()}`}
            value={offset[key]}
            onChange={(value) => {
              explode.setOffset(component.id, { ...offset, [key]: value })
              onExplodeOffset()
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface MateListProps {
  readonly mates: readonly Mate[]
  readonly tree: AssemblyTree
  readonly solution: MateSolution | null
  readonly selectedMateId: string | null
  readonly onSelect: (id: string) => void
  readonly onDelete: (id: string) => void
}

function MateList({
  mates,
  tree,
  solution,
  selectedMateId,
  onSelect,
  onDelete,
}: MateListProps): React.ReactElement {
  return (
    <>
      <h2 className="assembly__title">Mates</h2>
      {mates.length === 0 ? (
        <p className="assembly__empty">No mates yet.</p>
      ) : (
        <ul className="assembly__list" aria-label="Mates">
          {mates.map((mate) => {
            const status: MateStatus = solution?.mateStatus.get(mate.id) ?? 'solved'
            return (
              <li
                key={mate.id}
                className={`assembly__mate assembly__mate--${status}`}
                data-mate-id={mate.id}
                data-status={status}
              >
                <button
                  type="button"
                  className="assembly__name"
                  aria-pressed={mate.id === selectedMateId}
                  onClick={() => onSelect(mate.id)}
                >
                  {mate.name}
                </button>
                <span className="assembly__mate-pair">
                  {tree.getComponent(mate.componentId1)?.name ?? '?'} ·{' '}
                  {tree.getComponent(mate.componentId2)?.name ?? '?'}
                </span>
                <button
                  type="button"
                  className="assembly__remove"
                  aria-label={`Delete ${mate.name}`}
                  onClick={() => onDelete(mate.id)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function MateParameters({
  mate,
  onChange,
}: {
  readonly mate: Mate
  readonly onChange: () => void
}): React.ReactElement {
  return (
    <div className="assembly__mate-parameters">
      <h2 className="assembly__title">{mate.name}</h2>
      <NumberField
        label="Distance"
        value={mate.parameters.distance}
        onChange={(distance) => {
          mate.setParameters({ distance })
          onChange()
        }}
      />
      <NumberField
        label="Angle"
        value={mate.parameters.angle}
        step={5}
        onChange={(angle) => {
          mate.setParameters({ angle })
          onChange()
        }}
      />
      <label className="assembly__field">
        <span>Locked</span>
        <input
          type="checkbox"
          checked={mate.isLocked}
          onChange={(event) => {
            mate.isLocked = event.target.checked
            onChange()
          }}
        />
      </label>
    </div>
  )
}

function BomTable({ entries }: { readonly entries: readonly BomEntry[] }): React.ReactElement {
  if (entries.length === 0) return <p className="assembly__empty">Nothing to list yet.</p>
  return (
    <table className="assembly__bom" aria-label="Bill of materials">
      <thead>
        <tr>
          <th scope="col">Part</th>
          <th scope="col">Qty</th>
          <th scope="col">Material</th>
          <th scope="col">Mass</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} data-bom-id={entry.id}>
            <td>{entry.name}</td>
            <td>{entry.quantity}</td>
            <td>{entry.material ?? '—'}</td>
            <td>{entry.totalMass === null ? '—' : round(entry.totalMass)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface AddMateDialogProps {
  readonly components: readonly AssemblyComponent[]
  readonly onAdd: (draft: MateDraft) => void
  readonly onCancel: () => void
}

function AddMateDialog({ components, onAdd, onCancel }: AddMateDialogProps): React.ReactElement {
  const first = components[0] as AssemblyComponent
  const second = (components[1] ?? components[0]) as AssemblyComponent

  const [componentId1, setComponentId1] = useState(first.id)
  const [componentId2, setComponentId2] = useState(second.id)
  const [type, setType] = useState<MateKind>('coincident')
  const [distance, setDistance] = useState(0)
  const [angle, setAngle] = useState(0)

  const valid = componentId1 !== componentId2

  return (
    <div className="assembly__dialog" role="dialog" aria-label="Add mate">
      <h2 className="assembly__title">Add mate</h2>
      <label className="assembly__field">
        <span>First</span>
        <select
          aria-label="First component"
          value={componentId1}
          onChange={(event) => setComponentId1(event.target.value)}
        >
          {components.map((component) => (
            <option key={component.id} value={component.id}>
              {component.name}
            </option>
          ))}
        </select>
      </label>
      <label className="assembly__field">
        <span>Second</span>
        <select
          aria-label="Second component"
          value={componentId2}
          onChange={(event) => setComponentId2(event.target.value)}
        >
          {components.map((component) => (
            <option key={component.id} value={component.id}>
              {component.name}
            </option>
          ))}
        </select>
      </label>
      <label className="assembly__field">
        <span>Type</span>
        <select
          aria-label="Mate type"
          value={type}
          onChange={(event) => setType(event.target.value as MateKind)}
        >
          {MATE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <NumberField label="Mate distance" value={distance} onChange={setDistance} />
      <NumberField label="Mate angle" value={angle} step={5} onChange={setAngle} />

      {valid ? null : <p className="assembly__error">Pick two different components.</p>}

      <div className="assembly__dialog-actions">
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => onAdd({ componentId1, componentId2, type, distance, angle })}
        >
          Add
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface ReplacePartDialogProps {
  readonly component: AssemblyComponent
  readonly partIds: readonly string[]
  readonly onReplace: (partId: string) => void
  readonly onCancel: () => void
}

function ReplacePartDialog({
  component,
  partIds,
  onReplace,
  onCancel,
}: ReplacePartDialogProps): React.ReactElement {
  const [partId, setPartId] = useState(partIds[0] ?? '')

  return (
    <div className="assembly__dialog" role="dialog" aria-label="Replace part">
      <h2 className="assembly__title">Replace {component.name}</h2>
      <label className="assembly__field">
        <span>Part</span>
        <select
          aria-label="Replacement part"
          value={partId}
          onChange={(event) => setPartId(event.target.value)}
        >
          {partIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <div className="assembly__dialog-actions">
        <Button variant="primary" disabled={partId.length === 0} onClick={() => onReplace(partId)}>
          Replace
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface NumberFieldProps {
  readonly label: string
  readonly value: number
  readonly step?: number
  readonly onChange: (value: number) => void
}

function NumberField({ label, value, step = 1, onChange }: NumberFieldProps): React.ReactElement {
  return (
    <label className="assembly__field">
      <span>{label}</span>
      <input
        type="number"
        aria-label={label}
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4
}
