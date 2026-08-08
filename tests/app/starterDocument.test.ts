import { describe, expect, it } from 'vitest'
import { createStarterDocument } from '../../src/app/starterDocument'
import { countBodies, documentFeatureTree, documentSketches } from '../../src/domain/Document'
import { deserialize, serialize } from '../../src/io/FileService'

const NOW = '2026-07-26T12:00:00.000Z'

describe('createStarterDocument', () => {
  it('models nothing at all', () => {
    const document = createStarterDocument({ now: NOW })

    // The placeholder box the M0 scaffold used to seed is gone: a new document
    // must contain only what the user asks for.
    expect(document.parts).toEqual([])
    expect(countBodies(document)).toBe(0)
    expect(document.features).toEqual([])
    expect(documentFeatureTree(document).features).toHaveLength(0)
  })

  it('opens on a single empty sketch on the XY plane', () => {
    const sketches = documentSketches(createStarterDocument({ now: NOW }))

    expect(sketches).toHaveLength(1)
    expect(sketches[0]?.support).toEqual({ kind: 'origin-plane', plane: 'XY', offset: 0 })
    expect(sketches[0]?.entities.size).toBe(0)
    expect(sketches[0]?.constraints.size).toBe(0)
  })

  it('applies the supplied document options', () => {
    const document = createStarterDocument({ name: 'Starter', units: 'in', now: NOW })

    expect(document.metadata).toEqual({
      name: 'Starter',
      created: NOW,
      modified: NOW,
      units: 'in',
    })
  })

  it('round-trips through the .tectonic format unchanged', () => {
    const document = createStarterDocument({ now: NOW })

    expect(deserialize(serialize(document))).toEqual(document)
  })
})
