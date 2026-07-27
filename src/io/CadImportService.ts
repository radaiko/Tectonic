import type { MeshData } from '../domain/MeshData'
import type { NamedMesh } from './types'
import { ImportError } from './types'
import { MeshBuilder } from './meshBuilder'

/**
 * Reading files from the other CAD systems.
 *
 * Be clear about what this does and does not do. Every format below is
 * proprietary and undocumented: the geometry inside a SOLIDWORKS part or a
 * CATPart is a vendor's B-rep serialisation with no published grammar, and no
 * amount of byte-poking will turn it into faces. Translating one properly means
 * a licensed kernel — CAD Exchanger, Datakit, HOOPS — behind
 * {@link CadTranslator}, which this module will call when one is installed.
 *
 * What it does on its own is the part that *is* possible without a licence:
 * work out what the file actually is, pull whatever the header will admit to,
 * and hand back a labelled placeholder so the file appears in the tree with its
 * real name and format instead of failing to open. Every such result is flagged
 * `placeholder: true` and carries a warning; nothing downstream should ever
 * mistake that box for the model.
 *
 * On the detection itself: container signatures (OLE2, ZIP, the Parasolid and
 * JT headers) are exact and reported as `signature`. The vendor tokens scanned
 * for inside a header are heuristics — they identify the writing application
 * where it leaves a marker, and where it does not the extension decides, which
 * is reported as `extension` so a caller can tell a guess from a fact.
 */

/** Which application a file came out of, and whether it is a part or assembly. */
export type CadFormatId =
  | 'solidworks-part'
  | 'solidworks-assembly'
  | 'catia-part'
  | 'catia-product'
  | 'nx-part'
  | 'creo-part'
  | 'creo-assembly'
  | 'inventor-part'
  | 'inventor-assembly'
  | 'parasolid-text'
  | 'parasolid-binary'
  | 'jt'

/** The file container a format is wrapped in, which is what can be proven. */
export type CadContainer = 'ole2' | 'zip' | 'ascii' | 'binary'

export interface CadFormatSpec {
  readonly id: CadFormatId
  /** Full name, as the vendor writes it. */
  readonly name: string
  readonly application: string
  readonly extensions: readonly string[]
  readonly kind: 'part' | 'assembly' | 'exchange'
  readonly container: CadContainer
}

export const CAD_FORMATS: readonly CadFormatSpec[] = [
  {
    id: 'solidworks-part',
    name: 'SOLIDWORKS Part',
    application: 'SOLIDWORKS',
    extensions: ['.sldprt'],
    kind: 'part',
    container: 'ole2',
  },
  {
    id: 'solidworks-assembly',
    name: 'SOLIDWORKS Assembly',
    application: 'SOLIDWORKS',
    extensions: ['.sldasm'],
    kind: 'assembly',
    container: 'ole2',
  },
  {
    id: 'catia-part',
    name: 'CATIA V5 Part',
    application: 'CATIA V5',
    extensions: ['.catpart'],
    kind: 'part',
    container: 'binary',
  },
  {
    id: 'catia-product',
    name: 'CATIA V5 Product',
    application: 'CATIA V5',
    extensions: ['.catproduct'],
    kind: 'assembly',
    container: 'binary',
  },
  {
    id: 'nx-part',
    name: 'Siemens NX Part',
    application: 'NX',
    extensions: ['.prt'],
    kind: 'part',
    container: 'binary',
  },
  {
    id: 'creo-part',
    name: 'Creo Part',
    application: 'Creo Parametric',
    extensions: ['.prt'],
    kind: 'part',
    container: 'binary',
  },
  {
    id: 'creo-assembly',
    name: 'Creo Assembly',
    application: 'Creo Parametric',
    extensions: ['.asm'],
    kind: 'assembly',
    container: 'binary',
  },
  {
    id: 'inventor-part',
    name: 'Inventor Part',
    application: 'Autodesk Inventor',
    extensions: ['.ipt'],
    kind: 'part',
    container: 'ole2',
  },
  {
    id: 'inventor-assembly',
    name: 'Inventor Assembly',
    application: 'Autodesk Inventor',
    extensions: ['.iam'],
    kind: 'assembly',
    container: 'ole2',
  },
  {
    id: 'parasolid-text',
    name: 'Parasolid Transmit (text)',
    application: 'Parasolid',
    extensions: ['.x_t', '.xmt_txt'],
    kind: 'exchange',
    container: 'ascii',
  },
  {
    id: 'parasolid-binary',
    name: 'Parasolid Transmit (binary)',
    application: 'Parasolid',
    extensions: ['.x_b', '.xmt_bin'],
    kind: 'exchange',
    container: 'binary',
  },
  {
    id: 'jt',
    name: 'JT',
    application: 'Siemens JT',
    extensions: ['.jt'],
    kind: 'exchange',
    container: 'binary',
  },
]

