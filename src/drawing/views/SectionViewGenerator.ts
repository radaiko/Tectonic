import type { MeshData, MeshPoint } from '../../domain/MeshData'
import type { Vec2 } from '../../sketch/domain/geometry'
import type { SectionKind, SectionLine } from '../domain/DrawingView'
import { sectionPath } from '../domain/DrawingView'
import type { Bounds2, Segment2 } from './geometry2d'
import { boundsOf, chainSegments, isClosedLoop } from './geometry2d'
import type { HatchOptions } from './hatching'
import { DEFAULT_HATCH_ANGLE, hatchLoops } from './hatching'
import type { Plane, Segment3 } from './meshClip'
import { sliceWithinRegion, subtractRegions } from './meshClip'
import type { ViewGeometry, ViewGeometryOptions } from './ViewGenerator'
import { EMPTY_VIEW_GEOMETRY, generateViewGeometry } from './ViewGenerator'
import type { ProjectionFrame } from './viewAxes'
import {
  addPoints,
  cross,
  dot,
  frameAcrossLine,
  negate,
  normalize,
  projectPoint,
  scalePoint3,
  subtract,
} from './viewAxes'

/**
 * Section views: cut the model, look at what is left, hatch the face the cut
 * exposed.
 *
 * The cut is described the way a drafter describes it — a line drawn across the
 * parent view, with arrows — and everything else follows from that. The line's
 * direction and the parent's line of sight together fix the cutting plane; the
 * arrows fix which side of it goes away and, with it, the frame the section is
 * seen through. That frame comes out equal to the standard side or top view
 * whenever the section line is drawn square to the parent, which is what makes
 * a section slot into a normal projected layout.
 *
 * Every cut shape is expressed as convex regions of half-spaces so one clipper
 * handles all five: a full section is one plane, a half section adds a second,
 * an offset section is a run of cells, and a broken-out section is a prism
 * approximated by tangent planes.
 */

export interface SectionOptions extends ViewGeometryOptions {
  /** The frame the section line was drawn in. */
  readonly parentFrame: ProjectionFrame
  /** The section line, in the parent view's drawing coordinates (model units). */
  readonly sectionLine: SectionLine
  /** Overrides the line's own kind. */
  readonly kind?: SectionKind
  readonly hatch?: HatchOptions
  /** Sides used to approximate a broken-out section's boundary. */
  readonly breakSides?: number
}

export interface SectionGeometry extends ViewGeometry {
  /** The frame the section is seen through. */
  readonly frame: ProjectionFrame
  /** Outline of the face the cut exposed, in the section's coordinates. */
  readonly cutBoundary: readonly Segment2[]
  readonly hatch: readonly Segment2[]
  /** The closed loops the hatch was filled into. */
  readonly cutLoops: readonly (readonly Vec2[])[]
}

const DEFAULT_BREAK_SIDES = 24

