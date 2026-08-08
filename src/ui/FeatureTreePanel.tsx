import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import type { Feature } from '../features/domain/Feature'
import type { FeatureType } from '../features/domain/FeatureType'
import type { TimelineEntry } from '../features/domain/timeline'
import { buildTimeline, isRolledBack, rollBarPosition } from '../features/domain/timeline'
import type { FeatureTree } from '../features/FeatureTree'
import type { SketchModel } from '../sketch/domain/SketchModel'
import { describeSupport } from '../sketch/domain/SketchSupport'
import { featureIconName } from './featureIcons'
import type { IconName } from './Icon'
import { Icon } from './Icon'
import './FeatureTreePanel.css'

/**
 * The icon a feature row shows.
 *
 * Re-exported from the shared map rather than kept here, so the tree, the ribbon
 * and the inspector cannot end up drawing three different pictures of an
 * extrude. The name is kept for the callers that already had it.
 */
export function featureIcon(type: FeatureType): IconName {
  return featureIconName(type)
}

export interface FeatureTreePanelProps {
  readonly tree: FeatureTree
  /**
   * The document's sketches, shown in history order among the features.
   *
   * Left out, the panel is the feature-only list it has always been — which is
   * what keeps it usable from anywhere that has a tree and no sketches.
   */
  readonly sketches?: readonly SketchModel[]
  readonly selectedFeatureId?: string | null
  readonly selectedSketchId?: string | null
  readonly onSelect?: (featureId: string | null) => void
  /** Asked for when a sketch row is chosen — the editor opens it for drawing. */
  readonly onSelectSketch?: (sketchId: string) => void
  readonly onRenameSketch?: (sketchId: string, name: string) => void
  readonly onToggleSketchVisibility?: (sketchId: string) => void
  /** Asked for when a row is dropped somewhere the tree accepts it. */
  readonly onReorder?: (featureId: string, newIndex: number) => void
  /**
   * Asked for when a row is dropped somewhere the tree will not take it, with
   * the features that stand in the way. A refused drag used to simply do
   * nothing, which is indistinguishable from a drag that missed.
   */
  readonly onReorderRefused?: (featureId: string, blockedBy: readonly string[]) => void
  readonly onToggleSuppress?: (featureId: string) => void
  readonly onDelete?: (featureId: string) => void
  readonly onRename?: (featureId: string, name: string) => void
  readonly onRollBarChange?: (index: number) => void
  /** Fired by "Edit Parameters", which the editor turns into a panel focus. */
  readonly onEditParameters?: (featureId: string) => void
  /**
   * Whether to draw the panel's own title and count.
   *
   * Rendered inside the browser it is a collapsible section that already has
   * both, and two headings reading "History" one above the other is the kind of
   * duplication that comes from composing components without looking at the
   * result. Rendered on its own — which is how it is tested, and how any surface
   * without the shell around it would use it — the header is what names it.
   */
  readonly showHeader?: boolean
}

interface MenuState {
  /** The row the menu belongs to — a feature id, or a sketch id when `sketch`. */
  readonly featureId: string
  readonly sketch: boolean
  readonly x: number
  readonly y: number
}

const NO_SKETCHES: readonly SketchModel[] = []

/**
 * The modelling history, as a list you can reorder, suppress, roll back and
 * rename. Everything it does is asked of the caller — the panel never mutates
 * the tree itself, so the editor stays the single place a rebuild is triggered.
 */
