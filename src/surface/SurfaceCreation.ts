import type { Vec3 } from '../kernel/IKernel'
import { createSurfaceBody } from './SurfaceBody'
import {
  addV,
  bestFitPlane,
  crossV,
  curveLength,
  distanceV,
  dotV,
  isClosedCurve,
  lengthV,
  lerpV,
  meshFromGrid,
  normalizeV,
  offsetMesh,
  perpendicularV,
  resampleCurve,
  reverseCurve,
  rotateAboutAxis,
  sameV,
  scaleV,
  subV,
  triangulateLoop,
  weldCurve,
} from './geometry'
import type {
  Curve3,
  SurfaceBody,
  SurfaceNaming,
  SurfaceSweepOrientation,
} from './types'
import { SURFACE_TOLERANCE, SurfaceError } from './types'

/**
 * Building surfaces from curves.
 *
 * Every operation here works the same way: sample the input curves into rows of
 * matching length, then stitch the rows into a sheet. That keeps extrude, revolve,
 * sweep, loft, ruled and boundary surfaces on one code path and means an open
 * profile produces a surface where the solid features would have produced a body.
 */

/** Rows a swept or blended surface is sampled at, unless the caller says otherwise. */
const DEFAULT_SAMPLES = 24
/** Facets per full turn of a revolved surface. */
const REVOLVE_SEGMENTS_PER_TURN = 48

const DEG = Math.PI / 180

export interface ExtrudeSurfaceParams {
  readonly curve: Curve3
  /** Sweep direction. Need not be a unit vector. */
  readonly direction: Vec3
  readonly distance: number
  /** Splits the sweep evenly either side of the curve. */
  readonly symmetric?: boolean
}

/** Sweeps a curve along a straight line — the surface an open profile extrudes to. */
export function extrudeSurface(
  params: ExtrudeSurfaceParams,
  naming: SurfaceNaming = {},
): SurfaceBody {
  const { curve, direction, distance, symmetric = false } = params
  const unit = normalizeV(direction)
  if (lengthV(unit) < 0.5) {
    throw new SurfaceError('An extruded surface needs a non-zero direction')
  }
  if (!(Math.abs(distance) > 0)) {
    throw new SurfaceError('An extruded surface needs a non-zero distance')
  }

  const { points, closed } = openOrClosed(curve, 2)
  const back = symmetric ? -distance / 2 : 0
  const front = symmetric ? distance / 2 : distance

  return createSurfaceBody(
    meshFromGrid(
      [
        points.map((point) => addV(point, scaleV(unit, back))),
        points.map((point) => addV(point, scaleV(unit, front))),
      ],
      { closeColumns: closed },
    ),
    { name: 'Extruded Surface', ...naming },
  )
}

export interface RevolveSurfaceParams {
  readonly curve: Curve3
  readonly axisOrigin: Vec3
  readonly axisDirection: Vec3
  /** Sweep angle in degrees. 360 closes the surface around the axis. */
  readonly angle: number
  readonly symmetric?: boolean
  readonly segments?: number
}

/** Spins a curve about an axis. A full turn wraps the rows back on themselves. */
export function revolveSurface(
  params: RevolveSurfaceParams,
  naming: SurfaceNaming = {},
): SurfaceBody {
  const { curve, axisOrigin, axisDirection, angle, symmetric = false } = params
  const axis = normalizeV(axisDirection)
  if (lengthV(axis) < 0.5) {
    throw new SurfaceError('A revolved surface needs a non-zero axis')
  }
  if (!(Math.abs(angle) > 0)) {
    throw new SurfaceError('A revolved surface needs a non-zero angle')
  }

  const { points, closed } = openOrClosed(curve, 2)
  const full = Math.abs(angle) >= 360 - 1e-9
  const sweep = full ? 360 : angle
  const segments =
    params.segments ??
    Math.max(3, Math.ceil((Math.abs(sweep) / 360) * REVOLVE_SEGMENTS_PER_TURN))
  const start = symmetric ? -sweep / 2 : 0

  const rows: Vec3[][] = []
  // A full turn stops one step short: `closeRows` supplies the seam instead of a
  // duplicated ring, which would leave a zero-width band of triangles behind.
  const rings = full ? segments : segments + 1
  for (let step = 0; step < rings; step += 1) {
    const rotation = (start + (sweep * step) / segments) * DEG
    rows.push(points.map((point) => rotateAboutAxis(point, axisOrigin, axis, rotation)))
  }

  return createSurfaceBody(meshFromGrid(rows, { closeRows: full, closeColumns: closed }), {
    name: 'Revolved Surface',
    ...naming,
  })
}

