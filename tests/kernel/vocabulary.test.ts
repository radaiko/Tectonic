import { describe, expect, it } from 'vitest'
import type { EdgeSurvey, FaceSurvey } from '../../src/kernel/references'
import { translateEdgeIds, translateFaceIds } from '../../src/kernel/vocabulary'

/**
 * The two vocabularies of a 10×10×5 box: `face-N`/`edge-N` as a pick names them,
 * and the hashes a B-Rep backend issues. Same geometry, disjoint identifiers —
 * which is the whole situation the pairing exists to bridge.
 */
const face = (
  id: string,
  normal: FaceSurvey['normal'],
  offset: number,
  area: number,
  centroid: FaceSurvey['centroid'],
): FaceSurvey => ({ id, normal, offset, area, centroid, kind: 'plane' })

const TOP = { x: 0, y: 0, z: 1 }
const BOTTOM = { x: 0, y: 0, z: -1 }
const EAST = { x: 1, y: 0, z: 0 }

const MESH_FACES: FaceSurvey[] = [
  face('face-0', BOTTOM, 0, 100, { x: 5, y: 5, z: 0 }),
  face('face-1', TOP, 5, 100, { x: 5, y: 5, z: 5 }),
  face('face-2', EAST, 10, 50, { x: 10, y: 5, z: 2.5 }),
]

const BREP_FACES: FaceSurvey[] = [
  face('f0ab', EAST, 10, 50, { x: 10, y: 5, z: 2.5 }),
  face('f1cd', TOP, 5, 100, { x: 5, y: 5, z: 5 }),
  face('f2ef', BOTTOM, 0, 100, { x: 5, y: 5, z: 0 }),
]

const edge = (id: string, midpoint: EdgeSurvey['midpoint'], length: number): EdgeSurvey => ({
  id,
  midpoint,
  length,
  direction: { x: 1, y: 0, z: 0 },
})

const MESH_EDGES: EdgeSurvey[] = [
  edge('edge-0', { x: 5, y: 0, z: 0 }, 10),
  edge('edge-1', { x: 5, y: 10, z: 5 }, 10),
]

const BREP_EDGES: EdgeSurvey[] = [
  edge('e9zz', { x: 5, y: 10, z: 5 }, 10),
  edge('e8yy', { x: 5, y: 0, z: 0 }, 10),
]

describe('translateFaceIds', () => {
  it('pairs a picked face with the B-Rep face standing in the same place', () => {
    const translated = translateFaceIds(MESH_FACES, BREP_FACES, ['face-1'])

    expect(translated.ids).toEqual(['f1cd'])
    expect(translated.failures).toEqual([])
  })

  it('keeps the order of the selection it was given', () => {
    const translated = translateFaceIds(MESH_FACES, BREP_FACES, ['face-2', 'face-0', 'face-1'])

    expect(translated.ids).toEqual(['f0ab', 'f2ef', 'f1cd'])
  })

  /**
   * An id already in the target vocabulary is the common case when the selection
   * came from the backend's own report. Translating it could only be a chance to
   * get it wrong, so it is passed through.
   */
  it('leaves an id that already names a B-Rep face alone', () => {
    const translated = translateFaceIds(MESH_FACES, BREP_FACES, ['f1cd'])

    expect(translated.ids).toEqual(['f1cd'])
    expect(translated.failures).toEqual([])
  })

  it('reports an id that belongs to neither vocabulary', () => {
    const translated = translateFaceIds(MESH_FACES, BREP_FACES, ['face-nowhere'])

    expect(translated.ids).toEqual([])
    expect(translated.failures).toEqual(['This solid has no face face-nowhere'])
  })

  /**
   * A tessellated cylinder is a fan of narrow strips where the B-Rep has one
   * curved face. No strip is that face, and picking whichever B-Rep face happens
   * to be nearest would silently retarget the operation — so it is reported.
   */
  it('reports a picked face that no single B-Rep face answers to', () => {
    const strip = face('face-7', { x: 0.7071, y: 0.7071, z: 0 }, 7.07, 3, { x: 5, y: 5, z: 2.5 })
    const translated = translateFaceIds([...MESH_FACES, strip], BREP_FACES, ['face-7'])

    expect(translated.ids).toEqual([])
    expect(translated.failures).toHaveLength(1)
    expect(translated.failures[0]).toMatch(/face-7/)
  })

  it('reports an ambiguous pairing rather than choosing between the candidates', () => {
    const twins: FaceSurvey[] = [
      face('fa', TOP, 5, 100, { x: 5, y: 5, z: 5 }),
      face('fb', TOP, 5, 100, { x: 5, y: 5, z: 5 }),
    ]
    const translated = translateFaceIds(MESH_FACES, twins, ['face-1'])

    expect(translated.ids).toEqual([])
    expect(translated.failures[0]).toMatch(/cannot be told which one was meant/)
  })

  it('carries what it can and reports what it cannot, in one pass', () => {
    const translated = translateFaceIds(MESH_FACES, BREP_FACES, ['face-1', 'face-nowhere'])

    expect(translated.ids).toEqual(['f1cd'])
    expect(translated.failures).toHaveLength(1)
  })

  it('has nothing to say about an empty selection', () => {
    expect(translateFaceIds(MESH_FACES, BREP_FACES, [])).toEqual({ ids: [], failures: [] })
  })
})

describe('translateEdgeIds', () => {
  it('pairs a picked edge with the B-Rep edge running the same way', () => {
    const translated = translateEdgeIds(MESH_EDGES, BREP_EDGES, ['edge-0', 'edge-1'])

    expect(translated.ids).toEqual(['e8yy', 'e9zz'])
    expect(translated.failures).toEqual([])
  })

  it('leaves an id that already names a B-Rep edge alone', () => {
    expect(translateEdgeIds(MESH_EDGES, BREP_EDGES, ['e9zz']).ids).toEqual(['e9zz'])
  })

  it('reports an id that belongs to neither vocabulary', () => {
    const translated = translateEdgeIds(MESH_EDGES, BREP_EDGES, ['edge-nowhere'])

    expect(translated.ids).toEqual([])
    expect(translated.failures).toEqual(['This solid has no edge edge-nowhere'])
  })

  /**
   * One chord of a tessellated circular edge is shorter than, and sits off, the
   * arc the B-Rep holds. There is no sound pairing, and a fillet aimed at some
   * other edge of the solid is worse than a fillet that says it cannot.
   */
  it('reports a chord of a curved edge that no B-Rep edge answers to', () => {
    const chord = edge('edge-5', { x: 9.8, y: 1.2, z: 0 }, 0.6)
    const translated = translateEdgeIds([...MESH_EDGES, chord], BREP_EDGES, ['edge-5'])

    expect(translated.ids).toEqual([])
    expect(translated.failures).toHaveLength(1)
    expect(translated.failures[0]).toMatch(/edge-5/)
  })

  it('reports an ambiguous pairing rather than choosing between the candidates', () => {
    const twins = [edge('ea', { x: 5, y: 0, z: 0 }, 10), edge('eb', { x: 5, y: 0, z: 0 }, 10)]
    const translated = translateEdgeIds(MESH_EDGES, twins, ['edge-0'])

    expect(translated.ids).toEqual([])
    expect(translated.failures[0]).toMatch(/edges now run where/)
  })
})
