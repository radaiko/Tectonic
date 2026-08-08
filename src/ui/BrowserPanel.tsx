import type { Body, Part } from '../domain/Document'
import type { FeatureTree } from '../features/FeatureTree'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { SketchPlane } from '../sketch/domain/SketchSupport'
import { describeSupport } from '../sketch/domain/SketchSupport'
import type { PlanarFaceGroup } from '../app/planarFaces'
import type { SectionState } from '../view/section'
import type { SelectionItem } from '../view/selection'
import { BodyBrowserPanel } from './BodyBrowserPanel'
import { FeatureTreePanel } from './FeatureTreePanel'
import { Icon } from './Icon'
import { SectionControls } from './SectionControls'
import { IconButton, Panel, PanelEmpty, PanelSection } from './shell'
import './BrowserPanel.css'

/**
 * The model browser: everything the document *is*, as one navigable tree.
 *
 * A CAD browser has to answer four different questions at once — what can I
 * start from (origin), what is there now (bodies), what did I draw (sketches)
 * and how was it built (history) — and the mistake would be to pick one of them
 * and call it the tree. Each is a section of its own, collapsible, so a part
 * with forty features does not push the origin planes off the bottom.
 *
 * The panel owns no state. Every row reports what was done to it and the editor
 * decides what that means, which is what keeps one rebuild path and one undo
 * stack rather than a browser that can quietly disagree with the viewport.
 */

export interface BrowserDocumentProps {
  readonly name: string
  readonly parts: readonly Part[]
}

export interface BrowserOriginProps {
  /** The base planes offered as sketch supports. */
  readonly planes: readonly SketchPlane[]
  /** The plane the open sketch sits on, if it sits on one. */
  readonly activePlane: SketchPlane | null
  readonly onNewSketch: (plane: SketchPlane) => void
}

export interface BrowserSketchesProps {
  readonly sketches: readonly SketchModel[]
  readonly selectedId: string | null
  readonly onSelect: (sketchId: string) => void
  readonly onToggleVisibility: (sketchId: string) => void
  /** Removes a sketch from the document, once its dependents have been dealt with. */
  readonly onDelete: (sketchId: string) => void
  /** Planar faces a new sketch can be attached to. Empty until something is built. */
  readonly faceGroups: readonly PlanarFaceGroup[]
  readonly faceTarget: string
  readonly onFaceTargetChange: (target: string) => void
  readonly onAddFaceSketch: () => void
}

export interface BrowserBodiesProps {
  readonly bodies: readonly Body[]
  readonly ownerByBody: ReadonlyMap<string, string>
  readonly featureName: (featureId: string) => string | undefined
  readonly hiddenIds: ReadonlySet<string>
  readonly onToggleVisibility: (bodyId: string) => void
  readonly onIsolate: (bodyId: string) => void
  readonly onShowAll: () => void
}

export interface BrowserHistoryProps {
  readonly tree: FeatureTree
  readonly selectedFeatureId: string | null
  readonly onSelectFeature: (featureId: string | null) => void
  readonly onRenameSketch: (sketchId: string, name: string) => void
  readonly onReorder: (featureId: string, newIndex: number) => void
  readonly onReorderRefused: (featureId: string, blockedBy: readonly string[]) => void
  readonly onToggleSuppress: (featureId: string) => void
  readonly onDelete: (featureId: string) => void
  readonly onRename: (featureId: string, name: string) => void
  readonly onRollBarChange: (index: number) => void
}

export interface BrowserSectionProps {
  readonly section: SectionState
  readonly onChange: (section: SectionState) => void
  readonly extent: number
}

export interface BrowserPanelProps {
  readonly document: BrowserDocumentProps
  readonly origin: BrowserOriginProps
  readonly sketches: BrowserSketchesProps
  readonly bodies: BrowserBodiesProps
  readonly history: BrowserHistoryProps
  /** Only offered once there is something to cut into. */
  readonly section: BrowserSectionProps | null
  readonly selection: readonly SelectionItem[]
  readonly onSelectionChange: (selection: readonly SelectionItem[]) => void
}

