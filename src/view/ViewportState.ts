import type { Vec3 } from '../domain/vec3'
import { ZERO } from '../domain/vec3'
import type { CameraOrientation } from './camera'
import { distanceToFit, nearestStandardView, orbit, orientationFor, panTarget } from './camera'
import type { LayoutSplit, ViewportRect } from './layout'
import { DEFAULT_SPLIT, layoutRects, MAX_VIEWPORTS, moveSplit, paneCount } from './layout'
import type { SectionState } from './section'
import { createSectionState } from './section'
import type { ProjectionMode, StandardView, ViewportLayoutId, VisualStyle } from './types'
import { DEFAULT_VISUAL_STYLE } from './visualStyle'

/** Vertical field of view of the perspective camera, in degrees. */
export const DEFAULT_FOV = 50

/** One pane's independent camera and display settings. */
export interface ViewportConfig {
  readonly id: string
  readonly projection: ProjectionMode
  readonly visualStyle: VisualStyle
  /** Direction from the target towards the camera. */
  readonly eye: Vec3
  readonly up: Vec3
  readonly target: Vec3
  readonly distance: number
  readonly fov: number
  /** Section applied to this pane only. */
  readonly section: SectionState
  /** Show the view cube in this pane. */
  readonly showViewCube: boolean
}

export interface MultiViewportState {
  readonly layout: ViewportLayoutId
  readonly split: LayoutSplit
  /** Always four panes; the layout decides how many of them are shown. */
  readonly viewports: readonly ViewportConfig[]
  readonly activeIndex: number
  /** When set, a camera change in one pane is mirrored into every other pane. */
  readonly syncCameras: boolean
}

/** The four default orientations of the quad layout, in pane order. */
const DEFAULT_VIEWS: readonly StandardView[] = ['isometric', 'front', 'top', 'right']

function createViewport(index: number, view: StandardView): ViewportConfig {
  const orientation = orientationFor(view)
  return {
    id: `viewport-${index + 1}`,
    // Only the free 3D pane starts in perspective — the orthogonal views read
    // as drawings, which is what an engineer expects of them.
    projection: view === 'isometric' ? 'perspective' : 'orthographic',
    visualStyle: DEFAULT_VISUAL_STYLE,
    eye: orientation.eye,
    up: orientation.up,
    target: ZERO,
    distance: distanceToFit(100, DEFAULT_FOV, 'perspective'),
    fov: DEFAULT_FOV,
    section: createSectionState(),
    showViewCube: true,
  }
}

export function createMultiViewportState(
  overrides: Partial<MultiViewportState> = {},
): MultiViewportState {
  return {
    layout: 'single',
    split: DEFAULT_SPLIT,
    viewports: DEFAULT_VIEWS.map((view, index) => createViewport(index, view)),
    activeIndex: 0,
    syncCameras: false,
    ...overrides,
  }
}

export function visibleCount(state: MultiViewportState): number {
  return paneCount(state.layout)
}

/** The panes the layout shows, each with the rectangle it occupies. */
export function visiblePanes(
  state: MultiViewportState,
  width: number,
  height: number,
): { readonly config: ViewportConfig; readonly rect: ViewportRect; readonly index: number }[] {
  return layoutRects(state.layout, width, height, state.split).map((rect, index) => ({
    rect,
    index,
    config: state.viewports[index] as ViewportConfig,
  }))
}

export function setLayout(state: MultiViewportState, layout: ViewportLayoutId): MultiViewportState {
  const panes = paneCount(layout)
  return {
    ...state,
    layout,
    // A pane that the new layout hides must not stay active, or the toolbars
    // would be editing something nobody can see.
    activeIndex: Math.min(state.activeIndex, panes - 1),
  }
}

export function setSplit(
  state: MultiViewportState,
  handle: 'vertical' | 'horizontal',
  fraction: number,
): MultiViewportState {
  return { ...state, split: moveSplit(state.split, handle, fraction) }
}

export function setActiveViewport(state: MultiViewportState, index: number): MultiViewportState {
  if (index < 0 || index >= visibleCount(state)) return state
  return { ...state, activeIndex: index }
}

export function setSyncCameras(state: MultiViewportState, syncCameras: boolean): MultiViewportState {
  return { ...state, syncCameras }
}

