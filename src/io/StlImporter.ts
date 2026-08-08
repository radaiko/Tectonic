import type { MeshData } from '../domain/MeshData'
import { MeshBuilder } from './meshBuilder'
import { ImportError } from './types'
import { STL_FACET_BYTES, STL_HEADER_BYTES } from './StlExporter'
import type { StlFormat } from './StlExporter'

/**
 * STL reading for both flavours. The file's facet normals are kept for callers
 * that care, but the mesh's own normals are always recomputed from the winding —
 * plenty of STL writers emit normals that disagree with their triangles.
 */

export interface StlImportOptions {
  /** Merge coincident facet corners into shared vertices. On by default. */
  readonly weld?: boolean
  readonly weldTolerance?: number
  /** Uniform scale applied to every coordinate, for unit conversion. */
  readonly scale?: number
}

export interface StlImportResult {
  readonly mesh: MeshData
  readonly name: string
  readonly format: StlFormat
  /** Facets read from the file, before degenerate ones were dropped. */
  readonly facetCount: number
  /** Flat [nx, ny, nz, ...] as written in the file, one triple per facet. */
  readonly facetNormals: readonly number[]
}

export function toBytes(source: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof source === 'string') return new TextEncoder().encode(source)
  return source instanceof Uint8Array ? source : new Uint8Array(source)
}

/**
 * Binary STL is recognised by its size: header, count, then exactly `count`
 * fixed-width facets. The leading "solid" keyword cannot be trusted — several
 * CAD packages write it at the head of a binary file.
 */
export function isBinaryStl(bytes: Uint8Array): boolean {
  if (bytes.length < STL_HEADER_BYTES + 4) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const facets = view.getUint32(STL_HEADER_BYTES, true)
  return bytes.length === STL_HEADER_BYTES + 4 + facets * STL_FACET_BYTES
}

export function importStl(
  source: string | ArrayBuffer | Uint8Array,
  options: StlImportOptions = {},
): StlImportResult {
  const bytes = toBytes(source)
  if (bytes.length === 0) throw new ImportError('STL file is empty')
  return isBinaryStl(bytes)
    ? importBinaryStl(bytes, options)
    : importAsciiStl(new TextDecoder().decode(bytes), options)
}

export function importAsciiStl(text: string, options: StlImportOptions = {}): StlImportResult {
  const scale = options.scale ?? 1
  const builder = new MeshBuilder(meshBuilderOptions(options))
  const facetNormals: number[] = []

  const nameMatch = /^\s*solid[ \t]*([^\r\n]*)/.exec(text)
  if (!nameMatch) throw new ImportError('ASCII STL must begin with "solid"')
  const name = nameMatch[1]?.trim() ?? ''

  let facetCount = 0
  let corners: [number, number, number][] = []
  let sawFacet = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('facet normal')) {
      sawFacet = true
      const normal = readNumbers(line.slice('facet normal'.length), 3)
      facetNormals.push(normal[0] as number, normal[1] as number, normal[2] as number)
      corners = []
      continue
    }
    if (line.startsWith('vertex')) {
      const values = readNumbers(line.slice('vertex'.length), 3)
      corners.push([
        (values[0] as number) * scale,
        (values[1] as number) * scale,
        (values[2] as number) * scale,
      ])
      continue
    }
    if (line.startsWith('endfacet')) {
      if (corners.length !== 3) {
        throw new ImportError(`STL facet has ${corners.length} vertices, expected 3`)
      }
      builder.addTriangle(corners[0] as [number, number, number], corners[1] as [number, number, number], corners[2] as [number, number, number])
      facetCount += 1
      corners = []
    }
  }

  if (!sawFacet && !/endsolid/.test(text)) {
    throw new ImportError('ASCII STL has no facets and no "endsolid" terminator')
  }

  return { mesh: builder.build(), name, format: 'ascii', facetCount, facetNormals }
}

function readNumbers(text: string, expected: number): number[] {
  const values = text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(Number)
  if (values.length < expected || values.some((value) => !Number.isFinite(value))) {
    throw new ImportError(`Expected ${expected} numbers in STL line "${text.trim()}"`)
  }
  return values.slice(0, expected)
}

export function importBinaryStl(bytes: Uint8Array, options: StlImportOptions = {}): StlImportResult {
  const scale = options.scale ?? 1
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const facetCount = view.getUint32(STL_HEADER_BYTES, true)
  const expected = STL_HEADER_BYTES + 4 + facetCount * STL_FACET_BYTES
  if (bytes.length < expected) {
    throw new ImportError(
      `Binary STL declares ${facetCount} facets but is only ${bytes.length} bytes`,
    )
  }

  const builder = new MeshBuilder(meshBuilderOptions(options))
  const facetNormals: number[] = []

  let offset = STL_HEADER_BYTES + 4
  for (let facet = 0; facet < facetCount; facet += 1) {
    facetNormals.push(
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    )
    const corners: [number, number, number][] = []
    for (let corner = 0; corner < 3; corner += 1) {
      const base = offset + 12 + corner * 12
      corners.push([
        view.getFloat32(base, true) * scale,
        view.getFloat32(base + 4, true) * scale,
        view.getFloat32(base + 8, true) * scale,
      ])
    }
    builder.addTriangle(corners[0] as [number, number, number], corners[1] as [number, number, number], corners[2] as [number, number, number])
    offset += STL_FACET_BYTES
  }

  return {
    mesh: builder.build(),
    name: readHeaderName(bytes),
    format: 'binary',
    facetCount,
    facetNormals,
  }
}

/** Printable text from the 80-byte header, which writers use however they like. */
function readHeaderName(bytes: Uint8Array): string {
  let text = ''
  for (let index = 0; index < STL_HEADER_BYTES; index += 1) {
    const code = bytes[index] as number
    if (code === 0) break
    text += code >= 0x20 && code < 0x7f ? String.fromCharCode(code) : ' '
  }
  return text.replace(/^Tectonic STL /, '').trim()
}

/**
 * `exactOptionalPropertyTypes` rules out passing an explicit `undefined`, so an
 * option the caller left out has to become an absent key.
 */
function meshBuilderOptions(options: StlImportOptions): { tolerance?: number; weld?: boolean } {
  return {
    ...(options.weld === undefined ? {} : { weld: options.weld }),
    ...(options.weldTolerance === undefined ? {} : { tolerance: options.weldTolerance }),
  }
}
