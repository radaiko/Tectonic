import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { KernelError, WORLD_XY, isBRepKernel } from '../../src/kernel/IKernel'
import type { FaceInfo, PlaneFrame, Profile, ShapeHandle, Vec3 } from '../../src/kernel/IKernel'
import { OpenCascadeKernel } from '../../src/kernel/OpenCascadeKernel'
import { resetOpenCascade } from '../../src/kernel/wasm/WasmLoader'
import type { MeshData } from '../../src/domain/MeshData'
import { triangleCount, vertexCount } from '../../src/domain/MeshData'

// Node resolves the binary next to occt-wasm's own module, so the streamed
// download the browser uses is switched off here.
const NODE_LOAD = { wasmUrl: null } as const

const SQUARE: Profile = {
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
}

/** A square with a square hole — 100 minus 4 units of area. */
const SQUARE_WITH_HOLE: Profile = {
  points: SQUARE.points,
  holes: [
    [
      { x: 4, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 6 },
      { x: 4, y: 6 },
    ],
  ],
}

/** A square clear of the Y axis, so a revolve about it has a real radius. */
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

let kernel: OpenCascadeKernel

/** Divergence-theorem volume of the tessellation, to check it closes up. */
function meshVolume(mesh: MeshData): number {
  let total = 0
  for (let index = 0; index + 2 < mesh.indices.length; index += 3) {
    const [a, b, c] = [0, 1, 2].map((corner) => {
      const vertex = mesh.indices[index + corner] as number
      return {
        x: mesh.positions[vertex * 3] as number,
        y: mesh.positions[vertex * 3 + 1] as number,
        z: mesh.positions[vertex * 3 + 2] as number,
      }
    }) as [{ x: number; y: number; z: number }, { x: number; y: number; z: number }, { x: number; y: number; z: number }]
    total +=
      a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x)
  }
  return total / 6
}

async function volumeOf(shape: ShapeHandle): Promise<number> {
  return (await kernel.massProperties(shape)).volume
}

beforeAll(async () => {
  resetOpenCascade()
  kernel = await OpenCascadeKernel.create(NODE_LOAD)
  await kernel.init()
}, 60_000)

afterAll(() => {
  kernel.disposeAll()
  resetOpenCascade()
})

describe('OpenCascadeKernel — loading', () => {
  it('reports itself as the OpenCascade backend', () => {
    expect(kernel.name).toBe('opencascade')
  })

  it('answers the B-Rep capability check', () => {
    expect(isBRepKernel(kernel)).toBe(true)
  })

  it('hands the same WASM instance to a second kernel', async () => {
    const again = await OpenCascadeKernel.create(NODE_LOAD)
    const box = await again.createBox({ width: 1, height: 1, depth: 1 })

    expect(await volumeOf(await kernel.copy(box))).toBeCloseTo(1)
    again.disposeAll()
  })
})

describe('OpenCascadeKernel — primitives', () => {
  it('builds a box centred on the origin', async () => {
    const box = await kernel.createBox({ width: 10, height: 20, depth: 30 })

    expect(await volumeOf(box)).toBeCloseTo(6000)
    expect(await kernel.boundingBox(box)).toEqual({
      min: { x: -5, y: -10, z: -15 },
      max: { x: 5, y: 10, z: 15 },
    })
  })

  it('builds a box about a given centre', async () => {
    const box = await kernel.createBox({
      width: 2,
      height: 2,
      depth: 2,
      center: { x: 10, y: 0, z: 0 },
    })

    expect((await kernel.massProperties(box)).centerOfMass.x).toBeCloseTo(10)
  })

  it('rejects a box with a non-positive dimension', async () => {
    await expect(kernel.createBox({ width: 0, height: 1, depth: 1 })).rejects.toThrow(KernelError)
  })

  it('produces a closed, valid solid', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    expect(await kernel.isSolid(box)).toBe(true)
    expect(await kernel.isValid(box)).toBe(true)
    expect((await kernel.faces(box)).length).toBe(6)
    expect((await kernel.edges(box)).length).toBe(12)
  })

  it('adopts a triangle mesh as a real shell', async () => {
    const tetra: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      normals: [],
      indices: [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3],
    }
    const shape = await kernel.createFromMesh(tetra)

    expect(await volumeOf(shape)).toBeCloseTo(1 / 6)
    expect((await kernel.faces(shape)).length).toBe(4)
  })

  it('drops zero-area triangles when adopting a mesh', async () => {
    const withSliver: MeshData = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0],
      normals: [],
      indices: [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3, 0, 1, 4],
    }
    const shape = await kernel.createFromMesh(withSliver)

    expect((await kernel.faces(shape)).length).toBe(4)
  })

  it('rejects a mesh that is not made of triangles', async () => {
    await expect(
      kernel.createFromMesh({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: [], indices: [0, 1] }),
    ).rejects.toThrow(KernelError)
    await expect(
      kernel.createFromMesh({
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
        normals: [],
        indices: [0, 1, 2, 3],
      }),
    ).rejects.toThrow(KernelError)
  })

  it('rejects a mesh with no area at all', async () => {
    await expect(
      kernel.createFromMesh({ positions: [0, 0, 0, 1, 0, 0, 2, 0, 0], normals: [], indices: [0, 1, 2] }),
    ).rejects.toThrow('no triangle with any area')
  })
})

