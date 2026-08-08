import { describe, expect, it } from 'vitest'
import {
  edgeReference,
  faceReference,
  fingerprintFace,
  isResolved,
  resolveEdge,
  resolveFace,
  resolveFaces,
  surveyFaces,
  surveyMeshEdges,
  surveyMeshFaces,
} from '../../src/kernel/references'
import type { FaceSurvey } from '../../src/kernel/references'
import { StubKernel } from '../../src/kernel/StubKernel'

/** A face survey entry, with the plane worked out from the normal and a point. */
function face(
  id: string,
  normal: { x: number; y: number; z: number },
  offset: number,
  area = 100,
): FaceSurvey {
  return {
    id,
    normal,
    offset,
    centroid: { x: normal.x * offset, y: normal.y * offset, z: normal.z * offset },
    area,
    kind: 'plane',
  }
}

const UP = { x: 0, y: 0, z: 1 }
const DOWN = { x: 0, y: 0, z: -1 }
const EAST = { x: 1, y: 0, z: 0 }

describe('face references', () => {
  it('resolves a face that has not moved by its identifier', () => {
    const survey = [face('a', UP, 10), face('b', DOWN, 0)]
    const reference = faceReference(survey, 'a')

    const resolution = resolveFace(survey, reference!)

    expect(resolution).toEqual({ status: 'exact', id: 'a' })
  })

  it('recognises a face that kept its plane but was re-identified', () => {
    const before = [face('a', UP, 10), face('b', DOWN, 0)]
    const reference = faceReference(before, 'a')
    // An unrelated edit renumbered the faces — which is exactly what the mesh
    // path does, since it numbers them in a canonical geometric order.
    const after = [face('face-0', DOWN, 0), face('face-1', UP, 10)]

    const resolution = resolveFace(after, reference!)

    expect(resolution).toEqual({ status: 'matched', id: 'face-1', by: 'plane' })
  })

  it('follows the top of an extrusion when its depth changes', () => {
    // The single most common parametric edit there is: the top face slides along
    // its own normal. Its plane changes, its id changes, and it is still the top.
    const before = [face('a', UP, 10), face('b', DOWN, 0), face('c', EAST, 5)]
    const reference = faceReference(before, 'a')
    const after = [face('x', UP, 25), face('y', DOWN, 0), face('z', EAST, 5)]

    const resolution = resolveFace(after, reference!)

    expect(resolution).toEqual({ status: 'matched', id: 'x', by: 'sweep' })
  })

  it('will not follow a face that was not the outermost one facing its way', () => {
    // An inner step, with another face above it. There is no sound reason to
    // call any face of the new solid "the same one", so it refuses.
    const before = [face('inner', UP, 5), face('top', UP, 10)]
    const reference = faceReference(before, 'inner')
    expect(reference?.fingerprint?.outermost).toBe(false)

    const resolution = resolveFace([face('x', UP, 30), face('y', UP, 12)], reference!)

    expect(resolution.status).toBe('missing')
  })

  it('refuses rather than choosing when two faces both fit', () => {
    const before = [face('a', UP, 10)]
    const reference = faceReference(before, 'a')
    // Two faces now lie in the recorded plane — a split, say. Picking either
    // would silently move whatever referenced it onto half of what was chosen.
    const after = [face('left', UP, 10, 50), face('right', UP, 10, 50)]

    const resolution = resolveFace(after, reference!)

    expect(resolution.status).toBe('ambiguous')
    expect(isResolved(resolution)).toBe(false)
    if (resolution.status === 'ambiguous') {
      expect(resolution.candidates).toEqual(['left', 'right'])
    }
  })

  it('never falls back to whatever inherited the identifier', () => {
    const before = [face('face-0', UP, 10)]
    const reference = faceReference(before, 'face-0')
    // `face-0` still exists — but it is a different face now, pointing the other
    // way. Resolving to it because the name matches is the whole bug.
    const after = [face('face-0', DOWN, 0), face('face-1', EAST, 3)]

    const resolution = resolveFace(after, reference!)

    expect(isResolved(resolution)).toBe(false)
  })

  it('resolves by identifier alone, and says so, when there is no fingerprint', () => {
    // What a document written before fingerprints existed carries. It is not
    // nothing, and it is not a guarantee either.
    const resolution = resolveFace([face('face-0', UP, 10)], { id: 'face-0' })

    expect(resolution).toEqual({ status: 'unverified', id: 'face-0' })
  })

  it('reports a reference to a face that has simply gone', () => {
    const resolution = resolveFace([face('face-0', UP, 10)], { id: 'face-9' })

    expect(resolution.status).toBe('missing')
  })

  it('picks the face of the right size when a plane holds two', () => {
    // Both candidates lie in the recorded plane and face the same way, so the
    // plane alone cannot separate them. Size can, and it is the difference
    // between a clean match and a needless "ambiguous".
    const before = [face('small', UP, 10, 4), face('big', UP, 10, 900)]
    const reference = faceReference(before, 'small')
    const after = [face('face-0', UP, 10, 4.2), face('face-1', UP, 10, 880)]

    const resolution = resolveFace(after, reference!)

    expect(resolution).toEqual({ status: 'matched', id: 'face-0', by: 'plane' })
  })

  it('keeps the failures when resolving a list', () => {
    const survey = [face('a', UP, 10), face('b', DOWN, 0)]
    const good = faceReference(survey, 'a')

    const { ids, failures } = resolveFaces(survey, [good!, { id: 'gone' }])

    expect(ids).toEqual(['a'])
    expect(failures).toHaveLength(1)
  })

  it('makes no reference to a face the solid has not got', () => {
    expect(faceReference([face('a', UP, 10)], 'b')).toBeNull()
  })

  it('marks the only face facing a direction as outermost', () => {
    const survey = [face('a', UP, 10), face('b', DOWN, 0)]

    expect(fingerprintFace(survey, survey[0] as FaceSurvey).outermost).toBe(true)
    expect(fingerprintFace(survey, survey[1] as FaceSurvey).outermost).toBe(true)
  })
})

