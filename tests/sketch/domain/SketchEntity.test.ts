import { describe, expect, it } from 'vitest'
import {
  ArcEntity,
  CircleEntity,
  EllipseEntity,
  LineEntity,
  PointEntity,
  PolygonEntity,
  RectangleEntity,
  SlotEntity,
  SplineEntity,
  entityFromJSON,
  isPoint,
} from '../../../src/sketch/domain/SketchEntity'

describe('PointEntity', () => {
  it('keeps the supplied id and coordinates', () => {
    const point = new PointEntity({ id: 'p1', x: 3, y: 4 })
    expect(point.type).toBe('point')
    expect(point.id).toBe('p1')
    expect(point.x).toBe(3)
    expect(point.y).toBe(4)
    expect(point.isConstruction).toBe(false)
  })

  it('generates an id when none is supplied', () => {
    expect(new PointEntity({ x: 0, y: 0 }).id).not.toHaveLength(0)
  })

  it('round-trips through JSON', () => {
    const point = new PointEntity({ id: 'p1', x: 3, y: 4, isConstruction: true })
    const restored = PointEntity.fromJSON(point.toJSON())
    expect(restored.toJSON()).toEqual(point.toJSON())
    expect(restored.isConstruction).toBe(true)
  })
})

describe('LineEntity', () => {
  it('references its two endpoints', () => {
    const line = new LineEntity({ id: 'l1', startPointId: 'a', endPointId: 'b' })
    expect(line.pointIds).toEqual(['a', 'b'])
    expect(line.referencedIds).toEqual(['a', 'b'])
  })

  it('round-trips through JSON', () => {
    const line = new LineEntity({ id: 'l1', startPointId: 'a', endPointId: 'b' })
    expect(LineEntity.fromJSON(line.toJSON()).toJSON()).toEqual(line.toJSON())
  })
})

describe('CircleEntity', () => {
  it('round-trips through JSON', () => {
    const circle = new CircleEntity({ id: 'c1', centerPointId: 'a', radius: 12 })
    expect(circle.referencedIds).toEqual(['a'])
    expect(CircleEntity.fromJSON(circle.toJSON()).radius).toBe(12)
  })
})

describe('ArcEntity', () => {
  it('round-trips through JSON', () => {
    const arc = new ArcEntity({
      id: 'a1',
      centerPointId: 'c',
      startPointId: 's',
      endPointId: 'e',
      radius: 5,
      clockwise: true,
    })
    expect(arc.referencedIds).toEqual(['c', 's', 'e'])
    const restored = ArcEntity.fromJSON(arc.toJSON())
    expect(restored.clockwise).toBe(true)
    expect(restored.radius).toBe(5)
  })
})

describe('RectangleEntity', () => {
  it('exposes its four corners and four edges', () => {
    const rect = new RectangleEntity({
      id: 'r1',
      corner1PointId: 'p1',
      corner2PointId: 'p2',
      corner3PointId: 'p3',
      corner4PointId: 'p4',
      lineIds: ['l1', 'l2', 'l3', 'l4'],
    })
    expect(rect.cornerPointIds).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(rect.referencedIds).toEqual(['p1', 'p2', 'p3', 'p4', 'l1', 'l2', 'l3', 'l4'])
    expect(RectangleEntity.fromJSON(rect.toJSON()).toJSON()).toEqual(rect.toJSON())
  })
})

describe('SlotEntity', () => {
  it('round-trips through JSON', () => {
    const slot = new SlotEntity({
      id: 's1',
      center1PointId: 'a',
      center2PointId: 'b',
      width: 8,
    })
    expect(slot.referencedIds).toEqual(['a', 'b'])
    expect(SlotEntity.fromJSON(slot.toJSON()).width).toBe(8)
  })
})

describe('PolygonEntity', () => {
  it('round-trips through JSON', () => {
    const poly = new PolygonEntity({ id: 'g1', pointIds: ['a', 'b', 'c'], closed: true })
    expect(poly.referencedIds).toEqual(['a', 'b', 'c'])
    expect(PolygonEntity.fromJSON(poly.toJSON()).closed).toBe(true)
  })
})

describe('EllipseEntity', () => {
  it('round-trips through JSON', () => {
    const ellipse = new EllipseEntity({
      id: 'e1',
      centerPointId: 'c',
      majorAxisPointId: 'm',
      minorRadius: 3,
    })
    expect(ellipse.referencedIds).toEqual(['c', 'm'])
    expect(EllipseEntity.fromJSON(ellipse.toJSON()).minorRadius).toBe(3)
  })
})

describe('SplineEntity', () => {
  it('defaults to degree 3', () => {
    expect(new SplineEntity({ controlPointIds: ['a', 'b'] }).degree).toBe(3)
  })

  it('round-trips through JSON', () => {
    const spline = new SplineEntity({ id: 'sp1', controlPointIds: ['a', 'b'], degree: 2 })
    expect(spline.referencedIds).toEqual(['a', 'b'])
    expect(SplineEntity.fromJSON(spline.toJSON()).degree).toBe(2)
  })
})

describe('entityFromJSON', () => {
  const samples = [
    new PointEntity({ x: 1, y: 2 }),
    new LineEntity({ startPointId: 'a', endPointId: 'b' }),
    new CircleEntity({ centerPointId: 'a', radius: 1 }),
    new ArcEntity({
      centerPointId: 'a',
      startPointId: 'b',
      endPointId: 'c',
      radius: 1,
      clockwise: false,
    }),
    new RectangleEntity({
      corner1PointId: 'a',
      corner2PointId: 'b',
      corner3PointId: 'c',
      corner4PointId: 'd',
      lineIds: ['1', '2', '3', '4'],
    }),
    new SlotEntity({ center1PointId: 'a', center2PointId: 'b', width: 2 }),
    new PolygonEntity({ pointIds: ['a'], closed: false }),
    new EllipseEntity({ centerPointId: 'a', majorAxisPointId: 'b', minorRadius: 1 }),
    new SplineEntity({ controlPointIds: ['a'] }),
  ]

  it.each(samples)('rebuilds a $type entity', (entity) => {
    const restored = entityFromJSON(entity.toJSON())
    expect(restored.type).toBe(entity.type)
    expect(restored.toJSON()).toEqual(entity.toJSON())
  })

  it('rejects an unknown entity type', () => {
    expect(() => entityFromJSON({ type: 'blob', id: 'x', isConstruction: false } as never)).toThrow(
      /Unknown sketch entity type/,
    )
  })
})

describe('isPoint', () => {
  it('narrows point entities', () => {
    expect(isPoint(new PointEntity({ x: 0, y: 0 }))).toBe(true)
    expect(isPoint(new CircleEntity({ centerPointId: 'a', radius: 1 }))).toBe(false)
  })
})
