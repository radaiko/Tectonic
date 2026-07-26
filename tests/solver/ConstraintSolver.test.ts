import { describe, expect, it } from 'vitest'
import {
  AngleConstraint,
  CoincidentConstraint,
  CollinearConstraint,
  ConcentricConstraint,
  DiameterConstraint,
  DistanceConstraint,
  EqualConstraint,
  FixConstraint,
  HorizontalConstraint,
  LengthConstraint,
  MidpointConstraint,
  ParallelConstraint,
  PerpendicularConstraint,
  RadiusConstraint,
  SymmetricConstraint,
  TangentConstraint,
  VerticalConstraint,
} from '../../src/sketch/domain/Constraint'
import { PointEntity } from '../../src/sketch/domain/SketchEntity'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildCenterArc, buildCircle, buildLine } from '../../src/sketch/domain/builders'
import {
  angleBetween,
  distance,
  distanceToSegment,
  normalize,
  sub,
} from '../../src/sketch/domain/geometry'
import { ConstraintSolver } from '../../src/solver/ConstraintSolver'

const solver = new ConstraintSolver()

function fixLine(model: SketchModel, lineId: string): void {
  const line = model.requireEntity(lineId)
  for (const pointId of line.referencedIds) {
    model.addConstraint(new FixConstraint({ pointId }))
  }
}

describe('solving an empty sketch', () => {
  it('succeeds with no degrees of freedom', () => {
    const result = solver.solve(new SketchModel())
    expect(result.success).toBe(true)
    expect(result.dof).toBe(0)
    expect(result.errors).toEqual([])
  })
})

