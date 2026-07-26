import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import type { Feature } from '../features/domain/Feature'
import { FeatureType } from '../features/domain/FeatureType'
import type { FeatureTree } from '../features/FeatureTree'
import './FeatureTreePanel.css'

/** The glyph each feature kind wears in the tree, in place of an icon set. */
const ICONS: Record<FeatureType, string> = {
  [FeatureType.Extrude]: '▣',
  [FeatureType.Revolve]: '◐',
  [FeatureType.Sweep]: '⌒',
  [FeatureType.Loft]: '◇',
  [FeatureType.CutExtrude]: '▨',
  [FeatureType.CutRevolve]: '◑',
  [FeatureType.CutSweep]: '⌒',
  [FeatureType.CutLoft]: '◈',
  [FeatureType.Fillet]: '◜',
  [FeatureType.Chamfer]: '◺',
  [FeatureType.Shell]: '⬚',
  [FeatureType.Hole]: '◎',
  [FeatureType.Rib]: '⊥',
  [FeatureType.Draft]: '◿',
  [FeatureType.Pattern]: '⁙',
  [FeatureType.Mirror]: '⇄',
  [FeatureType.Scale]: '⤢',
  [FeatureType.Combine]: '⊕',
  [FeatureType.Split]: '⊘',
  [FeatureType.DirectEdit]: '✥',
  [FeatureType.BaseFlange]: '⬓',
  [FeatureType.EdgeFlange]: '⌐',
  [FeatureType.MiterFlange]: '◣',
  [FeatureType.Hem]: '⊃',
  [FeatureType.Jog]: '⌇',
  [FeatureType.Unfold]: '▭',
  [FeatureType.Refold]: '▧',
  [FeatureType.ExtrudeSurface]: '▱',
  [FeatureType.RevolveSurface]: '◠',
  [FeatureType.SweepSurface]: '∫',
  [FeatureType.LoftSurface]: '◇',
  [FeatureType.BoundarySurface]: '⬡',
  [FeatureType.RuledSurface]: '≣',
  [FeatureType.PatchSurface]: '⬠',
  [FeatureType.OffsetSurface]: '⧅',
  [FeatureType.ExtendSurface]: '⇥',
  [FeatureType.TrimSurface]: '✂',
  [FeatureType.UntrimSurface]: '↺',
  [FeatureType.KnitSurface]: '⧓',
  [FeatureType.SplitSurface]: '⧗',
  [FeatureType.ThickenSurface]: '▤',
  [FeatureType.StitchSurface]: '⧉',
}

/** The icon a feature row shows. Exported so the properties panel matches it. */
export function featureIcon(type: FeatureType): string {
  return ICONS[type]
}

export interface FeatureTreePanelProps {
  readonly tree: FeatureTree
  readonly selectedFeatureId?: string | null
  readonly onSelect?: (featureId: string | null) => void
  /** Asked for when a row is dropped somewhere the tree accepts it. */
  readonly onReorder?: (featureId: string, newIndex: number) => void
  readonly onToggleSuppress?: (featureId: string) => void
  readonly onDelete?: (featureId: string) => void
  readonly onRename?: (featureId: string, name: string) => void
  readonly onRollBarChange?: (index: number) => void
  /** Fired by "Edit Parameters", which the editor turns into a panel focus. */
  readonly onEditParameters?: (featureId: string) => void
}

interface MenuState {
  readonly featureId: string
  readonly x: number
  readonly y: number
}

/**
 * The modelling history, as a list you can reorder, suppress, roll back and
 * rename. Everything it does is asked of the caller — the panel never mutates
 * the tree itself, so the editor stays the single place a rebuild is triggered.
 */
