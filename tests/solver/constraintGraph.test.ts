import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildLine } from '../../src/sketch/domain/builders'
import { HorizontalConstraint, ParallelConstraint } from '../../src/sketch/domain/Constraint'
import { buildConstraintGraph } from '../../src/solver/constraintGraph'

describe('buildConstraintGraph', () => {
  it('maps constraints to the entities they touch', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const horizontal = model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    const graph = buildConstraintGraph(model)

    expect(graph.entitiesOf(horizontal.id)).toEqual([line.id])
    expect(graph.constraintsOf(line.id)).toEqual([horizontal.id])
  })

  it('returns nothing for ids outside the sketch', () => {
    const graph = buildConstraintGraph(new SketchModel())
    expect(graph.entitiesOf('nope')).toEqual([])
    expect(graph.constraintsOf('nope')).toEqual([])
  })

  it('groups a line with the points it is built from', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const clusters = buildConstraintGraph(model).clusters()

    expect(clusters).toHaveLength(1)
    expect(clusters[0]).toContain(line.id)
    expect(clusters[0]).toHaveLength(3)
  })

  it('keeps unrelated geometry in separate clusters', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildLine(model, { x: 0, y: 5 }, { x: 10, y: 5 })
    expect(buildConstraintGraph(model).clusters()).toHaveLength(2)
  })

  it('merges clusters joined by a constraint', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const b = buildLine(model, { x: 0, y: 5 }, { x: 10, y: 5 })
    model.addConstraint(new ParallelConstraint({ lineId1: a.id, lineId2: b.id }))

    expect(buildConstraintGraph(model).clusters()).toHaveLength(1)
  })

  it('lists every entity and constraint id', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const horizontal = model.addConstraint(new HorizontalConstraint({ lineId: line.id }))
    const graph = buildConstraintGraph(model)

    expect(graph.entityIds).toHaveLength(3)
    expect(graph.constraintIds).toEqual([horizontal.id])
  })
})
