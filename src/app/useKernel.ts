import { useEffect, useMemo, useState } from 'react'
import type { CreateKernelOptions } from '../kernel/createKernel'
import { createKernel } from '../kernel/createKernel'
import type { IKernel, KernelCapability } from '../kernel/IKernel'
import { missingCapabilities } from '../kernel/IKernel'

/**
 * Bringing a geometry backend up, as the shell sees it.
 *
 * Resolving a kernel is a load of a WASM binary that can fail, so it is a state
 * machine rather than a value: the app is either waiting on one, running on one,
 * or has been told why it has none. Nothing downstream models without a kernel,
 * so the shell holds off on opening a document until this settles.
 */
export type KernelStatus = 'loading' | 'ready' | 'failed'

export interface KernelSession {
  readonly status: KernelStatus
  /** The resolved backend. Null while loading, and after an outright failure. */
  readonly kernel: IKernel | null
  /** The backend's own name, e.g. `tectonic-rust`. Null until one is resolved. */
  readonly backend: string | null
  /** Why no backend could be brought up. Null unless `status` is `failed`. */
  readonly error: string | null
  /**
   * Backends that were tried and could not be loaded, best first. Non-empty
   * alongside a `ready` status is the interesting case: something is modelling,
   * but not the thing that was asked for.
   */
  readonly fallbacks: readonly string[]
  /** Operations the resolved backend cannot carry out. Empty for a full B-Rep one. */
  readonly missing: readonly KernelCapability[]
}

const NO_FALLBACKS: readonly string[] = []
const NO_CAPABILITIES: readonly KernelCapability[] = []

/**
 * The kernel the app models with.
 *
 * An injected kernel is used as-is and reported ready immediately — that is the
 * seam tests and embedders hold on to, and it keeps a rebuild deterministic
 * rather than dependent on which binaries a machine happens to have. Without
 * one, {@link createKernel} picks the best backend that will load, and every
 * backend it had to give up on is collected here so the app can say so instead
 * of quietly passing the stub off as a B-Rep kernel.
 */
export function useKernel(injected?: IKernel, options?: CreateKernelOptions): KernelSession {
  const [resolved, setResolved] = useState<IKernel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fallbacks, setFallbacks] = useState<readonly string[]>(NO_FALLBACKS)

  useEffect(() => {
    if (injected) return
    let current = true
    const reasons: string[] = []

    void createKernel({ ...options, onFallback: (reason) => reasons.push(reason) })
      .then(async (kernel) => {
        // `createKernel` already initialised whichever backend it brought up;
        // the stub it falls back to needs the call and answers immediately.
        await kernel.init()
        if (!current) return
        setFallbacks(reasons)
        setResolved(kernel)
      })
      .catch((cause: unknown) => {
        if (!current) return
        setFallbacks(reasons)
        setError(cause instanceof Error ? cause.message : String(cause))
      })

    return () => {
      current = false
    }
    // `options` is read once, as the effect starts a load. Re-running on a new
    // object identity would tear a live kernel down for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injected])

  const kernel = injected ?? resolved

  return useMemo(() => {
    if (injected) {
      return {
        status: 'ready' as const,
        kernel: injected,
        backend: injected.name,
        error: null,
        fallbacks: NO_FALLBACKS,
        missing: missingCapabilities(injected),
      }
    }
    if (error !== null) {
      return {
        status: 'failed' as const,
        kernel: null,
        backend: null,
        error,
        fallbacks,
        missing: NO_CAPABILITIES,
      }
    }
    if (!kernel) {
      return {
        status: 'loading' as const,
        kernel: null,
        backend: null,
        error: null,
        fallbacks,
        missing: NO_CAPABILITIES,
      }
    }
    return {
      status: 'ready' as const,
      kernel,
      backend: kernel.name,
      error: null,
      fallbacks,
      missing: missingCapabilities(kernel),
    }
  }, [error, fallbacks, injected, kernel])
}
