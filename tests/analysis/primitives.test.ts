import { describe, expect, it } from 'vitest'
import { equals, vec3 } from '../../src/domain/vec3'
import {
  boundsGap,
  closestPointOnSegment,
  closestPointOnTriangle,
  closestPointsOnSegments,
  meshTriangles,
  pointTriangleDistance,
  segmentTriangleDistance,
  segmentTriangleIntersection,
  triangleArea,
  triangleBounds,
  triangleNormal,
  triangleTriangleDistance,
} from '../../src/analysis/primitives'
import type { Triangle } from '../../src/analysis/types'
import { boxMesh, triangleMesh } from '../helpers/meshes'

const UNIT_TRIANGLE: Triangle = { a: vec3(0, 0, 0), b: vec3(1, 0, 0), c: vec3(0, 1, 0) }

describe('meshTriangles', () => {
  it('unpacks the indexed mesh into triangles', () => {
    expect(meshTriangles(triangleMesh())).toHaveLength(1)
    expect(meshTriangles(boxMesh())).toHaveLength(12)
  })
})

describe('triangleNormal and triangleArea', () => {
  it('measures a right triangle', () => {
    expect(triangleArea(UNIT_TRIANGLE)).toBeCloseTo(0.5)
    expect(equals(triangleNormal(UNIT_TRIANGLE), vec3(0, 0, 1), 1e-9)).toBe(true)
  })

  it('reports zero area for a degenerate triangle', () => {
    expect(triangleArea({ a: vec3(0, 0, 0), b: vec3(1, 0, 0), c: vec3(2, 0, 0) })).toBe(0)
  })
})

