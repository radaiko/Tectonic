import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MeshData } from '../domain/MeshData'
import { toBufferGeometry } from '../kernel/StubKernel'
import type { SketchPlane } from '../sketch/domain/SketchSupport'
import type { SketchOverlay } from './sketchOverlay'
import type { ModelSphere } from './framing'
import { boundingSphere, frameBox, needsReframing } from './framing'
import type { OriginPlaneHandles } from './originPlanes'
import { createOriginPlanes, originPlaneLabel, pickOriginPlane } from './originPlanes'
import {
  edgeIdAtSegment,
  edgeLines,
  edgePositions,
  faceIdAtTriangle,
  faceIndices,
  isClick,
  pointerNdc,
} from './viewportPicking'
import type { CameraOrientation } from '../view/camera'
import { orientationFor, placeCamera } from '../view/camera'
import type { SelectionItem, SelectionKind } from '../view/selection'
import {
  EMPTY_SELECTION,
  applyPick,
  describeSelection,
  describeSelectionCount,
  selectionKey,
} from '../view/selection'
import { ViewCube } from './ViewCube'
import './ThreeViewport.css'

/** A half-space the scene is cut back to, so the inside of a solid is visible. */
export interface ClipPlane {
  readonly normal: { readonly x: number; readonly y: number; readonly z: number }
  /** Signed distance from the origin along the normal. */
  readonly constant: number
}

/** Which backend the viewport ended up drawing with. */
export type RendererKind = 'webgpu' | 'webgl'

/**
 * The two renderers are unrelated classes, but the viewport only ever uses the
 * members they have in common, so a union is enough to keep this honest without
 * casting.
 */
type ViewportRenderer = THREE.WebGLRenderer | WebGPURenderer

interface ActiveRenderer {
  readonly renderer: ViewportRenderer
  readonly kind: RendererKind
}

/**
 * WebGPU when the browser has it, WebGL otherwise.
 *
 * `three/webgpu` is a second copy of the renderer plus the whole node-material
 * system — around a megabyte — so it is pulled in dynamically. A browser that
 * falls back to WebGL never downloads it. Both entry points import the same
 * `three.core.js`, so `Scene`, `Mesh` and the materials built below are the very
 * same classes either way; nothing has to be built twice per backend.
 */
async function createRenderer(): Promise<ActiveRenderer> {
  // `'gpu' in navigator` rather than a truthiness check: it holds regardless of
  // whether the WebGPU lib types are in scope, and secure-context-less browsers
  // omit the property entirely.
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    let candidate: WebGPURenderer | undefined
    try {
      const { WebGPURenderer: Ctor } = await import('three/webgpu')
      candidate = new Ctor({ antialias: true })
      // Adapter and device are requested here, and this is where a machine with
      // no working GPU adapter reports it — hence the fallback below.
      await candidate.init()
      return { renderer: candidate, kind: 'webgpu' }
    } catch (error) {
      // The constructor already made a canvas and may have taken a device, so
      // let the half-built renderer go before falling back.
      safeDispose(candidate)
      console.warn('WebGPU not available, falling back to WebGL', error)
    }
  }
  return { renderer: new THREE.WebGLRenderer({ antialias: true }), kind: 'webgl' }
}

/** Disposal on an error path must not mask the error that got us there. */
function safeDispose(renderer: ViewportRenderer | undefined): void {
  if (!renderer) return
  try {
    renderer.dispose()
  } catch {
    // Nothing useful to do: we are already unwinding.
  }
}

export interface ThreeViewportProps {
  /** Bodies to display. Re-tessellated meshes replace the scene contents. */
  readonly meshes: readonly MeshData[]
  /**
   * The body each entry of {@link meshes} belongs to, by position. Supplying it
   * is what makes those meshes face-pickable — a mesh with no id here is drawn
   * but cannot be sketched on, which is what the highlight meshes want.
   *
   * Index-aligned rather than an array of pairs so the common case — a viewport
   * that only draws — keeps the plain `MeshData[]` it already had. Callers build
   * both lists from one array of bodies, so they cannot drift apart.
   */
  readonly bodyIds?: readonly string[]
  /** Bodies drawn in the warning colour, e.g. components that interfere. */
  readonly highlights?: readonly MeshData[]
  /**
   * Section view. Everything behind each plane is cut away.
   *
   * A list rather than a single plane because a quarter or octant section is
   * two or three planes at once, which is what `view/section` produces; one
   * plane on its own is still accepted, since that is what a half section is
   * and what every existing caller passes.
   */
  readonly clipPlane?: ClipPlane | readonly ClipPlane[] | null
  /**
   * Origin planes to draw and let the user click. Empty — the default — draws
   * none, which is how a viewport that is only showing a model keeps the picks
   * on the model.
   */
  readonly originPlanes?: readonly SketchPlane[]
  /** The plane drawn as chosen, e.g. the one the open sketch sits on. */
  readonly selectedPlane?: SketchPlane | null
  /**
   * The document's sketches, lifted onto their support planes.
   *
   * Drawn over the model and pickable like any other geometry. Deliberately
   * *only* that: picking a sketch here reports a selection and nothing else.
   * Opening one for drawing is a command a user runs by name, never a side
   * effect of having clicked near it.
   */
  readonly sketchOverlays?: readonly SketchOverlay[]
  /** Names for the bodies, so a selection chip can read better than an id. */
  readonly bodyNames?: readonly string[]
  /**
   * What is currently picked. Controlled: the viewport draws this and asks for
   * changes, it does not keep a selection of its own.
   */
  readonly selection?: readonly SelectionItem[]
  readonly onSelectionChange?: (selection: readonly SelectionItem[]) => void
  /**
   * Which kinds of thing a click can pick, best first.
   *
   * This is how a command narrows the viewport to what it needs — a fillet asks
   * for edges, a shell for faces — instead of the user having to hit exactly the
   * right pixel and hope. Faces before edges is the default because a face is a
   * much larger target; when edges are wanted they are listed first and win.
   */
  readonly pickable?: readonly SelectionKind[]
  /**
   * Whether the 3D view is the surface on screen. The shell keeps both surfaces
   * mounted, so the bare-letter shortcuts stand down while the sketch has it.
   */
  readonly active?: boolean
  /**
   * Bumped by the shell to ask for a frame — the ribbon's Fit command.
   *
   * A counter rather than a callback ref because framing needs the camera and
   * the controls, which live inside the renderer effect and are not built until
   * a GPU device has been acquired. A number the shell increments is something
   * this component can react to whenever it is ready, with no lifetime to
   * co-ordinate; the initial value is deliberately ignored, so mounting does not
   * override the automatic framing that puts the camera on the model.
   */
  readonly fitRequest?: number
}

