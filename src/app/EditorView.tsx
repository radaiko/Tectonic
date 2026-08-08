import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
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
import type { IKernel, KernelCapability } from '../kernel/IKernel'
import { missingCapabilities } from '../kernel/IKernel'
import { faceReference, surveyMeshFaces } from '../kernel/references'
import { StubKernel } from '../kernel/StubKernel'
import { SketchEditor } from '../sketch/SketchEditor'
import type { SketchPlane } from '../sketch/domain/SketchSupport'
import {
  ORIGIN_PLANES,
  describeSupport,
  faceSupport,
  isOriginPlaneSupport,
  originPlaneSupport,
  sameSupport,
} from '../sketch/domain/SketchSupport'
import type { ToolId } from '../sketch/tools/SketchTool'
import { SKETCH_TOOLS } from '../sketch/tools/registry'
import { BodyBrowserPanel } from '../ui/BodyBrowserPanel'
import { Button } from '../ui/Button'
import type { Command } from '../ui/commands'
import { FeaturePropertiesPanel } from '../ui/FeaturePropertiesPanel'
import type { ComputedValue } from '../ui/FeaturePropertiesPanel'
import { FeatureTreePanel } from '../ui/FeatureTreePanel'
import { SectionControls } from '../ui/SectionControls'
import type { SectionState } from '../view/section'
import { createSectionState, sectionPlanes } from '../view/section'
import type { SelectionItem, SelectionKind } from '../view/selection'
import { EMPTY_SELECTION } from '../view/selection'
import { ExportDialog } from './ExportDialog'
import { parseFaceTarget, planarFaceGroups } from './planarFaces'
import './EditorView.css'

/**
 * Features reachable by a bare letter. Everything else in the tree is added
 * from the command palette, which is where the full list lives.
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
/**
 * What a click can land on when no command has narrowed it: the origin planes
 * of an empty document, then faces, then edges. Faces first because they are by
 * far the easier target — an edge is reached by arming a field that wants one.
 */
