import type { MeshData } from '../domain/MeshData'
import { triangleCount, vertexCount } from '../domain/MeshData'
import type { MaterialSpec } from './types'
import { DEFAULT_MATERIAL, ExportError } from './types'
import { ByteWriter, encodeUtf8 } from './binary'

/**
 * ECMA-363 (Universal 3D) writing, restricted to the uncompressed path.
 *
 * A U3D file is a flat sequence of blocks — a type, a data payload and an
 * optional metadata payload, each padded to four bytes — split into a
 * declaration section that names everything and a continuation section that
 * carries the geometry. The payloads are a *bit* stream rather than a byte
 * stream, which is why {@link U3dBitWriter} exists: every scalar is bit-packed,
 * and each byte is bit-reversed on the way in (`swapBits8`), which is what the
 * spec's own writer does.
 *
 * The spec also defines an arithmetic coder for the compressed contexts. None
 * of it is used here: every value goes out through a static context, which the
 * spec defines as written verbatim. That costs file size and rules out the
 * progressive (CLOD) refinement levels, but it keeps the encoder small enough
 * to be read and round-trip tested against {@link U3dBitReader} rather than
 * taken on faith.
 *
 * What this produces is a single-resolution mesh per body, with one material
 * each and a node per body hanging off the scene root — enough for the model
 * tree and shading a 3D PDF viewer shows, and nothing more.
 */

/** Block types, as ECMA-363 numbers them. */
export const U3D_BLOCK = {
  fileHeader: 0x00443355,
  modifierChain: 0xffffff14,
  groupNode: 0xffffff21,
  modelNode: 0xffffff22,
  shadingModifier: 0xffffff45,
  litTextureShader: 0xffffff53,
  materialResource: 0xffffff54,
  clodMeshDeclaration: 0xffffff31,
  clodBaseMeshContinuation: 0xffffff3b,
} as const

/** Character encoding 106 is UTF-8 in the IANA registry the spec points at. */
export const U3D_UTF8 = 106
export const U3D_VERSION = 0
export const U3D_PROFILE_BASE = 0
/** Modifier chain types. */
const CHAIN_NODE = 0
const CHAIN_MODEL_RESOURCE = 1
/** Model visibility: front and back faces both drawn. */
const VISIBILITY_BOTH = 3
/** Shading modifier applies to a mesh. */
const SHADING_MESH = 2
/** Material attributes: ambient | diffuse | specular | emissive | reflectivity | opacity. */
const MATERIAL_ALL = 0x3f
/** Shader attributes: lighting enabled. */
const SHADER_LIGHTING = 1

/** Nibble bit-reversal table behind `swapBits8`. */
const SWAP_NIBBLE = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15] as const

/** Reverses the bit order of a byte. Its own inverse, so the reader reuses it. */
export function swapBits8(value: number): number {
  const byte = value & 0xff
  return (((SWAP_NIBBLE[byte & 0xf] as number) << 4) | (SWAP_NIBBLE[byte >> 4] as number)) & 0xff
}

const SCRATCH = new DataView(new ArrayBuffer(8))

/**
 * Bit-level sink for a block payload. Bits accumulate least-significant-first
 * into 32-bit words, which is the order the spec's reader pulls them back out
 * in; `toBytes` emits those words little-endian.
 */
export class U3dBitWriter {
  readonly #words: number[] = []
  #current = 0
  #bits = 0

  /** Bits written so far. */
  get bitLength(): number {
    return this.#words.length * 32 + this.#bits
  }

