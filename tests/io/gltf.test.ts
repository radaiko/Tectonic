import { describe, expect, it } from 'vitest'
import {
  COMPONENT_FLOAT,
  COMPONENT_UNSIGNED_SHORT,
  GLTF_VERSION,
  MODE_TRIANGLES,
  TARGET_ARRAY_BUFFER,
  TARGET_ELEMENT_ARRAY_BUFFER,
  exportGltf,
  exportGltfJson,
} from '../../src/io/GltfExporter'
import type { GltfDocument } from '../../src/io/GltfExporter'
import { decodeBase64 } from '../../src/io/binary'
import { ExportError } from '../../src/io/types'
import { boxMesh, triangleMesh } from '../helpers/meshes'

/** The embedded buffer, decoded back to bytes. */
function bufferBytes(gltf: GltfDocument): Uint8Array {
  const uri = gltf.buffers[0]?.uri as string
  return decodeBase64(uri.slice(uri.indexOf(',') + 1))
}

/** Reads an accessor back out of the buffer as plain numbers. */
function readAccessor(gltf: GltfDocument, index: number): number[] {
  const accessor = gltf.accessors[index]
  if (!accessor) throw new Error(`No accessor ${index}`)
  const view = gltf.bufferViews[accessor.bufferView]
  if (!view) throw new Error('Accessor points at no buffer view')

  const bytes = bufferBytes(gltf)
  const data = new DataView(bytes.buffer, bytes.byteOffset + view.byteOffset + accessor.byteOffset)
  const components = accessor.type === 'SCALAR' ? 1 : accessor.type === 'VEC2' ? 2 : 3
  const values: number[] = []

  for (let element = 0; element < accessor.count * components; element += 1) {
    if (accessor.componentType === COMPONENT_FLOAT) values.push(data.getFloat32(element * 4, true))
    else if (accessor.componentType === COMPONENT_UNSIGNED_SHORT) {
      values.push(data.getUint16(element * 2, true))
    } else values.push(data.getUint32(element * 4, true))
  }
  return values
}

