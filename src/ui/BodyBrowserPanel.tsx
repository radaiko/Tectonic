import { useMemo } from 'react'
import type { Body, Part } from '../domain/Document'
import { triangleCount } from '../domain/MeshData'
import type { SelectionItem } from '../view/selection'
import { EMPTY_SELECTION, applyPick, selectionIncludes } from '../view/selection'
import { Icon } from './Icon'
import { IconButton } from './shell'
import './BodyBrowserPanel.css'

/**
 * What the document currently holds, as solids rather than as history.
 *
 * The feature tree answers "how was this built"; this answers "what is there
 * now" — which is the question you have when you want to point a shell at one
 * body of several, or to find out which feature produced the thing you are
 * looking at. Both halves are shown: the bodies features produced, each under
 * the feature that last wrote it, and the bodies the file arrived holding,
 * under their part.
 *
 * Selecting here writes the same {@link SelectionItem} a viewport click does, so
 * a body picked in the list fills a feature's body field exactly as one picked
 * in 3D would.
 */
export interface BodyBrowserPanelProps {
  /** Bodies the feature tree produced, in evaluation order. */
  readonly bodies: readonly Body[]
  /** The imported parts of the document, with the bodies they carry. */
  readonly parts?: readonly Part[]
  /** Which feature last wrote each body, keyed by body id. */
  readonly ownerByBody?: ReadonlyMap<string, string>
  /** How a feature id reads on screen. Unknown ids fall back to the id. */
  readonly featureName?: (featureId: string) => string | undefined
  readonly selection?: readonly SelectionItem[]
  readonly onSelectionChange?: (selection: readonly SelectionItem[]) => void
  /** Asks the editor to show a feature's parameters, e.g. on a group heading. */
  readonly onSelectFeature?: (featureId: string) => void
  /**
   * Bodies the viewport is currently not drawing.
   *
   * Visibility is a way of looking at the model, not a property of it: nothing
   * here reaches the document, the history or a rebuild. Left out, every body
   * shows and the toggles are not offered at all — which is what keeps this
   * panel usable from anywhere that has a list of bodies and no viewport.
   */
  readonly hiddenIds?: ReadonlySet<string>
  readonly onToggleVisibility?: (bodyId: string) => void
  /** Hides everything except this body. The panel header offers the way back. */
  readonly onIsolate?: (bodyId: string) => void
}

const NO_OWNERS: ReadonlyMap<string, string> = new Map()
const NO_PARTS: readonly Part[] = []
const NONE_HIDDEN: ReadonlySet<string> = new Set<string>()

/** Bodies produced by one feature, in the order the rebuild made them. */
interface BodyGroup {
  readonly featureId: string | null
  readonly label: string
  readonly bodies: readonly Body[]
}