export function FeatureTreePanel({
  tree,
  selectedFeatureId = null,
  onSelect,
  onReorder,
  onToggleSuppress,
  onDelete,
  onRename,
  onRollBarChange,
  onEditParameters,
}: FeatureTreePanelProps): React.ReactElement {
  const features = tree.features
  const draggedId = useRef<string | null>(null)

  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<readonly string[]>([])
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  // Hovering a feature lights up everything that would rebuild with it.
  const highlighted = useMemo(
    () => new Set(hoveredId ? tree.getDependents(hoveredId).map((child) => child.id) : []),
    [hoveredId, tree],
  )

  const closeMenu = useCallback(() => setMenu(null), [])

  const handleDrop = useCallback(
    (targetIndex: number) => {
      const featureId = draggedId.current
      draggedId.current = null
      setDropIndex(null)
      if (!featureId) return
      if (tree.validateDependencies(featureId, targetIndex)) onReorder?.(featureId, targetIndex)
    },
    [onReorder, tree],
  )

  const commitRename = useCallback(
    (featureId: string, name: string) => {
      setRenaming(null)
      if (name.trim().length > 0) onRename?.(featureId, name)
    },
    [onRename],
  )

  return (
    <div className="feature-tree" onClick={closeMenu}>
      <div className="feature-tree__header">
        <h2 className="feature-tree__title">Feature Tree</h2>
        <span className="feature-tree__count">{features.length}</span>
      </div>

      {features.length === 0 ? (
        <p className="feature-tree__empty">No features yet.</p>
      ) : (
        <ol className="feature-tree__list" aria-label="Feature tree">
          {features.map((feature, index) => (
            <Fragment key={feature.id}>
              {index === tree.rollBarIndex ? <RollBar tree={tree} /> : null}
              <FeatureRow
              feature={feature}
              index={index}
              tree={tree}
              rolledBack={index >= tree.rollBarIndex}
              selected={feature.id === selectedFeatureId}
              dependent={highlighted.has(feature.id)}
              dropTarget={dropIndex === index}
              expanded={expandedIds.includes(feature.id)}
              renaming={renaming === feature.id}
              onSelect={() => onSelect?.(feature.id)}
              onHover={setHoveredId}
              onToggleExpand={() =>
                setExpandedIds((current) =>
                  current.includes(feature.id)
                    ? current.filter((id) => id !== feature.id)
                    : [...current, feature.id],
                )
              }
              onContextMenu={(x, y) => setMenu({ featureId: feature.id, x, y })}
              onDragStart={() => {
                draggedId.current = feature.id
              }}
              onDragOver={() => setDropIndex(index)}
              onDrop={() => handleDrop(index)}
              onRenameCommit={(name) => commitRename(feature.id, name)}
              onRenameCancel={() => setRenaming(null)}
              />
            </Fragment>
          ))}
          {tree.rollBarIndex >= features.length ? <RollBar tree={tree} /> : null}
        </ol>
      )}

      <label className="feature-tree__slider">
        <span>History</span>
        <input
          type="range"
          aria-label="Roll bar position"
          min={0}
          max={features.length}
          step={1}
          value={tree.rollBarIndex}
          onChange={(event) => onRollBarChange?.(Number(event.target.value))}
        />
      </label>

      {menu ? (
        <ContextMenu
          state={menu}
          feature={tree.requireFeature(menu.featureId)}
          onEditParameters={() => {
            onSelect?.(menu.featureId)
            onEditParameters?.(menu.featureId)
            closeMenu()
          }}
          onToggleSuppress={() => {
            onToggleSuppress?.(menu.featureId)
            closeMenu()
          }}
          onDelete={() => {
            onDelete?.(menu.featureId)
            closeMenu()
          }}
          onRename={() => {
            setRenaming(menu.featureId)
            closeMenu()
          }}
        />
      ) : null}
    </div>
  )
}

/** The line between the features that are built and the ones rolled back. */
function RollBar({ tree }: { readonly tree: FeatureTree }): React.ReactElement {
  return (
    <li className="feature-tree__rollbar" data-testid="roll-bar" data-index={tree.rollBarIndex}>
      <span className="feature-tree__rollbar-line" />
      <span className="feature-tree__rollbar-label">
        {tree.rollBarIndex} of {tree.length}
      </span>
    </li>
  )
}

