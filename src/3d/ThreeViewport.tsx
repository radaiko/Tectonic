import { useEffect, useRef } from 'react'
import * as THREE from 'three'
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

export function ThreeViewport({
  meshes,
  highlights = [],
  clipPlane = null,
}: ThreeViewportProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)

  // Renderer, camera and controls live for the lifetime of the component; only
  // the model group is rebuilt when the meshes change.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BACKGROUND)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10_000)
    camera.position.set(120, 90, 140)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // Section views clip per material rather than globally, so only the model
    // is cut back and the grid stays whole.
    renderer.localClippingEnabled = true
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

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

    let frame = 0
    const animate = (): void => {
      frame = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
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
