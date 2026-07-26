import { describe, expect, it } from 'vitest'
import { equals, vec3 } from '../../src/domain/vec3'
import { createEmptyMesh } from '../../src/domain/MeshData'
import {
  areParallel,
  measureDistance,
  measurePointDistance,
} from '../../src/analysis/MeasureDistance'
import {
  canMeasureAngle,
  measureAngle,
  measureDirectionAngle,
  measureEdgeAngle,
  measureEdgeFaceAngle,
  measureFaceAngle,
  measureVertexAngle,
} from '../../src/analysis/MeasureAngle'
import {
  measureEdgeLength,
  measureLength,
  measurePolylineLength,
} from '../../src/analysis/MeasureLength'
import {
  measureArea,
  measureSurfaceArea,
  measureTriangleArea,
  measureTriangleSetArea,
} from '../../src/analysis/MeasureArea'
import {
  isOutwardWound,
  measureBoundingVolume,
  measureVolume,
  signedVolume,
  tetrahedronVolume,
} from '../../src/analysis/MeasureVolume'
import { bodyTarget, edgeTarget, faceTarget, pointTarget } from '../../src/analysis/types'
import type { Triangle } from '../../src/analysis/types'
import { boxMesh, triangleMesh } from '../helpers/meshes'

const XY_TRIANGLES: readonly Triangle[] = [
  { a: vec3(0, 0, 0), b: vec3(2, 0, 0), c: vec3(2, 2, 0) },
  { a: vec3(0, 0, 0), b: vec3(2, 2, 0), c: vec3(0, 2, 0) },
]

describe('measureLength', () => {
  it('measures a straight edge with its direction and midpoint', () => {
    const measurement = measureLength(edgeTarget(vec3(0, 0, 0), vec3(0, 0, 6)))
    expect(measurement.length).toBe(6)
    expect(measurement.direction).toEqual(vec3(0, 0, 1))
    expect(measurement.midpoint).toEqual(vec3(0, 0, 3))
  })

  it('adds up an open and a closed polyline', () => {
    const square = [vec3(0, 0, 0), vec3(3, 0, 0), vec3(3, 4, 0)]
    expect(measurePolylineLength(square)).toBe(7)
    expect(measurePolylineLength(square, true)).toBe(12)
    expect(measurePolylineLength([vec3(0, 0, 0)])).toBe(0)
  })

  it('counts a shared mesh edge once', () => {
    // The unit box has 8 corners; its tessellation adds a diagonal per face.
    expect(measureEdgeLength(boxMesh(1, 1, 1))).toBeCloseTo(12 + 6 * Math.SQRT2)
    expect(measureEdgeLength(triangleMesh())).toBeCloseTo(2 + Math.SQRT2)
  })
})

describe('measureArea', () => {
  it('measures a single triangle', () => {
    expect(measureTriangleArea(XY_TRIANGLES[0] as Triangle)).toBeCloseTo(2)
  })

  it('measures a set with its centroid and normal', () => {
    const measurement = measureTriangleSetArea(XY_TRIANGLES)
    expect(measurement.area).toBeCloseTo(4)
    expect(equals(measurement.centroid, vec3(1, 1, 0), 1e-9)).toBe(true)
    expect(equals(measurement.normal, vec3(0, 0, 1), 1e-9)).toBe(true)
  })

  it('ignores degenerate triangles', () => {
    const measurement = measureTriangleSetArea([
      ...XY_TRIANGLES,
      { a: vec3(0, 0, 0), b: vec3(1, 0, 0), c: vec3(2, 0, 0) },
    ])
    expect(measurement.area).toBeCloseTo(4)
  })

  it('reports nothing for an empty set', () => {
    const measurement = measureTriangleSetArea([])
    expect(measurement.area).toBe(0)
    expect(measurement.centroid).toEqual(vec3(0, 0, 0))
  })

  it('measures a tessellated face', () => {
    expect(measureArea(faceTarget(vec3(0, 0, 0), vec3(0, 0, 1), XY_TRIANGLES)).area).toBeCloseTo(4)
  })

  it('reports no area for a face that is only a plane', () => {
    const measurement = measureArea(faceTarget(vec3(1, 2, 3), vec3(0, 0, 2)))
    expect(measurement.area).toBe(0)
    expect(measurement.normal).toEqual(vec3(0, 0, 1))
    expect(measurement.centroid).toEqual(vec3(1, 2, 3))
  })

  it('reports no area for a face with an empty triangle list', () => {
    expect(measureArea(faceTarget(vec3(0, 0, 0), vec3(0, 0, 1), [])).area).toBe(0)
  })

  it('measures the whole surface of a body', () => {
    expect(measureSurfaceArea(boxMesh(2, 3, 4))).toBeCloseTo(2 * (2 * 3 + 3 * 4 + 2 * 4))
  })
})

