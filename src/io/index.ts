export {
  DocumentParseError,
  EXPORT_MEDIA,
  IMPORT_EXTENSIONS,
  TECTONIC_EXTENSION,
  createNewDocument,
  deserialize,
  downloadExport,
  exportDxfFile,
  exportGltfFile,
  exportObjFiles,
  exportPdfDrawingFile,
  exportStlFile,
  exportSvgFile,
  exportThreeMfFile,
  importFile,
  importFormatFromName,
  openFile,
  readDocumentFile,
  saveFile,
  serialize,
  validateDocument,
  withExtension,
} from './FileService'
export type {
  ExportFile,
  ExportFormat,
  ImportFormat,
  ImportedContent,
  MeshExportFormat,
  SketchExportFormat,
} from './FileService'

export {
  EXPORT_FORMATS,
  buildExport,
  exportFormatInfo,
  exportUnavailableReason,
} from './DocumentExport'
export type { ExportFormatInfo, ExportSource, ExportSubject } from './DocumentExport'

export {
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  clearSession,
  defaultSessionStorage,
  loadSession,
  saveSession,
} from './DocumentStorage'
export type { SessionStorageLike, StoredSession } from './DocumentStorage'

export { ExportError, ImportError, DEFAULT_MATERIAL, unitScale } from './types'
export type { MaterialSpec, NamedMesh, RgbColor } from './types'

export { exportObj, writeMtl } from './ObjExporter'
export type { ObjExportOptions, ObjExportResult } from './ObjExporter'
export { exportGltf, exportGltfJson } from './GltfExporter'
export type { GltfDocument, GltfExportOptions } from './GltfExporter'
export { exportThreeMf, threeMfEntries, threeMfModelXml } from './ThreeMfExporter'
export type { ThreeMfExportOptions } from './ThreeMfExporter'
export { exportPdfDrawing, formatScale } from './PdfDrawingExporter'
export type { PdfDrawingOptions } from './PdfDrawingExporter'
export { importStep } from './StepImporter'
export type { StepEntity, StepHeader, StepImportOptions, StepImportResult } from './StepImporter'
export {
  CAD_EXTENSIONS,
  CAD_FORMATS,
  DEFAULT_PLACEHOLDER_SIZE,
  cadFormat,
  detectCadFormat,
  detectContainer,
  importCad,
  importCadFile,
  isCadFileName,
  placeholderMesh,
} from './CadImportService'
export type {
  CadConfidence,
  CadContainer,
  CadDetection,
  CadFormatId,
  CadFormatSpec,
  CadImportMetadata,
  CadImportOptions,
  CadImportResult,
  CadTranslator,
} from './CadImportService'

export {
  DEFAULT_JPEG_QUALITY,
  IMAGE_MEDIA,
  captureViewportImage,
  dataUrlBytes,
  downloadImage,
  effectiveBackground,
  imageFileName,
  resolveImageSize,
} from './ImageExporter'
export type {
  CapturedImage,
  ImageBackground,
  ImageExportOptions,
  ImageFormat,
  ImageResolution,
  ViewportRenderer,
} from './ImageExporter'

export { exportHtml, htmlViewerModel } from './HtmlExporter'
export type { HtmlExportOptions, HtmlViewerModel, HtmlViewerPart } from './HtmlExporter'
export { exportThreeDPdf, annotationRect, defaultView } from './ThreeDPdfExporter'
export type { ThreeDPdfOptions, ThreeDView } from './ThreeDPdfExporter'
export { encodeU3d, readU3dBlocks } from './u3d'
export type { U3dBlock, U3dMesh, U3dOptions } from './u3d'

export { ORTHO_VIEWS, viewSegments } from './orthoViews'
export type { DrawingSegment, ViewAxes, ViewName } from './orthoViews'
export { readZip, writeZip } from './zip'
export type { ZipEntry } from './zip'
