/**
 * Zebra stripe analysis.
 *
 * The trick is old and still the best one: park a striped environment above the
 * model and look at the reflection. Shading hides a bad join because shading is
 * smooth wherever the normal is; a reflected stripe is not, because it depends
 * on the derivative of the normal. Stripes that break across a seam mean the
 * surfaces do not touch; stripes that kink mean the tangents disagree; stripes
 * that stay joined but change width abruptly mean the curvature does.
 *
 * The stripes here are computed per vertex from the reflected eye direction, so
 * a renderer only has to paint the band index it is given, and the seam
 * classification is computed from the mesh so the panel can list the problems
 * rather than making the user hunt for them.
 */

import type { MeshData } from '../../domain/MeshData'
import type { Vec3 } from '../../domain/vec3'
import {
  UNIT_Y,
  UNIT_Z,
  add,
  cross,
  dot,
  length,
  normalize,
  scale,
  subtract,
} from '../../domain/vec3'
import { triangleCount, vertexCount } from '../../domain/MeshData'
import { buildTopology, cornersOf, edgeKey, parseEdgeKey } from '../../mesh/types'
import type { EdgeKey, MeshTopology } from '../../mesh/types'
import { AnalysisError } from './types'

export interface ZebraOptions {
  /** Stripes across a half turn of reflected direction. Higher is finer. */
  readonly density?: number
  /** Rotation of the stripe pattern about the eye direction, in degrees. */
  readonly angle?: number
  /** Animation phase in stripe widths; see {@link advanceStripes}. */
  readonly offset?: number
  /** Direction the model is looked at from. */
  readonly eye?: Vec3
  /** Degrees of normal deviation across an edge before the tangents disagree. */
  readonly tangentTolerance?: number
  /** Degrees of dihedral *change* along a run before the curvature disagrees. */
  readonly curvatureTolerance?: number
}

export const DEFAULT_ZEBRA_DENSITY = 12
export const DEFAULT_TANGENT_TOLERANCE = 8
export const DEFAULT_CURVATURE_TOLERANCE = 15

/** One vertex's place in the stripe pattern. */
export interface ZebraSample {
  readonly vertex: number
  /** Continuous stripe coordinate, in stripe widths. */
  readonly phase: number
  /** Which stripe the vertex falls in. */
  readonly band: number
  /** Whether that stripe is a dark one — all a renderer needs. */
  readonly dark: boolean
}

/** The three ways a surface junction can fail, in increasing subtlety. */
export type ContinuityDefect = 'position' | 'tangent' | 'curvature'

export interface Discontinuity {
  readonly kind: ContinuityDefect
  readonly edge: EdgeKey
  /** Endpoints of the offending edge, for drawing it. */
  readonly start: Vec3
  readonly end: Vec3
  /**
   * Degrees: the normal deviation for a tangent break, the change in that
   * deviation for a curvature break, and zero for an open edge.
   */
  readonly deviation: number
}

export interface ZebraResult {
  readonly samples: readonly ZebraSample[]
  readonly discontinuities: readonly Discontinuity[]
  readonly density: number
  readonly offset: number
  readonly eye: Vec3
  /** True when nothing worse than a curvature wobble was found. */
  readonly tangentContinuous: boolean
}

/**
 * The stripe phase for one normal.
 *
 * The reflected direction `r = 2(n·e)n − e` is what an environment map would be
 * sampled with; projecting it onto the stripe axis and scaling by the density
 * gives a coordinate that changes fast exactly where the normal turns fast.
 */
export function zebraStripe(normal: Vec3, options: ZebraOptions = {}): ZebraSample {
  const eye = normalizeOr(options.eye ?? UNIT_Z, UNIT_Z)
  const density = options.density ?? DEFAULT_ZEBRA_DENSITY
  const offset = options.offset ?? 0
  const axis = stripeAxis(eye, options.angle ?? 0)

  const unit = normalizeOr(normal, eye)
  const reflected = subtract(scale(unit, 2 * dot(unit, eye)), eye)
  const phase = dot(reflected, axis) * density + offset
  const band = Math.floor(phase)

  return { vertex: -1, phase, band, dark: mod2(band) === 0 }
}

/** The stripe pattern's direction: across the eye, rotated by `angle` degrees. */
export function stripeAxis(eye: Vec3, angle: number): Vec3 {
  const forward = normalizeOr(eye, UNIT_Z)
  const seed = Math.abs(dot(forward, UNIT_Y)) > 0.99 ? UNIT_Z : UNIT_Y
  const right = normalize(cross(seed, forward))
  const up = cross(forward, right)
  const radians = (angle * Math.PI) / 180
  return normalize(add(scale(right, Math.cos(radians)), scale(up, Math.sin(radians))))
}

/**
 * The phase to use one frame later.
 *
 * Sliding the stripes is not decoration: a defect that a static pattern happens
 * to straddle shows up the moment the stripes move over it.
 */
export function advanceStripes(offset: number, deltaSeconds: number, speed = 1): number {
  const next = offset + deltaSeconds * speed
  // Wrapped to a period of two stripes so light and dark stay where they were.
  return next - 2 * Math.floor(next / 2)
}

