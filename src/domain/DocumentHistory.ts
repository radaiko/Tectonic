import type { FeatureJSON } from '../features/domain/Feature'
import type { FeatureTree } from '../features/FeatureTree'
import { restoreModel } from '../sketch/history'
import type { SketchModelJSON } from '../sketch/domain/SketchModel'
import { SketchModel } from '../sketch/domain/SketchModel'

/**
 * Undo and redo for the document as a whole.
 *
 * The sketch editor has had its own history since M1, and keeps it: inside a
 * sketch, undo means "take that line back", and a stack of whole-sketch
 * snapshots is the right grain for that. What was missing is everything *around*
 * a sketch — adding one, deleting one, moving it to another face, adding a
 * feature, reordering the tree, changing a parameter, renaming the document.
 * None of that was undoable at all, so a mis-click cost work that could only be
 * put back by hand.
 *
 * Snapshots rather than a command log, for the same reason the sketch does it:
 * a document is a few hundred kilobytes of JSON at worst, and a snapshot cannot
 * be wrong about how to invert itself.
 *
 * The restore is deliberately **in place**. The editor builds its sketch list
 * and its feature tree once and hands those very objects to the panels, the
 * renderer and the engine; replacing them on undo would leave half the app
 * looking at the document as it was before.
 */

export interface DocumentSnapshot {
  readonly name: string
  readonly sketches: readonly SketchModelJSON[]
  readonly features: readonly FeatureJSON[]
  readonly rollBarIndex: number
}

/**
 * The live document, as the history reaches it. The editor owns these objects;
 * the history only reads and refills them.
 */
export interface DocumentModelHandle {
  /** The live sketch list. Mutated in place — never reassigned. */
  readonly sketches: SketchModel[]
  readonly tree: FeatureTree
  getName(): string
  setName(name: string): void
}

/**
 * The document as it stands, ready to be put back later.
 *
 * `name` overrides what the handle would report. Only the opening snapshot uses
 * it: a React caller builds the history while it is rendering, and reaching for
 * the ref that backs `getName` is exactly what a render must not do. Every later
 * snapshot is taken from a commit, which is well clear of a render, and asks the
 * handle as normal.
 */
export function snapshotDocument(handle: DocumentModelHandle, name?: string): DocumentSnapshot {
  const tree = handle.tree.toJSON()
  return {
    name: name ?? handle.getName(),
    sketches: handle.sketches.map((sketch) => sketch.toJSON()),
    features: tree.features,
    rollBarIndex: tree.rollBarIndex,
  }
}

/**
 * Puts the document back to a snapshot.
 *
 * Sketches are matched by id and refilled where they already exist, so a sketch
 * that was only edited keeps the object identity its editor, its renderer and
 * its own undo stack are all built around. Only a sketch that was genuinely
 * added back by this undo is constructed afresh.
 */
export function restoreDocument(handle: DocumentModelHandle, snapshot: DocumentSnapshot): void {
  handle.setName(snapshot.name)
  handle.tree.restore({ features: snapshot.features, rollBarIndex: snapshot.rollBarIndex })

  const existing = new Map(handle.sketches.map((sketch) => [sketch.id, sketch]))
  const restored: SketchModel[] = []
  for (const json of snapshot.sketches) {
    const live = existing.get(json.id)
    if (live) {
      restoreModel(live, json)
      restored.push(live)
    } else {
      restored.push(SketchModel.fromJSON(json))
    }
  }

  handle.sketches.splice(0, handle.sketches.length, ...restored)
}

/** One step of the history: the document as it stood, and what got it there. */
export interface HistoryEntry {
  readonly label: string
  readonly snapshot: DocumentSnapshot
}

export interface CommitOptions {
  /**
   * Runs of edits that share a key collapse into one step.
   *
   * Drawing in a sketch reports an edit on every pointer move; without this the
   * document stack would fill with a hundred indistinguishable steps and undo
   * would crawl back through them one twitch at a time. Inside a sketch the
   * fine grain already exists — that is what the sketch's own undo is for — so
   * at document level the whole visit collapses into "Edit sketch".
   */
  readonly coalesceKey?: string
}

export const DEFAULT_DOCUMENT_HISTORY_LIMIT = 100

export class DocumentHistory {
  readonly #handle: DocumentModelHandle
  readonly #limit: number
  #entries: HistoryEntry[]
  #index = 0
  /** The coalesce key the entry at the top was committed under, if any. */
  #openRun: string | null = null

  /**
   * `initialName` stands in for the handle's own name in the opening snapshot
   * only — see {@link snapshotDocument} for why a caller would have one to give.
   */
  constructor(
    handle: DocumentModelHandle,
    limit: number = DEFAULT_DOCUMENT_HISTORY_LIMIT,
    initialName?: string,
  ) {
    this.#handle = handle
    this.#limit = Math.max(1, limit)
    this.#entries = [
      { label: 'Open document', snapshot: snapshotDocument(handle, initialName) },
    ]
  }

  get canUndo(): boolean {
    return this.#index > 0
  }

  get canRedo(): boolean {
    return this.#index < this.#entries.length - 1
  }

  get size(): number {
    return this.#entries.length
  }

  /** What an undo would take back, for a button's tooltip. Null when there is none. */
  get undoLabel(): string | null {
    return this.canUndo ? (this.#entries[this.#index] as HistoryEntry).label : null
  }

  /** What a redo would put back. Null when there is none. */
  get redoLabel(): string | null {
    return this.canRedo ? (this.#entries[this.#index + 1] as HistoryEntry).label : null
  }

  /** Records the document as it now stands, discarding any redo branch. */
  commit(label: string, options: CommitOptions = {}): void {
    const key = options.coalesceKey ?? null
    const snapshot = snapshotDocument(this.#handle)

    // A run in progress folds into its own top entry rather than growing the
    // stack. The run is only "in progress" while it is also the newest entry —
    // an undo in the middle of one ends it.
    if (key !== null && key === this.#openRun && this.#index === this.#entries.length - 1) {
      this.#entries[this.#index] = { label, snapshot }
      return
    }

    this.#entries = this.#entries.slice(0, this.#index + 1)
    this.#entries.push({ label, snapshot })
    if (this.#entries.length > this.#limit) this.#entries = this.#entries.slice(1)
    this.#index = this.#entries.length - 1
    this.#openRun = key
  }

  /** Steps back one entry. Returns what was undone, or null when at the start. */
  undo(): string | null {
    if (!this.canUndo) return null
    const undone = (this.#entries[this.#index] as HistoryEntry).label
    this.#index -= 1
    this.#openRun = null
    restoreDocument(this.#handle, (this.#entries[this.#index] as HistoryEntry).snapshot)
    return undone
  }

  /** Steps forward one entry. Returns what was redone, or null at the end. */
  redo(): string | null {
    if (!this.canRedo) return null
    this.#index += 1
    this.#openRun = null
    const entry = this.#entries[this.#index] as HistoryEntry
    restoreDocument(this.#handle, entry.snapshot)
    return entry.label
  }
}
