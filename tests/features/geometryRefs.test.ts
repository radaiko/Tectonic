import { describe, expect, it } from 'vitest'
import type { MeshData } from '../../src/domain/MeshData'
import { FeatureType } from '../../src/features/domain/FeatureType'
import {
  ID_KEYS,
  REF_KEYS,
  buildReferences,
  readReferences,
  referencePatch,
} from '../../src/features/domain/geometryRefs'
import type { FeatureParameters } from '../../src/features/domain/parameters'
import { StubKernel } from '../../src/kernel/StubKernel'
import { surveyMeshEdges, surveyMeshFaces } from '../../src/kernel/references'
import { boxSolid, runOperation } from './support'

/**
 * The reference layer is what stops a face or edge selection from quietly
 * moving to different geometry when an upstream feature changes. These tests
 * exercise both halves: recording a pick as a fingerprint, and what a rebuild
 * does with one that no longer names anything.
 */

/** A box, plus the ingredients a picked selection is fingerprinted against. */
async function boxParts(size = 20) {
  const kernel = new StubKernel()
  const solid = await boxSolid(kernel, size)
  const mesh = await kernel.triangulate(solid.shape)
  return { kernel, solid, mesh, bodies: [{ id: solid.id, mesh }] }
}

/** The id of the box's top face, taken from the same survey a pick would use. */
function topFaceId(mesh: MeshData): string {
  const face = surveyMeshFaces(mesh).find((entry) => entry.normal.z > 0.99)
  expect(face).toBeDefined()
  return (face as { id: string }).id
}

describe('geometry references', () => {
  it('fingerprints a picked face against the body it was picked on', async () => {
    const { mesh, bodies, solid } = await boxParts()
    const faceId = topFaceId(mesh)

    const [reference] = buildReferences(bodies, 'face', [faceId])

    expect(reference?.id).toBe(faceId)
    expect(reference?.bodyId).toBe(solid.id)
    // Without the fingerprint the reference could only be believed, not checked.
    expect(reference?.fingerprint).toBeDefined()
  })

  it('keeps a picked list in pick order rather than survey order', async () => {
    const { mesh, bodies } = await boxParts()
    const [first, second] = surveyMeshFaces(mesh).map((face) => face.id)

    const built = buildReferences(bodies, 'face', [second as string, first as string])

    expect(built.map((entry) => entry.id)).toEqual([second, first])
  })

  it('drops an identifier that belongs to none of the bodies', async () => {
    const { bodies } = await boxParts()

    // Storing it unfingerprinted would be worse than storing nothing: the
    // rebuild would take it at face value and never check it.
    expect(buildReferences(bodies, 'face', ['face-nowhere'])).toEqual([])
  })

  it('round-trips a patch through the plain JSON parameters hold', async () => {
    const { mesh, bodies } = await boxParts()
    const faceId = topFaceId(mesh)

    const patch = referencePatch(bodies, 'face', [faceId])
    const stored = JSON.parse(JSON.stringify(patch)) as FeatureParameters

    expect(stored[ID_KEYS.face]).toEqual([faceId])
    const read = readReferences(stored, 'face')
    expect(read).toHaveLength(1)
    expect(read[0]?.fingerprint?.outermost).toBe(true)
  })

  it('reads nothing back out of parameters that hold no references', () => {
    expect(readReferences({ faceIds: ['face-0'] }, 'face')).toEqual([])
    expect(readReferences({ [REF_KEYS.face]: 'not a list' }, 'face')).toEqual([])
  })

  it('skips a reference whose fingerprint was written half-way', () => {
    const parameters: FeatureParameters = {
      [REF_KEYS.edge]: [
        { id: 'edge-0', bodyId: 'body-0', fingerprint: { length: 4 } },
        { bodyId: 'body-0' },
      ],
    }

    // The first keeps its identifier and loses only the unusable fingerprint;
    // the second names nothing at all and is dropped.
    const read = readReferences(parameters, 'edge')
    expect(read.map((entry) => entry.id)).toEqual(['edge-0'])
    expect(read[0]?.fingerprint).toBeUndefined()
  })

  it('fingerprints edges as well as faces', async () => {
    const { mesh, bodies } = await boxParts()
    const edgeId = surveyMeshEdges(mesh)[0]?.id as string

    const [reference] = buildReferences(bodies, 'edge', [edgeId])

    expect(reference?.id).toBe(edgeId)
    expect(reference?.fingerprint?.length).toBeGreaterThan(0)
  })
})

