import type { TectonicDocument } from '../domain/Document'
import { newId } from '../sketch/domain/ids'
import type { DerivedComponentInfo } from './DerivedComponent'
import {
  DerivationError,
  DerivationKind,
  LinkState,
  UpdatePolicy,
  isUpdatePolicy,
  linkStateFor,
} from './DerivedComponent'

/**
 * An assembly component whose part lives in another .tectonic file.
 *
 * The path is stored relative to the assembly, so moving a project folder does
 * not break every link in it. Nothing is watched — a browser cannot watch a
 * file it was handed — so "has it changed" is answered by asking the host for
 * the file's current revision and comparing it with the one the component was
 * last loaded against.
 */

export interface LinkedComponentJSON {
  readonly id: string
  readonly name: string
  /** The component in the assembly tree this link stands behind. */
  readonly componentId: string
  /** Path to the external file, relative to the assembly's own file. */
  readonly path: string
  readonly policy: UpdatePolicy
  /** Revision of the file the component was last loaded from. */
  readonly loadedRevision: string | null
  readonly independent: boolean
}

export interface LinkedComponentInit {
  readonly id?: string
  readonly name?: string
  readonly componentId: string
  readonly path: string
  readonly policy?: UpdatePolicy
  readonly loadedRevision?: string | null
  readonly independent?: boolean
}

/** What a host hands back when asked to read an external file. */
export interface LoadedExternalDocument {
  readonly document: TectonicDocument
  /** Anything that changes when the file does: a hash, an mtime, an etag. */
  readonly revision: string
}

/** Reads an external file. Rejects when the file is missing or unreadable. */
export type ExternalDocumentLoader = (path: string) => Promise<LoadedExternalDocument>

/** Reports a file's current revision without reading it, or null when it is gone. */
export type RevisionProbe = (path: string) => Promise<string | null> | (string | null)

export interface LinkReloadResult {
  readonly linkId: string
  readonly document: TectonicDocument | null
  readonly state: LinkState
  readonly revision: string | null
  readonly message: string | null
}

export class LinkedComponent {
  readonly id: string
  name: string
  componentId: string
  path: string
  policy: UpdatePolicy
  #loadedRevision: string | null
  #independent: boolean

  constructor(init: LinkedComponentInit) {
    const path = init.path.trim()
    if (path.length === 0) throw new DerivationError('A linked component needs a file path')

    this.id = init.id ?? newId()
    this.componentId = init.componentId
    this.path = normalizePath(path)
    this.name = init.name ?? fileName(this.path)
    this.policy = isUpdatePolicy(init.policy) ? init.policy : UpdatePolicy.Prompt
    this.#loadedRevision = init.loadedRevision ?? null
    this.#independent = init.independent ?? false
  }

  get loadedRevision(): string | null {
    return this.#loadedRevision
  }

  get independent(): boolean {
    return this.#independent
  }

  /** Where the file actually is, given the folder the assembly was opened from. */
  resolve(baseDirectory: string): string {
    return resolveRelativePath(baseDirectory, this.path)
  }

  /** Points the link at a new file, forgetting what it was loaded against. */
  relocate(path: string): void {
    const trimmed = path.trim()
    if (trimmed.length === 0) throw new DerivationError('A linked component needs a file path')
    this.path = normalizePath(trimmed)
    this.#loadedRevision = null
  }

