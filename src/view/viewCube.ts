import type { Vec3 } from '../domain/vec3'
import { add, dot, normalize, scale } from '../domain/vec3'
import type { CameraOrientation } from './camera'
import { orientationFor, screenBasis } from './camera'
import type { StandardView } from './types'

/**
 * The view cube is a unit cube in world space labelled with the six standard
 * views. Its 26 pickable regions — 6 faces, 12 edges, 8 corners — each name a
 * camera direction, so clicking one snaps the camera onto it.
 *
 * Everything here is pure geometry; the widget that draws it only has to turn
 * the projected polygons into SVG.
 */
export type ViewCubeRegionKind = 'face' | 'edge' | 'corner'

export interface ViewCubeRegion {
  /** Stable id built from the axes it touches, e.g. `front`, `front-top`. */
  readonly id: string
  readonly kind: ViewCubeRegionKind
  /** Shown on faces; edges and corners are unlabelled. */
  readonly label: string
  /** Direction from the cube centre towards the region, i.e. the camera eye. */
  readonly direction: Vec3
  /** Which corner of the unit cube each of the region's axes is pinned to. */
  readonly axes: readonly (readonly [axis: 0 | 1 | 2, sign: -1 | 1])[]
}

/** Half-width of the cube in the widget's own units. */
export const CUBE_RADIUS = 1

const FACE_VIEWS: readonly (readonly [axis: 0 | 1 | 2, sign: -1 | 1, view: StandardView])[] = [
  [1, -1, 'front'],
  [1, 1, 'back'],
  [0, 1, 'right'],
  [0, -1, 'left'],
  [2, 1, 'top'],
  [2, -1, 'bottom'],
]

const FACE_IDS: Record<string, StandardView> = Object.fromEntries(
  FACE_VIEWS.map(([axis, sign, view]) => [`${axis}:${sign}`, view]),
)

function axisVector(axis: 0 | 1 | 2, sign: -1 | 1): Vec3 {
  return {
    x: axis === 0 ? sign : 0,
    y: axis === 1 ? sign : 0,
    z: axis === 2 ? sign : 0,
  }
}

function regionName(axes: readonly (readonly [0 | 1 | 2, -1 | 1])[]): string {
  return axes.map(([axis, sign]) => FACE_IDS[`${axis}:${sign}`] as string).join('-')
}

function buildRegions(): ViewCubeRegion[] {
  const regions: ViewCubeRegion[] = []

  for (const [axis, sign, view] of FACE_VIEWS) {
    regions.push({
      id: view,
      kind: 'face',
      label: capitalize(view),
      direction: axisVector(axis, sign),
      axes: [[axis, sign]],
    })
  }

  // Edges pair two different axes, corners take all three. Iterating the face
  // list in order keeps the generated ids stable between builds.
  for (let first = 0; first < FACE_VIEWS.length; first += 1) {
    for (let second = first + 1; second < FACE_VIEWS.length; second += 1) {
      const [axisA, signA] = FACE_VIEWS[first] as [0 | 1 | 2, -1 | 1, StandardView]
      const [axisB, signB] = FACE_VIEWS[second] as [0 | 1 | 2, -1 | 1, StandardView]
      if (axisA === axisB) continue
      const axes = [
        [axisA, signA],
        [axisB, signB],
      ] as const
      regions.push({
        id: regionName(axes),
        kind: 'edge',
        label: '',
        direction: normalize(add(axisVector(axisA, signA), axisVector(axisB, signB))),
        axes,
      })
    }
  }

  for (const signX of [-1, 1] as const) {
    for (const signY of [-1, 1] as const) {
      for (const signZ of [-1, 1] as const) {
        const axes = [
          [0, signX],
          [1, signY],
          [2, signZ],
        ] as const
        regions.push({
          id: regionName(axes),
          kind: 'corner',
          label: '',
          direction: normalize({ x: signX, y: signY, z: signZ }),
          axes,
        })
      }
    }
  }

  return regions
}

export const VIEW_CUBE_REGIONS: readonly ViewCubeRegion[] = buildRegions()

export function regionById(id: string): ViewCubeRegion | undefined {
  return VIEW_CUBE_REGIONS.find((region) => region.id === id)
}

/** The region the camera is currently looking at the cube from. */
export function activeRegion(eye: Vec3): ViewCubeRegion {
  const unit = normalize(eye)
  let best = VIEW_CUBE_REGIONS[0] as ViewCubeRegion
  let bestScore = -Infinity
  for (const region of VIEW_CUBE_REGIONS) {
    const score = dot(unit, region.direction)
    if (score > bestScore + 1e-9) {
      bestScore = score
      best = region
    }
  }
  return best
}

/**
 * The camera orientation a region snaps to. Face regions reuse the standard
 * views so the up vector matches the menu; edges and corners keep world up,
 * except on the poles where that would be degenerate.
 */
export function orientationForRegion(region: ViewCubeRegion): CameraOrientation {
  if (region.kind === 'face') return orientationFor(region.id as StandardView)
  const up = Math.abs(region.direction.z) > 0.999 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 }
  return { eye: region.direction, up }
}

/** A cube corner, face or hotspot after projection into widget coordinates. */
export interface ProjectedPoint {
  readonly x: number
  readonly y: number
  /** Distance towards the viewer; larger is nearer. */
  readonly depth: number
}

export interface ProjectedFace {
  readonly regionId: string
  readonly label: string
  readonly points: readonly ProjectedPoint[]
  readonly depth: number
  /** Faces turned away from the camera are not drawn or picked. */
  readonly visible: boolean
}

export interface ProjectedHotspot {
  readonly regionId: string
  readonly kind: ViewCubeRegionKind
  readonly center: ProjectedPoint
  readonly visible: boolean
}

