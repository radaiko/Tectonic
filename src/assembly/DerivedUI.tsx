import { useState } from 'react'
import type { AssemblyComponent, AssemblyTree } from './AssemblyTree'
import type { DerivedComponentInfo } from './DerivedComponent'
import { DerivationKind, LinkState } from './DerivedComponent'
import type { DerivationGraph } from './DerivedPart'
import type { LinkedComponentRegistry } from './LinkedComponent'
import type { GeometryResolver, TopDownDesign } from './TopDownDesign'
import './DerivedUI.css'

/**
 * The assembly tree, with everything that follows something else called out.
 *
 * A derived part, a linked file and an in-context part are three different
 * mechanisms but one question for the user — is this still current, and do I
 * want it to be? — so they share a badge, an Update button and one menu.
 */

/** The glyph each kind of link wears in the tree. */
const KIND_ICONS: Record<DerivationKind, string> = {
  [DerivationKind.Derived]: '⧉',
  [DerivationKind.Linked]: '🔗',
  [DerivationKind.InContext]: '⌖',
}

const KIND_LABELS: Record<DerivationKind, string> = {
  [DerivationKind.Derived]: 'Derived',
  [DerivationKind.Linked]: 'Linked',
  [DerivationKind.InContext]: 'In context',
}

const STATE_LABELS: Record<LinkState, string> = {
  [LinkState.InSync]: 'up to date',
  [LinkState.OutOfDate]: 'out of date',
  [LinkState.Broken]: 'broken',
  [LinkState.Independent]: 'independent',
}

export interface DerivedTreeProps {
  readonly assembly: AssemblyTree
  readonly derivations?: DerivationGraph
  readonly links?: LinkedComponentRegistry
  readonly topDown?: TopDownDesign
  /**
   * Current revision per source — a part id for a derivation, a resolved path
   * for a link. A missing entry reads as "gone", which shows as broken.
   */
  readonly revisions?: Readonly<Record<string, string | null>>
  /** Reads live geometry, so in-context parts can be told they are stale. */
  readonly resolveGeometry?: GeometryResolver
  readonly selectedComponentId?: string | null
  readonly onSelect?: (componentId: string | null) => void
  readonly onUpdate?: (info: DerivedComponentInfo) => void
  readonly onMakeIndependent?: (info: DerivedComponentInfo) => void
  readonly onCreateDerivedPart?: (componentId: string) => void
  /** "Update all" — every out-of-date link and derivation at once. */
  readonly onUpdateAll?: (infos: readonly DerivedComponentInfo[]) => void
}

interface MenuState {
  readonly componentId: string
  readonly x: number
  readonly y: number
}

export function DerivedTree({
  assembly,
  derivations,
  links,
  topDown,
  revisions = {},
  resolveGeometry,
  selectedComponentId = null,
  onSelect,
  onUpdate,
  onMakeIndependent,
  onCreateDerivedPart,
  onUpdateAll,
}: DerivedTreeProps): React.ReactElement {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const infoFor = (component: AssemblyComponent): DerivedComponentInfo | null =>
    derivationInfo(component, { derivations, links, topDown, revisions, resolveGeometry })

  const stale = assembly.components
    .map(infoFor)
    .filter((info): info is DerivedComponentInfo => info !== null && info.state === LinkState.OutOfDate)

  return (
    <div className="derived-tree" onClick={() => setMenu(null)}>
      <div className="derived-tree__header">
        <h2 className="derived-tree__title">Components</h2>
        {stale.length > 0 ? (
          <button
            type="button"
            className="derived-tree__update-all"
            onClick={() => onUpdateAll?.(stale)}
          >
            Update all ({stale.length})
          </button>
        ) : null}
      </div>

      {assembly.length === 0 ? (
        <p className="derived-tree__empty">This assembly is empty.</p>
      ) : (
        <ul className="derived-tree__list" aria-label="Assembly components">
          {assembly.components.map((component) => (
            <ComponentRow
              key={component.id}
              component={component}
              depth={assembly.getPath(component.id).length - 1}
              info={infoFor(component)}
              selected={component.id === selectedComponentId}
              onSelect={() => onSelect?.(component.id)}
              onUpdate={onUpdate}
              onContextMenu={(x, y) => setMenu({ componentId: component.id, x, y })}
            />
          ))}
        </ul>
      )}

      {menu ? (
        <ContextMenu
          state={menu}
          component={assembly.requireComponent(menu.componentId)}
          info={infoFor(assembly.requireComponent(menu.componentId))}
          onMakeIndependent={(info) => {
            onMakeIndependent?.(info)
            setMenu(null)
          }}
          onCreateDerivedPart={() => {
            onCreateDerivedPart?.(menu.componentId)
            setMenu(null)
          }}
        />
      ) : null}
    </div>
  )
}

