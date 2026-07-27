import type { MeshData } from '../domain/MeshData'
import { meshBounds, recomputeNormals, triangleCount } from '../domain/MeshData'
import type { PerformanceComponent, Viewpoint } from './types'
import { boundsSize, screenCoverage, totalTriangles } from './types'

/**
 * Drawing distant components with fewer triangles.
 *
 * The level is chosen from how much of the screen a component covers rather
 * than from its distance. Distance on its own is the wrong measure in an
 * assembly that spans three orders of magnitude — a washer and a gantry at the
 * same distance need completely different treatment, and the same washer needs
 * different treatment as the camera pushes in. Coverage collapses both into
 * one number that means "how much detail can anyone actually see here".
 *
 * The simplifier is vertex clustering: snap every vertex to a grid, weld the
 * ones that land in the same cell, and drop the triangles that collapse in the
 * process. It is not the best decimation available — it does not preserve
 * silhouettes the way an edge-collapse with a quadric error metric would — but
 * it is O(n), it never produces a worse mesh than it was given, and it cannot
 * fail on the non-manifold geometry that imported assemblies are full of.
 */

/** One rung of the ladder, from full detail down to a box. */
export interface LodLevel {
  readonly name: string
  /**
   * Smallest screen coverage this level still applies to. A component covering
   * less than this drops to the next level down.
   */
  readonly minCoverage: number
  /**
   * Fraction of the original triangles to keep. 1 is the mesh untouched; 0
   * means the component is not worth drawing as geometry at all.
   */
  readonly detail: number
}

/**
 * The default ladder. The thresholds are in fractions of the screen height:
 * a component covering less than a fiftieth of the screen is around twenty
 * pixels tall on a 1080p display, which is where triangles stop being visible
 * and start being cost.
 */
export const DEFAULT_LOD_LEVELS: readonly LodLevel[] = [
  { name: 'full', minCoverage: 0.25, detail: 1 },
  { name: 'high', minCoverage: 0.1, detail: 0.5 },
  { name: 'medium', minCoverage: 0.04, detail: 0.2 },
  { name: 'low', minCoverage: 0.02, detail: 0.05 },
  { name: 'proxy', minCoverage: 0, detail: 0 },
]

export interface LodOptions {
  /** Overrides the ladder. Must be ordered from most to least detailed. */
  readonly levels?: readonly LodLevel[]
  /** Never simplify below this many triangles — small parts stay whole. */
  readonly floorTriangles?: number
}

export const DEFAULT_FLOOR_TRIANGLES = 24

/** The full-detail rung, used for a pinned component whatever its coverage. */
export const FULL_DETAIL: LodLevel = { name: 'full', minCoverage: 0, detail: 1 }

/** The rung a coverage falls on. */
export function levelForCoverage(
  coverage: number,
  levels: readonly LodLevel[] = DEFAULT_LOD_LEVELS,
): LodLevel {
  for (const level of levels) {
    if (coverage >= level.minCoverage) return level
  }
  // A ladder whose last rung does not reach zero still has to answer.
  return levels[levels.length - 1] ?? FULL_DETAIL
}

/** What a component should be drawn at from this viewpoint. */
export function levelForComponent(
  component: PerformanceComponent,
  viewpoint: Viewpoint,
  options: LodOptions = {},
): LodLevel {
  if (component.pinned === true) return FULL_DETAIL
  return levelForCoverage(screenCoverage(component, viewpoint), options.levels)
}

/** A component's assignment, and what it saves. */
export interface LodAssignment {
  readonly component: PerformanceComponent
  readonly level: LodLevel
  readonly coverage: number
  /** Triangles this component will actually cost at that level. */
  readonly triangleCount: number
}

/** Assigns every component a level, cheapest description first. */
export function assignLevels(
  components: readonly PerformanceComponent[],
  viewpoint: Viewpoint,
  options: LodOptions = {},
): LodAssignment[] {
  const floor = options.floorTriangles ?? DEFAULT_FLOOR_TRIANGLES
  return components.map((component) => {
    const coverage = component.pinned === true ? 1 : screenCoverage(component, viewpoint)
    const level = levelForComponent(component, viewpoint, options)
    return {
      component,
      level,
      coverage,
      triangleCount: budgetFor(component.triangleCount, level.detail, floor),
    }
  })
}

/**
 * Triangles a component gets at a given detail fraction.
 *
 * The floor stops the ladder from doing something silly to a part that was
 * already cheap: simplifying a 12-triangle bracket to 2 triangles saves
 * nothing worth having and looks broken.
 */
export function budgetFor(triangles: number, detail: number, floor = DEFAULT_FLOOR_TRIANGLES): number {
  if (triangles <= floor) return triangles
  if (detail >= 1) return triangles
  if (detail <= 0) return 0
  return Math.max(floor, Math.round(triangles * detail))
}

/** What a whole assignment costs against what it would have. */
export interface LodSavings {
  readonly before: number
  readonly after: number
  /** Fraction of the triangles avoided, 0..1. */
  readonly saved: number
}

export function lodSavings(assignments: readonly LodAssignment[]): LodSavings {
  const before = totalTriangles(assignments.map((assignment) => assignment.component))
  const after = assignments.reduce((total, assignment) => total + assignment.triangleCount, 0)
  return { before, after, saved: before > 0 ? 1 - after / before : 0 }
}

