import type { LengthUnit } from '../domain/Document'
import type { MeshData } from '../domain/MeshData'
import { triangleCount, vertexCount } from '../domain/MeshData'
import type { MaterialSpec, NamedMesh, RgbColor } from './types'
import { DEFAULT_MATERIAL, ExportError, num } from './types'
import { toNamedMeshes } from './ObjExporter'
import { encodeXmlText } from './xml'
import type { ZipEntry } from './zip'
import { textEntry, writeZip } from './zip'

/**
 * 3MF writing. A .3mf is an OPC package — a ZIP holding a content-type map, a
 * relationship pointing at the model part, and the model itself as XML.
 *
 * Every mesh becomes one `<object>` referencing a shared `<basematerials>`
 * table, and every object gets a `<build><item>` so a slicer actually places
 * it. Only the core and material specs are used; no thumbnails, no production
 * extension, no beam lattices.
 */

export const THREEMF_CONTENT_TYPES_PATH = '[Content_Types].xml'
export const THREEMF_RELS_PATH = '_rels/.rels'
export const THREEMF_MODEL_PATH = '3D/3dmodel.model'

const CORE_NAMESPACE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const MATERIAL_NAMESPACE = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02'
const MODEL_RELATIONSHIP_TYPE =
  'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'
const MODEL_CONTENT_TYPE = 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
const RELS_CONTENT_TYPE = 'application/vnd.openxmlformats-package.relationships+xml'

/** The `unit` attribute values the core spec allows. */
const MODEL_UNITS: Readonly<Record<LengthUnit, string>> = {
  mm: 'millimeter',
  cm: 'centimeter',
  m: 'meter',
  in: 'inch',
  ft: 'foot',
}

export interface ThreeMfExportOptions {
  readonly name?: string
  /** Unit the coordinates are in; recorded on the `<model>` element. */
  readonly units?: LengthUnit
  /** Uniform scale applied to every coordinate. */
  readonly scale?: number
  readonly precision?: number
  /** Stamped on every ZIP entry. Fixed by default so output is reproducible. */
  readonly modified?: Date
}

/** The package as bytes, ready to be written to a .3mf file. */
export function exportThreeMf(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: ThreeMfExportOptions = {},
): Uint8Array {
  return writeZip(
    threeMfEntries(source, options),
    options.modified === undefined ? {} : { modified: options.modified },
  )
}

/** The three package members, in the order a reader expects to find them. */
export function threeMfEntries(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: ThreeMfExportOptions = {},
): ZipEntry[] {
  return [
    textEntry(THREEMF_CONTENT_TYPES_PATH, contentTypesXml()),
    textEntry(THREEMF_RELS_PATH, relationshipsXml()),
    textEntry(THREEMF_MODEL_PATH, threeMfModelXml(source, options)),
  ]
}

export function contentTypesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    `  <Default Extension="rels" ContentType="${RELS_CONTENT_TYPE}" />`,
    `  <Default Extension="model" ContentType="${MODEL_CONTENT_TYPE}" />`,
    '</Types>',
    '',
  ].join('\n')
}

export function relationshipsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    `  <Relationship Id="rel0" Target="/${THREEMF_MODEL_PATH}" Type="${MODEL_RELATIONSHIP_TYPE}" />`,
    '</Relationships>',
    '',
  ].join('\n')
}

/** The 3D/3dmodel.model part: resources first, then the build plate. */
export function threeMfModelXml(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: ThreeMfExportOptions = {},
): string {
  const name = options.name ?? 'tectonic'
  const scale = options.scale ?? 1
  const precision = options.precision ?? 6
  const meshes = toNamedMeshes(source, name)
  if (meshes.length === 0) throw new ExportError('3MF export needs at least one mesh')

  // Resource ids are shared across every resource type in the part, so the
  // material table takes 1 and the objects start after it.
  const MATERIALS_ID = 1
  const materials: MaterialSpec[] = []
  const materialIndices = new Map<string, number>()
  for (const entry of meshes) {
    const material = entry.material ?? DEFAULT_MATERIAL
    if (materialIndices.has(material.name)) continue
    materialIndices.set(material.name, materials.length)
    materials.push(material)
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="${MODEL_UNITS[options.units ?? 'mm']}" xml:lang="en-US" ` +
      `xmlns="${CORE_NAMESPACE}" xmlns:m="${MATERIAL_NAMESPACE}">`,
    '  <metadata name="Application">Tectonic</metadata>',
    `  <metadata name="Title">${encodeXmlText(name)}</metadata>`,
    '  <resources>',
    `    <basematerials id="${MATERIALS_ID}">`,
  ]

  for (const material of materials) {
    lines.push(
      `      <base name="${encodeXmlText(material.name)}" ` +
        `displaycolor="${displayColor(material.color, material.opacity ?? 1)}" />`,
    )
  }
  lines.push('    </basematerials>')

  meshes.forEach((entry, index) => {
    const objectId = MATERIALS_ID + 1 + index
    const materialIndex = materialIndices.get((entry.material ?? DEFAULT_MATERIAL).name) ?? 0
    lines.push(
      `    <object id="${objectId}" type="model" name="${encodeXmlText(entry.name)}" ` +
        `pid="${MATERIALS_ID}" pindex="${materialIndex}">`,
      '      <mesh>',
      '        <vertices>',
    )

    const mesh = entry.mesh
    for (let vertex = 0; vertex < vertexCount(mesh); vertex += 1) {
      lines.push(
        `          <vertex x="${num((mesh.positions[vertex * 3] ?? 0) * scale, precision)}" ` +
          `y="${num((mesh.positions[vertex * 3 + 1] ?? 0) * scale, precision)}" ` +
          `z="${num((mesh.positions[vertex * 3 + 2] ?? 0) * scale, precision)}" />`,
      )
    }
    lines.push('        </vertices>', '        <triangles>')

    for (let triangle = 0; triangle < triangleCount(mesh); triangle += 1) {
      lines.push(
        `          <triangle v1="${mesh.indices[triangle * 3] ?? 0}" ` +
          `v2="${mesh.indices[triangle * 3 + 1] ?? 0}" ` +
          `v3="${mesh.indices[triangle * 3 + 2] ?? 0}" />`,
      )
    }
    lines.push('        </triangles>', '      </mesh>', '    </object>')
  })

  lines.push('  </resources>', '  <build>')
  meshes.forEach((_entry, index) => {
    lines.push(`    <item objectid="${MATERIALS_ID + 1 + index}" />`)
  })
  lines.push('  </build>', '</model>', '')
  return lines.join('\n')
}

/** 3MF display colours are #RRGGBBAA hex over sRGB. */
export function displayColor(color: RgbColor, opacity: number): string {
  const channel = (value: number): string =>
    Math.round(Math.min(Math.max(value, 0), 1) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${channel(opacity)}`
}
