import { describe, expect, it } from 'vitest'
import type { Body, TectonicDocument } from '../../src/domain/Document'
import { createBody, createDocument, createSketchOn } from '../../src/domain/Document'
import type { ExportSource } from '../../src/io/DocumentExport'
import {
  EXPORT_FORMATS,
  buildExport,
  exportFormatInfo,
  exportUnavailableReason,
} from '../../src/io/DocumentExport'
import { deserialize } from '../../src/io/FileService'
import { ExportError } from '../../src/io/types'
import { buildRectangle } from '../../src/sketch/domain/builders'
import { originPlaneSupport } from '../../src/sketch/domain/SketchSupport'

const NOW = '2026-07-26T12:00:00.000Z'

/** A unit tetrahedron — four triangles, enough for every mesh format. */
const TETRAHEDRON = {
  positions: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10],
  normals: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0],
  indices: [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3],
}

function sketchWithGeometry(name = 'Profile', plane: 'XY' | 'XZ' = 'XY') {
  const sketch = createSketchOn(originPlaneSupport(plane), name)
  buildRectangle(sketch, { x: 0, y: 0 }, { x: 40, y: 25 })
  return sketch
}

function fullSource(overrides: Partial<ExportSource> = {}): ExportSource {
  const document: TectonicDocument = createDocument({ name: 'Bracket', now: NOW })
  const bodies: Body[] = [createBody('body-1', 'Solid 1', TETRAHEDRON)]
  return { document, bodies, sketch: sketchWithGeometry(), ...overrides }
}

describe('EXPORT_FORMATS', () => {
  it('offers only formats buildExport implements', () => {
    const source = fullSource()

    for (const format of EXPORT_FORMATS) {
      expect(exportUnavailableReason(format.id, source)).toBeNull()
      const files = buildExport(format.id, source)
      expect(files.length).toBeGreaterThan(0)
      for (const file of files) {
        expect(file.fileName).not.toBe('')
        expect(file.data.length).toBeGreaterThan(0)
      }
    }
  })

  it('names each file with the document title and the format extension', () => {
    const source = fullSource()

    for (const format of EXPORT_FORMATS) {
      const [first] = buildExport(format.id, source)
      expect(first?.fileName).toBe(`Bracket${format.extension}`)
    }
  })

  it('has no duplicate ids and knows the info for each', () => {
    const ids = EXPORT_FORMATS.map((format) => format.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(exportFormatInfo(id).id).toBe(id)
  })
})

describe('the .tectonic export', () => {
  it('writes the document back exactly as the file format reads it', () => {
    const source = fullSource()

    const [file] = buildExport('tectonic', source)

    expect(file?.fileName).toBe('Bracket.tectonic')
    expect(deserialize(String(file?.data))).toEqual(source.document)
  })
})

describe('exports that need geometry', () => {
  const noBodies = fullSource({ bodies: [] })

  it.each(['stl', 'stl-ascii', 'obj', 'gltf', '3mf', 'pdf'] as const)(
    'says why %s cannot be written without a solid',
    (format) => {
      expect(exportUnavailableReason(format, noBodies)).toMatch(/no solid bodies/)
      expect(() => buildExport(format, noBodies)).toThrow(ExportError)
    },
  )

  it('still writes the document itself when nothing has been modelled', () => {
    expect(exportUnavailableReason('tectonic', noBodies)).toBeNull()
    expect(buildExport('tectonic', noBodies)).toHaveLength(1)
  })

  it('merges every body into the single-mesh formats', () => {
    const two = fullSource({
      bodies: [createBody('a', 'A', TETRAHEDRON), createBody('b', 'B', TETRAHEDRON)],
    })

    const [ascii] = buildExport('stl-ascii', two)

    // Four facets per tetrahedron, both bodies present.
    expect(String(ascii?.data).match(/facet normal/g)).toHaveLength(8)
  })

  it('keeps bodies apart, under their own names, in OBJ', () => {
    const two = fullSource({
      bodies: [createBody('a', 'Base', TETRAHEDRON), createBody('b', 'Rib', TETRAHEDRON)],
    })

    const [obj, mtl] = buildExport('obj', two)

    expect(String(obj?.data)).toContain('Base')
    expect(String(obj?.data)).toContain('Rib')
    // OBJ is the one format that writes a second file.
    expect(mtl?.fileName).toMatch(/\.mtl$/)
  })

  it('converts to millimetres for the formats that declare no units', () => {
    const inches = fullSource({
      document: createDocument({ name: 'Bracket', units: 'in', now: NOW }),
      bodies: [createBody('body-1', 'Solid 1', TETRAHEDRON)],
    })

    const [ascii] = buildExport('stl-ascii', inches)

    // The 10-unit corner is 254 mm across.
    expect(String(ascii?.data)).toContain('254')
  })
})

describe('exports that need a sketch', () => {
  it.each(['dxf', 'svg'] as const)('says why %s cannot be written without one', (format) => {
    const source = fullSource({ sketch: null })

    expect(exportUnavailableReason(format, source)).toMatch(/no sketch/)
    expect(() => buildExport(format, source)).toThrow(ExportError)
  })

  it.each(['dxf', 'svg'] as const)('refuses to write an empty sketch as %s', (format) => {
    const source = fullSource({ sketch: createSketchOn(originPlaneSupport('XY'), 'Empty') })

    expect(exportUnavailableReason(format, source)).toMatch(/is empty/)
  })

  it('writes whichever sketch the editor has selected', () => {
    const [dxf] = buildExport('dxf', fullSource({ sketch: sketchWithGeometry('Other', 'XZ') }))

    expect(String(dxf?.data)).toContain('LINE')
  })
})
