import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useKernel } from '../../src/app/useKernel'
import type { KernelSession } from '../../src/app/useKernel'
import type { CreateKernelOptions } from '../../src/kernel/createKernel'
import type { IKernel } from '../../src/kernel/IKernel'
import { StubKernel } from '../../src/kernel/StubKernel'

/** A backend that reports another name, so a resolution can be pinned down. */
class NamedKernel extends StubKernel {
  override readonly name: string

  constructor(name: string) {
    super()
    this.name = name
  }
}

/** Renders the hook and puts its whole state where a query can read it. */
function Probe({
  kernel,
  options,
}: {
  readonly kernel?: IKernel
  readonly options?: CreateKernelOptions
}): React.ReactElement {
  const session: KernelSession = useKernel(kernel, options)
  return (
    <dl data-testid="session">
      <dd data-testid="status">{session.status}</dd>
      <dd data-testid="backend">{session.backend ?? '—'}</dd>
      <dd data-testid="error">{session.error ?? '—'}</dd>
      <dd data-testid="fallbacks">{session.fallbacks.join(' | ') || '—'}</dd>
      <dd data-testid="missing">{session.missing.join(',') || '—'}</dd>
    </dl>
  )
}

const read = (id: string): string => screen.getByTestId(id).textContent ?? ''

describe('useKernel', () => {
  it('takes an injected kernel as ready without loading anything', () => {
    render(<Probe kernel={new NamedKernel('injected')} />)

    expect(read('status')).toBe('ready')
    expect(read('backend')).toBe('injected')
    expect(read('fallbacks')).toBe('—')
  })

  it('reports what an injected backend cannot do', () => {
    render(<Probe kernel={new StubKernel()} />)

    // The stub is a mesh engine: naming the gaps is what lets the app say so
    // instead of passing its results off as B-Rep geometry.
    expect(read('missing')).toContain('fillet')
    expect(read('missing')).toContain('chamfer')
  })

  it('starts out loading when it has to resolve a backend itself', () => {
    render(<Probe options={{ backends: ['stub'] }} />)

    // Resolution is asynchronous even for the stub, and the shell holds a
    // document back until it settles rather than modelling against nothing.
    expect(read('status')).toBe('loading')
    expect(read('backend')).toBe('—')
  })

  it('settles on the backend it resolved', async () => {
    render(<Probe options={{ backends: ['stub'] }} />)

    await waitFor(() => expect(read('status')).toBe('ready'))
    expect(read('backend')).toBe('stub')
  })

  it('keeps the reason each backend it gave up on could not be loaded', async () => {
    render(
      <Probe
        options={{
          importRustKernel: () => Promise.reject(new Error('no wasm')),
          importKernel: () => Promise.reject(new Error('no occt')),
        }}
      />,
    )

    await waitFor(() => expect(read('status')).toBe('ready'))
    expect(read('backend')).toBe('stub')
    expect(read('fallbacks')).toMatch(/no wasm/)
    expect(read('fallbacks')).toMatch(/no occt/)
  })

  it('reports a failure when nothing the caller allows will load', async () => {
    render(
      <Probe
        options={{
          backends: ['rust'],
          importRustKernel: () => Promise.reject(new Error('binary missing')),
        }}
      />,
    )

    await waitFor(() => expect(read('status')).toBe('failed'))
    expect(read('backend')).toBe('—')
    expect(read('error')).toMatch(/binary missing/)
  })

  it('reports a backend that loads but cannot start as a failure, not as ready', async () => {
    const kernel = new NamedKernel('half-alive')
    vi.spyOn(kernel, 'init').mockRejectedValue(new Error('device lost'))

    render(
      <Probe
        options={{
          backends: ['rust'],
          importRustKernel: async () => ({ create: async () => kernel }),
        }}
      />,
    )

    await waitFor(() => expect(read('status')).toBe('failed'))
    expect(read('error')).toMatch(/device lost/)
  })
})
