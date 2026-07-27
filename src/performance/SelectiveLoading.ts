import type { MeshData } from '../domain/MeshData'
import { triangleCount } from '../domain/MeshData'

/**
 * Fetching geometry only for the components that need it.
 *
 * A big assembly does not fit in memory tessellated, and most of it is not on
 * screen anyway. This keeps the tessellation for what is being looked at and
 * lets the rest go, so what is resident tracks what is visible instead of what
 * has ever been visible.
 *
 * The loader knows nothing about where geometry comes from — a kernel call, a
 * cache, a file — only that `fetch` will eventually produce it. Requests for a
 * component already in flight join the existing one rather than starting a
 * second, which matters when a camera move asks for the same fifty parts three
 * frames running.
 *
 * Eviction is least-recently-used against a triangle budget. Triangles rather
 * than component count because that is what actually fills a GPU, and a
 * thousand bolts cost less than one cast housing.
 */

export type LoadState = 'unloaded' | 'loading' | 'loaded' | 'failed'

/** What the loader knows about one component. */
export interface LoadRecord {
  readonly id: string
  readonly state: LoadState
  readonly triangleCount: number
  /** Why it failed, when it did. */
  readonly error: string | null
}

export interface SelectiveLoaderOptions {
  /** Produces a component's geometry. Rejecting marks the component failed. */
  readonly fetch: (id: string) => Promise<MeshData>
  /**
   * Triangles allowed resident at once. Exceeding it evicts the least recently
   * used components until it fits. Omit for no limit.
   */
  readonly triangleBudget?: number
  /** How many fetches may be in flight at once. */
  readonly maxConcurrent?: number
  /** Called whenever a component's state changes, for a progress display. */
  readonly onStateChange?: (record: LoadRecord) => void
}

export const DEFAULT_MAX_CONCURRENT = 8

/** Raised when a load is asked for something the loader cannot supply. */
export class LoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LoadError'
  }
}

interface Entry {
  state: LoadState
  mesh: MeshData | null
  error: string | null
  /** Monotonic counter, so the oldest use is the smallest number. */
  lastUsed: number
  pending: Promise<MeshData> | null
}

export class SelectiveLoader {
  readonly #entries = new Map<string, Entry>()
  readonly #fetch: (id: string) => Promise<MeshData>
  readonly #budget: number | null
  readonly #maxConcurrent: number
  readonly #onStateChange: ((record: LoadRecord) => void) | undefined
  /** Ids waiting for a concurrency slot, oldest first. */
  readonly #queue: (() => void)[] = []
  #inFlight = 0
  #clock = 0
  #resident = 0

  constructor(options: SelectiveLoaderOptions) {
    this.#fetch = options.fetch
    this.#budget = options.triangleBudget ?? null
    this.#maxConcurrent = Math.max(1, options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT)
    this.#onStateChange = options.onStateChange
  }

  /** Triangles currently held. */
  get residentTriangles(): number {
    return this.#resident
  }

  /** How many fetches are running right now. */
  get inFlight(): number {
    return this.#inFlight
  }

  /** How many are waiting for a slot. */
  get queued(): number {
    return this.#queue.length
  }

  get loadedIds(): string[] {
    return [...this.#entries.entries()]
      .filter(([, entry]) => entry.state === 'loaded')
      .map(([id]) => id)
  }

  state(id: string): LoadState {
    return this.#entries.get(id)?.state ?? 'unloaded'
  }

  record(id: string): LoadRecord {
    const entry = this.#entries.get(id)
    return {
      id,
      state: entry?.state ?? 'unloaded',
      triangleCount: entry?.mesh ? triangleCount(entry.mesh) : 0,
      error: entry?.error ?? null,
    }
  }

  /** The geometry, if it is resident. Does not fetch and does not mark it used. */
  peek(id: string): MeshData | null {
    const entry = this.#entries.get(id)
    return entry?.state === 'loaded' ? entry.mesh : null
  }

  /**
   * Loads a component, or hands back what is already there.
   *
   * A second call while the first is in flight returns the same promise, so a
   * caller may ask as often as it likes without multiplying the work.
   */
  async load(id: string): Promise<MeshData> {
    const existing = this.#entries.get(id)
    if (existing?.state === 'loaded' && existing.mesh) {
      existing.lastUsed = this.#tick()
      return existing.mesh
    }
    if (existing?.pending) return existing.pending

    const entry: Entry = existing ?? {
      state: 'unloaded',
      mesh: null,
      error: null,
      lastUsed: this.#tick(),
      pending: null,
    }
    this.#entries.set(id, entry)
    entry.state = 'loading'
    entry.error = null
    this.#announce(id)

    const pending = this.#run(id, entry)
    entry.pending = pending
    return pending
  }

  /** Loads several at once, keeping within the concurrency limit. */
  async loadAll(ids: readonly string[]): Promise<MeshData[]> {
    return Promise.all(ids.map((id) => this.load(id)))
  }

  /**
   * Makes exactly `ids` resident: loads what is missing and drops the rest.
   *
   * This is the call a viewport makes after the camera settles, and it is why
   * eviction exists — without the second half, panning across an assembly would
   * accumulate all of it.
   */
  async setVisible(ids: readonly string[]): Promise<MeshData[]> {
    const wanted = new Set(ids)
    for (const id of this.loadedIds) {
      if (!wanted.has(id)) this.unload(id)
    }
    return this.loadAll(ids)
  }

  /** Drops a component's geometry. Returns whether there was any to drop. */
  unload(id: string): boolean {
    const entry = this.#entries.get(id)
    if (!entry || entry.state !== 'loaded' || !entry.mesh) return false

    this.#resident -= triangleCount(entry.mesh)
    entry.mesh = null
    entry.state = 'unloaded'
    entry.pending = null
    this.#announce(id)
    return true
  }

  /** Drops everything. In-flight fetches still complete, then are discarded. */
  clear(): void {
    for (const id of this.loadedIds) this.unload(id)
  }

  async #run(id: string, entry: Entry): Promise<MeshData> {
    await this.#acquire()
    try {
      const mesh = await this.#fetch(id)
      entry.mesh = mesh
      entry.state = 'loaded'
      entry.lastUsed = this.#tick()
      this.#resident += triangleCount(mesh)
      this.#announce(id)
      this.#evict(id)
      return mesh
    } catch (error) {
      entry.state = 'failed'
      entry.mesh = null
      entry.error = error instanceof Error ? error.message : String(error)
      this.#announce(id)
      throw new LoadError(`Could not load component "${id}": ${entry.error}`)
    } finally {
      entry.pending = null
      this.#release()
    }
  }

  /** Waits for a concurrency slot. Resolves immediately when one is free. */
  async #acquire(): Promise<void> {
    if (this.#inFlight < this.#maxConcurrent) {
      this.#inFlight += 1
      return
    }
    await new Promise<void>((resolve) => this.#queue.push(resolve))
    this.#inFlight += 1
  }

  #release(): void {
    this.#inFlight -= 1
    this.#queue.shift()?.()
  }

  /**
   * Evicts least-recently-used components until the budget is met. The one
   * just loaded is exempt: throwing away what was asked for would loop.
   */
  #evict(keep: string): void {
    if (this.#budget === null) return

    const candidates = [...this.#entries.entries()]
      .filter(([id, entry]) => id !== keep && entry.state === 'loaded')
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed)

    for (const [id] of candidates) {
      if (this.#resident <= this.#budget) return
      this.unload(id)
    }
  }

  #announce(id: string): void {
    this.#onStateChange?.(this.record(id))
  }

  #tick(): number {
    this.#clock += 1
    return this.#clock
  }
}