describe('OpenCascadeKernel — sweeps', () => {
  it('extrudes a profile to an exact volume', async () => {
    const prism = await kernel.extrude({ profile: SQUARE, distance: 5 })

    expect(await volumeOf(prism)).toBeCloseTo(500)
    expect((await kernel.faces(prism)).length).toBe(6)
  })

  it('keeps a hole in the profile through the extrusion', async () => {
    const prism = await kernel.extrude({ profile: SQUARE_WITH_HOLE, distance: 5 })

    expect(await volumeOf(prism)).toBeCloseTo(480)
    expect((await kernel.faces(prism)).length).toBe(10)
  })

  it('extrudes along the plane normal by default', async () => {
    const prism = await kernel.extrude({ profile: SQUARE, distance: 5, plane: XZ_PLANE })
    const box = await kernel.boundingBox(prism)

    expect(box.min.y).toBeCloseTo(0)
    expect(box.max.y).toBeCloseTo(5)
  })

  it('extrudes along an explicit direction', async () => {
    const prism = await kernel.extrude({
      profile: SQUARE,
      distance: 5,
      direction: { x: 0, y: 0, z: -1 },
    })
    const box = await kernel.boundingBox(prism)

    expect(box.min.z).toBeCloseTo(-5)
    expect(box.max.z).toBeCloseTo(0)
  })

  it('splits a symmetric extrusion evenly about the plane', async () => {
    const prism = await kernel.extrude({ profile: SQUARE, distance: 6, side: 'symmetric' })
    const box = await kernel.boundingBox(prism)

    expect(box.min.z).toBeCloseTo(-3)
    expect(box.max.z).toBeCloseTo(3)
    expect(await volumeOf(prism)).toBeCloseTo(600)
  })

  it('runs a two-sided extrusion the second distance the other way', async () => {
    const prism = await kernel.extrude({
      profile: SQUARE,
      distance: 4,
      side: 'two-sided',
      secondDistance: 2,
    })
    const box = await kernel.boundingBox(prism)

    expect(box.min.z).toBeCloseTo(-2)
    expect(box.max.z).toBeCloseTo(4)
    expect(await volumeOf(prism)).toBeCloseTo(600)
  })

  it('widens the far end for a positive draft angle', async () => {
    const drafted = await kernel.extrude({ profile: SQUARE, distance: 10, draftAngle: 5 })

    expect(await volumeOf(drafted)).toBeGreaterThan(1000)
    expect((await kernel.boundingBox(drafted)).max.x).toBeGreaterThan(10)
  })

  it('rejects a non-positive extrude distance and a zero direction', async () => {
    await expect(kernel.extrude({ profile: SQUARE, distance: 0 })).rejects.toThrow(KernelError)
    await expect(
      kernel.extrude({ profile: SQUARE, distance: 1, direction: { x: 0, y: 0, z: 0 } }),
    ).rejects.toThrow('must be non-zero')
  })

  it('rejects a profile with too few distinct points', async () => {
    await expect(
      kernel.extrude({ profile: { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }, distance: 1 }),
    ).rejects.toThrow('at least three points')
  })

  it('revolves a profile into a ring', async () => {
    const ring = await kernel.revolve({
      profile: OFFSET_SQUARE,
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 360,
    })

    expect(await volumeOf(ring)).toBeCloseTo(Math.PI * (100 - 25) * 4, 6)
  })

  it('revolves through a partial angle', async () => {
    const quarter = await kernel.revolve({
      profile: OFFSET_SQUARE,
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 90,
    })

    expect(await volumeOf(quarter)).toBeCloseTo((Math.PI * (100 - 25) * 4) / 4, 6)
  })

  it('centres a symmetric revolve on the profile', async () => {
    const symmetric = await kernel.revolve({
      profile: OFFSET_SQUARE,
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 90,
      symmetric: true,
    })
    const box = await kernel.boundingBox(symmetric)

    expect(box.min.z).toBeCloseTo(-box.max.z, 6)
  })

  it('rejects a revolve with no angle or no axis', async () => {
    await expect(
      kernel.revolve({
        profile: OFFSET_SQUARE,
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 0,
      }),
    ).rejects.toThrow('must be non-zero')
    await expect(
      kernel.revolve({
        profile: OFFSET_SQUARE,
        axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 0 } },
        angle: 90,
      }),
    ).rejects.toThrow('axis direction must be non-zero')
  })

  it('sweeps a profile along a straight path', async () => {
    const swept = await kernel.sweep({
      profile: SQUARE,
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 8 },
      ],
    })

    expect(await volumeOf(swept)).toBeCloseTo(800)
  })

  it('keeps a swept tube hollow', async () => {
    const tube = await kernel.sweep({
      profile: SQUARE_WITH_HOLE,
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 5 },
      ],
    })

    expect(await volumeOf(tube)).toBeCloseTo(480)
  })

  it('sweeps with the profile held in place', async () => {
    const swept = await kernel.sweep({
      profile: SQUARE,
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 4 },
      ],
      orientation: 'perpendicular',
    })

    expect(await volumeOf(swept)).toBeCloseTo(400)
  })

  it('twists a sweep about its path', async () => {
    const twisted = await kernel.sweep({
      profile: SQUARE,
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 20 },
      ],
      twistAngle: 90,
    })

    expect(await kernel.isSolid(twisted)).toBe(true)
    // A twisted prism keeps roughly its section area but no longer sits square.
    expect(await volumeOf(twisted)).toBeGreaterThan(1500)
    expect((await kernel.boundingBox(twisted)).min.x).toBeLessThan(0)
  })

  it('rejects a sweep path with fewer than two distinct points', async () => {
    await expect(
      kernel.sweep({ profile: SQUARE, path: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }] }),
    ).rejects.toThrow('two distinct points')
  })

  it('lofts between two sections', async () => {
    const lofted = await kernel.loft({
      sections: [
        { profile: SQUARE },
        {
          profile: { points: [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 8 }, { x: 2, y: 8 }] },
          plane: { origin: { x: 0, y: 0, z: 10 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 } },
        },
      ],
    })

    // A prismatoid: h/6 * (A1 + 4*Am + A2) = 10/6 * (100 + 4*64 + 36).
    expect(await volumeOf(lofted)).toBeCloseTo((10 / 6) * (100 + 4 * 64 + 36))
    expect(await kernel.isSolid(lofted)).toBe(true)
  })

  it('rejects a loft with a single section', async () => {
    await expect(kernel.loft({ sections: [{ profile: SQUARE }] })).rejects.toThrow(
      'at least two sections',
    )
  })
})

