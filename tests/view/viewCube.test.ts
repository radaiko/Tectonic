import { describe, expect, it } from 'vitest'
import { equals, length, normalize, vec3 } from '../../src/domain/vec3'
import { orientationFor } from '../../src/view/camera'
import {
  DRAG_RADIANS_PER_UNIT,
  VIEW_CUBE_REGIONS,
  activeRegion,
  containsPoint,
  dragToOrbit,
  neighbourRegion,
  orientationForRegion,
  paintOrder,
  pickRegion,
  projectViewCube,
  projectedRadius,
  regionById,
} from '../../src/view/viewCube'

describe('view cube regions', () => {
  it('covers 6 faces, 12 edges and 8 corners', () => {
    expect(VIEW_CUBE_REGIONS).toHaveLength(26)
    const byKind = (kind: string): number =>
      VIEW_CUBE_REGIONS.filter((region) => region.kind === kind).length
    expect(byKind('face')).toBe(6)
    expect(byKind('edge')).toBe(12)
    expect(byKind('corner')).toBe(8)
  })

  it('gives every region a unique id and a unit direction', () => {
    const ids = new Set(VIEW_CUBE_REGIONS.map((region) => region.id))
    expect(ids.size).toBe(VIEW_CUBE_REGIONS.length)
    for (const region of VIEW_CUBE_REGIONS) {
      expect(length(region.direction)).toBeCloseTo(1)
    }
  })

  it('labels the faces after the standard views', () => {
    expect(regionById('front')?.label).toBe('Front')
    expect(regionById('top')?.kind).toBe('face')
    expect(regionById('front-top')?.kind).toBe('edge')
    expect(regionById('nope')).toBeUndefined()
  })
})

describe('activeRegion', () => {
  it('names the face the camera is looking at', () => {
    expect(activeRegion(orientationFor('front').eye).id).toBe('front')
    expect(activeRegion(orientationFor('top').eye).id).toBe('top')
  })

  it('names a corner for an isometric camera', () => {
    const region = activeRegion(orientationFor('isometric').eye)
    expect(region.kind).toBe('corner')
  })
})

describe('orientationForRegion', () => {
  it('reuses the standard view for a face', () => {
    const region = regionById('right')
    expect(orientationForRegion(region as never)).toEqual(orientationFor('right'))
  })

  it('keeps world up for a corner', () => {
    const region = regionById('right-front-top')
    const orientation = orientationForRegion(region as never)
    expect(orientation.up).toEqual({ x: 0, y: 0, z: 1 })
    expect(equals(orientation.eye, normalize(vec3(1, -1, 1)), 1e-9)).toBe(true)
  })

  it('picks a non-degenerate up for a region on the Z pole', () => {
    // Faces never hit this branch; the guard is there for edges through a pole.
    const polar = { ...regionById('front-top')!, direction: vec3(0, 0, 1), kind: 'edge' as const }
    expect(orientationForRegion(polar).up).toEqual({ x: 0, y: 1, z: 0 })
  })
})

describe('projectViewCube', () => {
  it('shows exactly one face head on', () => {
    const cube = projectViewCube(orientationFor('front'))
    const visible = cube.faces.filter((face) => face.visible)
    expect(visible).toHaveLength(1)
    expect(visible[0]?.regionId).toBe('front')
  })

  it('shows three faces from a corner', () => {
    const cube = projectViewCube(orientationFor('isometric'))
    expect(cube.faces.filter((face) => face.visible)).toHaveLength(3)
  })

  it('scales with the requested size', () => {
    const small = projectViewCube(orientationFor('front'), 1)
    const large = projectViewCube(orientationFor('front'), 10)
    const smallFace = small.faces.find((face) => face.visible)
    const largeFace = large.faces.find((face) => face.visible)
    expect(Math.abs(largeFace?.points[0]?.x as number)).toBeCloseTo(
      Math.abs(smallFace?.points[0]?.x as number) * 10,
    )
  })

  it('drops the hotspots hidden behind the cube', () => {
    const cube = projectViewCube(orientationFor('front'))
    expect(cube.hotspots.length).toBeGreaterThan(0)
    expect(cube.hotspots.length).toBeLessThan(20)
    expect(cube.hotspots.every((hotspot) => hotspot.visible)).toBe(true)
  })

  it('winds each face as a simple quadrilateral', () => {
    const cube = projectViewCube(orientationFor('isometric'), 40)
    for (const face of cube.faces) {
      expect(face.points).toHaveLength(4)
    }
  })
})

describe('paintOrder', () => {
  it('sorts visible faces back to front', () => {
    const order = paintOrder(projectViewCube(orientationFor('isometric')))
    expect(order).toHaveLength(3)
    for (let index = 1; index < order.length; index += 1) {
      expect((order[index]?.depth as number) >= (order[index - 1]?.depth as number)).toBe(true)
    }
  })
})

describe('containsPoint', () => {
  const cube = projectViewCube(orientationFor('front'), 40)
  const face = cube.faces.find((candidate) => candidate.visible)!

  it('accepts the centre of the face', () => {
    expect(containsPoint(face, 0, 0)).toBe(true)
  })

  it('rejects a point outside it', () => {
    expect(containsPoint(face, 500, 500)).toBe(false)
  })

  it('rejects a degenerate polygon', () => {
    expect(containsPoint({ ...face, points: [] }, 0, 0)).toBe(false)
  })
})

describe('pickRegion', () => {
  const size = 40
  const cube = projectViewCube(orientationFor('front'), size)

  it('picks the face under the cursor', () => {
    expect(pickRegion(cube, 0, 0, 8)?.id).toBe('front')
  })

  it('prefers a corner hotspot near the cube edge', () => {
    const corner = cube.hotspots.find((hotspot) => hotspot.kind === 'corner')
    const picked = pickRegion(cube, corner?.center.x as number, corner?.center.y as number, 10)
    expect(picked?.kind).toBe('corner')
  })

  it('returns null well outside the cube', () => {
    expect(pickRegion(cube, 1000, 1000, 8)).toBeNull()
  })
})

describe('projectedRadius', () => {
  it('covers the cube corners in every orientation', () => {
    expect(projectedRadius(orientationFor('front'), 10)).toBeCloseTo(Math.hypot(10, 10))
    expect(projectedRadius(orientationFor('isometric'), 10)).toBeGreaterThan(10)
  })
})

describe('dragToOrbit', () => {
  it('turns a cube-width drag into a quarter turn', () => {
    const { azimuth, elevation } = dragToOrbit(40, 0, 40)
    expect(azimuth).toBeCloseTo(-DRAG_RADIANS_PER_UNIT)
    expect(elevation).toBe(0)
  })

  it('survives a zero-sized widget', () => {
    expect(Number.isFinite(dragToOrbit(1, 1, 0).azimuth)).toBe(true)
  })
})

describe('neighbourRegion', () => {
  it('steps a quarter turn to either side', () => {
    expect(neighbourRegion(orientationFor('front'), 1).id).toBe('right')
    expect(neighbourRegion(orientationFor('front'), -1).id).toBe('left')
  })
})
