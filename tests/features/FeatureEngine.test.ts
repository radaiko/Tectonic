import { describe, expect, it, vi } from 'vitest'
import { FeatureEngine, evaluateFeatures } from '../../src/features/FeatureEngine'
import { FeatureTree } from '../../src/features/FeatureTree'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import { StubKernel } from '../../src/kernel/StubKernel'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildRectangle } from '../../src/sketch/domain/builders'
import { circleSketch, evaluate, extentOf, rectangleSketch, treeOf } from './support'

function extrude(sketch: SketchModel, distance = 25, id = 'extrude-1') {
  return createFeature(FeatureType.Extrude, {
    id,
    name: 'Extrude 1',
    sketchId: sketch.id,
    parameters: { distance },
  })
}

describe('FeatureEngine', () => {
  it('evaluates an empty tree into nothing at all', async () => {
    const result = await evaluate(new FeatureTree(), [])

    expect(result.bodies).toEqual([])
    expect(result.outcomes).toEqual([])
    expect(result.failures).toEqual([])
    expect(result.bodiesByFeature.size).toBe(0)
  })

  it('turns a single extrude into one body of the sketched size', async () => {
    const sketch = rectangleSketch(20, 10)

    const result = await evaluate(treeOf(extrude(sketch, 25)), [sketch])

    expect(result.bodies).toHaveLength(1)
    expect(extentOf((result.bodies[0] as { mesh: never }).mesh)).toEqual({ x: 20, y: 10, z: 25 })
    expect(result.outcomes[0]?.featureName).toBe('Extrude 1')
    expect(result.outcomes[0]?.error).toBeNull()
  })

  it('evaluates features in tree order, each seeing the one before it', async () => {
    const sketch = rectangleSketch(20, 20)
    const tree = treeOf(
      extrude(sketch, 30),
      createFeature(FeatureType.Fillet, { id: 'fillet-1', parameters: { radius: 2 } }),
    )

    const result = await evaluate(tree, [sketch])

    expect(result.outcomes.map((outcome) => outcome.featureId)).toEqual(['extrude-1', 'fillet-1'])
    expect(result.failures).toEqual([])
    // The fillet takes the body over from the extrude that created it.
    expect(result.bodiesByFeature.get('fillet-1')).toHaveLength(1)
    expect(result.bodiesByFeature.get('extrude-1')).toBeUndefined()
  })

  it('marks a failing feature and carries on with the rest', async () => {
    const sketch = rectangleSketch()
    const broken = createFeature(FeatureType.Extrude, { id: 'broken', sketchId: 'missing-sketch' })
    const tree = treeOf(broken, extrude(sketch))

    const result = await evaluate(tree, [sketch])

    expect(tree.requireFeature('broken').status).toBe('error')
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.error).toMatch(/missing from the document/)
    expect(result.bodies).toHaveLength(1)
  })

  it('clears errors from the previous rebuild before starting a new one', async () => {
    const sketch = rectangleSketch()
    const feature = extrude(sketch)
    const tree = treeOf(feature)
    feature.markError('stale failure')

    const result = await evaluate(tree, [sketch])

    expect(feature.status).toBe('active')
    expect(result.failures).toEqual([])
  })

  it('rebuilds to a new size after a parameter changes', async () => {
    const sketch = rectangleSketch(20, 10)
    const feature = extrude(sketch, 25)
    const tree = treeOf(feature)
    const kernel = new StubKernel()

    const before = await evaluate(tree, [sketch], kernel)
    feature.setParameters({ distance: 50 })
    const after = await evaluate(tree, [sketch], kernel)

    expect(extentOf((before.bodies[0] as { mesh: never }).mesh).z).toBe(25)
    expect(extentOf((after.bodies[0] as { mesh: never }).mesh).z).toBe(50)
  })

  it('follows a dependency chain, cutting what an earlier feature built', async () => {
    const block = rectangleSketch(40, 40, { name: 'Block' })
    const pocket = circleSketch(5, { name: 'Pocket' })
    const tree = treeOf(
      extrude(block, 20),
      createFeature(FeatureType.CutExtrude, {
        id: 'cut-1',
        sketchId: pocket.id,
        parameters: { distance: 30, reverse: false, operation: 'cut' },
        parentFeatureIds: ['extrude-1'],
      }),
    )

    const result = await evaluate(tree, [block, pocket])

    expect(result.failures).toEqual([])
    expect(result.bodies).toHaveLength(1)
    // The pocket leaves the outer size alone but adds the hole's walls.
    expect(extentOf((result.bodies[0] as { mesh: never }).mesh)).toEqual({ x: 40, y: 40, z: 20 })
  })

  it('repeats a body with a rectangular pattern', async () => {
    const sketch = rectangleSketch(20, 10)
    const tree = treeOf(
      extrude(sketch, 10),
      createFeature(FeatureType.Pattern, {
        id: 'pattern-1',
        parameters: { patternType: 'rectangular', count1: 3, spacing1: 20, count2: 1 },
        parentFeatureIds: ['extrude-1'],
      }),
    )

    const result = await evaluate(tree, [sketch])

    expect(result.bodies).toHaveLength(1)
    expect(extentOf((result.bodies[0] as { mesh: never }).mesh).x).toBe(60)
  })

  it('mirrors a body into a second one when the copies are kept apart', async () => {
    const sketch = new SketchModel({ name: 'Offset', plane: 'XY' })
    buildRectangle(sketch, { x: 10, y: -5 }, { x: 30, y: 5 })
    const tree = treeOf(
      extrude(sketch, 10),
      createFeature(FeatureType.Mirror, {
        id: 'mirror-1',
        parameters: { plane: 'YZ', merge: false },
        parentFeatureIds: ['extrude-1'],
      }),
    )

    const result = await evaluate(tree, [sketch])

    expect(result.bodies).toHaveLength(2)
    expect(result.bodiesByFeature.get('mirror-1')).toHaveLength(1)
    expect(extentOf((result.bodies[1] as { mesh: never }).mesh).x).toBe(20)
  })

  it('skips suppressed features and everything behind the roll bar', async () => {
    const sketch = rectangleSketch(20, 10)
    const tree = treeOf(
      extrude(sketch, 25),
      createFeature(FeatureType.Fillet, { id: 'fillet-1', parameters: { radius: 1 } }),
      createFeature(FeatureType.Shell, { id: 'shell-1', parameters: { thickness: 1 } }),
    )
    tree.suppressFeature('fillet-1')
    tree.moveRollBar(2)

    const result = await evaluate(tree, [sketch])

    expect(result.outcomes.map((outcome) => outcome.featureId)).toEqual(['extrude-1'])
  })

  it('releases every kernel shape once it has been tessellated', async () => {
    const sketch = rectangleSketch()
    const kernel = new StubKernel()
    const dispose = vi.spyOn(kernel, 'dispose')

    await new FeatureEngine(kernel).evaluate(treeOf(extrude(sketch)), [sketch])

    expect(dispose).toHaveBeenCalled()
  })

  it('passes tessellation settings on to the kernel', async () => {
    const sketch = circleSketch(6)
    const kernel = new StubKernel()
    const triangulate = vi.spyOn(kernel, 'triangulate')

    await new FeatureEngine(kernel).evaluate(treeOf(extrude(sketch)), [sketch], {
      tessellation: { linearDeflection: 0.05 },
    })

    expect(triangulate).toHaveBeenCalledWith(expect.anything(), { linearDeflection: 0.05 })
  })

  it('offers a wrapper for callers that do not keep an engine around', async () => {
    const sketch = rectangleSketch(10, 10)

    const result = await evaluateFeatures(treeOf(extrude(sketch, 5)), [sketch], new StubKernel())

    expect(result.bodies).toHaveLength(1)
  })

  it('reports the feature a body belongs to under its own name', async () => {
    const sketch = rectangleSketch()
    const feature = extrude(sketch)

    const result = await evaluate(treeOf(feature), [sketch])

    expect(result.bodies[0]?.name).toBe('Extrude 1')
    expect(result.bodiesByFeature.get(feature.id)).toHaveLength(1)
  })
})