describe('OpenCascadeKernel — booleans', () => {
  async function pair(): Promise<[ShapeHandle, ShapeHandle]> {
    return [
      await kernel.createBox({ width: 10, height: 10, depth: 10 }),
      await kernel.createBox({ width: 10, height: 10, depth: 10, center: { x: 5, y: 0, z: 0 } }),
    ]
  }

  it('unions two overlapping boxes', async () => {
    const [a, b] = await pair()
    const united = await kernel.booleanUnion(a, b)

    expect(await volumeOf(united)).toBeCloseTo(1500)
    expect(await kernel.isSolid(united)).toBe(true)
    // Coplanar fragments are merged, so the union of two boxes is still a box.
    expect((await kernel.faces(united)).length).toBe(6)
  })

  it('subtracts one box from another', async () => {
    const [a, b] = await pair()

    expect(await volumeOf(await kernel.booleanSubtract(a, b))).toBeCloseTo(500)
  })

  it('intersects two boxes', async () => {
    const [a, b] = await pair()
    const common = await kernel.booleanIntersect(a, b)

    expect(await volumeOf(common)).toBeCloseTo(500)
    expect(await kernel.isValid(common)).toBe(true)
  })

  it('reports a boolean that leaves nothing behind', async () => {
    const a = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    const far = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 50, y: 0, z: 0 } })

    await expect(kernel.booleanIntersect(a, far)).rejects.toThrow('empty solid')
  })

  it('refuses to work with a shape it does not know', async () => {
    const a = await kernel.createBox({ width: 1, height: 1, depth: 1 })

    await expect(kernel.booleanUnion(a, { id: 'nope' })).rejects.toThrow('Unknown shape')
  })
})