const BY_ID = new Map(CAD_FORMATS.map((format) => [format.id, format]))

export function cadFormat(id: CadFormatId): CadFormatSpec {
  const format = BY_ID.get(id)
  if (!format) throw new ImportError(`Unknown CAD format "${id}"`)
  return format
}

/** Every extension this module recognises, lower-case and dotted. */
export const CAD_EXTENSIONS: readonly string[] = [
  ...new Set(CAD_FORMATS.flatMap((format) => format.extensions)),
]

/** The extension of a file name, lower-cased, or `''` when it has none. */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}

/* -------------------------------------------------------------------------- */
/* Signatures                                                                  */
/* -------------------------------------------------------------------------- */

/** Compound File Binary Format — what SOLIDWORKS and Inventor wrap parts in. */
export const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const
export const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const
/** Every Parasolid transmit file opens with its alphabet block. */
export const PARASOLID_PREFIX = '**ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** How much of the head of a file the token scan looks at. */
export const HEADER_WINDOW = 1024

export function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

/** The head of the file as Latin-1 text, for scanning ASCII markers. */
export function headerText(bytes: Uint8Array, window = HEADER_WINDOW): string {
  const end = Math.min(bytes.length, window)
  let text = ''
  for (let index = 0; index < end; index += 1) text += String.fromCharCode(bytes[index] as number)
  return text
}

/** The container a file's first bytes prove it to be, if any. */
export function detectContainer(bytes: Uint8Array): CadContainer | null {
  if (startsWith(bytes, OLE2_SIGNATURE)) return 'ole2'
  if (startsWith(bytes, ZIP_SIGNATURE)) return 'zip'
  if (headerText(bytes, PARASOLID_PREFIX.length) === PARASOLID_PREFIX) return 'ascii'
  return null
}

/**
 * Vendor markers, in the order they are tried. Each is a literal that the
 * writing application leaves in the header of its own files; finding one is
 * good evidence, not finding one only means this build does not know the
 * marker that version writes.
 */
const VENDOR_TOKENS: readonly {
  readonly token: string
  readonly id: CadFormatId
  readonly assembly?: CadFormatId
}[] = [
  { token: 'UGII', id: 'nx-part' },
  { token: 'Pro/ENGINEER', id: 'creo-part', assembly: 'creo-assembly' },
  { token: 'ProCreo', id: 'creo-part', assembly: 'creo-assembly' },
  { token: 'V5_CF', id: 'catia-part', assembly: 'catia-product' },
  { token: 'CATIA', id: 'catia-part', assembly: 'catia-product' },
]

/** How sure the detector is about what it found. */
export type CadConfidence = 'signature' | 'token' | 'extension'

export interface CadDetection {
  readonly format: CadFormatSpec
  readonly confidence: CadConfidence
  /** Version string the header gave up, or `null` when it named none. */
  readonly version: string | null
  /** What the detector actually matched on, for a log line or a tooltip. */
  readonly evidence: string
}

/**
 * Works out what a file is.
 *
 * Signatures come first because they cannot be wrong, then vendor tokens, then
 * the extension. The extension is still needed even after a signature matches:
 * OLE2 says "SOLIDWORKS or Inventor", and only the name says which.
 */
export function detectCadFormat(bytes: Uint8Array, fileName = ''): CadDetection | null {
  const extension = extensionOf(fileName)
  const header = headerText(bytes)
  const byExtension = CAD_FORMATS.filter((format) => format.extensions.includes(extension))

  const parasolid = detectParasolid(bytes, header, extension)
  if (parasolid) return parasolid

  const jt = detectJt(header)
  if (jt) return jt

  if (startsWith(bytes, OLE2_SIGNATURE)) {
    const format = byExtension.find((candidate) => candidate.container === 'ole2')
    if (format) {
      return {
        format,
        confidence: 'signature',
        version: null,
        evidence: 'OLE2 compound file signature with a matching extension',
      }
    }
  }

  for (const vendor of VENDOR_TOKENS) {
    if (!header.includes(vendor.token)) continue
    // An .asm alongside a Creo marker is the assembly flavour of the same app.
    const id = vendor.assembly !== undefined && isAssemblyExtension(extension)
      ? vendor.assembly
      : vendor.id
    return {
      format: cadFormat(id),
      confidence: 'token',
      version: versionNear(header, vendor.token),
      evidence: `found the "${vendor.token}" marker in the header`,
    }
  }

  const fallback = byExtension[0]
  if (!fallback) return null
  // NX and Creo both call a part `.prt`, so without a marker the extension
  // cannot settle it. Say so rather than presenting the first guess as fact.
  const ambiguity =
    byExtension.length > 1
      ? `; ${byExtension.map((candidate) => candidate.application).join(' and ')} share it`
      : ''
  return {
    format: fallback,
    confidence: 'extension',
    version: null,
    evidence: `recognised the "${extension}" extension; no signature matched${ambiguity}`,
  }
}

