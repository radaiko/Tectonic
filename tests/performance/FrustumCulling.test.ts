import { describe, expect, it } from 'vitest'
import {
  classifyBounds,
  cullComponents,
  distanceToPlane,
  frustumFromMatrix,
  frustumFromViewpoint,
  frustumPlanes,
  intersectsBounds,
  intersectsSphere,
  lookDirection,
  planeThrough,
} from '../../src/performance/FrustumCulling'
import { cameraAt, componentAt } from '../helpers/components'

/** A camera at the origin looking down +X with a square 90-degree view. */
const SQUARE_VIEW = cameraAt([0, 0, 0], [1, 0, 0], {
  fov: Math.PI / 2,
  aspect: 1,
  near: 0.1,
  far: 100,
})

/** Column-major identity, whose frustum is the NDC cube. */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** A cube of `size` centred on a point. */
function box(centre: readonly [number, number, number], size = 1) {
  const half = size / 2
  return {
    min: { x: centre[0] - half, y: centre[1] - half, z: centre[2] - half },
    max: { x: centre[0] + half, y: centre[1] + half, z: centre[2] + half },
  }
}

describe('planeThrough', () => {
  it('normalises the normal it was given', () => {
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 })

    expect(plane.normal).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('puts the plane through the point', () => {
    const plane = planeThrough({ x: 0, y: 0, z: 4 }, { x: 0, y: 0, z: 1 })

    expect(distanceToPlane(plane, { x: 0, y: 0, z: 4 })).toBeCloseTo(0, 12)
  })

  it('measures positive on the side the normal points to', () => {
    const plane = planeThrough({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })

    expect(distanceToPlane(plane, { x: 0, y: 0, z: 3 })).toBeCloseTo(3, 12)
    expect(distanceToPlane(plane, { x: 0, y: 0, z: -3 })).toBeCloseTo(-3, 12)
  })
})

describe('frustumFromViewpoint', () => {
  const frustum = frustumFromViewpoint(SQUARE_VIEW)

  it('has six planes', () => {
    expect(frustumPlanes(frustum)).toHaveLength(6)
  })

  it('normalises every plane', () => {
    for (const plane of frustumPlanes(frustum)) {
      expect(Math.hypot(plane.normal.x, plane.normal.y, plane.normal.z)).toBeCloseTo(1, 12)
    }
  })

  it('faces the near plane along the view direction', () => {
    expect(frustum.near.normal.x).toBeCloseTo(1, 12)
  })

  it('puts the far plane at the far distance', () => {
    expect(distanceToPlane(frustum.far, { x: 100, y: 0, z: 0 })).toBeCloseTo(0, 10)
  })
})

describe('classifyBounds', () => {
  const frustum = frustumFromViewpoint(SQUARE_VIEW)

  it('sees a box straight ahead', () => {
    expect(classifyBounds(frustum, box([10, 0, 0]))).toBe('inside')
  })

  it('rejects a box behind the camera', () => {
    expect(classifyBounds(frustum, box([-10, 0, 0]))).toBe('outside')
  })

  it('rejects a box off to one side', () => {
    // At x = 10 a ninety-degree view spans |y| up to 10.
    expect(classifyBounds(frustum, box([10, 30, 0]))).toBe('outside')
    expect(classifyBounds(frustum, box([10, -30, 0]))).toBe('outside')
  })

  it('rejects a box above and below the view', () => {
    expect(classifyBounds(frustum, box([10, 0, 30]))).toBe('outside')
    expect(classifyBounds(frustum, box([10, 0, -30]))).toBe('outside')
  })

  it('rejects a box beyond the far plane', () => {
    expect(classifyBounds(frustum, box([500, 0, 0]))).toBe('outside')
  })

  it('calls a box straddling an edge intersecting', () => {
    expect(classifyBounds(frustum, box([10, 10, 0], 4))).toBe('intersecting')
  })

  it('calls a box enclosing the camera intersecting rather than hidden', () => {
    expect(classifyBounds(frustum, box([0, 0, 0], 20))).toBe('intersecting')
  })
})

