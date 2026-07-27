import { newId } from '../sketch/domain/ids'
import type { DerivedComponentInfo, DerivedEdit, EditFailure, ModelSnapshot } from './DerivedComponent'
import {
  DerivationError,
  DerivationKind,
  LinkState,
  applyEdits,
  cloneSnapshot,
  linkStateFor,
  snapshotRevision,
} from './DerivedComponent'

/**
 * A part built from another part.
 *
 * The derived part owns no geometry of its own: it owns a source and a list of
 * changes. Rebuilding is always "take the source as it stands, replay the
 * changes" — which is what makes the derivation live. Editing the source and
 * rebuilding carries every change forward; the only ones that fall away are the
 * ones whose target the source no longer has, and those are reported rather
 * than silently dropped.
 *
 * A derived part can itself be the source of another, so a family of variants
 * hangs off one master. {@link DerivationGraph} rebuilds such a chain in order.
 */

export interface DerivedPartJSON {
  readonly id: string
  readonly name: string
  /** Part id, or the id of another derived part. */
  readonly sourceId: string
  readonly edits: readonly DerivedEdit[]
  /** Revision of the source the last rebuild ran against. */
  readonly sourceRevision: string | null
  readonly independent: boolean
}

export interface DerivedPartInit {
  readonly id?: string
  readonly name?: string
  readonly sourceId: string
  readonly edits?: readonly DerivedEdit[]
  readonly sourceRevision?: string | null
  readonly independent?: boolean
}

export interface DerivedRebuildResult {
  readonly snapshot: ModelSnapshot
  readonly applied: readonly DerivedEdit[]
  readonly failures: readonly EditFailure[]
  /** Revision of the source this rebuild consumed. */
  readonly sourceRevision: string
}

export class DerivedPart {
  readonly id: string
  name: string
  sourceId: string
  readonly edits: DerivedEdit[]
  #sourceRevision: string | null
  #independent: boolean
  /** Set once the link is cut, so the part keeps the geometry it had. */
  #baked: ModelSnapshot | null = null

  constructor(init: DerivedPartInit) {
    if (!init.sourceId) throw new DerivationError('A derived part needs a source')
    this.id = init.id ?? newId()
    this.sourceId = init.sourceId
    this.name = init.name ?? 'Derived Part'
    this.edits = [...(init.edits ?? [])]
    this.#sourceRevision = init.sourceRevision ?? null
    this.#independent = init.independent ?? false
  }

  get sourceRevision(): string | null {
    return this.#sourceRevision
  }

  get independent(): boolean {
    return this.#independent
  }

  /** The geometry kept after the link was cut, if there is any. */
  get baked(): ModelSnapshot | null {
    return this.#baked
  }

