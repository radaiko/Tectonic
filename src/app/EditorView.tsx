import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import { buildSketchOverlays, resolveOverlayFrame } from '../3d/sketchOverlay'
import type { MeshData } from '../domain/MeshData'
import type { Body, TectonicDocument } from '../domain/Document'
import {
  countBodies,
  createSketchOn,
  documentFeatureTree,
  documentSketches,
  nextSketchName,
  withFeatureTree,
  withSketches,
} from '../domain/Document'
import type { CommitOptions } from '../domain/DocumentHistory'
import { DocumentHistory } from '../domain/DocumentHistory'
import { triangleCount } from '../domain/MeshData'
import { FeatureEngine } from '../features/FeatureEngine'
import type { FeatureEvaluation } from '../features/FeatureEngine'
import {
  FEATURE_TYPES,
  FeatureType,
  featureLabel,
  isSheetMetalFeature,
  isSketchFeature,
  isSurfaceFeature,
} from '../features/domain/FeatureType'
import type { FeatureParameters } from '../features/domain/parameters'
import { parameterFields } from '../features/domain/schema'
import type { GeometryKind } from '../features/domain/geometryRefs'
import { ID_KEYS, referencePatch } from '../features/domain/geometryRefs'
import { inferParentFeatureIds } from '../features/domain/dependencies'
import { createFeature, nextFeatureName } from '../features/domain/factory'
import { sketchReferenceIds } from '../features/domain/timeline'
import type { IKernel, KernelCapability } from '../kernel/IKernel'
import { missingCapabilities } from '../kernel/IKernel'
import { faceReference, surveyMeshFaces } from '../kernel/references'
import { StubKernel } from '../kernel/StubKernel'
import { SketchEditor } from '../sketch/SketchEditor'
import { projectFaceBoundary } from '../sketch/domain/projection'
import type { SketchPlane, SketchSupport } from '../sketch/domain/SketchSupport'
import {
  ORIGIN_PLANES,
  describeSupport,
  faceSupport,
  isFaceSupport,
  isOriginPlaneSupport,
  originPlaneSupport,
  sameSupport,
} from '../sketch/domain/SketchSupport'
import type { ToolId } from '../sketch/tools/SketchTool'
import { SKETCH_TOOLS, toolDefinition } from '../sketch/tools/registry'
import { BrowserPanel } from '../ui/BrowserPanel'
import { CommandDialog } from '../ui/CommandDialog'
import type { Command } from '../ui/commands'
import type { ComputedValue } from '../ui/FeaturePropertiesPanel'
import { Icon } from '../ui/Icon'
import { InspectorPanel } from '../ui/InspectorPanel'
import { AppBar, IconButton, Ribbon, StatusBar } from '../ui/shell'
import type { StatusItem } from '../ui/shell'
import { TimelineBar } from '../ui/TimelineBar'
import { ViewportHud } from '../ui/ViewportHud'
import { modelWorkspaceTabs, sketchWorkspaceTabs } from '../ui/workspaces'
import type { SectionState } from '../view/section'
import { createSectionState, sectionPlanes, setSectionMode } from '../view/section'
import type { SelectionItem, SelectionKind } from '../view/selection'
import { EMPTY_SELECTION } from '../view/selection'
import { ExportDialog } from './ExportDialog'
import { parseFaceTarget, planarFaceGroups } from './planarFaces'
import './EditorView.css'

/**
 * Features reachable by a bare letter. Everything else in the tree is added
 * from the ribbon or the command palette, which is where the full list lives.
 */
const FEATURE_SHORTCUTS: Partial<Record<FeatureType, string>> = {
  [FeatureType.Extrude]: 'E',
  [FeatureType.Shell]: 'S',
  [FeatureType.BaseFlange]: 'B',
}

const FEATURE_BY_KEY = new Map(
  Object.entries(FEATURE_SHORTCUTS).map(([type, key]) => [key.toLowerCase(), type as FeatureType]),
)

export type EditorSurface = 'sketch' | 'model'

/** Stable empty list, so "no planes" does not re-render the viewport each time. */
const EMPTY_PLANES: readonly SketchPlane[] = []
const EMPTY_FALLBACKS: readonly string[] = []
/** Stands in for "nothing has been built yet", so no feature claims a parent. */
const EMPTY_OWNERS: ReadonlyMap<string, string> = new Map()
/** Nothing hidden. Shared so an untouched document never re-renders the browser. */
const NONE_HIDDEN: ReadonlySet<string> = new Set<string>()
/**
 * What a click can land on when no command has narrowed it: the origin planes
 * of an empty document, then the sketches drawn over the model, then faces, then
 * edges. Faces before edges because they are by far the easier target — an edge
 * is reached by arming a field that wants one. Sketches ahead of both because a
 * sketch overlay lies on the face it was drawn on.
 */
const DEFAULT_PICKABLE: readonly SelectionKind[] = ['origin-plane', 'sketch', 'face', 'edge']
/** While a command is asking which sketch to build from, only sketches are pickable. */
const SKETCH_ONLY_PICKABLE: readonly SelectionKind[] = ['sketch']

export interface EditorViewProps {
  readonly document: TectonicDocument
  /**
   * The geometry backend every rebuild runs on.
   *
   * Injected rather than constructed here: which kernel the app models with is
   * the shell's decision — it is the thing that knows a WASM binary loaded — and
   * a viewport built from one backend's tessellation while a feature was
   * evaluated by another would be a very quiet class of bug. A test that leaves
   * it out gets the stub, which needs no binary and is the same every run.
   */
  readonly kernel?: IKernel
  /** The backend's name, for the status bar. Defaults to the kernel's own. */
  readonly kernelBackend?: string
  /** Backends that could not be loaded, so the status bar can say what is missing. */
  readonly kernelFallbacks?: readonly string[]
  /** Operations this backend cannot carry out. Drives the unsupported-feature notice. */
  readonly kernelMissing?: readonly KernelCapability[]
  /** Receives the document with the live sketches and history folded back in. */
  readonly onSave: (document: TectonicDocument) => void
  readonly onClose: () => void
  /**
   * Starts a new document, after the shell has warned about anything unsaved.
   * Omitted when the editor is rendered without a shell around it, and the
   * header then leaves the button out rather than offering a dead one.
   */
  readonly onNewDocument?: () => void
  /**
   * Whether the document already carries edits that were never written to a
   * file — true for a session restored after a crash. Read once, as the
   * editor mounts: from then on the editor owns the flag, and the shell gives
   * a different document its own editor (by key) rather than pushing one in.
   */
  readonly initiallyUnsaved?: boolean
  /**
   * Mirrors the document out to the shell after every edit, along with whether
   * it still has changes that have not been written to a file. This is what
   * backs the unsaved-changes guard and the crash-recovery copy, so the shell
   * never has to guess at what the editor is holding.
   */
  readonly onDocumentChange?: (document: TectonicDocument, dirty: boolean) => void
  /**
   * Publishes what the editor can do to the shell's command palette. Called
   * again whenever the list changes, and with nothing left on unmount.
   */
  readonly onCommandsChange?: (commands: readonly Command[]) => void
}