export function generateSectionView(
  mesh: MeshData,
  options: SectionOptions,
): SectionGeometry {
  const { parentFrame, sectionLine } = options
  const kind = options.kind ?? sectionLine.kind ?? 'full'
  const path = sectionPath(sectionLine)

  const frame = sectionFrame(parentFrame, sectionLine)
  const regions = removalRegions(mesh, frame, parentFrame, sectionLine, kind, options.breakSides)

  if (regions.length === 0) {
    return { ...EMPTY_VIEW_GEOMETRY, frame, cutBoundary: [], hatch: [], cutLoops: [] }
  }

  let remaining = subtractRegions(mesh, regions)

  // A rotated (aligned) section swings the angled leg of the cut into the
  // plane of the drawing before it is projected.
  const rotation = kind === 'rotated' ? ((sectionLine.rotation ?? 0) * Math.PI) / 180 : 0
  const pivot = liftPoint(path[0] as Vec2, parentFrame)
  if (rotation !== 0) {
    remaining = rotateMesh(remaining, pivot, parentFrame.direction, rotation)
  }

  const geometry = generateViewGeometry(remaining, frame, options)

  // The cut face: slice the untouched model with each cutting plane, keep the
  // part of the slice that falls inside the region that was removed.
  const cut3d: Segment3[] = []
  for (const region of regions) {
    const plane = region[0]
    if (!plane) continue
    for (const segment of sliceWithinRegion(mesh, plane, region.slice(1))) cut3d.push(segment)
  }

  const cutBoundary = cut3d.map((segment) => ({
    a: projectPoint(rotation === 0 ? segment.a : rotateAbout(segment.a, pivot, parentFrame.direction, rotation), frame),
    b: projectPoint(rotation === 0 ? segment.b : rotateAbout(segment.b, pivot, parentFrame.direction, rotation), frame),
  }))

  const loops = chainSegments(cutBoundary, hatchTolerance(cutBoundary)).filter((loop) =>
    isClosedLoop(loop, hatchTolerance(cutBoundary)),
  )
  const spacing = options.hatch?.spacing ?? defaultSpacing(geometry.bounds)
  const hatch = hatchLoops(loops, {
    angle: options.hatch?.angle ?? sectionLine.hatchAngle ?? DEFAULT_HATCH_ANGLE,
    spacing: sectionLine.hatchSpacing ?? spacing,
    ...(options.hatch?.phase === undefined ? {} : { phase: options.hatch.phase }),
  })

  return {
    ...geometry,
    frame,
    cutBoundary,
    hatch,
    cutLoops: loops,
  }
}

/** The frame a section drawn on `parentFrame` is seen through. */
export function sectionFrame(parentFrame: ProjectionFrame, line: SectionLine): ProjectionFrame {
  const path = sectionPath(line)
  return frameAcrossLine(
    parentFrame,
    path[0] as Vec2,
    path[path.length - 1] as Vec2,
    line.flip ?? false,
  )
}

/** The half-space regions the cut takes out of the model. */
function removalRegions(
  mesh: MeshData,
  frame: ProjectionFrame,
  parentFrame: ProjectionFrame,
  line: SectionLine,
  kind: SectionKind,
  breakSides?: number,
): Plane[][] {
  const path = sectionPath(line)
  if (path.length < 2) return []

  const start = liftPoint(path[0] as Vec2, parentFrame)
  const end = liftPoint(path[path.length - 1] as Vec2, parentFrame)

  switch (kind) {
    case 'full':
    case 'rotated':
      return [[cutPlaneThrough(start, frame)]]

    case 'half': {
      // Stop the cut half way along the section line: the quadrant nearer the
      // viewer *and* on the near side of the line is what goes.
      const along = normalize(subtract(end, start))
      if (along === null) return [[cutPlaneThrough(start, frame)]]
      const stop = line.depth ?? 0.5
      const midpoint = addPoints(start, scalePoint3(subtract(end, start), clamp01(stop)))
      return [[cutPlaneThrough(start, frame), { normal: along, offset: dot(along, midpoint) }]]
    }

    case 'offset': {
      const regions: Plane[][] = []
      for (let index = 0; index + 1 < path.length; index += 1) {
        const from = liftPoint(path[index] as Vec2, parentFrame)
        const to = liftPoint(path[index + 1] as Vec2, parentFrame)
        const along = normalize(subtract(to, from))
        if (along === null) continue

        // One cell per leg: its own cutting plane, walled off at the jogs so
        // the neighbouring leg's cut does not run through it.
        const legFrame = sectionFrame(parentFrame, {
          ...line,
          start: path[index] as Vec2,
          end: path[index + 1] as Vec2,
          points: [],
        })
        const region: Plane[] = [cutPlaneThrough(from, legFrame)]
        if (index > 0) region.push({ normal: negate(along), offset: -dot(along, from) })
        if (index + 2 < path.length) region.push({ normal: along, offset: dot(along, to) })
        regions.push(region)
      }
      return regions
    }

    case 'broken-out': {
      // The break is a prism through the model: a regular polygon standing in
      // for the circle the drafter drew, capped at the break depth.
      const sides = Math.max(breakSides ?? DEFAULT_BREAK_SIDES, 3)
      const center = midpoint(start, end)
      const radius = Math.max(distance3(start, end) / 2, 1e-6)
      const region: Plane[] = [cutPlaneThrough(depthPoint(mesh, center, frame, line.depth), frame)]
      for (let index = 0; index < sides; index += 1) {
        const angle = (index / sides) * Math.PI * 2
        const normal = normalize(
          addPoints(
            scalePoint3(parentFrame.right, Math.cos(angle)),
            scalePoint3(parentFrame.up, Math.sin(angle)),
          ),
        )
        if (!normal) continue
        region.push({ normal, offset: dot(normal, center) + radius })
      }
      return [region]
    }
  }
}

