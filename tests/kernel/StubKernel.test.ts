import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { KernelError, UnsupportedOperationError, WORLD_XY } from '../../src/kernel/IKernel'
import type { PlaneFrame, Profile } from '../../src/kernel/IKernel'
import { StubKernel, toBufferGeometry, toMeshData } from '../../src/kernel/StubKernel'
import { meshTopology } from '../../src/kernel/topology'
import type { TopologyFace } from '../../src/kernel/topology'
import type { MeshData } from '../../src/domain/MeshData'
import { triangleCount, vertexCount } from '../../src/domain/MeshData'

const SQUARE: Profile = {
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
}

/** A square offset from the origin, so revolves have a real radius. */
const OFFSET_SQUARE: Profile = {
  points: [
    { x: 5, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 4 },
    { x: 5, y: 4 },
  ],
}

const XZ_PLANE: PlaneFrame = {
  origin: { x: 0, y: 0, z: 0 },
  xAxis: { x: 1, y: 0, z: 0 },
  yAxis: { x: 0, y: 0, z: -1 },
}

function extentAlong(mesh: MeshData, axis: 0 | 1 | 2): { min: number; max: number } {
  const values = mesh.positions.filter((_, index) => index % 3 === axis)
  return { min: Math.min(...values), max: Math.max(...values) }
}

/** Divergence-theorem volume of a closed triangle mesh. */
function volumeOf(mesh: MeshData): number {
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const cross = new THREE.Vector3()
  const at = (index: number, target: THREE.Vector3): THREE.Vector3 =>
    target.set(
      mesh.positions[index * 3] as number,
      mesh.positions[index * 3 + 1] as number,
      mesh.positions[index * 3 + 2] as number,
    )

  let total = 0
  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    at(mesh.indices[i] as number, a)
    at(mesh.indices[i + 1] as number, b)
    at(mesh.indices[i + 2] as number, c)
    total += a.dot(cross.crossVectors(b, c))
  }
  return Math.abs(total) / 6
}

describe('StubKernel basics', () => {
  it('identifies itself and initialises without work', async () => {
    const kernel = new StubKernel()

    expect(kernel.name).toBe('stub')
    await expect(kernel.init()).resolves.toBeUndefined()
  })

  it('creates a box that triangulates into 12 triangles', async () => {
    const kernel = new StubKernel()

    const shape = await kernel.createBox({ width: 10, height: 20, depth: 30 })
    const mesh = await kernel.triangulate(shape)

    expect(triangleCount(mesh)).toBe(12)
    expect(vertexCount(mesh)).toBe(24)
    expect(mesh.normals).toHaveLength(mesh.positions.length)
  })

  it('offsets a box by its centre', async () => {
    const kernel = new StubKernel()

    const centred = await kernel.triangulate(
      await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 5, y: 0, z: 0 } }),
    )

    expect(extentAlong(centred, 0)).toEqual({ min: 4, max: 6 })
  })

  it('rejects non-positive box dimensions', async () => {
    const kernel = new StubKernel()

    await expect(kernel.createBox({ width: 0, height: 1, depth: 1 })).rejects.toThrow(KernelError)
  })

  it('reports a bounding box in world space', async () => {
    const kernel = new StubKernel()

    const box = await kernel.boundingBox(
      await kernel.createBox({ width: 2, height: 4, depth: 6, center: { x: 1, y: 0, z: 0 } }),
    )

    expect(box.min).toEqual({ x: 0, y: -2, z: -3 })
    expect(box.max).toEqual({ x: 2, y: 2, z: 3 })
  })

  it('fails to triangulate an unknown shape', async () => {
    await expect(new StubKernel().triangulate({ id: 'nope' })).rejects.toThrow(KernelError)
  })

  it('forgets a shape once disposed', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 1, height: 1, depth: 1 })

    kernel.dispose(shape)
    kernel.dispose(shape) // disposing twice is a no-op

    await expect(kernel.triangulate(shape)).rejects.toThrow(KernelError)
  })
})

