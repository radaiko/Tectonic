import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MeshData } from '../domain/MeshData'
import { toBufferGeometry } from '../kernel/StubKernel'
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
  /** Bodies drawn in the warning colour, e.g. components that interfere. */
  readonly highlights?: readonly MeshData[]
  /** Section view. Everything behind the plane is cut away. */
  readonly clipPlane?: ClipPlane | null
}

const BACKGROUND = 0x1a1d21
const SURFACE = 0x4d9bd9
const HIGHLIGHT = 0xef4444

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

const RENDERER_LABELS: Record<RendererKind, string> = { webgpu: 'WebGPU', webgl: 'WebGL' }

export function ThreeViewport({
  meshes,
  highlights = [],
  clipPlane = null,
}: ThreeViewportProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)
  // Which backend won. Kept so behaviour that differs between the two — a
  // screenshot needs the frame finished before the canvas is read back, and
  // only WebGPU can promise that — has something to branch on. The state
  // alongside it is the same fact in a form the overlay can render.
  const rendererKindRef = useRef<RendererKind | null>(null)
  const [rendererKind, setRendererKind] = useState<RendererKind | null>(null)

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
    // Hiding the overlay drops the readings with it: showing it again a minute
    // later should not flash numbers from whatever the scene used to be.
    if (!overlayVisible) setStats(null)
  }, [overlayVisible, rateLocked])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Ctrl+Shift only. Plain Ctrl and Cmd chords belong to the sketch editor's
      // undo/redo, and `code` keeps these on the same physical keys regardless
      // of keyboard layout or what Shift turns the character into.
      if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return
      if (event.code === 'KeyD') {
        event.preventDefault()
        setOverlayVisible((visible) => !visible)
      } else if (event.code === 'KeyF') {
        event.preventDefault()
        setRateLocked((locked) => !locked)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

      const resize = (): void => {
        const { clientWidth, clientHeight } = container
        if (clientWidth === 0 || clientHeight === 0) return
        renderer.setSize(clientWidth, clientHeight, false)
        camera.aspect = clientWidth / clientHeight
        camera.updateProjectionMatrix()
      }
      resize()

      const observer = new ResizeObserver(resize)
      observer.observe(container)

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

      let frame = 0
      // Frames drawn since the current FPS window opened, and when it opened.
      let windowFrames = 0
      let windowStart = 0
      let sampling = false
      let lastDraw = 0

      const animate = (now: number): void => {
        frame = requestAnimationFrame(animate)

        if (rateLockedRef.current) {
          if (now - lastDraw < LOCKED_FRAME_MS - FRAME_SLACK_MS) return
          lastDraw = now
        }

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

        // First frame after the overlay opens only starts the clock: measuring
        // against a window left over from before would report the average across
        // however long the overlay was hidden.
        if (!sampling) {
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
      animate(performance.now())

      return () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
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
      detach?.()
      disposeChildren(modelGroup)
      grid.dispose()
      sceneRef.current = null
      modelGroupRef.current = null
    }
  }, [])

  useEffect(() => {
    const modelGroup = modelGroupRef.current
    if (!modelGroup) return

    disposeChildren(modelGroup)

    const planes = clipPlane
      ? [
          new THREE.Plane(
            new THREE.Vector3(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z).normalize(),
            clipPlane.constant,
          ),
        ]
      : []

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

    const add = (mesh: MeshData, meshMaterial: THREE.Material): void => {
      const geometry = toBufferGeometry(mesh)
      modelGroup.add(new THREE.Mesh(geometry, meshMaterial))

      const edges = new THREE.EdgesGeometry(geometry, 20)
      modelGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x0f1417 })))
    }

    for (const mesh of meshes) add(mesh, material)
    for (const mesh of highlights) add(mesh, highlightMaterial)

    return () => {
      material.dispose()
      highlightMaterial.dispose()
    }
  }, [clipPlane, highlights, meshes])

  return <div className="viewport" ref={containerRef} data-testid="three-viewport" />
}

function disposeChildren(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child)
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose()
    }
  }
}