describe('OpenCascadeKernel — edge and face treatments', () => {
  it('rounds every edge of a box', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const rounded = await kernel.fillet(box, { radius: 1 })

    // Real rounding removes material and adds faces, unlike the stub's no-op.
    expect(await volumeOf(rounded)).toBeLessThan(1000)
    expect(await volumeOf(rounded)).toBeGreaterThan(950)
    expect((await kernel.faces(rounded)).length).toBeGreaterThan(6)
  })

  it('rounds only the named edges', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { edgeIds } = await kernel.topology(box)
    const rounded = await kernel.fillet(box, { radius: 2, edgeIds: [edgeIds[0] as string] })

    // One edge of a 10-long box, rounded at r=2, loses (4 - pi) * r^2/4 * 10.
    expect(await volumeOf(rounded)).toBeCloseTo(1000 - (4 - Math.PI) * 10, 6)
  })

  it('chamfers an edge symmetrically', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { edgeIds } = await kernel.topology(box)
    const cut = await kernel.chamfer(box, { distance: 1, edgeIds: [edgeIds[0] as string] })

    expect(await volumeOf(cut)).toBeCloseTo(1000 - 0.5 * 10, 6)
  })

  it('chamfers with two distances', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { edgeIds } = await kernel.topology(box)
    const cut = await kernel.chamfer(box, {
      distance: 1,
      secondDistance: 2,
      edgeIds: [edgeIds[0] as string],
    })

    expect(await volumeOf(cut)).toBeCloseTo(1000 - 0.5 * 1 * 2 * 10, 6)
  })

  it('chamfers at an angle', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { edgeIds } = await kernel.topology(box)
    const cut = await kernel.chamfer(box, { distance: 1, angle: 45, edgeIds: [edgeIds[0] as string] })

    expect(await volumeOf(cut)).toBeCloseTo(1000 - 0.5 * 10, 6)
  })

  it('rejects nonsensical fillet and chamfer parameters', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    await expect(kernel.fillet(box, { radius: 0 })).rejects.toThrow('must be positive')
    await expect(kernel.chamfer(box, { distance: -1 })).rejects.toThrow('must be positive')
    await expect(kernel.chamfer(box, { distance: 1, angle: 90 })).rejects.toThrow('between 0 and 90')
    await expect(kernel.chamfer(box, { distance: 1, secondDistance: 0 })).rejects.toThrow(
      'second distance must be positive',
    )
  })

  it('ignores edge ids that belong to another shape', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    await expect(kernel.fillet(box, { radius: 1, edgeIds: ['edge-999'] })).rejects.toThrow(
      'None of those edges',
    )
  })

  it('hollows a solid into a closed shell', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const hollow = await kernel.shell(box, { thickness: 1 })

    expect(await volumeOf(hollow)).toBeCloseTo(1000 - 512, 6)
    expect((await kernel.faces(hollow)).length).toBe(12)
  })

  it('leaves a named face open', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { faceIds } = await kernel.topology(box)
    const open = await kernel.shell(box, { thickness: 1, openFaceIds: [faceIds[0] as string] })

    // One wall missing: 1000 minus a 9 x 8 x 8 cavity.
    expect(await volumeOf(open)).toBeCloseTo(1000 - 9 * 8 * 8, 6)
  })

  it('rejects a shell thicker than the solid', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    await expect(kernel.shell(box, { thickness: 5 })).rejects.toThrow('exceeds the solid')
    await expect(kernel.shell(box, { thickness: 0 })).rejects.toThrow('must be positive')
  })

  it('drills a simple hole', async () => {
    const box = await kernel.createBox({ width: 20, height: 20, depth: 20 })
    const drilled = await kernel.hole(box, {
      center: { x: 0, y: 0, z: 10 },
      diameter: 4,
      depth: 5,
    })

    expect(await volumeOf(drilled)).toBeLessThan(8000)
    expect(await volumeOf(drilled)).toBeCloseTo(8000 - Math.PI * 4 * 5, 0)
    expect((await kernel.faces(drilled)).length).toBe(8)
  })

  it('drills through in a given direction', async () => {
    const box = await kernel.createBox({ width: 20, height: 20, depth: 20 })
    const drilled = await kernel.hole(box, {
      center: { x: 0, y: 0, z: -10 },
      direction: { x: 0, y: 0, z: 1 },
      diameter: 4,
      depth: 30,
    })

    expect(await volumeOf(drilled)).toBeCloseTo(8000 - Math.PI * 4 * 20, 6)
  })

  it('widens the mouth for a counterbore and a countersink', async () => {
    const box = await kernel.createBox({ width: 20, height: 20, depth: 20 })
    const plain = await kernel.hole(box, { center: { x: 0, y: 0, z: 10 }, diameter: 4, depth: 6 })
    const bore = await kernel.hole(box, {
      center: { x: 0, y: 0, z: 10 },
      diameter: 4,
      depth: 6,
      kind: 'counterbore',
      headDiameter: 8,
      headDepth: 2,
    })
    const sink = await kernel.hole(box, {
      center: { x: 0, y: 0, z: 10 },
      diameter: 4,
      depth: 6,
      kind: 'countersink',
      headDiameter: 8,
      headDepth: 2,
    })

    expect(await volumeOf(bore)).toBeLessThan(await volumeOf(plain))
    expect(await volumeOf(sink)).toBeLessThan(await volumeOf(plain))
    // The cone of a countersink removes less than the cylinder of a counterbore.
    expect(await volumeOf(sink)).toBeGreaterThan(await volumeOf(bore))
  })

  it('rejects a hole with no size and one that eats the solid', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    await expect(
      kernel.hole(box, { center: { x: 0, y: 0, z: 2 }, diameter: 0, depth: 1 }),
    ).rejects.toThrow('diameter must be positive')
    await expect(
      kernel.hole(box, { center: { x: 0, y: 0, z: 2 }, diameter: 1, depth: 0 }),
    ).rejects.toThrow('depth must be positive')
    await expect(
      kernel.hole(box, {
        center: { x: 0, y: 0, z: 2 },
        diameter: 1,
        depth: 1,
        direction: { x: 0, y: 0, z: 0 },
      }),
    ).rejects.toThrow('direction must be non-zero')
  })

  it('tapers the side walls of a solid', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const drafted = await kernel.draft(box, { angle: 5 })

    // A positive angle opens the solid out towards the pull direction.
    expect(await volumeOf(drafted)).toBeGreaterThan(1000)
    expect((await kernel.boundingBox(drafted)).max.x).toBeGreaterThan(5)
  })

  it('drafts only a named face', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const { faceIds } = await kernel.topology(box)
    const one = await kernel.draft(box, { angle: 5, faceIds: [faceIds[0] as string] })
    const all = await kernel.draft(box, { angle: 5 })

    expect(await volumeOf(one)).toBeLessThan(await volumeOf(all))
    expect(await volumeOf(one)).toBeGreaterThan(1000)
  })

  it('rejects a draft that cannot be applied', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    await expect(kernel.draft(box, { angle: 90 })).rejects.toThrow('less than 90 degrees')
    await expect(
      kernel.draft(box, { angle: 5, pullDirection: { x: 0, y: 0, z: 0 } }),
    ).rejects.toThrow('pull direction must be non-zero')
    await expect(kernel.draft(box, { angle: 5, faceIds: ['face-99'] })).rejects.toThrow(
      'None of those faces',
    )
  })
})