  writeBits(value: number, count: number): void {
    let source = value >>> 0
    let remaining = count

    while (remaining > 0) {
      const take = Math.min(32 - this.#bits, remaining)
      // `take` never exceeds the room left, so the shifted chunk always fits in
      // the current word and the addition below is an OR in disguise.
      const chunk = take === 32 ? source : source & ((1 << take) - 1)
      this.#current = (this.#current + chunk * 2 ** this.#bits) >>> 0
      this.#bits += take
      if (this.#bits === 32) {
        this.#words.push(this.#current >>> 0)
        this.#current = 0
        this.#bits = 0
      }
      source = take === 32 ? 0 : source >>> take
      remaining -= take
    }
  }

  writeU8(value: number): void {
    this.writeBits(swapBits8(value), 8)
  }

  writeU16(value: number): void {
    this.writeU8(value & 0xff)
    this.writeU8((value >>> 8) & 0xff)
  }

  writeU32(value: number): void {
    this.writeU16(value & 0xffff)
    this.writeU16((value >>> 16) & 0xffff)
  }

  /** Split into two 32-bit halves; sizes here never approach 2^53 anyway. */
  writeU64(value: number): void {
    this.writeU32(value >>> 0)
    this.writeU32(Math.floor(value / 2 ** 32) >>> 0)
  }

  writeI16(value: number): void {
    this.writeU16(value & 0xffff)
  }

  writeI32(value: number): void {
    this.writeU32(value >>> 0)
  }

  writeF32(value: number): void {
    SCRATCH.setFloat32(0, value, true)
    this.writeU32(SCRATCH.getUint32(0, true))
  }

  /** A length-prefixed UTF-8 string, as the spec's `String` type. */
  writeString(text: string): void {
    const bytes = encodeUtf8(text)
    this.writeU16(bytes.length)
    for (const byte of bytes) this.writeU8(byte)
  }

  /** The payload, zero-padded up to the next whole byte. */
  toBytes(): Uint8Array {
    const out = new ByteWriter(this.#words.length * 4 + 4)
    for (const word of this.#words) out.u32(word)
    for (let bit = 0; bit < this.#bits; bit += 8) {
      out.u8((this.#current >>> bit) & 0xff)
    }
    return out.toBytes()
  }
}

/** The read side of {@link U3dBitWriter}, so a payload can be checked. */
export class U3dBitReader {
  readonly #bytes: Uint8Array
  #cursor = 0

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes
  }

  readBits(count: number): number {
    let value = 0
    for (let bit = 0; bit < count; bit += 1) {
      const position = this.#cursor + bit
      const byte = this.#bytes[position >> 3] ?? 0
      value += ((byte >> (position & 7)) & 1) * 2 ** bit
    }
    this.#cursor += count
    return value >>> 0
  }

  readU8(): number {
    return swapBits8(this.readBits(8))
  }

  readU16(): number {
    return this.readU8() | (this.readU8() << 8)
  }

  readU32(): number {
    return (this.readU16() | (this.readU16() << 16)) >>> 0
  }

  readU64(): number {
    const low = this.readU32()
    return this.readU32() * 2 ** 32 + low
  }

  readI16(): number {
    const value = this.readU16()
    return value >= 0x8000 ? value - 0x10000 : value
  }

  readI32(): number {
    return this.readU32() | 0
  }

  readF32(): number {
    SCRATCH.setUint32(0, this.readU32(), true)
    return SCRATCH.getFloat32(0, true)
  }

  readString(): string {
    const length = this.readU16()
    const bytes = new Uint8Array(length)
    for (let index = 0; index < length; index += 1) bytes[index] = this.readU8()
    return new TextDecoder().decode(bytes)
  }
}

/** One block, as the reader hands it back. */
export interface U3dBlock {
  readonly type: number
  readonly data: Uint8Array
  readonly metaData: Uint8Array
}

/** Rounds a length up to the four-byte boundary every block payload sits on. */
function padded(length: number): number {
  return (length + 3) & ~3
}

/** Serialises one block: type, sizes, then each payload padded to four bytes. */
export function writeU3dBlock(type: number, data: Uint8Array, metaData?: Uint8Array): Uint8Array {
  const meta = metaData ?? new Uint8Array(0)
  const out = new ByteWriter(12 + padded(data.length) + padded(meta.length))
  out.u32(type)
  out.u32(data.length)
  out.u32(meta.length)
  out.raw(data)
  for (let pad = data.length; pad < padded(data.length); pad += 1) out.u8(0)
  out.raw(meta)
  for (let pad = meta.length; pad < padded(meta.length); pad += 1) out.u8(0)
  return out.toBytes()
}

/** Splits a U3D file back into blocks. Used by the tests and by nothing else. */
export function readU3dBlocks(bytes: Uint8Array): U3dBlock[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const blocks: U3dBlock[] = []
  let offset = 0

  while (offset + 12 <= bytes.length) {
    const type = view.getUint32(offset, true)
    const dataSize = view.getUint32(offset + 4, true)
    const metaSize = view.getUint32(offset + 8, true)
    const dataStart = offset + 12
    const metaStart = dataStart + padded(dataSize)
    const end = metaStart + padded(metaSize)
    if (end > bytes.length) break

    blocks.push({
      type,
      data: bytes.subarray(dataStart, dataStart + dataSize),
      metaData: bytes.subarray(metaStart, metaStart + metaSize),
    })
    offset = end
  }
  return blocks
}

/* -------------------------------------------------------------------------- */
/* Scene assembly                                                              */
/* -------------------------------------------------------------------------- */

/** One body on its way into a U3D scene. */
export interface U3dMesh {
  readonly name: string
  readonly mesh: MeshData
  readonly material?: MaterialSpec
}

export interface U3dOptions {
  /** Name of the group node every mesh node parents to. */
  readonly rootName?: string
  /** Uniform scale applied to every position, for unit conversion. */
  readonly scale?: number
}

/** The identity transform, row-major, as the node blocks want it. */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const

/**
 * A whole U3D file for the given bodies.
 *
 * Declaration blocks come first because the header has to state how many bytes
 * they occupy, and a reader is entitled to stop there and still know the scene
 * graph. The header itself is written twice: once to measure, once with the
 * real sizes filled in.
 */
export function encodeU3d(meshes: readonly U3dMesh[], options: U3dOptions = {}): Uint8Array {
  if (meshes.length === 0) throw new ExportError('U3D export needs at least one mesh')

  const rootName = options.rootName ?? 'Scene'
  const scale = options.scale ?? 1
  const declarations: Uint8Array[] = [groupNodeBlock(rootName)]
  const continuations: Uint8Array[] = []
  const used = new Set<string>()

  meshes.forEach((entry, index) => {
    const mesh = entry.mesh
    if (vertexCount(mesh) === 0 || triangleCount(mesh) === 0) {
      throw new ExportError(`Mesh "${entry.name}" has no geometry to export`)
    }

    const name = uniqueName(entry.name === '' ? `Mesh ${index + 1}` : entry.name, used)
    const material = entry.material ?? DEFAULT_MATERIAL
    const shaderName = `${name} Shader`
    const materialName = `${name} Material`

    declarations.push(
      modelNodeBlock(name, rootName, name),
      shadingModifierBlock(name, shaderName),
      meshResourceChainBlock(name, mesh),
      litTextureShaderBlock(shaderName, materialName),
      materialResourceBlock(materialName, material),
    )
    continuations.push(baseMeshContinuationBlock(name, mesh, scale))
  })

  const declarationBytes = totalLength(declarations)
  const continuationBytes = totalLength(continuations)
  // The header block's own length is fixed, so measuring it once is enough.
  const headerLength = fileHeaderBlock(0, 0).length
  const header = fileHeaderBlock(
    headerLength + declarationBytes,
    headerLength + declarationBytes + continuationBytes,
  )

  const out = new ByteWriter(header.length + declarationBytes + continuationBytes)
  out.raw(header)
  for (const block of declarations) out.raw(block)
  for (const block of continuations) out.raw(block)
  return out.toBytes()
}

function totalLength(blocks: readonly Uint8Array[]): number {
  return blocks.reduce((sum, block) => sum + block.length, 0)
}

/** Node names have to be unique inside a file; collisions get a suffix. */
function uniqueName(name: string, used: Set<string>): string {
  let candidate = name
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${name} (${suffix})`
    suffix += 1
  }
  used.add(candidate)
  return candidate
}

function fileHeaderBlock(declarationSize: number, fileSize: number): Uint8Array {
  const bits = new U3dBitWriter()
  bits.writeI16(U3D_VERSION)
  bits.writeU32(U3D_PROFILE_BASE)
  bits.writeU32(declarationSize)
  bits.writeU64(fileSize)
  bits.writeU32(U3D_UTF8)
  return writeU3dBlock(U3D_BLOCK.fileHeader, bits.toBytes())
}

/** The scene root: a group node with no parent, wrapped in its modifier chain. */
function groupNodeBlock(name: string): Uint8Array {
  const node = new U3dBitWriter()
  node.writeString(name)
  node.writeU32(1)
  node.writeString('')
  for (const value of IDENTITY) node.writeF32(value)
  return modifierChain(name, CHAIN_NODE, [
    writeU3dBlock(U3D_BLOCK.groupNode, node.toBytes()),
  ])
}

function modelNodeBlock(name: string, parent: string, resource: string): Uint8Array {
  const node = new U3dBitWriter()
  node.writeString(name)
  node.writeU32(1)
  node.writeString(parent)
  for (const value of IDENTITY) node.writeF32(value)
  node.writeString(resource)
  node.writeU32(VISIBILITY_BOTH)
  return modifierChain(name, CHAIN_NODE, [
    writeU3dBlock(U3D_BLOCK.modelNode, node.toBytes()),
  ])
}

/**
 * The shading modifier rides in the node's own chain, so it is emitted as a
 * second chain with the same name — which is how the spec has a node collect
 * more than one modifier without the writer buffering the whole chain.
 */
function shadingModifierBlock(nodeName: string, shaderName: string): Uint8Array {
  const modifier = new U3dBitWriter()
  modifier.writeString(nodeName)
  modifier.writeU32(1)
  modifier.writeU32(SHADING_MESH)
  modifier.writeU32(1)
  modifier.writeU32(1)
  modifier.writeString(shaderName)
  return writeU3dBlock(U3D_BLOCK.shadingModifier, modifier.toBytes())
}

function meshResourceChainBlock(name: string, mesh: MeshData): Uint8Array {
  return modifierChain(name, CHAIN_MODEL_RESOURCE, [clodMeshDeclarationBlock(name, mesh)])
}

/**
 * Wraps modifier blocks in the chain that owns them. The attributes word is
 * zero: no bounding sphere and no bounding box, so nothing follows it but the
 * padding the spec puts before the modifier count.
 */
function modifierChain(name: string, type: number, modifiers: readonly Uint8Array[]): Uint8Array {
  const bits = new U3dBitWriter()
  bits.writeString(name)
  bits.writeU32(type)
  bits.writeU32(0)
  const header = bits.toBytes()

  const out = new ByteWriter(header.length + 8)
  out.raw(header)
  out.align(4)
  out.u32(modifiers.length)
  for (const modifier of modifiers) out.raw(modifier)
  return writeU3dBlock(U3D_BLOCK.modifierChain, out.toBytes())
}

/**
 * Declares the mesh's shape without any of its data. Minimum and maximum
 * resolution are both the full vertex count: there is one level of detail, so
 * the reader never has to run the progressive path.
 */
function clodMeshDeclarationBlock(name: string, mesh: MeshData): Uint8Array {
  const faces = triangleCount(mesh)
  const vertices = vertexCount(mesh)
  const bits = new U3dBitWriter()

  bits.writeString(name)
  bits.writeU32(0)

  // Max mesh description.
  bits.writeU32(0)
  bits.writeU32(faces)
  bits.writeU32(vertices)
  bits.writeU32(vertices)
  bits.writeU32(0)
  bits.writeU32(0)
  bits.writeU32(0)
  bits.writeU32(1)
  // The single shading description: no per-vertex colours, no texture layers.
  bits.writeU32(0)
  bits.writeU32(0)
  bits.writeU32(0)

  // CLOD description: one resolution, so both bounds are the vertex count.
  bits.writeU32(vertices)
  bits.writeU32(vertices)

  // Resource description: quality factors, then the inverse quantisation and
  // crease parameters. Quantisation is 1.0 because nothing is quantised.
  bits.writeU32(1000)
  bits.writeU32(1000)
  bits.writeU32(1000)
  for (let index = 0; index < 5; index += 1) bits.writeF32(1)
  bits.writeF32(0)
  bits.writeF32(0)
  bits.writeF32(0)

  // Skeleton description: no bones.
  bits.writeU32(0)
  return writeU3dBlock(U3D_BLOCK.clodMeshDeclaration, bits.toBytes())
}

/**
 * The geometry itself. Positions and normals go out as plain floats and the
 * face corners as plain indices — the spec would range-code both, and a reader
 * that insists on that will not accept this.
 */
function baseMeshContinuationBlock(name: string, mesh: MeshData, scale: number): Uint8Array {
  const faces = triangleCount(mesh)
  const vertices = vertexCount(mesh)
  const hasNormals = mesh.normals.length >= vertices * 3
  const bits = new U3dBitWriter()

  bits.writeString(name)
  bits.writeU32(0)

  bits.writeU32(faces)
  bits.writeU32(vertices)
  bits.writeU32(hasNormals ? vertices : 0)
  bits.writeU32(0)
  bits.writeU32(0)
  bits.writeU32(0)

  for (let index = 0; index < vertices * 3; index += 1) {
    bits.writeF32((mesh.positions[index] ?? 0) * scale)
  }
  if (hasNormals) {
    for (let index = 0; index < vertices * 3; index += 1) bits.writeF32(mesh.normals[index] ?? 0)
  }

  for (let face = 0; face < faces; face += 1) {
    bits.writeU32(0)
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = mesh.indices[face * 3 + corner] ?? 0
      bits.writeU32(vertex)
      if (hasNormals) bits.writeU32(vertex)
    }
  }
  return writeU3dBlock(U3D_BLOCK.clodBaseMeshContinuation, bits.toBytes())
}

function litTextureShaderBlock(shaderName: string, materialName: string): Uint8Array {
  const bits = new U3dBitWriter()
  bits.writeString(shaderName)
  bits.writeU32(SHADER_LIGHTING)
  bits.writeF32(0)
  bits.writeU32(0x0201)
  bits.writeU32(0x0604)
  bits.writeU32(1)
  bits.writeU32(0)
  bits.writeU32(0)
  bits.writeString(materialName)
  return writeU3dBlock(U3D_BLOCK.litTextureShader, bits.toBytes())
}

/**
 * Colour comes across as diffuse, with a dim ambient derived from it so a body
 * is not pitch black on its shadowed side, and specular scaled by metallic —
 * the closest a fixed-function shading model gets to a PBR material.
 */
function materialResourceBlock(name: string, material: MaterialSpec): Uint8Array {
  const { r, g, b } = material.color
  const specular = 1 - (material.roughness ?? 0.6)
  const bits = new U3dBitWriter()

  bits.writeString(name)
  bits.writeU32(MATERIAL_ALL)
  for (const channel of [r, g, b]) bits.writeF32(channel * 0.25)
  for (const channel of [r, g, b]) bits.writeF32(channel)
  for (let index = 0; index < 3; index += 1) bits.writeF32(specular)
  for (let index = 0; index < 3; index += 1) bits.writeF32(0)
  bits.writeF32(material.metallic ?? 0)
  bits.writeF32(material.opacity ?? 1)
  return writeU3dBlock(U3D_BLOCK.materialResource, bits.toBytes())
}
