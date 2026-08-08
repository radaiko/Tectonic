import type { FeatureTree } from '../features/FeatureTree'
import { buildTimeline, isRolledBack, rollBarPosition } from '../features/domain/timeline'
import type { SketchModel } from '../sketch/domain/SketchModel'
import { featureIconName } from './featureIcons'
import { Icon } from './Icon'
import { IconButton } from './shell'
import './TimelineBar.css'

/**
 * The build, read left to right along the bottom of the window.
 *
 * The browser already holds this list, so why draw it twice? Because they answer
 * different questions. The browser is where a feature is renamed, reordered,
 * suppressed or deleted — it is a place you go to work. The strip is a place you
 * glance at: how many steps is this part, where is the roll bar, which one is
 * red. Keeping it to one row of icons is what makes that glance cheap, and
 * collapsing it is what makes the viewport bigger when you do not want it.
 *
 * Both are driven by the same {@link buildTimeline}, so they cannot disagree
 * about the order things happened in.
 */
export interface TimelineBarProps {
  readonly tree: FeatureTree
  readonly sketches: readonly SketchModel[]
  readonly selectedFeatureId: string | null
  readonly selectedSketchId: string | null
  readonly onSelectFeature: (featureId: string) => void
  readonly onSelectSketch: (sketchId: string) => void
  readonly collapsed: boolean
  readonly onToggleCollapsed: () => void
}

export function TimelineBar({
  tree,
  sketches,
  selectedFeatureId,
  selectedSketchId,
  onSelectFeature,
  onSelectSketch,
  collapsed,
  onToggleCollapsed,
}: TimelineBarProps): React.ReactElement {
  // Deliberately not memoised: the tree and the sketches are mutated in place
  // and handed back under the same identity, so a dependency list naming them
  // would never invalidate and the strip would show the build as it stood on
  // first mount. Walking two short lists every render is the cheaper mistake.
  const timeline = buildTimeline(tree, sketches)
  const barPosition = rollBarPosition(timeline, tree.rollBarIndex)

  return (
    <div className={`timeline${collapsed ? ' timeline--collapsed' : ''}`}>
      <IconButton
        size="sm"
        icon={collapsed ? 'chevron-right' : 'chevron-down'}
        label={collapsed ? 'Expand the timeline' : 'Collapse the timeline'}
        active={!collapsed}
        onClick={onToggleCollapsed}
      />
      <span className="timeline__label">Timeline</span>

      {collapsed ? (
        <span className="timeline__summary">
          {timeline.length} {timeline.length === 1 ? 'step' : 'steps'}
        </span>
      ) : timeline.length === 0 ? (
        <span className="timeline__summary">Nothing modelled yet.</span>
      ) : (
        <ol className="timeline__list" aria-label="Timeline">
          {timeline.map((entry) => {
            const rolledBack = isRolledBack(timeline, entry, tree.rollBarIndex)
            const marker = entry.position === barPosition

            if (entry.kind === 'sketch') {
              return (
                <li className="timeline__slot" key={`sketch-${entry.id}`}>
                  {marker ? <RollMark /> : null}
                  <button
                    type="button"
                    className={stepClasses({
                      selected: entry.id === selectedSketchId,
                      rolledBack,
                      hidden: !entry.sketch.visible,
                    })}
                    aria-pressed={entry.id === selectedSketchId}
                    title={`${entry.sketch.name} — open for drawing`}
                    onClick={() => onSelectSketch(entry.id)}
                  >
                    <Icon name="sketch" size={15} />
                    <span className="visually-hidden">{entry.sketch.name}</span>
                  </button>
                </li>
              )
            }

            const feature = entry.feature
            return (
              <li className="timeline__slot" key={`feature-${entry.id}`}>
                {marker ? <RollMark /> : null}
                <button
                  type="button"
                  className={stepClasses({
                    selected: entry.id === selectedFeatureId,
                    rolledBack,
                    status: feature.status,
                    suppressed: feature.suppressed,
                  })}
                  aria-pressed={entry.id === selectedFeatureId}
                  title={
                    feature.errorMessage
                      ? `${feature.name} — ${feature.errorMessage}`
                      : feature.name
                  }
                  onClick={() => onSelectFeature(entry.id)}
                >
                  <Icon
                    name={feature.suppressed ? 'suppressed' : featureIconName(feature.featureType)}
                    size={15}
                  />
                  <span className="visually-hidden">{feature.name}</span>
                </button>
              </li>
            )
          })}
          {barPosition >= timeline.length ? (
            <li className="timeline__slot">
              <RollMark />
            </li>
          ) : null}
        </ol>
      )}
    </div>
  )
}

/** Where the build currently stops. Everything after it is rolled back. */
function RollMark(): React.ReactElement {
  return <span className="timeline__rollbar" aria-hidden="true" />
}

function stepClasses(state: {
  readonly selected: boolean
  readonly rolledBack: boolean
  readonly hidden?: boolean
  readonly suppressed?: boolean
  readonly status?: string
}): string {
  return [
    'timeline__step',
    state.selected ? 'timeline__step--selected' : '',
    state.rolledBack ? 'timeline__step--rolled-back' : '',
    state.hidden ? 'timeline__step--hidden' : '',
    state.suppressed ? 'timeline__step--suppressed' : '',
    state.status === 'error' ? 'timeline__step--error' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
