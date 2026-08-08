import { describe, expect, it } from 'vitest'
import { FeatureTree } from '../../src/features/FeatureTree'
import { inferParentFeatureIds } from '../../src/features/domain/dependencies'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import { SupportResolutionError, resolveSupportFrame } from '../../src/features/geometry/supportFrame'
import { StubKernel } from '../../src/kernel/StubKernel'
import { surveyMeshFaces, faceReference } from '../../src/kernel/references'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildRectangle } from '../../src/sketch/domain/builders'
import { faceSupport, originPlaneSupport } from '../../src/sketch/domain/SketchSupport'
import { evaluate, rectangleSketch, treeOf } from './support'

const NO_OWNERS = new Map<string, string>()

/** A sketch on a face of a body, fingerprinted against that body's tessellation. */
async function faceSketch(bodyId: string, mesh: Parameters<typeof surveyMeshFaces>[0]) {
  const survey = surveyMeshFaces(mesh)
  const top = survey.find((entry) => entry.normal.z > 0.99) ?? survey[0]
  const reference = faceReference(survey, top!.id)
  const sketch = new SketchModel({
    name: 'On the face',
    support: faceSupport(bodyId, top!.id, 0, reference?.fingerprint),
  })
  buildRectangle(sketch, { x: -2, y: -2 }, { x: 2, y: 2 })
  return sketch
}

describe('inferParentFeatureIds', () => {
  it('gives a first extrude on a base plane no parents at all', () => {
    const sketch = new SketchModel({ name: 'Base', support: originPlaneSupport('XY') })

    const parents = inferParentFeatureIds(
      FeatureType.Extrude,
      { operation: 'new-body' },
      { ownerByBody: NO_OWNERS, sketch },
    )

    // Ordering it behind anything would lock the timeline down harder than the
    // model warrants: it is built on nothing.
    expect(parents).toEqual([])
  })

  it('makes a feature depend on the body its sketch is attached to', () => {
    const sketch = new SketchModel({ name: 'On a face', support: faceSupport('body-1', 'face-0') })

    const parents = inferParentFeatureIds(
      FeatureType.Extrude,
      { operation: 'new-body' },
      { ownerByBody: new Map([['body-1', 'extrude-1']]), sketch },
    )

    expect(parents).toEqual(['extrude-1'])
  })

  it('makes a modifying feature depend on everything it will reach', () => {
    const parents = inferParentFeatureIds(
      FeatureType.Fillet,
      { radius: 2, edgeIds: [], bodyIds: [] },
      { ownerByBody: new Map([['body-1', 'extrude-1'], ['body-2', 'revolve-1']]) },
    )

    expect(parents.sort()).toEqual(['extrude-1', 'revolve-1'])
  })

  it('narrows to the bodies a feature names', () => {
    const parents = inferParentFeatureIds(
      FeatureType.Shell,
      { thickness: 2, bodyIds: ['body-2'] },
      { ownerByBody: new Map([['body-1', 'extrude-1'], ['body-2', 'revolve-1']]) },
    )

    expect(parents).toEqual(['revolve-1'])
  })

  it('makes a cut depend on the part it cuts from', () => {
    const sketch = new SketchModel({ name: 'Cut', support: originPlaneSupport('XY') })

    const parents = inferParentFeatureIds(
      FeatureType.Extrude,
      { operation: 'cut' },
      { ownerByBody: new Map([['body-1', 'extrude-1']]), sketch },
    )

    expect(parents).toEqual(['extrude-1'])
  })

  it('records the features a pattern copies', () => {
    const parents = inferParentFeatureIds(
      FeatureType.Pattern,
      { sourceFeatureIds: ['extrude-1'], bodyIds: ['body-1'] },
      { ownerByBody: new Map([['body-1', 'extrude-1']]) },
    )

    expect(parents).toEqual(['extrude-1'])
  })
})

describe('a tree whose dependencies are actually recorded', () => {
  /** An extrude followed by a shell that reaches for whatever it produced. */
  function shelledPart(): FeatureTree {
    const sketch = rectangleSketch(20, 20)
    const extrude = createFeature(FeatureType.Extrude, {
      id: 'extrude-1',
      name: 'Extrude 1',
      sketchId: sketch.id,
      parameters: { distance: 20 },
    })
    const shell = createFeature(FeatureType.Shell, {
      id: 'shell-1',
      name: 'Shell 1',
      parameters: { thickness: 2 },
      parentFeatureIds: inferParentFeatureIds(
        FeatureType.Shell,
        { thickness: 2 },
        { ownerByBody: new Map([['body-1', 'extrude-1']]) },
      ),
    })
    return treeOf(extrude, shell)
  }

  it('refuses to move a feature in front of what it is built on', () => {
    const tree = shelledPart()

    expect(tree.validateDependencies('shell-1', 0)).toBe(false)
    expect(tree.reorderFeature('shell-1', 0)).toBe(false)
    expect(tree.features.map((feature) => feature.id)).toEqual(['extrude-1', 'shell-1'])
  })

  it('takes the dependent with it when the feature it needs is deleted', () => {
    const tree = shelledPart()

    expect(tree.removeFeature('extrude-1').sort()).toEqual(['extrude-1', 'shell-1'])
    expect(tree.length).toBe(0)
  })

  it('reports the dependent so the caller can warn before deleting', () => {
    expect(shelledPart().getDependents('extrude-1').map((f) => f.id)).toEqual(['shell-1'])
  })
})

