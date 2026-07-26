import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  DocumentParseError,
  TECTONIC_EXTENSION,
  createNewDocument,
  deserialize,
  readDocumentFile,
  saveFile,
  serialize,
  validateDocument,
} from '../../src/io/FileService'
import { TECTONIC_FORMAT_VERSION, createBody, createPart } from '../../src/domain/Document'
import type { TectonicDocument } from '../../src/domain/Document'

const NOW = '2026-07-26T12:00:00.000Z'

function populatedDocument(): TectonicDocument {
  const base = createNewDocument({ name: 'Bracket', units: 'mm', now: NOW })
  return {
    ...base,
    parts: [
      createPart('part-1', 'Part 1', [
        createBody('body-1', 'Box 1', {
          positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
          indices: [0, 1, 2],
        }),
      ]),
    ],
    features: [
      {
        id: 'feature-1',
        name: 'Extrude 1',
        type: 'extrude',
        suppressed: false,
        parameters: { distance: 10, symmetric: false, note: null },
      },
    ],
  }
}

describe('createNewDocument', () => {
  it('creates an empty document at the current format version', () => {
    const document = createNewDocument({ now: NOW })

    expect(document.version).toBe(TECTONIC_FORMAT_VERSION)
    expect(document.parts).toEqual([])
    expect(document.features).toEqual([])
    expect(document.metadata).toEqual({
      name: 'Untitled',
      created: NOW,
      modified: NOW,
      units: 'mm',
    })
  })

  it('honours name and unit overrides', () => {
    const document = createNewDocument({ name: 'Flange', units: 'in', now: NOW })

    expect(document.metadata.name).toBe('Flange')
    expect(document.metadata.units).toBe('in')
  })
})

describe('serialize / deserialize round-trip', () => {
  it('round-trips an empty document', () => {
    const original = createNewDocument({ now: NOW })

    expect(deserialize(serialize(original))).toEqual(original)
  })

  it('round-trips a document with parts, bodies and features', () => {
    const original = populatedDocument()

    const restored = deserialize(serialize(original))

    expect(restored).toEqual(original)
    expect(restored.parts[0]?.bodies[0]?.mesh.indices).toEqual([0, 1, 2])
    expect(restored.features[0]?.parameters.distance).toBe(10)
  })

  it('produces human-readable JSON', () => {
    expect(serialize(createNewDocument({ now: NOW }))).toContain('\n  "version": 1')
  })
})

describe('deserialize validation', () => {
  it('rejects malformed JSON', () => {
    expect(() => deserialize('{ nope')).toThrow(DocumentParseError)
  })

  it.each([
    ['a JSON array', '[]'],
    ['a JSON scalar', '42'],
    ['null', 'null'],
    ['a missing version', '{"metadata":{},"parts":[],"features":[]}'],
    ['missing metadata', '{"version":1,"parts":[],"features":[]}'],
    ['missing parts', '{"version":1,"metadata":{},"features":[]}'],
    ['missing features', '{"version":1,"metadata":{},"parts":[]}'],
  ])('rejects %s', (_label, json) => {
    expect(() => deserialize(json)).toThrow(DocumentParseError)
  })

  it('rejects documents written by a newer build', () => {
    const future = JSON.stringify({
      version: TECTONIC_FORMAT_VERSION + 1,
      metadata: {},
      parts: [],
      features: [],
    })

    expect(() => deserialize(future)).toThrow(/newer than this build supports/)
  })

  it('accepts an older format version', () => {
    const older = { version: 0, metadata: {}, parts: [], features: [] }

    expect(validateDocument(older).version).toBe(0)
  })
})

describe('readDocumentFile', () => {
  it('parses a File containing a document', async () => {
    const original = populatedDocument()
    const file = new File([serialize(original)], `bracket${TECTONIC_EXTENSION}`)

    await expect(readDocumentFile(file)).resolves.toEqual(original)
  })

  it('rejects a file that is not a document', async () => {
    const file = new File(['hello'], `notes${TECTONIC_EXTENSION}`)

    await expect(readDocumentFile(file)).rejects.toThrow(DocumentParseError)
  })
})

describe('saveFile', () => {
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // jsdom implements neither object URLs nor navigation-triggering clicks.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:tectonic'),
      revokeObjectURL: vi.fn(),
    })
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('downloads the document under its metadata name', () => {
    let downloaded: string | undefined
    click.mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download
    })

    saveFile(populatedDocument())

    expect(click).toHaveBeenCalledOnce()
    expect(downloaded).toBe(`Bracket${TECTONIC_EXTENSION}`)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tectonic')
  })

  it('appends the extension to a supplied file name', () => {
    let downloaded: string | undefined
    click.mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download
    })

    saveFile(populatedDocument(), 'custom-name')

    expect(downloaded).toBe(`custom-name${TECTONIC_EXTENSION}`)
  })

  it('leaves an already-suffixed file name alone', () => {
    let downloaded: string | undefined
    click.mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download
    })

    saveFile(populatedDocument(), `custom${TECTONIC_EXTENSION}`)

    expect(downloaded).toBe(`custom${TECTONIC_EXTENSION}`)
  })

  it('removes the temporary anchor from the DOM', () => {
    saveFile(populatedDocument())

    expect(document.querySelectorAll('a')).toHaveLength(0)
  })
})
