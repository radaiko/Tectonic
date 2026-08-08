import type { MeshData } from '../domain/MeshData'
import type { NewDocumentOptions, TectonicDocument } from '../domain/Document'
import { TECTONIC_FORMAT_VERSION, createDocument } from '../domain/Document'
import type { SketchModel } from '../sketch/domain/SketchModel'
import type { NamedMesh } from './types'
import { ImportError } from './types'
import { encodeUtf8 } from './binary'
import type { DxfExportOptions } from './DxfExporter'
import { exportDxf } from './DxfExporter'
import type { DxfImportResult } from './DxfImporter'
import { importDxf } from './DxfImporter'
import type { GltfExportOptions } from './GltfExporter'
import { exportGltfJson } from './GltfExporter'
import type { ObjExportOptions } from './ObjExporter'
import { exportObj } from './ObjExporter'
import type { PdfDrawingOptions } from './PdfDrawingExporter'
import { exportPdfDrawing } from './PdfDrawingExporter'
import type { StepImportResult } from './StepImporter'
import { importStep } from './StepImporter'
import type { StlExportOptions, StlFormat } from './StlExporter'
import { exportStl } from './StlExporter'
import type { StlImportResult } from './StlImporter'
import { importStl } from './StlImporter'
import type { SvgExportOptions } from './SvgExporter'
import { exportSvg } from './SvgExporter'
import type { SvgImportResult } from './SvgImporter'
import { importSvg } from './SvgImporter'
import type { ThreeMfExportOptions } from './ThreeMfExporter'
import { exportThreeMf } from './ThreeMfExporter'

export const TECTONIC_EXTENSION = '.tectonic'

/** Thrown when a file is not a readable .tectonic document. */
export class DocumentParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentParseError'
  }
}

export function createNewDocument(options: NewDocumentOptions = {}): TectonicDocument {
  return createDocument(options)
}

export function serialize(document: TectonicDocument): string {
  return JSON.stringify(document, null, 2)
}

export function deserialize(json: string): TectonicDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    throw new DocumentParseError(`Not valid JSON: ${(error as Error).message}`)
  }
  return validateDocument(parsed)
}

/**
 * Narrows untrusted parsed JSON to a document. Only the structural invariants the
 * app relies on are checked — deep geometry validation belongs to the kernel.
 */
export function validateDocument(value: unknown): TectonicDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DocumentParseError('Document must be a JSON object')
  }
  const candidate = value as Record<string, unknown>

  if (typeof candidate.version !== 'number') {
    throw new DocumentParseError('Document is missing a numeric "version"')
  }
  if (candidate.version > TECTONIC_FORMAT_VERSION) {
    throw new DocumentParseError(
      `Document version ${candidate.version} is newer than this build supports (${TECTONIC_FORMAT_VERSION})`,
    )
  }
  if (typeof candidate.metadata !== 'object' || candidate.metadata === null) {
    throw new DocumentParseError('Document is missing "metadata"')
  }
  if (!Array.isArray(candidate.parts)) {
    throw new DocumentParseError('Document is missing a "parts" array')
  }
  if (!Array.isArray(candidate.features)) {
    throw new DocumentParseError('Document is missing a "features" array')
  }
  if (candidate.sketch !== undefined && !isSketch(candidate.sketch)) {
    throw new DocumentParseError('Document "sketch" is not a sketch')
  }
  if (candidate.sketches !== undefined) {
    if (!Array.isArray(candidate.sketches)) {
      throw new DocumentParseError('Document "sketches" is not an array')
    }
    if (!candidate.sketches.every(isSketch)) {
      throw new DocumentParseError('Document "sketches" holds something that is not a sketch')
    }
  }

  return candidate as unknown as TectonicDocument
}

/** A sketch is recognised by its two collections; entity shapes are checked on load. */
function isSketch(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return Array.isArray(candidate.entities) && Array.isArray(candidate.constraints)
}

/** Reads and parses a user-selected .tectonic file. */
export async function readDocumentFile(file: File): Promise<TectonicDocument> {
  return deserialize(await file.text())
}

