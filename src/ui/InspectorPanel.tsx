import { useState } from 'react'
import type { TectonicDocument } from '../domain/Document'
import type { Feature } from '../features/domain/Feature'
import type { FeatureParameters } from '../features/domain/parameters'
import type { KernelCapability } from '../kernel/IKernel'
import type { SketchModel } from '../sketch/domain/SketchModel'
import { describeSupport } from '../sketch/domain/SketchSupport'
import type { SelectionItem, SelectionKind } from '../view/selection'
import { describeSelection, describeSelectionCount, selectionKey } from '../view/selection'
import type { ComputedValue } from './FeaturePropertiesPanel'
import { FeaturePropertiesPanel } from './FeaturePropertiesPanel'
import { Icon } from './Icon'
import { IconButton, Panel, PanelEmpty } from './shell'
import './InspectorPanel.css'

/**
 * The inspector: what is picked, what is selected, what is being drawn, and
 * what the document is.
 *
 * Four things a modeller needs to see, only one of which is relevant at a time —
 * which is exactly the case tabs are for. The tab that opens is the one the
 * user's last action made relevant (select a feature, get its parameters; open
 * a sketch, get the sketch), and choosing one by hand overrides that until the
 * context changes again. A panel that ignored context would make every feature
 * edit a two-click job; one that ignored the user's choice would snatch the
 * document properties away the moment anything else happened.
 */
export type InspectorTab = 'selection' | 'feature' | 'sketch' | 'document'

const TABS: readonly { readonly id: InspectorTab; readonly label: string }[] = [
  { id: 'selection', label: 'Selection' },
  { id: 'feature', label: 'Feature' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'document', label: 'Document' },
]

export interface InspectorPanelProps {
  readonly document: TectonicDocument
  /** Live counts for the document tab; the opened file's own are stale. */
  readonly stats: {
    readonly parts: number
    readonly bodies: number
    readonly triangles: number
  }
  readonly backend: string
  readonly missingCapabilities: readonly KernelCapability[]
  readonly kernelFallbacks: readonly string[]

  readonly feature: Feature | null
  readonly computed: readonly ComputedValue[]
  readonly onParameterChange: (featureId: string, changes: FeatureParameters) => void
  readonly activePickKey: string | null
  readonly onPickKindChange: (kind: SelectionKind | null) => void

  readonly selection: readonly SelectionItem[]
  readonly onSelectionChange: (selection: readonly SelectionItem[]) => void
  /** How a body id reads, so a chip says "Top face of Base" and not "body-3". */
  readonly bodyName: (bodyId: string) => string | undefined

  readonly sketch: SketchModel | null
  /** Whether the sketch surface is the one on screen. */
  readonly drawing: boolean
  readonly onOpenSketch: (sketchId: string) => void
  readonly onToggleSketchVisibility: (sketchId: string) => void
}