describe('OpenCascadeKernel — splitting', () => {
  const HALFWAY: PlaneFrame = {
    origin: { x: 0, y: 0, z: 0 },
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 1, z: 0 },
  }

  it('cuts a solid in two, front piece first', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const pieces = await kernel.split(box, { plane: HALFWAY })

    expect(pieces).toHaveLength(2)
    expect(await volumeOf(pieces[0] as ShapeHandle)).toBeCloseTo(500)
    expect((await kernel.massProperties(pieces[0] as ShapeHandle)).centerOfMass.z).toBeGreaterThan(0)
    expect((await kernel.massProperties(pieces[1] as ShapeHandle)).centerOfMass.z).toBeLessThan(0)
  })

  it('keeps just the side that was asked for', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const front = await kernel.split(box, { plane: HALFWAY, keep: 'front' })
    const back = await kernel.split(box, { plane: HALFWAY, keep: 'back' })

    expect(front).toHaveLength(1)
    expect(back).toHaveLength(1)
    expect((await kernel.massProperties(front[0] as ShapeHandle)).centerOfMass.z).toBeGreaterThan(0)
    expect((await kernel.massProperties(back[0] as ShapeHandle)).centerOfMass.z).toBeLessThan(0)
  })

  it('returns the whole solid when the plane misses it', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const pieces = await kernel.split(box, {
      plane: { ...HALFWAY, origin: { x: 0, y: 0, z: 50 } },
    })

    expect(pieces).toHaveLength(1)
    expect(await volumeOf(pieces[0] as ShapeHandle)).toBeCloseTo(1000)
  })

  it('reports when the wanted side is empty', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    await expect(
      kernel.split(box, { plane: { ...HALFWAY, origin: { x: 0, y: 0, z: 50 } }, keep: 'front' }),
    ).rejects.toThrow('produced no solid')
  })

  it('rejects a degenerate cutting plane', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    await expect(
      kernel.split(box, {
        plane: { origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 1, y: 0, z: 0 } },
      }),
    ).rejects.toThrow('must not be parallel')
  })
})

describe('OpenCascadeKernel — topology', () => {
  it('names every face, edge and vertex of a box', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const topology = await kernel.topology(box)

    expect(topology.faceIds).toHaveLength(6)
    expect(topology.edgeIds).toHaveLength(12)
    expect(topology.vertexIds).toHaveLength(8)
    expect(topology.faceIds[0]).toBe('face-0')
  })

  it('names the same solid the same way twice', async () => {
    const first = await kernel.createBox({ width: 3, height: 4, depth: 5 })
    const second = await kernel.createBox({ width: 3, height: 4, depth: 5 })

    expect(await kernel.topology(first)).toEqual(await kernel.topology(second))
  })

  it('survives a re-tessellation of the same solid', async () => {
    const cylinderish = await kernel.revolve({
      profile: OFFSET_SQUARE,
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 360,
    })
    const before = await kernel.topology(cylinderish)
    await kernel.triangulate(cylinderish, { linearDeflection: 0.01 })

    expect(await kernel.topology(cylinderish)).toEqual(before)
  })
})