export function activeViewport(state: MultiViewportState): ViewportConfig {
  return state.viewports[state.activeIndex] as ViewportConfig
}

/** Fields that a camera sync copies from the edited pane into the others. */
type CameraPatch = Pick<ViewportConfig, 'eye' | 'up' | 'target' | 'distance'>

const CAMERA_KEYS: readonly (keyof CameraPatch)[] = ['eye', 'up', 'target', 'distance']

/**
 * Applies a patch to one pane. When {@link MultiViewportState.syncCameras} is on
 * and the patch touches the camera, the camera part is mirrored into every other
 * pane while style and projection stay per-pane.
 */
export function updateViewport(
  state: MultiViewportState,
  index: number,
  patch: Partial<ViewportConfig>,
): MultiViewportState {
  if (index < 0 || index >= MAX_VIEWPORTS) return state

  const cameraPatch: Partial<CameraPatch> = {}
  for (const key of CAMERA_KEYS) {
    if (patch[key] !== undefined) cameraPatch[key] = patch[key] as never
  }
  const syncing = state.syncCameras && Object.keys(cameraPatch).length > 0

  return {
    ...state,
    viewports: state.viewports.map((viewport, candidate) => {
      if (candidate === index) return { ...viewport, ...patch }
      return syncing ? { ...viewport, ...cameraPatch } : viewport
    }),
  }
}

export function setVisualStyle(
  state: MultiViewportState,
  index: number,
  visualStyle: VisualStyle,
): MultiViewportState {
  return updateViewport(state, index, { visualStyle })
}

export function setProjection(
  state: MultiViewportState,
  index: number,
  projection: ProjectionMode,
): MultiViewportState {
  return updateViewport(state, index, { projection })
}

export function setSection(
  state: MultiViewportState,
  index: number,
  section: SectionState,
): MultiViewportState {
  return updateViewport(state, index, { section })
}

export function setStandardView(
  state: MultiViewportState,
  index: number,
  view: StandardView,
): MultiViewportState {
  const orientation = orientationFor(view)
  return updateViewport(state, index, { eye: orientation.eye, up: orientation.up })
}

export function setOrientation(
  state: MultiViewportState,
  index: number,
  orientation: CameraOrientation,
): MultiViewportState {
  return updateViewport(state, index, { eye: orientation.eye, up: orientation.up })
}

export function orbitViewport(
  state: MultiViewportState,
  index: number,
  deltaAzimuth: number,
  deltaElevation: number,
): MultiViewportState {
  const viewport = state.viewports[index]
  if (!viewport) return state
  const orientation = orbit({ eye: viewport.eye, up: viewport.up }, deltaAzimuth, deltaElevation)
  return updateViewport(state, index, { eye: orientation.eye, up: orientation.up })
}

export const MIN_DISTANCE = 0.01
export const MAX_DISTANCE = 1e6

export function zoomViewport(
  state: MultiViewportState,
  index: number,
  factor: number,
): MultiViewportState {
  const viewport = state.viewports[index]
  if (!viewport || !Number.isFinite(factor) || factor <= 0) return state
  const distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, viewport.distance * factor))
  return updateViewport(state, index, { distance })
}

export function panViewport(
  state: MultiViewportState,
  index: number,
  deltaRight: number,
  deltaUp: number,
): MultiViewportState {
  const viewport = state.viewports[index]
  if (!viewport) return state
  const target = panTarget(
    { eye: viewport.eye, up: viewport.up },
    viewport.target,
    deltaRight,
    deltaUp,
  )
  return updateViewport(state, index, { target })
}

/** Frames a bounding sphere in one pane, or in every pane when syncing. */
export function zoomToFit(
  state: MultiViewportState,
  index: number,
  center: Vec3,
  radius: number,
): MultiViewportState {
  const viewport = state.viewports[index]
  if (!viewport) return state
  return updateViewport(state, index, {
    target: center,
    distance: distanceToFit(radius, viewport.fov, viewport.projection),
  })
}

/** The named view a pane is closest to, for the status bar and the menus. */
export function viewportStandardView(viewport: ViewportConfig): StandardView {
  return nearestStandardView(viewport.eye)
}