interface FeatureRowProps {
  readonly feature: Feature
  readonly index: number
  readonly tree: FeatureTree
  readonly rolledBack: boolean
  readonly selected: boolean
  readonly dependent: boolean
  readonly dropTarget: boolean
  readonly expanded: boolean
  readonly renaming: boolean
  readonly onSelect: () => void
  readonly onHover: (featureId: string | null) => void
  readonly onToggleExpand: () => void
  readonly onContextMenu: (x: number, y: number) => void
  readonly onDragStart: () => void
  readonly onDragOver: () => void
  readonly onDrop: () => void
  readonly onRenameCommit: (name: string) => void
  readonly onRenameCancel: () => void
}

function FeatureRow({
  feature,
  index,
  tree,
  rolledBack,
  selected,
  dependent,
  dropTarget,
  expanded,
  renaming,
  onSelect,
  onHover,
  onToggleExpand,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onRenameCommit,
  onRenameCancel,
}: FeatureRowProps): React.ReactElement {
  const children = feature.childFeatureIds
    .map((id) => tree.getFeature(id))
    .filter((child): child is Feature => child !== undefined)

  const classes = [
    'feature-row',
    selected ? 'feature-row--selected' : '',
    rolledBack ? 'feature-row--rolled-back' : '',
    dependent ? 'feature-row--dependent' : '',
    dropTarget ? 'feature-row--drop-target' : '',
    `feature-row--${feature.status}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={classes}
      data-feature-id={feature.id}
      data-index={index}
      data-status={feature.status}
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      onMouseEnter={() => onHover(feature.id)}
      onMouseLeave={() => onHover(null)}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu(event.clientX, event.clientY)
      }}
    >
      <div className="feature-row__main">
        {children.length > 0 ? (
          <button
            type="button"
            className="feature-row__disclosure"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${feature.name}`}
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="feature-row__disclosure feature-row__disclosure--leaf" />
        )}

        <span className="feature-row__icon" aria-hidden="true">
          {featureIcon(feature.featureType)}
        </span>

        {renaming ? (
          <input
            className="feature-row__rename"
            aria-label={`Rename ${feature.name}`}
            defaultValue={feature.name}
            autoFocus
            onBlur={(event) => onRenameCommit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onRenameCommit(event.currentTarget.value)
              if (event.key === 'Escape') onRenameCancel()
            }}
          />
        ) : (
          <button
            type="button"
            className="feature-row__name"
            aria-pressed={selected}
            onClick={onSelect}
          >
            {feature.name}
          </button>
        )}

        <span
          className={`feature-row__status feature-row__status--${feature.status}`}
          title={feature.errorMessage ?? feature.status}
          aria-label={`${feature.name} is ${feature.status}`}
        />
      </div>

      {feature.errorMessage ? (
        <p className="feature-row__error">{feature.errorMessage}</p>
      ) : null}

      {expanded && children.length > 0 ? (
        <ul className="feature-row__children">
          {children.map((child) => (
            <li key={child.id} className="feature-row__child">
              <span aria-hidden="true">{featureIcon(child.featureType)}</span> {child.name}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

interface ContextMenuProps {
  readonly state: MenuState
  readonly feature: Feature
  readonly onEditParameters: () => void
  readonly onToggleSuppress: () => void
  readonly onDelete: () => void
  readonly onRename: () => void
}

function ContextMenu({
  state,
  feature,
  onEditParameters,
  onToggleSuppress,
  onDelete,
  onRename,
}: ContextMenuProps): React.ReactElement {
  return (
    <ul
      className="feature-menu"
      role="menu"
      aria-label={`${feature.name} actions`}
      style={{ left: state.x, top: state.y }}
    >
      <li>
        <button type="button" role="menuitem" onClick={onEditParameters}>
          Edit Parameters
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onToggleSuppress}>
          {feature.suppressed ? 'Unsuppress' : 'Suppress'}
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onRename}>
          Rename
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
