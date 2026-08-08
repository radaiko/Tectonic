import type { TectonicDocument } from '../domain/Document'
import { validateDocument } from './FileService'

/**
 * Crash recovery for the open document.
 *
 * Tectonic has no storage: a document lives in memory until the user exports it.
 * That is the design, but it makes a closed tab or a reloaded page indistinguishable
 * from throwing the work away. This module keeps one copy of the working document
 * in `localStorage` so the start screen can offer it back.
 *
 * It is deliberately *not* a save mechanism. The recovered copy is the last thing
 * the editor mirrored here, it is never written to disk on its own, and it is
 * never treated as authoritative over a file the user actually opened.
 *
 * Everything here degrades to "no recovery available" rather than throwing:
 * storage can be absent (server-side rendering, unit tests outside jsdom),
 * disabled (private browsing), full (quota), or hold something a previous build
 * wrote. None of those are worth failing a page load over.
 */

/**
 * Versioned key. The version is in the key rather than only in the payload, so a
 * future schema change cannot be misread as this one and an old build cannot be
 * confused by a new one — each simply finds its own key missing.
 */
export const SESSION_STORAGE_KEY = 'tectonic:session:v1'

/** Schema of the wrapper below. Checked on read; a mismatch discards the entry. */
export const SESSION_SCHEMA_VERSION = 1

/** The recovery record as it sits in storage. */
export interface StoredSession {
  readonly schema: number
  /** ISO 8601 timestamp of when this copy was mirrored. */
  readonly savedAt: string
  /** Whether the document had edits that had not been exported to a file. */
  readonly dirty: boolean
  readonly document: TectonicDocument
}

/** Anything that behaves like `localStorage` — injected so tests need no globals. */
export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * The browser's `localStorage`, or `null` where there is not one.
 *
 * Touching `localStorage` can itself throw — Safari does so with cookies
 * blocked — so the access is guarded rather than merely checked for existence.
 */
export function defaultSessionStorage(): SessionStorageLike | null {
  try {
    const storage = globalThis.localStorage
    return storage ? (storage as SessionStorageLike) : null
  } catch {
    return null
  }
}

/**
 * Mirrors the document for recovery. Returns whether it was written — a `false`
 * means recovery is unavailable, never that the document is damaged, so callers
 * carry on rather than interrupting the user.
 */
export function saveSession(
  document: TectonicDocument,
  options: { readonly dirty: boolean; readonly now?: string } = { dirty: true },
  storage: SessionStorageLike | null = defaultSessionStorage(),
): boolean {
  if (!storage) return false

  const session: StoredSession = {
    schema: SESSION_SCHEMA_VERSION,
    savedAt: options.now ?? new Date().toISOString(),
    dirty: options.dirty,
    document,
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    return true
  } catch {
    // Out of quota, or storage turned off mid-session. The document is still
    // in memory and the unsaved-changes guard still stands; only the recovery
    // copy is lost, which is not worth a dialog.
    return false
  }
}

/**
 * The recoverable session, or `null` when there is nothing usable.
 *
 * Anything unreadable is cleared on the way out: a payload this build cannot
 * parse can never become parseable, and leaving it would make the start screen
 * fail the same way on every load.
 */
export function loadSession(
  storage: SessionStorageLike | null = defaultSessionStorage(),
): StoredSession | null {
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object')
    }

    const candidate = parsed as Record<string, unknown>
    if (candidate.schema !== SESSION_SCHEMA_VERSION) throw new Error('stale schema')

    // The same validation an opened file goes through. Storage is no more
    // trustworthy than a file: an extension, another tab or a half-finished
    // write can all leave something that parses but is not a document.
    const document = validateDocument(candidate.document)

    return {
      schema: SESSION_SCHEMA_VERSION,
      savedAt: typeof candidate.savedAt === 'string' ? candidate.savedAt : new Date(0).toISOString(),
      dirty: candidate.dirty === true,
      document,
    }
  } catch {
    clearSession(storage)
    return null
  }
}

/** Drops the recovery copy. Called once its document is no longer worth offering. */
export function clearSession(
  storage: SessionStorageLike | null = defaultSessionStorage(),
): void {
  if (!storage) return
  try {
    storage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Nothing to do and nothing that depends on it.
  }
}