export function InspectorPanel(props: InspectorPanelProps): React.ReactElement {
  const { feature, drawing, selection } = props

  // What the last thing the user did makes worth showing. Ordered by how
  // specific the action was: opening a sketch is a stronger statement of intent
  // than having something left over in the selection.
  const preferred: InspectorTab = drawing
    ? 'sketch'
    : feature
      ? 'feature'
      : selection.length > 0
        ? 'selection'
        : 'document'

  const [chosen, setChosen] = useState<InspectorTab | null>(null)
  // A context change retires the manual choice, so the panel follows the work
  // again after the user has finished reading whatever they went looking for.
  const [seen, setSeen] = useState(preferred)
  if (seen !== preferred) {
    setSeen(preferred)
    setChosen(null)
  }

  const active = chosen ?? preferred

  return (
    <Panel side="right" label="Inspector" className="inspector">
      <div className="inspector__tabs" role="tablist" aria-label="Inspector">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`inspector-tab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`inspector-panel-${tab.id}`}
            tabIndex={tab.id === active ? 0 : -1}
            className={`inspector__tab${tab.id === active ? ' inspector__tab--active' : ''}`}
            onClick={() => setChosen(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="inspector__body"
        role="tabpanel"
        id={`inspector-panel-${active}`}
        aria-labelledby={`inspector-tab-${active}`}
      >
        {active === 'selection' ? <SelectionTab {...props} /> : null}
        {active === 'feature' ? <FeatureTab {...props} /> : null}
        {active === 'sketch' ? <SketchTab {...props} /> : null}
        {active === 'document' ? <DocumentTab {...props} /> : null}
      </div>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */

function SelectionTab({
  selection,
  onSelectionChange,
  bodyName,
}: InspectorPanelProps): React.ReactElement {
  if (selection.length === 0) {
    return (
      <PanelEmpty>
        Nothing is picked. Click a face, an edge or a body in the viewport — or a body in the
        browser — and it will be listed here.
      </PanelEmpty>
    )
  }

  return (
    <>
      <div className="inspector__heading">
        <span className="inspector__count" role="status">
          {describeSelectionCount(selection)}
        </span>
        <button
          type="button"
          className="inspector__link"
          onClick={() => onSelectionChange([])}
        >
          Clear
        </button>
      </div>
      <ul className="inspector__chips" aria-label="Picked geometry">
        {selection.map((item) => (
          <li key={selectionKey(item)}>
            <button
              type="button"
              className="inspector__chip"
              data-kind={item.kind}
              aria-label={`Remove ${describeSelection(item, { bodyName })} from the selection`}
              onClick={() =>
                onSelectionChange(
                  selection.filter((other) => selectionKey(other) !== selectionKey(item)),
                )
              }
            >
              <span>{describeSelection(item, { bodyName })}</span>
              <Icon name="close" size={12} />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function FeatureTab({
  feature,
  computed,
  onParameterChange,
  selection,
  activePickKey,
  onPickKindChange,
}: InspectorPanelProps): React.ReactElement {
  return (
    <FeaturePropertiesPanel
      feature={feature}
      computed={computed}
      onChange={onParameterChange}
      selection={selection}
      activePickKey={activePickKey}
      onPickKindChange={onPickKindChange}
    />
  )
}

function SketchTab({
  sketch,
  drawing,
  onOpenSketch,
  onToggleSketchVisibility,
}: InspectorPanelProps): React.ReactElement {
  if (!sketch) {
    return (
      <PanelEmpty>
        No sketch is open. Click an origin plane or a planar face to start one.
      </PanelEmpty>
    )
  }

  return (
    <>
      <div className="inspector__heading">
        <Icon name="sketch" size={15} />
        <span className="inspector__title">{sketch.name}</span>
        <IconButton
          size="sm"
          icon={sketch.visible ? 'eye' : 'eye-off'}
          label={`${sketch.visible ? 'Hide' : 'Show'} ${sketch.name}`}
          onClick={() => onToggleSketchVisibility(sketch.id)}
        />
      </div>

      <dl className="inspector__facts">
        <Fact label="Sits on" value={describeSupport(sketch.support)} />
        <Fact label="Entities" value={String(sketch.entities.size)} />
        <Fact label="Constraints" value={String(sketch.constraints.size)} />
        <Fact label="Grid" value={`${sketch.gridSpacing} mm`} />
        <Fact label="Visible" value={sketch.visible ? 'Yes' : 'No'} />
      </dl>

      {/* Only the way *in*. While the sketch is open the ribbon carries Finish
          Sketch as its one accented action, and a second button with the same
          name here would be two controls for one decision — the sort of
          duplication that makes a user wonder whether they differ. */}
      {drawing ? (
        <p className="inspector__note">
          Use Finish Sketch in the ribbon when you are done drawing.
        </p>
      ) : (
        <div className="inspector__actions">
          <button
            type="button"
            className="inspector__action"
            onClick={() => onOpenSketch(sketch.id)}
          >
            <Icon name="sketch" size={15} />
            Edit Sketch
          </button>
        </div>
      )}
    </>
  )
}

function DocumentTab({
  document,
  stats,
  backend,
  missingCapabilities,
  kernelFallbacks,
}: InspectorPanelProps): React.ReactElement {
  return (
    <>
      <div className="inspector__heading">
        <Icon name="document" size={15} />
        <span className="inspector__title">{document.metadata.name}</span>
      </div>

      <dl className="inspector__facts">
        <Fact label="Units" value={document.metadata.units} />
        <Fact label="Created" value={formatStamp(document.metadata.created)} />
        <Fact label="Updated" value={formatStamp(document.metadata.modified)} />
        <Fact label="Parts" value={String(stats.parts)} />
        <Fact label="Bodies" value={String(stats.bodies)} />
        <Fact label="Triangles" value={stats.triangles.toLocaleString()} />
      </dl>

      <h3 className="inspector__subtitle">Geometry kernel</h3>
      <dl className="inspector__facts">
        <Fact label="Backend" value={backend} />
      </dl>
      {/* Which engine the geometry came out of, and what it cannot do. A stub
          result and a B-Rep result look alike on screen and are not alike at
          all, so the gap is named rather than left to be discovered. */}
      {missingCapabilities.length > 0 ? (
        <p className="inspector__note inspector__note--warning">
          <Icon name="warning" size={13} />
          <span>
            This backend cannot {missingCapabilities.join(', ')}. Those commands are marked
            unavailable in the ribbon rather than failing when you press them.
          </span>
        </p>
      ) : null}
      {kernelFallbacks.map((line) => (
        <p className="inspector__note" key={line}>
          {line}
        </p>
      ))}
    </>
  )
}

function Fact({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}): React.ReactElement {
  return (
    <div className="inspector__fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** An ISO stamp in the reader's own locale, falling back to the raw text. */
function formatStamp(iso: string): string {
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? iso : new Date(parsed).toLocaleString()
}
