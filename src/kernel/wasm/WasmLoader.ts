import type { OcctKernel } from 'occt-wasm'
// Static, but type-only and asset-only: neither line pulls the 22 MB binary into
// the main bundle. The `?url` import makes Vite emit the .wasm as its own asset
// and hands back the URL to fetch it from.
import wasmAssetUrl from 'occt-wasm/dist/occt-wasm.wasm?url'

/** The occt-wasm module, as returned by the dynamic import. */
export type OcctModule = typeof import('occt-wasm')

/** Where a load has got to. Phases run in the order listed. */
export type KernelLoadPhase = 'idle' | 'module' | 'download' | 'compile' | 'ready' | 'failed'

export interface KernelLoadProgress {
  readonly phase: KernelLoadPhase
  /** Fraction of the whole load that is done, 0 to 1. */
  readonly ratio: number
  /** Short status line, suitable for showing to the user as-is. */
  readonly message: string
  readonly bytesLoaded?: number
  /** Zero when the server does not report a content length. */
  readonly bytesTotal?: number
}

export type KernelLoadListener = (progress: KernelLoadProgress) => void

export interface WasmLoadOptions {
  readonly onProgress?: KernelLoadListener
  /**
   * Where to fetch the binary from. `null` skips the streamed download and lets
   * occt-wasm find the file next to its own module instead — which is what Node,
   * and therefore the test suite, needs. Defaults to the bundled asset URL.
   */
  readonly wasmUrl?: string | null
  /** Seam for tests: stands in for the dynamic import of the occt-wasm module. */
  readonly importModule?: () => Promise<OcctModule>
}

/**
 * Share of the progress bar each phase owns. Downloading dominates because it is
 * the only part whose cost the user can feel on a slow connection.
 */
const MODULE_SHARE = 0.1
const DOWNLOAD_SHARE = 0.7
const COMPILE_SHARE = 0.2

const IDLE: KernelLoadProgress = { phase: 'idle', ratio: 0, message: 'OpenCascade not loaded' }

/** The bundled binary's URL, for callers that want to preload or report it. */
export const OCCT_WASM_URL: string = wasmAssetUrl

let cached: OcctKernel | null = null
let pending: Promise<OcctKernel> | null = null
let latest: KernelLoadProgress = IDLE
const listeners = new Set<KernelLoadListener>()

/**
 * Loads OpenCascade once and hands the same kernel to every later caller.
 *
 * A failed attempt is not cached: the binary may simply not have arrived yet, so
 * the next call gets a fresh try. Callers that arrive mid-load join the one in
 * flight and receive its progress from that point on.
 */
export function loadOpenCascade(options: WasmLoadOptions = {}): Promise<OcctKernel> {
  const { onProgress } = options

  if (cached) {
    onProgress?.(latest)
    return Promise.resolve(cached)
  }

  if (onProgress) {
    listeners.add(onProgress)
    // Bring a late joiner up to date rather than leaving its bar at zero.
    if (pending) onProgress(latest)
  }

  if (!pending) {
    pending = attempt(options).then(
      (kernel) => {
        cached = kernel
        pending = null
        listeners.clear()
        return kernel
      },
      (cause: unknown) => {
        pending = null
        report({ phase: 'failed', ratio: 0, message: describe(cause) })
        listeners.clear()
        throw cause
      },
    )
  }

  return pending
}

/** The most recent progress report, for a component mounting mid-load. */
export function openCascadeProgress(): KernelLoadProgress {
  return latest
}

/** The loaded kernel, or null while it is absent. Never triggers a load. */
export function loadedOpenCascade(): OcctKernel | null {
  return cached
}

/**
 * Drops the cached kernel so the next load starts over. Tests use this to keep
 * one case's WASM instance out of the next one's way.
 */
export function resetOpenCascade(): void {
  cached = null
  pending = null
  latest = IDLE
  listeners.clear()
}

/* -------------------------------------------------------------------------- */

async function attempt(options: WasmLoadOptions): Promise<OcctKernel> {
  const importModule = options.importModule ?? (() => import('occt-wasm'))

  report({ phase: 'module', ratio: 0, message: 'Loading OpenCascade module' })
  const module = await importModule()
  report({ phase: 'module', ratio: MODULE_SHARE, message: 'OpenCascade module loaded' })

  const binary = await fetchBinary(options.wasmUrl === undefined ? OCCT_WASM_URL : options.wasmUrl)

  report({
    phase: 'compile',
    ratio: MODULE_SHARE + DOWNLOAD_SHARE,
    message: 'Compiling OpenCascade',
  })
  const kernel = await module.OcctKernel.init(binary ? { wasm: binary } : undefined)

  report({ phase: 'ready', ratio: 1, message: 'OpenCascade ready' })
  return kernel
}

/**
 * Streams the binary so the download can be reported byte by byte. Returns null
 * when there is nothing to fetch — either the caller opted out, or `fetch` could
 * not deliver — in which case occt-wasm locates the file itself.
 */
async function fetchBinary(url: string | null): Promise<ArrayBuffer | null> {
  if (url === null || typeof fetch !== 'function') return null

  const downloaded = (loaded: number, total: number): void => {
    const share = total > 0 ? Math.min(1, loaded / total) : 0
    report({
      phase: 'download',
      ratio: MODULE_SHARE + DOWNLOAD_SHARE * share,
      message: total > 0 ? `Downloading OpenCascade ${Math.round(share * 100)}%` : 'Downloading OpenCascade',
      bytesLoaded: loaded,
      bytesTotal: total,
    })
  }

  try {
    downloaded(0, 0)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    const total = Number(response.headers.get('content-length') ?? 0)
    if (!response.body) {
      const whole = await response.arrayBuffer()
      downloaded(whole.byteLength, whole.byteLength)
      return whole
    }
    return await drain(response.body.getReader(), total, downloaded)
  } catch {
    // Not fatal: occt-wasm can still resolve the binary relative to its own
    // module. The user loses the progress bar, not the kernel.
    report({
      phase: 'download',
      ratio: MODULE_SHARE,
      message: 'Downloading OpenCascade (progress unavailable)',
    })
    return null
  }
}

async function drain(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  total: number,
  onBytes: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = []
  let loaded = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    chunks.push(value)
    loaded += value.byteLength
    onBytes(loaded, total)
  }

  const binary = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    binary.set(chunk, offset)
    offset += chunk.byteLength
  }
  return binary.buffer
}

function report(progress: KernelLoadProgress): void {
  latest = progress
  for (const listener of listeners) listener(progress)
}

function describe(cause: unknown): string {
  const reason = cause instanceof Error ? cause.message : String(cause)
  return `OpenCascade failed to load: ${reason}`
}

/** Total share of the bar the compile phase occupies. Exported for the tests. */
export const LOAD_SHARES = {
  module: MODULE_SHARE,
  download: DOWNLOAD_SHARE,
  compile: COMPILE_SHARE,
} as const