describe('geometric constraints', () => {
  it('makes a line horizontal', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 7 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(line.startPointId).y).toBeCloseTo(
      model.requirePoint(line.endPointId).y,
    )
  })

  it('makes a line vertical', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 6, y: 10 })
    model.addConstraint(new VerticalConstraint({ lineId: line.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(line.startPointId).x).toBeCloseTo(
      model.requirePoint(line.endPointId).x,
    )
  })

  it('makes two lines parallel', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const b = buildLine(model, { x: 0, y: 5 }, { x: 8, y: 9 })
    fixLine(model, a.id)
    model.addConstraint(new ParallelConstraint({ lineId1: a.id, lineId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    const dirB = sub(model.requirePoint(b.endPointId), model.requirePoint(b.startPointId))
    expect(normalize(dirB).y).toBeCloseTo(0)
  })

  it('makes two lines perpendicular', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const b = buildLine(model, { x: 0, y: 0 }, { x: 8, y: 2 })
    fixLine(model, a.id)
    model.addConstraint(new PerpendicularConstraint({ lineId1: a.id, lineId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    const dirA = sub(model.requirePoint(a.endPointId), model.requirePoint(a.startPointId))
    const dirB = sub(model.requirePoint(b.endPointId), model.requirePoint(b.startPointId))
    expect(angleBetween(dirA, dirB)).toBeCloseTo(Math.PI / 2)
  })

  it('merges two coincident points', () => {
    const model = new SketchModel()
    const a = model.addEntity(new PointEntity({ x: 0, y: 0 }))
    const b = model.addEntity(new PointEntity({ x: 10, y: 4 }))
    model.addConstraint(new FixConstraint({ pointId: a.id }))
    model.addConstraint(new CoincidentConstraint({ pointId: b.id, targetPointId: a.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(distance(model.requirePoint(a.id), model.requirePoint(b.id))).toBeCloseTo(0)
  })

  it('pulls a point onto a line', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    fixLine(model, line.id)
    const point = model.addEntity(new PointEntity({ x: 4, y: 9 }))
    model.addConstraint(new CoincidentConstraint({ pointId: point.id, targetEntityId: line.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(point.id).y).toBeCloseTo(0)
  })

  it('pulls a point onto a circle', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    model.addConstraint(new FixConstraint({ pointId: circle.centerPointId }))
    model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 5 }))
    const point = model.addEntity(new PointEntity({ x: 12, y: 0 }))
    model.addConstraint(new CoincidentConstraint({ pointId: point.id, targetEntityId: circle.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(distance(model.requirePoint(point.id), { x: 0, y: 0 })).toBeCloseTo(5)
  })

  it('makes a line tangent to a circle', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: -10 }, { x: 0, y: 10 })
    fixLine(model, line.id)
    const circle = buildCircle(model, { x: 5, y: 0 }, 3)
    model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 3 }))
    model.addConstraint(new TangentConstraint({ entityId1: line.id, entityId2: circle.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(Math.abs(model.requirePoint(circle.centerPointId).x)).toBeCloseTo(3)
  })

  it('makes two circles tangent', () => {
    const model = new SketchModel()
    const a = buildCircle(model, { x: 0, y: 0 }, 5)
    const b = buildCircle(model, { x: 20, y: 0 }, 4)
    model.addConstraint(new FixConstraint({ pointId: a.centerPointId }))
    model.addConstraint(new RadiusConstraint({ circleId: a.id, value: 5 }))
    model.addConstraint(new RadiusConstraint({ circleId: b.id, value: 4 }))
    model.addConstraint(new TangentConstraint({ entityId1: a.id, entityId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    const centers = distance(
      model.requirePoint(a.centerPointId),
      model.requirePoint(b.centerPointId),
    )
    expect(centers).toBeCloseTo(9)
  })

  it('makes two circles concentric', () => {
    const model = new SketchModel()
    const a = buildCircle(model, { x: 0, y: 0 }, 5)
    const b = buildCircle(model, { x: 9, y: 2 }, 3)
    model.addConstraint(new FixConstraint({ pointId: a.centerPointId }))
    model.addConstraint(new ConcentricConstraint({ circleId1: a.id, circleId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(
      distance(model.requirePoint(a.centerPointId), model.requirePoint(b.centerPointId)),
    ).toBeCloseTo(0)
  })

  it('makes two lines collinear', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const b = buildLine(model, { x: 20, y: 4 }, { x: 30, y: 6 })
    fixLine(model, a.id)
    model.addConstraint(new CollinearConstraint({ lineId1: a.id, lineId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(b.startPointId).y).toBeCloseTo(0)
    expect(model.requirePoint(b.endPointId).y).toBeCloseTo(0)
  })

  it('makes two lines equal in length', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const b = buildLine(model, { x: 0, y: 5 }, { x: 4, y: 5 })
    fixLine(model, a.id)
    model.addConstraint(new EqualConstraint({ entityId1: a.id, entityId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(distance(model.requirePoint(b.startPointId), model.requirePoint(b.endPointId))).toBeCloseTo(
      10,
    )
  })

  it('makes two circles equal in radius', () => {
    const model = new SketchModel()
    const a = buildCircle(model, { x: 0, y: 0 }, 5)
    const b = buildCircle(model, { x: 20, y: 0 }, 2)
    model.addConstraint(new RadiusConstraint({ circleId: a.id, value: 5 }))
    model.addConstraint(new EqualConstraint({ entityId1: a.id, entityId2: b.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(b.radius).toBeCloseTo(5)
  })

  it('holds a point at the midpoint of a line', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    fixLine(model, line.id)
    const point = model.addEntity(new PointEntity({ x: 3, y: 7 }))
    model.addConstraint(new MidpointConstraint({ pointId: point.id, lineId: line.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(point.id)).toMatchObject({ x: expect.closeTo(5), y: expect.closeTo(0) })
  })

  it('mirrors two points about a line', () => {
    const model = new SketchModel()
    const mirror = buildLine(model, { x: 0, y: -10 }, { x: 0, y: 10 })
    fixLine(model, mirror.id)
    const a = model.addEntity(new PointEntity({ x: -5, y: 2 }))
    const b = model.addEntity(new PointEntity({ x: 7, y: 3 }))
    model.addConstraint(new FixConstraint({ pointId: a.id }))
    model.addConstraint(
      new SymmetricConstraint({ entityId1: a.id, entityId2: b.id, symmetryLineId: mirror.id }),
    )

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(b.id).x).toBeCloseTo(5)
    expect(model.requirePoint(b.id).y).toBeCloseTo(2)
  })

  it('mirrors two lines about a line', () => {
    const model = new SketchModel()
    const mirror = buildLine(model, { x: 0, y: -10 }, { x: 0, y: 10 })
    fixLine(model, mirror.id)
    const a = buildLine(model, { x: -8, y: 1 }, { x: -3, y: 6 })
    const b = buildLine(model, { x: 9, y: 2 }, { x: 2, y: 4 })
    fixLine(model, a.id)
    model.addConstraint(
      new SymmetricConstraint({ entityId1: a.id, entityId2: b.id, symmetryLineId: mirror.id }),
    )

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(b.startPointId).x).toBeCloseTo(8)
    expect(model.requirePoint(b.endPointId).x).toBeCloseTo(3)
  })

  it('never moves a fixed point', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 7 })
    model.addConstraint(new FixConstraint({ pointId: line.startPointId }))
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    expect(solver.solve(model).success).toBe(true)
    expect(model.requirePoint(line.startPointId)).toMatchObject({ x: 0, y: 0 })
    expect(model.requirePoint(line.endPointId).y).toBeCloseTo(0)
  })
})

describe('dimensional constraints', () => {
  it('drives the distance between two points', () => {
    const model = new SketchModel()
    const a = model.addEntity(new PointEntity({ x: 0, y: 0 }))
    const b = model.addEntity(new PointEntity({ x: 3, y: 0 }))
    model.addConstraint(new FixConstraint({ pointId: a.id }))
    model.addConstraint(new DistanceConstraint({ pointId1: a.id, pointId2: b.id, value: 10 }))

    expect(solver.solve(model).success).toBe(true)
    expect(distance(model.requirePoint(a.id), model.requirePoint(b.id))).toBeCloseTo(10)
  })

  it('drives the angle between two lines', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const b = buildLine(model, { x: 0, y: 0 }, { x: 0, y: 10 })
    fixLine(model, a.id)
    model.addConstraint(new FixConstraint({ pointId: b.startPointId }))
    model.addConstraint(new AngleConstraint({ lineId1: a.id, lineId2: b.id, value: 45 }))

    expect(solver.solve(model).success).toBe(true)
    const dirA = sub(model.requirePoint(a.endPointId), model.requirePoint(a.startPointId))
    const dirB = sub(model.requirePoint(b.endPointId), model.requirePoint(b.startPointId))
    expect(angleBetween(dirA, dirB)).toBeCloseTo(Math.PI / 4)
  })

  it('drives the length of a line', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 3, y: 0 })
    model.addConstraint(new FixConstraint({ pointId: line.startPointId }))
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 25 }))

    expect(solver.solve(model).success).toBe(true)
    expect(distance(model.requirePoint(line.startPointId), model.requirePoint(line.endPointId)))
      .toBeCloseTo(25)
  })

  it('drives the radius of a circle', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 12 }))

    expect(solver.solve(model).success).toBe(true)
    expect(circle.radius).toBeCloseTo(12)
  })

  it('drives the diameter of a circle', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    model.addConstraint(new DiameterConstraint({ circleId: circle.id, value: 20 }))

    expect(solver.solve(model).success).toBe(true)
    expect(circle.radius).toBeCloseTo(10)
  })

  it('re-solves when a driving dimension changes', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 3, y: 0 })
    model.addConstraint(new FixConstraint({ pointId: line.startPointId }))
    const length = model.addConstraint(new LengthConstraint({ lineId: line.id, value: 10 }))
    solver.solve(model)

    length.value = 40
    solver.solve(model)

    expect(distance(model.requirePoint(line.startPointId), model.requirePoint(line.endPointId)))
      .toBeCloseTo(40)
  })

  it('measures a driven dimension instead of enforcing it', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 8, y: 0 })
    fixLine(model, line.id)
    const reference = model.addConstraint(
      new LengthConstraint({ lineId: line.id, value: 999, isDriving: false }),
    )

    const result = solver.solve(model)

    expect(result.success).toBe(true)
    expect(reference.value).toBeCloseTo(8)
    expect(result.constraints.get(reference.id)).toBeCloseTo(8)
  })

  it('reports the target value of a driving dimension', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    const radius = model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 12 }))

    expect(solver.solve(model).constraints.get(radius.id)).toBeCloseTo(12)
  })
})

