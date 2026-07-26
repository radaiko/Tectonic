import { describe, expect, it, vi } from 'vitest'
import { newId } from '../../../src/sketch/domain/ids'

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  it('produces a v4 UUID', () => {
    expect(newId()).toMatch(UUID_SHAPE)
  })

  it('produces distinct ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()))
    expect(ids.size).toBe(200)
  })

  it('falls back to a local generator when crypto.randomUUID is unavailable', () => {
    const spy = vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue(undefined as unknown as Crypto)
    try {
      expect(newId()).toMatch(UUID_SHAPE)
    } finally {
      spy.mockRestore()
    }
  })
})
