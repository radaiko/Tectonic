import type { MeshData } from '../domain/MeshData'
import { triangleCount } from '../domain/MeshData'
import { boundaryLoops, isClosedMesh, surfaceArea, weldMesh } from './geometry'
import type { SurfaceBody, SurfaceNaming } from './types'
import { SURFACE_TOLERANCE, SurfaceError } from './types'

/**
 * Surface bodies are immutable: every operation takes bodies in and hands new
 * ones back, with the boundaries and the closed flag derived from the mesh rather
 * than tracked by hand, so those can never fall out of step with the geometry.
 */

let nextSurfaceOrdinal = 0

export interface SurfaceBodyOptions extends SurfaceNaming {
  /** Coincident vertices closer than this are merged before analysis. */
  readonly tolerance?: number
  /** Mesh to restore on an untrim. Carried forward by trim and split. */
  readonly untrimmed?: MeshData | null
  /** Skips the weld — for a mesh that is already welded, e.g. one just built. */
  readonly welded?: boolean
}

export function createSurfaceBody(mesh: MeshData, options: SurfaceBodyOptions = {}): SurfaceBody {
  if (triangleCount(mesh) < 1) {
    throw new SurfaceError('A surface needs at least one triangle')
  }

  const tolerance = options.tolerance ?? SURFACE_TOLERANCE
  const welded = options.welded ? mesh : weldMesh(mesh, tolerance)
  if (triangleCount(welded) < 1) {
    throw new SurfaceError('The surface collapsed to nothing')
  }

  return {
    id: options.id ?? `surface-${(nextSurfaceOrdinal += 1)}`,
    name: options.name ?? 'Surface',
    mesh: welded,
    boundaries: boundaryLoops(welded, tolerance),
    closed: isClosedMesh(welded, tolerance),
    untrimmed: options.untrimmed ?? null,
  }
}

/** The same body carrying a new mesh, re-deriving everything that follows from it. */
export function withMesh(
  body: SurfaceBody,
  mesh: MeshData,
  options: SurfaceBodyOptions = {},
): SurfaceBody {
  return createSurfaceBody(mesh, {
    id: body.id,
    name: body.name,
    untrimmed: body.untrimmed,
    ...options,
  })
}

export function surfaceBodyArea(body: SurfaceBody): number {
  return surfaceArea(body.mesh)
}

/** Total length of every open boundary — zero for a watertight sheet. */
export function openBoundaryCount(body: SurfaceBody): number {
  return body.boundaries.length
}

/** Resets the surface id counter. Test-only, so ids stay predictable per test. */
export function resetSurfaceIds(): void {
  nextSurfaceOrdinal = 0
}
