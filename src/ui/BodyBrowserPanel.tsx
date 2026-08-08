import { useMemo } from 'react'
import type { Body, Part } from '../domain/Document'
import { triangleCount } from '../domain/MeshData'
import type { SelectionItem } from '../view/selection'
import { EMPTY_SELECTION, applyPick, selectionIncludes } from '../view/selection'
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
}

const NO_OWNERS: ReadonlyMap<string, string> = new Map()
const NO_PARTS: readonly Part[] = []

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
}: BodyBrowserPanelProps): React.ReactElement {
  const groups = useMemo(
    () => groupByOwner(bodies, ownerByBody, featureName),
    [bodies, featureName, ownerByBody],
  )

  const pick = (bodyId: string, extend: boolean): void => {
    onSelectionChange?.(applyPick(selection, { kind: 'body', bodyId }, extend))
  }

  const empty = bodies.length === 0 && parts.length === 0

  return (
    <section className="bodies">
      <h2 className="bodies__title">Bodies</h2>
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
              <li key={body.id}>
                <BodyRow
                  body={body}
                  selected={selectionIncludes(selection, { kind: 'body', bodyId: body.id })}
                  onPick={pick}
                />
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
              <li key={body.id}>
                <BodyRow
                  body={body}
                  selected={selectionIncludes(selection, { kind: 'body', bodyId: body.id })}
                  onPick={pick}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

interface BodyRowProps {
  readonly body: Body
  readonly selected: boolean
  readonly onPick: (bodyId: string, extend: boolean) => void
}

function BodyRow({ body, selected, onPick }: BodyRowProps): React.ReactElement {
  return (
    <button
      type="button"
      className={`bodies__row${selected ? ' bodies__row--selected' : ''}`}
      aria-pressed={selected}
      // The same modifier the viewport uses, so adding a second body to a
      // selection is one gesture wherever it is done.
      onClick={(event) => onPick(body.id, event.shiftKey || event.ctrlKey || event.metaKey)}
    >
      <span aria-hidden="true">◧</span>
      <span className="bodies__name">{body.name}</span>
      <span className="bodies__count">{triangleCount(body.mesh).toLocaleString()} tris</span>
    </button>
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
