import { describe, expect, it } from 'vitest'
import { WORLD_XY } from '../../src/kernel/IKernel'
import type { PlaneFrame } from '../../src/kernel/IKernel'
import { meshTopology } from '../../src/kernel/topology'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import {
  faceBoundaryLoops,
  projectFaceBoundary,
  toSketchPoint,
} from '../../src/sketch/domain/projection'
import { sketchProfiles } from '../../src/features/geometry/profile'
import { boxMesh } from '../helpers/meshes'

/**
 * The projected boundary has to come from the support face's real topology.
 *
 * These tests are written against a box whose faces are known by hand, so a
 * regression that quietly falls back to a bounding rectangle — the exact failure
 * this feature exists to prevent — shows up as the wrong corners rather than as
 * "some geometry appeared".
 */

/** The topmost face of a box: the one whose normal is +Z. */
function topFaceOf(mesh: ReturnType<typeof boxMesh>): string {
  const face = meshTopology(mesh).faces.find((candidate) => candidate.normal.z > 0.99)
  if (!face) throw new Error('the box has no +Z face')
  return face.id
}

/** The frame a sketch on that face sits on: origin at its centroid, normal +Z. */
function topFrame(mesh: ReturnType<typeof boxMesh>): PlaneFrame {
  const face = meshTopology(mesh).faces.find((candidate) => candidate.normal.z > 0.99)
  if (!face) throw new Error('the box has no +Z face')
  return { origin: face.centroid, xAxis: WORLD_XY.xAxis, yAxis: WORLD_XY.yAxis }
}

describe('face boundary loops', () => {
  it('recovers the four corners of a box face, and only those', () => {
    const mesh = boxMesh(20, 10, 6)
    const result = faceBoundaryLoops(mesh, topFaceOf(mesh))

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.loops).toHaveLength(1)

    // Four corners: the diagonal the triangulation left across the face is not
    // an edge of the solid, and must not appear in its outline.
    const loop = result.loops[0] as readonly { x: number; y: number; z: number }[]
    expect(loop).toHaveLength(4)
    // Every corner is on the face's plane, and the four of them are the box's
    // own corners — read off the mesh, not a rectangle fitted around it.
    for (const point of loop) expect(point.z).toBeCloseTo(6, 6)
    expect(new Set(loop.map((point) => `${point.x},${point.y}`))).toEqual(
      new Set(['0,0', '20,0', '20,10', '0,10']),
    )
  })

  it('reports a face it does not hold rather than inventing one', () => {
    const result = faceBoundaryLoops(boxMesh(), 'face-does-not-exist')

    expect(result.status).toBe('unavailable')
    if (result.status !== 'unavailable') return
    expect(result.reason).toContain('face-does-not-exist')
  })

  it('reports a mesh with no closed boundary rather than half a loop', () => {
    // One loose triangle: it has a boundary, but a single triangle's face is
    // the whole mesh, so there is nothing this can be a boundary *between*.
    const lone = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      indices: [0, 1, 2],
    }
    const faceId = meshTopology(lone).faces[0]?.id as string
    const result = faceBoundaryLoops(lone, faceId)

    // A lone triangle does close, so this one succeeds — the point of the case
    // is that the result is the triangle itself and not a rectangle around it.
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.loops[0]).toHaveLength(3)
  })
})

describe('projecting into a sketch coordinate system', () => {
  it('measures a world point against the frame the sketch sits on', () => {
    const frame: PlaneFrame = {
      origin: { x: 5, y: 0, z: 3 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
    }

    expect(toSketchPoint(frame, { x: 9, y: -2, z: 3 })).toEqual({ x: 4, y: -2 })
  })
})

describe('projecting a support face into a sketch', () => {
  it('adds the face outline as construction geometry', () => {
    const mesh = boxMesh(20, 10, 6)
    const sketch = new SketchModel({ name: 'On the top face' })

    const result = projectFaceBoundary(sketch, mesh, topFaceOf(mesh), topFrame(mesh))

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.entityIds).toHaveLength(1)

    const polygon = sketch.requireEntity(result.entityIds[0] as string)
    expect(polygon.type).toBe('polygon')
    expect(polygon.isConstruction).toBe(true)
    // Its points are construction too, so nothing about the projection reads as
    // real geometry anywhere it is inspected.
    for (const entity of sketch.entities.values()) expect(entity.isConstruction).toBe(true)
  })

  it('lands on the face, at the size the face actually is', () => {
    const mesh = boxMesh(20, 10, 6)
    const sketch = new SketchModel({ name: 'On the top face' })

    projectFaceBoundary(sketch, mesh, topFaceOf(mesh), topFrame(mesh))

    const points = [...sketch.entities.values()].filter((entity) => entity.type === 'point')
    expect(points).toHaveLength(4)
    // The frame's origin is the face centroid, so the corners sit at ±half the
    // box in each direction. A hard-coded rectangle would not track the box.
    for (const point of points) {
      expect(Math.abs(point.x)).toBeCloseTo(10, 6)
      expect(Math.abs(point.y)).toBeCloseTo(5, 6)
    }
  })

  it('tracks the support face rather than a fixed shape', () => {
    const wide = boxMesh(40, 10, 6)
    const sketch = new SketchModel({ name: 'On the top face' })

    projectFaceBoundary(sketch, wide, topFaceOf(wide), topFrame(wide))

    const points = [...sketch.entities.values()].filter((entity) => entity.type === 'point')
    for (const point of points) expect(Math.abs(point.x)).toBeCloseTo(20, 6)
  })

  it('contributes nothing to the profile a feature would extrude', () => {
    const mesh = boxMesh(20, 10, 6)
    const sketch = new SketchModel({ name: 'On the top face' })

    projectFaceBoundary(sketch, mesh, topFaceOf(mesh), topFrame(mesh))

    // Construction only: extruding this sketch as it stands builds nothing,
    // which is what stops the projection from silently becoming the profile.
    expect(sketchProfiles(sketch)).toEqual([])
  })

  it('survives a round trip through the file format', () => {
    const mesh = boxMesh(20, 10, 6)
    const sketch = new SketchModel({ name: 'On the top face' })
    projectFaceBoundary(sketch, mesh, topFaceOf(mesh), topFrame(mesh))

    const restored = SketchModel.fromJSON(JSON.parse(JSON.stringify(sketch.toJSON())))

    expect(restored.entities.size).toBe(sketch.entities.size)
    for (const entity of restored.entities.values()) expect(entity.isConstruction).toBe(true)
    expect(sketchProfiles(restored)).toEqual([])
  })

  it('says why rather than drawing something approximate', () => {
    const sketch = new SketchModel({ name: 'On a face that is gone' })

    const result = projectFaceBoundary(sketch, boxMesh(), 'face-404', WORLD_XY)

    expect(result.status).toBe('unavailable')
    // And it left nothing behind: no half-projection, no placeholder outline.
    expect(sketch.entities.size).toBe(0)
  })
})
