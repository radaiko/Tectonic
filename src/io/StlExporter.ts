import type { MeshData, MeshPoint } from '../domain/MeshData'
import { faceNormal, triangleAt, triangleCount } from '../domain/MeshData'

/**
 * STL writing. Both flavours share one triangle stream so an ASCII and a binary
 * export of the same mesh always describe the same solid.
 */

export type StlFormat = 'ascii' | 'binary'

export interface StlExportOptions {
  /** Solid name. Only ASCII STL records it; binary keeps it in the header. */
  readonly name?: string
  /** Decimal places per ASCII coordinate. Binary is always float32. */
  readonly precision?: number
  /** Uniform scale applied to every coordinate, for unit conversion. */
  readonly scale?: number
  /** Triangles at or below this area are dropped as degenerate. */
  readonly minTriangleArea?: number
}

const DEFAULT_NAME = 'tectonic'
const DEFAULT_PRECISION = 6
/** Binary STL: 80-byte header, uint32 count, 50 bytes per facet. */
export const STL_HEADER_BYTES = 80
export const STL_FACET_BYTES = 50

interface Facet {
  readonly normal: MeshPoint
  readonly vertices: readonly [MeshPoint, MeshPoint, MeshPoint]
}

/**
 * The mesh as a flat list of facets: scaled, degenerate triangles removed, each
 * carrying the outward normal implied by its winding.
 */
export function stlFacets(mesh: MeshData, options: StlExportOptions = {}): Facet[] {
  const scale = options.scale ?? 1
  const minArea = options.minTriangleArea ?? 0
  const facets: Facet[] = []

  for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
    const corners = triangleAt(mesh, triangle).map((point) => ({
      x: point.x * scale,
      y: point.y * scale,
      z: point.z * scale,
    })) as [MeshPoint, MeshPoint, MeshPoint]

    if (minArea > 0 && triangleArea(corners) <= minArea) continue
    facets.push({ normal: faceNormal(corners[0], corners[1], corners[2]), vertices: corners })
  }
  return facets
}

function triangleArea(corners: readonly [MeshPoint, MeshPoint, MeshPoint]): number {
  const [a, b, c] = corners
  const ux = b.x - a.x
  const uy = b.y - a.y
  const uz = b.z - a.z
  const vx = c.x - a.x
  const vy = c.y - a.y
  const vz = c.z - a.z
  return (
    Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2
  )
}

export function exportStlAscii(mesh: MeshData, options: StlExportOptions = {}): string {
  const name = options.name ?? DEFAULT_NAME
  const precision = options.precision ?? DEFAULT_PRECISION
  const fixed = (value: number): string => (value === 0 ? '0' : value.toFixed(precision))
  const triple = (point: MeshPoint): string =>
    `${fixed(point.x)} ${fixed(point.y)} ${fixed(point.z)}`

  const lines: string[] = [`solid ${name}`]
  for (const facet of stlFacets(mesh, options)) {
    lines.push(`  facet normal ${triple(facet.normal)}`)
    lines.push('    outer loop')
    for (const vertex of facet.vertices) lines.push(`      vertex ${triple(vertex)}`)
    lines.push('    endloop')
    lines.push('  endfacet')
  }
  lines.push(`endsolid ${name}`)
  return `${lines.join('\n')}\n`
}

export function exportStlBinary(mesh: MeshData, options: StlExportOptions = {}): ArrayBuffer {
  const facets = stlFacets(mesh, options)
  const buffer = new ArrayBuffer(STL_HEADER_BYTES + 4 + facets.length * STL_FACET_BYTES)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // The 80-byte header must not start with "solid" or readers guess ASCII.
  const header = `Tectonic STL ${options.name ?? DEFAULT_NAME}`
  for (let index = 0; index < header.length && index < STL_HEADER_BYTES; index += 1) {
    bytes[index] = header.charCodeAt(index) & 0xff
  }

  view.setUint32(STL_HEADER_BYTES, facets.length, true)

  let offset = STL_HEADER_BYTES + 4
  for (const facet of facets) {
    for (const point of [facet.normal, ...facet.vertices]) {
      view.setFloat32(offset, point.x, true)
      view.setFloat32(offset + 4, point.y, true)
      view.setFloat32(offset + 8, point.z, true)
      offset += 12
    }
    view.setUint16(offset, 0, true)
    offset += 2
  }
  return buffer
}

/** Writes whichever flavour was asked for. */
export function exportStl(
  mesh: MeshData,
  format: StlFormat,
  options: StlExportOptions = {},
): string | ArrayBuffer {
  return format === 'ascii' ? exportStlAscii(mesh, options) : exportStlBinary(mesh, options)
}