describe('resolving a selection at rebuild time', () => {
  it('opens the face a shell actually named', async () => {
    const { kernel, solid, mesh, bodies } = await boxParts()
    const faceId = topFaceId(mesh)

    const { meshes } = await runOperation(FeatureType.Shell, {
      kernel,
      solids: [solid],
      parameters: { thickness: 2, ...referencePatch(bodies, 'face', [faceId]) },
    })

    // The cavity is now open at the top, so the shell has fewer solid walls
    // than the box it came from — proof the named face was the one removed.
    expect(meshes[0]).toBeDefined()
    const opened = surveyMeshFaces(meshes[0] as MeshData)
    expect(opened.some((face) => face.normal.z > 0.99 && face.offset > 9)).toBe(false)
  })

  it('refuses to rebuild when the body a selection was picked on is gone', async () => {
    const { kernel, solid, mesh } = await boxParts()
    const faceId = topFaceId(mesh)

    // The reference names `body-9`, which the part does not hold. Falling back
    // to "shell every face of whatever is here" would answer a question nobody
    // asked and report it as a success.
    await expect(
      runOperation(FeatureType.Shell, {
        kernel,
        solids: [solid],
        parameters: {
          thickness: 2,
          faceIds: [faceId],
          [REF_KEYS.face]: [{ id: faceId, bodyId: 'body-9' }],
        },
      }),
    ).rejects.toThrow(/body-9/)
  })

  it('refuses to rebuild when a fingerprinted face has left the solid', async () => {
    const { kernel, solid } = await boxParts()

    // A reference to a face that is not on this solid and cannot be recovered:
    // it faces a direction nothing does, so neither the plane rule nor the
    // outermost rule can single anything out. This is the shape of failure an
    // upstream edit produces when it removes the geometry outright.
    await expect(
      runOperation(FeatureType.Shell, {
        kernel,
        solids: [solid],
        parameters: {
          thickness: 2,
          [REF_KEYS.face]: [
            {
              id: 'face-gone',
              bodyId: solid.id,
              fingerprint: {
                normal: { x: 0.6, y: 0.8, z: 0 },
                centroid: { x: 60, y: 80, z: 0 },
                offset: 100,
                area: 4,
                outermost: false,
              },
            },
          ],
        },
      }),
    ).rejects.toThrow(/Re-pick the faces/)
  })

  it('follows a face that only moved along its own normal', async () => {
    const kernel = new StubKernel()
    const short = await boxSolid(kernel, 20)
    const shortMesh = await kernel.triangulate(short.shape)
    const faceId = topFaceId(shortMesh)
    const patch = referencePatch([{ id: short.id, mesh: shortMesh }], 'face', [faceId])

    // The same body rebuilt taller: the top face keeps its meaning — it is
    // still the outermost +Z face — even though its identifier has moved on.
    const tall: typeof short = {
      ...short,
      shape: await kernel.createBox({ width: 20, height: 20, depth: 40 }),
    }

    const { meshes } = await runOperation(FeatureType.Shell, {
      kernel,
      solids: [tall],
      parameters: { thickness: 2, ...patch },
    })

    const opened = surveyMeshFaces(meshes[0] as MeshData)
    expect(opened.some((face) => face.normal.z > 0.99 && face.offset > 19)).toBe(false)
  })

  it('leaves a feature with no references reading its plain identifiers', async () => {
    const { kernel, solid, mesh } = await boxParts()
    const faceId = topFaceId(mesh)

    // What a document written before references existed holds. It still works;
    // it just cannot be checked, which is what the fingerprint would have added.
    const { meshes } = await runOperation(FeatureType.Shell, {
      kernel,
      solids: [solid],
      parameters: { thickness: 2, faceIds: [faceId] },
    })

    expect(meshes[0]).toBeDefined()
  })
})