describe('intersectsBounds', () => {
  const frustum = frustumFromViewpoint(SQUARE_VIEW)

  it('accepts anything not wholly outside', () => {
    expect(intersectsBounds(frustum, box([10, 0, 0]))).toBe(true)
    expect(intersectsBounds(frustum, box([10, 10, 0], 4))).toBe(true)
  })

  it('rejects what is wholly outside', () => {
    expect(intersectsBounds(frustum, box([-10, 0, 0]))).toBe(false)
  })
})

describe('intersectsSphere', () => {
  const frustum = frustumFromViewpoint(SQUARE_VIEW)

  it('accepts a sphere in view', () => {
    expect(intersectsSphere(frustum, { x: 10, y: 0, z: 0 }, 1)).toBe(true)
  })

  it('rejects a sphere behind the camera', () => {
    expect(intersectsSphere(frustum, { x: -10, y: 0, z: 0 }, 1)).toBe(false)
  })

  it('accepts a sphere whose centre is out but whose skin is in', () => {
    expect(intersectsSphere(frustum, { x: 10, y: 14, z: 0 }, 8)).toBe(true)
  })
})

describe('frustumFromMatrix', () => {
  const frustum = frustumFromMatrix(IDENTITY)

  it('turns the identity into the clip cube', () => {
    expect(classifyBounds(frustum, box([0, 0, 0], 1))).toBe('inside')
  })

  it('rejects what falls outside the clip cube', () => {
    expect(classifyBounds(frustum, box([5, 0, 0], 1))).toBe('outside')
    expect(classifyBounds(frustum, box([0, 0, -5], 1))).toBe('outside')
  })

  it('normalises every plane it derives', () => {
    for (const plane of frustumPlanes(frustum)) {
      expect(Math.hypot(plane.normal.x, plane.normal.y, plane.normal.z)).toBeCloseTo(1, 12)
    }
  })

  it('spots a box straddling the clip boundary', () => {
    expect(classifyBounds(frustum, box([1, 0, 0], 1))).toBe('intersecting')
  })

  it('treats a short matrix as zeroes rather than reading past the end', () => {
    expect(() => frustumFromMatrix([1, 0, 0])).not.toThrow()
  })
})

describe('cullComponents', () => {
  const frustum = frustumFromViewpoint(SQUARE_VIEW)
  const scene = [
    componentAt('ahead', [10, 0, 0], { triangleCount: 1000 }),
    componentAt('behind', [-10, 0, 0], { triangleCount: 3000 }),
    componentAt('aside', [10, 40, 0], { triangleCount: 500 }),
  ]

  it('keeps what is visible and drops what is not', () => {
    const result = cullComponents(scene, frustum)

    expect(result.visible.map((component) => component.id)).toEqual(['ahead'])
    expect(result.culled.map((component) => component.id)).toEqual(['behind', 'aside'])
  })

  it('reports the triangles it avoided', () => {
    const result = cullComponents(scene, frustum)

    expect(result.trianglesCulled).toBe(3500)
    expect(result.saved).toBeCloseTo(3500 / 4500, 12)
  })

  it('keeps a pinned component even off screen', () => {
    const pinned = componentAt('datum', [-100, 0, 0], { pinned: true })
    const result = cullComponents([...scene, pinned], frustum)

    expect(result.visible.map((component) => component.id)).toContain('datum')
  })

  it('has nothing to cull in an empty scene', () => {
    expect(cullComponents([], frustum)).toMatchObject({ trianglesCulled: 0, saved: 0 })
  })
})

describe('lookDirection', () => {
  it('points from the camera at the target', () => {
    expect(lookDirection({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 })).toEqual({
      x: 0,
      y: 1,
      z: 0,
    })
  })
})