describe('closestPointOnSegment', () => {
  it('projects onto the interior', () => {
    expect(closestPointOnSegment(vec3(0.5, 3, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toEqual(
      vec3(0.5, 0, 0),
    )
  })

  it('clamps past the ends', () => {
    expect(closestPointOnSegment(vec3(-5, 0, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toEqual(
      vec3(0, 0, 0),
    )
    expect(closestPointOnSegment(vec3(5, 0, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toEqual(
      vec3(1, 0, 0),
    )
  })

  it('handles a zero-length segment', () => {
    expect(closestPointOnSegment(vec3(5, 5, 5), vec3(1, 1, 1), vec3(1, 1, 1))).toEqual(
      vec3(1, 1, 1),
    )
  })
})

describe('closestPointsOnSegments', () => {
  it('finds the crossing distance of two skew segments', () => {
    const result = closestPointsOnSegments(
      vec3(-1, 0, 0),
      vec3(1, 0, 0),
      vec3(0, -1, 2),
      vec3(0, 1, 2),
    )
    expect(result.distance).toBeCloseTo(2)
    expect(equals(result.from, vec3(0, 0, 0), 1e-9)).toBe(true)
    expect(equals(result.to, vec3(0, 0, 2), 1e-9)).toBe(true)
  })

  it('measures parallel segments across the gap', () => {
    const result = closestPointsOnSegments(
      vec3(0, 0, 0),
      vec3(10, 0, 0),
      vec3(0, 4, 0),
      vec3(10, 4, 0),
    )
    expect(result.distance).toBeCloseTo(4)
  })

  it('clamps to the ends of segments that do not overlap', () => {
    const result = closestPointsOnSegments(
      vec3(0, 0, 0),
      vec3(1, 0, 0),
      vec3(5, 0, 0),
      vec3(6, 0, 0),
    )
    expect(result.distance).toBeCloseTo(4)
  })

  it('degrades to a point when a segment has no length', () => {
    expect(
      closestPointsOnSegments(vec3(0, 0, 0), vec3(0, 0, 0), vec3(3, 0, 0), vec3(3, 0, 0)).distance,
    ).toBeCloseTo(3)
    expect(
      closestPointsOnSegments(vec3(0, 0, 0), vec3(0, 0, 0), vec3(0, 4, 0), vec3(10, 4, 0)).distance,
    ).toBeCloseTo(4)
    expect(
      closestPointsOnSegments(vec3(0, 4, 0), vec3(10, 4, 0), vec3(0, 0, 0), vec3(0, 0, 0)).distance,
    ).toBeCloseTo(4)
  })

  it('clamps when the closest approach runs off the far end', () => {
    const result = closestPointsOnSegments(
      vec3(0, 0, 0),
      vec3(1, 0, 0),
      vec3(-5, 1, 0),
      vec3(-4, 1, 0),
    )
    expect(result.distance).toBeCloseTo(Math.hypot(4, 1))
  })
})

describe('closestPointOnTriangle', () => {
  it('projects a point above the face', () => {
    expect(equals(closestPointOnTriangle(vec3(0.2, 0.2, 5), UNIT_TRIANGLE), vec3(0.2, 0.2, 0))).toBe(
      true,
    )
  })

  it('returns each corner for a point beyond it', () => {
    expect(closestPointOnTriangle(vec3(-1, -1, 0), UNIT_TRIANGLE)).toEqual(vec3(0, 0, 0))
    expect(closestPointOnTriangle(vec3(5, -1, 0), UNIT_TRIANGLE)).toEqual(vec3(1, 0, 0))
    expect(closestPointOnTriangle(vec3(-1, 5, 0), UNIT_TRIANGLE)).toEqual(vec3(0, 1, 0))
  })

  it('returns a point on each edge', () => {
    expect(closestPointOnTriangle(vec3(0.5, -2, 0), UNIT_TRIANGLE)).toEqual(vec3(0.5, 0, 0))
    expect(closestPointOnTriangle(vec3(-2, 0.5, 0), UNIT_TRIANGLE)).toEqual(vec3(0, 0.5, 0))
    const hypotenuse = closestPointOnTriangle(vec3(2, 2, 0), UNIT_TRIANGLE)
    expect(equals(hypotenuse, vec3(0.5, 0.5, 0), 1e-9)).toBe(true)
  })

  it('survives a fully degenerate triangle', () => {
    const degenerate: Triangle = { a: vec3(1, 1, 1), b: vec3(1, 1, 1), c: vec3(1, 1, 1) }
    expect(closestPointOnTriangle(vec3(0, 0, 0), degenerate)).toEqual(vec3(1, 1, 1))
  })

  it('measures the distance to the face', () => {
    expect(pointTriangleDistance(vec3(0.2, 0.2, 3), UNIT_TRIANGLE).distance).toBeCloseTo(3)
  })
})

describe('segmentTriangleIntersection', () => {
  it('finds where a segment pierces the triangle', () => {
    const hit = segmentTriangleIntersection(vec3(0.2, 0.2, -1), vec3(0.2, 0.2, 1), UNIT_TRIANGLE)
    expect(equals(hit as never, vec3(0.2, 0.2, 0), 1e-9)).toBe(true)
  })

  it('returns null when the segment misses sideways', () => {
    expect(segmentTriangleIntersection(vec3(5, 5, -1), vec3(5, 5, 1), UNIT_TRIANGLE)).toBeNull()
    expect(segmentTriangleIntersection(vec3(-1, -1, -1), vec3(-1, -1, 1), UNIT_TRIANGLE)).toBeNull()
    expect(segmentTriangleIntersection(vec3(0.9, 0.9, -1), vec3(0.9, 0.9, 1), UNIT_TRIANGLE)).toBeNull()
  })

  it('returns null when the segment stops short', () => {
    expect(segmentTriangleIntersection(vec3(0.2, 0.2, 1), vec3(0.2, 0.2, 2), UNIT_TRIANGLE)).toBeNull()
    expect(segmentTriangleIntersection(vec3(0.2, 0.2, -2), vec3(0.2, 0.2, -1), UNIT_TRIANGLE)).toBeNull()
  })

  it('returns null for a segment parallel to the plane', () => {
    expect(segmentTriangleIntersection(vec3(0, 0, 1), vec3(1, 0, 1), UNIT_TRIANGLE)).toBeNull()
  })
})

describe('segmentTriangleDistance', () => {
  it('is zero when the segment crosses the triangle', () => {
    expect(
      segmentTriangleDistance(vec3(0.2, 0.2, -1), vec3(0.2, 0.2, 1), UNIT_TRIANGLE).distance,
    ).toBe(0)
  })

  it('measures a segment hovering above the face', () => {
    expect(
      segmentTriangleDistance(vec3(0.2, 0.2, 3), vec3(0.3, 0.3, 3), UNIT_TRIANGLE).distance,
    ).toBeCloseTo(3)
  })

  it('measures a segment beside the triangle', () => {
    expect(
      segmentTriangleDistance(vec3(5, 0, 0), vec3(5, 1, 0), UNIT_TRIANGLE).distance,
    ).toBeCloseTo(4)
  })
})

describe('triangleTriangleDistance', () => {
  const shifted = (dz: number): Triangle => ({
    a: vec3(0, 0, dz),
    b: vec3(1, 0, dz),
    c: vec3(0, 1, dz),
  })

  it('measures parallel triangles', () => {
    expect(triangleTriangleDistance(UNIT_TRIANGLE, shifted(2)).distance).toBeCloseTo(2)
  })

  it('is zero for coincident triangles', () => {
    expect(triangleTriangleDistance(UNIT_TRIANGLE, UNIT_TRIANGLE).distance).toBe(0)
  })

  it('is zero when one triangle pierces the other', () => {
    const crossing: Triangle = { a: vec3(0.2, 0.2, -1), b: vec3(0.4, 0.2, 1), c: vec3(0.2, 0.4, 1) }
    expect(triangleTriangleDistance(UNIT_TRIANGLE, crossing).distance).toBe(0)
    expect(triangleTriangleDistance(crossing, UNIT_TRIANGLE).distance).toBe(0)
  })

  it('measures triangles set apart in the plane', () => {
    const apart: Triangle = { a: vec3(4, 0, 0), b: vec3(5, 0, 0), c: vec3(4, 1, 0) }
    expect(triangleTriangleDistance(UNIT_TRIANGLE, apart).distance).toBeCloseTo(3)
  })
})

describe('bounds', () => {
  it('boxes a triangle', () => {
    const bounds = triangleBounds(UNIT_TRIANGLE)
    expect(bounds.min).toEqual(vec3(0, 0, 0))
    expect(bounds.max).toEqual(vec3(1, 1, 0))
  })

  it('measures the gap between separated boxes', () => {
    const first = triangleBounds(UNIT_TRIANGLE)
    const second = triangleBounds({ a: vec3(4, 0, 0), b: vec3(5, 0, 0), c: vec3(4, 1, 0) })
    expect(boundsGap(first, second)).toBeCloseTo(3)
    expect(boundsGap(second, first)).toBeCloseTo(3)
  })

  it('reports zero for overlapping boxes', () => {
    expect(boundsGap(triangleBounds(UNIT_TRIANGLE), triangleBounds(UNIT_TRIANGLE))).toBe(0)
  })
})
