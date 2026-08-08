import type { NewDocumentOptions, TectonicDocument } from '../domain/Document'
import { createNewDocument } from '../io/FileService'

/**
 * Builds the document a "New Document" click lands in.
 *
 * Nothing is modelled up front: no parts, no bodies, no history. What the user
 * gets is an empty sketch on the XY plane and an empty viewport, so the first
 * solid in the document is one they asked for. The placeholder box this used to
 * seed was an M0 scaffold for proving the viewport and the file round-trip, and
 * both are now covered by real modelling.
 */
export function createStarterDocument(options: NewDocumentOptions = {}): TectonicDocument {
  return createNewDocument(options)
}