/**
 * Whether an extension names an assembly. Read off the format table rather
 * than listed here, so adding a format keeps this correct by construction.
 */
function isAssemblyExtension(extension: string): boolean {
  return CAD_FORMATS.some(
    (format) => format.kind === 'assembly' && format.extensions.includes(extension),
  )
}

/**
 * Parasolid text and binary share one ASCII header, so the extension decides
 * where it can, and otherwise the body does: a text transmit file is ASCII all
 * the way down, and a binary one is not.
 */
function detectParasolid(
  bytes: Uint8Array,
  header: string,
  extension: string,
): CadDetection | null {
  if (!header.startsWith(PARASOLID_PREFIX)) return null

  const known = CAD_FORMATS.find(
    (format) =>
      format.extensions.includes(extension) && format.application === 'Parasolid',
  )
  const binary = known ? known.id === 'parasolid-binary' : hasBinaryBody(bytes)
  return {
    format: cadFormat(binary ? 'parasolid-binary' : 'parasolid-text'),
    confidence: 'signature',
    version: parasolidVersion(header),
    evidence: 'Parasolid transmit header',
  }
}

/** The schema or modeller version a Parasolid header declares. */
export function parasolidVersion(header: string): string | null {
  const schema = /SCH_(\w+)/.exec(header)
  if (schema?.[1]) return schema[1]
  const modeller = /modeller version\s+(\d+)/i.exec(header)
  return modeller?.[1] ?? null
}

/** Bytes outside printable ASCII past the header mean a binary body. */
function hasBinaryBody(bytes: Uint8Array): boolean {
  const start = Math.min(bytes.length, PARASOLID_PREFIX.length)
  for (let index = start; index < Math.min(bytes.length, HEADER_WINDOW); index += 1) {
    const byte = bytes[index] as number
    if (byte === 0) return true
    if (byte > 0x7e) return true
  }
  return false
}

/** A JT file opens with an eighty-byte ASCII banner naming its version. */
function detectJt(header: string): CadDetection | null {
  const match = /^Version\s+(\d+\.\d+)\s+JT/.exec(header)
  if (!match) return null
  return {
    format: cadFormat('jt'),
    confidence: 'signature',
    version: match[1] ?? null,
    evidence: 'JT version banner',
  }
}

/** A dotted version number sitting just after a vendor token, if there is one. */
function versionNear(header: string, token: string): string | null {
  const at = header.indexOf(token)
  if (at === -1) return null
  const match = /(\d+(?:\.\d+)+)/.exec(header.slice(at, at + 64))
  return match?.[1] ?? null
}

/* -------------------------------------------------------------------------- */
/* Import                                                                      */
/* -------------------------------------------------------------------------- */

/** Everything the import learned about the file, whether or not it read it. */
export interface CadImportMetadata {
  readonly fileName: string
  readonly fileSize: number
  readonly format: CadFormatSpec
  readonly confidence: CadConfidence
  readonly version: string | null
  readonly evidence: string
  readonly meshCount: number
  /** True when the geometry is a stand-in rather than the file's own. */
  readonly placeholder: boolean
  /** ISO 8601, injected so a caller (and a test) controls the clock. */
  readonly importedAt: string
}

export interface CadImportResult {
  readonly meshes: readonly NamedMesh[]
  readonly metadata: CadImportMetadata
  /** Anything the caller should show the user before they trust the result. */
  readonly warnings: readonly string[]
}

/**
 * A licensed translator, when one is installed.
 *
 * Returning `null` means "not my format"; throwing means the translator
 * recognised it and failed, which is worth telling the user about.
 */
export interface CadTranslator {
  readonly name: string
  translate(
    bytes: Uint8Array,
    detection: CadDetection,
    fileName: string,
  ): readonly NamedMesh[] | null
}

export interface CadImportOptions {
  /** Tried before falling back to a placeholder. */
  readonly translator?: CadTranslator
  /** Size of the placeholder box, in model units. */
  readonly placeholderSize?: number
  /** Injected so a caller controls the timestamp. */
  readonly now?: string
}