/* -------------------------------------------------------------------------- */
/* Simplification                                                              */
/* -------------------------------------------------------------------------- */

/** Coarsest grid the search will try; beyond this the mesh is unrecognisable. */
const MIN_GRID = 2
/** Finest grid worth trying — past it, clustering stops removing anything. */
const MAX_GRID = 256

/**
 * Reduces a mesh towards a triangle budget by vertex clustering.
 *
 * The grid resolution that hits the budget is found by bisection rather than
 * computed, because the relationship between cell size and surviving triangles
 * depends entirely on the shape. Around eight passes over the triangles gets
 * within a few per cent, which is far closer than the eye needs.
 *
 * A mesh already inside its budget is returned untouched — not re-welded, not
 * re-normalled — so the common case costs nothing.
 */
export function simplifyMesh(mesh: MeshData, targetTriangles: number): MeshData {
  const original = triangleCount(mesh)
  if (original === 0 || targetTriangles >= original) return mesh
  if (targetTriangles <= 0) return { positions: [], normals: [], indices: [] }

  let low = MIN_GRID
  let high = MAX_GRID
  let best = clusterMesh(mesh, MIN_GRID)

  // Invariant: `low` is at or under budget, `high` is finer than needed.
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (middle === low) break
    const candidate = clusterMesh(mesh, middle)
    if (triangleCount(candidate) <= targetTriangles) {
      best = candidate
      low = middle
    } else {
      high = middle
    }
  }
  return best
}

/** Simplifies to a fraction of the original triangle count. */
export function decimate(mesh: MeshData, ratio: number): MeshData {
  const clamped = Math.min(1, Math.max(0, ratio))
  return simplifyMesh(mesh, Math.round(triangleCount(mesh) * clamped))
}

/**
 * Welds every vertex onto a `resolution`-cell grid spanning the mesh.
 *
 * Each surviving cell keeps the average of the vertices that landed in it
 * rather than the cell centre, which stops a simplified part from visibly
 * shrinking towards the grid.
 */
export function clusterMesh(mesh: MeshData, resolution: number): MeshData {
  const cells = Math.max(1, Math.floor(resolution))
  const bounds = meshBounds(mesh)
  const size = boundsSize(bounds)
  // A flat or degenerate axis has no range to divide; a positive step keeps
  // every vertex on that axis in the same row rather than dividing by zero.
  const step = {
    x: size.x > 0 ? size.x / cells : 1,
    y: size.y > 0 ? size.y / cells : 1,
    z: size.z > 0 ? size.z / cells : 1,
  }

  const cellOf = new Map<string, number>()
  const sums: number[] = []
  const counts: number[] = []
  const remap = new Array<number>(mesh.positions.length / 3)

  for (let vertex = 0; vertex < remap.length; vertex += 1) {
    const x = mesh.positions[vertex * 3] ?? 0
    const y = mesh.positions[vertex * 3 + 1] ?? 0
    const z = mesh.positions[vertex * 3 + 2] ?? 0
    const key =
      `${cellIndex(x - bounds.min.x, step.x, cells)},` +
      `${cellIndex(y - bounds.min.y, step.y, cells)},` +
      `${cellIndex(z - bounds.min.z, step.z, cells)}`

    let index = cellOf.get(key)
    if (index === undefined) {
      index = counts.length
      cellOf.set(key, index)
      sums.push(0, 0, 0)
      counts.push(0)
    }
    sums[index * 3] = (sums[index * 3] ?? 0) + x
    sums[index * 3 + 1] = (sums[index * 3 + 1] ?? 0) + y
    sums[index * 3 + 2] = (sums[index * 3 + 2] ?? 0) + z
    counts[index] = (counts[index] ?? 0) + 1
    remap[vertex] = index
  }

  const positions: number[] = []
  for (let cell = 0; cell < counts.length; cell += 1) {
    const weight = counts[cell] ?? 1
    positions.push(
      (sums[cell * 3] ?? 0) / weight,
      (sums[cell * 3 + 1] ?? 0) / weight,
      (sums[cell * 3 + 2] ?? 0) / weight,
    )
  }

  const indices: number[] = []
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const a = remap[mesh.indices[triangle * 3] ?? 0] ?? 0
    const b = remap[mesh.indices[triangle * 3 + 1] ?? 0] ?? 0
    const c = remap[mesh.indices[triangle * 3 + 2] ?? 0] ?? 0
    // Two corners in one cell means the triangle collapsed to a line.
    if (a === b || b === c || a === c) continue
    indices.push(a, b, c)
  }

  return recomputeNormals({ positions, normals: [], indices })
}

/**
 * Which cell an offset falls in, clamped to the last one.
 *
 * Without the clamp a vertex sitting exactly on the upper bound divides to
 * `cells` rather than `cells - 1` and gets a row of its own, so a resolution
 * of N would quietly produce (N+1)³ cells and the coarsest setting would fail
 * to merge the very corners it exists to merge.
 */
function cellIndex(offset: number, step: number, cells: number): number {
  return Math.min(cells - 1, Math.max(0, Math.floor(offset / step)))
}