  stateFor(currentRevision: string | null): LinkState {
    return linkStateFor(this.#loadedRevision, currentRevision, this.#independent)
  }

  /** Whether this link would update on its own for a given file revision. */
  wantsUpdate(currentRevision: string | null): boolean {
    return this.policy === UpdatePolicy.Auto && this.stateFor(currentRevision) === LinkState.OutOfDate
  }

  /** Whether the user should be asked before the component moves under them. */
  needsPrompt(currentRevision: string | null): boolean {
    return (
      this.policy === UpdatePolicy.Prompt && this.stateFor(currentRevision) === LinkState.OutOfDate
    )
  }

  /**
   * Re-reads the external file. A failure is reported as a broken link rather
   * than thrown: one missing file must not stop an assembly from opening.
   */
  async reload(loader: ExternalDocumentLoader, baseDirectory = ''): Promise<LinkReloadResult> {
    if (this.#independent) {
      return {
        linkId: this.id,
        document: null,
        state: LinkState.Independent,
        revision: this.#loadedRevision,
        message: `"${this.name}" no longer follows ${this.path}`,
      }
    }

    try {
      const loaded = await loader(this.resolve(baseDirectory))
      this.#loadedRevision = loaded.revision
      return {
        linkId: this.id,
        document: loaded.document,
        state: LinkState.InSync,
        revision: loaded.revision,
        message: null,
      }
    } catch (error) {
      return {
        linkId: this.id,
        document: null,
        state: LinkState.Broken,
        revision: null,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /** Cuts the link; the component keeps the geometry it was last loaded with. */
  makeIndependent(): void {
    this.#independent = true
  }

  describe(currentRevision: string | null): DerivedComponentInfo {
    return {
      id: this.id,
      name: this.name,
      kind: DerivationKind.Linked,
      source: this.path,
      state: this.stateFor(currentRevision),
      sourceRevision: this.#loadedRevision,
    }
  }

  toJSON(): LinkedComponentJSON {
    return {
      id: this.id,
      name: this.name,
      componentId: this.componentId,
      path: this.path,
      policy: this.policy,
      loadedRevision: this.#loadedRevision,
      independent: this.#independent,
    }
  }

  static fromJSON(json: LinkedComponentJSON): LinkedComponent {
    return new LinkedComponent(json)
  }
}

/* ----------------------------------------------------------------- registry */

export interface LinkRefreshReport {
  /** Links reloaded without being asked, because their policy is `auto`. */
  readonly updated: readonly LinkReloadResult[]
  /** Out-of-date links waiting on the user, because their policy is `prompt`. */
  readonly pending: readonly string[]
  /** Links whose file could not be read. */
  readonly broken: readonly string[]
  readonly unchanged: readonly string[]
}

export interface RefreshOptions {
  readonly baseDirectory?: string
  /** Reload everything out of date, whatever its policy — the "Update all" button. */
  readonly force?: boolean
}

/** Every external link in an assembly. */
export class LinkedComponentRegistry {
  readonly #links = new Map<string, LinkedComponent>()

  constructor(links: readonly LinkedComponent[] = []) {
    for (const link of links) this.add(link)
  }

  get links(): readonly LinkedComponent[] {
    return [...this.#links.values()]
  }

  get length(): number {
    return this.#links.size
  }

  add(link: LinkedComponent): LinkedComponent {
    if (this.#links.has(link.id)) throw new DerivationError(`Link "${link.id}" is already registered`)
    this.#links.set(link.id, link)
    return link
  }

  get(id: string): LinkedComponent | undefined {
    return this.#links.get(id)
  }

  remove(id: string): boolean {
    return this.#links.delete(id)
  }

  /** The link behind an assembly component, if it has one. */
  forComponent(componentId: string): LinkedComponent | undefined {
    return this.links.find((link) => link.componentId === componentId)
  }

  /** Every link pointing at the same file — they all move together. */
  forPath(path: string): LinkedComponent[] {
    const normalized = normalizePath(path)
    return this.links.filter((link) => link.path === normalized)
  }

  /**
   * Asks the host what state every linked file is in, reloads the ones that
   * should follow on their own, and reports the ones waiting to be asked about.
   */
  async refreshAll(
    loader: ExternalDocumentLoader,
    probe: RevisionProbe,
    options: RefreshOptions = {},
  ): Promise<LinkRefreshReport> {
    const base = options.baseDirectory ?? ''
    const updated: LinkReloadResult[] = []
    const pending: string[] = []
    const broken: string[] = []
    const unchanged: string[] = []

    for (const link of this.links) {
      if (link.independent) {
        unchanged.push(link.id)
        continue
      }

      const revision = await probe(link.resolve(base))
      const state = link.stateFor(revision)

      if (state === LinkState.Broken) {
        broken.push(link.id)
        continue
      }
      if (state === LinkState.InSync) {
        unchanged.push(link.id)
        continue
      }
      if (!options.force && link.policy !== UpdatePolicy.Auto) {
        pending.push(link.id)
        continue
      }

      const result = await link.reload(loader, base)
      if (result.state === LinkState.Broken) broken.push(link.id)
      else updated.push(result)
    }

    return { updated, pending, broken, unchanged }
  }

  toJSON(): readonly LinkedComponentJSON[] {
    return this.links.map((link) => link.toJSON())
  }

  static fromJSON(json: readonly LinkedComponentJSON[] | undefined): LinkedComponentRegistry {
    const registry = new LinkedComponentRegistry()
    for (const entry of json ?? []) {
      try {
        registry.add(LinkedComponent.fromJSON(entry))
      } catch {
        // A malformed link is dropped rather than failing the open.
      }
    }
    return registry
  }
}

/* --------------------------------------------------------------------- paths */

/**
 * Path helpers for a world with no `path` module. Separators are normalised to
 * `/` and `.`/`..` segments are collapsed, which is all a relative link between
 * two files in the same project tree ever needs.
 */

export function normalizePath(path: string): string {
  const slashes = path.replace(/\\/g, '/')
  const absolute = slashes.startsWith('/')
  const segments: string[] = []

  for (const segment of slashes.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      const last = segments[segments.length - 1]
      // `../` past the start has to survive: it is how a sibling folder is named.
      if (last !== undefined && last !== '..') segments.pop()
      else if (!absolute) segments.push('..')
      continue
    }
    segments.push(segment)
  }

  const joined = segments.join('/')
  if (absolute) return `/${joined}`
  return joined.length === 0 ? '.' : joined
}

/** Resolves a relative path against a directory. */
export function resolveRelativePath(baseDirectory: string, relative: string): string {
  const normalizedRelative = relative.replace(/\\/g, '/')
  if (normalizedRelative.startsWith('/')) return normalizePath(normalizedRelative)
  const base = baseDirectory.replace(/\\/g, '/')
  if (base.trim().length === 0) return normalizePath(normalizedRelative)
  return normalizePath(`${base}/${normalizedRelative}`)
}

/** The path of `target` as seen from `baseDirectory`, e.g. `../parts/bracket.tectonic`. */
export function relativePath(baseDirectory: string, target: string): string {
  const from = normalizePath(baseDirectory).split('/').filter((segment) => segment !== '.')
  const to = normalizePath(target).split('/').filter((segment) => segment !== '.')

  let shared = 0
  while (shared < from.length && shared < to.length && from[shared] === to[shared]) shared += 1

  const up = new Array(from.length - shared).fill('..')
  const down = to.slice(shared)
  const joined = [...up, ...down].join('/')
  return joined.length === 0 ? '.' : joined
}

/** The last segment of a path, which is what a link is named after. */
export function fileName(path: string): string {
  const segments = normalizePath(path).split('/')
  return segments[segments.length - 1] ?? path
}

/** The folder a file sits in. */
export function directoryOf(path: string): string {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '' : normalized.slice(0, index)
}
