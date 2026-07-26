import type { NewDocumentOptions, TectonicDocument } from '../domain/Document'
import { TECTONIC_FORMAT_VERSION, createDocument } from '../domain/Document'

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
