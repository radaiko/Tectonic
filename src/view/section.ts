import type { Vec3 } from '../domain/vec3'
import { dot, normalize, scale, subtract, UNIT_X, UNIT_Y, UNIT_Z } from '../domain/vec3'
import type { SectionMode } from './types'

/**
 * A half-space the scene is cut back to. Points with
 * `dot(normal, point) + constant < 0` are removed, which is the same sign
 * convention three.js uses for `THREE.Plane`.
 */
export interface SectionPlaneSpec {
  readonly normal: Vec3
  readonly constant: number
}

export type SectionAxis = 'x' | 'y' | 'z'

export interface SectionState {
  readonly mode: SectionMode
  /** Where the cut passes through, in world units, per axis. */
  readonly offsets: Readonly<Record<SectionAxis, number>>
  /** Flipping an axis keeps the other half of the model instead. */
  readonly flipped: Readonly<Record<SectionAxis, boolean>>
  /** Fill drawn on the cut surface so the section reads as solid. */
  readonly fillColor: string
  /** Show the draggable plane outline in the viewport. */
  readonly showPlane: boolean
}

export const SECTION_MODES: readonly SectionMode[] = ['off', 'half', 'quarter', 'octant']

const MODE_LABELS: Record<SectionMode, string> = {
  off: 'No section',
  half: 'Half section',
  quarter: 'Quarter section',
  octant: 'Octant section',
}

/** Which axes each mode cuts on: half cuts one, quarter two, octant all three. */
const MODE_AXES: Record<SectionMode, readonly SectionAxis[]> = {
  off: [],
  half: ['x'],
  quarter: ['x', 'y'],
  octant: ['x', 'y', 'z'],
}

const AXIS_NORMALS: Record<SectionAxis, Vec3> = { x: UNIT_X, y: UNIT_Y, z: UNIT_Z }

export const DEFAULT_SECTION_FILL = '#d98f4d'

export function createSectionState(overrides: Partial<SectionState> = {}): SectionState {
  return {
    mode: 'off',
    offsets: { x: 0, y: 0, z: 0 },
    flipped: { x: false, y: false, z: false },
    fillColor: DEFAULT_SECTION_FILL,
    showPlane: true,
    ...overrides,
  }
}

export function sectionModeLabel(mode: SectionMode): string {
  return MODE_LABELS[mode]
}

export function sectionAxes(mode: SectionMode): readonly SectionAxis[] {
  return MODE_AXES[mode]
}

/**
 * The clipping half-spaces for a section state. An unflipped axis keeps the
 * half *below* the offset, so raising the offset on X reveals more of the model
 * from the -X side inwards.
 */
export function sectionPlanes(state: SectionState): SectionPlaneSpec[] {
  return MODE_AXES[state.mode].map((axis) => {
    const outward = state.flipped[axis] ? 1 : -1
    return {
      normal: scale(AXIS_NORMALS[axis], outward),
      constant: state.offsets[axis] * outward * -1,
    }
  })
}

/** Whether a point survives the section, i.e. is inside every half-space. */
export function isPointVisible(point: Vec3, planes: readonly SectionPlaneSpec[]): boolean {
  return planes.every((plane) => dot(plane.normal, point) + plane.constant >= 0)
}

export function setSectionMode(state: SectionState, mode: SectionMode): SectionState {
  return { ...state, mode }
}

export function setSectionOffset(state: SectionState, axis: SectionAxis, offset: number): SectionState {
  if (!Number.isFinite(offset)) return state
  return { ...state, offsets: { ...state.offsets, [axis]: offset } }
}

export function flipSectionAxis(state: SectionState, axis: SectionAxis): SectionState {
  return { ...state, flipped: { ...state.flipped, [axis]: !state.flipped[axis] } }
}

/**
 * Drags a section plane along its own normal by a world-space delta projected
 * onto that normal — the arithmetic behind grabbing the plane in the viewport.
 */
export function dragSectionPlane(
  state: SectionState,
  axis: SectionAxis,
  worldDelta: Vec3,
): SectionState {
  return setSectionOffset(state, axis, state.offsets[axis] + dot(AXIS_NORMALS[axis], worldDelta))
}

/**
 * Where a segment crosses a section plane, or null when both ends sit on the
 * same side. Used to draw the outline of the cut surface.
 */
export function intersectSegment(
  start: Vec3,
  end: Vec3,
  plane: SectionPlaneSpec,
): Vec3 | null {
  const normal = normalize(plane.normal)
  const startSide = dot(normal, start) + plane.constant
  const endSide = dot(normal, end) + plane.constant
  if ((startSide > 0 && endSide > 0) || (startSide < 0 && endSide < 0)) return null
  const denominator = startSide - endSide
  if (Math.abs(denominator) < 1e-12) return null
  const t = startSide / denominator
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t,
  }
}

/** Distance from a point to a section plane; negative means it is clipped away. */
export function signedDistance(point: Vec3, plane: SectionPlaneSpec): number {
  return dot(normalize(plane.normal), point) + plane.constant
}

/** The point on the plane closest to `point` — where a drag handle should sit. */
export function projectOntoPlane(point: Vec3, plane: SectionPlaneSpec): Vec3 {
  const normal = normalize(plane.normal)
  return subtract(point, scale(normal, signedDistance(point, plane)))
}
