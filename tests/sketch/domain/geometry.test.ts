import { describe, expect, it } from 'vitest'
import {
  add,
  angleBetween,
  angleOf,
  arcContainsAngle,
  circleCircleIntersections,
  closestPointOnSegment,
  cross,
  distance,
  distanceToSegment,
  dot,
  length,
  lineCircleIntersections,
  lineLineIntersection,
  midpoint,
  normalize,
  normalizeAngle,
  pointOnCircle,
  scale,
  sub,
  vec,
} from '../../../src/sketch/domain/geometry'

const TAU = Math.PI * 2

describe('vector algebra', () => {
  it('adds and subtracts components', () => {
    expect(add(vec(1, 2), vec(3, 4))).toEqual({ x: 4, y: 6 })
    expect(sub(vec(1, 2), vec(3, 4))).toEqual({ x: -2, y: -2 })
  })

  it('scales a vector', () => {
    expect(scale(vec(2, -3), 2)).toEqual({ x: 4, y: -6 })
  })

  it('computes dot and cross products', () => {
    expect(dot(vec(1, 2), vec(3, 4))).toBe(11)
    expect(cross(vec(1, 0), vec(0, 1))).toBe(1)
  })

  it('computes length and distance', () => {
    expect(length(vec(3, 4))).toBe(5)
    expect(distance(vec(1, 1), vec(4, 5))).toBe(5)
  })

  it('normalizes to unit length', () => {
    expect(normalize(vec(0, 8))).toEqual({ x: 0, y: 1 })
  })

  it('returns the zero vector when normalizing zero length', () => {
    expect(normalize(vec(0, 0))).toEqual({ x: 0, y: 0 })
  })

  it('finds the midpoint of two points', () => {
    expect(midpoint(vec(0, 0), vec(4, 6))).toEqual({ x: 2, y: 3 })
  })
})

describe('angles', () => {
  it('reports the direction angle of a vector', () => {
    expect(angleOf(vec(0, 1))).toBeCloseTo(Math.PI / 2)
  })

  it('wraps angles into [0, 2pi)', () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2)
    expect(normalizeAngle(TAU + 1)).toBeCloseTo(1)
  })

  it('reports the unsigned angle between two directions', () => {
    expect(angleBetween(vec(1, 0), vec(0, 2))).toBeCloseTo(Math.PI / 2)
    expect(angleBetween(vec(1, 0), vec(-1, 0))).toBeCloseTo(Math.PI)
  })

  it('places a point on a circle at a given angle', () => {
    const p = pointOnCircle(vec(1, 1), 2, 0)
    expect(p.x).toBeCloseTo(3)
    expect(p.y).toBeCloseTo(1)
  })
})

describe('closestPointOnSegment', () => {
  it('projects onto the interior of the segment', () => {
    expect(closestPointOnSegment(vec(2, 5), vec(0, 0), vec(10, 0))).toEqual({ x: 2, y: 0 })
  })

  it('clamps to the start when the projection falls before it', () => {
    expect(closestPointOnSegment(vec(-5, 1), vec(0, 0), vec(10, 0))).toEqual({ x: 0, y: 0 })
  })

  it('clamps to the end when the projection falls past it', () => {
    expect(closestPointOnSegment(vec(50, 1), vec(0, 0), vec(10, 0))).toEqual({ x: 10, y: 0 })
  })

  it('returns the start for a degenerate segment', () => {
    expect(closestPointOnSegment(vec(5, 5), vec(1, 1), vec(1, 1))).toEqual({ x: 1, y: 1 })
  })

  it('measures perpendicular distance to a segment', () => {
    expect(distanceToSegment(vec(2, 5), vec(0, 0), vec(10, 0))).toBe(5)
  })
})

describe('lineLineIntersection', () => {
  it('finds the crossing point of two infinite lines', () => {
    const p = lineLineIntersection(vec(0, 0), vec(10, 0), vec(4, -5), vec(4, 5))
    expect(p).toEqual({ x: 4, y: 0 })
  })

  it('returns null for parallel lines', () => {
    expect(lineLineIntersection(vec(0, 0), vec(10, 0), vec(0, 1), vec(10, 1))).toBeNull()
  })

  it('rejects crossings outside the segments when restricted', () => {
    expect(
      lineLineIntersection(vec(0, 0), vec(1, 0), vec(4, -5), vec(4, 5), true),
    ).toBeNull()
  })

  it('accepts crossings inside the segments when restricted', () => {
    expect(
      lineLineIntersection(vec(0, 0), vec(10, 0), vec(4, -5), vec(4, 5), true),
    ).toEqual({ x: 4, y: 0 })
  })
})

describe('lineCircleIntersections', () => {
  it('returns both crossings for a secant line', () => {
    const hits = lineCircleIntersections(vec(-10, 0), vec(10, 0), vec(0, 0), 5)
    expect(hits).toHaveLength(2)
    expect(hits.map((h) => h.x).sort((a, b) => a - b)).toEqual([-5, 5])
  })

  it('returns a single crossing for a tangent line', () => {
    const hits = lineCircleIntersections(vec(-10, 5), vec(10, 5), vec(0, 0), 5)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.y).toBeCloseTo(5)
  })

  it('returns nothing when the line misses the circle', () => {
    expect(lineCircleIntersections(vec(-10, 9), vec(10, 9), vec(0, 0), 5)).toEqual([])
  })

  it('returns nothing for a degenerate line', () => {
    expect(lineCircleIntersections(vec(1, 1), vec(1, 1), vec(0, 0), 5)).toEqual([])
  })
})

describe('circleCircleIntersections', () => {
  it('returns two points for overlapping circles', () => {
    const hits = circleCircleIntersections(vec(0, 0), 5, vec(6, 0), 5)
    expect(hits).toHaveLength(2)
    expect(hits[0]?.x).toBeCloseTo(3)
    expect(Math.abs(hits[0]?.y ?? 0)).toBeCloseTo(4)
  })

  it('returns one point for externally tangent circles', () => {
    const hits = circleCircleIntersections(vec(0, 0), 5, vec(10, 0), 5)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.x).toBeCloseTo(5)
  })

  it('returns nothing for separated circles', () => {
    expect(circleCircleIntersections(vec(0, 0), 1, vec(10, 0), 1)).toEqual([])
  })

  it('returns nothing for nested circles', () => {
    expect(circleCircleIntersections(vec(0, 0), 10, vec(1, 0), 2)).toEqual([])
  })

  it('returns nothing for identical circles', () => {
    expect(circleCircleIntersections(vec(0, 0), 5, vec(0, 0), 5)).toEqual([])
  })
})

describe('arcContainsAngle', () => {
  it('accepts an angle inside a counter-clockwise sweep', () => {
    expect(arcContainsAngle(0, Math.PI, false, Math.PI / 2)).toBe(true)
  })

  it('rejects an angle outside a counter-clockwise sweep', () => {
    expect(arcContainsAngle(0, Math.PI, false, -Math.PI / 2)).toBe(false)
  })

  it('accepts an angle inside a clockwise sweep', () => {
    expect(arcContainsAngle(Math.PI, 0, true, Math.PI / 2)).toBe(true)
  })

  it('rejects an angle outside a clockwise sweep', () => {
    expect(arcContainsAngle(Math.PI, 0, true, (3 * Math.PI) / 2)).toBe(false)
  })
})