describe('StubKernel.extrude', () => {
  it('extrudes a closed profile into a solid', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(await kernel.extrude({ profile: SQUARE, distance: 5 }))

    expect(triangleCount(mesh)).toBeGreaterThan(0)
    expect(extentAlong(mesh, 2).max).toBeCloseTo(5)
    expect(volumeOf(mesh)).toBeCloseTo(500, 3)
  })

  it('extrudes along a caller-supplied direction', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({ profile: SQUARE, distance: 5, direction: { x: 0, y: 1, z: 0 } }),
    )

    expect(extentAlong(mesh, 1).max).toBeCloseTo(5)
  })

  it('places the profile on the supplied plane', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({ profile: SQUARE, distance: 5, plane: XZ_PLANE }),
    )

    // The XZ frame's normal is +Y, so the sweep leaves the world XY plane.
    expect(extentAlong(mesh, 1).max).toBeCloseTo(5)
    expect(extentAlong(mesh, 2).min).toBeCloseTo(-10)
  })

  it('splits a symmetric extrude evenly about the sketch plane', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({ profile: SQUARE, distance: 6, side: 'symmetric' }),
    )

    expect(extentAlong(mesh, 2)).toEqual({ min: -3, max: 3 })
  })

  it('runs a two-sided extrude the second distance backwards', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({
        profile: SQUARE,
        distance: 6,
        side: 'two-sided',
        secondDistance: 2,
      }),
    )

    expect(extentAlong(mesh, 2)).toEqual({ min: -2, max: 6 })
  })

  it('removes profile holes from the solid', async () => {
    const kernel = new StubKernel()

    const solid = await kernel.triangulate(await kernel.extrude({ profile: SQUARE, distance: 2 }))
    const withHole = await kernel.triangulate(
      await kernel.extrude({
        profile: {
          points: SQUARE.points,
          holes: [
            [
              { x: 3, y: 3 },
              { x: 3, y: 7 },
              { x: 7, y: 7 },
              { x: 7, y: 3 },
            ],
          ],
        },
        distance: 2,
      }),
    )

    expect(volumeOf(solid) - volumeOf(withHole)).toBeCloseTo(32, 3)
  })

  it('tapers the far end when a draft angle is given', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({ profile: SQUARE, distance: 10, draftAngle: 20 }),
    )

    // Positive draft pushes the top face outwards past the profile.
    expect(extentAlong(mesh, 0).max).toBeGreaterThan(10)
  })

  it('ignores a repeated closing point', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({
        profile: { points: [...SQUARE.points, { x: 0, y: 0 }] },
        distance: 1,
      }),
    )

    expect(volumeOf(mesh)).toBeCloseTo(100, 3)
  })

  it.each([
    ['too few points', { profile: { points: SQUARE.points.slice(0, 2) }, distance: 5 }],
    ['a non-positive distance', { profile: SQUARE, distance: 0 }],
    ['a zero-length direction', { profile: SQUARE, distance: 5, direction: { x: 0, y: 0, z: 0 } }],
    [
      'degenerate plane axes',
      {
        profile: SQUARE,
        distance: 5,
        plane: { origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 0, y: 0, z: 0 }, yAxis: WORLD_XY.yAxis },
      },
    ],
    [
      'parallel plane axes',
      {
        profile: SQUARE,
        distance: 5,
        plane: { origin: { x: 0, y: 0, z: 0 }, xAxis: WORLD_XY.xAxis, yAxis: WORLD_XY.xAxis },
      },
    ],
  ])('rejects an extrude with %s', async (_label, params) => {
    await expect(new StubKernel().extrude(params)).rejects.toThrow(KernelError)
  })
})

