import type { Body, TectonicDocument } from '../domain/Document'
import { mergeMeshes } from '../domain/MeshData'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { ExportFile, ExportFormat } from './FileService'
import {
  EXPORT_MEDIA,
  exportDxfFile,
  exportGltfFile,
  exportObjFiles,
  exportPdfDrawingFile,
  exportStlFile,
  exportSvgFile,
  exportThreeMfFile,
  serialize,
} from './FileService'
import type { NamedMesh } from './types'
import { ExportError, unitScale } from './types'

/**
 * Turning what the editor currently holds into files, for every format the UI
 * offers.
 *
 * This is the one place that decides which formats are real. The exporters
 * themselves have existed for a while but nothing wired them to the document,
 * so the picker built on this list can only offer what actually round-trips —
 * a format that has no exporter simply is not in {@link EXPORT_FORMATS}, and a
 * format the current document cannot feed is reported as unavailable with the
 * reason, rather than producing an empty file.
 */

/** What an export reads: solid geometry, a sketch, or the document itself. */
export type ExportSubject = 'solids' | 'sketch' | 'document'

export interface ExportFormatInfo {
  readonly id: ExportFormat
  readonly label: string
  readonly extension: string
  readonly subject: ExportSubject
  /** One line for the picker, describing what the file will contain. */
  readonly description: string
}

/**
 * Every format the export picker offers, in the order it shows them.
 *
 * `.tectonic` leads because it is the only lossless one: it is the modelling
 * history, and it is what "Save" writes. Everything below it is a hand-off
 * format that flattens the parametric model into geometry.
 */
export const EXPORT_FORMATS: readonly ExportFormatInfo[] = [
  {
    id: 'tectonic',
    label: 'Tectonic document',
    extension: EXPORT_MEDIA.tectonic.extension,
    subject: 'document',
    description: 'The full parametric model — sketches, history and all. Lossless.',
  },
  {
    id: 'stl',
    label: 'STL (binary)',
    extension: EXPORT_MEDIA.stl.extension,
    subject: 'solids',
    description: 'Triangle mesh for 3D printing. All bodies merged into one shell.',
  },
  {
    id: 'stl-ascii',
    label: 'STL (ASCII)',
    extension: EXPORT_MEDIA['stl-ascii'].extension,
    subject: 'solids',
    description: 'The same mesh as text — larger, but readable and diffable.',
  },
  {
    id: 'obj',
    label: 'OBJ',
    extension: EXPORT_MEDIA.obj.extension,
    subject: 'solids',
    description: 'One group per body, plus a .mtl material library.',
  },
  {
    id: 'gltf',
    label: 'glTF',
    extension: EXPORT_MEDIA.gltf.extension,
    subject: 'solids',
    description: 'Self-contained glTF 2.0 JSON with embedded buffers.',
  },
  {
    id: '3mf',
    label: '3MF',
    extension: EXPORT_MEDIA['3mf'].extension,
    subject: 'solids',
    description: '3D Manufacturing Format package, one object per body.',
  },
  {
    id: 'pdf',
    label: 'PDF drawing',
    extension: EXPORT_MEDIA.pdf.extension,
    subject: 'solids',
    description: 'Projected orthographic views of the model on a titled sheet.',
  },
  {
    id: 'dxf',
    label: 'DXF',
    extension: EXPORT_MEDIA.dxf.extension,
    subject: 'sketch',
    description: 'The selected sketch as 2D curves, for laser and plasma cutting.',
  },
  {
    id: 'svg',
    label: 'SVG',
    extension: EXPORT_MEDIA.svg.extension,
    subject: 'sketch',
    description: 'The selected sketch as vector artwork.',
  },
]

const FORMATS_BY_ID = new Map(EXPORT_FORMATS.map((format) => [format.id, format]))

export function exportFormatInfo(format: ExportFormat): ExportFormatInfo {
  const info = FORMATS_BY_ID.get(format)
  if (!info) throw new ExportError(`No exporter for "${format}"`)
  return info
}

/** Everything an export can draw on. Pure data — no kernel, no React. */
export interface ExportSource {
  readonly document: TectonicDocument
  /**
   * Every body currently on screen: the static geometry the file arrived with
   * plus whatever the feature tree last rebuilt. This is what the mesh formats
   * write, so an export matches the viewport rather than the file on disk.
   */
  readonly bodies: readonly Body[]
  /** The sketch the 2D formats write — the one the editor has selected. */
  readonly sketch: SketchModel | null
}

/**
 * Why this format cannot be written from this document, or `null` when it can.
 * The picker shows the reason instead of disabling an option silently.
 */
export function exportUnavailableReason(
  format: ExportFormat,
  source: ExportSource,
): string | null {
  switch (exportFormatInfo(format).subject) {
    case 'solids':
      return source.bodies.length === 0
        ? 'This document has no solid bodies yet — add a feature that builds one.'
        : null
    case 'sketch':
      return source.sketch === null
        ? 'This document has no sketch to export.'
        : source.sketch.entities.size === 0
          ? `"${source.sketch.name}" is empty — draw something first.`
          : null
    case 'document':
      return null
  }
}

/**
 * The files a format produces, ready to hand to `downloadExport`.
 *
 * More than one file comes back where the format needs it — OBJ carries its
 * material library — so callers write the whole list rather than assuming one.
 *
 * @throws ExportError when the document cannot feed the format. Callers that
 * want to ask first use {@link exportUnavailableReason}.
 */
export function buildExport(format: ExportFormat, source: ExportSource): ExportFile[] {
  const reason = exportUnavailableReason(format, source)
  if (reason !== null) throw new ExportError(reason)

  const name = source.document.metadata.name
  const units = source.document.metadata.units
  // STL, OBJ and glTF carry no unit declaration, and every consumer of them
  // assumes millimetres. The coordinates are converted on the way out rather
  // than being written in whatever the document happens to be modelled in.
  const scale = unitScale(units, 'mm')

  switch (format) {
    case 'tectonic':
      return [
        {
          fileName: `${name}${EXPORT_MEDIA.tectonic.extension}`,
          mimeType: EXPORT_MEDIA.tectonic.mimeType,
          data: serialize(source.document),
        },
      ]
    case 'stl':
      return [exportStlFile(mergedMesh(source), name, 'binary', { scale })]
    case 'stl-ascii':
      return [exportStlFile(mergedMesh(source), name, 'ascii', { scale })]
    case 'obj':
      return exportObjFiles(namedMeshes(source), name, { scale })
    case 'gltf':
      return [exportGltfFile(namedMeshes(source), name, { scale })]
    case '3mf':
      return [exportThreeMfFile(namedMeshes(source), name, { units })]
    case 'pdf':
      return [exportPdfDrawingFile(mergedMesh(source), name, { units })]
    case 'dxf':
      return [exportDxfFile(requireSketch(source), name, { units })]
    case 'svg':
      return [exportSvgFile(requireSketch(source), name, { units })]
  }
}

/** One mesh per body, named after it, for the formats that keep them apart. */
function namedMeshes(source: ExportSource): NamedMesh[] {
  return source.bodies.map((body) => ({ name: body.name, mesh: body.mesh }))
}

/** Everything welded into a single mesh, for the formats that have no scene. */
function mergedMesh(source: ExportSource) {
  return mergeMeshes(source.bodies.map((body) => body.mesh))
}

function requireSketch(source: ExportSource): SketchModel {
  if (!source.sketch) throw new ExportError('This document has no sketch to export.')
  return source.sketch
}
