import { describe, expect, it } from 'vitest'
import type { SessionStorageLike } from '../../src/io/DocumentStorage'
import {
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  clearSession,
  loadSession,
  saveSession,
} from '../../src/io/DocumentStorage'
import { createDocument } from '../../src/domain/Document'

const NOW = '2026-07-26T12:00:00.000Z'

/** A `localStorage` stand-in, so these tests need no browser globals at all. */
function fakeStorage(seed: Record<string, string> = {}): SessionStorageLike & {
  readonly entries: Map<string, string>
} {
  const entries = new Map(Object.entries(seed))
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
  }
}

/** Storage that refuses every write, as a full or disabled one would. */
function hostileStorage(): SessionStorageLike {
  return {
    getItem: () => {
      throw new Error('access denied')
    },
    setItem: () => {
      throw new Error('quota exceeded')
    },
    removeItem: () => {
      throw new Error('access denied')
    },
  }
}

describe('session storage', () => {
  it('round-trips the document under a versioned key', () => {
    const storage = fakeStorage()
    const document = createDocument({ name: 'Bracket', now: NOW })

    expect(saveSession(document, { dirty: true, now: NOW }, storage)).toBe(true)

    expect([...storage.entries.keys()]).toEqual([SESSION_STORAGE_KEY])
    const restored = loadSession(storage)
    expect(restored?.schema).toBe(SESSION_SCHEMA_VERSION)
    expect(restored?.dirty).toBe(true)
    expect(restored?.savedAt).toBe(NOW)
    expect(restored?.document).toEqual(document)
  })

  it('records a document with no pending edits as clean', () => {
    const storage = fakeStorage()
    saveSession(createDocument({ now: NOW }), { dirty: false, now: NOW }, storage)

    expect(loadSession(storage)?.dirty).toBe(false)
  })

  it('has nothing to offer when storage is empty', () => {
    expect(loadSession(fakeStorage())).toBeNull()
  })

  it('discards a payload that is not JSON, and clears it so it cannot recur', () => {
    const storage = fakeStorage({ [SESSION_STORAGE_KEY]: '{ not json' })

    expect(loadSession(storage)).toBeNull()
    expect(storage.entries.has(SESSION_STORAGE_KEY)).toBe(false)
  })

  it.each([
    ['a bare string', JSON.stringify('hello')],
    ['an array', JSON.stringify([])],
    ['null', JSON.stringify(null)],
  ])('discards %s', (_label, raw) => {
    expect(loadSession(fakeStorage({ [SESSION_STORAGE_KEY]: raw }))).toBeNull()
  })

  it('discards an entry written under a different schema', () => {
    const storage = fakeStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({
        schema: SESSION_SCHEMA_VERSION + 1,
        savedAt: NOW,
        dirty: true,
        document: createDocument({ now: NOW }),
      }),
    })

    expect(loadSession(storage)).toBeNull()
  })

  it('discards an entry whose document does not validate', () => {
    const storage = fakeStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({
        schema: SESSION_SCHEMA_VERSION,
        savedAt: NOW,
        dirty: true,
        document: { version: 1, metadata: {}, parts: 'not an array', features: [] },
      }),
    })

    expect(loadSession(storage)).toBeNull()
    expect(storage.entries.has(SESSION_STORAGE_KEY)).toBe(false)
  })

  it('clears the recovery copy on request', () => {
    const storage = fakeStorage()
    saveSession(createDocument({ now: NOW }), { dirty: true, now: NOW }, storage)

    clearSession(storage)

    expect(loadSession(storage)).toBeNull()
  })

  it('reports a failed write rather than throwing', () => {
    expect(saveSession(createDocument({ now: NOW }), { dirty: true }, hostileStorage())).toBe(false)
  })

  it('survives storage that throws on every access', () => {
    expect(loadSession(hostileStorage())).toBeNull()
    expect(() => clearSession(hostileStorage())).not.toThrow()
  })

  it('does nothing at all when there is no storage', () => {
    expect(saveSession(createDocument({ now: NOW }), { dirty: true }, null)).toBe(false)
    expect(loadSession(null)).toBeNull()
    expect(() => clearSession(null)).not.toThrow()
  })
})