/**
 * Opens the browser file picker and resolves with the chosen document, or `null`
 * if the user dismissed the dialog.
 */
export function openFile(): Promise<TectonicDocument | null> {
  return new Promise((resolve, reject) => {
    const input = window.document.createElement('input')
    input.type = 'file'
    input.accept = TECTONIC_EXTENSION
    input.style.display = 'none'

    const cleanup = (): void => {
      input.remove()
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        resolve(null)
        return
      }
      readDocumentFile(file).then(resolve, reject)
    })

    // Fires when the picker is dismissed without a selection. Not supported in
    // every browser, so the promise may simply stay pending there.
    input.addEventListener('cancel', () => {
      cleanup()
      resolve(null)
    })

    window.document.body.appendChild(input)
    input.click()
  })
}

/** Triggers a download of the document as a .tectonic file. */
export function saveFile(document: TectonicDocument, fileName?: string): void {
  const name = fileName ?? `${document.metadata.name}${TECTONIC_EXTENSION}`
  const blob = new Blob([serialize(document)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = window.document.createElement('a')
  link.href = url
  link.download = name.endsWith(TECTONIC_EXTENSION) ? name : `${name}${TECTONIC_EXTENSION}`
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ export */

/**
 * One file an export produced. An export can produce more than one — OBJ comes
 * with its material library — so every entry point returns a list of these and
 * `downloadExport` writes whichever the caller wants.
 */
export interface ExportFile {
  readonly fileName: string
  readonly mimeType: string
  readonly data: string | Uint8Array
}

export type MeshExportFormat = 'stl' | 'stl-ascii' | 'obj' | 'gltf' | '3mf'
export type SketchExportFormat = 'dxf' | 'svg'
export type ExportFormat = MeshExportFormat | SketchExportFormat | 'pdf' | 'tectonic'

/** Extension and media type per format, for the picker and the download. */
export const EXPORT_MEDIA: Readonly<
  Record<ExportFormat, { readonly extension: string; readonly mimeType: string }>
> = {
  tectonic: { extension: '.tectonic', mimeType: 'application/json' },
  stl: { extension: '.stl', mimeType: 'model/stl' },
  'stl-ascii': { extension: '.stl', mimeType: 'model/stl' },
  obj: { extension: '.obj', mimeType: 'model/obj' },
  gltf: { extension: '.gltf', mimeType: 'model/gltf+json' },
  '3mf': { extension: '.3mf', mimeType: 'model/3mf' },
  dxf: { extension: '.dxf', mimeType: 'image/vnd.dxf' },
  svg: { extension: '.svg', mimeType: 'image/svg+xml' },
  pdf: { extension: '.pdf', mimeType: 'application/pdf' },
}

/** Appends the format's extension unless the name already carries it. */
export function withExtension(name: string, extension: string): string {
  return name.toLowerCase().endsWith(extension) ? name : `${name}${extension}`
}

export function exportStlFile(
  mesh: MeshData,
  name: string,
  format: StlFormat = 'binary',
  options: StlExportOptions = {},
): ExportFile {
  const data = exportStl(mesh, format, { name, ...options })
  return {
    fileName: withExtension(name, '.stl'),
    mimeType: EXPORT_MEDIA.stl.mimeType,
    data: typeof data === 'string' ? data : new Uint8Array(data),
  }
}

/** The OBJ and the MTL it references, in that order. */
export function exportObjFiles(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  name: string,
  options: ObjExportOptions = {},
): ExportFile[] {
  const result = exportObj(source, { name, ...options })
  const files: ExportFile[] = [
    {
      fileName: withExtension(name, '.obj'),
      mimeType: EXPORT_MEDIA.obj.mimeType,
      data: result.obj,
    },
  ]
  if (result.mtl !== '') {
    files.push({
      fileName: result.materialLibrary,
      mimeType: 'model/mtl',
      data: result.mtl,
    })
  }
  return files
}

export function exportGltfFile(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  name: string,
  options: GltfExportOptions = {},
): ExportFile {
  return {
    fileName: withExtension(name, '.gltf'),
    mimeType: EXPORT_MEDIA.gltf.mimeType,
    data: exportGltfJson(source, { name, ...options }),
  }
}

export function exportThreeMfFile(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  name: string,
  options: ThreeMfExportOptions = {},
): ExportFile {
  return {
    fileName: withExtension(name, '.3mf'),
    mimeType: EXPORT_MEDIA['3mf'].mimeType,
    data: exportThreeMf(source, { name, ...options }),
  }
}

export function exportPdfDrawingFile(
  mesh: MeshData,
  name: string,
  options: PdfDrawingOptions = {},
): ExportFile {
  return {
    fileName: withExtension(name, '.pdf'),
    mimeType: EXPORT_MEDIA.pdf.mimeType,
    data: exportPdfDrawing(mesh, { partName: name, ...options }),
  }
}

export function exportDxfFile(
  sketch: SketchModel,
  name: string,
  options: DxfExportOptions = {},
): ExportFile {
  return {
    fileName: withExtension(name, '.dxf'),
    mimeType: EXPORT_MEDIA.dxf.mimeType,
    data: exportDxf(sketch, options),
  }
}

export function exportSvgFile(
  sketch: SketchModel,
  name: string,
  options: SvgExportOptions = {},
): ExportFile {
  return {
    fileName: withExtension(name, '.svg'),
    mimeType: EXPORT_MEDIA.svg.mimeType,
    data: exportSvg(sketch, { title: name, ...options }),
  }
}

/** Triggers a browser download of an already-built export file. */
export function downloadExport(file: ExportFile): void {
  const bytes = typeof file.data === 'string' ? encodeUtf8(file.data) : file.data
  // A fresh copy keeps the Blob independent of any pooled buffer behind `data`.
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: file.mimeType })
  const url = URL.createObjectURL(blob)

  const link = window.document.createElement('a')
  link.href = url
  link.download = file.fileName
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ import */

export type ImportFormat = 'tectonic' | 'stl' | 'dxf' | 'svg' | 'step'

/** Every extension the importer recognises, mapped to its format. */
export const IMPORT_EXTENSIONS: Readonly<Record<string, ImportFormat>> = {
  '.tectonic': 'tectonic',
  '.json': 'tectonic',
  '.stl': 'stl',
  '.dxf': 'dxf',
  '.svg': 'svg',
  '.step': 'step',
  '.stp': 'step',
}

/** The format a file name implies, or `null` when nothing here reads it. */
export function importFormatFromName(fileName: string): ImportFormat | null {
  const dot = fileName.lastIndexOf('.')
  if (dot === -1) return null
  return IMPORT_EXTENSIONS[fileName.slice(dot).toLowerCase()] ?? null
}

export type ImportedContent =
  | { readonly format: 'tectonic'; readonly document: TectonicDocument }
  | { readonly format: 'stl'; readonly result: StlImportResult }
  | { readonly format: 'dxf'; readonly result: DxfImportResult }
  | { readonly format: 'svg'; readonly result: SvgImportResult }
  | { readonly format: 'step'; readonly result: StepImportResult }

/** Reads any supported file, choosing the pipeline from its extension. */
export async function importFile(file: File): Promise<ImportedContent> {
  const format = importFormatFromName(file.name)
  if (format === null) {
    throw new ImportError(`Cannot import "${file.name}": unrecognised file extension`)
  }

  if (format === 'stl') {
    // STL is the one format here that can be binary, so it gets the bytes.
    const bytes = new Uint8Array(await file.arrayBuffer())
    return { format, result: importStl(bytes) }
  }

  const text = await file.text()
  switch (format) {
    case 'tectonic':
      return { format, document: deserialize(text) }
    case 'dxf':
      return { format, result: importDxf(text, { name: file.name }) }
    case 'svg':
      return { format, result: importSvg(text, { name: file.name }) }
    default:
      return { format: 'step', result: importStep(text, { name: file.name }) }
  }
}