  addEdit(edit: DerivedEdit): DerivedEdit {
    if (this.#independent) throw new DerivationError(`"${this.name}" no longer follows a source`)
    this.edits.push(edit)
    return edit
  }

  removeEdit(index: number): boolean {
    if (index < 0 || index >= this.edits.length) return false
    this.edits.splice(index, 1)
    return true
  }

  clearEdits(): void {
    this.edits.length = 0
  }

  /** Whether the source has moved on since the last rebuild. */
  isOutOfDate(source: ModelSnapshot | string | null): boolean {
    return this.stateAgainst(source) === LinkState.OutOfDate
  }

  stateAgainst(source: ModelSnapshot | string | null): LinkState {
    const current =
      source === null ? null : typeof source === 'string' ? source : snapshotRevision(source)
    return linkStateFor(this.#sourceRevision, current, this.#independent)
  }

  /**
   * Replays the edits over the source and records what it was built against.
   * An independent part ignores the source and hands back what it kept.
   */
  rebuild(source: ModelSnapshot): DerivedRebuildResult {
    const sourceRevision = snapshotRevision(source)

    if (this.#independent) {
      return {
        snapshot: cloneSnapshot(this.#baked ?? source),
        applied: [],
        failures: [],
        sourceRevision,
      }
    }

    const result = applyEdits(source, this.edits)
    this.#sourceRevision = sourceRevision
    return { ...result, sourceRevision }
  }

  /**
   * Cuts the link, keeping the geometry as it stands. The edits are kept too,
   * because the user may want to read what the part used to change — they are
   * simply no longer replayed.
   */
  makeIndependent(current: ModelSnapshot): ModelSnapshot {
    if (this.#independent) return cloneSnapshot(this.#baked ?? current)
    this.#baked = cloneSnapshot(current)
    this.#independent = true
    return cloneSnapshot(this.#baked)
  }

  /** What the assembly tree shows for this part, given the source as it stands. */
  describe(source: ModelSnapshot | string | null): DerivedComponentInfo {
    return {
      id: this.id,
      name: this.name,
      kind: DerivationKind.Derived,
      source: this.sourceId,
      state: this.stateAgainst(source),
      sourceRevision: this.#sourceRevision,
    }
  }

  toJSON(): DerivedPartJSON {
    return {
      id: this.id,
      name: this.name,
      sourceId: this.sourceId,
      edits: [...this.edits],
      sourceRevision: this.#sourceRevision,
      independent: this.#independent,
    }
  }

  static fromJSON(json: DerivedPartJSON): DerivedPart {
    return new DerivedPart(json)
  }

  clone(): DerivedPart {
    return DerivedPart.fromJSON({ ...this.toJSON(), id: newId() })
  }
}

/* -------------------------------------------------------------------- graph */

export interface DerivationRebuildReport {
  /** Snapshot per derived part id, in rebuild order. */
  readonly snapshots: ReadonlyMap<string, ModelSnapshot>
  readonly order: readonly string[]
  readonly failures: readonly { readonly partId: string; readonly message: string }[]
  readonly editFailures: readonly { readonly partId: string; readonly failure: EditFailure }[]
}

/**
 * Every derivation in the document, and the order they have to be rebuilt in.
 *
 * A derived part may be the source of another, so this is a forest rooted at the
 * ordinary parts. Rebuilding walks it from the roots down, which is the only
 * order in which a chain gives the right answer.
 */
export class DerivationGraph {
  readonly #parts = new Map<string, DerivedPart>()

  constructor(parts: readonly DerivedPart[] = []) {
    for (const part of parts) this.add(part)
  }

  get parts(): readonly DerivedPart[] {
    return [...this.#parts.values()]
  }

  get length(): number {
    return this.#parts.size
  }

  add(part: DerivedPart): DerivedPart {
    if (this.#parts.has(part.id)) {
      throw new DerivationError(`"${part.name}" is already in this graph`)
    }
    this.#parts.set(part.id, part)
    const cycle = this.findCycle()
    if (cycle) {
      this.#parts.delete(part.id)
      throw new DerivationError(`"${part.name}" would derive from itself: ${cycle.join(' → ')}`)
    }
    return part
  }

  get(id: string): DerivedPart | undefined {
    return this.#parts.get(id)
  }

  remove(id: string): boolean {
    return this.#parts.delete(id)
  }

  /** Everything derived from a part, transitively. */
  dependents(sourceId: string): DerivedPart[] {
    const found = new Set<string>()
    let grew = true
    while (grew) {
      grew = false
      for (const part of this.#parts.values()) {
        if (found.has(part.id)) continue
        if (part.sourceId === sourceId || found.has(part.sourceId)) {
          found.add(part.id)
          grew = true
        }
      }
    }
    return this.parts.filter((part) => found.has(part.id))
  }

  /** The chain a part inherits through, source first. */
  chainOf(id: string): DerivedPart[] {
    const chain: DerivedPart[] = []
    const seen = new Set<string>()
    let current = this.#parts.get(id)
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      chain.unshift(current)
      current = this.#parts.get(current.sourceId)
    }
    return chain
  }

  /** The derivation cycle, if adding a part created one. */
  findCycle(): string[] | null {
    for (const start of this.#parts.keys()) {
      const path: string[] = []
      const seen = new Set<string>()
      let current: string | undefined = start
      while (current !== undefined && this.#parts.has(current)) {
        if (seen.has(current)) return [...path.slice(path.indexOf(current)), current]
        seen.add(current)
        path.push(current)
        current = this.#parts.get(current)?.sourceId
      }
    }
    return null
  }

  /**
   * Rebuilds every derivation. `sources` supplies the snapshot of each ordinary
   * part; derived parts are resolved from their own rebuild as the walk reaches
   * them, so a chain settles in one pass.
   */
  rebuildAll(sources: ReadonlyMap<string, ModelSnapshot>): DerivationRebuildReport {
    const snapshots = new Map<string, ModelSnapshot>()
    const order: string[] = []
    const failures: { partId: string; message: string }[] = []
    const editFailures: { partId: string; failure: EditFailure }[] = []

    const pending = new Set(this.#parts.keys())
    let progressed = true

    while (pending.size > 0 && progressed) {
      progressed = false
      for (const id of [...pending]) {
        const part = this.#parts.get(id) as DerivedPart
        const source = sources.get(part.sourceId) ?? snapshots.get(part.sourceId)
        if (!source) continue

        const result = part.rebuild(source)
        snapshots.set(id, result.snapshot)
        order.push(id)
        for (const failure of result.failures) editFailures.push({ partId: id, failure })
        pending.delete(id)
        progressed = true
      }
    }

    for (const id of pending) {
      const part = this.#parts.get(id) as DerivedPart
      failures.push({ partId: id, message: `Source "${part.sourceId}" is missing` })
    }

    return { snapshots, order, failures, editFailures }
  }

  toJSON(): readonly DerivedPartJSON[] {
    return this.parts.map((part) => part.toJSON())
  }

  static fromJSON(json: readonly DerivedPartJSON[] | undefined): DerivationGraph {
    const graph = new DerivationGraph()
    for (const entry of json ?? []) {
      try {
        graph.add(DerivedPart.fromJSON(entry))
      } catch {
        // A derivation this build cannot place is dropped rather than failing
        // the open — the rest of the document is still worth having.
      }
    }
    return graph
  }
}
