import type { IKernel } from './IKernel'
import { StubKernel } from './StubKernel'
import type { WasmLoadOptions } from './wasm/WasmLoader'

export interface CreateKernelOptions extends WasmLoadOptions {
  /**
   * Called when OpenCascade could not be brought up and the stub is standing in.
   * The app shows this to the user; without a handler the reason is logged.
   */
  readonly onFallback?: (reason: string, cause: unknown) => void
  /** Seam for tests: stands in for the dynamic import of the WASM kernel. */
  readonly importKernel?: () => Promise<{ create(options: WasmLoadOptions): Promise<IKernel> }>
}

/**
 * The kernel the app should model with: OpenCascade when its WASM binary loads,
 * and the three.js stub when it does not.
 *
 * The import is dynamic so neither OpenCascade's 22 MB binary nor its glue code
 * reaches the main bundle — the browser fetches them as a separate chunk, and a
 * build that never calls this function never pays for them.
 */
export async function createKernel(options: CreateKernelOptions = {}): Promise<IKernel> {
  const { onFallback, importKernel, ...load } = options
  try {
    const module = importKernel
      ? await importKernel()
      : (await import('./OpenCascadeKernel')).OpenCascadeKernel
    const kernel = await module.create(load)
    await kernel.init()
    return kernel
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    if (onFallback) onFallback(reason, cause)
    else console.warn('OpenCascade WASM failed to load, falling back to StubKernel', cause)
    return new StubKernel()
  }
}