export function BrowserPanel({
  document,
  origin,
  sketches,
  bodies,
  history,
  section,
  selection,
  onSelectionChange,
}: BrowserPanelProps): React.ReactElement {
  const anyHidden = bodies.hiddenIds.size > 0

  return (
    <Panel
      side="left"
      label="Browser"
      className="browser"
      headerActions={
        <IconButton
          icon="eye"
          size="sm"
          label="Show all bodies"
          title="Show every body that has been hidden or isolated"
          disabled={!anyHidden}
          onClick={bodies.onShowAll}
        />
      }
    >
      <div className="browser__document">
        <Icon name="document" size={14} />
        <span className="browser__document-name" title={document.name}>
          {document.name}
        </span>
      </div>

      {/* Origin first, because on an empty document it is the only thing there
          is to click — and it stays first afterwards so the place a part starts
          is the same place every time. */}
      <PanelSection title="Origin" icon="origin" detail={`${origin.planes.length} planes`}>
        <div
          className="browser__planes"
          role="group"
          aria-label="New sketch on plane"
        >
          {origin.planes.map((plane) => (
            <button
              key={plane}
              type="button"
              className={`browser__row browser__row--plane${
                plane === origin.activePlane ? ' browser__row--selected' : ''
              }`}
              aria-pressed={plane === origin.activePlane}
              title={`Start a sketch on the ${plane} plane`}
              onClick={() => origin.onNewSketch(plane)}
            >
              {/* Just the plane's name. The section says "Origin" and the icon
                  says "plane", so a third word would only make the row's
                  accessible name longer than the thing it names. */}
              <Icon name="plane" size={14} />
              <span className="browser__row-name">{plane}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Bodies"
        icon="body"
        detail={`${bodies.bodies.length + document.parts.reduce((total, part) => total + part.bodies.length, 0)}`}
      >
        <BodyBrowserPanel
          bodies={bodies.bodies}
          parts={document.parts}
          ownerByBody={bodies.ownerByBody}
          featureName={bodies.featureName}
          selection={selection}
          onSelectionChange={onSelectionChange}
          onSelectFeature={history.onSelectFeature}
          hiddenIds={bodies.hiddenIds}
          onToggleVisibility={bodies.onToggleVisibility}
          onIsolate={bodies.onIsolate}
        />
      </PanelSection>

      <PanelSection title="Sketches" icon="sketch" detail={`${sketches.sketches.length}`}>
        {sketches.sketches.length === 0 ? (
          <PanelEmpty>No sketches yet.</PanelEmpty>
        ) : (
          <ul className="browser__list" aria-label="Sketches">
            {sketches.sketches.map((entry) => (
              <li key={entry.id} className="browser__item">
                <button
                  type="button"
                  className={`browser__row${entry.id === sketches.selectedId ? ' browser__row--selected' : ''}${
                    entry.visible ? '' : ' browser__row--hidden'
                  }`}
                  aria-pressed={entry.id === sketches.selectedId}
                  title={`Open ${entry.name} for drawing`}
                  onClick={() => sketches.onSelect(entry.id)}
                >
                  <Icon name="sketch" size={14} />
                  <span className="browser__row-name">{entry.name}</span>
                  <span className="browser__row-detail">{describeSupport(entry.support)}</span>
                </button>
                {/* No visibility toggle here on purpose. The same sketch appears
                    in History below with one already, and two controls with the
                    same name for the same thing is a browser where "hide this"
                    is ambiguous — for a screen reader it is literally two
                    buttons called "Hide Sketch 1". This section groups the
                    sketches; History is where each one is acted on.

                    Delete is the exception: it has no other home in this
                    section, and a list you can add to but not remove from is
                    how a document fills with sketches nobody wanted. */}
                <IconButton
                  icon="close"
                  size="sm"
                  tone="danger"
                  label={`Delete ${entry.name}`}
                  title={`Delete ${entry.name} from the document`}
                  onClick={() => sketches.onDelete(entry.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Attaching a sketch to a face is the second half of "what can a sketch
            sit on", so it belongs beside the planes rather than in a dialog. */}
        <div className="browser__face-sketch">
          {sketches.faceGroups.length === 0 ? (
            <PanelEmpty>No solid has been built yet, so there is no face to sketch on.</PanelEmpty>
          ) : (
            <>
              <select
                className="browser__select"
                aria-label="Face to sketch on"
                value={sketches.faceTarget}
                onChange={(event) => sketches.onFaceTargetChange(event.target.value)}
              >
                <option value="">Choose a face…</option>
                {sketches.faceGroups.map((group) => (
                  <optgroup key={group.bodyId} label={group.bodyName}>
                    {group.faces.map((face) => (
                      <option key={face.faceId} value={face.value}>
                        {face.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="button"
                className="browser__button"
                disabled={sketches.faceTarget === ''}
                onClick={sketches.onAddFaceSketch}
              >
                Add face sketch
              </button>
            </>
          )}
        </div>
      </PanelSection>

      {/* The ordered build: sketches and features in the order they happened,
          with the roll bar. This is the timeline in its full, editable form —
          the strip along the bottom is the same list read at a glance. */}
      <PanelSection
        title="History"
        icon="timeline"
        detail={`${history.tree.length + sketches.sketches.length}`}
      >
        <FeatureTreePanel
          showHeader={false}
          tree={history.tree}
          sketches={sketches.sketches}
          selectedFeatureId={history.selectedFeatureId}
          selectedSketchId={sketches.selectedId}
          onSelect={history.onSelectFeature}
          onSelectSketch={sketches.onSelect}
          onRenameSketch={history.onRenameSketch}
          onToggleSketchVisibility={sketches.onToggleVisibility}
          onDeleteSketch={sketches.onDelete}
          onReorder={history.onReorder}
          onReorderRefused={history.onReorderRefused}
          onToggleSuppress={history.onToggleSuppress}
          onDelete={history.onDelete}
          onRename={history.onRename}
          onRollBarChange={history.onRollBarChange}
        />
      </PanelSection>

      {section ? (
        <PanelSection title="Section" icon="section" defaultOpen={false}>
          <SectionControls
            section={section.section}
            onChange={section.onChange}
            extent={section.extent}
          />
        </PanelSection>
      ) : null}
    </Panel>
  )
}
