import type { MeshData } from '../domain/MeshData'
import { mergeMeshes, triangleCount } from '../domain/MeshData'
import type { Vec3 } from '../kernel/IKernel'
import { knitSurfaces } from './SurfaceEditing'
import {
  boundaryLoops,
  flipMesh,
  isClosedMesh,
  meshFromGrid,
  meshVolume,
  offsetMesh,
  weldMesh,
} from './geometry'
import type { Curve3, SurfaceBody, ThickenSide } from './types'
import { SURFACE_TOLERANCE, SurfaceError } from './types'

/**
 * Leaving the surface environment: turning sheets into solid bodies.
 *
 * A solid is a watertight mesh — every edge shared by exactly two triangles —
 * wound so its normals face outwards. Thickening builds one from a single sheet
 * by walling the gap between the sheet and an offset copy of it; stitching builds
 * one from several sheets that already enclose a volume between them.
 */

export interface SolidFromSurface {
  readonly mesh: MeshData
  /** Whether the result really is watertight. A false here means an open shell. */
  readonly watertight: boolean
  /** Boundaries that were left open — empty when `watertight`. */
  readonly openBoundaries: readonly Curve3[]
}

export interface ThickenParams {
  readonly thickness: number
  /** Which way the material grows relative to the surface normal. */
  readonly side?: ThickenSide
}

/**
 * Gives a surface thickness. The sheet and an offset copy become the two faces of
 * the solid, and each open boundary loop is walled off between them; a surface
 * that was already closed becomes a hollow solid instead, with no walls needed.
 */
export function thickenSurface(body: SurfaceBody, params: ThickenParams): SolidFromSurface {
  const { thickness, side = 'normal' } = params
  if (!(thickness > 0)) throw new SurfaceError('Thickening needs a positive thickness')

  const [inner, outer] =
    side === 'symmetric'
      ? [-thickness / 2, thickness / 2]
      : side === 'reverse'
        ? [-thickness, 0]
        : [0, thickness]

  const back = inner === 0 ? body.mesh : offsetMesh(body.mesh, inner)
  const front = offsetMesh(body.mesh, outer)

  // The offset copy faces the other way once it is the far side of a solid.
  const shells: MeshData[] = [front, flipMesh(back)]
  for (const loop of body.boundaries) {
    shells.push(wallBetween(loop, inner, outer, body.mesh))
  }

  const solid = weldMesh(mergeMeshes(shells), SURFACE_TOLERANCE)
  return finishSolid(orientOutwards(solid))
}

export interface StitchParams {
  /** Vertices closer than this are treated as touching. */
  readonly tolerance?: number
  /** Fails instead of returning an open shell when the sheets leave a gap. */
  readonly requireClosed?: boolean
}

/**
 * Knits surfaces together and closes the result into a solid body. The sheets
 * have to enclose a volume between them: what stitching adds over knitting is the
 * watertightness check and the outward orientation a solid needs.
 */
export function stitchSurfaces(
  bodies: readonly SurfaceBody[],
  params: StitchParams = {},
): SolidFromSurface {
  if (bodies.length === 0) throw new SurfaceError('Stitching needs at least one surface')

  const tolerance = params.tolerance ?? SURFACE_TOLERANCE
  const knitted = knitSurfaces(bodies, { tolerance })
  const result = finishSolid(orientOutwards(knitted.mesh), tolerance)

  if (params.requireClosed && !result.watertight) {
    throw new SurfaceError(
      `Stitching left ${String(result.openBoundaries.length)} open boundary loop(s), so the body is not solid`,
    )
  }
  return result
}

/* -------------------------------------------------------------------------- */

/** The strip of triangles that closes the gap along one boundary loop. */
function wallBetween(
  loop: Curve3,
  inner: number,
  outer: number,
  sheet: MeshData,
): MeshData {
  const normals = loopNormals(loop, sheet)
  const low = loop.map((point, index) => displace(point, normals[index] as Vec3, inner))
  const high = loop.map((point, index) => displace(point, normals[index] as Vec3, outer))
  return meshFromGrid([low, high], { closeColumns: true })
}

function displace(point: Vec3, normal: Vec3, distance: number): Vec3 {
  return {
    x: point.x + normal.x * distance,
    y: point.y + normal.y * distance,
    z: point.z + normal.z * distance,
  }
}

/**
 * Surface normal at each point of a boundary loop, taken from the nearest vertex
 * of the sheet so the wall lines up with the offset faces it joins.
 */
function loopNormals(loop: Curve3, sheet: MeshData): Vec3[] {
  const normals: Vec3[] = []
  const count = sheet.positions.length / 3

  for (const point of loop) {
    let bestDistance = Infinity
    let best: Vec3 = { x: 0, y: 0, z: 1 }
    for (let vertex = 0; vertex < count; vertex += 1) {
      const dx = (sheet.positions[vertex * 3] as number) - point.x
      const dy = (sheet.positions[vertex * 3 + 1] as number) - point.y
      const dz = (sheet.positions[vertex * 3 + 2] as number) - point.z
      const squared = dx * dx + dy * dy + dz * dz
      if (squared < bestDistance) {
        bestDistance = squared
        best = {
          x: sheet.normals[vertex * 3] ?? 0,
          y: sheet.normals[vertex * 3 + 1] ?? 0,
          z: sheet.normals[vertex * 3 + 2] ?? 1,
        }
      }
    }
    normals.push(best)
  }
  return normals
}

/** Flips a closed mesh that came out inside-in, so its normals face outwards. */
function orientOutwards(mesh: MeshData): MeshData {
  return meshVolume(mesh) < 0 ? flipMesh(mesh) : mesh
}

function finishSolid(mesh: MeshData, tolerance = SURFACE_TOLERANCE): SolidFromSurface {
  if (triangleCount(mesh) === 0) throw new SurfaceError('The solid came out empty')
  const openBoundaries = boundaryLoops(mesh, tolerance)
  return {
    mesh,
    watertight: isClosedMesh(mesh, tolerance) && openBoundaries.length === 0,
    openBoundaries,
  }
}
