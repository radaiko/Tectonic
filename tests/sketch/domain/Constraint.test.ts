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
  constraintFromJSON,
  isDimensional,
} from '../../../src/sketch/domain/Constraint'

describe('geometric constraints', () => {
  it('links a point to another point', () => {
    const c = new CoincidentConstraint({ id: 'c1', pointId: 'p1', targetPointId: 'p2' })
    expect(c.entityIds).toEqual(['p1', 'p2'])
    expect(c.targetEntityId).toBeUndefined()
  })

  it('links a point to a curve', () => {
    const c = new CoincidentConstraint({ pointId: 'p1', targetEntityId: 'l1' })
    expect(c.entityIds).toEqual(['p1', 'l1'])
  })

  it('rejects a coincident constraint with no target', () => {
    expect(() => new CoincidentConstraint({ pointId: 'p1' })).toThrow(/target/)
  })

  it('exposes the line a horizontal constraint applies to', () => {
    expect(new HorizontalConstraint({ lineId: 'l1' }).entityIds).toEqual(['l1'])
  })

  it('exposes the line a vertical constraint applies to', () => {
    expect(new VerticalConstraint({ lineId: 'l1' }).entityIds).toEqual(['l1'])
  })

  it('exposes both lines of a parallel constraint', () => {
    expect(new ParallelConstraint({ lineId1: 'a', lineId2: 'b' }).entityIds).toEqual(['a', 'b'])
  })

  it('exposes both lines of a perpendicular constraint', () => {
    expect(new PerpendicularConstraint({ lineId1: 'a', lineId2: 'b' }).entityIds).toEqual([
      'a',
      'b',
    ])
  })

  it('exposes both entities of a tangent constraint', () => {
    expect(new TangentConstraint({ entityId1: 'a', entityId2: 'b' }).entityIds).toEqual(['a', 'b'])
  })

  it('exposes both circles of a concentric constraint', () => {
    expect(new ConcentricConstraint({ circleId1: 'a', circleId2: 'b' }).entityIds).toEqual([
      'a',
      'b',
    ])
  })

  it('exposes both lines of a collinear constraint', () => {
    expect(new CollinearConstraint({ lineId1: 'a', lineId2: 'b' }).entityIds).toEqual(['a', 'b'])
  })

  it('exposes both entities of an equal constraint', () => {
    expect(new EqualConstraint({ entityId1: 'a', entityId2: 'b' }).entityIds).toEqual(['a', 'b'])
  })

  it('exposes the point and line of a midpoint constraint', () => {
    expect(new MidpointConstraint({ pointId: 'p', lineId: 'l' }).entityIds).toEqual(['p', 'l'])
  })

  it('exposes all three entities of a symmetric constraint', () => {
    expect(
      new SymmetricConstraint({ entityId1: 'a', entityId2: 'b', symmetryLineId: 'm' }).entityIds,
    ).toEqual(['a', 'b', 'm'])
  })

  it('exposes the point a fix constraint anchors', () => {
    expect(new FixConstraint({ pointId: 'p' }).entityIds).toEqual(['p'])
  })
})

describe('dimensional constraints', () => {
  it('defaults to driving', () => {
    expect(new DistanceConstraint({ pointId1: 'a', pointId2: 'b', value: 10 }).isDriving).toBe(true)
  })

  it('can be marked as driven (reference only)', () => {
    const c = new LengthConstraint({ lineId: 'l', value: 5, isDriving: false })
    expect(c.isDriving).toBe(false)
  })

  it('carries an optional expression', () => {
    const c = new RadiusConstraint({ circleId: 'c', value: 0, expression: '= d1 * 2' })
    expect(c.expression).toBe('= d1 * 2')
  })

  it('carries an angle in degrees', () => {
    const c = new AngleConstraint({ lineId1: 'a', lineId2: 'b', value: 45 })
    expect(c.value).toBe(45)
    expect(c.entityIds).toEqual(['a', 'b'])
  })

  it('exposes the circle a diameter constraint applies to', () => {
    expect(new DiameterConstraint({ circleId: 'c', value: 8 }).entityIds).toEqual(['c'])
  })

  it('recognises dimensional constraints', () => {
    expect(isDimensional(new DistanceConstraint({ pointId1: 'a', pointId2: 'b', value: 1 }))).toBe(
      true,
    )
    expect(isDimensional(new HorizontalConstraint({ lineId: 'l' }))).toBe(false)
  })
})

describe('constraintFromJSON', () => {
  const samples = [
    new CoincidentConstraint({ pointId: 'p', targetPointId: 'q' }),
    new CoincidentConstraint({ pointId: 'p', targetEntityId: 'l' }),
    new HorizontalConstraint({ lineId: 'l' }),
    new VerticalConstraint({ lineId: 'l' }),
    new ParallelConstraint({ lineId1: 'a', lineId2: 'b' }),
    new PerpendicularConstraint({ lineId1: 'a', lineId2: 'b' }),
    new TangentConstraint({ entityId1: 'a', entityId2: 'b' }),
    new ConcentricConstraint({ circleId1: 'a', circleId2: 'b' }),
    new CollinearConstraint({ lineId1: 'a', lineId2: 'b' }),
    new EqualConstraint({ entityId1: 'a', entityId2: 'b' }),
    new MidpointConstraint({ pointId: 'p', lineId: 'l' }),
    new SymmetricConstraint({ entityId1: 'a', entityId2: 'b', symmetryLineId: 'm' }),
    new FixConstraint({ pointId: 'p' }),
    new DistanceConstraint({ pointId1: 'a', pointId2: 'b', value: 10 }),
    new AngleConstraint({ lineId1: 'a', lineId2: 'b', value: 30 }),
    new LengthConstraint({ lineId: 'l', value: 4 }),
    new RadiusConstraint({ circleId: 'c', value: 2, name: 'd1' }),
    new DiameterConstraint({ circleId: 'c', value: 4, expression: '= d1 * 2' }),
  ]

  it.each(samples)('rebuilds a $type constraint', (constraint) => {
    const restored = constraintFromJSON(constraint.toJSON())
    expect(restored.type).toBe(constraint.type)
    expect(restored.toJSON()).toEqual(constraint.toJSON())
  })

  it('rejects an unknown constraint type', () => {
    expect(() => constraintFromJSON({ type: 'wobbly', id: 'x' } as never)).toThrow(
      /Unknown constraint type/,
    )
  })
})