describe('expressions', () => {
  it('evaluates a dimension that references another dimension', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 3, y: 0 })
    const circle = buildCircle(model, { x: 50, y: 0 }, 1)
    model.addConstraint(new FixConstraint({ pointId: line.startPointId }))
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 20, name: 'd1' }))
    const radius = model.addConstraint(
      new RadiusConstraint({ circleId: circle.id, value: 0, expression: '= d1 / 4' }),
    )

    expect(solver.solve(model).success).toBe(true)
    expect(radius.value).toBeCloseTo(5)
    expect(circle.radius).toBeCloseTo(5)
  })

  it('reports circular expression references', () => {
    const model = new SketchModel()
    const first = buildCircle(model, { x: 0, y: 0 }, 1)
    const second = buildCircle(model, { x: 50, y: 0 }, 1)
    model.addConstraint(
      new RadiusConstraint({ circleId: first.id, value: 1, name: 'd1', expression: '= d2 + 1' }),
    )
    model.addConstraint(
      new RadiusConstraint({ circleId: second.id, value: 1, name: 'd2', expression: '= d1 + 1' }),
    )

    const result = solver.solve(model)

    expect(result.errors.join(' ')).toMatch(/circular/i)
  })

  it('reports an expression that fails to evaluate', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 1)
    model.addConstraint(
      new RadiusConstraint({ circleId: circle.id, value: 1, expression: '= missing * 2' }),
    )

    expect(solver.solve(model).errors.join(' ')).toMatch(/Unknown parameter/)
  })
})

