import { describe, expect, it } from 'vitest'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import {
  buildCenterArc,
  buildCircle,
  buildEllipse,
  buildLine,
  buildPolygon,
  buildRectangle,
  buildSlot,
  buildSpline,
} from '../../src/sketch/domain/builders'
import { PointEntity, RectangleEntity } from '../../src/sketch/domain/SketchEntity'
import { describeEntity } from '../../src/sketch/entityProperties'

const model = (): SketchModel => new SketchModel({ gridSpacing: 0 })

function valueOf(properties: readonly { label: string; value: string }[], label: string): string {
  return properties.find((property) => property.label === label)?.value ?? ''
}

describe('describeEntity', () => {
  it('describes a point', () => {
    const sketch = model()
    const point = sketch.addEntity(new PointEntity({ x: 3, y: -4 }))

    const description = describeEntity(sketch, point)

    expect(description.kind).toBe('Point')
    expect(valueOf(description.properties, 'X')).toBe('3')
    expect(valueOf(description.properties, 'Y')).toBe('-4')
  })

  it('describes a line with its length and angle', () => {
    const sketch = model()
    const line = buildLine(sketch, { x: 0, y: 0 }, { x: 30, y: 40 })

    const { properties } = describeEntity(sketch, line)

    expect(valueOf(properties, 'Length')).toBe('50')
    expect(valueOf(properties, 'Start')).toBe('0, 0')
    expect(valueOf(properties, 'Angle')).toBe('53.13°')
  })

  it('describes a circle', () => {
    const sketch = model()
    const circle = buildCircle(sketch, { x: 1, y: 2 }, 5)

    const { properties } = describeEntity(sketch, circle)

    expect(valueOf(properties, 'Radius')).toBe('5')
    expect(valueOf(properties, 'Diameter')).toBe('10')
  })

  it('describes an arc with its sweep and direction', () => {
    const sketch = model()
    const arc = buildCenterArc(sketch, { x: 0, y: 0 }, { x: 10, y: 0 }, Math.PI / 2)

    const { properties } = describeEntity(sketch, arc)

    expect(valueOf(properties, 'Sweep')).toBe('90°')
    expect(valueOf(properties, 'Direction')).toBe('Counter-clockwise')
  })

  it('describes a clockwise arc', () => {
    const sketch = model()
    const arc = buildCenterArc(sketch, { x: 0, y: 0 }, { x: 10, y: 0 }, -Math.PI / 2)

    expect(valueOf(describeEntity(sketch, arc).properties, 'Direction')).toBe('Clockwise')
  })

  it('describes a rectangle by its extents', () => {
    const sketch = model()
    const rectangle = buildRectangle(sketch, { x: 0, y: 0 }, { x: 40, y: 20 })

    const { properties } = describeEntity(sketch, rectangle)

    expect(valueOf(properties, 'Width')).toBe('40')
    expect(valueOf(properties, 'Height')).toBe('20')
  })

  it('has nothing to say about a rectangle missing its corners', () => {
    const sketch = model()
    const orphan = sketch.addEntity(
      new RectangleEntity({
        corner1PointId: 'missing',
        corner2PointId: 'missing',
        corner3PointId: 'missing',
        corner4PointId: 'missing',
        lineIds: [],
      }),
    )

    expect(describeEntity(sketch, orphan).properties).toEqual([])
  })

  it('describes a slot', () => {
    const sketch = model()
    const slot = buildSlot(sketch, { x: 0, y: 0 }, { x: 30, y: 0 }, 12)

    const { properties } = describeEntity(sketch, slot)

    expect(valueOf(properties, 'Width')).toBe('12')
    expect(valueOf(properties, 'Span')).toBe('30')
  })

  it('describes a polygon', () => {
    const sketch = model()
    const polygon = buildPolygon(sketch, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ])

    const { properties } = describeEntity(sketch, polygon)

    expect(valueOf(properties, 'Vertices')).toBe('3')
    expect(valueOf(properties, 'Closed')).toBe('Yes')
  })

  it('describes an open polygon', () => {
    const sketch = model()
    const polygon = buildPolygon(
      sketch,
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      { closed: false },
    )

    expect(valueOf(describeEntity(sketch, polygon).properties, 'Closed')).toBe('No')
  })

  it('describes an ellipse', () => {
    const sketch = model()
    const ellipse = buildEllipse(sketch, { x: 0, y: 0 }, { x: 20, y: 0 }, 8)

    const { properties } = describeEntity(sketch, ellipse)

    expect(valueOf(properties, 'Major radius')).toBe('20')
    expect(valueOf(properties, 'Minor radius')).toBe('8')
  })

  it('describes a spline', () => {
    const sketch = model()
    const spline = buildSpline(sketch, [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])

    const { properties } = describeEntity(sketch, spline)

    expect(valueOf(properties, 'Control points')).toBe('3')
    expect(valueOf(properties, 'Degree')).toBe('3')
  })

  it('flags construction geometry', () => {
    const sketch = model()
    const circle = buildCircle(sketch, { x: 0, y: 0 }, 5, { isConstruction: true })

    expect(describeEntity(sketch, circle).isConstruction).toBe(true)
  })
})