describe('StubKernel.revolve', () => {
  it('sweeps a full turn into a ring', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.revolve({
        profile: OFFSET_SQUARE,
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 360,
      }),
    )

    // Pappus: a 20-unit area whose centroid travels 2*pi*7.5 sweeps ~942 units.
    expect(volumeOf(mesh)).toBeGreaterThan(900)
    expect(volumeOf(mesh)).toBeLessThan(950)
    expect(extentAlong(mesh, 0).max).toBeCloseTo(10, 1)
  })

  it('caps a partial sweep so it stays a closed solid', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.revolve({
        profile: OFFSET_SQUARE,
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 90,
      }),
    )

    expect(volumeOf(mesh)).toBeGreaterThan(200)
    expect(volumeOf(mesh)).toBeLessThan(250)
  })

  it('centres a symmetric sweep on the profile', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.revolve({
        profile: OFFSET_SQUARE,
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 90,
        symmetric: true,
      }),
    )
    const z = extentAlong(mesh, 2)

    expect(z.min).toBeCloseTo(-z.max, 3)
  })

  it('flips a profile that sits on the far side of the axis', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.revolve({
        profile: {
          points: [
            { x: -10, y: 0 },
            { x: -5, y: 0 },
            { x: -5, y: 4 },
            { x: -10, y: 4 },
          ],
        },
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 360,
      }),
    )

    expect(volumeOf(mesh)).toBeGreaterThan(900)
  })

  it.each([
    ['a zero angle', { angle: 0, axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } } }],
    [
      'a zero-length axis',
      { angle: 90, axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 0 } } },
    ],
  ])('rejects a revolve with %s', async (_label, rest) => {
    await expect(new StubKernel().revolve({ profile: OFFSET_SQUARE, ...rest })).rejects.toThrow(
      KernelError,
    )
  })

  it('rejects a profile that collapses onto the axis', async () => {
    const kernel = new StubKernel()

    await expect(
      kernel.revolve({
        profile: {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 5 },
            { x: 0, y: 10 },
          ],
        },
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 360,
      }),
    ).rejects.toThrow(/lies on the axis/)
  })
})

describe('StubKernel.sweep', () => {
  it('sweeps a profile along a straight path', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.sweep({
        profile: SQUARE,
        path: [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 20 },
        ],
      }),
    )

    expect(volumeOf(mesh)).toBeCloseTo(2000, 0)
  })

  it('keeps the section orientation when asked to stay perpendicular', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.sweep({
        profile: SQUARE,
        path: [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 10 },
        ],
        orientation: 'perpendicular',
      }),
    )

    expect(extentAlong(mesh, 0)).toEqual({ min: 0, max: 10 })
  })

  it('applies a twist along the path', async () => {
    const kernel = new StubKernel()
    const path = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10 },
    ]

    const straight = await kernel.triangulate(await kernel.sweep({ profile: SQUARE, path }))
    const twisted = await kernel.triangulate(
      await kernel.sweep({ profile: SQUARE, path, twistAngle: 45 }),
    )

    // The far section rotates about the path, swinging the profile past x = 0.
    expect(extentAlong(straight, 0).min).toBeCloseTo(0)
    expect(extentAlong(twisted, 0).min).toBeLessThan(-5)
  })

  it('rejects a path with no length', async () => {
    await expect(
      new StubKernel().sweep({
        profile: SQUARE,
        path: [
          { x: 1, y: 1, z: 1 },
          { x: 1, y: 1, z: 1 },
        ],
      }),
    ).rejects.toThrow(/at least two distinct points/)
  })
})

describe('StubKernel.loft', () => {
  it('blends two sections into a solid spanning both planes', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.loft({
        sections: [
          { profile: SQUARE },
          {
            profile: {
              points: [
                { x: 2, y: 2 },
                { x: 8, y: 2 },
                { x: 8, y: 8 },
                { x: 2, y: 8 },
              ],
            },
            plane: { ...WORLD_XY, origin: { x: 0, y: 0, z: 20 } },
          },
        ],
      }),
    )

    expect(extentAlong(mesh, 2)).toEqual({ min: 0, max: 20 })
    // Somewhere between the 100 and 36 unit sections, over a 20 unit span.
    expect(volumeOf(mesh)).toBeGreaterThan(20 * 36)
    expect(volumeOf(mesh)).toBeLessThan(20 * 100)
  })

  it('rejects a loft with a single section', async () => {
    await expect(new StubKernel().loft({ sections: [{ profile: SQUARE }] })).rejects.toThrow(
      /at least two sections/,
    )
  })
})