describe('degrees of freedom', () => {
  it('counts every free coordinate of an unconstrained line', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    expect(solver.solve(model).dof).toBe(4)
  })

  it('drops one degree of freedom per independent constraint', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))
    expect(solver.solve(model).dof).toBe(3)

    model.addConstraint(new FixConstraint({ pointId: line.startPointId }))
    expect(solver.solve(model).dof).toBe(1)

    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 10 }))
    expect(solver.solve(model).dof).toBe(0)
  })

  it('names the entities that still have freedom', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    const result = solver.solve(model)

    expect(result.underConstrainedEntityIds).toContain(line.id)
    expect(result.underConstrainedEntityIds).toContain(line.startPointId)
  })

  it('reports no free entities for a fully constrained sketch', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    fixLine(model, line.id)

    expect(solver.solve(model).underConstrainedEntityIds).toEqual([])
  })
})

describe('over-constrained sketches', () => {
  it('reports a redundant constraint', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    const result = solver.solve(model)

    expect(result.errors.join(' ')).toMatch(/over-constrained/i)
  })

  it('fails when constraints conflict', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    fixLine(model, line.id)
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 25 }))

    const result = solver.solve(model)

    expect(result.success).toBe(false)
    expect(result.errors).not.toHaveLength(0)
  })
})

describe('tryAddConstraint', () => {
  it('adds a constraint that leaves the sketch solvable', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 3 })

    const outcome = solver.tryAddConstraint(model, new HorizontalConstraint({ lineId: line.id }))

    expect(outcome.ok).toBe(true)
    expect(model.constraints.size).toBe(1)
  })

  it('rejects a constraint that would over-constrain the sketch', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    const outcome = solver.tryAddConstraint(model, new HorizontalConstraint({ lineId: line.id }))

    expect(outcome.ok).toBe(false)
    expect(outcome.error).toMatch(/over-constrain/i)
    expect(model.constraints.size).toBe(1)
  })

  it('rejects a constraint that cannot be satisfied', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    fixLine(model, line.id)

    const outcome = solver.tryAddConstraint(
      model,
      new LengthConstraint({ lineId: line.id, value: 25 }),
    )

    expect(outcome.ok).toBe(false)
    expect(model.constraints.size).toBe(2)
  })

  it('reports a constraint that references missing geometry', () => {
    const model = new SketchModel()
    const outcome = solver.tryAddConstraint(model, new HorizontalConstraint({ lineId: 'ghost' }))

    expect(outcome.ok).toBe(false)
    expect(outcome.error).toMatch(/unknown entity/)
  })
})

describe('solver options', () => {
  it('leaves the model untouched when apply is false', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 7 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    const result = solver.solve(model, { apply: false })

    expect(result.success).toBe(true)
    expect(model.requirePoint(line.endPointId).y).toBe(7)
    expect(result.entityPositions.get(line.endPointId)?.y).toBeCloseTo(3.5)
  })

  it('holds pinned points in place', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 8 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    solver.solve(model, { pinnedPointIds: [line.endPointId] })

    expect(model.requirePoint(line.endPointId).y).toBe(8)
    expect(model.requirePoint(line.startPointId).y).toBeCloseTo(8)
  })

  it('reports the radius of a solved circle in the position map', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 5)
    model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 9 }))

    const result = solver.solve(model)

    expect(result.entityPositions.get(circle.id)?.radius).toBeCloseTo(9)
  })

  it('stops after the iteration budget', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    fixLine(model, line.id)
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 25 }))

    const result = solver.solve(model, { maxIterations: 3 })

    expect(result.success).toBe(false)
    expect(result.iterations).toBeLessThanOrEqual(3)
  })
})

describe('arcs', () => {
  it('keeps both endpoints on the arc radius', () => {
    const model = new SketchModel()
    const arc = buildCenterArc(model, { x: 0, y: 0 }, { x: 4, y: 0 }, Math.PI / 2)
    model.addConstraint(new FixConstraint({ pointId: arc.centerPointId }))
    model.addConstraint(new RadiusConstraint({ circleId: arc.id, value: 10 }))

    expect(solver.solve(model).success).toBe(true)
    const center = model.requirePoint(arc.centerPointId)
    expect(distance(center, model.requirePoint(arc.startPointId))).toBeCloseTo(10)
    expect(distance(center, model.requirePoint(arc.endPointId))).toBeCloseTo(10)
  })

  it('makes a line tangent to an arc', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: -10 }, { x: 0, y: 10 })
    fixLine(model, line.id)
    const arc = buildCenterArc(model, { x: 6, y: 0 }, { x: 9, y: 0 }, Math.PI / 2)
    model.addConstraint(new RadiusConstraint({ circleId: arc.id, value: 3 }))
    model.addConstraint(new TangentConstraint({ entityId1: line.id, entityId2: arc.id }))

    expect(solver.solve(model).success).toBe(true)
    const center = model.requirePoint(arc.centerPointId)
    expect(
      distanceToSegment(center, model.requirePoint(line.startPointId), model.requirePoint(line.endPointId)),
    ).toBeCloseTo(3)
  })
})