describe('OpenCascadeKernel — direct editing', () => {
  const UP: Vec3 = { x: 0, y: 0, z: 1 }

  it('drags a face along a direction', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const pulled = await kernel.moveFace(box, {
      faceIds: [await faceFacing(box, UP)],
      direction: UP,
      distance: 3,
    })

    expect(await volumeOf(pulled)).toBeCloseTo(1300)
    expect(await kernel.isSolid(pulled)).toBe(true)
  })

  it('pushes a face inwards', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const pushed = await kernel.moveFace(box, {
      faceIds: [await faceFacing(box, UP)],
      direction: { x: 0, y: 0, z: -1 },
      distance: 3,
    })

    expect(await volumeOf(pushed)).toBeCloseTo(700)
  })

  it('moves several faces independently of each other', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const pulled = await kernel.moveFace(box, {
      faceIds: [await faceFacing(box, UP), await faceFacing(box, { x: 1, y: 0, z: 0 })],
      direction: { x: 0, y: 0, z: 1 },
      distance: 2,
    })

    // Only the +Z face has any travel along the drag; the +X face slides in place.
    expect(await volumeOf(pulled)).toBeCloseTo(1200)
  })

  it('leaves the solid alone when a face slides in its own plane', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const slid = await kernel.moveFace(box, {
      faceIds: [await faceFacing(box, UP)],
      direction: { x: 1, y: 0, z: 0 },
      distance: 3,
    })

    expect(await volumeOf(slid)).toBeCloseTo(1000)
  })

  it('offsets a face along its own normal', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const grown = await kernel.offsetFace(box, {
      faceIds: [await faceFacing(box, UP)],
      distance: 2,
    })

    expect(await volumeOf(grown)).toBeCloseTo(1200)
  })

  it('sinks a face for a negative offset', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const sunk = await kernel.offsetFace(box, {
      faceIds: [await faceFacing(box, UP)],
      distance: -2,
    })

    expect(await volumeOf(sunk)).toBeCloseTo(800)
  })

  it('follows the curve when offsetting a cylindrical face', async () => {
    const rod = await kernel.revolve({
      profile: { points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 10 }, { x: 0, y: 10 }] },
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 360,
    })
    const wall = await faceIdsWhere(rod, (face) => face.kind === 'cylinder')
    const fatter = await kernel.offsetFace(rod, { faceIds: wall, distance: 1 })

    expect(wall).toHaveLength(1)
    // A radial offset, not a straight prism: the rod stays round at r = 6.
    expect(await volumeOf(fatter)).toBeCloseTo(Math.PI * 36 * 10, 6)
  })

  it('does nothing for a zero offset', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const same = await kernel.offsetFace(box, { faceIds: [await faceFacing(box, UP)], distance: 0 })

    expect(await volumeOf(same)).toBeCloseTo(1000)
  })

  it('fills a pocket when its faces are deleted', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const pocketTool = await kernel.createBox({
      width: 2,
      height: 2,
      depth: 2,
      center: { x: 0, y: 0, z: 5 },
    })
    const pocketed = await kernel.booleanSubtract(box, pocketTool)
    expect(await volumeOf(pocketed)).toBeCloseTo(996)

    // The pocket's walls and floor are the faces that sit inside the box's own
    // extent rather than on its outside.
    const pocketFaces = await faceIdsWhere(
      pocketed,
      (face) => Math.abs(face.centroid.z) < 5 && Math.abs(face.centroid.x) <= 1 + 1e-9 && face.area <= 4 + 1e-9,
    )
    const healed = await kernel.deleteFace(pocketed, { faceIds: pocketFaces })

    expect(pocketFaces.length).toBe(5)
    expect(await volumeOf(healed)).toBeCloseTo(1000, 6)
    expect((await kernel.faces(healed)).length).toBe(6)
  })

  it('fills a through hole when its wall is deleted', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const drilled = await kernel.hole(box, {
      center: { x: 0, y: 0, z: 6 },
      diameter: 4,
      depth: 20,
    })
    const wall = await faceIdsWhere(drilled, (face) => face.kind === 'cylinder')
    const healed = await kernel.deleteFace(drilled, { faceIds: wall })

    expect(wall).toHaveLength(1)
    expect(await volumeOf(healed)).toBeCloseTo(1000, 6)
    expect((await kernel.faces(healed)).length).toBe(6)
  })

  it('cuts a boss away when its faces are deleted', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const bossTool = await kernel.createBox({
      width: 2,
      height: 2,
      depth: 2,
      center: { x: 0, y: 0, z: 6 },
    })
    const bossed = await kernel.booleanUnion(box, bossTool)
    const bossFaces = await faceIdsWhere(bossed, (face) => face.centroid.z > 5 + 1e-9)
    const healed = await kernel.deleteFace(bossed, { faceIds: bossFaces })

    expect(await volumeOf(bossed)).toBeCloseTo(1004)
    expect(await volumeOf(healed)).toBeCloseTo(1000, 6)
    expect((await kernel.faces(healed)).length).toBe(6)
  })

  it('rejects direct edits with nothing selected', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })

    await expect(
      kernel.moveFace(box, { faceIds: [], direction: { x: 0, y: 0, z: 1 }, distance: 1 }),
    ).rejects.toThrow('at least one face')
    await expect(kernel.offsetFace(box, { faceIds: [], distance: 1 })).rejects.toThrow(
      'at least one face',
    )
    await expect(kernel.deleteFace(box, { faceIds: [] })).rejects.toThrow('at least one face')
    await expect(
      kernel.moveFace(box, {
        faceIds: ['face-0'],
        direction: { x: 0, y: 0, z: 0 },
        distance: 1,
      }),
    ).rejects.toThrow('must be non-zero')
  })

  it('will not delete a face that leaves no opening', async () => {
    const box = await kernel.createBox({ width: 4, height: 4, depth: 4 })
    const all = (await kernel.topology(box)).faceIds

    await expect(kernel.deleteFace(box, { faceIds: all })).rejects.toThrow(
      'would remove the whole solid',
    )
  })
})

