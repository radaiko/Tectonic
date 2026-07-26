import { describe, expect, it } from 'vitest'
import {
  THREEMF_CONTENT_TYPES_PATH,
  THREEMF_MODEL_PATH,
  THREEMF_RELS_PATH,
  displayColor,
  exportThreeMf,
  threeMfModelXml,
} from '../../src/io/ThreeMfExporter'
import { readZip, readZipText } from '../../src/io/zip'
import { findAll, parseXml } from '../../src/io/xml'
import { ExportError } from '../../src/io/types'
import { boxMesh, triangleMesh } from '../helpers/meshes'

describe('the 3MF package', () => {
  it('holds the content types, the relationship and the model', () => {
    const entries = readZip(exportThreeMf(triangleMesh()))

    expect(entries.map((entry) => entry.name)).toEqual([
      THREEMF_CONTENT_TYPES_PATH,
      THREEMF_RELS_PATH,
      THREEMF_MODEL_PATH,
    ])
  })

  it('declares the 3MF media type for .model parts', () => {
    const xml = readZipText(readZip(exportThreeMf(triangleMesh())), THREEMF_CONTENT_TYPES_PATH)

    expect(xml).toContain('application/vnd.ms-package.3dmanufacturing-3dmodel+xml')
    expect(parseXml(xml).tag).toBe('Types')
  })

  it('points the package relationship at the model part', () => {
    const xml = readZipText(readZip(exportThreeMf(triangleMesh())), THREEMF_RELS_PATH)
    const relationship = findAll(parseXml(xml), 'relationship')[0]

    expect(relationship?.attrs.Target).toBe(`/${THREEMF_MODEL_PATH}`)
    expect(relationship?.attrs.Type).toContain('3dmodel')
  })

  it('is reproducible for the same mesh and date', () => {
    const options = { modified: new Date(Date.UTC(2026, 6, 26)) }

    expect([...exportThreeMf(boxMesh(), options)]).toEqual([...exportThreeMf(boxMesh(), options)])
  })
})

describe('threeMfModelXml', () => {
  it('writes a vertex per position and a triangle per face', () => {
    const model = parseXml(threeMfModelXml(boxMesh()))

    expect(findAll(model, 'vertex')).toHaveLength(24)
    expect(findAll(model, 'triangle')).toHaveLength(12)
  })

  it('writes the triangle winding the mesh has', () => {
    const triangle = findAll(parseXml(threeMfModelXml(triangleMesh())), 'triangle')[0]

    expect(triangle?.attrs).toMatchObject({ v1: '0', v2: '1', v3: '2' })
  })

  it('writes coordinates scaled and trimmed', () => {
    const vertex = findAll(parseXml(threeMfModelXml(triangleMesh(), { scale: 25.4 })), 'vertex')[1]

    expect(vertex?.attrs).toMatchObject({ x: '25.4', y: '0', z: '0' })
  })

  it('records the document unit on the model element', () => {
    expect(threeMfModelXml(triangleMesh(), { units: 'in' })).toContain('unit="inch"')
    expect(threeMfModelXml(triangleMesh())).toContain('unit="millimeter"')
  })

  it('builds every object it declares', () => {
    const model = parseXml(
      threeMfModelXml([
        { name: 'left', mesh: triangleMesh() },
        { name: 'right', mesh: triangleMesh() },
      ]),
    )
    const objects = findAll(model, 'object')
    const items = findAll(model, 'item')

    expect(objects.map((object) => object.attrs.id)).toEqual(['2', '3'])
    expect(items.map((item) => item.attrs.objectid)).toEqual(['2', '3'])
    expect(objects[0]?.attrs.name).toBe('left')
  })

  it('shares one base material entry between meshes that use it', () => {
    const material = { name: 'Brass', color: { r: 1, g: 0.8, b: 0.2 } }
    const model = parseXml(
      threeMfModelXml([
        { name: 'a', mesh: triangleMesh(), material },
        { name: 'b', mesh: triangleMesh(), material },
      ]),
    )

    expect(findAll(model, 'base')).toHaveLength(1)
    expect(findAll(model, 'object').every((object) => object.attrs.pindex === '0')).toBe(true)
  })

  it('gives each distinct material its own index', () => {
    const model = parseXml(
      threeMfModelXml([
        { name: 'a', mesh: triangleMesh(), material: { name: 'Brass', color: { r: 1, g: 0, b: 0 } } },
        { name: 'b', mesh: triangleMesh() },
      ]),
    )

    expect(findAll(model, 'object').map((object) => object.attrs.pindex)).toEqual(['0', '1'])
  })

  it('escapes a name that would break the XML', () => {
    const model = threeMfModelXml({ name: 'Bracket <A & B>', mesh: triangleMesh() })

    expect(model).toContain('name="Bracket &lt;A &amp; B&gt;"')
    expect(() => parseXml(model)).not.toThrow()
  })

  it('rejects an empty mesh list', () => {
    expect(() => threeMfModelXml([])).toThrow(ExportError)
  })
})

describe('displayColor', () => {
  it('writes sRGB hex with an alpha channel', () => {
    expect(displayColor({ r: 1, g: 0, b: 0.5 }, 1)).toBe('#FF0080FF')
  })

  it('clamps out-of-range channels', () => {
    expect(displayColor({ r: 2, g: -1, b: 0 }, 0.5)).toBe('#FF000080')
  })
})
