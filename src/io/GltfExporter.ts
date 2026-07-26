import type { MeshData } from '../domain/MeshData'
import { vertexCount } from '../domain/MeshData'
import type { MaterialSpec, NamedMesh } from './types'
import { DEFAULT_MATERIAL, ExportError } from './types'
import { toNamedMeshes } from './ObjExporter'
import { ByteWriter, encodeBase64 } from './binary'

/**
 * glTF 2.0 writing, in the .gltf (JSON) flavour with the binary payload
 * embedded as a data URI. One buffer holds every accessor of every mesh; each
 * bufferView is 4-byte aligned because the spec requires an accessor's offset
 * to be a multiple of its component size and every component here is 2 or 4
 * bytes wide.
 */

export const GLTF_VERSION = '2.0'
export const GLTF_GENERATOR = 'Tectonic'

/** Component types, as the spec numbers them. */
export const COMPONENT_UNSIGNED_SHORT = 5123
export const COMPONENT_UNSIGNED_INT = 5125
export const COMPONENT_FLOAT = 5126
/** bufferView targets. */
export const TARGET_ARRAY_BUFFER = 34962
export const TARGET_ELEMENT_ARRAY_BUFFER = 34963
/** Primitive mode 4 is TRIANGLES. */
export const MODE_TRIANGLES = 4
/** Beyond this an index no longer fits in an unsigned short. */
const MAX_SHORT_INDEX = 65535

export interface GltfExportOptions {
  readonly name?: string
  /** Uniform scale applied to every position, for unit conversion. */
  readonly scale?: number
  readonly includeUvs?: boolean
  /** Written into `asset.copyright` when given. */
  readonly copyright?: string
}

export interface GltfAsset {
  readonly version: string
  readonly generator: string
  readonly copyright?: string
}

export interface GltfAccessor {
  readonly bufferView: number
  readonly byteOffset: number
  readonly componentType: number
  readonly count: number
  readonly type: 'SCALAR' | 'VEC2' | 'VEC3'
  readonly min?: readonly number[]
  readonly max?: readonly number[]
}

export interface GltfBufferView {
  readonly buffer: number
  readonly byteOffset: number
  readonly byteLength: number
  readonly target?: number
}

export interface GltfPrimitive {
  readonly attributes: Readonly<Record<string, number>>
  readonly indices: number
  readonly material: number
  readonly mode: number
}

export interface GltfMesh {
  readonly name: string
  readonly primitives: readonly GltfPrimitive[]
}

export interface GltfNode {
  readonly name: string
  readonly mesh: number
}

export interface GltfMaterial {
  readonly name: string
  readonly pbrMetallicRoughness: {
    readonly baseColorFactor: readonly [number, number, number, number]
    readonly metallicFactor: number
    readonly roughnessFactor: number
  }
  readonly alphaMode: 'OPAQUE' | 'BLEND'
  readonly doubleSided: boolean
}

export interface GltfBuffer {
  readonly byteLength: number
  readonly uri: string
}

export interface GltfDocument {
  readonly asset: GltfAsset
  readonly scene: number
  readonly scenes: readonly { readonly name: string; readonly nodes: readonly number[] }[]
  readonly nodes: readonly GltfNode[]
  readonly meshes: readonly GltfMesh[]
  readonly materials: readonly GltfMaterial[]
  readonly accessors: readonly GltfAccessor[]
  readonly bufferViews: readonly GltfBufferView[]
  readonly buffers: readonly GltfBuffer[]
}