interface ComponentRowProps {
  readonly component: AssemblyComponent
  readonly depth: number
  readonly info: DerivedComponentInfo | null
  readonly selected: boolean
  readonly onSelect: () => void
  readonly onUpdate: ((info: DerivedComponentInfo) => void) | undefined
  readonly onContextMenu: (x: number, y: number) => void
}

function ComponentRow({
  component,
  depth,
  info,
  selected,
  onSelect,
  onUpdate,
  onContextMenu,
}: ComponentRowProps): React.ReactElement {
  const classes = [
    'derived-row',
    selected ? 'derived-row--selected' : '',
    info ? `derived-row--${info.state}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={classes}
      data-component-id={component.id}
      data-state={info?.state ?? 'local'}
      style={{ paddingLeft: `${depth * 0.9}rem` }}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu(event.clientX, event.clientY)
      }}
    >
      <button type="button" className="derived-row__name" aria-pressed={selected} onClick={onSelect}>
        {component.name}
      </button>

      {info ? <DerivedBadge info={info} /> : null}

      {info && info.state === LinkState.OutOfDate ? (
        <button
          type="button"
          className="derived-row__update"
          onClick={() => onUpdate?.(info)}
          aria-label={`Update ${component.name}`}
        >
          Update
        </button>
      ) : null}
    </li>
  )
}

export interface DerivedBadgeProps {
  readonly info: DerivedComponentInfo
}

/** The little marker that says what a component follows and how it is doing. */
export function DerivedBadge({ info }: DerivedBadgeProps): React.ReactElement {
  return (
    <span
      className={`derived-badge derived-badge--${info.state}`}
      title={`${KIND_LABELS[info.kind]} from ${info.source} — ${STATE_LABELS[info.state]}`}
      aria-label={`${KIND_LABELS[info.kind]}, ${STATE_LABELS[info.state]}`}
    >
      <span aria-hidden="true">{KIND_ICONS[info.kind]}</span>
      {info.state === LinkState.Broken ? <span aria-hidden="true"> !</span> : null}
    </span>
  )
}

interface ContextMenuProps {
  readonly state: MenuState
  readonly component: AssemblyComponent
  readonly info: DerivedComponentInfo | null
  readonly onMakeIndependent: (info: DerivedComponentInfo) => void
  readonly onCreateDerivedPart: () => void
}

function ContextMenu({
  state,
  component,
  info,
  onMakeIndependent,
  onCreateDerivedPart,
}: ContextMenuProps): React.ReactElement {
  return (
    <ul
      className="derived-menu"
      role="menu"
      aria-label={`${component.name} actions`}
      style={{ left: state.x, top: state.y }}
    >
      <li>
        <button type="button" role="menuitem" onClick={onCreateDerivedPart}>
          Create Derived Part
        </button>
      </li>
      <li>
        <button
          type="button"
          role="menuitem"
          disabled={!info || info.state === LinkState.Independent}
          onClick={() => {
            if (info) onMakeIndependent(info)
          }}
        >
          Make Independent
        </button>
      </li>
    </ul>
  )
}

interface DerivationSources {
  readonly derivations: DerivationGraph | undefined
  readonly links: LinkedComponentRegistry | undefined
  readonly topDown: TopDownDesign | undefined
  readonly revisions: Readonly<Record<string, string | null>>
  readonly resolveGeometry: GeometryResolver | undefined
}

/**
 * What a component follows, if anything. Checked in the order the mechanisms
 * take precedence: a linked file wins over a derivation, which wins over a
 * plain in-context reference.
 */
export function derivationInfo(
  component: AssemblyComponent,
  sources: DerivationSources,
): DerivedComponentInfo | null {
  const link = sources.links?.forComponent(component.id)
  if (link) return link.describe(sources.revisions[link.path] ?? null)

  const derived = component.partId ? sources.derivations?.get(component.partId) : undefined
  if (derived) return derived.describe(sources.revisions[derived.sourceId] ?? null)

  const inContext = sources.topDown?.forComponent(component.id)
  if (inContext && inContext.references.length > 0) {
    return inContext.describe(sources.resolveGeometry)
  }

  return null
}
