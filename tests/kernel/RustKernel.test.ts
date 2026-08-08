import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RustKernel } from '../../src/kernel/RustKernel'
import { KernelError, WORLD_XY } from '../../src/kernel/IKernel'
import type { Profile, ShapeHandle, Vec3 } from '../../src/kernel/IKernel'
import { resetRustKernel, rustError } from '../../src/kernel/rust/RustWasm'
import { meshTopology } from '../../src/kernel/topology'
import type { MeshData } from '../../src/domain/MeshData'

/**
 * The browser lets the generated module fetch its own binary; Node cannot fetch
 * a `file:` URL, so the bytes are read here and handed to the loader.
 *
 * Resolved from the working directory rather than from `import.meta.url`: the
 * jsdom environment installs its own `URL`, which resolves a relative specifier
 * against the document's `http://localhost` base and hands `readFile` something
 * it rightly refuses. Vitest runs from the project root, so this is exact.
 */
const WASM = resolve(process.cwd(), 'kernel/tectonic-wasm/pkg/tectonic_wasm_bg.wasm')

const square = (size: number): Profile => ({
  points: [
    { x: 0, y: 0 },
    { x: size, y: 0 },
    { x: size, y: size },
    { x: 0, y: size },
  ],
})

const volumeOf = (mesh: MeshData): number => {
  let total = 0
  for (let triangle = 0; triangle * 3 + 2 < mesh.indices.length; triangle += 1) {
    const corner = (offset: number): Vec3 => {
      const vertex = mesh.indices[triangle * 3 + offset] as number
      return {
        x: mesh.positions[vertex * 3] as number,
        y: mesh.positions[vertex * 3 + 1] as number,
        z: mesh.positions[vertex * 3 + 2] as number,
      }
    }
    const [a, b, c] = [corner(0), corner(1), corner(2)]
    total +=
      (a.x * (b.y * c.z - b.z * c.y) -
        a.y * (b.x * c.z - b.z * c.x) +
        a.z * (b.x * c.y - b.y * c.x)) /
      6
  }
  return Math.abs(total)
}