/** Smoothed vertex normals: the area-weighted average of the incident faces. */
export function vertexNormals(mesh: MeshData, topology?: MeshTopology): Vec3[] {
  const built = topology ?? buildTopology(mesh)
  const accumulated: Vec3[] = Array.from({ length: vertexCount(mesh) }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }))

  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const normal = built.faceNormals[triangle] ?? { x: 0, y: 0, z: 0 }
    const weight = built.doubleAreas[triangle] ?? 0
    for (const corner of cornersOf(mesh, triangle)) {
      const current = accumulated[corner] as Vec3
      accumulated[corner] = {
        x: current.x + normal.x * weight,
        y: current.y + normal.y * weight,
        z: current.z + normal.z * weight,
      }
    }
  }

  return accumulated.map((vector) => (length(vector) < 1e-12 ? UNIT_Z : normalize(vector)))
}

/**
 * Seams where the surface is not as continuous as it looks.
 *
 * An edge with one owner is an open boundary — position discontinuity. An edge
 * whose two faces disagree by more than the tangent tolerance is a crease. A
 * crease-free edge whose dihedral differs sharply from its neighbours' is a
 * curvature break: the surfaces meet and share a tangent, but the rate of turn
 * jumps, which is the defect zebra stripes were invented to catch.
 */
export function detectDiscontinuities(
  mesh: MeshData,
  options: ZebraOptions = {},
): Discontinuity[] {
  const topology = buildTopology(mesh)
  const tangentTolerance = options.tangentTolerance ?? DEFAULT_TANGENT_TOLERANCE
  const curvatureTolerance = options.curvatureTolerance ?? DEFAULT_CURVATURE_TOLERANCE

  const dihedrals = new Map<EdgeKey, number>()
  const found: Discontinuity[] = []

  for (const [key, owners] of topology.edgeTriangles) {
    const [a, b] = parseEdgeKey(key)
    const start = pointAt(mesh, a)
    const end = pointAt(mesh, b)

    if (owners.length === 1) {
      found.push({ kind: 'position', edge: key, start, end, deviation: 0 })
      continue
    }
    if (owners.length > 2) {
      // Three faces on an edge is a position defect too: the surface pinches.
      found.push({ kind: 'position', edge: key, start, end, deviation: 0 })
      continue
    }

    const first = topology.faceNormals[owners[0] as number] ?? UNIT_Z
    const second = topology.faceNormals[owners[1] as number] ?? UNIT_Z
    const deviation = angleDegrees(first, second)
    dihedrals.set(key, deviation)
    if (deviation > tangentTolerance) {
      found.push({ kind: 'tangent', edge: key, start, end, deviation })
    }
  }

  // A curvature break shows as one edge turning much harder than the edges
  // running parallel to it on the neighbouring faces.
  for (const [key, deviation] of dihedrals) {
    if (deviation > tangentTolerance) continue
    const neighbours = parallelEdges(mesh, topology, key)
      .map((other) => dihedrals.get(other))
      .filter((value): value is number => value !== undefined)
    if (neighbours.length === 0) continue

    const jump = Math.max(...neighbours.map((value) => Math.abs(value - deviation)))
    if (jump > curvatureTolerance) {
      const [a, b] = parseEdgeKey(key)
      found.push({
        kind: 'curvature',
        edge: key,
        start: pointAt(mesh, a),
        end: pointAt(mesh, b),
        deviation: jump,
      })
    }
  }

  return found
}

/** The stripe pattern over a whole mesh, with its seams already classified. */
export function zebraShading(mesh: MeshData, options: ZebraOptions = {}): ZebraResult {
  if (triangleCount(mesh) === 0) throw new AnalysisError('Zebra analysis needs a tessellated body')

  const topology = buildTopology(mesh)
  const normals = vertexNormals(mesh, topology)
  const samples = normals.map((normal, vertex) => ({
    ...zebraStripe(normal, options),
    vertex,
  }))
  const discontinuities = detectDiscontinuities(mesh, options)

  return {
    samples,
    discontinuities,
    density: options.density ?? DEFAULT_ZEBRA_DENSITY,
    offset: options.offset ?? 0,
    eye: normalizeOr(options.eye ?? UNIT_Z, UNIT_Z),
    tangentContinuous: discontinuities.every((defect) => defect.kind === 'curvature'),
  }
}

/** The defects grouped by kind, which is how the results panel lists them. */
export function groupDiscontinuities(
  discontinuities: readonly Discontinuity[],
): Record<ContinuityDefect, Discontinuity[]> {
  const grouped: Record<ContinuityDefect, Discontinuity[]> = {
    position: [],
    tangent: [],
    curvature: [],
  }
  for (const defect of discontinuities) grouped[defect.kind].push(defect)
  return grouped
}

/** The other two edges of every triangle on this edge. */
function parallelEdges(mesh: MeshData, topology: MeshTopology, key: EdgeKey): EdgeKey[] {
  const owners = topology.edgeTriangles.get(key) ?? []
  const result: EdgeKey[] = []
  for (const triangle of owners) {
    const [a, b, c] = cornersOf(mesh, triangle)
    for (const candidate of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) {
      if (candidate !== key && !result.includes(candidate)) result.push(candidate)
    }
  }
  return result
}

function pointAt(mesh: MeshData, vertex: number): Vec3 {
  return {
    x: mesh.positions[vertex * 3] ?? 0,
    y: mesh.positions[vertex * 3 + 1] ?? 0,
    z: mesh.positions[vertex * 3 + 2] ?? 0,
  }
}

function angleDegrees(a: Vec3, b: Vec3): number {
  const cosine = Math.min(1, Math.max(-1, dot(a, b)))
  return (Math.acos(cosine) * 180) / Math.PI
}

function normalizeOr(vector: Vec3, fallback: Vec3): Vec3 {
  return length(vector) < 1e-12 ? fallback : normalize(vector)
}

function mod2(value: number): number {
  return ((value % 2) + 2) % 2
}
