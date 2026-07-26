import type { NewDocumentOptions, TectonicDocument } from '../domain/Document'
import { createBody, createPart } from '../domain/Document'
import type { IKernel } from '../kernel/IKernel'
import { createNewDocument } from '../io/FileService'

/** Edge length of the M0 placeholder solid, in document units (mm). */
const TEST_BOX_SIZE = 60

/**
 * Builds the document a "New Document" click lands in: a single part holding one
 * kernel-generated box, so the viewport and the .tectonic round-trip both have
 * real geometry to work with during M0.
 */
export async function createStarterDocument(
  kernel: IKernel,
  options: NewDocumentOptions = {},
): Promise<TectonicDocument> {
  const document = createNewDocument(options)

  const shape = await kernel.createBox({
    width: TEST_BOX_SIZE,
    height: TEST_BOX_SIZE,
    depth: TEST_BOX_SIZE,
    center: { x: 0, y: TEST_BOX_SIZE / 2, z: 0 },
  })
  const mesh = await kernel.triangulate(shape)
  kernel.dispose(shape)

  return {
    ...document,
    parts: [createPart('part-1', 'Part 1', [createBody('body-1', 'Box 1', mesh)])],
  }
}