const DEFAULT_PICKABLE: readonly SelectionKind[] = ['origin-plane', 'face', 'edge']

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
  // Held here rather than inside the sketch editor so the palette can switch
  // tools without the sketch having to be on screen already.
  const [sketchTool, setSketchTool] = useState<ToolId>('select')
  const [exportOpen, setExportOpen] = useState(false)
  const [faceTarget, setFaceTarget] = useState<string>('')
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
   * The selection field currently taking picks, and what it wants. Arming a
   * field narrows the viewport to that kind, which is the only way a
   * one-pixel-wide edge is a realistic target.
   */
  const [picking, setPicking] = useState<{ key: string; kind: SelectionKind } | null>(null)

  const activeSketch =
    sketches.find((entry) => entry.id === selectedSketchId) ?? sketches[0] ?? null

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
  const meshes: MeshData[] = useMemo(() => allBodies.map((body) => body.mesh), [allBodies])
  // Built from the same array, right here, so the two stay index-aligned. This
  // is what lets a click on a solid in the viewport name the face it landed on.
  const bodyIds: string[] = useMemo(() => allBodies.map((body) => body.id), [allBodies])
  const bodyNames: string[] = useMemo(() => allBodies.map((body) => body.name), [allBodies])
  const triangles = useMemo(
    () => meshes.reduce((total, mesh) => total + triangleCount(mesh), 0),
    [meshes],
  )

  /** Faces a new sketch can be attached to. Empty until something is built. */
  const faceGroups = useMemo(() => planarFaceGroups(allBodies), [allBodies])

  /** How a feature id reads on screen, for anything that only holds the id. */
  const featureNameOf = useCallback(
    (featureId: string) => tree.getFeature(featureId)?.name,
    [tree],
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
   * sketch on a plane from then on goes through the sidebar, which never leaves.
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
   * Appends a feature of the given kind and shows it. Kinds that consume a
   * profile are pointed at the selected sketch — not at an implicit singleton —
   * so which sketch gets built is the one the user picked. The rest work off
   * whatever the tree has built so far.
   */
  const addFeature = useCallback(
    (type: FeatureType) => {
      const sketch = isSketchFeature(type) ? (activeSketch ?? null) : null
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
    [activeSketch, evaluation, touch, tree],
  )

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
      setSelectedSketchId(sketch.id)
      setSurface('sketch')
      touch(reusable ? `Open ${sketch.name}` : 'Add sketch on a face')
    },
    [allBodies, sketches, touch],
  )

  /** The same, from the sidebar picker, whose value packs both ids into one string. */
  const addFaceSketch = useCallback(
    (target: string) => {
      const face = parseFaceTarget(target)
      if (!face) return
      addSketchOnFace(face.bodyId, face.faceId)
    },
    [addSketchOnFace],
  )

  const selectSketch = useCallback((sketchId: string) => {
    setSelectedSketchId(sketchId)
    setSurface('sketch')
  }, [])

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

  const handleExtrude = useCallback(() => addFeature(FeatureType.Extrude), [addFeature])

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
    () => (picking ? [picking.kind] : DEFAULT_PICKABLE),
    [picking],
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
      { id: 'view:model', title: 'Show 3D Surface', category: 'View', run: () => setSurface('model') },
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
        run: () => addFeature(type),
      })),
    ],
    [addFeature, addSketch, handleRedo, handleSave, handleUndo, onClose, showSketchTool],
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
        setSelectedFeatureId(null)
        return
      }
      // Only in the 3D surface: in a sketch the same key deletes geometry.
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (surface === 'model' && selectedFeatureId) {
          event.preventDefault()
          handleDelete(selectedFeatureId)
        }
        return
      }

      const type = FEATURE_BY_KEY.get(event.key.toLowerCase())
      if (type) {
        event.preventDefault()
        addFeature(type)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    addFeature,
    handleDelete,
    handleRedo,
    handleSave,
    handleUndo,
    selectedFeatureId,
    surface,
  ])

  return (
    <div className="editor">
      <header className="editor__bar">
        <span className="editor__brand">Tectonic</span>
        <input
          className="editor__doc"
          aria-label="Document name"
          value={name}
          onChange={(event) => handleRenameDocument(event.target.value)}
        />
        <span className="editor__modified">{modified ? 'Modified' : 'Saved'}</span>
        {/* Named rather than bare arrows: knowing *what* a click will take back
            is the difference between using undo and being afraid of it. */}
        <div className="editor__history" role="group" aria-label="Document history">
          <Button
            variant="ghost"
            onClick={handleUndo}
            disabled={historyState.undo === null}
            title={historyState.undo ? `Undo ${historyState.undo}` : 'Nothing to undo'}
          >
            Undo
          </Button>
          <Button
            variant="ghost"
            onClick={handleRedo}
            disabled={historyState.redo === null}
            title={historyState.redo ? `Redo ${historyState.redo}` : 'Nothing to redo'}
          >
            Redo
          </Button>
        </div>
        <div className="editor__spacer" />
        {/* Shown on both surfaces: building a feature drops the user in the 3D
            view, and hiding the primary action there made the next step look
            unavailable. Disabled — not absent — when there is no sketch. */}
        <Button variant="primary" onClick={handleExtrude} disabled={activeSketch === null}>
          Extrude
        </Button>
        {/* Only the way back. A sketch is *entered* by choosing what it sits on
            — an origin plane or a planar face, in the viewport or the panel —
            so a header button that opened "the sketch surface" without asking
            which sketch was a second, contradictory way in. */}
        <div className="editor__surfaces" role="group" aria-label="Editing surface">
          <Button
            variant={surface === 'model' ? 'primary' : 'ghost'}
            aria-pressed={surface === 'model'}
            onClick={() => setSurface('model')}
          >
            3D
          </Button>
        </div>
        {onNewDocument ? (
          <Button variant="ghost" onClick={onNewDocument}>
            New Document
          </Button>
        ) : null}
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={() => setExportOpen(true)}>Export</Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </header>

      <div className="editor__body">
        <aside className="editor__panel">
          {/* The history holds the sketches as well as the features now, so it is
              shown on both surfaces: which sketch you are drawing on, and where
              it sits in the build, is as much a 2D question as a 3D one. */}
          <div className="editor__panel-grow">
            <FeatureTreePanel
              tree={tree}
              sketches={sketches}
              selectedFeatureId={selectedFeatureId}
              selectedSketchId={activeSketch?.id ?? null}
              onSelect={setSelectedFeatureId}
              onSelectSketch={selectSketch}
              onRenameSketch={handleRenameSketch}
              onToggleSketchVisibility={handleToggleSketchVisibility}
              onReorder={handleReorder}
              onReorderRefused={handleReorderRefused}
              onToggleSuppress={handleToggleSuppress}
              onDelete={handleDelete}
              onRename={handleRename}
              onRollBarChange={handleRollBar}
            />
          </div>

          {/* Sketch sources sit outside the surface switch on purpose. Starting
              a sketch is the one thing a user needs from the 3D view as much as
              from the 2D one — and since every feature ends by switching to 3D,
              keeping these here is what stops the build from dead-ending. */}
          <h2 className="editor__panel-title">Sketches</h2>
          {sketches.length === 0 ? (
            <p className="editor__empty">No sketches yet.</p>
          ) : (
            <ul className="editor__tree" aria-label="Sketches">
              {sketches.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="editor__node editor__node--sketch"
                    aria-pressed={entry.id === activeSketch?.id}
                    onClick={() => selectSketch(entry.id)}
                  >
                    <span>{entry.name}</span>
                    <span className="editor__node-detail">{describeSupport(entry.support)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="editor__actions" role="group" aria-label="New sketch on plane">
            <span className="editor__actions-label">New sketch on</span>
            {ORIGIN_PLANES.map((plane) => (
              <Button key={plane} onClick={() => addSketch(plane)}>
                {plane}
              </Button>
            ))}
          </div>

          <div className="editor__actions editor__actions--stacked">
            <span className="editor__actions-label">New sketch on a face</span>
            {faceGroups.length === 0 ? (
              <p className="editor__note">
                No solid has been built yet, so there is no face to sketch on.
              </p>
            ) : (
              <>
                <select
                  className="editor__select"
                  aria-label="Face to sketch on"
                  value={faceTarget}
                  onChange={(event) => setFaceTarget(event.target.value)}
                >
                  <option value="">Choose a face…</option>
                  {faceGroups.map((group) => (
                    <optgroup key={group.bodyId} label={group.bodyName}>
                      {group.faces.map((face) => (
                        <option key={face.faceId} value={face.value}>
                          {face.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <Button disabled={faceTarget === ''} onClick={() => addFaceSketch(faceTarget)}>
                  Add face sketch
                </Button>
              </>
            )}
          </div>

          {/* What the document holds right now, as solids rather than as
              history — the modelled bodies under the feature that made each,
              and the imported ones under their part. Shown on both surfaces:
              it is what the document *is*, and that does not stop being true
              because the user switched to the sketch. */}
          <BodyBrowserPanel
            bodies={modelledBodies}
            parts={document.parts}
            ownerByBody={evaluation?.ownerByBody ?? EMPTY_OWNERS}
            featureName={featureNameOf}
            selection={selection}
            onSelectionChange={setSelection}
            onSelectFeature={setSelectedFeatureId}
          />

          {/* Only worth offering once there is something to cut into. */}
          {allBodies.length > 0 ? (
            <SectionControls section={section} onChange={setSection} extent={sectionExtent} />
          ) : null}
        </aside>

        {/* Both surfaces stay mounted so switching keeps their state and the
            3D viewport does not have to rebuild its scene. */}
        <section className="editor__viewport" hidden={surface !== 'sketch'}>
          {activeSketch ? (
            <SketchEditor
              model={activeSketch}
              onChange={handleSketchEdit}
              tool={sketchTool}
              onToolChange={setSketchTool}
              active={surface === 'sketch'}
            />
          ) : (
            <p className="editor__empty">
              This document has no sketches. Add one from the panel to start drawing.
            </p>
          )}
        </section>
        <section className="editor__viewport" hidden={surface !== 'model'}>
          <ThreeViewport
            meshes={meshes}
            bodyIds={bodyIds}
            bodyNames={bodyNames}
            active={surface === 'model'}
            originPlanes={visiblePlanes}
            selectedPlane={activePlane}
            onSelectPlane={addSketch}
            onSelectFace={addSketchOnFace}
            selection={selection}
            onSelectionChange={setSelection}
            pickable={pickable}
            clipPlane={clipPlanes}
          />
        </section>

        <aside className="editor__panel editor__panel--right">
          <FeaturePropertiesPanel
            feature={selectedFeature}
            computed={computed}
            onChange={handleParameterChange}
            selection={selection}
            activePickKey={picking?.key ?? null}
            onPickKindChange={handlePickKindChange}
          />
        </aside>
      </div>

      {notice ? (
        <div className="editor__notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            className="editor__notice-close"
            aria-label="Dismiss notice"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      <footer className="editor__status">
        <span>{document.parts.length} parts</span>
        <span>{countBodies(document) + modelledBodies.length} bodies</span>
        <span>{triangles.toLocaleString()} triangles</span>
        <span>{document.metadata.units}</span>
        {/* Which engine the geometry above actually came out of. A stub result
            and a B-Rep result look alike on screen and are not alike at all, so
            the backend is named rather than assumed. */}
        <span
          className={`editor__backend${missing.length > 0 ? ' editor__backend--limited' : ''}`}
          title={backendTitle(backend, kernelFallbacks, missing)}
        >
          Kernel: {backend}
          {missing.length > 0 ? ' (limited)' : ''}
        </span>
        {evaluation && evaluation.failures.length > 0 ? (
          <span className="editor__failures">
            {evaluation.failures.length} feature errors
          </span>
        ) : null}
      </footer>

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