/**
 * What the pointer is over. The same vocabulary a selection is made of, so a
 * hover is simply the pick that a click would commit.
 */
type HoverTarget = SelectionItem

function sameHover(a: HoverTarget | null, b: HoverTarget | null): boolean {
  if (a === null || b === null) return a === b
  return selectionKey(a) === selectionKey(b)
}

const BACKGROUND = 0x14181c
const SURFACE = 0x4d9bd9
const HIGHLIGHT = 0xef4444
/** The wash over the planar face the pointer is on. */
const FACE_HOVER = 0xf2c14e
/** The wash over what is actually picked — warmer, and it stays put. */
const SELECTED = 0x4ec9b0
/** Edges as drawn: the quiet outline, the one under the pointer, the picked one. */
const EDGE_IDLE = 0x0f1417
const EDGE_HOVER = 0xf2c14e
const EDGE_SELECTED = 0x4ec9b0
/**
 * How near the pointer has to come to an edge, in world units, to pick it.
 *
 * An edge is one pixel wide and nobody can hit that. Scaled with the model when
 * one is framed, so the tolerance is the same on screen whatever the part's size.
 */
const EDGE_PICK_TOLERANCE = 0.75

/**
 * Sketch overlays as drawn: real geometry, construction geometry, and the two
 * states a whole sketch can be in.
 *
 * Construction is dimmer *and* dashed rather than only dimmer, because the
 * distinction it carries — "this is not part of any profile" — is the one a user
 * has to be able to read at a glance on a busy face.
 */
const SKETCH_LINE = 0xe8ecf1
const SKETCH_CONSTRUCTION = 0x7d8894
const SKETCH_SELECTED = 0x4ec9b0
const SKETCH_HOVER = 0xf2c14e
/** Dash geometry for construction curves, in world units. */
const SKETCH_DASH_SIZE = 1.6
const SKETCH_GAP_SIZE = 1.1
/** How near the pointer has to come to a sketch curve to pick it. */
const SKETCH_PICK_TOLERANCE = 1.2

/** What the developer overlay reports about the frame that was just drawn. */
interface FrameStats {
  readonly fps: number
  readonly triangles: number
  readonly drawCalls: number
}

/** Frames averaged into one FPS reading — roughly a second at 60 Hz. */
const SAMPLE_FRAMES = 60
/** Frame budget while the rate lock is on. */
const LOCKED_FRAME_MS = 1000 / 60
/**
 * A display that ticks a hair early would otherwise miss its slot and halve the
 * frame rate, so the budget is checked with just under a millisecond of slack.
 */
const FRAME_SLACK_MS = 1
/**
 * A gap this long between two frames is the viewport sitting idle, not a slow
 * frame — nothing is drawn unless something changed. Averaging across it would
 * report the length of the pause rather than how fast the scene draws, so the
 * sample window starts over instead.
 */
const IDLE_GAP_MS = 100

const RENDERER_LABELS: Record<RendererKind, string> = { webgpu: 'WebGPU', webgl: 'WebGL' }

const EMPTY_PLANES: readonly SketchPlane[] = []
const EMPTY_NAMES: readonly string[] = []
const EMPTY_OVERLAYS: readonly SketchOverlay[] = []

/** Where the camera starts, matching the position the scene is built with. */
const DEFAULT_ORIENTATION: CameraOrientation = orientationFor('isometric')
/**
 * How far the camera has to turn before the view cube is re-rendered.
 *
 * An orbit coasts to a stop over dozens of frames under damping; re-rendering
 * the widget for each of them would cost a React pass per frame to move the cube
 * by less than a pixel. A fifth of a degree is well under what the cube can show.
 */
const ORIENTATION_EPSILON = 3e-3
/**
 * Faces before edges: a face is by far the easier target to hit. Sketches come
 * ahead of both, because a sketch overlay lies *on* the face it was drawn on and
 * would otherwise be unreachable the moment it had a solid behind it.
 */
const DEFAULT_PICKABLE: readonly SelectionKind[] = ['origin-plane', 'sketch', 'face', 'edge']

