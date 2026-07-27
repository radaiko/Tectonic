import { useMemo, useState } from 'react'
import type { Feature } from '../features/domain/Feature'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { PartStudio, StudioPart, SketchUsage } from './PartStudio'
import './PartStudioEditor.css'

/**
 * The studio panel: parts down one side, the shared sketch pool down the other.
 *
 * The thing a Part Studio has to answer that a single-part document never does
 * is "who else is reading this?". Selecting a sketch highlights every part and
 * every feature that consumes it; selecting a part highlights the sketches it
 * reads. The highlight is the whole point of the panel, so it is derived here
 * rather than pushed in as state by the caller.
 */

export interface PartStudioEditorProps {
  readonly studio: PartStudio
  readonly selectedPartId?: string | null
  readonly selectedSketchId?: string | null
  readonly onSelectPart?: (partId: string) => void
  readonly onSelectSketch?: (sketchId: string | null) => void
  /** Fired with the part's new visibility. */
  readonly onToggleVisibility?: (partId: string, visible: boolean) => void
  readonly onIsolatePart?: (partId: string) => void
  readonly onShowAll?: () => void
  readonly onAddPart?: () => void
  readonly onAddSketch?: () => void
  readonly onSelectFeature?: (partId: string, featureId: string) => void
}

export function PartStudioEditor({
  studio,
  selectedPartId = null,
  selectedSketchId = null,
  onSelectPart,
  onSelectSketch,
  onToggleVisibility,
  onIsolatePart,
  onShowAll,
  onAddPart,
  onAddSketch,
  onSelectFeature,
}: PartStudioEditorProps): React.ReactElement {
  // Hovering a sketch previews the same highlight a selection gives, so the
  // reference picture is readable without committing to a selection.
  const [hoveredSketchId, setHoveredSketchId] = useState<string | null>(null)
  const focusSketchId = hoveredSketchId ?? selectedSketchId

  const usage = useMemo(() => studio.sketchUsage(), [studio])
  const usageById = useMemo(
    () => new Map(usage.map((entry) => [entry.sketchId, entry] as const)),
    [usage],
  )

  const focused = focusSketchId === null ? undefined : usageById.get(focusSketchId)
  const highlightedPartIds = new Set(focused?.partIds ?? [])
  const sketchesOfSelectedPart = new Set(
    selectedPartId === null ? [] : (studio.getPart(selectedPartId)?.sketchIds ?? []),
  )

  return (
    <div className="part-studio">
      <section className="part-studio__column" aria-label="Parts">
        <header className="part-studio__header">
          <h2 className="part-studio__title">Parts ({studio.partCount})</h2>
          <span>
            {onShowAll ? (
              <button type="button" className="part-studio__action" onClick={onShowAll}>
                Show all
              </button>
            ) : null}
            {onAddPart ? (
              <button type="button" className="part-studio__action" onClick={onAddPart}>
                New part
              </button>
            ) : null}
          </span>
        </header>

        {studio.partCount === 0 ? (
          <p className="part-studio__empty">This studio has no parts yet.</p>
        ) : (
          <ul className="part-studio__list" aria-label="Studio parts">
            {studio.parts.map((part) => (
              <PartRow
                key={part.id}
                part={part}
                studio={studio}
                selected={part.id === selectedPartId}
                highlighted={highlightedPartIds.has(part.id)}
                highlightSketchId={focusSketchId}
                onSelect={() => onSelectPart?.(part.id)}
                onToggleVisibility={() => onToggleVisibility?.(part.id, !part.visible)}
                onIsolate={onIsolatePart ? () => onIsolatePart(part.id) : undefined}
                onSelectFeature={
                  onSelectFeature
                    ? (featureId: string) => onSelectFeature(part.id, featureId)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="part-studio__column" aria-label="Shared sketches">
        <header className="part-studio__header">
          <h2 className="part-studio__title">Sketches ({studio.sketchCount})</h2>
          {onAddSketch ? (
            <button type="button" className="part-studio__action" onClick={onAddSketch}>
              New sketch
            </button>
          ) : null}
        </header>

        {studio.sketchCount === 0 ? (
          <p className="part-studio__empty">This studio has no sketches yet.</p>
        ) : (
          <ul className="part-studio__list" aria-label="Studio sketches">
            {studio.sketches.map((sketch) => (
              <SketchRow
                key={sketch.id}
                sketch={sketch}
                usage={usageById.get(sketch.id)}
                studio={studio}
                selected={sketch.id === selectedSketchId}
                highlighted={sketchesOfSelectedPart.has(sketch.id)}
                onSelect={() =>
                  onSelectSketch?.(sketch.id === selectedSketchId ? null : sketch.id)
                }
                onHover={(hovering) => setHoveredSketchId(hovering ? sketch.id : null)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface PartRowProps {
  readonly part: StudioPart
  readonly studio: PartStudio
  readonly selected: boolean
  readonly highlighted: boolean
  readonly highlightSketchId: string | null
  readonly onSelect: () => void
  readonly onToggleVisibility: () => void
  readonly onIsolate: (() => void) | undefined
  readonly onSelectFeature: ((featureId: string) => void) | undefined
}

function PartRow({
  part,
  studio,
  selected,
  highlighted,
  highlightSketchId,
  onSelect,
  onToggleVisibility,
  onIsolate,
  onSelectFeature,
}: PartRowProps): React.ReactElement {
  const classes = [
    'studio-part',
    selected ? 'studio-part--selected' : '',
    highlighted ? 'studio-part--highlighted' : '',
    part.visible ? '' : 'studio-part--hidden',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={classes} data-part-id={part.id} data-visible={part.visible}>
      <div className="studio-part__row">
        <button
          type="button"
          className="studio-part__visibility"
          aria-label={`${part.visible ? 'Hide' : 'Show'} ${part.name}`}
          aria-pressed={part.visible}
          onClick={onToggleVisibility}
        >
          <span aria-hidden="true">{part.visible ? '👁' : '◌'}</span>
        </button>

        {part.color ? (
          <span
            className="studio-part__swatch"
            style={{ background: part.color }}
            aria-hidden="true"
          />
        ) : null}

        <button
          type="button"
          className="studio-part__name"
          aria-pressed={selected}
          onClick={onSelect}
          onDoubleClick={onIsolate}
        >
          {part.name}
        </button>

        <span className="studio-part__count">{part.tree.length}</span>
      </div>

      {selected ? (
        <ul className="studio-part__tree" aria-label={`${part.name} features`}>
          {part.tree.features.map((feature, index) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              sketchName={sketchNameOf(studio, feature)}
              rolledBack={index >= part.tree.rollBarIndex}
              highlighted={
                highlightSketchId !== null && feature.sketchId === highlightSketchId
              }
              onSelect={onSelectFeature ? () => onSelectFeature(feature.id) : undefined}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

interface FeatureRowProps {
  readonly feature: Feature
  readonly sketchName: string | null
  readonly rolledBack: boolean
  readonly highlighted: boolean
  readonly onSelect: (() => void) | undefined
}

function FeatureRow({
  feature,
  sketchName,
  rolledBack,
  highlighted,
  onSelect,
}: FeatureRowProps): React.ReactElement {
  const classes = [
    'studio-feature',
    rolledBack ? 'studio-feature--rolled-back' : '',
    feature.status === 'suppressed' ? 'studio-feature--suppressed' : '',
    feature.status === 'error' ? 'studio-feature--error' : '',
    highlighted ? 'studio-feature--highlighted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={classes} data-feature-id={feature.id} data-status={feature.status}>
      <button
        type="button"
        className="studio-feature__name"
        onClick={onSelect}
        title={feature.errorMessage ?? undefined}
      >
        {feature.name}
      </button>
      {sketchName ? <span className="studio-feature__sketch">↳ {sketchName}</span> : null}
    </li>
  )
}

interface SketchRowProps {
  readonly sketch: SketchModel
  readonly usage: SketchUsage | undefined
  readonly studio: PartStudio
  readonly selected: boolean
  readonly highlighted: boolean
  readonly onSelect: () => void
  readonly onHover: (hovering: boolean) => void
}

function SketchRow({
  sketch,
  usage,
  studio,
  selected,
  highlighted,
  onSelect,
  onHover,
}: SketchRowProps): React.ReactElement {
  const partIds = usage?.partIds ?? []
  const names = partIds
    .map((partId) => studio.getPart(partId)?.name)
    .filter((name): name is string => name !== undefined)

  const classes = [
    'studio-sketch',
    selected ? 'studio-sketch--selected' : '',
    highlighted ? 'studio-sketch--highlighted' : '',
    partIds.length === 0 ? 'studio-sketch--unused' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={classes}
      data-sketch-id={sketch.id}
      data-users={partIds.length}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        type="button"
        className="studio-sketch__name"
        aria-pressed={selected}
        onClick={onSelect}
      >
        {sketch.name}
      </button>
      <span className="studio-sketch__plane">{sketch.plane}</span>
      {usage?.shared ? <span className="studio-sketch__badge">shared</span> : null}
      <span className="studio-sketch__users">{describeUsers(names)}</span>
    </li>
  )
}

/** "unused", "Bracket", or "Bracket, Cover" — what reads this sketch. */
export function describeUsers(names: readonly string[]): string {
  if (names.length === 0) return 'unused'
  return names.join(', ')
}

function sketchNameOf(studio: PartStudio, feature: Feature): string | null {
  if (feature.sketchId === null) return null
  return studio.getSketch(feature.sketchId)?.name ?? 'missing sketch'
}