export function EditorView({
  document,
  kernel: injectedKernel,
  kernelBackend,
  kernelFallbacks = EMPTY_FALLBACKS,
  kernelMissing,
  onSave,
  onClose,
  onNewDocument,
  initiallyUnsaved = false,
  onDocumentChange,
  onCommandsChange,
}: EditorViewProps): React.ReactElement {
  // Mutable and long-lived: the panels edit these models in place, and a
  // revision counter — not a new object — is what tells React to redraw.
  //
  // They are built once, from the document this editor was opened with, and a
  // `useState` initializer is what guarantees that: the shell replaces the
  // editor (by key) when a different document is loaded, so re-deriving them
  // from a later prop could only throw away edits in progress.
  const [sketches] = useState(() => documentSketches(document))
  const [tree] = useState(() => documentFeatureTree(document))
  // Built once so an editor rendered without a shell around it still models,
  // and never used when one was supplied.
  const [stub] = useState(() => new StubKernel())
  const kernel = injectedKernel ?? stub
  const engine = useMemo(() => new FeatureEngine(kernel), [kernel])
  const backend = kernelBackend ?? kernel.name
  const missing = useMemo(
    () => kernelMissing ?? missingCapabilities(kernel),
    [kernel, kernelMissing],
  )

  const [revision, bumpRevision] = useReducer((count: number) => count + 1, 0)
  // The 3D view is where a document opens. It is the only surface that can show
  // what the document *is* — the origin planes of an empty one, the solid of a
  // built one — and it is where the first choice of any part gets made: which
  // plane to sketch on. Landing in a 2D sketch instead asked the user to have
  // already made that choice before they had seen anything.
  const [surface, setSurface] = useState<EditorSurface>('model')
  // A restored document arrives already modified, and saying so is what makes
  // the header honest and the shell's discard guard fire on the first close.
  const [modified, setModified] = useState(initiallyUnsaved)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<FeatureEvaluation | null>(null)
  // The document title, edited in the header. Kept here rather than read
  // straight off the prop because the prop is the document as it was opened.
  //
  // Mirrored into a ref because undo writes it from outside React's render
  // cycle: `compose` reading the state variable would compose the document with
  // whatever the title was one render ago.
  const [name, setNameState] = useState(document.metadata.name)
  const nameRef = useRef(document.metadata.name)
  const setName = useCallback((title: string) => {
    nameRef.current = title
    setNameState(title)
  }, [])
  /**
   * The title as of *now*, for the history's snapshots.
   *
   * Defined out here rather than inline where the history is built, so that the
   * ref is only ever reached from inside a function the history calls later —
   * which is the whole point of the ref. Undo runs outside React's render cycle
   * and would otherwise snapshot the title as it was one render ago.
   */
  const getName = useCallback(() => nameRef.current, [])
  // Which sketch the sketch surface is editing and which one a new profile
  // feature will consume. Falls back to the first when the selection is stale.
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null)
  // Held here rather than inside the sketch editor so the ribbon and the palette
  // can switch tools without the sketch having to be on screen already.
  const [sketchTool, setSketchTool] = useState<ToolId>('select')
  const [exportOpen, setExportOpen] = useState(false)
  const [faceTarget, setFaceTarget] = useState<string>('')
  /**
   * Which ribbon tab the modelling workspace is on. Remembered across a trip
   * into a sketch, so finishing one puts the user back where they were rather
   * than on whichever tab happens to be first.
   */
  const [workspaceTab, setWorkspaceTab] = useState('solid')
  /**
   * The last thing the editor had to tell the user about an action it did not
   * carry out the way they asked, or carried further than they asked. Held here
   * rather than shouted through an alert box so it can be read and ignored.
   */
  const [notice, setNotice] = useState<string | null>(null)
  /**
   * What is picked in the 3D view. Held here rather than inside the viewport
   * because it is what the properties panel fills a feature's inputs from —
   * the viewport draws a selection, it does not own one.
   */
  const [selection, setSelection] = useState<readonly SelectionItem[]>(EMPTY_SELECTION)
  // Cutting the model open is a way of looking at it, not a change to it, so it
  // lives here and never reaches the document or the history.
  const [section, setSection] = useState<SectionState>(() => createSectionState())
  /**
   * Bodies the viewport is not drawing.
   *
   * Like the section, this is a way of looking at the model rather than a
   * property of it: it never reaches the document, the history or a rebuild, and
   * a hidden body is still counted, still exported and still has its faces
   * offered as sketch supports. Hiding is about what is in the way right now.
   */
  const [hiddenBodyIds, setHiddenBodyIds] = useState<ReadonlySet<string>>(NONE_HIDDEN)
  const [timelineCollapsed, setTimelineCollapsed] = useState(false)
  /** Bumped to ask the viewport to put the camera back on the whole model. */
  const [fitRequest, requestFit] = useReducer((count: number) => count + 1, 0)
  /**
   * The selection field currently taking picks, and what it wants. Arming a
   * field narrows the viewport to that kind, which is the only way a
   * one-pixel-wide edge is a realistic target.
   */
  const [picking, setPicking] = useState<{ key: string; kind: SelectionKind } | null>(null)
  /**
   * The feature command that has been started but not yet run, and the sketch it
   * has been given so far.
   *
   * A feature that consumes a profile cannot be built from a guess. Pressing
   * Extrude used to append a feature pointed at whichever sketch the editor
   * thought was current, which is right exactly while a document has one sketch
   * in it. Now pressing it opens a selection input: the command sits here,
   * visible and cancellable, until a sketch has actually been named.
   */
  const [pendingFeature, setPendingFeature] = useState<{
    readonly type: FeatureType
    readonly sketchId: string | null
  } | null>(null)

  const activeSketch =
    sketches.find((entry) => entry.id === selectedSketchId) ?? sketches[0] ?? null

  /** The sketch a running feature command has been given, if it has been given one. */
  const pendingSketch =
    sketches.find((entry) => entry.id === pendingFeature?.sketchId) ?? null

  // Every edit to the tree or its parameters ends here: one rebuild, whose
  // result is dropped when a newer one has already started.
  useEffect(() => {
    let current = true
    void engine
      .evaluate(tree, sketches)
      .then((result) => {
        if (current) setEvaluation(result)
      })
      .catch(() => {
        if (current) setEvaluation(null)
      })
    return () => {
      current = false
    }
  }, [engine, revision, sketches, tree])

  // Memoised so the "no bodies yet" case does not hand out a fresh array on
  // every render, which would re-derive the meshes and the face list each time.
  const modelledBodies: readonly Body[] = useMemo(() => evaluation?.bodies ?? [], [evaluation])
  const staticBodies: readonly Body[] = useMemo(
    () => document.parts.flatMap((part) => part.bodies),
    [document],
  )
  const allBodies: readonly Body[] = useMemo(
    () => [...staticBodies, ...modelledBodies],
    [modelledBodies, staticBodies],
  )
  /**
   * The bodies the viewport actually draws.
   *
   * Everything else — counts, exports, the face picker, the browser — works off
   * `allBodies`, because hiding a body does not take it out of the document.
   * Only the three index-aligned lists the scene is built from are filtered, and
   * they are derived together so a hidden body cannot shift the ids out of step
   * with the meshes.
   */
  const visibleBodies: readonly Body[] = useMemo(
    () =>
      hiddenBodyIds.size === 0
        ? allBodies
        : allBodies.filter((body) => !hiddenBodyIds.has(body.id)),
    [allBodies, hiddenBodyIds],
  )
  const meshes: MeshData[] = useMemo(() => visibleBodies.map((body) => body.mesh), [visibleBodies])
  // Built from the same array, right here, so the two stay index-aligned. This
  // is what lets a click on a solid in the viewport name the face it landed on.
  const bodyIds: string[] = useMemo(() => visibleBodies.map((body) => body.id), [visibleBodies])
  const bodyNames: string[] = useMemo(() => visibleBodies.map((body) => body.name), [visibleBodies])
  const triangles = useMemo(
    () => allBodies.reduce((total, body) => total + triangleCount(body.mesh), 0),
    [allBodies],
  )

  /** Faces a new sketch can be attached to. Empty until something is built. */
  const faceGroups = useMemo(() => planarFaceGroups(allBodies), [allBodies])

  /** How a feature id reads on screen, for anything that only holds the id. */
  const featureNameOf = useCallback(
    (featureId: string) => tree.getFeature(featureId)?.name,
    [tree],
  )

  /** How a body id reads on screen, so a selection chip never shows a raw id. */
  const bodyNameOf = useCallback(
    (bodyId: string) => allBodies.find((body) => body.id === bodyId)?.name,
    [allBodies],
  )

  /** The same for a sketch, so a picked overlay reads as "Sketch 2". */
  const sketchNameOf = useCallback(
    (sketchId: string) => sketches.find((entry) => entry.id === sketchId)?.name,
    [sketches],
  )

  /**
   * How far the section sliders reach: the model's own extent, rounded up, so a
   * 5 mm part and a 500 mm one both get a slider that spans them. A fixed range
   * would leave the cut off the end of one and immovably coarse on the other.
   */
  const sectionExtent = useMemo(() => {
    let reach = 0
    for (const body of allBodies) {
      for (const value of body.mesh.positions) reach = Math.max(reach, Math.abs(value))
    }
    return reach > 0 ? Math.ceil(reach * 1.1) : 100
  }, [allBodies])

  /** The planes the viewport clips against, derived from the section state. */
  const clipPlanes = useMemo(() => sectionPlanes(section), [section])

  /**
   * The origin planes stand in for geometry that is not there yet, so they are
   * on screen exactly while there is none. Once a solid exists it is the thing
   * to click — leaving three translucent quads across the middle of the scene
   * would put a hit target in front of every face behind them. Starting a
   * sketch on a plane from then on goes through the browser, which never leaves.
   */
  const visiblePlanes = useMemo(
    () => (allBodies.length === 0 ? ORIGIN_PLANES : EMPTY_PLANES),
    [allBodies],
  )

  /**
   * The plane the open sketch sits on, drawn as chosen. Null for a face sketch,
   * and null for a hidden one — hiding a sketch takes it off the 3D view, and the
   * tinted plane is the whole of what it puts there.
   */
  const activePlane =
    activeSketch && activeSketch.visible && isOriginPlaneSupport(activeSketch.support)
      ? activeSketch.support.plane
      : null

  /**
   * The sketches, lifted onto their support planes for the 3D view.
   *
   * Recomputed on the revision counter as well as the lists themselves, because
   * the sketch models are mutated in place — drawing a line changes the contents
   * of an object React has already seen, and the counter is what says so.
   */
  const overlayResult = useMemo(
    () => buildSketchOverlays(sketches, allBodies),
    [allBodies, revision, sketches],
  )

  const selectedFeature = selectedFeatureId ? (tree.getFeature(selectedFeatureId) ?? null) : null
  const computed = useMemo<ComputedValue[]>(
    () => computedValues(evaluation, selectedFeatureId),
    [evaluation, selectedFeatureId],
  )

  /**
   * The document as it currently stands: the opened file, restamped with the
   * title, the live sketches and the live history. This is what gets saved,
   * exported and mirrored to the shell, so all three see exactly one model.
   *
   * The title is a required argument rather than defaulted off the ref, because
   * the two kinds of caller want different answers to "what is the title now".
   * A handler running after a render — save, undo, the shell mirror — wants the
   * ref, which is current even when React has not re-rendered yet. A render
   * wants its own `name`, which is exactly the title being drawn. Folding both
   * into one default would have every render reach for a ref it does not need.
   */
  const compose = useCallback(
    (title: string): TectonicDocument =>
      withFeatureTree(
        withSketches({ ...document, metadata: { ...document.metadata, name: title } }, sketches),
        tree,
      ),
    [document, sketches, tree],
  )

  /**
   * Undo and redo for everything that is not drawing.
   *
   * Built over the very sketch list and feature tree the panels hold, and
   * refilling them in place, so an undo is visible everywhere at once rather
   * than only in whichever component happened to be handed the new copy.
   */
  // A lazy `useState` initializer rather than `useMemo`: the history has to be
  // built exactly once, and `useMemo` is a performance hint that React is free
  // to discard and recompute — which here would silently throw the undo stack
  // away. The initial name is passed in so the opening snapshot does not have to
  // reach for the ref while the component is rendering; from then on `getName`
  // is only ever called from a commit, which is well after a render.
  const [history] = useState(
    // The rule cannot see that the constructor does not call `getName` — the
    // opening snapshot takes the title from `name` for exactly that reason — so
    // it warns about the ref that `getName` closes over on the possibility that
    // it might. It does not: every other caller of `getName` is a commit, which
    // only ever runs from an event handler.
    // eslint-disable-next-line react-hooks/refs
    () => new DocumentHistory({ sketches, tree, getName, setName }, undefined, name),
  )
  // Read during render for the header's buttons, so it has to be state rather
  // than something only the history knows.
  const [historyState, setHistoryState] = useState(() => ({
    undo: null as string | null,
    redo: null as string | null,
  }))
  const syncHistory = useCallback(() => {
    setHistoryState({ undo: history.undoLabel, redo: history.redoLabel })
  }, [history])

  /**
   * Records an edit to the model: snapshot it for undo, mark dirty, rebuild,
   * and tell the shell.
   *
   * Every path that changes the document goes through here, which is what makes
   * "undoable" the default rather than something each command has to remember.
   */
  const touch = useCallback(
    (label: string, options?: CommitOptions) => {
      history.commit(label, options)
      syncHistory()
      setModified(true)
      bumpRevision()
      onDocumentChange?.(compose(nameRef.current), true)
    },
    [compose, history, onDocumentChange, syncHistory],
  )

  /** Steps the document history, and says what moved. */
  const travel = useCallback(
    (direction: 'undo' | 'redo') => {
      const moved = direction === 'undo' ? history.undo() : history.redo()
      if (!moved) {
        setNotice(direction === 'undo' ? 'Nothing left to undo.' : 'Nothing left to redo.')
        return
      }
      syncHistory()
      setModified(true)
      bumpRevision()
      setNotice(`${direction === 'undo' ? 'Undid' : 'Redid'} ${moved.toLowerCase()}.`)
      onDocumentChange?.(compose(nameRef.current), true)
    },
    [compose, history, onDocumentChange, syncHistory],
  )

  const handleUndo = useCallback(() => travel('undo'), [travel])
  const handleRedo = useCallback(() => travel('redo'), [travel])

  // The shell needs a copy of the document even if nothing is ever edited, so
  // a reload right after opening it still has something to recover. Guarded by
  // a ref rather than an empty dependency list, which would go stale.
  //
  // It reports the flag the editor was opened with, not a flat `false`: a
  // restored session arrives dirty, and announcing it clean here would tell the
  // shell to drop its discard guard before the first edit.
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current) return
    announced.current = true
    onDocumentChange?.(compose(nameRef.current), initiallyUnsaved)
  }, [compose, initiallyUnsaved, onDocumentChange])

  const handleSave = useCallback(() => {
    const saved = compose(nameRef.current)
    onSave(saved)
    setModified(false)
    onDocumentChange?.(saved, false)
  }, [compose, onDocumentChange, onSave])

  const handleRenameDocument = useCallback(
    (title: string) => {
      setName(title)
      // Coalesced: a title is typed a character at a time, and undo should take
      // back the rename rather than the last keystroke.
      touch('Rename document', { coalesceKey: 'document-name' })
    },
    [setName, touch],
  )

  /**
   * Appends a feature of the given kind and shows it.
   *
   * `sketchId` is the profile it consumes, and it is a required argument rather
   * than something read off the editor's current state: "which sketch is this
   * built from" is a question only the user can answer, and every caller that
   * needs an answer has been through {@link startFeature} to get one.
   */
  const commitFeature = useCallback(
    (type: FeatureType, sketchId: string | null) => {
      const sketch = sketchId ? (sketches.find((entry) => entry.id === sketchId) ?? null) : null
      const feature = createFeature(type, {
        name: nextFeatureName(type, tree.features),
        sketchId: sketch?.id ?? null,
      })
      // Recorded at creation, from the part as the last rebuild left it. Without
      // this the tree's ordering guarantees are vacuous — every feature claims to
      // depend on nothing, so nothing stops a fillet being dragged in front of
      // the extrude it rounds.
      feature.parentFeatureIds = inferParentFeatureIds(type, feature.parameters, {
        ownerByBody: evaluation?.ownerByBody ?? EMPTY_OWNERS,
        sketch,
      })
      tree.addFeature(feature)
      setSelectedFeatureId(feature.id)
      setSurface('model')
      touch(`Add ${featureLabel(type)}`)
    },
    [evaluation, sketches, touch, tree],
  )

  /**
   * Runs a feature command.
   *
   * Kinds that consume a profile do not build anything here: they open a
   * selection input and wait to be told which sketch. Everything else works off
   * what the tree has already built and is appended straight away.
   */
  const startFeature = useCallback(
    (type: FeatureType) => {
      if (!isSketchFeature(type)) {
        commitFeature(type, null)
        return
      }
      if (sketches.length === 0) {
        setNotice(`${featureLabel(type)} builds from a sketch, and this document has none yet.`)
        return
      }
      setSurface('model')
      setSelection(EMPTY_SELECTION)
      // Pre-armed with nothing, deliberately. Offering the last sketch as a
      // default is the same guess in a friendlier coat: the user would confirm
      // it without reading it, which is how the wrong profile gets extruded.
      setPendingFeature({ type, sketchId: null })
    },
    [commitFeature, sketches],
  )

  const cancelPendingFeature = useCallback(() => {
    setPendingFeature(null)
    setSelection(EMPTY_SELECTION)
  }, [])

  const confirmPendingFeature = useCallback(() => {
    if (!pendingFeature?.sketchId) return
    commitFeature(pendingFeature.type, pendingFeature.sketchId)
    setPendingFeature(null)
    setSelection(EMPTY_SELECTION)
  }, [commitFeature, pendingFeature])

  /**
   * Opens a sketch on a base plane for drawing, adding one if the plane has
   * none going yet.
   *
   * An untouched sketch already on that plane is reopened rather than shadowed
   * by a second one. A new document arrives with a blank sketch on XY, so
   * clicking XY in the viewport — the very first thing this workflow asks of a
   * user — would otherwise leave a dead "Sketch 1" behind every time. Only
   * empty sketches are reused: one with geometry in it is someone's work, and
   * the plane can hold as many of those as they like.
   */
  const addSketch = useCallback(
    (plane: SketchPlane) => {
      const support = originPlaneSupport(plane)
      const reusable = sketches.find(
        (entry) => entry.entities.size === 0 && sameSupport(entry.support, support),
      )
      const sketch = reusable ?? createSketchOn(support, nextSketchName(sketches))
      if (!reusable) sketches.push(sketch)
      setSelectedSketchId(sketch.id)
      setSurface('sketch')
      touch(reusable ? `Open ${sketch.name}` : `Add sketch on ${plane}`)
    },
    [sketches, touch],
  )

  /**
   * Adds a sketch attached to a face of a built solid.
   *
   * The reference is the body and face id *plus* a fingerprint of the face as it
   * stands right now — its plane, its size, and whether it is the outermost face
   * pointing that way. Both backends derive a face id from where the face is, so
   * the id alone stops naming anything the moment an upstream feature moves it;
   * the fingerprint is what lets the rebuild recognise the same face again, and
   * what lets it refuse rather than land the sketch on a different one.
   */
  const addSketchOnFace = useCallback(
    (bodyId: string, faceId: string) => {
      const body = allBodies.find((candidate) => candidate.id === bodyId)
      const reference = body ? faceReference(surveyMeshFaces(body.mesh), faceId) : null
      const support = faceSupport(bodyId, faceId, 0, reference?.fingerprint)
      const reusable = sketches.find(
        (entry) => entry.entities.size === 0 && sameSupport(entry.support, support),
      )
      const sketch = reusable ?? createSketchOn(support, nextSketchName(sketches))
      if (!reusable) sketches.push(sketch)

      // The face's own outline, brought into the sketch as construction
      // geometry. Without it the first thing anyone does on a face is guess
      // where its edges are; with it they can snap and dimension to the real
      // boundary. Construction, so it can never be mistaken for a profile.
      let projection: string | null = null
      if (body && sketch.entities.size === 0) {
        const placed = resolveOverlayFrame(sketch, allBodies)
        if (placed.status !== 'ok') {
          projection = placed.reason
        } else {
          const result = projectFaceBoundary(sketch, body.mesh, faceId, placed.frame)
          // Not a failure of the model, and not something to paper over: this
          // backend could not hand back a boundary for that face, and the
          // sketch opens without one rather than with an invented rectangle.
          if (result.status !== 'ok') projection = result.reason
        }
      }

      setSelectedSketchId(sketch.id)
      setSurface('sketch')
      setNotice(
        projection === null
          ? null
          : `${sketch.name} opened without the face outline projected into it — ${projection}.`,
      )
      touch(reusable ? `Open ${sketch.name}` : 'Add sketch on a face')
    },
    [allBodies, sketches, touch],
  )

  /** The same, from the browser's picker, whose value packs both ids into one string. */
  const addFaceSketch = useCallback(() => {
    const face = parseFaceTarget(faceTarget)
    if (!face) return
    addSketchOnFace(face.bodyId, face.faceId)
  }, [addSketchOnFace, faceTarget])

  /**
   * The support the current selection would put a sketch on, or null when it
   * would not put one anywhere.
   *
   * Exactly one thing, and that thing an origin plane or a planar face. Two
   * faces do not describe a plane to draw on, and neither does an edge — so
   * rather than picking one of them and hoping, Create Sketch is simply not
   * available and says what it wants instead.
   */
  const selectedSupport = useMemo<SketchSupport | null>(() => {
    if (selection.length !== 1) return null
    const item = selection[0]
    if (!item) return null
    if (item.kind === 'origin-plane') return originPlaneSupport(item.plane)
    if (item.kind !== 'face') return null

    const body = allBodies.find((candidate) => candidate.id === item.bodyId)
    if (!body) return null
    const survey = surveyMeshFaces(body.mesh)
    const face = survey.find((candidate) => candidate.id === item.faceId)
    // A non-planar face has no sketch plane. The mesh derivation only ever
    // produces planes, but a B-Rep backend does not, and this is where that
    // difference has to be respected rather than assumed away.
    if (!face || (face.kind !== undefined && face.kind !== 'plane')) return null
    return faceSupport(
      item.bodyId,
      item.faceId,
      0,
      faceReference(survey, item.faceId)?.fingerprint,
    )
  }, [allBodies, selection])

  /** Why Create Sketch is unavailable, for the button that is offering it. */
  const createSketchHint = useMemo(() => {
    if (selectedSupport) return `Start a sketch on the ${describeSupport(selectedSupport)}`
    if (selection.length === 0) return 'Select an origin plane or a planar face first'
    if (selection.length > 1) return 'Select just one origin plane or planar face'
    return 'A sketch needs an origin plane or a planar face to sit on'
  }, [selectedSupport, selection])

  /**
   * Starts a sketch on whatever is selected. The one explicit way a pick in the
   * viewport turns into a sketch — pressed by name, never inferred from a click.
   */
  const createSketchFromSelection = useCallback(() => {
    const support = selectedSupport
    if (!support) {
      setNotice(createSketchHint)
      return
    }
    if (isOriginPlaneSupport(support)) addSketch(support.plane)
    else addSketchOnFace(support.bodyId, support.faceId)
  }, [addSketch, addSketchOnFace, createSketchHint, selectedSupport])

  /**
   * What choosing a sketch in the browser or the timeline means.
   *
   * Normally: open it for drawing. While a command is waiting for one, it means
   * "this is the sketch" instead — the same row, answering the question that is
   * actually on screen. Anything else would make the user hunt for a second,
   * command-specific list of the sketches they can already see.
   */
  const selectSketch = useCallback(
    (sketchId: string) => {
      if (pendingFeature) {
        setPendingFeature({ ...pendingFeature, sketchId })
        setSelection([{ kind: 'sketch', sketchId }])
        return
      }
      setSelectedSketchId(sketchId)
      setSurface('sketch')
    },
    [pendingFeature],
  )

  /**
   * What is picked, with a running command given first refusal on it.
   *
   * The viewport reports every pick the same way; this is where a pick made
   * while Extrude is asking for a sketch also becomes that command's answer.
   */
  const handleSelectionChange = useCallback(
    (next: readonly SelectionItem[]) => {
      setSelection(next)
      if (!pendingFeature) return
      const picked = next.find((item) => item.kind === 'sketch')
      if (picked) setPendingFeature({ ...pendingFeature, sketchId: picked.sketchId })
    },
    [pendingFeature],
  )

  /** Leaves the sketch for the 3D view. The way out, matching the way in. */
  const finishSketch = useCallback(() => setSurface('model'), [])

  const handleRenameSketch = useCallback(
    (sketchId: string, name: string) => {
      const sketch = sketches.find((entry) => entry.id === sketchId)
      if (!sketch || sketch.name === name) return
      sketch.name = name
      touch(`Rename to ${name}`)
    },
    [sketches, touch],
  )

  /**
   * Hides or shows a sketch.
   *
   * Committed like any other edit, so it is undoable and saved with the document.
   * The rebuild that follows produces the same geometry either way: what a sketch
   * contributes to a solid is its profile, and hiding it does not change that.
   */
  const handleToggleSketchVisibility = useCallback(
    (sketchId: string) => {
      const sketch = sketches.find((entry) => entry.id === sketchId)
      if (!sketch) return
      sketch.visible = !sketch.visible
      touch(`${sketch.visible ? 'Show' : 'Hide'} ${sketch.name}`)
    },
    [sketches, touch],
  )

  /**
   * Removes a sketch from the document.
   *
   * A sketch can have two very different kinds of thing depending on it: the
   * features that consume it as a profile, and the sketches attached to faces of
   * the bodies those features made. Neither is quietly repointed at something
   * else — retargeting a dependent is how a part silently becomes a different
   * part — and neither is quietly destroyed. They are named, the deletion is
   * confirmed, and what is left behind is left in a state that says it is
   * broken: the features keep their reference and fail their next rebuild with
   * "the sketch is missing from the document", which is exactly what happened.
   */
  const handleDeleteSketch = useCallback(
    (sketchId: string) => {
      const index = sketches.findIndex((entry) => entry.id === sketchId)
      const sketch = sketches[index]
      if (!sketch || index < 0) return

      const dependentFeatures = tree.features.filter((feature) =>
        sketchReferenceIds(feature).includes(sketchId),
      )
      const ownerByBody = evaluation?.ownerByBody ?? EMPTY_OWNERS
      const doomedFeatureIds = new Set(dependentFeatures.map((feature) => feature.id))
      const strandedBodyIds = new Set(
        [...ownerByBody.entries()]
          .filter(([, featureId]) => doomedFeatureIds.has(featureId))
          .map(([bodyId]) => bodyId),
      )
      const strandedSketches = sketches.filter(
        (entry) =>
          entry.id !== sketchId &&
          isFaceSupport(entry.support) &&
          strandedBodyIds.has(entry.support.bodyId),
      )

      const affected = [
        ...dependentFeatures.map((feature) => feature.name),
        ...strandedSketches.map((entry) => entry.name),
      ]
      if (affected.length > 0) {
        const confirmed = window.confirm(
          `${affected.join(', ')} ${affected.length === 1 ? 'depends' : 'depend'} on ${sketch.name}. ` +
            `Deleting it leaves ${affected.length === 1 ? 'it' : 'them'} unbuildable until you ` +
            'repoint or delete them by hand. Continue?',
        )
        if (!confirmed) return
      }

      sketches.splice(index, 1)

      // Whatever was pointing at it stops pointing at it.
      setSelection((current) =>
        current.filter((item) => item.kind !== 'sketch' || item.sketchId !== sketchId),
      )
      setPendingFeature((current) =>
        current && current.sketchId === sketchId ? { ...current, sketchId: null } : current,
      )
      if (selectedSketchId === sketchId) setSelectedSketchId(null)
      if (activeSketch?.id === sketchId) setSurface('model')

      setNotice(
        affected.length === 0
          ? `Deleted ${sketch.name}.`
          : `Deleted ${sketch.name}. ${affected.join(', ')} ${
              affected.length === 1 ? 'has' : 'have'
            } lost ${affected.length === 1 ? 'its' : 'their'} input and will report an error until you fix ${
              affected.length === 1 ? 'it' : 'them'
            }.`,
      )
      touch(`Delete ${sketch.name}`)
    },
    [activeSketch, evaluation, selectedSketchId, sketches, touch, tree],
  )

  /* ---------------------------------------------------------------------- */
  /* Body visibility                                                         */
  /* ---------------------------------------------------------------------- */

  const handleToggleBodyVisibility = useCallback((bodyId: string) => {
    setHiddenBodyIds((current) => {
      const next = new Set(current)
      if (!next.delete(bodyId)) next.add(bodyId)
      return next
    })
  }, [])

  /** Hides everything except one body. The panel header offers the way back. */
  const handleIsolateBody = useCallback(
    (bodyId: string) => {
      const others = allBodies.filter((body) => body.id !== bodyId).map((body) => body.id)
      setHiddenBodyIds(new Set(others))
      setNotice(
        others.length === 0
          ? 'That is the only body — there was nothing to isolate it from.'
          : `Isolated ${allBodies.find((body) => body.id === bodyId)?.name ?? 'that body'}. Use Show all in the browser header to bring the rest back.`,
      )
    },
    [allBodies],
  )

  const handleShowAllBodies = useCallback(() => setHiddenBodyIds(NONE_HIDDEN), [])

  /**
   * Opens the model up, or closes it again.
   *
   * A half section is the one everybody wants first, so that is what the command
   * starts; the browser's Section panel is where the mode and the offsets are
   * changed from there. Pressing it again puts the model back together, which is
   * what makes it a toggle rather than a one-way trip into a dialog.
   */
  const handleToggleSection = useCallback(() => {
    setSection((current) => setSectionMode(current, current.mode === 'off' ? 'half' : 'off'))
  }, [])

  /**
   * An edit made inside the sketch editor.
   *
   * Collapsed into one document-level step per sketch: drawing reports a change
   * on every pointer move, and a document history full of those would bury the
   * commands that actually shaped the part. The fine grain is not lost — the
   * sketch keeps its own undo stack, which is where "take that last line back"
   * belongs.
   */
  const handleSketchEdit = useCallback(() => {
    const sketchId = activeSketch?.id ?? 'none'
    touch(`Edit ${activeSketch?.name ?? 'sketch'}`, { coalesceKey: `sketch:${sketchId}` })
  }, [activeSketch, touch])

  const showSketchTool = useCallback((tool: ToolId) => {
    setSketchTool(tool)
    setSurface('sketch')
  }, [])

  const handleReorder = useCallback(
    (featureId: string, newIndex: number) => {
      const name = tree.getFeature(featureId)?.name ?? 'feature'
      if (tree.reorderFeature(featureId, newIndex)) touch(`Reorder ${name}`)
    },
    [touch, tree],
  )

  const handleReorderRefused = useCallback(
    (featureId: string, blockedBy: readonly string[]) => {
      const name = tree.getFeature(featureId)?.name ?? 'That feature'
      setNotice(
        blockedBy.length === 0
          ? `${name} cannot go there.`
          : `${name} is built on ${blockedBy.join(', ')}, so it has to stay behind ${
              blockedBy.length === 1 ? 'it' : 'them'
            }.`,
      )
    },
    [tree],
  )

  const handleToggleSuppress = useCallback(
    (featureId: string) => {
      const feature = tree.getFeature(featureId)
      if (!feature) return
      const suppressing = !feature.suppressed
      if (suppressing) tree.suppressFeature(featureId)
      else tree.unsuppressFeature(featureId)
      touch(`${suppressing ? 'Suppress' : 'Unsuppress'} ${feature.name}`)
    },
    [touch, tree],
  )

  const handleDelete = useCallback(
    (featureId: string) => {
      const feature = tree.getFeature(featureId)
      if (!feature) return
      // Deleting a feature takes everything built on it. That is the only
      // consistent thing to do — the dependents have lost their input — but it
      // is not what a user expects from one click, so it is asked for first.
      const dependents = tree.getDependents(featureId)
      if (dependents.length > 0) {
        const names = dependents.map((child) => child.name).join(', ')
        const confirmed = window.confirm(
          `${names} ${dependents.length === 1 ? 'is' : 'are'} built on ${feature.name}. ` +
            `Deleting it removes ${dependents.length === 1 ? 'that too' : 'those too'}. Continue?`,
        )
        if (!confirmed) return
      }

      const removed = tree.removeFeature(featureId)
      if (removed.length === 0) return
      setSelectedFeatureId((current) => (current && removed.includes(current) ? null : current))
      if (dependents.length > 0) {
        setNotice(`Deleted ${feature.name} and ${dependents.length} feature(s) built on it.`)
      }
      touch(`Delete ${feature.name}`)
    },
    [touch, tree],
  )

  const handleRename = useCallback(
    (featureId: string, featureName: string) => {
      if (tree.renameFeature(featureId, featureName)) touch(`Rename ${featureName}`)
    },
    [touch, tree],
  )

  const handleRollBar = useCallback(
    (index: number) => {
      tree.moveRollBar(index)
      touch('Move the roll bar', { coalesceKey: 'roll-bar' })
    },
    [touch, tree],
  )

  /**
   * Arms or disarms a selection field.
   *
   * Arming clears what was picked: the selection standing when a field is armed
   * was made for something else, and silently folding it into this feature is
   * how a fillet ends up rounding an edge nobody chose for it.
   */
  const handlePickKindChange = useCallback(
    (kind: SelectionKind | null) => {
      if (kind === null) {
        setPicking(null)
        return
      }
      const field = selectedFeature
        ? parameterFields(selectedFeature.featureType).find(
            (candidate) => candidate.kind === 'selection' && candidate.select === kind,
          )
        : undefined
      if (!field) return
      setPicking({ key: field.key, kind })
      setSelection(EMPTY_SELECTION)
      setSurface('model')
    },
    [selectedFeature],
  )

  /**
   * What the viewport lets a click land on.
   *
   * While a field is armed, only what that field takes — otherwise picking an
   * edge means hitting a line one pixel wide with a face right behind it.
   */
  const pickable = useMemo<readonly SelectionKind[]>(
    () =>
      picking
        ? [picking.kind]
        : pendingFeature
          ? SKETCH_ONLY_PICKABLE
          : DEFAULT_PICKABLE,
    [pendingFeature, picking],
  )

  const handleParameterChange = useCallback(
    (featureId: string, changes: FeatureParameters) => {
      const feature = tree.getFeature(featureId)
      if (!feature) return
      // A picked face or edge is recorded twice: the bare identifier the kernels
      // take, and a fingerprint of the geometry it was picked on. Doing it here
      // rather than in the panel is what keeps the panel unaware of bodies — and
      // here is the only place that holds the meshes the fingerprint is taken
      // from. Without it the rebuild could only trust the identifier, which an
      // upstream edit silently reassigns.
      feature.setParameters(withGeometryReferences(changes, allBodies))
      // Coalesced per feature: a number field fires on every keystroke, and
      // undo should take back the edit rather than one digit of it.
      touch(`Edit ${feature.name}`, { coalesceKey: `parameters:${featureId}` })
    },
    [allBodies, touch, tree],
  )

  /* ---------------------------------------------------------------------- */
  /* Ribbon                                                                  */
  /* ---------------------------------------------------------------------- */

  const drawing = surface === 'sketch'

  const modelTabs = useMemo(
    () =>
      // `modelWorkspaceTabs` builds a list of commands; it does not run one. The
      // rule cannot see that, so passing it `addFeature` — which reaches the
      // document title through a ref, several calls down, when a button is
      // actually pressed — reads to it as a ref being dereferenced during
      // render. Every handler in this object is stored in a closure and invoked
      // from a click, which is exactly where a ref is meant to be read.
      // eslint-disable-next-line react-hooks/refs
      modelWorkspaceTabs({
        hasSketch: sketches.length > 0,
        hasBodies: allBodies.length > 0,
        missingCapabilities: missing,
        backend,
        onFeature: startFeature,
        onCreateSketch: createSketchFromSelection,
        canCreateSketch: selectedSupport !== null,
        createSketchHint,
        onExport: () => setExportOpen(true),
        onSection: handleToggleSection,
        sectionActive: section.mode !== 'off',
      }),
    [
      allBodies.length,
      backend,
      createSketchFromSelection,
      createSketchHint,
      handleToggleSection,
      missing,
      section.mode,
      selectedSupport,
      sketches.length,
      startFeature,
    ],
  )

  const sketchTabs = useMemo(
    () => sketchWorkspaceTabs({ activeTool: sketchTool, onSelectTool: setSketchTool }),
    [sketchTool],
  )

  /* ---------------------------------------------------------------------- */
  /* Commands and shortcuts                                                  */
  /* ---------------------------------------------------------------------- */

  const commands = useMemo<readonly Command[]>(
    () => [
      { id: 'file:save', title: 'Save Document', category: 'File', shortcut: 'Ctrl+S', run: handleSave },
      {
        id: 'file:export',
        title: 'Export As…',
        category: 'File',
        shortcut: 'Ctrl+E',
        run: () => setExportOpen(true),
      },
      { id: 'file:close', title: 'Close Document', category: 'File', run: onClose },
      {
        id: 'edit:undo',
        title: 'Undo',
        category: 'Edit',
        shortcut: 'Ctrl+Z',
        run: handleUndo,
      },
      {
        id: 'edit:redo',
        title: 'Redo',
        category: 'Edit',
        shortcut: 'Ctrl+Shift+Z',
        run: handleRedo,
      },
      // No "show the sketch surface" counterpart: opening a sketch means naming
      // one, which the plane, face and sketch-tool commands below all do.
      { id: 'view:model', title: 'Finish Sketch', category: 'View', run: finishSketch },
      { id: 'view:fit', title: 'Fit View', category: 'View', shortcut: 'F', run: requestFit },
      {
        id: 'sketch:create',
        title: 'Create Sketch',
        category: 'Sketch',
        run: createSketchFromSelection,
      },
      ...ORIGIN_PLANES.map((plane) => ({
        id: `sketch:new:${plane}`,
        title: `New Sketch on ${plane}`,
        category: 'Sketch',
        run: () => addSketch(plane),
      })),
      ...SKETCH_TOOLS.map((definition) => ({
        id: `sketch:${definition.id}`,
        title: `${definition.label} Tool`,
        category: 'Sketch',
        ...(definition.shortcut ? { shortcut: definition.shortcut } : {}),
        run: () => showSketchTool(definition.id),
      })),
      // Every feature kind the tree accepts, so the palette is the complete
      // catalogue rather than a hand-picked subset that drifts out of date.
      ...FEATURE_TYPES.map((type) => ({
        id: `feature:${type}`,
        title: featureLabel(type),
        category: isSheetMetalFeature(type)
          ? 'Sheet metal'
          : isSurfaceFeature(type)
            ? 'Surface'
            : 'Model',
        ...(FEATURE_SHORTCUTS[type] ? { shortcut: FEATURE_SHORTCUTS[type] } : {}),
        run: () => startFeature(type),
      })),
    ],
    [
      addSketch,
      createSketchFromSelection,
      finishSketch,
      handleRedo,
      handleSave,
      handleUndo,
      onClose,
      showSketchTool,
      startFeature,
    ],
  )

  useEffect(() => {
    onCommandsChange?.(commands)
    // The editor's commands are only runnable while it is on screen.
    return () => onCommandsChange?.([])
  }, [commands, onCommandsChange])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT' || target?.isContentEditable) {
        return
      }

      // Undo and redo are surface-scoped on purpose. Inside a sketch the same
      // chord belongs to the sketch's own stack — "take that line back" is what
      // a user means there, and the sketch editor answers it. In 3D there is no
      // competing meaning, so it drives the document history.
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase()
        if (surface === 'model' && (key === 'z' || key === 'y')) {
          event.preventDefault()
          if (key === 'y' || event.shiftKey) handleRedo()
          else handleUndo()
          return
        }
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        const key = event.key.toLowerCase()
        if (key === 's') {
          event.preventDefault()
          handleSave()
        } else if (key === 'e') {
          event.preventDefault()
          setExportOpen(true)
        }
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === 'Escape') {
        // A running command comes first: Escape is how anyone gets out of a
        // selection mode, and clearing the feature selection underneath it
        // would leave the command still on screen and still waiting.
        if (pendingFeature) {
          event.preventDefault()
          cancelPendingFeature()
          return
        }
        setSelectedFeatureId(null)
        return
      }
      // Only in the 3D surface: in a sketch the same key deletes geometry.
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (surface !== 'model') return
        if (selectedFeatureId) {
          event.preventDefault()
          handleDelete(selectedFeatureId)
          return
        }
        // Nothing in the tree is picked, so a picked sketch is what Delete
        // means. Deliberately second: a feature selection is the more specific
        // statement of what the user is working on.
        const pickedSketch = selection.find((item) => item.kind === 'sketch')
        if (pickedSketch) {
          event.preventDefault()
          handleDeleteSketch(pickedSketch.sketchId)
        }
        return
      }

      const type = FEATURE_BY_KEY.get(event.key.toLowerCase())
      if (type) {
        event.preventDefault()
        // The same command the ribbon runs, selection input and all. A bare
        // letter must not be a shortcut past the question the button asks.
        startFeature(type)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    cancelPendingFeature,
    handleDelete,
    handleDeleteSketch,
    handleRedo,
    handleSave,
    handleUndo,
    pendingFeature,
    selectedFeatureId,
    selection,
    startFeature,
    surface,
  ])

  /* ---------------------------------------------------------------------- */
  /* Status bar                                                              */
  /* ---------------------------------------------------------------------- */

  const statusItems = useMemo<StatusItem[]>(() => {
    const bodyCount = countBodies(document) + modelledBodies.length
    const items: StatusItem[] = [
      { id: 'parts', label: plural(document.parts.length, 'part') },
      { id: 'bodies', label: plural(bodyCount, 'body', 'bodies') },
      { id: 'triangles', label: plural(triangles, 'triangle') },
      { id: 'units', label: document.metadata.units, title: 'The unit every length in this document is expressed in' },
    ]
    if (hiddenBodyIds.size > 0) {
      items.push({
        id: 'hidden',
        label: `${hiddenBodyIds.size} hidden`,
        icon: 'eye-off',
        tone: 'warning',
        title: 'Hidden bodies are still in the document, and still exported.',
      })
    }
    if (selection.length > 0) {
      items.push({ id: 'selection', label: `${selection.length} selected`, tone: 'accent' })
    }
    // A sketch that cannot be placed draws nothing in 3D, and a viewport that is
    // quietly missing a sketch looks exactly like one whose sketch is empty.
    if (overlayResult.problems.length > 0) {
      items.push({
        id: 'sketch-overlays',
        label: plural(overlayResult.problems.length, 'sketch not placed', 'sketches not placed'),
        icon: 'warning',
        tone: 'warning',
        title: overlayResult.problems.map((problem) => problem.reason).join('\n'),
      })
    }
    if (evaluation && evaluation.failures.length > 0) {
      items.push({
        id: 'failures',
        label: plural(evaluation.failures.length, 'feature error'),
        icon: 'warning',
        tone: 'error',
      })
    }
    return items
  }, [
    document,
    evaluation,
    hiddenBodyIds,
    modelledBodies,
    overlayResult,
    selection,
    triangles,
  ])

  return (
    <div className="editor">
      <AppBar
        documentName={name}
        onRenameDocument={handleRenameDocument}
        modified={modified}
        undoLabel={historyState.undo}
        redoLabel={historyState.redo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        actions={
          <>
            {onNewDocument ? (
              <IconButton icon="file-new" label="New Document" showLabel onClick={onNewDocument} />
            ) : null}
            <IconButton icon="save" label="Save" showLabel title="Save (Ctrl+S)" onClick={handleSave} />
            {/* No Export here: it is a command with a home already, in the
                ribbon's Make group, and the same word on two buttons at once is
                two things to choose between where there is only one action. */}
            <IconButton icon="close" label="Close" tone="danger" onClick={onClose} />
          </>
        }
      />

      {/* One ribbon, two personalities. In 3D it offers the modelling
          environments; the moment a sketch is open it becomes the sketch's own
          toolset with the way out pinned to the right. That swap is the whole of
          what makes sketching feel like a mode rather than a panel. */}
      {drawing ? (
        <Ribbon
          // The modelling workspaces stay in the strip while drawing, so the
          // shape of the application does not change under the user. Choosing
          // one is a way out of the sketch as much as the Finish button is —
          // wanting the Solid tab *is* wanting to be done drawing — so it
          // closes the sketch rather than leaving a modelling ribbon hovering
          // over a canvas that ignores it.
          tabs={[...sketchTabs, ...modelTabs]}
          activeTabId="sketch"
          onTabChange={(id) => {
            if (id === 'sketch') return
            setWorkspaceTab(id)
            finishSketch()
          }}
          label="Workspace"
          commandsRole="toolbar"
          commandsLabel="Sketch tools"
          trailing={
            <button type="button" className="editor__finish" onClick={finishSketch}>
              <Icon name="sketch-finish" size={16} />
              Finish Sketch
            </button>
          }
        />
      ) : (
        <Ribbon
          tabs={modelTabs}
          activeTabId={workspaceTab}
          onTabChange={setWorkspaceTab}
          label="Workspace"
        />
      )}

      <div className="editor__body">
        <BrowserPanel
          document={{ name, parts: document.parts }}
          origin={{
            planes: ORIGIN_PLANES,
            activePlane,
            onNewSketch: addSketch,
          }}
          sketches={{
            sketches,
            selectedId: pendingFeature ? pendingSketch?.id ?? null : activeSketch?.id ?? null,
            onSelect: selectSketch,
            onToggleVisibility: handleToggleSketchVisibility,
            onDelete: handleDeleteSketch,
            faceGroups,
            faceTarget,
            onFaceTargetChange: setFaceTarget,
            onAddFaceSketch: addFaceSketch,
          }}
          bodies={{
            bodies: modelledBodies,
            ownerByBody: evaluation?.ownerByBody ?? EMPTY_OWNERS,
            featureName: featureNameOf,
            hiddenIds: hiddenBodyIds,
            onToggleVisibility: handleToggleBodyVisibility,
            onIsolate: handleIsolateBody,
            onShowAll: handleShowAllBodies,
          }}
          history={{
            tree,
            selectedFeatureId,
            onSelectFeature: setSelectedFeatureId,
            onRenameSketch: handleRenameSketch,
            onReorder: handleReorder,
            onReorderRefused: handleReorderRefused,
            onToggleSuppress: handleToggleSuppress,
            onDelete: handleDelete,
            onRename: handleRename,
            onRollBarChange: handleRollBar,
          }}
          section={
            allBodies.length > 0
              ? { section, onChange: setSection, extent: sectionExtent }
              : null
          }
          selection={selection}
          onSelectionChange={handleSelectionChange}
        />

        {/* Both surfaces stay mounted so switching keeps their state and the
            3D viewport does not have to rebuild its scene. The HUD sits over
            whichever one is showing, so it never has to be drawn twice. */}
        <div className="editor__stage">
          <section className="editor__surface" hidden={!drawing}>
            {activeSketch ? (
              <SketchEditor
                model={activeSketch}
                onChange={handleSketchEdit}
                tool={sketchTool}
                onToolChange={setSketchTool}
                active={drawing}
                // The ribbon above is the tool palette now. Leaving the editor's
                // own strip on screen would be the same sixteen tools twice.
                showToolbar={false}
              />
            ) : (
              <p className="editor__empty">
                This document has no sketches. Add one from the Browser to start drawing.
              </p>
            )}
          </section>
          <section className="editor__surface" hidden={drawing}>
            <ThreeViewport
              meshes={meshes}
              bodyIds={bodyIds}
              bodyNames={bodyNames}
              active={!drawing}
              originPlanes={visiblePlanes}
              selectedPlane={activePlane}
              sketchOverlays={overlayResult.overlays}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              pickable={pickable}
              clipPlane={clipPlanes}
              fitRequest={fitRequest}
            />

            {/* The running command, over the scene it is picking from. */}
            {pendingFeature ? (
              <CommandDialog
                title={featureLabel(pendingFeature.type)}
                prompt={`Select the sketch to ${featureLabel(pendingFeature.type).toLowerCase()}. Click its outline in the 3D view, or pick it from the browser, the timeline or the list below.`}
                emptyLabel="No sketch selected yet."
                chips={
                  pendingSketch
                    ? [
                        {
                          id: pendingSketch.id,
                          label: `${pendingSketch.name} — ${describeSupport(pendingSketch.support)}`,
                          onRemove: () =>
                            setPendingFeature({ ...pendingFeature, sketchId: null }),
                        },
                      ]
                    : []
                }
                canConfirm={pendingSketch !== null}
                onConfirm={confirmPendingFeature}
                onCancel={cancelPendingFeature}
              >
                {/* The chooser. On a document with one sketch it is a formality;
                    on one with six it is the only way to tell them apart
                    without hunting through the scene. */}
                <select
                  className="command-dialog__select"
                  aria-label={`Sketch to ${featureLabel(pendingFeature.type).toLowerCase()}`}
                  value={pendingFeature.sketchId ?? ''}
                  onChange={(event) => {
                    const sketchId = event.target.value
                    setPendingFeature({ ...pendingFeature, sketchId: sketchId || null })
                    setSelection(sketchId ? [{ kind: 'sketch', sketchId }] : EMPTY_SELECTION)
                  }}
                >
                  <option value="">Choose a sketch…</option>
                  {sketches.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} — {describeSupport(entry.support)}
                    </option>
                  ))}
                </select>
              </CommandDialog>
            ) : null}
          </section>

          <ViewportHud
            mode={drawing ? 'sketch' : 'model'}
            sketchName={activeSketch?.name}
            toolLabel={drawing ? toolDefinition(sketchTool).label : undefined}
            selectionCount={selection.length}
            pickingKind={picking?.kind ?? null}
            // Only the drawing tool's own hint. In 3D the origin legend along
            // the bottom of the scene already says "click a plane to start a
            // sketch", right where the planes are; repeating it up here would be
            // the same sentence twice on one screen.
            hint={drawing ? toolDefinition(sketchTool).hint : undefined}
          />
        </div>

        <InspectorPanel
          document={document}
          stats={{
            parts: document.parts.length,
            bodies: countBodies(document) + modelledBodies.length,
            triangles,
          }}
          backend={backend}
          missingCapabilities={missing}
          kernelFallbacks={kernelFallbacks}
          feature={selectedFeature}
          computed={computed}
          onParameterChange={handleParameterChange}
          activePickKey={picking?.key ?? null}
          onPickKindChange={handlePickKindChange}
          selection={selection}
          onSelectionChange={handleSelectionChange}
          bodyName={bodyNameOf}
          sketchName={sketchNameOf}
          sketch={activeSketch}
          drawing={drawing}
          onOpenSketch={selectSketch}
          onToggleSketchVisibility={handleToggleSketchVisibility}
          onDeleteSketch={handleDeleteSketch}
          canCreateSketch={selectedSupport !== null}
          createSketchHint={createSketchHint}
          onCreateSketch={createSketchFromSelection}
        />
      </div>

      {notice ? (
        <div className="editor__notice" role="status">
          <Icon name="warning" size={14} />
          <span>{notice}</span>
          <button
            type="button"
            className="editor__notice-close"
            aria-label="Dismiss notice"
            onClick={() => setNotice(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      <TimelineBar
        tree={tree}
        sketches={sketches}
        selectedFeatureId={selectedFeatureId}
        selectedSketchId={pendingFeature ? (pendingSketch?.id ?? null) : (activeSketch?.id ?? null)}
        onSelectFeature={setSelectedFeatureId}
        onSelectSketch={selectSketch}
        collapsed={timelineCollapsed}
        onToggleCollapsed={() => setTimelineCollapsed((collapsed) => !collapsed)}
      />

      <StatusBar
        items={statusItems}
        trailing={
          // Which engine the geometry above actually came out of. A stub result
          // and a B-Rep result look alike on screen and are not alike at all, so
          // the backend is named rather than assumed.
          <span
            className={`statusbar__item${missing.length > 0 ? ' statusbar__item--warning' : ''}`}
            title={backendTitle(backend, kernelFallbacks, missing)}
          >
            <Icon name="kernel" size={13} />
            Kernel: {backend}
            {missing.length > 0 ? ' (limited)' : ''}
          </span>
        }
      />

      {/* Mounted only while it is on screen. Its source is the document as it
          stands right now, and composing that means serialising every sketch —
          not something to repeat on each pointer move. The title is passed from
          state rather than left to `compose`'s ref-backed default: during a
          render the state *is* the current name, and the ref exists for the
          callers that run after one. */}
      {exportOpen ? (
        <ExportDialog
          open
          source={{ document: compose(name), bodies: allBodies, sketch: activeSketch }}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </div>
  )
}

/** "1 part", "2 parts" — a count that reads like English rather than like a log. */
function plural(count: number, singular: string, many?: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : (many ?? `${singular}s`)}`
}

/**
 * A parameter change with fingerprinted references added for any face or edge
 * list it carries.
 *
 * Changes that name no geometry pass through untouched, so a number field costs
 * nothing. A list that is cleared writes an empty reference list rather than
 * leaving the old one behind, which is what keeps the two from disagreeing.
 */
function withGeometryReferences(
  changes: FeatureParameters,
  bodies: readonly Body[],
): FeatureParameters {
  let patched = changes
  for (const kind of GEOMETRY_KINDS) {
    const value = changes[ID_KEYS[kind]]
    if (value === undefined) continue
    const ids = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : typeof value === 'string' && value !== ''
        ? [value]
        : []
    patched = { ...patched, ...referencePatch(bodies, kind, ids), [ID_KEYS[kind]]: value }
  }
  return patched
}

const GEOMETRY_KINDS: readonly GeometryKind[] = ['face', 'edge']

/**
 * The whole truth about the backend, for the status bar's tooltip: what is
 * running, what could not be loaded, and what this one cannot do.
 */
function backendTitle(
  backend: string,
  fallbacks: readonly string[],
  missing: readonly KernelCapability[],
): string {
  const lines = [`Modelling on the "${backend}" geometry kernel.`]
  if (fallbacks.length > 0) lines.push(...fallbacks)
  if (missing.length > 0) {
    lines.push(`Not available on this backend: ${missing.join(', ')}.`)
  }
  return lines.join('\n')
}

/** What the last rebuild made of the selected feature, as read-only rows. */
function computedValues(
  evaluation: FeatureEvaluation | null,
  featureId: string | null,
): ComputedValue[] {
  if (!evaluation || !featureId) return []
  const bodies = evaluation.bodiesByFeature.get(featureId) ?? []
  const triangles = bodies.reduce((total, body) => total + triangleCount(body.mesh), 0)
  return [
    { label: 'Bodies', value: String(bodies.length) },
    { label: 'Triangles', value: triangles.toLocaleString() },
  ]
}
