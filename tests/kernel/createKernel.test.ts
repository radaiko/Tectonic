import { describe, expect, it, vi } from 'vitest'
import { createKernel } from '../../src/kernel/createKernel'
import type { IKernel } from '../../src/kernel/IKernel'
import { KernelError } from '../../src/kernel/IKernel'
import { StubKernel } from '../../src/kernel/StubKernel'

/**
 * A backend stand-in: a real stub kernel wearing another backend's name, so the
 * cases below can say which one was settled on. Only `name` and `init` are ever
 * reached here — what any of them can model is not what is under test.
 */
class NamedKernel extends StubKernel {
  override readonly name: string
  readonly #init: () => Promise<void>

  constructor(name: string, init: () => Promise<void> = async () => {}) {
    super()
    this.name = name
    this.#init = init
  }

  override async init(): Promise<void> {
    await this.#init()
  }
}

function fakeKernel(name: string, init?: () => Promise<void>): IKernel {
  return init ? new NamedKernel(name, init) : new NamedKernel(name)
}

/** A module seam whose `create` resolves to the given backend. */
function seam(kernel: IKernel): { create(): Promise<IKernel> } {
  return { create: async () => kernel }
}

/** A module seam whose import itself fails, the way a missing binary does. */
function brokenSeam(message: string): () => Promise<never> {
  return () => Promise.reject(new Error(message))
}

describe('createKernel', () => {
  it('prefers the Rust backend when it loads', async () => {
    const rust = fakeKernel('tectonic-rust')

    const kernel = await createKernel({
      importRustKernel: async () => seam(rust),
      importKernel: async () => seam(fakeKernel('opencascade')),
    })

    expect(kernel.name).toBe('tectonic-rust')
  })

  it('initialises the backend it settles on', async () => {
    const init = vi.fn(async () => {})

    const kernel = await createKernel({ importRustKernel: async () => seam(fakeKernel('r', init)) })

    expect(kernel.name).toBe('r')
    expect(init).toHaveBeenCalledOnce()
  })

  it('falls through to the next backend and reports why', async () => {
    const reasons: string[] = []

    const kernel = await createKernel({
      importRustKernel: brokenSeam('no wasm here'),
      importKernel: async () => seam(fakeKernel('opencascade')),
      onFallback: (reason) => reasons.push(reason),
    })

    expect(kernel.name).toBe('opencascade')
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toMatch(/Rust kernel could not be loaded: no wasm here/)
  })

  it('counts a backend that loads but cannot initialise as a failure', async () => {
    const reasons: string[] = []
    const rust = fakeKernel('tectonic-rust', () => Promise.reject(new Error('no gpu')))

    const kernel = await createKernel({
      importRustKernel: async () => seam(rust),
      importKernel: async () => seam(fakeKernel('opencascade')),
      onFallback: (reason) => reasons.push(reason),
    })

    expect(kernel.name).toBe('opencascade')
    expect(reasons[0]).toMatch(/no gpu/)
  })

  it('ends on the stub when the default order runs out, having said so', async () => {
    const reasons: string[] = []

    const kernel = await createKernel({
      importRustKernel: brokenSeam('no rust'),
      importKernel: brokenSeam('no occt'),
      onFallback: (reason) => reasons.push(reason),
    })

    // The app still gets something to model with — but it was told twice that
    // this is not the backend it asked for, which is the whole contract.
    expect(kernel.name).toBe('stub')
    expect(reasons).toHaveLength(2)
  })

  it('refuses rather than substituting the stub for a caller that ruled it out', async () => {
    // Narrowing the list is how a caller says mesh geometry will not do. Handing
    // back a StubKernel anyway would be exactly the silent substitution the
    // backends option exists to prevent.
    await expect(
      createKernel({
        backends: ['rust', 'opencascade'],
        importRustKernel: brokenSeam('no rust'),
        importKernel: brokenSeam('no occt'),
      }),
    ).rejects.toThrow(KernelError)
  })

  it('names every backend it tried in the failure', async () => {
    let failure: KernelError | null = null
    try {
      await createKernel({ backends: ['rust'], importRustKernel: brokenSeam('binary missing') })
    } catch (cause) {
      failure = cause as KernelError
    }

    expect(failure?.operation).toBe('createKernel')
    expect(failure?.message).toMatch(/binary missing/)
  })

  it('takes the stub straight away when it is asked for first', async () => {
    const importRustKernel = vi.fn(brokenSeam('never reached'))

    const kernel = await createKernel({ backends: ['stub'], importRustKernel })

    expect(kernel.name).toBe('stub')
    expect(importRustKernel).not.toHaveBeenCalled()
  })

  it('refuses an empty backend list rather than guessing', async () => {
    await expect(createKernel({ backends: [] })).rejects.toThrow(/No geometry kernel was requested/)
  })
})
