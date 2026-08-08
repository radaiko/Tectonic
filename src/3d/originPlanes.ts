import * as THREE from 'three'
import { planeFrame } from '../features/geometry/plane'
import type { SketchPlane } from '../sketch/domain/SketchSupport'
import { ORIGIN_PLANES } from '../sketch/domain/SketchSupport'

/**
 * The three origin planes as pickable scene objects.
 *
 * A document with nothing built yet has no geometry to click, so the planes
 * themselves are what the first sketch is started from. They are real meshes in
 * the same scene as the model — not an overlay drawn on top of it — which is
 * what lets one raycast decide between a plane and a solid, and what keeps them
 * correct under orbit, pan and zoom without any extra bookkeeping.
 *
 * Orientation comes from {@link planeFrame}, the same frame the feature engine
 * places a sketch on. Picking the quad and modelling on the plane therefore
 * cannot disagree about which way "up" is on it.
 */

/** Namespaced so an id is recognisable wherever it turns up. */
export const ORIGIN_PLANE_ID_PREFIX = 'origin-plane:'

/** The stable id of an origin plane, e.g. `origin-plane:XZ`. */
export function originPlaneId(plane: SketchPlane): string {
  return `${ORIGIN_PLANE_ID_PREFIX}${plane}`
}

/** The plane an id names, or null when it is not an origin-plane id. */
export function parseOriginPlaneId(id: string): SketchPlane | null {
  if (!id.startsWith(ORIGIN_PLANE_ID_PREFIX)) return null
  const plane = id.slice(ORIGIN_PLANE_ID_PREFIX.length)
  return ORIGIN_PLANES.find((candidate) => candidate === plane) ?? null
}

/** How a plane reads to a user, in the viewport and to a screen reader. */
export function originPlaneLabel(plane: SketchPlane): string {
  return `${plane} plane`
}

/**
 * Each plane is tinted by the world axis its normal runs along, matching the
 * axes helper in the same scene: X red, Y green, Z blue.
 */
const PLANE_COLORS: Record<SketchPlane, number> = {
  XY: 0x4d9bd9,
  XZ: 0x5fbf7a,
  YZ: 0xd96a6a,
}

/** How each state reads: fill first, then the outline that gives it an edge. */
const FILL_OPACITY = { idle: 0.08, hover: 0.24, selected: 0.3 } as const
const EDGE_OPACITY = { idle: 0.42, hover: 0.85, selected: 1 } as const

type PlaneState = keyof typeof FILL_OPACITY

/** Side length of a plane quad. Sits inside the 400-unit grid it is drawn over. */
export const DEFAULT_PLANE_SIZE = 120

/** The planes in the scene, and the handles for keeping them in step with the UI. */
export interface OriginPlaneHandles {
  /** Add this to the scene. Its children are the pickable quads. */
  readonly group: THREE.Group
  /** Shows exactly these planes and hides the rest. Hidden planes are not pickable. */
  setShown(planes: readonly SketchPlane[]): void
  setHovered(plane: SketchPlane | null): void
  setSelected(plane: SketchPlane | null): void
  dispose(): void
}

/**
 * Builds all three planes once. Which of them are on screen is a later call, so
 * showing and hiding them never costs a rebuild or a re-upload to the GPU.
 */
export function createOriginPlanes(size: number = DEFAULT_PLANE_SIZE): OriginPlaneHandles {
  const group = new THREE.Group()
  group.name = 'origin-planes'
  // Drawn after the model so the translucent fills blend over it rather than
  // being sorted arbitrarily against it.
  group.renderOrder = 1

  const geometry = new THREE.PlaneGeometry(size, size)
  const edgeGeometry = new THREE.EdgesGeometry(geometry)

  const quads = new Map<SketchPlane, THREE.Mesh>()
  const fills = new Map<SketchPlane, THREE.MeshBasicMaterial>()
  const edges = new Map<SketchPlane, THREE.LineBasicMaterial>()

  for (const plane of ORIGIN_PLANES) {
    const color = PLANE_COLORS[plane]
    const fill = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: FILL_OPACITY.idle,
      side: THREE.DoubleSide,
      // A plane must not hide the solid behind it, nor another plane it crosses.
      depthWrite: false,
    })
    const edge = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: EDGE_OPACITY.idle,
      depthWrite: false,
    })

    const quad = new THREE.Mesh(geometry, fill)
    quad.name = originPlaneId(plane)
    quad.userData.originPlane = plane
    quad.matrixAutoUpdate = false
    quad.matrix.copy(planeMatrix(plane))
    quad.matrixWorldNeedsUpdate = true

    // A child, not a sibling: it inherits the quad's placement, and keeping the
    // group's own children to just the quads is what makes the pick unambiguous.
    quad.add(new THREE.LineSegments(edgeGeometry, edge))

    group.add(quad)
    quads.set(plane, quad)
    fills.set(plane, fill)
    edges.set(plane, edge)
  }

  let shown: readonly SketchPlane[] = ORIGIN_PLANES
  let hovered: SketchPlane | null = null
  let selected: SketchPlane | null = null

  const apply = (): void => {
    for (const plane of ORIGIN_PLANES) {
      const quad = quads.get(plane)
      if (quad) quad.visible = shown.includes(plane)
      const state: PlaneState =
        plane === selected ? 'selected' : plane === hovered ? 'hover' : 'idle'
      const fill = fills.get(plane)
      if (fill) fill.opacity = FILL_OPACITY[state]
      const edge = edges.get(plane)
      if (edge) edge.opacity = EDGE_OPACITY[state]
    }
  }
  apply()

  return {
    group,
    setShown(planes) {
      shown = [...planes]
      apply()
    },
    setHovered(plane) {
      hovered = plane
      apply()
    },
    setSelected(plane) {
      selected = plane
      apply()
    },
    /**
     * Must be called while the renderer that drew these is still alive.
     * Disposing a material fires an event the renderer answers by releasing the
     * render object built from it, and a renderer that has already been torn
     * down has no bookkeeping left to find — the WebGPU backend throws outright.
     * The objects come out of the scene first, for the same reason.
     */
    dispose() {
      group.clear()
      geometry.dispose()
      edgeGeometry.dispose()
      for (const material of fills.values()) material.dispose()
      for (const material of edges.values()) material.dispose()
    },
  }
}

/**
 * The plane under a pointer, or null when it is over none of them.
 *
 * Hidden quads are filtered out explicitly rather than left to the raycaster:
 * an invisible plane must not be pickable, and that is the whole reason the
 * planes stand down once there is a solid to click instead.
 */
export function pickOriginPlane(
  group: THREE.Object3D,
  ndc: THREE.Vector2,
  camera: THREE.Camera,
): SketchPlane | null {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  const candidates = group.children.filter((child) => child.visible)
  const hit = raycaster.intersectObjects(candidates, false)[0]
  // Read back through the stable id rather than trusting `userData`, so a hit
  // on anything that wandered into the group resolves to nothing.
  return hit ? parseOriginPlaneId(hit.object.name) : null
}

/** Local-to-world placement, with the quad's own +Z along the plane's normal. */
function planeMatrix(plane: SketchPlane): THREE.Matrix4 {
  const frame = planeFrame(plane)
  const xAxis = new THREE.Vector3(frame.xAxis.x, frame.xAxis.y, frame.xAxis.z)
  const yAxis = new THREE.Vector3(frame.yAxis.x, frame.yAxis.y, frame.yAxis.z)
  const normal = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
  return new THREE.Matrix4().makeBasis(xAxis, yAxis, normal)
}