/** Builds the glTF as an object; `exportGltfJson` is the serialized form. */
export function exportGltf(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: GltfExportOptions = {},
): GltfDocument {
  const name = options.name ?? 'tectonic'
  const scale = options.scale ?? 1
  const withUvs = options.includeUvs ?? true

  const meshes = toNamedMeshes(source, name)
  if (meshes.length === 0) throw new ExportError('glTF export needs at least one mesh')

  const binary = new ByteWriter(1024)
  const accessors: GltfAccessor[] = []
  const bufferViews: GltfBufferView[] = []
  const gltfMeshes: GltfMesh[] = []
  const nodes: GltfNode[] = []
  const materials: GltfMaterial[] = []
  const materialIndices = new Map<string, number>()

  for (const entry of meshes) {
    const mesh = entry.mesh
    const vertices = vertexCount(mesh)
    if (vertices === 0 || mesh.indices.length === 0) {
      throw new ExportError(`Mesh "${entry.name}" has no geometry to export`)
    }

    const position = pushFloatAccessor(
      binary,
      bufferViews,
      accessors,
      scaled(mesh.positions, vertices * 3, scale),
      3,
      true,
    )
    const normals = mesh.normals.length >= vertices * 3 ? mesh.normals : null
    const normal =
      normals === null
        ? null
        : pushFloatAccessor(binary, bufferViews, accessors, scaled(normals, vertices * 3, 1), 3, false)
    const uv =
      withUvs && entry.uvs !== undefined && entry.uvs.length >= vertices * 2
        ? pushFloatAccessor(
            binary,
            bufferViews,
            accessors,
            scaled(entry.uvs, vertices * 2, 1),
            2,
            false,
          )
        : null
    const indices = pushIndexAccessor(binary, bufferViews, accessors, mesh.indices, vertices)

    const attributes: Record<string, number> = { POSITION: position }
    if (normal !== null) attributes.NORMAL = normal
    if (uv !== null) attributes.TEXCOORD_0 = uv

    const material = entry.material ?? DEFAULT_MATERIAL
    let materialIndex = materialIndices.get(material.name)
    if (materialIndex === undefined) {
      materialIndex = materials.length
      materials.push(toGltfMaterial(material))
      materialIndices.set(material.name, materialIndex)
    }

    gltfMeshes.push({
      name: entry.name,
      primitives: [{ attributes, indices, material: materialIndex, mode: MODE_TRIANGLES }],
    })
    nodes.push({ name: entry.name, mesh: gltfMeshes.length - 1 })
  }

  const bytes = binary.toBytes()
  const asset: GltfAsset = options.copyright
    ? { version: GLTF_VERSION, generator: GLTF_GENERATOR, copyright: options.copyright }
    : { version: GLTF_VERSION, generator: GLTF_GENERATOR }

  return {
    asset,
    scene: 0,
    scenes: [{ name, nodes: nodes.map((_node, index) => index) }],
    nodes,
    meshes: gltfMeshes,
    materials,
    accessors,
    bufferViews,
    buffers: [
      {
        byteLength: bytes.length,
        uri: `data:application/octet-stream;base64,${encodeBase64(bytes)}`,
      },
    ],
  }
}

export function exportGltfJson(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: GltfExportOptions = {},
): string {
  return `${JSON.stringify(exportGltf(source, options), null, 2)}\n`
}

/** A copy of the first `count` values, optionally scaled. */
function scaled(values: readonly number[], count: number, scale: number): number[] {
  const out = new Array<number>(count)
  for (let index = 0; index < count; index += 1) out[index] = (values[index] ?? 0) * scale
  return out
}

/**
 * Appends a float attribute and returns its accessor index. POSITION is the
 * one accessor the spec requires `min`/`max` on, which is what `withBounds` is.
 */
function pushFloatAccessor(
  binary: ByteWriter,
  bufferViews: GltfBufferView[],
  accessors: GltfAccessor[],
  values: readonly number[],
  components: number,
  withBounds: boolean,
): number {
  binary.align(4)
  const byteOffset = binary.length
  for (const value of values) binary.f32(value)

  bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: values.length * 4,
    target: TARGET_ARRAY_BUFFER,
  })

  const accessor: GltfAccessor = {
    bufferView: bufferViews.length - 1,
    byteOffset: 0,
    componentType: COMPONENT_FLOAT,
    count: values.length / components,
    type: components === 2 ? 'VEC2' : 'VEC3',
    ...(withBounds ? boundsOf(values, components) : {}),
  }
  accessors.push(accessor)
  return accessors.length - 1
}

function pushIndexAccessor(
  binary: ByteWriter,
  bufferViews: GltfBufferView[],
  accessors: GltfAccessor[],
  indices: readonly number[],
  vertices: number,
): number {
  const short = vertices - 1 <= MAX_SHORT_INDEX
  binary.align(4)
  const byteOffset = binary.length
  for (const index of indices) {
    if (short) binary.u16(index)
    else binary.u32(index)
  }

  bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: indices.length * (short ? 2 : 4),
    target: TARGET_ELEMENT_ARRAY_BUFFER,
  })
  accessors.push({
    bufferView: bufferViews.length - 1,
    byteOffset: 0,
    componentType: short ? COMPONENT_UNSIGNED_SHORT : COMPONENT_UNSIGNED_INT,
    count: indices.length,
    type: 'SCALAR',
  })
  return accessors.length - 1
}

/**
 * Per-component extremes of an interleaved attribute. Each value is rounded to
 * float32 first, so the bounds describe what the buffer actually holds rather
 * than the doubles we started from — a validator compares against the former.
 */
function boundsOf(
  values: readonly number[],
  components: number,
): { min: number[]; max: number[] } {
  const min = new Array<number>(components).fill(Infinity)
  const max = new Array<number>(components).fill(-Infinity)

  for (let index = 0; index < values.length; index += 1) {
    const axis = index % components
    const value = Math.fround(values[index] as number)
    min[axis] = Math.min(min[axis] as number, value)
    max[axis] = Math.max(max[axis] as number, value)
  }
  return { min, max }
}

function toGltfMaterial(material: MaterialSpec): GltfMaterial {
  const opacity = material.opacity ?? 1
  return {
    name: material.name,
    pbrMetallicRoughness: {
      baseColorFactor: [material.color.r, material.color.g, material.color.b, opacity],
      metallicFactor: material.metallic ?? 0,
      roughnessFactor: material.roughness ?? 0.6,
    },
    alphaMode: opacity < 1 ? 'BLEND' : 'OPAQUE',
    doubleSided: false,
  }
}
