import { describe, expect, it } from 'vitest'
import { createStarterDocument } from '../../src/app/starterDocument'
import { StubKernel } from '../../src/kernel/StubKernel'
import { triangleCount } from '../../src/domain/MeshData'
import { deserialize, serialize } from '../../src/io/FileService'

const NOW = '2026-07-26T12:00:00.000Z'

describe('createStarterDocument', () => {
  it('contains one part holding a kernel-generated box', async () => {
    const document = await createStarterDocument(new StubKernel(), { now: NOW })

    expect(document.parts).toHaveLength(1)
    expect(document.parts[0]?.bodies).toHaveLength(1)
    expect(triangleCount(document.parts[0]!.bodies[0]!.mesh)).toBe(12)
  })

  it('applies the supplied document options', async () => {
    const document = await createStarterDocument(new StubKernel(), {
      name: 'Starter',
      units: 'in',
      now: NOW,
    })

    expect(document.metadata).toEqual({
      name: 'Starter',
      created: NOW,
      modified: NOW,
      units: 'in',
    })
  })

  it('round-trips through the .tectonic format unchanged', async () => {
    const document = await createStarterDocument(new StubKernel(), { now: NOW })

    expect(deserialize(serialize(document))).toEqual(document)
  })

  it('releases the kernel shape it built', async () => {
    const kernel = new StubKernel()

    await createStarterDocument(kernel, { now: NOW })

    // The only shape created was disposed, so its handle is no longer known.
    await expect(kernel.triangulate({ id: 'stub-shape-0' })).rejects.toThrow(/Unknown shape/)
  })
})