describe('exportGltf', () => {
  it('declares a 2.0 asset produced by Tectonic', () => {
    const gltf = exportGltf(triangleMesh())

    expect(gltf.asset.version).toBe(GLTF_VERSION)
    expect(gltf.asset.generator).toBe('Tectonic')
    expect(gltf.asset.copyright).toBeUndefined()
  })

  it('records a copyright when one is given', () => {
    expect(exportGltf(triangleMesh(), { copyright: 'ACME' }).asset.copyright).toBe('ACME')
  })

  it('builds the scene → node → mesh chain', () => {
    const gltf = exportGltf({ name: 'Bracket', mesh: triangleMesh() })

    expect(gltf.scene).toBe(0)
    expect(gltf.scenes[0]?.nodes).toEqual([0])
    expect(gltf.nodes[0]).toEqual({ name: 'Bracket', mesh: 0 })
    expect(gltf.meshes[0]?.name).toBe('Bracket')
    expect(gltf.meshes[0]?.primitives[0]?.mode).toBe(MODE_TRIANGLES)
  })

  it('gives the primitive a POSITION, NORMAL and index accessor', () => {
    const gltf = exportGltf(triangleMesh())
    const primitive = gltf.meshes[0]?.primitives[0]

    expect(Object.keys(primitive?.attributes ?? {})).toEqual(['POSITION', 'NORMAL'])
    expect(gltf.accessors).toHaveLength(3)
    expect(readAccessor(gltf, primitive?.attributes.POSITION as number)).toEqual([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ])
    expect(readAccessor(gltf, primitive?.attributes.NORMAL as number)).toEqual([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ])
    expect(readAccessor(gltf, primitive?.indices as number)).toEqual([0, 1, 2])
  })

  it('gives POSITION the min and max the spec requires', () => {
    const gltf = exportGltf(boxMesh(2, 3, 4))
    const position = gltf.accessors[
      gltf.meshes[0]?.primitives[0]?.attributes.POSITION as number
    ]

    expect(position?.min).toEqual([0, 0, 0])
    expect(position?.max).toEqual([2, 3, 4])
  })

  it('leaves min and max off the other accessors', () => {
    const gltf = exportGltf(triangleMesh())

    expect(gltf.accessors[1]?.min).toBeUndefined()
    expect(gltf.accessors[2]?.min).toBeUndefined()
  })

  it('targets attribute and index buffer views separately', () => {
    const gltf = exportGltf(triangleMesh())
    const targets = gltf.bufferViews.map((view) => view.target)

    expect(targets).toEqual([
      TARGET_ARRAY_BUFFER,
      TARGET_ARRAY_BUFFER,
      TARGET_ELEMENT_ARRAY_BUFFER,
    ])
  })

  it('aligns every buffer view to four bytes', () => {
    const gltf = exportGltf({ name: 'uv', mesh: triangleMesh(), uvs: [0, 0, 1, 0, 0, 1] })

    for (const view of gltf.bufferViews) expect(view.byteOffset % 4).toBe(0)
  })

  it('embeds the buffer as a base64 data URI of the right length', () => {
    const gltf = exportGltf(triangleMesh())

    expect(gltf.buffers[0]?.uri.startsWith('data:application/octet-stream;base64,')).toBe(true)
    // 9 positions + 9 normals as float32, then 3 indices as uint16 padded to 4.
    expect(gltf.buffers[0]?.byteLength).toBe(9 * 4 + 9 * 4 + 6)
    expect(bufferBytes(gltf)).toHaveLength(gltf.buffers[0]?.byteLength as number)
  })

  it('uses unsigned short indices for a small mesh', () => {
    const gltf = exportGltf(triangleMesh())

    expect(gltf.accessors[2]?.componentType).toBe(COMPONENT_UNSIGNED_SHORT)
  })

  it('adds TEXCOORD_0 when the mesh has uvs', () => {
    const gltf = exportGltf({ name: 'uv', mesh: triangleMesh(), uvs: [0, 0, 1, 0, 0, 1] })
    const uv = gltf.meshes[0]?.primitives[0]?.attributes.TEXCOORD_0

    expect(uv).toBe(2)
    expect(readAccessor(gltf, uv as number)).toEqual([0, 0, 1, 0, 0, 1])
  })

  it('scales positions but leaves normals unit length', () => {
    const gltf = exportGltf(triangleMesh(), { scale: 10 })

    expect(readAccessor(gltf, 0)).toEqual([0, 0, 0, 10, 0, 0, 0, 10, 0])
    expect(readAccessor(gltf, 1)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1])
  })

  it('writes one PBR material and shares it between meshes', () => {
    const gltf = exportGltf([
      { name: 'a', mesh: triangleMesh() },
      { name: 'b', mesh: triangleMesh() },
    ])

    expect(gltf.materials).toHaveLength(1)
    expect(gltf.meshes[1]?.primitives[0]?.material).toBe(0)
    expect(gltf.materials[0]?.pbrMetallicRoughness.baseColorFactor).toHaveLength(4)
    expect(gltf.materials[0]?.alphaMode).toBe('OPAQUE')
  })

  it('blends a material that is not fully opaque', () => {
    const gltf = exportGltf({
      name: 'glass',
      mesh: triangleMesh(),
      material: { name: 'Glass', color: { r: 0.2, g: 0.4, b: 0.9 }, opacity: 0.3 },
    })

    expect(gltf.materials[0]?.alphaMode).toBe('BLEND')
    expect(gltf.materials[0]?.pbrMetallicRoughness.baseColorFactor).toEqual([0.2, 0.4, 0.9, 0.3])
  })

  it('rejects a mesh with no geometry', () => {
    expect(() =>
      exportGltf({ name: 'empty', mesh: { positions: [], normals: [], indices: [] } }),
    ).toThrow(ExportError)
  })

  it('rejects an empty mesh list', () => {
    expect(() => exportGltf([])).toThrow('at least one mesh')
  })
})

describe('exportGltfJson', () => {
  it('produces JSON that parses back to the same document', () => {
    const json = exportGltfJson(triangleMesh(), { name: 'tri' })

    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(exportGltf(triangleMesh(), { name: 'tri' }))))
    expect(json.endsWith('\n')).toBe(true)
  })

  it('has every top-level array the glTF schema expects', () => {
    const gltf = JSON.parse(exportGltfJson(boxMesh())) as Record<string, unknown>

    for (const key of ['asset', 'scenes', 'nodes', 'meshes', 'accessors', 'bufferViews', 'buffers']) {
      expect(gltf[key]).toBeDefined()
    }
  })
})