/** Everything nearer the eye than `point` is what a cut takes away. */
function cutPlaneThrough(point: MeshPoint, frame: ProjectionFrame): Plane {
  return { normal: frame.direction, offset: dot(frame.direction, point) }
}

/**
 * How deep a broken-out section reaches. A depth on the section line is taken
 * as a distance in front of the model's nearest point; without one the break
 * goes half way through.
 */
function depthPoint(
  mesh: MeshData,
  center: MeshPoint,
  frame: ProjectionFrame,
  depth: number | undefined,
): MeshPoint {
  let near = Infinity
  let far = -Infinity
  for (let index = 0; index + 2 < mesh.positions.length; index += 3) {
    const point = {
      x: mesh.positions[index] as number,
      y: mesh.positions[index + 1] as number,
      z: mesh.positions[index + 2] as number,
    }
    const value = dot(frame.direction, point)
    near = Math.min(near, value)
    far = Math.max(far, value)
  }
  if (!Number.isFinite(near) || !Number.isFinite(far)) return center

  const reach = depth ?? (far - near) / 2
  const centerDepth = dot(frame.direction, center)
  const target = near + reach
  return addPoints(center, scalePoint3(frame.direction, target - centerDepth))
}

/** A point on the parent view's paper, lifted back into the model. */
export function liftPoint(point: Vec2, frame: ProjectionFrame): MeshPoint {
  return addPoints(
    scalePoint3(frame.right, point.x),
    scalePoint3(frame.up, point.y),
  )
}

function rotateMesh(mesh: MeshData, pivot: MeshPoint, axis: MeshPoint, radians: number): MeshData {
  const positions = [...mesh.positions]
  for (let index = 0; index + 2 < positions.length; index += 3) {
    const rotated = rotateAbout(
      {
        x: positions[index] as number,
        y: positions[index + 1] as number,
        z: positions[index + 2] as number,
      },
      pivot,
      axis,
      radians,
    )
    positions[index] = rotated.x
    positions[index + 1] = rotated.y
    positions[index + 2] = rotated.z
  }
  return { positions, normals: [...mesh.normals], indices: [...mesh.indices] }
}

/** Rodrigues rotation of a point about an axis through a pivot. */
export function rotateAbout(
  point: MeshPoint,
  pivot: MeshPoint,
  axis: MeshPoint,
  radians: number,
): MeshPoint {
  const unit = normalize(axis)
  if (unit === null || radians === 0) return point

  const relative = subtract(point, pivot)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const parallel = scalePoint3(unit, dot(unit, relative))
  const perpendicular = subtract(relative, parallel)
  const turned = addPoints(
    addPoints(scalePoint3(perpendicular, cosine), scalePoint3(cross(unit, perpendicular), sine)),
    parallel,
  )
  return addPoints(pivot, turned)
}

function midpoint(a: MeshPoint, b: MeshPoint): MeshPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}

function distance3(a: MeshPoint, b: MeshPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function defaultSpacing(bounds: Bounds2): number {
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  return span > 0 ? span / 20 : 1
}

function hatchTolerance(segments: readonly Segment2[]): number {
  const bounds = boundsOf(segments)
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  return span > 0 ? span * 1e-5 : 1e-6
}