describe('OpenCascadeKernel — placement', () => {
  it('translates a copy', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    const moved = await kernel.transform(box, { translate: { x: 10, y: 0, z: 0 } })

    expect((await kernel.massProperties(moved)).centerOfMass.x).toBeCloseTo(10)
    expect((await kernel.massProperties(box)).centerOfMass.x).toBeCloseTo(0)
  })

  it('rotates about an axis through a point', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 5, y: 0, z: 0 } })
    const turned = await kernel.transform(box, {
      rotate: { axis: { x: 0, y: 0, z: 1 }, angle: 90 },
    })

    const centre = (await kernel.massProperties(turned)).centerOfMass
    expect(centre.x).toBeCloseTo(0)
    expect(centre.y).toBeCloseTo(5)
  })

  it('scales uniformly and per axis', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })

    expect(await volumeOf(await kernel.transform(box, { scale: 2 }))).toBeCloseTo(64)
    expect(
      await volumeOf(await kernel.transform(box, { scale: { x: 2, y: 1, z: 0.5 } })),
    ).toBeCloseTo(8)
  })

  it('scales about a chosen point', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 4, y: 0, z: 0 } })
    const scaled = await kernel.transform(box, { scale: 2, scaleOrigin: { x: 0, y: 0, z: 0 } })

    expect((await kernel.massProperties(scaled)).centerOfMass.x).toBeCloseTo(8)
  })

  it('applies scale, rotation and translation in that order', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 1, y: 0, z: 0 } })
    const placed = await kernel.transform(box, {
      scale: 2,
      rotate: { axis: { x: 0, y: 0, z: 1 }, angle: 90 },
      translate: { x: 0, y: 0, z: 5 },
    })

    const centre = (await kernel.massProperties(placed)).centerOfMass
    expect(centre.x).toBeCloseTo(0)
    expect(centre.y).toBeCloseTo(2)
    expect(centre.z).toBeCloseTo(5)
  })

  it('copies a shape when the transform asks for nothing', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    const same = await kernel.transform(box, {})

    expect(same.id).not.toBe(box.id)
    expect(await volumeOf(same)).toBeCloseTo(8)
  })

  it('rejects a degenerate transform', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })

    await expect(kernel.transform(box, { scale: { x: 0, y: 1, z: 1 } })).rejects.toThrow(
      'must be non-zero',
    )
    await expect(
      kernel.transform(box, { rotate: { axis: { x: 0, y: 0, z: 0 }, angle: 90 } }),
    ).rejects.toThrow('axis must be non-zero')
  })

  it('mirrors through a plane, keeping the solid the right way out', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 5, y: 0, z: 0 } })
    const reflected = await kernel.mirror(box, WORLD_XY)

    // WORLD_XY reflects through z, so the copy sits opposite in z, not x.
    expect(await volumeOf(reflected)).toBeCloseTo(8)
    expect(await kernel.isValid(reflected)).toBe(true)
  })

  it('mirrors through an arbitrary plane', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 5, y: 0, z: 0 } })
    const reflected = await kernel.mirror(box, {
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 0, y: 1, z: 0 },
      yAxis: { x: 0, y: 0, z: 1 },
    })

    expect((await kernel.massProperties(reflected)).centerOfMass.x).toBeCloseTo(-5)
    expect(await volumeOf(reflected)).toBeCloseTo(8)
  })

  it('copies a shape independently', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    const clone = await kernel.copy(box)
    kernel.dispose(box)

    expect(await volumeOf(clone)).toBeCloseTo(8)
  })
})