export interface SweepSurfaceParams {
  readonly profile: Curve3
  /** Path the profile travels along, in world space. */
  readonly path: Curve3
  readonly orientation?: SurfaceSweepOrientation
  /** Total twist about the path, in degrees. */
  readonly twistAngle?: number
}

/**
 * Sweeps a profile along a path. `follow-path` turns the profile with the path's
 * tangent, rotating it by the smallest rotation that takes the previous tangent to
 * the current one; `perpendicular` slides it along without turning it.
 */
export function sweepSurface(
  params: SweepSurfaceParams,
  naming: SurfaceNaming = {},
): SurfaceBody {
  const { profile, orientation = 'follow-path', twistAngle = 0 } = params
  const path = weldCurve(params.path)
  if (path.length < 2) throw new SurfaceError('A swept surface needs a path of at least two points')

  const { points, closed } = openOrClosed(profile, 2)
  const origin = path[0] as Vec3
  const tangents = pathTangents(path)
  const initial = tangents[0] as Vec3

  const rows: Vec3[][] = path.map((station, index) => {
    const shift = subV(station, origin)
    const twist = (twistAngle * index * DEG) / Math.max(1, path.length - 1)
    return points.map((point) => {
      let local = subV(point, origin)
      if (orientation === 'follow-path') {
        local = alignToTangent(local, initial, tangents[index] as Vec3)
      }
      if (twist !== 0) {
        local = rotateAboutAxis(local, { x: 0, y: 0, z: 0 }, tangents[index] as Vec3, twist)
      }
      return addV(addV(origin, local), shift)
    })
  })

  return createSurfaceBody(meshFromGrid(rows, { closeColumns: closed }), {
    name: 'Swept Surface',
    ...naming,
  })
}

export interface LoftSurfaceParams {
  readonly sections: readonly Curve3[]
  /** Joins the last section back to the first. */
  readonly closed?: boolean
  /** Points each section is resampled to. Defaults to the busiest section. */
  readonly samples?: number
}

/** Blends a run of cross-sections into one sheet. */
export function loftSurface(params: LoftSurfaceParams, naming: SurfaceNaming = {}): SurfaceBody {
  const { sections, closed = false } = params
  if (sections.length < 2) throw new SurfaceError('A lofted surface needs at least two sections')

  const prepared = sections.map((section) => openOrClosed(section, 2))
  // Sections agree on whether they are closed loops or open profiles; mixing the
  // two has no consistent stitching, so the first section decides.
  const closedColumns = (prepared[0] as { closed: boolean }).closed
  const samples =
    params.samples ?? Math.max(...prepared.map((section) => section.points.length))

  const rows = prepared.map((section) =>
    resampleCurve(
      closedColumns && section.closed
        ? [...section.points, section.points[0] as Vec3]
        : section.points,
      closedColumns ? samples + 1 : samples,
    ),
  )
  const trimmed = closedColumns ? rows.map((row) => row.slice(0, -1)) : rows

  return createSurfaceBody(
    meshFromGrid(trimmed, { closeRows: closed, closeColumns: closedColumns }),
    { name: 'Lofted Surface', ...naming },
  )
}

export interface RuledSurfaceParams {
  readonly from: Curve3
  readonly to: Curve3
  readonly samples?: number
}

/** The straight-line blend between two curves. */
export function ruledSurface(params: RuledSurfaceParams, naming: SurfaceNaming = {}): SurfaceBody {
  const from = weldCurve(params.from)
  const to = weldCurve(params.to)
  if (from.length < 2 || to.length < 2) {
    throw new SurfaceError('A ruled surface needs two curves of at least two points each')
  }

  const samples = params.samples ?? Math.max(from.length, to.length)
  // Run the second curve the same way round as the first, so the ruling lines do
  // not cross over each other and pinch the sheet in the middle.
  const aligned = orientedLike(from, to)

  return createSurfaceBody(
    meshFromGrid([resampleCurve(from, samples), resampleCurve(aligned, samples)]),
    { name: 'Ruled Surface', ...naming },
  )
}