export function FeatureTreePanel({
  tree,
  sketches = NO_SKETCHES,
  selectedFeatureId = null,
  selectedSketchId = null,
  onSelect,
  onSelectSketch,
  onRenameSketch,
  onToggleSketchVisibility,
  onReorder,
  onReorderRefused,
  onToggleSuppress,
  onDelete,
  onRename,
  onRollBarChange,
  onEditParameters,
  showHeader = true,
}: FeatureTreePanelProps): React.ReactElement {
  const features = tree.features
  const draggedId = useRef<string | null>(null)

  // The two lists as one history, rebuilt every render.
  //
  // Deliberately not memoized on `tree` and `sketches`: both are mutated in place
  // and handed back under the same identity, with a revision counter above forcing
  // the re-render, so a dependency list naming them would never invalidate and the
  // panel would draw the history as it stood on first mount. Walking the two lists
  // is cheap, and reading them live is what the rest of this panel already does.
  const timeline = buildTimeline(tree, sketches)
  const barPosition = rollBarPosition(timeline, tree.rollBarIndex)

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
      if (tree.validateDependencies(featureId, targetIndex)) {
        onReorder?.(featureId, targetIndex)
        return
      }
      // The move would put this feature in front of something it is built on.
      // Naming those is what turns a drag that "did nothing" into an answer.
      onReorderRefused?.(
        featureId,
        blockingParents(tree, featureId, targetIndex).map((parent) => parent.name),
      )
    },
    [onReorder, onReorderRefused, tree],
  )

  // Not memoized: both are only ever reached through a fresh inline arrow at the
  // row, so a stable identity here would be handed to a new closure regardless.
  const commitRename = (featureId: string, name: string): void => {
    setRenaming(null)
    if (name.trim().length > 0) onRename?.(featureId, name)
  }

  const commitSketchRename = (sketchId: string, name: string): void => {
    setRenaming(null)
    if (name.trim().length > 0) onRenameSketch?.(sketchId, name)
  }

  return (
    <div className="feature-tree" onClick={closeMenu}>
      {showHeader ? (
        <div className="feature-tree__header">
          <h2 className="feature-tree__title">History</h2>
          <span className="feature-tree__count">{timeline.length}</span>
        </div>
      ) : null}

      {timeline.length === 0 ? (
        <p className="feature-tree__empty">Nothing modelled yet.</p>
      ) : (
        <ol className="feature-tree__list" aria-label="Feature tree">
          {timeline.map((entry) => (
            <Fragment key={`${entry.kind}-${entry.id}`}>
              {entry.position === barPosition ? <RollBar tree={tree} /> : null}
              {entry.kind === 'sketch' ? (
                <SketchRow
                  entry={entry}
                  rolledBack={isRolledBack(timeline, entry, tree.rollBarIndex)}
                  selected={entry.id === selectedSketchId}
                  renaming={renaming === entry.id}
                  onSelect={() => onSelectSketch?.(entry.id)}
                  onToggleVisibility={() => onToggleSketchVisibility?.(entry.id)}
                  onContextMenu={(x, y) => setMenu({ featureId: entry.id, sketch: true, x, y })}
                  onRenameCommit={(name) => commitSketchRename(entry.id, name)}
                  onRenameCancel={() => setRenaming(null)}
                />
              ) : (
                <FeatureRow
                  feature={entry.feature}
                  index={entry.featureIndex}
                  tree={tree}
                  rolledBack={isRolledBack(timeline, entry, tree.rollBarIndex)}
                  selected={entry.id === selectedFeatureId}
                  dependent={highlighted.has(entry.id)}
                  dropTarget={dropIndex === entry.featureIndex}
                  expanded={expandedIds.includes(entry.id)}
                  renaming={renaming === entry.id}
                  onSelect={() => onSelect?.(entry.id)}
                  onHover={setHoveredId}
                  onToggleExpand={() =>
                    setExpandedIds((current) =>
                      current.includes(entry.id)
                        ? current.filter((id) => id !== entry.id)
                        : [...current, entry.id],
                    )
                  }
                  onContextMenu={(x, y) => setMenu({ featureId: entry.id, sketch: false, x, y })}
                  onDragStart={() => {
                    draggedId.current = entry.id
                  }}
                  onDragOver={() => setDropIndex(entry.featureIndex)}
                  onDrop={() => handleDrop(entry.featureIndex)}
                  onRenameCommit={(name) => commitRename(entry.id, name)}
                  onRenameCancel={() => setRenaming(null)}
                />
              )}
            </Fragment>
          ))}
          {barPosition >= timeline.length ? <RollBar tree={tree} /> : null}
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

      {menu?.sketch ? (
        <SketchMenu
          state={menu}
          sketch={sketches.find((entry) => entry.id === menu.featureId) as SketchModel}
          onOpen={() => {
            onSelectSketch?.(menu.featureId)
            closeMenu()
          }}
          onToggleVisibility={() => {
            onToggleSketchVisibility?.(menu.featureId)
            closeMenu()
          }}
          onRename={() => {
            setRenaming(menu.featureId)
            closeMenu()
          }}
        />
      ) : menu ? (
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

/**
 * The features that would end up behind `featureId` if it moved to `targetIndex`,
 * despite it being built on them.
 *
 * Recomputed here rather than returned by the tree's own check: the check
 * answers yes or no for the whole block, and what a refused drag needs to say is
 * *which* feature it ran into.
 */
function blockingParents(
  tree: FeatureTree,
  featureId: string,
  targetIndex: number,
): Feature[] {
  const moving = new Set([featureId, ...tree.getDependents(featureId).map((child) => child.id)])
  const rest = tree.features.filter((feature) => !moving.has(feature.id))
  const target = Math.max(0, Math.min(targetIndex, rest.length))

  const blocking: Feature[] = []
  for (const id of moving) {
    const feature = tree.getFeature(id)
    if (!feature) continue
    for (const parentId of feature.parentFeatureIds) {
      if (moving.has(parentId)) continue
      const position = rest.findIndex((candidate) => candidate.id === parentId)
      const parent = position >= target ? rest[position] : undefined
      if (parent && !blocking.includes(parent)) blocking.push(parent)
    }
  }
  return blocking
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

interface SketchRowProps {
  readonly entry: Extract<TimelineEntry, { kind: 'sketch' }>
  readonly rolledBack: boolean
  readonly selected: boolean
  readonly renaming: boolean
  readonly onSelect: () => void
  readonly onToggleVisibility: () => void
  readonly onContextMenu: (x: number, y: number) => void
  readonly onRenameCommit: (name: string) => void
  readonly onRenameCancel: () => void
}

/**
 * A sketch in the history.
 *
 * Deliberately not draggable, and with no suppress in its menu. Its place in the
 * order is derived from the feature that consumes it rather than stored, so there
 * is nothing for a drag to move; and a sketch has no build step to skip, so
 * suppressing one would mean nothing. Offering either would be a control that
 * appears to do something and does not. What it does have is what a sketch can
 * actually be: opened, renamed, shown or hidden.
 */
function SketchRow({
  entry,
  rolledBack,
  selected,
  renaming,
  onSelect,
  onToggleVisibility,
  onContextMenu,
  onRenameCommit,
  onRenameCancel,
}: SketchRowProps): React.ReactElement {
  const sketch = entry.sketch
  const classes = [
    'feature-row',
    'feature-row--sketch',
    selected ? 'feature-row--selected' : '',
    rolledBack ? 'feature-row--rolled-back' : '',
    sketch.visible ? '' : 'feature-row--hidden',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={classes}
      data-sketch-id={sketch.id}
      data-position={entry.position}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu(event.clientX, event.clientY)
      }}
    >
      <div className="feature-row__main">
        <span className="feature-row__disclosure feature-row__disclosure--leaf" />

        <Icon name="sketch" size={13} className="feature-row__icon" />

        {renaming ? (
          <input
            className="feature-row__rename"
            aria-label={`Rename ${sketch.name}`}
            defaultValue={sketch.name}
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
            {sketch.name}
          </button>
        )}

        <button
          type="button"
          className="feature-row__visibility"
          aria-pressed={sketch.visible}
          aria-label={`${sketch.visible ? 'Hide' : 'Show'} ${sketch.name}`}
          onClick={onToggleVisibility}
        >
          <Icon name={sketch.visible ? 'eye' : 'eye-off'} size={13} />
        </button>
      </div>

      <p className="feature-row__support">{describeSupport(sketch.support)}</p>
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
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
          </button>
        ) : (
          <span className="feature-row__disclosure feature-row__disclosure--leaf" />
        )}

        <Icon
          name={feature.suppressed ? 'suppressed' : featureIcon(feature.featureType)}
          size={13}
          className="feature-row__icon"
        />

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
              <Icon name={featureIcon(child.featureType)} size={12} /> {child.name}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

interface SketchMenuProps {
  readonly state: MenuState
  readonly sketch: SketchModel
  readonly onOpen: () => void
  readonly onToggleVisibility: () => void
  readonly onRename: () => void
}

/** A sketch's actions. Deleting one is the sketch list's business, not history's. */
function SketchMenu({
  state,
  sketch,
  onOpen,
  onToggleVisibility,
  onRename,
}: SketchMenuProps): React.ReactElement {
  return (
    <ul
      className="feature-menu"
      role="menu"
      aria-label={`${sketch.name} actions`}
      style={{ left: state.x, top: state.y }}
    >
      <li>
        <button type="button" role="menuitem" onClick={onOpen}>
          Edit Sketch
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onToggleVisibility}>
          {sketch.visible ? 'Hide' : 'Show'}
        </button>
      </li>
      <li>
        <button type="button" role="menuitem" onClick={onRename}>
          Rename
        </button>
      </li>
    </ul>
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