export function BodyBrowserPanel({
  bodies,
  parts = NO_PARTS,
  ownerByBody = NO_OWNERS,
  featureName,
  selection = EMPTY_SELECTION,
  onSelectionChange,
  onSelectFeature,
  hiddenIds = NONE_HIDDEN,
  onToggleVisibility,
  onIsolate,
}: BodyBrowserPanelProps): React.ReactElement {
  const groups = useMemo(
    () => groupByOwner(bodies, ownerByBody, featureName),
    [bodies, featureName, ownerByBody],
  )

  const pick = (bodyId: string, extend: boolean): void => {
    onSelectionChange?.(applyPick(selection, { kind: 'body', bodyId }, extend))
  }

  const empty = bodies.length === 0 && parts.length === 0

  const rowOf = (body: Body): React.ReactElement => (
    <BodyRow
      body={body}
      selected={selectionIncludes(selection, { kind: 'body', bodyId: body.id })}
      hidden={hiddenIds.has(body.id)}
      onPick={pick}
      {...(onToggleVisibility ? { onToggleVisibility } : {})}
      {...(onIsolate ? { onIsolate } : {})}
    />
  )

  return (
    <div className="bodies">
      {empty ? (
        <p className="bodies__empty">
          Nothing has been built yet. Sketch on a plane and extrude it to make the first body.
        </p>
      ) : null}

      {groups.map((group) => (
        <div className="bodies__group" key={group.featureId ?? '·unowned'}>
          {group.featureId ? (
            <button
              type="button"
              className="bodies__group-title"
              onClick={() => onSelectFeature?.(group.featureId as string)}
              title={`Show the parameters of ${group.label}`}
            >
              {group.label}
            </button>
          ) : (
            <span className="bodies__group-title bodies__group-title--plain">{group.label}</span>
          )}
          <ul className="bodies__list" aria-label={`Bodies from ${group.label}`}>
            {group.bodies.map((body) => (
              <li className="bodies__item" key={body.id}>
                {rowOf(body)}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {parts.map((part) => (
        <div className="bodies__group" key={part.id}>
          <span className="bodies__group-title bodies__group-title--plain">{part.name}</span>
          <ul className="bodies__list" aria-label={`Bodies from ${part.name}`}>
            {part.bodies.map((body) => (
              <li className="bodies__item" key={body.id}>
                {rowOf(body)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

interface BodyRowProps {
  readonly body: Body
  readonly selected: boolean
  readonly hidden: boolean
  readonly onPick: (bodyId: string, extend: boolean) => void
  readonly onToggleVisibility?: (bodyId: string) => void
  readonly onIsolate?: (bodyId: string) => void
}

function BodyRow({
  body,
  selected,
  hidden,
  onPick,
  onToggleVisibility,
  onIsolate,
}: BodyRowProps): React.ReactElement {
  const classes = [
    'bodies__row',
    selected ? 'bodies__row--selected' : '',
    hidden ? 'bodies__row--hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <button
        type="button"
        className={classes}
        aria-pressed={selected}
        // The same modifier the viewport uses, so adding a second body to a
        // selection is one gesture wherever it is done.
        onClick={(event) => onPick(body.id, event.shiftKey || event.ctrlKey || event.metaKey)}
      >
        <Icon name="body" size={14} />
        <span className="bodies__name">{body.name}</span>
        <span className="bodies__count">{triangleCount(body.mesh).toLocaleString()} tris</span>
      </button>
      {onIsolate ? (
        <IconButton
          className="bodies__action"
          size="sm"
          icon="isolate"
          label={`Isolate ${body.name}`}
          onClick={() => onIsolate(body.id)}
        />
      ) : null}
      {onToggleVisibility ? (
        <IconButton
          className="bodies__action"
          size="sm"
          icon={hidden ? 'eye-off' : 'eye'}
          label={`${hidden ? 'Show' : 'Hide'} ${body.name}`}
          onClick={() => onToggleVisibility(body.id)}
        />
      ) : null}
    </>
  )
}

/**
 * Bodies gathered under the feature that last wrote them, in body order.
 *
 * Order comes from the bodies rather than the map so the list reads down the
 * timeline the way the tree does. A body whose owner is unknown — which is what
 * an evaluation without owner information gives — still gets shown, under a
 * heading that does not pretend to name a feature.
 */
function groupByOwner(
  bodies: readonly Body[],
  ownerByBody: ReadonlyMap<string, string>,
  featureName?: (featureId: string) => string | undefined,
): BodyGroup[] {
  const groups: BodyGroup[] = []
  const byOwner = new Map<string | null, Body[]>()

  for (const body of bodies) {
    const owner = ownerByBody.get(body.id) ?? null
    const held = byOwner.get(owner)
    if (held) {
      held.push(body)
      continue
    }
    const list = [body]
    byOwner.set(owner, list)
    groups.push({
      featureId: owner,
      label: owner ? (featureName?.(owner) ?? owner) : 'Modelled',
      bodies: list,
    })
  }

  return groups
}
