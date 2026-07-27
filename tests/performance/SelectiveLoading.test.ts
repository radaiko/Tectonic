import { describe, expect, it, vi } from 'vitest'
import type { MeshData } from '../../src/domain/MeshData'
import { triangleCount } from '../../src/domain/MeshData'
import type { LoadRecord } from '../../src/performance/SelectiveLoading'
import { DEFAULT_MAX_CONCURRENT, LoadError, SelectiveLoader } from '../../src/performance/SelectiveLoading'
import { boxMesh, triangleMesh } from '../helpers/meshes'

/** A promise the test resolves by hand, so a load can be held mid-flight. */
function deferred(): {
  promise: Promise<MeshData>
  resolve: (mesh: MeshData) => void
  reject: (error: Error) => void
} {
  let resolve!: (mesh: MeshData) => void
  let reject!: (error: Error) => void
  const promise = new Promise<MeshData>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A loader whose geometry is a box, sized so each component has a known cost. */
function boxLoader(options: { triangleBudget?: number; maxConcurrent?: number } = {}) {
  const fetch = vi.fn(async (_id: string) => boxMesh())
  return { fetch, loader: new SelectiveLoader({ fetch, ...options }) }
}

describe('SelectiveLoader.load', () => {
  it('fetches geometry the first time it is asked for', async () => {
    const { fetch, loader } = boxLoader()

    const mesh = await loader.load('housing')

    expect(triangleCount(mesh)).toBe(triangleCount(boxMesh()))
    expect(fetch).toHaveBeenCalledExactlyOnceWith('housing')
  })

  it('serves a second request from what is already resident', async () => {
    const { fetch, loader } = boxLoader()

    await loader.load('housing')
    await loader.load('housing')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('joins a request already in flight rather than starting a second', async () => {
    const gate = deferred()
    const fetch = vi.fn(async (_id: string) => gate.promise)
    const loader = new SelectiveLoader({ fetch })

    const first = loader.load('housing')
    const second = loader.load('housing')
    expect(loader.state('housing')).toBe('loading')

    gate.resolve(triangleMesh())
    expect(await first).toBe(await second)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reports a component as unloaded before it is asked for', () => {
    const { loader } = boxLoader()

    expect(loader.state('housing')).toBe('unloaded')
    expect(loader.peek('housing')).toBeNull()
  })

  it('reports it as loaded afterwards', async () => {
    const { loader } = boxLoader()

    await loader.load('housing')

    expect(loader.state('housing')).toBe('loaded')
    expect(loader.peek('housing')).not.toBeNull()
  })
})

describe('SelectiveLoader failures', () => {
  it('raises a LoadError naming the component', async () => {
    const fetch = vi.fn(async (_id: string): Promise<MeshData> => {
      throw new Error('kernel said no')
    })
    const loader = new SelectiveLoader({ fetch })

    await expect(loader.load('housing')).rejects.toThrow(LoadError)
    await expect(loader.load('housing')).rejects.toThrow(/housing/)
  })

  it('records why it failed', async () => {
    const fetch = vi.fn(async (_id: string): Promise<MeshData> => {
      throw new Error('kernel said no')
    })
    const loader = new SelectiveLoader({ fetch })

    await expect(loader.load('housing')).rejects.toThrow(LoadError)

    expect(loader.record('housing')).toMatchObject({
      id: 'housing',
      state: 'failed',
      error: 'kernel said no',
    })
  })

  it('retries a failed component when asked again', async () => {
    let attempt = 0
    const fetch = vi.fn(async (_id: string): Promise<MeshData> => {
      attempt += 1
      if (attempt === 1) throw new Error('transient')
      return triangleMesh()
    })
    const loader = new SelectiveLoader({ fetch })

    await expect(loader.load('housing')).rejects.toThrow(LoadError)
    await expect(loader.load('housing')).resolves.toBeDefined()
    expect(loader.state('housing')).toBe('loaded')
  })

  it('stringifies a rejection that was not an Error', async () => {
    const fetch = vi.fn(async (_id: string): Promise<MeshData> => {
      throw 'no kernel'
    })
    const loader = new SelectiveLoader({ fetch })

    await expect(loader.load('housing')).rejects.toThrow(/no kernel/)
    expect(loader.record('housing').error).toBe('no kernel')
  })

  it('releases the concurrency slot a failed load was holding', async () => {
    const fetch = vi.fn(async (id: string): Promise<MeshData> => {
      if (id === 'bad') throw new Error('nope')
      return triangleMesh()
    })
    const loader = new SelectiveLoader({ fetch, maxConcurrent: 1 })

    await expect(loader.load('bad')).rejects.toThrow(LoadError)
    await expect(loader.load('good')).resolves.toBeDefined()
    expect(loader.inFlight).toBe(0)
  })
})

describe('SelectiveLoader.unload', () => {
  it('drops resident geometry', async () => {
    const { loader } = boxLoader()
    await loader.load('housing')

    expect(loader.unload('housing')).toBe(true)
    expect(loader.state('housing')).toBe('unloaded')
    expect(loader.peek('housing')).toBeNull()
  })

  it('gives back the triangles it was holding', async () => {
    const { loader } = boxLoader()
    await loader.load('housing')

    loader.unload('housing')

    expect(loader.residentTriangles).toBe(0)
  })

  it('reports nothing to drop for a component that was never loaded', () => {
    const { loader } = boxLoader()

    expect(loader.unload('housing')).toBe(false)
  })

  it('clears everything at once', async () => {
    const { loader } = boxLoader()
    await loader.loadAll(['a', 'b', 'c'])

    loader.clear()

    expect(loader.loadedIds).toEqual([])
    expect(loader.residentTriangles).toBe(0)
  })
})

describe('SelectiveLoader eviction', () => {
  it('stays inside the triangle budget', async () => {
    const perBox = triangleCount(boxMesh())
    const { loader } = boxLoader({ triangleBudget: perBox * 2 })

    await loader.load('a')
    await loader.load('b')
    await loader.load('c')

    expect(loader.residentTriangles).toBeLessThanOrEqual(perBox * 2)
  })

  it('evicts the least recently used component', async () => {
    const perBox = triangleCount(boxMesh())
    const { loader } = boxLoader({ triangleBudget: perBox * 2 })

    await loader.load('a')
    await loader.load('b')
    await loader.load('a') // 'a' is now the more recently used of the two
    await loader.load('c')

    expect(loader.state('b')).toBe('unloaded')
    expect(loader.state('a')).toBe('loaded')
    expect(loader.state('c')).toBe('loaded')
  })

  it('never evicts the component it was just asked for', async () => {
    const { loader } = boxLoader({ triangleBudget: 1 })

    await loader.load('a')
    await loader.load('b')

    expect(loader.state('b')).toBe('loaded')
  })

  it('keeps everything when no budget is set', async () => {
    const { loader } = boxLoader()

    await loader.loadAll(['a', 'b', 'c', 'd'])

    expect(loader.loadedIds).toHaveLength(4)
  })
})

describe('SelectiveLoader concurrency', () => {
  it('runs no more fetches at once than allowed', async () => {
    let peak = 0
    let live = 0
    const fetch = vi.fn(async (_id: string): Promise<MeshData> => {
      live += 1
      peak = Math.max(peak, live)
      await Promise.resolve()
      live -= 1
      return triangleMesh()
    })
    const loader = new SelectiveLoader({ fetch, maxConcurrent: 2 })

    await loader.loadAll(['a', 'b', 'c', 'd', 'e'])

    expect(peak).toBeLessThanOrEqual(2)
    expect(loader.loadedIds).toHaveLength(5)
  })

  it('queues what does not fit and drains the queue', async () => {
    const gate = deferred()
    const fetch = vi.fn(async (_id: string) => gate.promise)
    const loader = new SelectiveLoader({ fetch, maxConcurrent: 1 })

    const all = loader.loadAll(['a', 'b', 'c'])
    await Promise.resolve()
    expect(loader.inFlight).toBe(1)
    expect(loader.queued).toBeGreaterThan(0)

    gate.resolve(triangleMesh())
    await all

    expect(loader.queued).toBe(0)
    expect(loader.inFlight).toBe(0)
  })

  it('treats a non-positive limit as one at a time', async () => {
    const { loader } = boxLoader({ maxConcurrent: 0 })

    await loader.loadAll(['a', 'b'])

    expect(loader.loadedIds).toHaveLength(2)
  })

  it('defaults to the documented limit', () => {
    expect(DEFAULT_MAX_CONCURRENT).toBe(8)
  })
})

describe('SelectiveLoader.setVisible', () => {
  it('loads what is newly visible', async () => {
    const { loader } = boxLoader()

    await loader.setVisible(['a', 'b'])

    expect(loader.loadedIds.sort()).toEqual(['a', 'b'])
  })

  it('drops what has gone out of view', async () => {
    const { loader } = boxLoader()
    await loader.setVisible(['a', 'b'])

    await loader.setVisible(['b', 'c'])

    expect(loader.loadedIds.sort()).toEqual(['b', 'c'])
    expect(loader.state('a')).toBe('unloaded')
  })

  it('does not refetch what was already resident', async () => {
    const { fetch, loader } = boxLoader()
    await loader.setVisible(['a', 'b'])
    fetch.mockClear()

    await loader.setVisible(['a', 'b'])

    expect(fetch).not.toHaveBeenCalled()
  })

  it('empties the scene when nothing is visible', async () => {
    const { loader } = boxLoader()
    await loader.setVisible(['a', 'b'])

    await loader.setVisible([])

    expect(loader.loadedIds).toEqual([])
  })
})

describe('SelectiveLoader.onStateChange', () => {
  it('announces the move through loading to loaded', async () => {
    const seen: LoadRecord[] = []
    const fetch = vi.fn(async (_id: string) => boxMesh())
    const loader = new SelectiveLoader({ fetch, onStateChange: (record) => seen.push(record) })

    await loader.load('housing')

    expect(seen.map((record) => record.state)).toEqual(['loading', 'loaded'])
  })

  it('reports the triangle count once the geometry is there', async () => {
    const seen: LoadRecord[] = []
    const fetch = vi.fn(async (_id: string) => boxMesh())
    const loader = new SelectiveLoader({ fetch, onStateChange: (record) => seen.push(record) })

    await loader.load('housing')

    expect(seen.at(-1)?.triangleCount).toBe(triangleCount(boxMesh()))
  })

  it('announces a failure', async () => {
    const seen: LoadRecord[] = []
    const fetch = vi.fn(async (_id: string): Promise<MeshData> => {
      throw new Error('nope')
    })
    const loader = new SelectiveLoader({ fetch, onStateChange: (record) => seen.push(record) })

    await expect(loader.load('housing')).rejects.toThrow(LoadError)

    expect(seen.at(-1)).toMatchObject({ state: 'failed', error: 'nope' })
  })

  it('announces an eviction', async () => {
    const seen: LoadRecord[] = []
    const fetch = vi.fn(async (_id: string) => boxMesh())
    const loader = new SelectiveLoader({
      fetch,
      triangleBudget: 1,
      onStateChange: (record) => seen.push(record),
    })

    await loader.load('a')
    await loader.load('b')

    expect(seen).toContainEqual(
      expect.objectContaining({ id: 'a', state: 'unloaded' }),
    )
  })
})

describe('SelectiveLoader.record', () => {
  it('describes a component that was never asked for', () => {
    const { loader } = boxLoader()

    expect(loader.record('ghost')).toEqual({
      id: 'ghost',
      state: 'unloaded',
      triangleCount: 0,
      error: null,
    })
  })
})