export const DEFAULT_PLACEHOLDER_SIZE = 100

/**
 * Imports a proprietary CAD file.
 *
 * Throws only when the file is not recognisable at all — an unreadable format
 * is a real failure, whereas a recognised format this build cannot tessellate
 * is a placeholder plus a warning, which is far more use than an error dialog.
 */
export function importCad(
  bytes: Uint8Array,
  fileName: string,
  options: CadImportOptions = {},
): CadImportResult {
  const detection = detectCadFormat(bytes, fileName)
  if (!detection) {
    throw new ImportError(
      `Cannot import "${fileName}": not a CAD format this build recognises`,
    )
  }

  const warnings: string[] = []
  if (detection.confidence === 'extension') {
    warnings.push(
      `"${fileName}" was identified as ${detection.format.name} from its extension alone; ` +
        'no signature in the file confirmed it',
    )
  }

  const translated = runTranslator(options.translator, bytes, detection, fileName, warnings)
  const meshes =
    translated ?? [placeholderMesh(baseName(fileName), detection, options.placeholderSize)]

  if (translated === null) {
    warnings.push(
      `${detection.format.name} geometry cannot be read without a licensed translator; ` +
        'the body shown is a placeholder, not the real model',
    )
  }

  return {
    meshes,
    metadata: {
      fileName,
      fileSize: bytes.length,
      format: detection.format,
      confidence: detection.confidence,
      version: detection.version,
      evidence: detection.evidence,
      meshCount: meshes.length,
      placeholder: translated === null,
      importedAt: options.now ?? new Date().toISOString(),
    },
    warnings,
  }
}

/** Runs an installed translator, turning a failure into a warning. */
function runTranslator(
  translator: CadTranslator | undefined,
  bytes: Uint8Array,
  detection: CadDetection,
  fileName: string,
  warnings: string[],
): readonly NamedMesh[] | null {
  if (!translator) return null
  let result: readonly NamedMesh[] | null
  try {
    result = translator.translate(bytes, detection, fileName)
  } catch (error) {
    warnings.push(`${translator.name} could not read the file: ${(error as Error).message}`)
    return null
  }
  // An empty list is a translator saying it read nothing, which is no better
  // than not having one.
  return result === null || result.length === 0 ? null : result
}

/** Reads a user-selected file. */
export async function importCadFile(
  file: File,
  options: CadImportOptions = {},
): Promise<CadImportResult> {
  return importCad(new Uint8Array(await file.arrayBuffer()), file.name, options)
}

/** Whether a file name is worth handing to {@link importCad} at all. */
export function isCadFileName(fileName: string): boolean {
  return CAD_EXTENSIONS.includes(extensionOf(fileName))
}

/** The file name without its directory or extension. */
export function baseName(fileName: string): string {
  const withoutPath = fileName.slice(Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\')) + 1)
  const dot = withoutPath.lastIndexOf('.')
  return dot <= 0 ? withoutPath : withoutPath.slice(0, dot)
}

/**
 * The stand-in body: a plain box, centred on the origin, named after the file
 * and the format it came from so the tree entry reads as what it is.
 */
export function placeholderMesh(
  name: string,
  detection: CadDetection,
  size = DEFAULT_PLACEHOLDER_SIZE,
): NamedMesh {
  return {
    name: `${name === '' ? 'Imported' : name} (${detection.format.name} placeholder)`,
    mesh: boxMesh(size),
    material: {
      name: 'Unresolved import',
      // A flat, obviously artificial grey — nobody should mistake it for a
      // material choice.
      color: { r: 0.55, g: 0.57, b: 0.6 },
      opacity: 0.6,
      metallic: 0,
      roughness: 0.9,
    },
  }
}

/** A cube of the given size, centred on the origin. */
export function boxMesh(size: number): MeshData {
  const half = Math.abs(size) / 2 || 0.5
  const corners: readonly (readonly [number, number, number])[] = [
    [-half, -half, -half],
    [half, -half, -half],
    [half, half, -half],
    [-half, half, -half],
    [-half, -half, half],
    [half, -half, half],
    [half, half, half],
    [-half, half, half],
  ]
  const faces: readonly (readonly [number, number, number, number])[] = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
  ]

  const builder = new MeshBuilder()
  for (const [a, b, c, d] of faces) {
    const pa = corners[a] as readonly [number, number, number]
    const pb = corners[b] as readonly [number, number, number]
    const pc = corners[c] as readonly [number, number, number]
    const pd = corners[d] as readonly [number, number, number]
    builder.addTriangle(pa, pb, pc)
    builder.addTriangle(pa, pc, pd)
  }
  return builder.build()
}
