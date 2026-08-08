import { describe, expect, it } from 'vitest'
import {
  CLICK_SLOP_PX,
  edgeIdAtSegment,
  edgeLines,
  edgePositions,
  faceIdAtTriangle,
  faceIndices,
  isClick,
  pointerNdc,
} from '../../src/3d/viewportPicking'
import { StubKernel } from '../../src/kernel/StubKernel'
import { meshTopology } from '../../src/kernel/topology'
import type { MeshData } from '../../src/domain/MeshData'

const RECT = { left: 0, top: 0, width: 200, height: 100 }

async function box(size = 10): Promise<MeshData> {
  const kernel = new StubKernel()
  return kernel.triangulate(await kernel.createBox({ width: size, height: size, depth: size }))
}

describe('pointer to normalised device coordinates', () => {
  it('puts the middle of the canvas at the origin', () => {
    expect(pointerNdc(RECT, 100, 50)).toEqual({ x: 0, y: 0 })
  })

  it('measures in CSS pixels, not the backing store', () => {
    // The bug this guards: using the canvas width/height attributes instead of
    // its layout box halves every pick's distance on a 2× display.
    expect(pointerNdc(RECT, 200, 0)).toEqual({ x: 1, y: 1 })
    expect(pointerNdc(RECT, 0, 100)).toEqual({ x: -1, y: -1 })
  })

  it('reports nothing for a pointer outside the canvas', () => {
    expect(pointerNdc(RECT, -5, 50)).toBeNull()
    expect(pointerNdc(RECT, 100, 140)).toBeNull()
  })

  it('reports nothing before the canvas has been laid out', () => {
    expect(pointerNdc({ left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull()
  })
})

describe('telling a click from an orbit', () => {
  it('accepts a release that barely moved', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 10 + CLICK_SLOP_PX, y: 10 })).toBe(true)
  })

  it('refuses a release that ended a drag', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 40, y: 10 })).toBe(false)
  })
})

describe('picking a face', () => {
  it('names the face every triangle of a box belongs to', async () => {
    const mesh = await box()
    const faces = new Set<string>()

    for (let triangle = 0; triangle * 3 < mesh.indices.length; triangle += 1) {
      const faceId = faceIdAtTriangle(mesh, triangle)
      expect(faceId).not.toBeNull()
      faces.add(faceId as string)
    }

    expect(faces.size).toBe(6)
  })

  it('reports nothing for a triangle the mesh has not got', async () => {
    expect(faceIdAtTriangle(await box(), 9999)).toBeNull()
  })

  it('hands back an index buffer covering just that face', async () => {
    const mesh = await box()
    const faceId = faceIdAtTriangle(mesh, 0) as string

    const indices = faceIndices(mesh, faceId) as number[]

    // Two triangles per side of a box, six indices.
    expect(indices).toHaveLength(6)
  })

  it('reports nothing for a face the mesh has not got', async () => {
    expect(faceIndices(await box(), 'face-99')).toBeNull()
  })
})

describe('picking an edge', () => {
  it('lays every edge out as a segment, in step with its identifier', async () => {
    const mesh = await box()
    const lines = edgeLines(mesh)

    expect(lines.edgeIds).toEqual(meshTopology(mesh).edges.map((edge) => edge.id))
    // Two endpoints of three coordinates each, per edge.
    expect(lines.positions).toHaveLength(lines.edgeIds.length * 6)
  })

  it('names the edge a segment hit landed on', async () => {
    const mesh = await box()
    const lines = edgeLines(mesh)

    // three.js reports the index of the segment's *first* vertex.
    expect(edgeIdAtSegment(mesh, 0)).toBe(lines.edgeIds[0])
    expect(edgeIdAtSegment(mesh, 1)).toBe(lines.edgeIds[0])
    expect(edgeIdAtSegment(mesh, 2)).toBe(lines.edgeIds[1])
  })

  it('reports nothing for a segment past the end', async () => {
    expect(edgeIdAtSegment(await box(), 100_000)).toBeNull()
  })

  it('gives an edge its two endpoints for the highlight', async () => {
    const mesh = await box()
    const edgeId = edgeLines(mesh).edgeIds[0] as string

    const positions = edgePositions(mesh, edgeId) as number[]

    expect(positions).toHaveLength(6)
    // A box edge is 10 long and runs along one axis.
    const span = Math.hypot(
      (positions[3] as number) - (positions[0] as number),
      (positions[4] as number) - (positions[1] as number),
      (positions[5] as number) - (positions[2] as number),
    )
    expect(span).toBeCloseTo(10, 6)
  })

  it('reports nothing for an edge the mesh has not got', async () => {
    expect(edgePositions(await box(), 'edge-9999')).toBeNull()
  })

  it('gives a box the twelve edges it has', async () => {
    expect(edgeLines(await box()).edgeIds).toHaveLength(12)
  })
})
