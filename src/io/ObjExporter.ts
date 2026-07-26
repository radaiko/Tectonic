import type { MeshData } from '../domain/MeshData'
import { triangleCount, vertexCount } from '../domain/MeshData'
import type { MaterialSpec, NamedMesh } from './types'
import { DEFAULT_MATERIAL, num } from './types'

/**
 * Wavefront OBJ writing, plus the companion MTL.
 *
 * OBJ numbers its vertices from 1 and counts them across the whole file rather
 * than per object, so every group here carries an offset into one shared vertex
 * stream. Positions, texture coordinates and normals are each numbered in their
 * own sequence, which is why the face triples are assembled from three separate
 * bases.
 */

export interface ObjExportOptions {
  /** Base name for the pair of files; also the default object name. */
  readonly name?: string
  /** File name written into the `mtllib` line. Derived from `name` by default. */
  readonly materialLibrary?: string
  readonly precision?: number
  /** Uniform scale applied to every coordinate, for unit conversion. */
  readonly scale?: number
  /** Emit `vn` lines and normal references. On by default. */
  readonly includeNormals?: boolean
  /** Emit `vt` lines for the meshes that carry UVs. On by default. */
  readonly includeUvs?: boolean
  /** Write the `mtllib`/`usemtl` lines and the MTL text. On by default. */
  readonly includeMaterials?: boolean
}

export interface ObjExportResult {
  readonly obj: string
  readonly mtl: string
  /** The name the OBJ's `mtllib` line points at. */
  readonly materialLibrary: string
}

const DEFAULTS = {
  name: 'tectonic',
  precision: 6,
  scale: 1,
} as const

/** OBJ tokens are whitespace-separated, so a name may not contain any. */
export function sanitizeObjName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, '_')
  return cleaned === '' ? 'unnamed' : cleaned
}

/** Accepts a bare mesh, one named mesh or a list, and normalises to a list. */
export function toNamedMeshes(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  fallbackName: string,
): NamedMesh[] {
  if (Array.isArray(source)) return [...(source as readonly NamedMesh[])]
  if ('mesh' in source) return [source as NamedMesh]
  return [{ name: fallbackName, mesh: source as MeshData }]
}

export function exportObj(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: ObjExportOptions = {},
): ObjExportResult {
  const name = options.name ?? DEFAULTS.name
  const precision = options.precision ?? DEFAULTS.precision
  const scale = options.scale ?? DEFAULTS.scale
  const withNormals = options.includeNormals ?? true
  const withUvs = options.includeUvs ?? true
  const withMaterials = options.includeMaterials ?? true
  const materialLibrary = options.materialLibrary ?? `${name}.mtl`

  const meshes = toNamedMeshes(source, name)
  const lines: string[] = ['# Tectonic OBJ export', `# ${meshes.length} object(s)`]
  if (withMaterials) lines.push(`mtllib ${materialLibrary}`)

  const materials = new Map<string, MaterialSpec>()
  // OBJ indices are 1-based and run across the whole file, one counter each.
  let positionBase = 1
  let uvBase = 1
  let normalBase = 1

  for (const entry of meshes) {
    const objectName = sanitizeObjName(entry.name)
    const mesh = entry.mesh
    const vertices = vertexCount(mesh)
    const emitUvs = withUvs && entry.uvs !== undefined && entry.uvs.length >= vertices * 2
    const emitNormals = withNormals && mesh.normals.length >= vertices * 3

    lines.push(`o ${objectName}`, `g ${objectName}`)

    if (withMaterials) {
      const material = entry.material ?? DEFAULT_MATERIAL
      const materialName = sanitizeObjName(material.name)
      materials.set(materialName, material)
      lines.push(`usemtl ${materialName}`)
    }

    for (let vertex = 0; vertex < vertices; vertex += 1) {
      const x = (mesh.positions[vertex * 3] ?? 0) * scale
      const y = (mesh.positions[vertex * 3 + 1] ?? 0) * scale
      const z = (mesh.positions[vertex * 3 + 2] ?? 0) * scale
      lines.push(`v ${num(x, precision)} ${num(y, precision)} ${num(z, precision)}`)
    }

    if (emitUvs) {
      const uvs = entry.uvs as readonly number[]
      for (let vertex = 0; vertex < vertices; vertex += 1) {
        lines.push(
          `vt ${num(uvs[vertex * 2] ?? 0, precision)} ${num(uvs[vertex * 2 + 1] ?? 0, precision)}`,
        )
      }
    }

    if (emitNormals) {
      for (let vertex = 0; vertex < vertices; vertex += 1) {
        lines.push(
          `vn ${num(mesh.normals[vertex * 3] ?? 0, precision)} ` +
            `${num(mesh.normals[vertex * 3 + 1] ?? 0, precision)} ` +
            `${num(mesh.normals[vertex * 3 + 2] ?? 0, precision)}`,
        )
      }
    }

    // Smoothing group 1 shares normals across the group; `off` keeps it faceted.
    lines.push((entry.smooth ?? true) ? 's 1' : 's off')

    for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
      const corners = [0, 1, 2].map((corner) => {
        const vertex = mesh.indices[triangle * 3 + corner] ?? 0
        return faceReference(
          positionBase + vertex,
          emitUvs ? uvBase + vertex : null,
          emitNormals ? normalBase + vertex : null,
        )
      })
      lines.push(`f ${corners.join(' ')}`)
    }

    positionBase += vertices
    if (emitUvs) uvBase += vertices
    if (emitNormals) normalBase += vertices
  }

  return {
    obj: `${lines.join('\n')}\n`,
    mtl: withMaterials ? writeMtl([...materials.values()], precision) : '',
    materialLibrary,
  }
}

/** `v`, `v/vt`, `v//vn` or `v/vt/vn`, whichever the group actually has. */
function faceReference(position: number, uv: number | null, normal: number | null): string {
  if (uv === null && normal === null) return String(position)
  if (normal === null) return `${position}/${uv as number}`
  return `${position}/${uv === null ? '' : uv}/${normal}`
}

/** The material library for the materials the OBJ referenced. */
export function writeMtl(materials: readonly MaterialSpec[], precision = 6): string {
  const used = materials.length > 0 ? materials : [DEFAULT_MATERIAL]
  const lines: string[] = ['# Tectonic MTL export']

  for (const material of used) {
    const { r, g, b } = material.color
    const opacity = material.opacity ?? 1
    const roughness = material.roughness ?? 0.6
    lines.push(
      `newmtl ${sanitizeObjName(material.name)}`,
      // Ambient tracks the diffuse colour at a quarter strength; most viewers
      // ignore Ka entirely but readers that honour it look wrong without one.
      `Ka ${triple(r * 0.25, g * 0.25, b * 0.25, precision)}`,
      `Kd ${triple(r, g, b, precision)}`,
      `Ks ${triple(0.1, 0.1, 0.1, precision)}`,
      // Phong exponent from roughness: mirror-smooth is sharp, rough is broad.
      `Ns ${num((1 - roughness) * 900 + 10, precision)}`,
      `d ${num(opacity, precision)}`,
      // 2 is "colour on, ambient on" — the sane default for an opaque solid.
      `illum ${opacity < 1 ? 4 : 2}`,
      // PBR extension, understood by Blender and the glTF toolchain.
      `Pm ${num(material.metallic ?? 0, precision)}`,
      `Pr ${num(roughness, precision)}`,
    )
  }
  return `${lines.join('\n')}\n`
}

function triple(r: number, g: number, b: number, precision: number): string {
  return `${num(r, precision)} ${num(g, precision)} ${num(b, precision)}`
}