describe('StubKernel booleans', () => {
  it('unions two solids', async () => {
    const kernel = new StubKernel()
    const a = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const b = await kernel.createBox({
      width: 10,
      height: 10,
      depth: 10,
      center: { x: 5, y: 0, z: 0 },
    })

    const mesh = await kernel.triangulate(await kernel.booleanUnion(a, b))

    expect(volumeOf(mesh)).toBeCloseTo(1500, 1)
  })

  it('subtracts one solid from another', async () => {
    const kernel = new StubKernel()
    const target = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const tool = await kernel.createBox({
      width: 4,
      height: 4,
      depth: 4,
      center: { x: 5, y: 0, z: 0 },
    })

    const mesh = await kernel.triangulate(await kernel.booleanSubtract(target, tool))

    expect(volumeOf(mesh)).toBeCloseTo(1000 - 32, 1)
  })

  it('intersects two solids', async () => {
    const kernel = new StubKernel()
    const a = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const b = await kernel.createBox({
      width: 10,
      height: 10,
      depth: 10,
      center: { x: 5, y: 0, z: 0 },
    })

    const mesh = await kernel.triangulate(await kernel.booleanIntersect(a, b))

    expect(volumeOf(mesh)).toBeCloseTo(500, 1)
  })

  it('reports a boolean that consumes the whole solid', async () => {
    const kernel = new StubKernel()
    const target = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    const tool = await kernel.createBox({ width: 20, height: 20, depth: 20 })

    await expect(kernel.booleanSubtract(target, tool)).rejects.toThrow(/empty solid/)
  })

  it('rejects a boolean against an unknown shape', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 1, height: 1, depth: 1 })

    await expect(kernel.booleanUnion(shape, { id: 'nope' })).rejects.toThrow(/Unknown shape/)
  })
})