export interface BoundarySurfaceParams {
  /** Two curves for a ruled blend, or four that close into a loop for a patch. */
  readonly curves: readonly Curve3[]
  readonly rows?: number
  readonly columns?: number
}

/**
 * A surface spanning its boundary curves. Four curves that close into a loop give
 * a bilinearly blended Coons patch — the surface that interpolates all four
 * exactly; two curves fall back to a ruled blend.
 */
export function boundarySurface(
  params: BoundarySurfaceParams,
  naming: SurfaceNaming = {},
): SurfaceBody {
  const curves = params.curves.filter((curve) => curve.length >= 2)
  if (curves.length === 2) {
    return ruledSurface(
      { from: curves[0] as Curve3, to: curves[1] as Curve3 },
      { name: 'Boundary Surface', ...naming },
    )
  }
  if (curves.length !== 4) {
    throw new SurfaceError('A boundary surface needs either two or four boundary curves')
  }

  const [c1, c2, c3, c4] = chainCurves(curves) as [Vec3[], Vec3[], Vec3[], Vec3[]]
  const rows = Math.max(2, params.rows ?? DEFAULT_SAMPLES)
  const columns = Math.max(2, params.columns ?? DEFAULT_SAMPLES)

  // Corner naming: p00 -> p10 along c1, p10 -> p11 along c2, and so on round the loop.
  const bottom = resampleCurve(c1, columns)
  const right = resampleCurve(c2, rows)
  const top = resampleCurve(reverseCurve(c3), columns)
  const left = resampleCurve(reverseCurve(c4), rows)

  const p00 = bottom[0] as Vec3
  const p10 = bottom[columns - 1] as Vec3
  const p01 = top[0] as Vec3
  const p11 = top[columns - 1] as Vec3

  const grid: Vec3[][] = []
  for (let row = 0; row < rows; row += 1) {
    const v = row / (rows - 1)
    const points: Vec3[] = []
    for (let column = 0; column < columns; column += 1) {
      const u = column / (columns - 1)
      const alongU = lerpV(bottom[column] as Vec3, top[column] as Vec3, v)
      const alongV = lerpV(left[row] as Vec3, right[row] as Vec3, u)
      const corners = addV(
        addV(scaleV(p00, (1 - u) * (1 - v)), scaleV(p10, u * (1 - v))),
        addV(scaleV(p01, (1 - u) * v), scaleV(p11, u * v)),
      )
      points.push(subV(addV(alongU, alongV), corners))
    }
    grid.push(points)
  }

  return createSurfaceBody(meshFromGrid(grid), { name: 'Boundary Surface', ...naming })
}

export interface PatchSurfaceParams {
  /** One closed loop, or the curves that chain into one. */
  readonly curves: readonly Curve3[]
  /** Normal the patch should face. Defaults to the loop's own best-fit plane. */
  readonly normal?: Vec3
}

/** Fills a closed boundary of curves with a single sheet. */
export function patchSurface(params: PatchSurfaceParams, naming: SurfaceNaming = {}): SurfaceBody {
  const curves = params.curves.filter((curve) => curve.length >= 2)
  if (curves.length === 0) throw new SurfaceError('A patch needs a boundary to fill')

  const chained = curves.length === 1 ? weldCurve(curves[0] as Curve3) : joinChain(chainCurves(curves))
  const first = chained[0] as Vec3
  const last = chained[chained.length - 1] as Vec3
  if (!sameV(first, last, CURVE_JOIN_TOLERANCE)) {
    throw new SurfaceError('A patch needs a closed boundary')
  }
  // Drop the closing point however near it landed, so the fan gets no sliver.
  const loop = chained.length > 3 && sameV(first, last, CURVE_JOIN_TOLERANCE) ? chained.slice(0, -1) : chained

  return createSurfaceBody(triangulateLoop(loop, params.normal ?? bestFitPlane(loop).normal), {
    name: 'Patch',
    ...naming,
  })
}

/** Copies a surface, displacing every point along the surface's own normal. */
export function offsetSurface(
  body: SurfaceBody,
  distance: number,
  naming: SurfaceNaming = {},
): SurfaceBody {
  if (!(Math.abs(distance) > 0)) {
    throw new SurfaceError('An offset surface needs a non-zero distance')
  }
  return createSurfaceBody(offsetMesh(body.mesh, distance), {
    name: `${body.name} Offset`,
    ...naming,
  })
}