describe('edge references', () => {
  it('resolves an edge that has not moved', () => {
    const kernel = new StubKernel()

    return kernel.createBox({ width: 10, height: 10, depth: 10 }).then(async (shape) => {
      const survey = surveyMeshEdges(await kernel.triangulate(shape))
      const reference = edgeReference(survey, survey[0]!.id)

      expect(resolveEdge(survey, reference!)).toEqual({ status: 'exact', id: survey[0]!.id })
    })
  })

  it('reports an edge that has gone rather than taking its neighbour', async () => {
    const kernel = new StubKernel()
    const small = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const large = await kernel.createBox({ width: 40, height: 40, depth: 40 })

    const before = surveyMeshEdges(await kernel.triangulate(small))
    const after = surveyMeshEdges(await kernel.triangulate(large))
    const reference = edgeReference(before, before[0]!.id)

    expect(isResolved(resolveEdge(after, reference!))).toBe(false)
  })
})

describe('surveying a real solid', () => {
  it('gives a box six faces with unit normals and equal areas', async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 10, height: 10, depth: 10 })

    const survey = await surveyFaces(kernel, shape)

    expect(survey).toHaveLength(6)
    for (const entry of survey) {
      expect(Math.hypot(entry.normal.x, entry.normal.y, entry.normal.z)).toBeCloseTo(1, 6)
      expect(entry.area).toBeCloseTo(100, 6)
    }
  })

  it(`puts every face's centroid on its own plane`, async () => {
    const kernel = new StubKernel()
    const shape = await kernel.createBox({ width: 12, height: 8, depth: 6 })

    for (const entry of surveyMeshFaces(await kernel.triangulate(shape))) {
      const projected =
        entry.normal.x * entry.centroid.x +
        entry.normal.y * entry.centroid.y +
        entry.normal.z * entry.centroid.z
      expect(projected).toBeCloseTo(entry.offset, 6)
    }
  })

  it('follows a box face through a change of size, the way an edit would', async () => {
    const kernel = new StubKernel()
    const before = await kernel.createBox({ width: 10, height: 10, depth: 10 })
    const after = await kernel.createBox({ width: 10, height: 10, depth: 30 })

    const survey = surveyMeshFaces(await kernel.triangulate(before))
    const top = survey.find((entry) => entry.normal.z > 0.99)
    const reference = faceReference(survey, top!.id)

    const resolution = resolveFace(surveyMeshFaces(await kernel.triangulate(after)), reference!)

    expect(isResolved(resolution)).toBe(true)
    expect(resolution.status).toBe('matched')
  })
})
