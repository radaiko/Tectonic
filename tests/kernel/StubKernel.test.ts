import { describe, expect, it } from 'vitest'
import { KernelError } from '../../src/kernel/IKernel'
import { StubKernel, toBufferGeometry, toMeshData } from '../../src/kernel/StubKernel'
import { triangleCount, vertexCount } from '../../src/domain/MeshData'

const SQUARE = {
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
}

describe('StubKernel', () => {
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
    const xs = centred.positions.filter((_, i) => i % 3 === 0)

    expect(Math.min(...xs)).toBeCloseTo(4)
    expect(Math.max(...xs)).toBeCloseTo(6)
  })

  it('rejects non-positive box dimensions', async () => {
    const kernel = new StubKernel()

    await expect(kernel.createBox({ width: 0, height: 1, depth: 1 })).rejects.toThrow(KernelError)
  })

  it('extrudes a closed profile into a solid', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({ profile: SQUARE, distance: 5 }),
    )

    expect(triangleCount(mesh)).toBeGreaterThan(0)
    const zs = mesh.positions.filter((_, i) => i % 3 === 2)
    expect(Math.max(...zs)).toBeCloseTo(5)
  })

  it('extrudes along a caller-supplied direction', async () => {
    const kernel = new StubKernel()

    const mesh = await kernel.triangulate(
      await kernel.extrude({ profile: SQUARE, distance: 5, direction: { x: 0, y: 1, z: 0 } }),
    )
    const ys = mesh.positions.filter((_, i) => i % 3 === 1)

    expect(Math.max(...ys)).toBeCloseTo(5)
  })

  it.each([
    ['too few points', { profile: { points: SQUARE.points.slice(0, 2) }, distance: 5 }],
    ['a non-positive distance', { profile: SQUARE, distance: 0 }],
    ['a zero-length direction', { profile: SQUARE, distance: 5, direction: { x: 0, y: 0, z: 0 } }],
  ])('rejects an extrude with %s', async (_label, params) => {
    await expect(new StubKernel().extrude(params)).rejects.toThrow(KernelError)
  })

  it.each(['booleanUnion', 'booleanSubtract', 'booleanIntersect'] as const)(
    'reports %s as unsupported until the WASM kernel lands',
    async (operation) => {
      const kernel = new StubKernel()
      const shape = await kernel.createBox({ width: 1, height: 1, depth: 1 })

      await expect(kernel[operation](shape, shape)).rejects.toThrow(KernelError)
    },
  )

  it('reports fillet and chamfer as unsupported', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 1, height: 1, depth: 1 })

    await expect(kernel.fillet(shape, { radius: 1 })).rejects.toThrow(/WASM kernel/)
    await expect(kernel.chamfer(shape, { distance: 1 })).rejects.toThrow(/WASM kernel/)
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