/* -------------------------------------------------------------------------- */

/**
 * A curve prepared for stitching: welded, with a closed loop's repeated last
 * point dropped so the wrap-around is left to the grid builder.
 */
function openOrClosed(curve: Curve3, minimum: number): { points: Vec3[]; closed: boolean } {
  const welded = weldCurve(curve)
  const closed = isClosedCurve(welded)
  const points = closed ? welded.slice(0, -1) : welded
  if (points.length < minimum) {
    throw new SurfaceError(`A surface curve needs at least ${minimum} distinct points`)
  }
  return { points, closed }
}

/** Unit tangents along a path, one per station. */
function pathTangents(path: readonly Vec3[]): Vec3[] {
  return path.map((_station, index) => {
    const before = path[Math.max(0, index - 1)] as Vec3
    const after = path[Math.min(path.length - 1, index + 1)] as Vec3
    const tangent = normalizeV(subV(after, before))
    return lengthV(tangent) < 0.5 ? { x: 0, y: 0, z: 1 } : tangent
  })
}

/** Rotates a profile-local offset by the turn that takes `from` to `to`. */
function alignToTangent(local: Vec3, from: Vec3, to: Vec3): Vec3 {
  const axis = crossV(from, to)
  if (lengthV(axis) < 1e-9) {
    // Parallel tangents need no turn; anti-parallel ones flip about any perpendicular.
    return dotV(from, to) >= 0
      ? local
      : rotateAboutAxis(local, { x: 0, y: 0, z: 0 }, perpendicularV(from), Math.PI)
  }
  const angle = Math.atan2(lengthV(axis), dotV(from, to))
  return rotateAboutAxis(local, { x: 0, y: 0, z: 0 }, axis, angle)
}

/** `candidate`, reversed when running it as given would cross the ruling lines. */
function orientedLike(reference: readonly Vec3[], candidate: readonly Vec3[]): Vec3[] {
  const first = reference[0] as Vec3
  const last = reference[reference.length - 1] as Vec3
  const start = candidate[0] as Vec3
  const end = candidate[candidate.length - 1] as Vec3

  const asGiven = distanceV(first, start) + distanceV(last, end)
  const reversed = distanceV(first, end) + distanceV(last, start)
  return reversed < asGiven ? reverseCurve(candidate) : [...candidate]
}

/**
 * Orders curves head to tail into a loop, flipping any that were drawn the other
 * way round. Boundary and patch surfaces both need their inputs in loop order and
 * neither can ask the user to supply them that way.
 */
export function chainCurves(curves: readonly Curve3[], tolerance = 1e-3): Vec3[][] {
  const remaining = curves.map((curve) => weldCurve(curve))
  const chain: Vec3[][] = [remaining.shift() as Vec3[]]

  while (remaining.length > 0) {
    const tail = chain[chain.length - 1] as Vec3[]
    const end = tail[tail.length - 1] as Vec3

    let bestIndex = -1
    let bestDistance = Infinity
    let bestFlipped = false
    remaining.forEach((candidate, index) => {
      const start = candidate[0] as Vec3
      const finish = candidate[candidate.length - 1] as Vec3
      const forward = distanceV(end, start)
      const backward = distanceV(end, finish)
      const nearest = Math.min(forward, backward)
      if (nearest < bestDistance) {
        bestDistance = nearest
        bestIndex = index
        bestFlipped = backward < forward
      }
    })

    if (bestIndex === -1 || bestDistance > Math.max(tolerance, curveLength(tail) * 1e-3)) {
      throw new SurfaceError('The boundary curves do not join up into a loop')
    }
    const [picked] = remaining.splice(bestIndex, 1) as [Vec3[]]
    chain.push(bestFlipped ? reverseCurve(picked) : picked)
  }
  return chain
}

/** Exported so `SurfaceEditing` and the tests share one idea of "joins up". */
export const CURVE_JOIN_TOLERANCE = 1e-3

/** Concatenates an ordered chain into one polyline, dropping shared endpoints. */
function joinChain(chain: readonly Vec3[][]): Vec3[] {
  const joined: Vec3[] = []
  for (const curve of chain) {
    const points = joined.length === 0 ? curve : curve.slice(1)
    joined.push(...points)
  }
  return joined
}
