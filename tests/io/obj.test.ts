import { describe, expect, it } from 'vitest'
import { exportObj, sanitizeObjName, writeMtl } from '../../src/io/ObjExporter'
import { DEFAULT_MATERIAL } from '../../src/io/types'
import type { MaterialSpec } from '../../src/io/types'
import { boxMesh, triangleMesh } from '../helpers/meshes'

const STEEL: MaterialSpec = {
  name: 'Stainless Steel',
  color: { r: 0.75, g: 0.76, b: 0.78 },
  opacity: 1,
  metallic: 0.9,
  roughness: 0.35,
}

describe('exportObj', () => {
  it('writes a known triangle in the standard layout', () => {
    const { obj } = exportObj(triangleMesh(), { name: 'tri' })

    expect(obj).toBe(
      [
        '# Tectonic OBJ export',
        '# 1 object(s)',
        'mtllib tri.mtl',
        'o tri',
        'g tri',
        'usemtl Tectonic_Default',
        'v 0 0 0',
        'v 1 0 0',
        'v 0 1 0',
        'vn 0 0 1',
        'vn 0 0 1',
        'vn 0 0 1',
        's 1',
        'f 1//1 2//2 3//3',
        '',
      ].join('\n'),
    )
  })

  it('writes one vertex and one face line per element of a box', () => {
    const { obj } = exportObj(boxMesh())

    expect(obj.match(/^v /gm)).toHaveLength(24)
    expect(obj.match(/^f /gm)).toHaveLength(12)
  })

  it('numbers faces across objects with a running offset', () => {
    const { obj } = exportObj([
      { name: 'first', mesh: triangleMesh() },
      { name: 'second', mesh: triangleMesh() },
    ])

    expect(obj).toContain('f 1//1 2//2 3//3')
    expect(obj).toContain('f 4//4 5//5 6//6')
    expect(obj.match(/^o /gm)).toHaveLength(2)
  })

  it('emits texture coordinates when the mesh carries them', () => {
    const { obj } = exportObj({
      name: 'uv',
      mesh: triangleMesh(),
      uvs: [0, 0, 1, 0, 0, 1],
    })

    expect(obj).toContain('vt 1 0')
    expect(obj).toContain('f 1/1/1 2/2/2 3/3/3')
  })

  it('omits normals when asked, leaving bare vertex references', () => {
    const { obj } = exportObj(triangleMesh(), { includeNormals: false })

    expect(obj).not.toContain('vn ')
    expect(obj).toContain('f 1 2 3')
  })

  it('references uvs without normals as v/vt', () => {
    const { obj } = exportObj(
      { name: 'uv', mesh: triangleMesh(), uvs: [0, 0, 1, 0, 0, 1] },
      { includeNormals: false },
    )

    expect(obj).toContain('f 1/1 2/2 3/3')
  })

  it('turns off the smoothing group for a faceted mesh', () => {
    const { obj } = exportObj({ name: 'flat', mesh: triangleMesh(), smooth: false })

    expect(obj).toContain('s off')
  })

  it('scales every coordinate', () => {
    const { obj } = exportObj(triangleMesh(), { scale: 25.4 })

    expect(obj).toContain('v 25.4 0 0')
  })

  it('drops the material lines when materials are off', () => {
    const result = exportObj(triangleMesh(), { includeMaterials: false })

    expect(result.obj).not.toContain('mtllib')
    expect(result.obj).not.toContain('usemtl')
    expect(result.mtl).toBe('')
  })

  it('names the material library after the part unless overridden', () => {
    expect(exportObj(triangleMesh(), { name: 'bracket' }).materialLibrary).toBe('bracket.mtl')
    expect(
      exportObj(triangleMesh(), { materialLibrary: 'shared.mtl' }).materialLibrary,
    ).toBe('shared.mtl')
  })

  it('ignores uvs that do not cover every vertex', () => {
    const { obj } = exportObj({ name: 'short', mesh: triangleMesh(), uvs: [0, 0] })

    expect(obj).not.toContain('vt ')
  })

  it('exports an empty mesh as an object with no geometry', () => {
    const { obj } = exportObj({ name: 'empty', mesh: { positions: [], normals: [], indices: [] } })

    expect(obj).toContain('o empty')
    expect(obj).not.toContain('\nv ')
  })
})

describe('the material library', () => {
  it('writes one block per distinct material', () => {
    const { mtl } = exportObj([
      { name: 'a', mesh: triangleMesh(), material: STEEL },
      { name: 'b', mesh: triangleMesh(), material: STEEL },
      { name: 'c', mesh: triangleMesh() },
    ])

    expect(mtl.match(/^newmtl /gm)).toHaveLength(2)
    expect(mtl).toContain('newmtl Stainless_Steel')
    expect(mtl).toContain('newmtl Tectonic_Default')
  })

  it('records the diffuse colour and the PBR pair', () => {
    const mtl = writeMtl([STEEL])

    expect(mtl).toContain('Kd 0.75 0.76 0.78')
    expect(mtl).toContain('Pm 0.9')
    expect(mtl).toContain('Pr 0.35')
    expect(mtl).toContain('illum 2')
  })

  it('switches illumination model for a transparent material', () => {
    const mtl = writeMtl([{ ...STEEL, opacity: 0.4 }])

    expect(mtl).toContain('d 0.4')
    expect(mtl).toContain('illum 4')
  })

  it('falls back to the default material when given none', () => {
    expect(writeMtl([])).toContain(`newmtl ${DEFAULT_MATERIAL.name.replace(' ', '_')}`)
  })
})

describe('sanitizeObjName', () => {
  it('replaces whitespace, which OBJ uses as its separator', () => {
    expect(sanitizeObjName('  Top  Plate ')).toBe('Top_Plate')
  })

  it('names an empty string rather than emitting nothing', () => {
    expect(sanitizeObjName('   ')).toBe('unnamed')
  })
})