describe('measureVolume', () => {
  it('measures a box', () => {
    expect(measureVolume(boxMesh(2, 3, 4))).toBeCloseTo(24)
  })

  it('reports the winding through the sign', () => {
    const box = boxMesh(1, 1, 1)
    expect(signedVolume(box)).toBeGreaterThan(0)
    expect(isOutwardWound(box)).toBe(true)

    const inverted = { ...box, indices: reverseWinding(box.indices) }
    expect(signedVolume(inverted)).toBeLessThan(0)
    expect(isOutwardWound(inverted)).toBe(false)
    expect(measureVolume(inverted)).toBeCloseTo(1)
  })

  it('reports nothing for an open surface', () => {
    expect(measureVolume(triangleMesh())).toBeCloseTo(0)
    expect(measureVolume(createEmptyMesh())).toBe(0)
  })

  it('measures the bounding box', () => {
    expect(measureBoundingVolume(boxMesh(2, 3, 4))).toBeCloseTo(24)
    expect(measureBoundingVolume(createEmptyMesh())).toBe(0)
  })

  it('measures a single tetrahedron', () => {
    expect(
      tetrahedronVolume(vec3(0, 0, 0), {
        a: vec3(1, 0, 0),
        b: vec3(0, 1, 0),
        c: vec3(0, 0, 1),
      }),
    ).toBeCloseTo(1 / 6)
  })
})

describe('measureAngle', () => {
  const alongX = edgeTarget(vec3(0, 0, 0), vec3(1, 0, 0))
  const alongY = edgeTarget(vec3(0, 0, 0), vec3(0, 1, 0))
  const topFace = faceTarget(vec3(0, 0, 0), vec3(0, 0, 1))
  const sideFace = faceTarget(vec3(0, 0, 0), vec3(1, 0, 0))

  it('measures between two edges', () => {
    const measurement = measureEdgeAngle(alongX, alongY)
    expect(measurement.degrees).toBeCloseTo(90)
    expect(measurement.perpendicular).toBe(true)
    expect(measurement.parallel).toBe(false)
    expect(measurement.supplementDegrees).toBeCloseTo(90)
  })

  it('calls coincident and opposite directions parallel', () => {
    expect(measureEdgeAngle(alongX, alongX).parallel).toBe(true)
    expect(measureEdgeAngle(alongX, edgeTarget(vec3(1, 0, 0), vec3(0, 0, 0))).parallel).toBe(true)
  })

  it('measures the dihedral angle between two faces', () => {
    expect(measureFaceAngle(topFace, sideFace).degrees).toBeCloseTo(90)
    expect(measureFaceAngle(topFace, topFace).degrees).toBeCloseTo(0)
  })

  it('measures an edge against a face from the face, not its normal', () => {
    expect(measureEdgeFaceAngle(alongX, topFace).degrees).toBeCloseTo(0)
    expect(measureEdgeFaceAngle(edgeTarget(vec3(0, 0, 0), vec3(0, 0, 1)), topFace).degrees).toBeCloseTo(
      90,
    )
  })

  it('dispatches on the pair of selections', () => {
    expect(measureAngle(alongX, alongY).degrees).toBeCloseTo(90)
    expect(measureAngle(topFace, sideFace).degrees).toBeCloseTo(90)
    expect(measureAngle(alongX, topFace).degrees).toBeCloseTo(0)
    expect(measureAngle(topFace, alongX).degrees).toBeCloseTo(0)
  })

  it('returns zero for selections that have no direction', () => {
    const point = pointTarget(vec3(0, 0, 0))
    expect(measureAngle(point, alongX).degrees).toBe(0)
    expect(canMeasureAngle(point, alongX)).toBe(false)
    expect(canMeasureAngle(alongX, topFace)).toBe(true)
  })

  it('measures the angle at a vertex', () => {
    expect(measureVertexAngle(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0)).degrees).toBeCloseTo(90)
  })

  it('handles a zero-length direction without producing NaN', () => {
    expect(measureDirectionAngle(vec3(0, 0, 0), vec3(1, 0, 0)).degrees).toBe(0)
  })
})