describe('a rebuild with a broken link in it', () => {
  it('blames the feature that failed rather than the one waiting on it', async () => {
    const sketch = rectangleSketch(20, 20)
    const extrude = createFeature(FeatureType.Extrude, {
      id: 'extrude-1',
      name: 'Extrude 1',
      // No sketch: this feature cannot build, which is the point.
      sketchId: 'missing-sketch',
    })
    const shell = createFeature(FeatureType.Shell, {
      id: 'shell-1',
      name: 'Shell 1',
      parameters: { thickness: 2 },
      parentFeatureIds: ['extrude-1'],
    })

    const result = await evaluate(treeOf(extrude, shell), [sketch])

    expect(result.failures).toHaveLength(2)
    expect(result.failures[0]?.error).toMatch(/missing from the document/)
    // Not "there is no solid for this feature to modify", which is true and
    // useless: the shell is fine, its input never arrived.
    expect(result.failures[1]?.error).toBe('Waiting on Extrude 1, which did not build')
  })

  it('reports which feature owns each body, so the next one can depend on it', async () => {
    const sketch = rectangleSketch(20, 20)
    const extrude = createFeature(FeatureType.Extrude, {
      id: 'extrude-1',
      sketchId: sketch.id,
      parameters: { distance: 20 },
    })

    const result = await evaluate(treeOf(extrude), [sketch])

    expect([...result.ownerByBody.values()]).toEqual(['extrude-1'])
  })
})

describe('a face-attached sketch across a parametric edit', () => {
  it('follows the face it sits on when the feature under it changes depth', async () => {
    const kernel = new StubKernel()
    // A box centred on the origin, then a deeper one: the top face moves from
    // z = 5 to z = 20 and is re-identified on the way.
    const shallow = await kernel.createBox({ width: 20, height: 20, depth: 10 })
    const deep = await kernel.createBox({ width: 20, height: 20, depth: 40 })

    const sketch = await faceSketch('body-1', await kernel.triangulate(shallow))

    const frame = await resolveSupportFrame(sketch.support, {
      kernel,
      shapeOf: () => deep,
    })

    // Landed on the top of the *new* solid, which is what a user editing an
    // extrusion's depth means by "the sketch on the top face".
    expect(frame.origin.z).toBeCloseTo(20, 6)
  })

  it('refuses rather than landing the sketch on a face nobody chose', async () => {
    const kernel = new StubKernel()
    const box = await kernel.createBox({ width: 20, height: 20, depth: 10 })
    const sketch = await faceSketch('body-1', await kernel.triangulate(box))

    // The body the sketch was attached to is no longer in the part.
    await expect(
      resolveSupportFrame(sketch.support, { kernel, shapeOf: () => undefined }),
    ).rejects.toThrow(SupportResolutionError)
  })

  it('will not carry a sketch on an inner ledge across an edit that moved it', async () => {
    const kernel = new StubKernel()

    /**
     * A block with a 10-deep notch taken out of its top right corner, leaving a
     * ledge 10 below the top. The block spans z ∈ [−h/2, h/2], so making it
     * taller carries the ledge up with the top — which is the edit under test.
     */
    const stepped = async (height: number) => {
      const block = await kernel.createBox({ width: 40, height: 20, depth: height })
      const notch = await kernel.createBox({
        width: 20,
        height: 40,
        depth: 10,
        center: { x: 15, y: 0, z: height / 2 - 5 },
      })
      return kernel.booleanSubtract(block, notch)
    }

    const before = await stepped(20)
    const survey = surveyMeshFaces(await kernel.triangulate(before))
    // The ledge: faces up, but there is a taller +Z face above it, so it is not
    // the outermost one and the "it slid along its normal" argument cannot apply.
    const ledge = survey
      .filter((entry) => entry.normal.z > 0.99)
      .sort((a, b) => a.offset - b.offset)[0]
    const reference = faceReference(survey, ledge!.id)
    expect(reference?.fingerprint?.outermost).toBe(false)

    const sketch = new SketchModel({
      name: 'On the ledge',
      support: faceSupport('body-1', ledge!.id, 0, reference?.fingerprint),
    })

    // The block gets taller, which moves the ledge. Nothing can single out a
    // face of the new solid as the same one, so this is a dependency error —
    // not a sketch quietly relocated to the top.
    const after = await stepped(60)
    await expect(
      resolveSupportFrame(sketch.support, { kernel, shapeOf: () => after }),
    ).rejects.toThrow(SupportResolutionError)
  })
})
