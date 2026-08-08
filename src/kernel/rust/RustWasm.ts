import { KernelError } from '../IKernel'

/**
 * The Rust kernel's exports, as they cross the WASM boundary.
 *
 * Every call takes and returns JSON strings: a *body* is the kernel's own
 * opaque serialization, passed straight back into the next operation, and a
 * *mesh* is `{ positions, normals, indices }` — the same shape as the domain's
 * `MeshData`, so tessellation results need no conversion on this side.
 *
 * Declared here rather than imported from the generated `.d.ts` so that this
 * module states what it depends on: the binding surface is the contract between
 * the two languages, and a change to it should fail here rather than somewhere
 * downstream.
 */
export interface RustWasmExports {
  version(): string
  name(): string

  extrude(params: string): string
  revolve(params: string): string
  sweep(params: string): string
  loft(params: string): string
  bodyFromMesh(mesh: string): string

  booleanUnion(a: string, b: string): string
  booleanSubtract(target: string, tool: string): string
  booleanIntersect(a: string, b: string): string

  fillet(body: string, params: string): string
  chamfer(body: string, params: string): string
  shell(body: string, params: string): string

  triangulate(body: string, params?: string | null): string
  simplify(mesh: string, ratio: number): string

  massProperties(body: string): string
  boundingBox(body: string): string
  topology(body: string): string
  /** Centroid, area, normal and surface kind per face, under `topology`'s ids. */
  faceInfo(body: string): string
  /** Midpoint, length and curve kind per edge, under `topology`'s ids. */
  edgeInfo(body: string): string
  isSolid(body: string): boolean
}

/** What wasm-pack's `--target web` output looks like: exports plus an init. */
export interface RustWasmModule extends RustWasmExports {
  default(init?: { module_or_path: RustWasmInput }): Promise<unknown>
}

/** What the generated init accepts in place of fetching the binary itself. */
export type RustWasmInput = BufferSource | WebAssembly.Module | Response | URL | string

export interface RustLoadOptions {
  /**
   * The compiled binary, or where to find it. Left out, the module fetches the
   * `.wasm` sitting beside it — which is what a browser wants and what Node
   * cannot do, so tests pass the bytes in.
   */
  readonly wasmBinary?: RustWasmInput
  /** Seam for tests: stands in for the dynamic import of the generated module. */
  readonly importModule?: () => Promise<RustWasmModule>
}

/**
 * Where the generated package lives. It is a build product of
 * `wasm-pack build --target web` in `kernel/tectonic-wasm`, checked in so that a
 * clone without a Rust toolchain still type-checks, builds and tests.
 */
const importGenerated = (): Promise<RustWasmModule> =>
  import('../../../kernel/tectonic-wasm/pkg/tectonic_wasm.js') as Promise<RustWasmModule>

let cached: RustWasmExports | null = null
let pending: Promise<RustWasmExports> | null = null

/**
 * Loads the Rust kernel once and hands the same exports to every later caller.
 *
 * A failed attempt is not cached: the binary may simply not have arrived yet, so
 * the next call gets a fresh try — the same policy the OpenCascade loader
 * follows, for the same reason.
 */
export function loadRustKernel(options: RustLoadOptions = {}): Promise<RustWasmExports> {
  if (cached) return Promise.resolve(cached)

  if (!pending) {
    pending = instantiate(options).then(
      (exports) => {
        cached = exports
        pending = null
        return exports
      },
      (cause: unknown) => {
        pending = null
        throw cause
      },
    )
  }
  return pending
}

/** The loaded kernel, or null while it is absent. Never triggers a load. */
export function loadedRustKernel(): RustWasmExports | null {
  return cached
}

/**
 * Drops the loaded module so the next load starts over. Tests use this to keep
 * one case's instance out of the next one's way.
 */
export function resetRustKernel(): void {
  cached = null
  pending = null
}

/**
 * Turns whatever the boundary threw into a {@link KernelError}.
 *
 * The Rust side throws a JSON string carrying the operation that failed and why,
 * so a feature can be blamed for its own failure. Anything else — a trap, an
 * out-of-memory, a bug in the glue — arrives as some other value and is reported
 * under the operation the caller was attempting.
 */
export function rustError(cause: unknown, operation: string): KernelError {
  if (cause instanceof KernelError) return cause

  if (typeof cause === 'string') {
    try {
      const parsed: unknown = JSON.parse(cause)
      if (isReported(parsed)) {
        return new KernelError(parsed.message, parsed.operation || operation)
      }
    } catch {
      // Not the kernel's own error shape; fall through and report it as text.
    }
    return new KernelError(cause, operation)
  }

  return new KernelError(cause instanceof Error ? cause.message : String(cause), operation)
}

/* -------------------------------------------------------------------------- */

async function instantiate(options: RustLoadOptions): Promise<RustWasmExports> {
  const module = await (options.importModule ?? importGenerated)()
  // The single-object form is the current one; passing the binary bare is
  // deprecated and warns on every load.
  await module.default(
    options.wasmBinary === undefined ? undefined : { module_or_path: options.wasmBinary },
  )

  const missing = REQUIRED.filter((entry) => typeof module[entry] !== 'function')
  if (missing.length > 0) {
    throw new KernelError(
      `The Rust kernel module is missing ${missing.join(', ')}`,
      'loadRustKernel',
    )
  }
  return module
}

function isReported(value: unknown): value is { operation: string; message: string } {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { operation?: unknown; message?: unknown }
  return typeof candidate.operation === 'string' && typeof candidate.message === 'string'
}

/**
 * The exports the kernel cannot run without. Checking them at load time turns a
 * stale `pkg/` — built before an operation was added — into one clear failure
 * that falls back cleanly, rather than a `TypeError` mid-model.
 */
const REQUIRED = [
  'extrude',
  'revolve',
  'sweep',
  'loft',
  'bodyFromMesh',
  'booleanUnion',
  'booleanSubtract',
  'booleanIntersect',
  'fillet',
  'chamfer',
  'shell',
  'triangulate',
  'simplify',
  'massProperties',
  'boundingBox',
  'topology',
  'faceInfo',
  'edgeInfo',
  'isSolid',
] as const satisfies readonly (keyof RustWasmExports)[]