describe('measureDistance', () => {
  it('measures point to point with its components', () => {
    const measurement = measurePointDistance(vec3(0, 0, 0), vec3(3, 4, 0))
    expect(measurement.distance).toBe(5)
    expect(measurement.delta).toEqual(vec3(3, 4, 0))
  })

  it('measures a point to an edge', () => {
    const measurement = measureDistance(
      pointTarget(vec3(0.5, 3, 0)),
      edgeTarget(vec3(0, 0, 0), vec3(1, 0, 0)),
    )
    expect(measurement.distance).toBeCloseTo(3)
    expect(equals(measurement.to, vec3(0.5, 0, 0), 1e-9)).toBe(true)
  })

  it('measures an edge to a point, whichever way round', () => {
    const measurement = measureDistance(
      edgeTarget(vec3(0, 0, 0), vec3(1, 0, 0)),
      pointTarget(vec3(0.5, 3, 0)),
    )
    expect(measurement.distance).toBeCloseTo(3)
    expect(equals(measurement.from, vec3(0.5, 0, 0), 1e-9)).toBe(true)
  })

  it('measures a point to an unbounded plane', () => {
    const measurement = measureDistance(
      pointTarget(vec3(50, 50, 7)),
      faceTarget(vec3(0, 0, 0), vec3(0, 0, 1)),
    )
    expect(measurement.distance).toBeCloseTo(7)
  })

  it('measures a point to a bounded face rather than its plane', () => {
    const measurement = measureDistance(
      pointTarget(vec3(10, 1, 0)),
      faceTarget(vec3(0, 0, 0), vec3(0, 0, 1), XY_TRIANGLES),
    )
    expect(measurement.distance).toBeCloseTo(8)
  })

  it('measures two edges', () => {
    const measurement = measureDistance(
      edgeTarget(vec3(0, 0, 0), vec3(1, 0, 0)),
      edgeTarget(vec3(0, 5, 0), vec3(1, 5, 0)),
    )
    expect(measurement.distance).toBeCloseTo(5)
    expect(measurement.parallel).toBe(true)
  })

  it('measures an edge against a plane, and zero when it crosses', () => {
    const plane = faceTarget(vec3(0, 0, 0), vec3(0, 0, 1))
    expect(
      measureDistance(edgeTarget(vec3(0, 0, 2), vec3(1, 0, 5)), plane).distance,
    ).toBeCloseTo(2)
    expect(
      measureDistance(edgeTarget(vec3(0, 0, -1), vec3(0, 0, 1)), plane).distance,
    ).toBeCloseTo(0)
    expect(
      measureDistance(plane, edgeTarget(vec3(0, 0, -5), vec3(1, 0, -2))).distance,
    ).toBeCloseTo(2)
  })

  it('measures two parallel planes and reports them as parallel', () => {
    const measurement = measureDistance(
      faceTarget(vec3(0, 0, 0), vec3(0, 0, 1)),
      faceTarget(vec3(9, 9, 4), vec3(0, 0, 1)),
    )
    expect(measurement.distance).toBeCloseTo(4)
    expect(measurement.parallel).toBe(true)
  })

  it('reports zero between planes that intersect', () => {
    const measurement = measureDistance(
      faceTarget(vec3(0, 0, 0), vec3(0, 0, 1)),
      faceTarget(vec3(0, 0, 0), vec3(1, 0, 0)),
    )
    expect(measurement.distance).toBe(0)
    expect(measurement.parallel).toBe(false)
  })

  it('measures a body against a plane', () => {
    const measurement = measureDistance(
      bodyTarget(boxMesh(1, 1, 1)),
      faceTarget(vec3(0, 0, -3), vec3(0, 0, 1)),
    )
    expect(measurement.distance).toBeCloseTo(3)
  })

  it('measures two bodies', () => {
    const measurement = measureDistance(bodyTarget(boxMesh(1, 1, 1)), bodyTarget(shift(boxMesh(1, 1, 1), 4)))
    expect(measurement.distance).toBeCloseTo(3)
  })

  it('measures a point against a body', () => {
    const measurement = measureDistance(pointTarget(vec3(0.5, 0.5, 5)), bodyTarget(boxMesh(1, 1, 1)))
    expect(measurement.distance).toBeCloseTo(4)
  })

  it('measures an edge against a body', () => {
    const measurement = measureDistance(
      edgeTarget(vec3(0, 0, 5), vec3(1, 0, 5)),
      bodyTarget(boxMesh(1, 1, 1)),
    )
    expect(measurement.distance).toBeCloseTo(4)
  })

  it('falls back to anchor points when neither target has geometry', () => {
    const measurement = measureDistance(
      bodyTarget(createEmptyMesh()),
      bodyTarget(createEmptyMesh()),
    )
    expect(Number.isFinite(measurement.distance)).toBe(true)
  })
})

describe('areParallel', () => {
  it('is false when a target has no direction', () => {
    expect(areParallel(pointTarget(vec3(0, 0, 0)), pointTarget(vec3(1, 0, 0)))).toBe(false)
  })

  it('calls an edge lying in a face parallel to it', () => {
    expect(
      areParallel(
        edgeTarget(vec3(0, 0, 0), vec3(1, 0, 0)),
        faceTarget(vec3(0, 0, 0), vec3(0, 0, 1)),
      ),
    ).toBe(true)
  })

  it('rejects an edge running through a face', () => {
    expect(
      areParallel(
        edgeTarget(vec3(0, 0, 0), vec3(0, 0, 1)),
        faceTarget(vec3(0, 0, 0), vec3(0, 0, 1)),
      ),
    ).toBe(false)
  })
})

function reverseWinding(indices: readonly number[]): number[] {
  const flipped: number[] = []
  for (let index = 0; index < indices.length; index += 3) {
    flipped.push(indices[index] as number, indices[index + 2] as number, indices[index + 1] as number)
  }
  return flipped
}

function shift(mesh: ReturnType<typeof boxMesh>, dx: number): ReturnType<typeof boxMesh> {
  return {
    ...mesh,
    positions: mesh.positions.map((value, index) => (index % 3 === 0 ? value + dx : value)),
  }
}
