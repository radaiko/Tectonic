import type { IKernel } from './IKernel'
import type { RustLoadOptions } from './rust/RustWasm'
import { StubKernel } from './StubKernel'
import type { WasmLoadOptions } from './wasm/WasmLoader'

/** A backend that can be asked for, in the order `createKernel` tries them. */
export type KernelBackend = 'rust' | 'opencascade' | 'stub'

/**
 * Options for {@link createKernel}, flattening both loaders' settings.
 *
 * Each loader's own `importModule` seam is renamed on the way in: they stand in
 * for different modules — occt-wasm and the generated Rust package — so a single
 * shared name could only ever reach the wrong loader.
 */
export interface CreateKernelOptions
  extends Omit<WasmLoadOptions, 'importModule'>,
    Omit<RustLoadOptions, 'importModule'> {
  /**
   * Which backends to try, best first. Defaults to all three; narrowing it is
   * how a caller pins the backend — tests do, and so does a user who wants the
   * stub's speed over the kernel's accuracy.
   */
  readonly backends?: readonly KernelBackend[]
  /**
   * Called for each backend that could not be brought up, with the one that
   * ended up standing in. The app shows this to the user; without a handler the
   * reason is logged.
   */
  readonly onFallback?: (reason: string, cause: unknown) => void
  /** Seam for tests: stands in for the dynamic import of the occt-wasm module. */
  readonly importOcctModule?: WasmLoadOptions['importModule']
  /** Seam for tests: stands in for the dynamic import of the generated Rust module. */
  readonly importRustModule?: RustLoadOptions['importModule']
  /** Seam for tests: stands in for the dynamic import of the OpenCascade kernel. */
  readonly importKernel?: () => Promise<{ create(options: WasmLoadOptions): Promise<IKernel> }>
  /** Seam for tests: stands in for the dynamic import of the Rust kernel. */
  readonly importRustKernel?: () => Promise<{ create(options: RustLoadOptions): Promise<IKernel> }>
}

/** What is left of {@link CreateKernelOptions} once the control fields are taken out. */
type LoadOptions = Omit<
  CreateKernelOptions,
  'backends' | 'onFallback' | 'importKernel' | 'importRustKernel'
>

/**
 * The two kernel-import seams as destructuring leaves them: always present, and
 * undefined when the caller left them out.
 */
interface KernelSeams {
  readonly importKernel: CreateKernelOptions['importKernel']
  readonly importRustKernel: CreateKernelOptions['importRustKernel']
}

const DEFAULT_ORDER: readonly KernelBackend[] = ['rust', 'opencascade', 'stub']

/**
 * The kernel the app should model with.
 *
 * Backends are tried best first and the first one that comes up wins: the Rust
 * B-Rep kernel, then OpenCascade, then the three.js stub, which needs no binary
 * and so always succeeds. Every attempt is separately guarded, so a machine that
 * cannot run one of them still gets the next rather than the last.
 *
 * The imports are dynamic so neither binary reaches the main bundle — the
 * browser fetches each as its own chunk, and a build that never calls this
 * function never pays for either.
 */
export async function createKernel(options: CreateKernelOptions = {}): Promise<IKernel> {
  const { backends = DEFAULT_ORDER, onFallback, importKernel, importRustKernel, ...load } = options

  for (const backend of backends) {
    if (backend === 'stub') return new StubKernel()
    try {
      const kernel = await start(backend, load, { importKernel, importRustKernel })
      await kernel.init()
      return kernel
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause)
      if (onFallback) onFallback(`${LABELS[backend]} could not be loaded: ${reason}`, cause)
      else console.warn(`${LABELS[backend]} failed to load, trying the next backend`, cause)
    }
  }

  return new StubKernel()
}

const LABELS: Record<KernelBackend, string> = {
  rust: 'The Rust kernel',
  opencascade: 'OpenCascade',
  stub: 'The stub kernel',
}

async function start(
  backend: Exclude<KernelBackend, 'stub'>,
  load: LoadOptions,
  seams: KernelSeams,
): Promise<IKernel> {
  if (backend === 'rust') {
    const module = seams.importRustKernel
      ? await seams.importRustKernel()
      : (await import('./RustKernel')).RustKernel
    return module.create(rustOptions(load))
  }

  const module = seams.importKernel
    ? await seams.importKernel()
    : (await import('./OpenCascadeKernel')).OpenCascadeKernel
  return module.create(occtOptions(load))
}

/**
 * The subsets each loader understands.
 *
 * Handing the whole set to both would be quietly wrong: only one backend's
 * fields mean anything to a given loader, and the two import seams point at
 * different modules. Absent fields are left off rather than passed as
 * `undefined`, which `exactOptionalPropertyTypes` treats as a value.
 */
function occtOptions(load: LoadOptions): WasmLoadOptions {
  const { onProgress, wasmUrl, importOcctModule } = load
  return {
    ...(onProgress !== undefined && { onProgress }),
    ...(wasmUrl !== undefined && { wasmUrl }),
    ...(importOcctModule !== undefined && { importModule: importOcctModule }),
  }
}

function rustOptions(load: LoadOptions): RustLoadOptions {
  const { wasmBinary, importRustModule } = load
  return {
    ...(wasmBinary !== undefined && { wasmBinary }),
    ...(importRustModule !== undefined && { importModule: importRustModule }),
  }
}