describe('OpenCascadeKernel — tessellation and properties', () => {
  it('tessellates a box into a closed mesh', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const mesh = await kernel.triangulate(box)

    expect(triangleCount(mesh)).toBe(12)
    expect(vertexCount(mesh)).toBe(24)
    expect(mesh.normals).toHaveLength(mesh.positions.length)
    expect(mesh.indices.every((index) => index >= 0 && index < vertexCount(mesh))).toBe(true)
    // Positive by the divergence theorem means the triangles wind outwards.
    expect(meshVolume(mesh)).toBeCloseTo(1000, 6)
  })

  it('refines a curved surface when asked for a finer deflection', async () => {
    const ring = await kernel.revolve({
      profile: OFFSET_SQUARE,
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 360,
    })
    const coarse = await kernel.triangulate(ring, { linearDeflection: 1 })
    const fine = await kernel.triangulate(ring, { linearDeflection: 0.01 })

    expect(triangleCount(fine)).toBeGreaterThan(triangleCount(coarse))
    // The finer mesh is the closer approximation of the exact volume.
    const exact = Math.PI * (100 - 25) * 4
    expect(Math.abs(meshVolume(fine) - exact)).toBeLessThan(Math.abs(meshVolume(coarse) - exact))
  })

  it('winds a tessellated cylinder outwards too', async () => {
    const ring = await kernel.revolve({
      profile: OFFSET_SQUARE,
      axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
      angle: 360,
    })

    expect(meshVolume(await kernel.triangulate(ring, { linearDeflection: 0.05 }))).toBeGreaterThan(0)
  })

  it('reports mass properties of a box', async () => {
    const box = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const properties = await kernel.massProperties(box)

    expect(properties.volume).toBeCloseTo(1000)
    expect(properties.surfaceArea).toBeCloseTo(600)
    expect(properties.centerOfMass).toEqual({ x: 0, y: 0, z: 0 })
    // m * (a^2 + b^2) / 12 for a cube of side 10 at unit density.
    expect(properties.inertia[0]).toBeCloseTo((1000 * (100 + 100)) / 12, 6)
    expect(properties.inertia).toHaveLength(9)
  })

  it('reports the centre of mass of an off-centre solid', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2, center: { x: 3, y: 4, z: 5 } })

    expect((await kernel.massProperties(box)).centerOfMass).toEqual({ x: 3, y: 4, z: 5 })
  })

  it('thickens a surface into a solid', async () => {
    const sheet = await kernel.createFromMesh({
      positions: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0],
      normals: [],
      indices: [0, 1, 2, 0, 2, 3],
    })
    const solid = await kernel.thicken(sheet, 2)

    expect(Math.abs(await volumeOf(solid))).toBeCloseTo(200, 6)
  })

  it('rejects a zero thickness', async () => {
    const sheet = await kernel.createFromMesh({
      positions: [0, 0, 0, 10, 0, 0, 10, 10, 0],
      normals: [],
      indices: [0, 1, 2],
    })

    await expect(kernel.thicken(sheet, 0)).rejects.toThrow('must be non-zero')
  })

  it('stitches surfaces into one shell', async () => {
    const first = await kernel.createFromMesh({
      positions: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0],
      normals: [],
      indices: [0, 1, 2, 0, 2, 3],
    })
    const second = await kernel.createFromMesh({
      positions: [0, 0, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10],
      normals: [],
      indices: [0, 1, 2, 0, 2, 3],
    })
    const stitched = await kernel.stitch([first, second])

    expect((await kernel.faces(stitched)).length).toBe(4)
  })

  it('rejects stitching nothing', async () => {
    await expect(kernel.stitch([])).rejects.toThrow('at least one surface')
  })
})

describe('OpenCascadeKernel — shape lifetime', () => {
  it('forgets a disposed shape', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    kernel.dispose(box)

    await expect(kernel.triangulate(box)).rejects.toThrow('Unknown shape')
  })

  it('tolerates disposing the same shape twice', async () => {
    const box = await kernel.createBox({ width: 2, height: 2, depth: 2 })
    kernel.dispose(box)

    expect(() => kernel.dispose(box)).not.toThrow()
  })

  it('reports unknown shapes from every query', async () => {
    const ghost = { id: 'occ-shape-does-not-exist' }

    await expect(kernel.boundingBox(ghost)).rejects.toThrow('Unknown shape')
    await expect(kernel.massProperties(ghost)).rejects.toThrow('Unknown shape')
    await expect(kernel.faces(ghost)).rejects.toThrow('Unknown shape')
    await expect(kernel.edges(ghost)).rejects.toThrow('Unknown shape')
    await expect(kernel.topology(ghost)).rejects.toThrow('Unknown shape')
    await expect(kernel.copy(ghost)).rejects.toThrow('Unknown shape')
  })
})

/** The named face whose normal points furthest along `direction`. */
async function faceFacing(shape: ShapeHandle, direction: Vec3): Promise<string> {
  const faces = await kernel.faceInfo(shape)
  const best = faces.reduce((winner, face) =>
    dot(face.normal, direction) > dot(winner.normal, direction) ? face : winner,
  )
  return best.id
}

async function faceIdsWhere(
  shape: ShapeHandle,
  matches: (face: FaceInfo) => boolean,
): Promise<string[]> {
  return (await kernel.faceInfo(shape)).filter(matches).map((face) => face.id)
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}