describe('StubKernel detail operations', () => {
  it('refuses fillet and chamfer rather than returning the solid unchanged', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    // The whole point: a mesh engine cannot round or bevel an edge, and handing
    // the solid back untouched would report a fillet that never happened.
    await expect(kernel.fillet(shape, { radius: 2 })).rejects.toThrow(UnsupportedOperationError)
    await expect(kernel.chamfer(shape, { distance: 2 })).rejects.toThrow(UnsupportedOperationError)
    expect(kernel.capabilities).not.toContain('fillet')
    expect(kernel.capabilities).not.toContain('chamfer')
  })

  it('blames the caller before the backend when the parameters are nonsense', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    await expect(kernel.fillet(shape, { radius: 0 })).rejects.toThrow(/radius must be positive/)
    await expect(kernel.chamfer(shape, { distance: 0 })).rejects.toThrow(/must be positive/)
    await expect(kernel.chamfer(shape, { distance: 1, angle: 120 })).rejects.toThrow(/between 0/)
  })

  it('hollows a solid to a shell', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    const mesh = await kernel.triangulate(await kernel.shell(shape, { thickness: 1 }))

    expect(volumeOf(mesh)).toBeCloseTo(1000 - 512, 1)
  })

  it('opens the face the caller actually named', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { faceIds } = await kernel.topology(shape)

    const closed = await kernel.triangulate(await kernel.shell(shape, { thickness: 1 }))
    // Every face of a cube is the same size, so opening any one of them removes
    // the same wall — which is what makes this a check on identity, not on luck.
    for (const faceId of faceIds) {
      const opened = await kernel.triangulate(
        await kernel.shell(shape, { thickness: 1, openFaceIds: [faceId] }),
      )
      expect(volumeOf(opened)).toBeLessThan(volumeOf(closed))
    }
  })

  it('refuses to open a face the solid has not got', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    // Silently opening some other face — which is what naming the +Z one
    // regardless used to do — puts the cavity somewhere nobody asked for.
    await expect(
      kernel.shell(shape, { thickness: 1, openFaceIds: ['top'] }),
    ).rejects.toThrow(/do not belong|does not belong|belong to the solid/)
  })

  it.each([
    ['a non-positive thickness', 0],
    ['a thickness larger than the solid', 20],
  ])('rejects a shell with %s', async (_label, thickness) => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    await expect(kernel.shell(shape, { thickness })).rejects.toThrow(KernelError)
  })

  it('drills a simple hole through a plate', async () => {
    const kernel = new StubKernel()
    const plate = await kernel.createBox({ width: 20, height: 20, depth: 4 })

    const mesh = await kernel.triangulate(
      await kernel.hole(plate, { center: { x: 0, y: 0, z: 2 }, diameter: 6, depth: 4 }),
    )

    // A 32-facet cylinder falls a little short of the true circular area.
    expect(volumeOf(mesh)).toBeGreaterThan(1600 - Math.PI * 9 * 4)
    expect(volumeOf(mesh)).toBeLessThan(1600 - Math.PI * 9 * 4 + 5)
  })

  it.each(['countersink', 'counterbore'] as const)('drills a %s hole', async (kind) => {
    const kernel = new StubKernel()
    const plate = await kernel.createBox({ width: 20, height: 20, depth: 6 })

    const simple = await kernel.triangulate(
      await kernel.hole(plate, { center: { x: 0, y: 0, z: 3 }, diameter: 4, depth: 6 }),
    )
    const headed = await kernel.triangulate(
      await kernel.hole(plate, {
        center: { x: 0, y: 0, z: 3 },
        diameter: 4,
        depth: 6,
        kind,
        headDiameter: 8,
        headDepth: 2,
      }),
    )

    expect(volumeOf(headed)).toBeLessThan(volumeOf(simple))
  })

  it.each([
    ['a non-positive diameter', { diameter: 0, depth: 1 }],
    ['a non-positive depth', { diameter: 1, depth: 0 }],
    ['a zero-length direction', { diameter: 1, depth: 1, direction: { x: 0, y: 0, z: 0 } }],
  ])('rejects a hole with %s', async (_label, rest) => {
    const kernel = new StubKernel()
    const plate = await kernel.createBox({ width: 20, height: 20, depth: 4 })

    await expect(kernel.hole(plate, { center: { x: 0, y: 0, z: 2 }, ...rest })).rejects.toThrow(
      KernelError,
    )
  })

  it('reports a hole that removes the whole solid', async () => {
    const kernel = new StubKernel()
    const pin = await kernel.createBox({ width: 1, height: 1, depth: 1 })

    await expect(
      kernel.hole(pin, { center: { x: 0, y: 0, z: 4 }, diameter: 40, depth: 20 }),
    ).rejects.toThrow(/whole solid/)
  })

  it('drafts the walls of a solid outwards', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    const mesh = await kernel.triangulate(await kernel.draft(shape, { angle: 10 }))

    // The neutral plane sits at the base, so the top grows and the base does not.
    expect(extentAlong(mesh, 2)).toEqual({ min: -5, max: 5 })
    expect(volumeOf(mesh)).toBeGreaterThan(1000)
  })

  it('leaves the faces a draft did not name where they were', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    // The +X wall, picked out of the same derivation that hands the ids out.
    const wall = meshTopology(await kernel.triangulate(shape)).faces.find(
      (face) => face.normal.x > 0.9,
    )
    expect(wall).toBeDefined()

    const mesh = await kernel.triangulate(
      await kernel.draft(shape, { angle: 10, faceIds: [(wall as TopologyFace).id] }),
    )

    // Only the named wall leans out; the opposite one stays on its own plane.
    expect(extentAlong(mesh, 0).max).toBeGreaterThan(5)
    expect(extentAlong(mesh, 0).min).toBeCloseTo(-5, 6)
  })

  it('refuses a draft whose faces are no longer part of the solid', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    // Tapering the whole box instead would report a draft of the one face the
    // caller asked for, which is not what happened.
    await expect(kernel.draft(shape, { angle: 10, faceIds: ['face-stale'] })).rejects.toThrow(
      /face-stale/,
    )
  })

  it.each([
    ['a right-angle draft', { angle: 90 }],
    ['a zero-length pull direction', { angle: 5, pullDirection: { x: 0, y: 0, z: 0 } }],
  ])('rejects %s', async (_label, params) => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    await expect(kernel.draft(shape, params)).rejects.toThrow(KernelError)
  })
})