export function ThreeViewport({
  meshes,
  bodyIds,
  highlights = [],
  clipPlane = null,
  originPlanes = EMPTY_PLANES,
  selectedPlane = null,
  sketchOverlays = EMPTY_OVERLAYS,
  bodyNames = EMPTY_NAMES,
  selection = EMPTY_SELECTION,
  onSelectionChange,
  pickable = DEFAULT_PICKABLE,
  active = true,
  fitRequest = 0,
}: ThreeViewportProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)
  const planesRef = useRef<OriginPlaneHandles | null>(null)
  const faceHoverGroupRef = useRef<THREE.Group | null>(null)
  const faceHoverMaterialRef = useRef<THREE.Material | null>(null)
  const faceSelectedGroupRef = useRef<THREE.Group | null>(null)
  const faceSelectedMaterialRef = useRef<THREE.Material | null>(null)
  const edgeHighlightGroupRef = useRef<THREE.Group | null>(null)
  /**
   * The sketches drawn over the model. Also the geometry a sketch pick is
   * raycast against — unlike the body outlines, every curve here carries the id
   * of the sketch it belongs to, so it can answer "which sketch is this".
   */
  const sketchGroupRef = useRef<THREE.Group | null>(null)
  const sketchMaterialsRef = useRef<SketchMaterials | null>(null)
  /**
   * Per-body line lists used only for picking edges, kept out of the scene.
   *
   * Deliberately not added: they would double every outline on screen, and the
   * drawn outline is a crease-filtered one that has no per-edge identity to pick
   * by. Raycasting does not need scene membership — only up-to-date world
   * matrices, and these never move off the identity.
   */
  const edgePickGroupRef = useRef<THREE.Group | null>(null)
  // Which backend won. Kept so behaviour that differs between the two — a
  // screenshot needs the frame finished before the canvas is read back, and
  // only WebGPU can promise that — has something to branch on. The state
  // alongside it is the same fact in a form the overlay can render.
  const rendererKindRef = useRef<RendererKind | null>(null)
  const [rendererKind, setRendererKind] = useState<RendererKind | null>(null)

  // Frames are drawn on demand: something changed, so one frame is due. The
  // flag is what a request sets and a drawn frame clears; `requestRender` is
  // installed by the renderer effect and stays a no-op until the GPU device has
  // been acquired, since there is nothing to draw with before then.
  const needsRenderRef = useRef(false)
  const requestRenderRef = useRef<() => void>(() => {})
  // Framing needs the camera and the controls, both of which live inside the
  // renderer effect; the key handler reaches them through here. The flag asks
  // for a frame whether or not the model calls for one, which is what the fit
  // shortcut wants and what an automatic frame must not do.
  const fitViewRef = useRef<(force?: boolean) => void>(() => {})
  // The model the camera was last put on, so an automatic frame can tell a
  // rebuild that changed nothing worth looking at from one that did.
  const framedRef = useRef<ModelSphere | null>(null)

  /**
   * Which way the camera is facing, as the view cube reads it.
   *
   * Held as state because the widget is React, and mirrored nowhere else: the
   * camera is the truth and this follows it. Updates are filtered by angle in
   * `syncOrientation`, so an orbit's damped tail does not re-render the cube
   * once per frame for movement nobody can see.
   */
  const [orientation, setOrientation] = useState<CameraOrientation>(DEFAULT_ORIENTATION)
  /** Puts the camera on an orientation, keeping its distance from the target. */
  const applyOrientationRef = useRef<(next: CameraOrientation) => void>(() => {})

  // What a click would start a sketch on. Held as state because it drives the
  // legend and the readout as well as the scene, and mirrored into a ref so the
  // pointer handler — installed once, inside the renderer effect — can compare
  // against it without being torn down and rebuilt on every pointer move.
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const hoverRef = useRef<HoverTarget | null>(null)
  const updateHover = useCallback((target: HoverTarget | null): void => {
    if (sameHover(hoverRef.current, target)) return
    hoverRef.current = target
    setHover(target)
  }, [])

  // The pick handlers live for the lifetime of the renderer, so they reach the
  // current props through refs rather than closing over the first render's.
  const onSelectionChangeRef = useRef(onSelectionChange)
  const selectionRef = useRef(selection)
  const pickableRef = useRef(pickable)
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
    selectionRef.current = selection
    pickableRef.current = pickable
  }, [onSelectionChange, pickable, selection])

  const [overlayVisible, setOverlayVisible] = useState(false)
  // Off by default, so the viewport keeps drawing as fast as the display allows
  // until someone asks for the lock.
  const [rateLocked, setRateLocked] = useState(false)
  const [stats, setStats] = useState<FrameStats | null>(null)

  // The animation loop reads both toggles through refs. Reading the state
  // directly would put them in the renderer effect's dependencies, and tearing
  // the GPU device down to switch a text overlay on is not a trade worth making.
  const overlayVisibleRef = useRef(overlayVisible)
  const rateLockedRef = useRef(rateLocked)

  useEffect(() => {
    overlayVisibleRef.current = overlayVisible
    rateLockedRef.current = rateLocked
    // Both toggles change what the next frame does — the overlay needs one to
    // open its sample window, the rate lock to take effect — and an idle
    // viewport has no frame coming on its own.
    requestRenderRef.current()
  }, [overlayVisible, rateLocked])

  /**
   * Toggling the overlay, and dropping its readings on the way out.
   *
   * Both happen here rather than the second following the first through an
   * effect: clearing the stats is part of closing the overlay, not a state the
   * component has to be synchronised back into afterwards. Showing it again a
   * minute later should not flash numbers from whatever the scene used to be.
   */
  const toggleOverlay = useCallback((): void => {
    const next = !overlayVisibleRef.current
    setOverlayVisible(next)
    if (!next) setStats(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Ctrl+Shift only. Plain Ctrl and Cmd chords belong to the sketch editor's
      // undo/redo, and `code` keeps these on the same physical keys regardless
      // of keyboard layout or what Shift turns the character into.
      if (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey) {
        if (event.code === 'KeyD') {
          event.preventDefault()
          toggleOverlay()
        } else if (event.code === 'KeyF') {
          event.preventDefault()
          setRateLocked((locked) => !locked)
        }
        return
      }

      // Bare F frames the model, but only while the 3D view is the surface on
      // screen: in a sketch the same key picks the fillet tool.
      if (!active || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT') return
      if (event.code === 'KeyF') {
        event.preventDefault()
        fitViewRef.current()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, toggleOverlay])

  // Renderer, camera and controls live for the lifetime of the component; only
  // the model group is rebuilt when the meshes change.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // The scene is built synchronously even though the renderer is not, so the
    // effect that fills the model group has somewhere to put meshes that arrive
    // while the GPU device is still being acquired.
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BACKGROUND)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10_000)
    camera.position.set(120, 90, 140)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
    keyLight.position.set(1, 2, 1.5)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)
    fillLight.position.set(-1.5, -0.5, -1)
    scene.add(fillLight)

    const grid = new THREE.GridHelper(400, 40, 0x3a4149, 0x282d33)
    scene.add(grid)
    scene.add(new THREE.AxesHelper(60))

    const modelGroup = new THREE.Group()
    scene.add(modelGroup)
    modelGroupRef.current = modelGroup

    // All three planes are built here, once. Which of them are on screen is a
    // prop, applied by the effect below — showing and hiding costs no rebuild.
    const planes = createOriginPlanes()
    scene.add(planes.group)
    planesRef.current = planes

    const faceHoverGroup = new THREE.Group()
    faceHoverGroup.renderOrder = 2
    scene.add(faceHoverGroup)
    faceHoverGroupRef.current = faceHoverGroup

    const wash = (color: number, opacity: number): THREE.MeshBasicMaterial =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        // Lifted towards the camera so the wash wins the depth test against the
        // very triangles it is tracing.
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })

    const faceHoverMaterial = wash(FACE_HOVER, 0.35)
    faceHoverMaterialRef.current = faceHoverMaterial

    const faceSelectedGroup = new THREE.Group()
    faceSelectedGroup.renderOrder = 3
    scene.add(faceSelectedGroup)
    faceSelectedGroupRef.current = faceSelectedGroup

    const faceSelectedMaterial = wash(SELECTED, 0.45)
    faceSelectedMaterialRef.current = faceSelectedMaterial

    const edgeHighlightGroup = new THREE.Group()
    edgeHighlightGroup.renderOrder = 4
    scene.add(edgeHighlightGroup)
    edgeHighlightGroupRef.current = edgeHighlightGroup

    const edgePickGroup = new THREE.Group()
    edgePickGroupRef.current = edgePickGroup

    // Above the model, and never depth-tested away by it: a sketch on a face
    // sits exactly on that face, so it would otherwise fight it for the pixels
    // it is meant to be drawn over.
    const sketchGroup = new THREE.Group()
    sketchGroup.renderOrder = 5
    scene.add(sketchGroup)
    sketchGroupRef.current = sketchGroup

    const sketchMaterials = createSketchMaterials()
    sketchMaterialsRef.current = sketchMaterials

    /** Wires a resolved renderer to the DOM and starts drawing. */
    const attach = ({ renderer, kind }: ActiveRenderer): (() => void) => {
      rendererKindRef.current = kind
      setRendererKind(kind)
      container.dataset.renderer = kind

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      // Section views clip per material rather than globally, so only the model
      // is cut back and the grid stays whole.
      renderer.localClippingEnabled = true
      container.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08

      /**
       * The two backends disagree about `info.render.calls`: WebGL clears it
       * every frame, while the WebGPU info keeps a running total there and
       * reports the frame's own count as `drawCalls`. Probing for the property
       * picks the per-frame number on either without a cast.
       */
      const readFrameCounts = (): Omit<FrameStats, 'fps'> => {
        const render = renderer.info.render
        return {
          triangles: Math.round(render.triangles),
          drawCalls: 'drawCalls' in render ? render.drawCalls : render.calls,
        }
      }

      // Handle of the frame already booked, or 0 when none is.
      let frame = 0
      // Frames drawn since the current FPS window opened, and when it opened.
      let windowFrames = 0
      let windowStart = 0
      let sampling = false
      // When the last frame was actually drawn — the rate lock's reference
      // point, and what tells a slow frame apart from an idle stretch.
      let lastDraw = 0

      /** Draws one frame and folds it into the overlay's FPS window. */
      const draw = (now: number): void => {
        const gap = now - lastDraw
        lastDraw = now

        controls.update()
        // WebGL resets these counters inside render(), but the WebGPU info is
        // only cleared by three's own animation loop, which this viewport does
        // not use — without this its totals would climb forever. Both renderers
        // then report the frame that render() is about to draw.
        renderer.info.reset()
        renderer.render(scene, camera)

        if (!overlayVisibleRef.current) {
          sampling = false
          return
        }

        // First frame after the overlay opens only starts the clock, as does the
        // first frame after an idle stretch: measuring against a window left over
        // from before would report the average across however long nothing was
        // drawn, rather than the rate the scene draws at.
        if (!sampling || gap > IDLE_GAP_MS) {
          sampling = true
          windowFrames = 0
          windowStart = now
          return
        }

        windowFrames += 1
        const elapsed = now - windowStart
        if (windowFrames < SAMPLE_FRAMES || elapsed <= 0) return

        setStats({ fps: (windowFrames * 1000) / elapsed, ...readFrameCounts() })
        windowFrames = 0
        windowStart = now
      }

      /**
       * One frame per booking. The flag is cleared before drawing, so anything
       * that changes during the frame — the camera coasting on under damping,
       * most of all — books the next one through `requestRender` and the
       * viewport keeps going exactly as long as it has something new to show.
       */
      const renderOnce = (now: number): void => {
        frame = 0

        // Under the rate lock a frame that arrives inside the budget is held
        // over rather than dropped: the request stands, so it is re-booked for
        // the next display tick and lands in the slot it was owed.
        if (rateLockedRef.current && now - lastDraw < LOCKED_FRAME_MS - FRAME_SLACK_MS) {
          frame = requestAnimationFrame(renderOnce)
          return
        }

        needsRenderRef.current = false
        draw(now)
      }

      const requestRender = (): void => {
        needsRenderRef.current = true
        if (frame === 0) frame = requestAnimationFrame(renderOnce)
      }
      requestRenderRef.current = requestRender

      /**
       * Pushes the camera's current attitude out to the view cube.
       *
       * Filtered by angle rather than by equality: under damping the camera
       * keeps moving by vanishing amounts for dozens of frames after the pointer
       * is released, and each would otherwise be a React render.
       */
      let lastEye = new THREE.Vector3()
      const syncOrientation = (): void => {
        const eye = new THREE.Vector3().subVectors(camera.position, controls.target)
        if (eye.lengthSq() === 0) return
        eye.normalize()
        if (eye.distanceTo(lastEye) < ORIENTATION_EPSILON) return
        lastEye = eye.clone()
        setOrientation({
          eye: { x: eye.x, y: eye.y, z: eye.z },
          up: { x: camera.up.x, y: camera.up.y, z: camera.up.z },
        })
      }

      /**
       * Snaps the camera onto an orientation without changing how far away it
       * is or what it is looking at — a standard view moves the eye, not the
       * framing, so a part the user has zoomed into stays zoomed into.
       */
      const applyOrientation = (next: CameraOrientation): void => {
        const distance = camera.position.distanceTo(controls.target)
        const placement = placeCamera(
          next,
          { x: controls.target.x, y: controls.target.y, z: controls.target.z },
          distance,
        )
        camera.position.set(placement.position.x, placement.position.y, placement.position.z)
        camera.up.set(placement.up.x, placement.up.y, placement.up.z)
        camera.lookAt(controls.target)
        controls.update()
        syncOrientation()
        requestRender()
      }
      applyOrientationRef.current = applyOrientation

      // Orbit, pan and zoom all land here, damped tail included.
      controls.addEventListener('change', requestRender)
      controls.addEventListener('change', syncOrientation)
      syncOrientation()

      /**
       * Pulls the whole model into view, keeping the direction the camera is
       * already looking from. An empty scene is left alone — there is nothing
       * to frame, and moving the camera anyway would only lose the user's view.
       *
       * Unforced, this only acts on a model that has actually changed shape;
       * see {@link needsReframing} for where that line is drawn.
       */
      const fitView = (force = true): void => {
        // Nothing measured yet, so the aspect ratio the framing needs is not
        // known. `resize` comes straight back here once the container has a
        // size, which is a real signal rather than a guess at how long to wait.
        if (container.clientWidth === 0 || container.clientHeight === 0) return

        const box = new THREE.Box3().setFromObject(modelGroup)
        const sphere = boundingSphere(box)
        if (!sphere) {
          // Nothing to look at. The next model to arrive is framed from scratch
          // rather than measured against one that is no longer there.
          framedRef.current = null
          return
        }
        if (!force && !needsReframing(framedRef.current, sphere)) return

        const framing = frameBox(camera, controls.target, box)
        if (!framing) return

        controls.target.copy(framing.target)
        camera.position.copy(framing.position)
        camera.near = framing.near
        camera.far = framing.far
        camera.updateProjectionMatrix()
        controls.update()
        framedRef.current = sphere
        requestRender()
      }
      fitViewRef.current = fitView

      const resize = (): void => {
        const { clientWidth, clientHeight } = container
        if (clientWidth === 0 || clientHeight === 0) return
        renderer.setSize(clientWidth, clientHeight, false)
        camera.aspect = clientWidth / clientHeight
        camera.updateProjectionMatrix()
        requestRender()
        // A model loaded while the viewport was hidden — the shell keeps this
        // surface mounted behind the sketch — has been waiting for an aspect
        // ratio to be framed against. Unforced, so a resize never takes the
        // camera off a model the user has already been shown.
        fitView(false)
      }
      resize()

      // Fires once on observe(), which is what draws the opening frame; the
      // request above covers a container that has no size yet.
      const observer = new ResizeObserver(resize)
      observer.observe(container)

      /* -------------------------------------------------------------- */
      /* Picking                                                         */
      /* -------------------------------------------------------------- */

      const canvas = renderer.domElement

      /**
       * What is under the pointer, as the kinds the caller asked for.
       *
       * The order of {@link ThreeViewportProps.pickable} is the order of
       * preference, not just a filter: a command that wants edges lists edges
       * first and gets the edge even where a face is also under the pointer,
       * which is the only way a one-pixel-wide edge is reachable at all.
       */
      const targetAt = (event: PointerEvent): HoverTarget | null => {
        const ndc = pointerNdc(canvas.getBoundingClientRect(), event.clientX, event.clientY)
        if (!ndc) return null
        const point = new THREE.Vector2(ndc.x, ndc.y)
        const kinds = pickableRef.current

        for (const kind of kinds) {
          if (kind === 'origin-plane') {
            const plane = pickOriginPlane(planes.group, point, camera)
            if (plane) return { kind: 'origin-plane', plane }
            continue
          }

          if (kind === 'edge') {
            const found = pickEdge(point)
            if (found) return found
            continue
          }

          if (kind === 'sketch') {
            const found = pickSketch(point)
            if (found) return found
            continue
          }

          if (kind === 'face' || kind === 'body') {
            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(point, camera)
            for (const hit of raycaster.intersectObjects(modelGroup.children, false)) {
              const bodyId = hit.object.userData.bodyId as unknown
              const mesh = hit.object.userData.meshData as MeshData | undefined
              if (typeof bodyId !== 'string' || !mesh) continue
              if (kind === 'body') return { kind: 'body', bodyId }
              if (typeof hit.faceIndex !== 'number') continue
              const faceId = faceIdAtTriangle(mesh, hit.faceIndex)
              if (faceId) return { kind: 'face', bodyId, faceId }
            }
          }
        }
        return null
      }

      /**
       * The nearest edge under the pointer.
       *
       * Raycast against the pick lines, which are held out of the scene: the
       * outline that *is* drawn is crease-filtered and carries no per-edge
       * identity, so it cannot answer "which edge is this".
       */
      const pickEdge = (point: THREE.Vector2): HoverTarget | null => {
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(point, camera)
        // Scaled with the framed model so the tolerance stays constant on screen
        // rather than shrinking to nothing on a large part.
        const scale = framedRef.current ? Math.max(framedRef.current.radius / 50, 0.05) : 1
        raycaster.params.Line = { threshold: EDGE_PICK_TOLERANCE * scale }

        for (const hit of raycaster.intersectObjects(edgePickGroup.children, false)) {
          const bodyId = hit.object.userData.bodyId as unknown
          const mesh = hit.object.userData.meshData as MeshData | undefined
          if (typeof bodyId !== 'string' || !mesh || typeof hit.index !== 'number') continue
          const edgeId = edgeIdAtSegment(mesh, hit.index)
          if (edgeId) return { kind: 'edge', bodyId, edgeId }
        }
        return null
      }

      /**
       * The sketch under the pointer.
       *
       * Every curve carries its sketch's id, so this is a plain raycast against
       * what is on screen — a hidden sketch draws nothing and is therefore not
       * pickable, which is the whole meaning of hiding one.
       */
      const pickSketch = (point: THREE.Vector2): HoverTarget | null => {
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(point, camera)
        const scale = framedRef.current ? Math.max(framedRef.current.radius / 50, 0.05) : 1
        raycaster.params.Line = { threshold: SKETCH_PICK_TOLERANCE * scale }

        for (const hit of raycaster.intersectObjects(sketchGroup.children, false)) {
          const sketchId = hit.object.userData.sketchId as unknown
          if (typeof sketchId === 'string') return { kind: 'sketch', sketchId }
        }
        return null
      }

      // Where the press landed, so the release can tell a click from an orbit.
      let pressedAt: { x: number; y: number } | null = null

      const onPointerMove = (event: PointerEvent): void => {
        // Mid-orbit the pointer is driving the camera, not choosing anything.
        const target = pressedAt === null ? targetAt(event) : null
        updateHover(target)
        canvas.style.cursor = target ? 'pointer' : ''
      }

      const onPointerDown = (event: PointerEvent): void => {
        if (event.button !== 0) return
        pressedAt = { x: event.clientX, y: event.clientY }
      }

      const onPointerUp = (event: PointerEvent): void => {
        const from = pressedAt
        pressedAt = null
        if (event.button !== 0 || !from) return
        // A release that ends a drag belongs to the orbit that consumed it.
        if (!isClick(from, { x: event.clientX, y: event.clientY })) return

        const target = targetAt(event)
        updateHover(target)

        // Picking is *only* picking.
        //
        // A click used to start a sketch on whatever it landed on, which meant
        // there was no way to simply look at a face: examining a part, arming a
        // selection field, or missing the thing you were aiming for all created
        // a sketch nobody asked for. The viewport now reports what was hit and
        // stops there; creating a sketch on it is a command with a name, run
        // from the inspector or the ribbon. A click on empty space still clears
        // the selection, which is what makes the report complete.
        const extend = event.shiftKey || event.ctrlKey || event.metaKey
        onSelectionChangeRef.current?.(applyPick(selectionRef.current, target, extend))
      }

      const onPointerLeave = (): void => {
        pressedAt = null
        updateHover(null)
        canvas.style.cursor = ''
      }

      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointerleave', onPointerLeave)

      // Meshes may have been added while the GPU device was still being
      // acquired, when the request above was still a no-op.
      requestRender()

      return () => {
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointerleave', onPointerLeave)
        if (frame !== 0) cancelAnimationFrame(frame)
        needsRenderRef.current = false
        // Nothing left to draw with: later requests must not book a frame
        // against a disposed renderer, nor may a key move a camera that is gone.
        requestRenderRef.current = () => {}
        fitViewRef.current = () => {}
        applyOrientationRef.current = () => {}
        observer.disconnect()
        controls.removeEventListener('change', requestRender)
        controls.removeEventListener('change', syncOrientation)
        controls.dispose()
        safeDispose(renderer)
        renderer.domElement.remove()
        delete container.dataset.renderer
        rendererKindRef.current = null
        setRendererKind(null)
      }
    }

    // WebGPU's init() is async, so the component can be unmounted before a
    // renderer ever exists. `detach` is null until then, and `disposed` tells a
    // late arrival to throw itself away instead of attaching to a dead effect.
    let disposed = false
    let detach: (() => void) | null = null

    void createRenderer().then((active) => {
      if (disposed) {
        safeDispose(active.renderer)
        return
      }
      detach = attach(active)
    })

    return () => {
      disposed = true
      // Scene resources go before the renderer, not after. Disposing a material
      // asks the renderer to release what it built from it, so a renderer that
      // has already been torn down leaves the call reaching into bookkeeping
      // that is no longer there — which is a hard throw on the WebGPU backend.
      // Nothing can draw in between: this whole teardown is synchronous.
      disposeChildren(modelGroup)
      disposeChildren(faceHoverGroup)
      disposeChildren(faceSelectedGroup)
      disposeChildren(edgeHighlightGroup)
      disposeChildren(edgePickGroup)
      disposeChildren(sketchGroup)
      faceHoverMaterial.dispose()
      faceSelectedMaterial.dispose()
      for (const material of Object.values(sketchMaterials)) material.dispose()
      planes.dispose()
      grid.dispose()
      detach?.()
      sceneRef.current = null
      modelGroupRef.current = null
      planesRef.current = null
      faceHoverGroupRef.current = null
      faceHoverMaterialRef.current = null
      faceSelectedGroupRef.current = null
      faceSelectedMaterialRef.current = null
      edgeHighlightGroupRef.current = null
      edgePickGroupRef.current = null
      sketchGroupRef.current = null
      sketchMaterialsRef.current = null
    }
  }, [updateHover])

  /**
   * The sketches, drawn over the model.
   *
   * Rebuilt when the overlays change and when what is picked or hovered changes,
   * because which material a curve takes is part of what the pass draws. The
   * materials themselves are shared and live with the renderer, so this only
   * ever churns a handful of small line geometries.
   */
  useEffect(() => {
    const group = sketchGroupRef.current
    const materials = sketchMaterialsRef.current
    if (!group || !materials) return
    disposeChildren(group)

    const selectedSketchIds = new Set(
      selection.filter((item) => item.kind === 'sketch').map((item) => item.sketchId),
    )
    const hoveredSketchId = hover?.kind === 'sketch' ? hover.sketchId : null

    for (const overlay of sketchOverlays) {
      // Hidden means hidden: nothing drawn, and so nothing to pick either.
      if (!overlay.visible) continue
      const state =
        overlay.sketchId === hoveredSketchId
          ? 'hover'
          : selectedSketchIds.has(overlay.sketchId)
            ? 'selected'
            : 'idle'

      for (const curve of overlay.curves) {
        const positions = new Float32Array(curve.points.length * 3)
        curve.points.forEach((point, index) => {
          positions[index * 3] = point.x
          positions[index * 3 + 1] = point.y
          positions[index * 3 + 2] = point.z
        })
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

        const line = new THREE.Line(geometry, sketchMaterialFor(materials, state, curve.construction))
        // Dashes are measured along the curve, and a line that has never been
        // measured draws solid.
        if (curve.construction) line.computeLineDistances()
        line.userData.sketchId = overlay.sketchId
        line.userData.entityId = curve.entityId
        group.add(line)
      }
    }

    requestRenderRef.current()
  }, [hover, selection, sketchOverlays])

  useEffect(() => {
    const modelGroup = modelGroupRef.current
    if (!modelGroup) return
    const edgePickGroup = edgePickGroupRef.current

    disposeChildren(modelGroup)
    if (edgePickGroup) disposeChildren(edgePickGroup)

    // Shared by every body's pick lines, and never drawn — the raycaster does
    // not read a material, so this only has to exist.
    const pickMaterial = new THREE.LineBasicMaterial()

    const planes = (clipPlane === null || clipPlane === undefined
      ? []
      : Array.isArray(clipPlane)
        ? clipPlane
        : [clipPlane as ClipPlane]
    ).map(
      (plane) =>
        new THREE.Plane(
          new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize(),
          plane.constant,
        ),
    )

    const surface = (color: number): THREE.MeshStandardMaterial =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.1,
        roughness: 0.55,
        flatShading: false,
        clippingPlanes: planes,
        side: planes.length > 0 ? THREE.DoubleSide : THREE.FrontSide,
      })

    const material = surface(SURFACE)
    const highlightMaterial = surface(HIGHLIGHT)

    const add = (mesh: MeshData, meshMaterial: THREE.Material, bodyId?: string): void => {
      const geometry = toBufferGeometry(mesh)
      const object = new THREE.Mesh(geometry, meshMaterial)
      if (bodyId !== undefined) {
        // What a face pick needs: which body was hit, and the mesh whose
        // topology names its faces. Absent here means "drawn but not pickable".
        object.userData.bodyId = bodyId
        object.userData.meshData = mesh
      }
      modelGroup.add(object)

      // Crease-filtered, for looks: drawing every seam of a tessellated curve
      // would bury the part in lines. Picking uses its own geometry below.
      const edges = new THREE.EdgesGeometry(geometry, 20)
      modelGroup.add(
        new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: EDGE_IDLE })),
      )

      if (bodyId !== undefined && edgePickGroup) {
        const lines = edgeLines(mesh)
        const pickGeometry = new THREE.BufferGeometry()
        pickGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(lines.positions, 3),
        )
        const pickLines = new THREE.LineSegments(pickGeometry, pickMaterial)
        pickLines.userData.bodyId = bodyId
        pickLines.userData.meshData = mesh
        edgePickGroup.add(pickLines)
      }
    }

    meshes.forEach((mesh, index) => add(mesh, material, bodyIds?.[index]))
    for (const mesh of highlights) add(mesh, highlightMaterial)

    // Never rendered, so nothing has drawn them into place. The raycaster reads
    // world matrices, and these are the only thing that puts one there.
    edgePickGroup?.updateMatrixWorld(true)

    // The scene changed under an otherwise idle viewport, which has no frame of
    // its own coming.
    requestRenderRef.current()

    // A rebuild that turned the part into something the current view has no
    // room for — the first body to arrive, or a feature built at a sketch's
    // coordinates — puts the camera back on it. Until the renderer has attached
    // this is a no-op and `resize` picks it up.
    fitViewRef.current(false)

    return () => {
      material.dispose()
      highlightMaterial.dispose()
      pickMaterial.dispose()
    }
  }, [bodyIds, clipPlane, highlights, meshes])

  /**
   * A rebuild replaces the meshes the pointer was last over, so whatever was
   * hovered no longer refers to anything on screen.
   */
  useEffect(() => {
    updateHover(null)
  }, [meshes, updateHover])

  /**
   * The shell asked for a frame. Forced, unlike the automatic one a rebuild
   * triggers: this only happens because someone pressed Fit, and answering "the
   * model has not changed enough to be worth reframing" to that would be a
   * button that does nothing.
   */
  const framedRequest = useRef(fitRequest)
  useEffect(() => {
    if (framedRequest.current === fitRequest) return
    framedRequest.current = fitRequest
    fitViewRef.current(true)
  }, [fitRequest])

  // Which planes are on screen, and which one reads as chosen.
  useEffect(() => {
    planesRef.current?.setShown(originPlanes)
    planesRef.current?.setSelected(selectedPlane)
    requestRenderRef.current()
  }, [originPlanes, selectedPlane])

  /** The mesh a body id names, for the highlight geometry. */
  const meshOfBody = useCallback(
    (bodyId: string): MeshData | undefined => {
      const index = bodyIds?.indexOf(bodyId) ?? -1
      return index >= 0 ? meshes[index] : undefined
    },
    [bodyIds, meshes],
  )

  // The hover wash: a plane brightens in place, a face gets a sheet of its own
  // triangles laid over it, since the body it belongs to is drawn as one mesh.
  useEffect(() => {
    planesRef.current?.setHovered(hover?.kind === 'origin-plane' ? hover.plane : null)

    const group = faceHoverGroupRef.current
    const material = faceHoverMaterialRef.current
    if (!group || !material) return
    disposeChildren(group)

    if (hover?.kind === 'face') {
      const mesh = meshOfBody(hover.bodyId)
      const sheet = mesh ? faceSheet(mesh, hover.faceId, material) : null
      if (sheet) group.add(sheet)
    } else if (hover?.kind === 'edge') {
      const mesh = meshOfBody(hover.bodyId)
      const line = mesh ? edgeHighlight(mesh, hover.edgeId, EDGE_HOVER) : null
      if (line) group.add(line)
    }

    requestRenderRef.current()
  }, [hover, meshOfBody])

  /**
   * What is actually picked, drawn and left drawn. Separate from the hover pass
   * so moving the pointer away does not take the selection's marks with it.
   */
  useEffect(() => {
    const faceGroup = faceSelectedGroupRef.current
    const edgeGroup = edgeHighlightGroupRef.current
    const material = faceSelectedMaterialRef.current
    if (!faceGroup || !edgeGroup || !material) return
    disposeChildren(faceGroup)
    disposeChildren(edgeGroup)

    for (const item of selection) {
      if (item.kind === 'face') {
        const mesh = meshOfBody(item.bodyId)
        const sheet = mesh ? faceSheet(mesh, item.faceId, material) : null
        if (sheet) faceGroup.add(sheet)
      } else if (item.kind === 'edge') {
        const mesh = meshOfBody(item.bodyId)
        const line = mesh ? edgeHighlight(mesh, item.edgeId, EDGE_SELECTED) : null
        if (line) edgeGroup.add(line)
      } else if (item.kind === 'body') {
        // A whole body reads as every face of it at once, which is the only
        // marking that survives the body being one mesh.
        const mesh = meshOfBody(item.bodyId)
        if (mesh) {
          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3))
          geometry.setIndex([...mesh.indices])
          faceGroup.add(new THREE.Mesh(geometry, material))
        }
      }
    }

    requestRenderRef.current()
  }, [meshOfBody, selection])

  const hoveredPlane = hover?.kind === 'origin-plane' ? hover.plane : null
  const selectedPlanes = useMemo(
    () => new Set(selection.filter((item) => item.kind === 'origin-plane').map((item) => item.plane)),
    [selection],
  )
  const bodyNameOf = useCallback(
    (bodyId: string): string | undefined => {
      const index = bodyIds?.indexOf(bodyId) ?? -1
      return index >= 0 ? bodyNames[index] : undefined
    },
    [bodyIds, bodyNames],
  )
  /** So a picked sketch reads as "Sketch 2" rather than as its identifier. */
  const sketchNameOf = useCallback(
    (sketchId: string): string | undefined =>
      sketchOverlays.find((overlay) => overlay.sketchId === sketchId)?.name,
    [sketchOverlays],
  )

  // The renderer's canvas is appended to the inner element imperatively, so it
  // is kept clear of anything React renders alongside it.
  return (
    <div
      className="viewport"
      data-hovered-plane={hoveredPlane ?? undefined}
      data-selected-plane={selectedPlane ?? undefined}
    >
      <div className="viewport__canvas" ref={containerRef} data-testid="three-viewport" />

      {/* Orientation, and the way back to a named one. The cube follows the
          camera rather than holding a view of its own, so it can never claim
          the model is facing a way it is not. */}
      <ViewCube
        orientation={orientation}
        onSelect={(next) => applyOrientationRef.current(next)}
        // Framing the model is a view command like picking a named view, so it
        // belongs on the same widget rather than in a corner of its own. The
        // bare F key does the same thing; this is the discoverable half.
        onFit={() => fitViewRef.current(true)}
      />

      {/*
       * The planes are geometry in a canvas, which has no accessibility tree of
       * its own and nothing a keyboard can reach. This legend is that missing
       * half: it names each plane that is on screen, reports which one is
       * chosen, and activates the very same handler a click in the scene does.
       * Pointing at an entry lights the plane itself, so it reads as a label on
       * the geometry rather than as a second, parallel control.
       */}
      {originPlanes.length > 0 ? (
        <div className="viewport__planes" role="group" aria-label="Origin planes">
          {originPlanes.map((plane) => (
            <button
              key={plane}
              type="button"
              className="viewport__plane"
              data-plane={plane}
              data-hovered={plane === hoveredPlane ? '' : undefined}
              aria-pressed={plane === selectedPlane || selectedPlanes.has(plane)}
              onPointerEnter={() => updateHover({ kind: 'origin-plane', plane })}
              onPointerLeave={() => updateHover(null)}
              onFocus={() => updateHover({ kind: 'origin-plane', plane })}
              onBlur={() => updateHover(null)}
              onClick={() =>
                onSelectionChange?.(applyPick(selection, { kind: 'origin-plane', plane }, false))
              }
            >
              {originPlaneLabel(plane)}
            </button>
          ))}
          {/* Says what a click does, which is select. Creating the sketch is the
              next, named step — the legend used to promise otherwise, and a
              stray click on a plane then cost the user a sketch. */}
          <p className="viewport__planes-hint" role="status">
            {hoveredPlane
              ? `${originPlaneLabel(hoveredPlane)} — click to select it, then Create Sketch`
              : 'Click a plane to select it, then Create Sketch'}
          </p>
        </div>
      ) : null}
      {/*
       * The selection, in the accessibility tree.
       *
       * Everything above happens inside a canvas, which has no structure a
       * screen reader or a keyboard can reach. This list is that missing half:
       * it names what is picked, lets each entry be taken back out without the
       * pointer, and gives the whole selection somewhere to be announced from.
       */}
      {selection.length > 0 ? (
        <div className="viewport__selection" role="group" aria-label="Selection">
          <p className="viewport__selection-count" role="status">
            {describeSelectionCount(selection)}
          </p>
          <ul className="viewport__selection-list">
            {selection.map((item) => (
              <li key={selectionKey(item)}>
                <button
                  type="button"
                  className="viewport__selection-chip"
                  data-kind={item.kind}
                  onClick={() =>
                    onSelectionChange?.(
                      selection.filter((other) => selectionKey(other) !== selectionKey(item)),
                    )
                  }
                >
                  <span>
                    {describeSelection(item, { bodyName: bodyNameOf, sketchName: sketchNameOf })}
                  </span>
                  <span aria-hidden="true">×</span>
                  <span className="viewport__visually-hidden"> — remove from selection</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="viewport__selection-clear"
            onClick={() => onSelectionChange?.([])}
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {overlayVisible ? (
        <dl className="viewport__hud" data-testid="viewport-hud" aria-label="Developer overlay">
          <div className="viewport__stat">
            <dt>Renderer</dt>
            <dd>{rendererKind ? RENDERER_LABELS[rendererKind] : 'starting…'}</dd>
          </div>
          <div className="viewport__stat">
            <dt>FPS</dt>
            {/* Readings only exist once a full sample window has been drawn. */}
            <dd>{stats ? stats.fps.toFixed(0) : '—'}</dd>
          </div>
          <div className="viewport__stat">
            <dt>Triangles</dt>
            <dd>{stats ? stats.triangles.toLocaleString() : '—'}</dd>
          </div>
          <div className="viewport__stat">
            <dt>Draw calls</dt>
            <dd>{stats ? stats.drawCalls.toLocaleString() : '—'}</dd>
          </div>
          <div className="viewport__stat">
            <dt>Rate lock</dt>
            <dd>{rateLocked ? '60 fps' : 'off'}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

/** One face of a mesh, as a sheet of its own triangles laid over the body. */
function faceSheet(
  mesh: MeshData,
  faceId: string,
  material: THREE.Material,
): THREE.Mesh | null {
  const indices = faceIndices(mesh, faceId)
  if (!indices) return null
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3))
  geometry.setIndex(indices)
  return new THREE.Mesh(geometry, material)
}

/** One edge of a mesh, as a line drawn over the outline that is already there. */
function edgeHighlight(
  mesh: MeshData,
  edgeId: string,
  color: number,
): THREE.LineSegments | null {
  const positions = edgePositions(mesh, edgeId)
  if (!positions) return null
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(
    geometry,
    // Depth test off: an edge sits exactly on the surfaces it bounds, so it
    // would otherwise fight them for the same pixels and flicker.
    new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }),
  )
}

function disposeChildren(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child)
    // `LineSegments` and `Line` are the same class hierarchy, so this covers the
    // body outlines, the edge highlights and the sketch overlays alike.
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose()
      const material = child.material
      // Highlight lines make a material each — they differ only by colour, and
      // there are never many. Anything marked shared is owned by whoever made
      // it and outlives the objects drawn with it.
      if (
        child instanceof THREE.Line &&
        material instanceof THREE.Material &&
        material.depthTest === false &&
        material.userData.shared !== true
      ) {
        material.dispose()
      }
    }
  }
}

/** The six ways a sketch curve can be drawn: three states × solid or dashed. */
interface SketchMaterials {
  readonly idle: THREE.LineBasicMaterial
  readonly selected: THREE.LineBasicMaterial
  readonly hover: THREE.LineBasicMaterial
  readonly idleConstruction: THREE.LineDashedMaterial
  readonly selectedConstruction: THREE.LineDashedMaterial
  readonly hoverConstruction: THREE.LineDashedMaterial
}

type SketchDrawState = 'idle' | 'selected' | 'hover'

/**
 * Materials for the sketch overlays, built once and shared by every curve.
 *
 * Depth testing is off throughout: a sketch drawn on a planar face is coplanar
 * with it to the last bit, and letting the two compete for the same pixels is
 * how an overlay ends up flickering in and out as the camera moves.
 */
function createSketchMaterials(): SketchMaterials {
  const solid = (color: number, opacity: number): THREE.LineBasicMaterial => {
    const material = new THREE.LineBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity,
    })
    material.userData.shared = true
    return material
  }
  const dashed = (color: number, opacity: number): THREE.LineDashedMaterial => {
    const material = new THREE.LineDashedMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity,
      dashSize: SKETCH_DASH_SIZE,
      gapSize: SKETCH_GAP_SIZE,
    })
    material.userData.shared = true
    return material
  }

  return {
    idle: solid(SKETCH_LINE, 0.9),
    selected: solid(SKETCH_SELECTED, 1),
    hover: solid(SKETCH_HOVER, 1),
    // Construction sits back: it is scaffolding, and it must not read as
    // something the next feature is going to build from.
    idleConstruction: dashed(SKETCH_CONSTRUCTION, 0.75),
    selectedConstruction: dashed(SKETCH_SELECTED, 0.9),
    hoverConstruction: dashed(SKETCH_HOVER, 0.9),
  }
}

function sketchMaterialFor(
  materials: SketchMaterials,
  state: SketchDrawState,
  construction: boolean,
): THREE.Material {
  if (!construction) return materials[state]
  if (state === 'selected') return materials.selectedConstruction
  if (state === 'hover') return materials.hoverConstruction
  return materials.idleConstruction
}