export interface ProjectedCube {
  readonly faces: readonly ProjectedFace[]
  readonly hotspots: readonly ProjectedHotspot[]
}

const CORNERS: readonly Vec3[] = (() => {
  const corners: Vec3[] = []
  for (const z of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const x of [-1, 1]) corners.push({ x, y, z })
    }
  }
  return corners
})()

/** The four cube corners of a face, wound so the outline never self-crosses. */
function faceCorners(axis: 0 | 1 | 2, sign: -1 | 1): Vec3[] {
  const others = [0, 1, 2].filter((candidate) => candidate !== axis) as (0 | 1 | 2)[]
  const [u, v] = others as [0 | 1 | 2, 0 | 1 | 2]
  const wind: readonly (readonly [-1 | 1, -1 | 1])[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
  return wind.map(([su, sv]) => {
    const point = [0, 0, 0]
    point[axis] = sign
    point[u] = su
    point[v] = sv
    return { x: point[0] as number, y: point[1] as number, z: point[2] as number }
  })
}

/**
 * Projects the cube orthographically through the camera's screen basis. Screen
 * Y grows downwards, matching SVG, so the widget can use the numbers directly.
 */
export function projectViewCube(orientation: CameraOrientation, size = 1): ProjectedCube {
  const basis = screenBasis(orientation)
  const project = (point: Vec3): ProjectedPoint => ({
    x: dot(point, basis.right) * size,
    y: -dot(point, basis.up) * size,
    depth: dot(point, basis.forward),
  })

  const faces: ProjectedFace[] = FACE_VIEWS.map(([axis, sign, view]) => {
    const normal = axisVector(axis, sign)
    const facing = dot(normal, basis.forward)
    const points = faceCorners(axis, sign).map(project)
    return {
      regionId: view,
      label: capitalize(view),
      points,
      depth: facing,
      visible: facing > 1e-6,
    }
  })

  const hotspots: ProjectedHotspot[] = VIEW_CUBE_REGIONS.filter(
    (region) => region.kind !== 'face',
  ).map((region) => {
    const center = hotspotCenter(region)
    return {
      regionId: region.id,
      kind: region.kind,
      center: project(center),
      // A corner or edge is reachable when at least one of the faces it touches
      // is turned towards the camera.
      visible: region.axes.some(([axis, sign]) => dot(axisVector(axis, sign), basis.forward) > 1e-6),
    }
  })

  return { faces, hotspots: hotspots.filter((hotspot) => hotspot.visible) }
}

/** Where a corner or edge region sits on the cube surface. */
function hotspotCenter(region: ViewCubeRegion): Vec3 {
  const point = [0, 0, 0]
  for (const [axis, sign] of region.axes) point[axis] = sign
  return { x: point[0] as number, y: point[1] as number, z: point[2] as number }
}

/** Faces sorted back to front, so painting them in order gives correct overlap. */
export function paintOrder(cube: ProjectedCube): ProjectedFace[] {
  return [...cube.faces].filter((face) => face.visible).sort((a, b) => a.depth - b.depth)
}

/** Whether a point in widget coordinates lies inside a projected face. */
export function containsPoint(face: ProjectedFace, x: number, y: number): boolean {
  const points = face.points
  if (points.length < 3) return false
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i] as ProjectedPoint
    const b = points[j] as ProjectedPoint
    const straddles = a.y > y !== b.y > y
    if (straddles && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/**
 * The region under a point in widget coordinates. Hotspots win over faces
 * within `hotspotRadius`, which is what makes the small corner targets usable.
 */
export function pickRegion(
  cube: ProjectedCube,
  x: number,
  y: number,
  hotspotRadius: number,
): ViewCubeRegion | null {
  let closest: ProjectedHotspot | null = null
  let closestDistance = hotspotRadius
  for (const hotspot of cube.hotspots) {
    const distance = Math.hypot(hotspot.center.x - x, hotspot.center.y - y)
    if (distance <= closestDistance) {
      closestDistance = distance
      closest = hotspot
    }
  }
  if (closest) return regionById(closest.regionId) ?? null

  const faces = paintOrder(cube)
  for (let index = faces.length - 1; index >= 0; index -= 1) {
    const face = faces[index] as ProjectedFace
    if (containsPoint(face, x, y)) return regionById(face.regionId) ?? null
  }
  return null
}

/** The widget-space radius the cube needs, i.e. its longest projected diagonal. */
export function projectedRadius(orientation: CameraOrientation, size = 1): number {
  const basis = screenBasis(orientation)
  let radius = 0
  for (const corner of CORNERS) {
    radius = Math.max(radius, Math.hypot(dot(corner, basis.right), dot(corner, basis.up)) * size)
  }
  return radius
}

/**
 * Turns a drag across the widget into an orbit. Dragging a cube width spins the
 * camera half a turn, which is the rate that feels right at typical widget
 * sizes.
 */
export const DRAG_RADIANS_PER_UNIT = Math.PI / 2

export function dragToOrbit(deltaX: number, deltaY: number, size: number): {
  azimuth: number
  elevation: number
} {
  const span = Math.max(size, 1e-6)
  return {
    azimuth: (-deltaX / span) * DRAG_RADIANS_PER_UNIT,
    elevation: (deltaY / span) * DRAG_RADIANS_PER_UNIT,
  }
}

/**
 * The region a quarter turn to the left or right of the camera — what the
 * rotate arrows around the cube step to.
 */
export function neighbourRegion(orientation: CameraOrientation, turn: -1 | 1): ViewCubeRegion {
  const basis = screenBasis(orientation)
  return activeRegion(normalize(scale(basis.right, turn)))
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