describe('StubKernel placement', () => {
  it('translates, rotates and scales a copy', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 2, height: 2, depth: 2 })

    const mesh = await kernel.triangulate(
      await kernel.transform(shape, {
        scale: 2,
        rotate: { axis: { x: 0, y: 0, z: 1 }, angle: 90 },
        translate: { x: 10, y: 0, z: 0 },
      }),
    )

    expect(extentAlong(mesh, 0)).toEqual({ min: 8, max: 12 })
    expect(volumeOf(mesh)).toBeCloseTo(64, 3)
  })

  it('scales about a chosen origin', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 2, height: 2, depth: 2 })

    const mesh = await kernel.triangulate(
      await kernel.transform(shape, {
        scale: { x: 2, y: 1, z: 1 },
        scaleOrigin: { x: 1, y: 0, z: 0 },
      }),
    )

    // Doubling about x = 1 pins that face and pushes the other one out to -3.
    expect(extentAlong(mesh, 0)).toEqual({ min: -3, max: 1 })
  })

  it.each([
    ['a zero scale factor', { scale: 0 }],
    ['a zero-length rotation axis', { rotate: { axis: { x: 0, y: 0, z: 0 }, angle: 45 } }],
  ])('rejects a transform with %s', async (_label, params) => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 2, height: 2, depth: 2 })

    await expect(kernel.transform(shape, params)).rejects.toThrow(KernelError)
  })

  it('mirrors a copy through a plane', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({
      width: 2,
      height: 2,
      depth: 2,
      center: { x: 5, y: 0, z: 0 },
    })

    const mesh = await kernel.triangulate(
      await kernel.mirror(shape, {
        origin: { x: 0, y: 0, z: 0 },
        xAxis: { x: 0, y: 1, z: 0 },
        yAxis: { x: 0, y: 0, z: 1 },
      }),
    )

    expect(extentAlong(mesh, 0)).toEqual({ min: -6, max: -4 })
    expect(volumeOf(mesh)).toBeCloseTo(8, 3)
  })

  it('copies a shape independently of the original', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 2, height: 2, depth: 2 })

    const duplicate = await kernel.copy(shape)
    kernel.dispose(shape)

    expect(triangleCount(await kernel.triangulate(duplicate))).toBe(12)
  })

  it.each([
    ['fillet', (k: StubKernel) => k.fillet({ id: 'nope' }, { radius: 1 })],
    ['chamfer', (k: StubKernel) => k.chamfer({ id: 'nope' }, { distance: 1 })],
    ['shell', (k: StubKernel) => k.shell({ id: 'nope' }, { thickness: 1 })],
    [
      'hole',
      (k: StubKernel) =>
        k.hole({ id: 'nope' }, { center: { x: 0, y: 0, z: 0 }, diameter: 1, depth: 1 }),
    ],
    ['draft', (k: StubKernel) => k.draft({ id: 'nope' }, { angle: 5 })],
    ['transform', (k: StubKernel) => k.transform({ id: 'nope' }, {})],
    ['mirror', (k: StubKernel) => k.mirror({ id: 'nope' }, WORLD_XY)],
    ['copy', (k: StubKernel) => k.copy({ id: 'nope' })],
    ['boundingBox', (k: StubKernel) => k.boundingBox({ id: 'nope' })],
  ])('rejects %s on an unknown shape', async (_label, run) => {
    await expect(run(new StubKernel())).rejects.toThrow(/Unknown shape/)
  })
})

describe('mesh conversion', () => {
  it('round-trips mesh data through a BufferGeometry', async () => {
    const kernel = new StubKernel()
    const original = await kernel.triangulate(
      await kernel.createBox({ width: 4, height: 4, depth: 4 }),
    )

    const restored = toMeshData(toBufferGeometry(original))

    expect(restored.indices).toEqual(original.indices)
    expect(restored.positions).toEqual(original.positions)
  })

  it('generates normals when the source mesh has none', () => {
    const geometry = toBufferGeometry({
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [],
      indices: [0, 1, 2],
    })

    expect(geometry.getAttribute('normal')).toBeDefined()
  })
})