describe('RustKernel', () => {
  let kernel: RustKernel

  beforeAll(async () => {
    kernel = await RustKernel.create({ wasmBinary: await readFile(WASM) })
    await kernel.init()
  })

  afterAll(() => {
    resetRustKernel()
  })

  const box = async (size = 10, height = 10): Promise<ShapeHandle> =>
    kernel.extrude({ profile: square(size), distance: height })

  it('reports itself as the Rust backend', () => {
    expect(kernel.name).toBe('tectonic-rust')
    expect(kernel.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  describe('construction', () => {
    it('extrudes a profile into a solid of the right volume', async () => {
      const shape = await kernel.extrude({ profile: square(10), distance: 5 })
      const properties = await kernel.massProperties(shape)

      expect(properties.volume).toBeCloseTo(500, 6)
      expect(properties.surfaceArea).toBeCloseTo(400, 6)
      expect(await kernel.isSolid(shape)).toBe(true)
    })

    it('centres a box on the point it is given', async () => {
      const shape = await kernel.createBox({
        width: 2,
        height: 4,
        depth: 6,
        center: { x: 10, y: 0, z: 0 },
      })

      const bounds = await kernel.boundingBox(shape)
      expect(bounds.min).toEqual({ x: 9, y: -2, z: -3 })
      expect(bounds.max).toEqual({ x: 11, y: 2, z: 3 })
      expect((await kernel.massProperties(shape)).volume).toBeCloseTo(48, 6)
    })

    it('refuses a box with a dimension that is not positive', async () => {
      await expect(kernel.createBox({ width: 0, height: 1, depth: 1 })).rejects.toThrow(KernelError)
    })

    it('revolves a profile about an axis beside it', async () => {
      const shape = await kernel.revolve({
        profile: square(2),
        axis: { origin: { x: -5, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 360,
      })
      expect((await kernel.massProperties(shape)).volume).toBeGreaterThan(0)
    })

    it('sweeps a profile along a path', async () => {
      const shape = await kernel.sweep({
        profile: square(2),
        path: [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 10 },
        ],
      })
      expect((await kernel.massProperties(shape)).volume).toBeCloseTo(40, 6)
    })

    it('lofts between two sections', async () => {
      const shape = await kernel.loft({
        sections: [
          { profile: square(4), plane: WORLD_XY },
          {
            profile: square(4),
            plane: { ...WORLD_XY, origin: { x: 0, y: 0, z: 10 } },
          },
        ],
      })
      expect((await kernel.massProperties(shape)).volume).toBeCloseTo(160, 6)
    })

    it('adopts a mesh as a solid body', async () => {
      const mesh = await kernel.triangulate(await box(10, 5))
      const adopted = await kernel.createFromMesh(mesh)

      expect(await kernel.isSolid(adopted)).toBe(true)
      expect((await kernel.massProperties(adopted)).volume).toBeCloseTo(500, 4)
    })

    it('refuses a mesh that is not made of triangles', async () => {
      const broken: MeshData = { positions: [0, 0, 0], normals: [0, 0, 1], indices: [0, 1] }
      await expect(kernel.createFromMesh(broken)).rejects.toThrow(KernelError)
    })
  })

  describe('booleans', () => {
    it('removes material when subtracting', async () => {
      const result = await kernel.booleanSubtract(await box(10, 10), await box(4, 4))
      expect((await kernel.massProperties(result)).volume).toBeLessThan(1000)
    })

    it('keeps only shared material when intersecting', async () => {
      const result = await kernel.booleanIntersect(await box(10, 10), await box(4, 4))
      expect((await kernel.massProperties(result)).volume).toBeLessThanOrEqual(64 + 1e-6)
    })

    it('keeps everything when uniting', async () => {
      const result = await kernel.booleanUnion(await box(10, 10), await box(4, 4))
      expect((await kernel.massProperties(result)).volume).toBeGreaterThanOrEqual(1000 - 1e-6)
    })
  })

  describe('dress-up features', () => {
    it('rounds an edge the topology named', async () => {
      const shape = await box(10, 10)
      const { edgeIds } = await kernel.topology(shape)
      expect(edgeIds).toHaveLength(12)

      const rounded = await kernel.fillet(shape, { radius: 1, edgeIds: [edgeIds[0] as string] })
      expect((await kernel.massProperties(rounded)).volume).toBeLessThan(1000)
    })

    it('cuts an edge back when chamfering', async () => {
      const shape = await box(10, 10)
      const { edgeIds } = await kernel.topology(shape)
      const cut = await kernel.chamfer(shape, { distance: 1, edgeIds: [edgeIds[0] as string] })
      expect((await kernel.massProperties(cut)).volume).toBeLessThan(1000)
    })

    it('takes a chamfer angle as the second setback it implies', async () => {
      const shape = await box(10, 10)
      const { edgeIds } = await kernel.topology(shape)
      const edge = [edgeIds[0] as string]

      const byAngle = await kernel.chamfer(shape, { distance: 1, angle: 45, edgeIds: edge })
      const byDistance = await kernel.chamfer(shape, {
        distance: 1,
        secondDistance: 1,
        edgeIds: edge,
      })

      const volume = async (handle: ShapeHandle): Promise<number> =>
        (await kernel.massProperties(handle)).volume
      expect(await volume(byAngle)).toBeCloseTo(await volume(byDistance), 9)
    })

    it('refuses a chamfer angle outside the range a cut can have', async () => {
      const shape = await box(10, 10)
      await expect(kernel.chamfer(shape, { distance: 1, angle: 90 })).rejects.toThrow(
        /between 0 and 90/,
      )
    })

    it('hollows a solid', async () => {
      const shape = await box(10, 10)
      const hollow = await kernel.shell(shape, { thickness: 1 })
      expect((await kernel.massProperties(hollow)).volume).toBeLessThan(1000)
    })

    it('opens a face named the way a viewport pick names one', async () => {
      const shape = await box(10, 10)
      // The identifiers a selection is built from come from the tessellation,
      // never from the B-Rep — a user points at triangles. The B-Rep's own face
      // ids are hashes that no caller can see, so a shell handed one of these
      // used to fail with "this body has no face"; it is paired back to the
      // B-Rep face by geometry now, and gets the exact operation.
      const mesh = await kernel.triangulate(shape)
      const top = meshTopology(mesh).faces.find((face) => face.normal.z > 0.99)
      expect(top).toBeDefined()

      const opened = await kernel.shell(shape, {
        thickness: 1,
        openFaceIds: [(top as { id: string }).id],
      })

      // Exactly the wall: the box less the 8×8×9 cavity a 1mm wall leaves once
      // the lid is off. An approximation of the same cut would not land here.
      expect((await kernel.massProperties(opened)).volume).toBeCloseTo(424, 6)
      expect(await kernel.isSolid(opened)).toBe(true)

      const walls = meshTopology(await kernel.triangulate(opened)).faces
      const upwardAreaAt = (offset: number): number =>
        walls
          .filter((face) => face.normal.z > 0.99 && Math.abs(face.offset - offset) < 1e-6)
          .reduce((total, face) => total + face.area, 0)

      // The lid is gone: all that is left in its plane is the wall's 36mm² rim,
      // not the 100mm² face that was opened.
      expect(upwardAreaAt(10)).toBeCloseTo(36, 6)
      // And the cavity's floor is exposed one wall-thickness up.
      expect(upwardAreaAt(1)).toBeCloseTo(64, 6)
    })

    it('refuses a shell whose faces are not on the solid rather than hollowing it plain', async () => {
      const shape = await box(10, 10)

      await expect(
        kernel.shell(shape, { thickness: 1, openFaceIds: ['face-nowhere'] }),
      ).rejects.toThrow(/face-nowhere/)
    })

    it('rounds an edge named the way a viewport pick names one', async () => {
      const shape = await box(10, 10)
      // Same pairing on the edge side. A picked edge used to reach the kernel
      // under a name it had never issued and fail as "this body has no edge".
      const before = meshTopology(await kernel.triangulate(shape))
      expect(before.edges).toHaveLength(12)
      const picked = before.edges[0] as { id: string; vertexIds: readonly [string, string] }
      const cornerOf = (id: string): Vec3 =>
        (before.vertices.find((vertex) => vertex.id === id) as { position: Vec3 }).position

      const rounded = await kernel.fillet(shape, { radius: 1, edgeIds: [picked.id] })

      // One rounded edge of a 10mm box takes a fixed bite out of it: the square
      // corner less the blend that replaces it, over the 10mm run. The blend is
      // faceted — a right angle comes back as four chords — so the fan those
      // chords span, not the quarter-disc they approximate, is what is left.
      const blend = 4 * 0.5 * Math.sin(Math.PI / 8)
      expect((await kernel.massProperties(rounded)).volume).toBeCloseTo(1000 - (1 - blend) * 10, 6)

      // And it is *that* edge: rounding it takes its two corners off the solid
      // and leaves the box's other six standing. A pairing that reached some
      // other edge would round the volume away from the wrong place.
      const after = meshTopology(await kernel.triangulate(rounded)).vertices
      const survives = (corner: Vec3): boolean =>
        after.some(
          (vertex) =>
            Math.abs(vertex.position.x - corner.x) < 1e-6 &&
            Math.abs(vertex.position.y - corner.y) < 1e-6 &&
            Math.abs(vertex.position.z - corner.z) < 1e-6,
        )

      expect(survives(cornerOf(picked.vertexIds[0]))).toBe(false)
      expect(survives(cornerOf(picked.vertexIds[1]))).toBe(false)
      expect(before.vertices.filter((vertex) => survives(vertex.position))).toHaveLength(6)
    })

    it('refuses an edge it cannot pair rather than rounding a different one', async () => {
      const shape = await box(10, 10)

      await expect(
        kernel.fillet(shape, { radius: 1, edgeIds: ['edge-nowhere'] }),
      ).rejects.toThrow(/edge-nowhere/)
    })

    it('reports each face under the id the topology names it by', async () => {
      const shape = await box(10, 5)
      const { faceIds } = await kernel.topology(shape)
      const faces = await kernel.faceInfo(shape)

      expect(faces.map((face) => face.id)).toEqual([...faceIds])
      expect(faces).toHaveLength(6)
      expect(faces.every((face) => face.kind === 'plane')).toBe(true)

      const top = faces.find((face) => face.normal.z > 0.99)
      expect(top?.area).toBeCloseTo(100, 6)
      expect(top?.centroid).toEqual({ x: 5, y: 5, z: 5 })
    })

    it('reports each edge under the id the topology names it by', async () => {
      const shape = await box(10, 5)
      const { edgeIds } = await kernel.topology(shape)
      const edges = await kernel.edgeInfo(shape)

      expect(edges.map((edge) => edge.id)).toEqual([...edgeIds])
      expect(edges).toHaveLength(12)
      expect(edges.every((edge) => edge.kind === 'line')).toBe(true)

      const lengths = edges.map((edge) => edge.length).sort((a, b) => a - b)
      expect(lengths).toEqual([5, 5, 5, 5, 10, 10, 10, 10, 10, 10, 10, 10])
    })

    it('reports which operation failed and why', async () => {
      const shape = await box(10, 10)
      // The kernel has no corner patch, so two edges that meet are refused.
      const failure = await kernel.fillet(shape, { radius: 1 }).catch((cause: unknown) => cause)

      expect(failure).toBeInstanceOf(KernelError)
      expect((failure as KernelError).operation).toBe('fillet')
      expect((failure as KernelError).message).toContain('corner')
    })
  })

  describe('tessellation', () => {
    it('produces parallel position, normal and index arrays', async () => {
      const mesh = await kernel.triangulate(await box(10, 5))

      expect(mesh.indices).toHaveLength(36)
      expect(mesh.normals).toHaveLength(mesh.positions.length)
      expect(volumeOf(mesh)).toBeCloseTo(500, 6)
    })

    it('refines when asked for a finer quality', async () => {
      const shape = await kernel.revolve({
        profile: square(2),
        axis: { origin: { x: -5, y: 0 }, direction: { x: 0, y: 1 } },
        angle: 360,
      })

      const coarse = await kernel.triangulate(shape, { linearDeflection: 1 })
      const fine = await kernel.triangulate(shape, { linearDeflection: 0.001 })
      expect(fine.indices.length).toBeGreaterThan(coarse.indices.length)
    })

    it('simplifies a mesh without growing it', async () => {
      const mesh = await kernel.triangulate(await box(10, 5))
      const reduced = await kernel.simplify(mesh, 0.5)
      expect(reduced.indices.length).toBeLessThanOrEqual(mesh.indices.length)
    })
  })

  describe('operations the Rust kernel has not got', () => {
    it('drills a hole through the stub and comes back as a body', async () => {
      const shape = await kernel.createBox({ width: 20, height: 20, depth: 20 })
      const drilled = await kernel.hole(shape, {
        center: { x: 0, y: 0, z: 15 },
        diameter: 4,
        depth: 30,
      })

      // Back on the Rust side: the result answers a B-Rep question again.
      expect((await kernel.massProperties(drilled)).volume).toBeLessThan(8000)
    })

    it('moves a copy without disturbing the original', async () => {
      const shape = await kernel.createBox({ width: 2, height: 2, depth: 2 })
      const moved = await kernel.transform(shape, { translate: { x: 10, y: 0, z: 0 } })

      expect((await kernel.boundingBox(moved)).min.x).toBeCloseTo(9, 6)
      expect((await kernel.boundingBox(shape)).min.x).toBeCloseTo(-1, 6)
    })

    it('splits a shape into pieces that are each usable', async () => {
      const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })
      const pieces = await kernel.split(shape, { plane: WORLD_XY })

      expect(pieces.length).toBeGreaterThan(1)
      for (const piece of pieces) {
        expect((await kernel.massProperties(piece)).volume).toBeGreaterThan(0)
      }
    })

    it('mirrors a shape across a plane', async () => {
      const shape = await kernel.createBox({
        width: 2,
        height: 2,
        depth: 2,
        center: { x: 5, y: 0, z: 0 },
      })
      const mirrored = await kernel.mirror(shape, {
        origin: { x: 0, y: 0, z: 0 },
        xAxis: { x: 0, y: 1, z: 0 },
        yAxis: { x: 0, y: 0, z: 1 },
      })
      expect((await kernel.boundingBox(mirrored)).max.x).toBeCloseTo(-4, 6)
    })

    it('copies a shape independently of the original', async () => {
      const shape = await box(10, 10)
      const copy = await kernel.copy(shape)

      expect(copy.id).not.toBe(shape.id)
      kernel.dispose(shape)
      expect((await kernel.massProperties(copy)).volume).toBeCloseTo(1000, 6)
    })
  })

  describe('shape handles', () => {
    it('refuses a handle it does not know', async () => {
      await expect(kernel.boundingBox({ id: 'nonsense' })).rejects.toThrow(/Unknown shape/)
    })

    it('forgets a shape once it is disposed', async () => {
      const shape = await box(10, 10)
      kernel.dispose(shape)
      kernel.dispose(shape) // Disposing twice is not an error.
      await expect(kernel.topology(shape)).rejects.toThrow(/Unknown shape/)
    })
  })
})

describe('rustError', () => {
  it('unpacks the operation and message the kernel reported', () => {
    const error = rustError('{"operation":"extrude","message":"no profile"}', 'triangulate')
    expect(error.operation).toBe('extrude')
    expect(error.message).toBe('no profile')
  })

  it('reports a plain string under the operation that was attempted', () => {
    expect(rustError('unreachable executed', 'fillet')).toMatchObject({
      operation: 'fillet',
      message: 'unreachable executed',
    })
  })

  it('reports a thrown Error under the operation that was attempted', () => {
    expect(rustError(new Error('out of memory'), 'shell')).toMatchObject({
      operation: 'shell',
      message: 'out of memory',
    })
  })

  it('passes a kernel error straight through', () => {
    const original = new KernelError('already wrapped', 'loft')
    expect(rustError(original, 'sweep')).toBe(original)
  })
})
