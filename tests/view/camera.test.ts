import { describe, expect, it } from 'vitest'
import { dot, equals, length, normalize, UNIT_Z, vec3 } from '../../src/domain/vec3'
import {
  MAX_ELEVATION,
  STANDARD_VIEWS,
  distanceToFit,
  matchesStandardView,
  nearestStandardView,
  orbit,
  orientationFor,
  orthographicHalfHeight,
  panTarget,
  placeCamera,
  roll,
  screenBasis,
  standardViewLabel,
} from '../../src/view/camera'

describe('standard views', () => {
  it('covers every named view with a unit eye and up vector', () => {
    expect(STANDARD_VIEWS).toHaveLength(9)
    for (const view of STANDARD_VIEWS) {
      const orientation = orientationFor(view)
      expect(length(orientation.eye)).toBeCloseTo(1)
      expect(length(orientation.up)).toBeCloseTo(1)
      expect(standardViewLabel(view).length).toBeGreaterThan(0)
    }
  })

  it('keeps up perpendicular to the eye on the six face views', () => {
    for (const view of ['front', 'back', 'top', 'bottom', 'left', 'right'] as const) {
      const orientation = orientationFor(view)
      expect(dot(orientation.eye, orientation.up)).toBeCloseTo(0)
    }
  })

  it('puts the front camera on the -Y side, matching the XZ sketch plane', () => {
    expect(orientationFor('front').eye).toEqual({ x: 0, y: -1, z: 0 })
    expect(orientationFor('front').up).toEqual(UNIT_Z)
  })

  it('looks down +Z from the top with +Y up the screen', () => {
    expect(orientationFor('top').eye).toEqual({ x: 0, y: 0, z: 1 })
    expect(orientationFor('top').up).toEqual({ x: 0, y: 1, z: 0 })
  })
})

describe('nearestStandardView', () => {
  it('recognises an exact view', () => {
    for (const view of ['front', 'back', 'top', 'bottom', 'left', 'right'] as const) {
      expect(nearestStandardView(orientationFor(view).eye)).toBe(view)
    }
  })

  it('snaps a nearly-front camera to front', () => {
    expect(nearestStandardView(vec3(0.05, -1, 0.02))).toBe('front')
  })

  it('prefers the face views when a diagonal is equally close', () => {
    expect(nearestStandardView(vec3(0, -1, 0))).toBe('front')
  })
})

describe('matchesStandardView', () => {
  it('accepts the exact orientation and rejects a turned one', () => {
    expect(matchesStandardView(orientationFor('right').eye, 'right')).toBe(true)
    expect(matchesStandardView(orientationFor('right').eye, 'left')).toBe(false)
  })
})

describe('placeCamera', () => {
  it('puts the camera a distance away along the eye direction', () => {
    const placement = placeCamera(orientationFor('front'), vec3(0, 0, 10), 50)
    expect(placement.position).toEqual({ x: 0, y: -50, z: 10 })
    expect(placement.target).toEqual({ x: 0, y: 0, z: 10 })
  })

  it('never collapses the camera onto the target', () => {
    const placement = placeCamera(orientationFor('top'), vec3(0, 0, 0), 0)
    expect(length(placement.position)).toBeGreaterThan(0)
  })
})

describe('orbit', () => {
  it('spins about the world up axis', () => {
    const turned = orbit(orientationFor('front'), Math.PI / 2, 0)
    expect(equals(turned.eye, vec3(1, 0, 0), 1e-9)).toBe(true)
  })

  it('clamps elevation short of the pole', () => {
    const raised = orbit(orientationFor('front'), 0, 10)
    expect(dot(raised.eye, UNIT_Z)).toBeLessThan(1)
    expect(Math.asin(dot(raised.eye, UNIT_Z))).toBeCloseTo(MAX_ELEVATION, 6)
  })

  it('clamps downwards too', () => {
    const lowered = orbit(orientationFor('front'), 0, -10)
    expect(Math.asin(dot(lowered.eye, UNIT_Z))).toBeCloseTo(-MAX_ELEVATION, 6)
  })

  it('still spins when looking straight down the up axis', () => {
    const spun = orbit(orientationFor('top'), Math.PI / 2, 0.1)
    expect(length(spun.eye)).toBeCloseTo(1)
  })
})

describe('roll', () => {
  it('turns the up vector about the view direction, leaving the eye alone', () => {
    const rolled = roll(orientationFor('front'), Math.PI / 2)
    expect(equals(rolled.eye, orientationFor('front').eye, 1e-9)).toBe(true)
    expect(dot(rolled.up, rolled.eye)).toBeCloseTo(0)
    expect(equals(rolled.up, UNIT_Z, 1e-6)).toBe(false)
  })
})

describe('screenBasis', () => {
  it('produces a right-handed orthonormal frame', () => {
    const basis = screenBasis(orientationFor('isometric'))
    expect(length(basis.right)).toBeCloseTo(1)
    expect(length(basis.up)).toBeCloseTo(1)
    expect(dot(basis.right, basis.up)).toBeCloseTo(0)
    expect(dot(basis.right, basis.forward)).toBeCloseTo(0)
  })

  it('recovers a basis when the up vector is parallel to the view direction', () => {
    const basis = screenBasis({ eye: UNIT_Z, up: UNIT_Z })
    expect(length(basis.right)).toBeCloseTo(1)
    expect(dot(basis.right, basis.forward)).toBeCloseTo(0)
  })

  it('recovers a basis when the degenerate up lies on X', () => {
    const basis = screenBasis({ eye: vec3(1, 0, 0), up: vec3(1, 0, 0) })
    expect(length(basis.right)).toBeCloseTo(1)
  })
})

describe('distanceToFit', () => {
  it('scales with the radius under perspective', () => {
    const near = distanceToFit(10, 50, 'perspective')
    const far = distanceToFit(20, 50, 'perspective')
    expect(far).toBeCloseTo(near * 2)
  })

  it('uses a fixed multiple for orthographic cameras', () => {
    expect(distanceToFit(10, 50, 'orthographic')).toBeCloseTo(25)
  })

  it('survives a degenerate radius and an absurd field of view', () => {
    expect(distanceToFit(0, 500, 'perspective')).toBeGreaterThan(0)
    expect(distanceToFit(-5, 0, 'perspective')).toBeGreaterThan(0)
  })
})

describe('orthographicHalfHeight', () => {
  it('matches what a perspective camera sees at the same distance', () => {
    expect(orthographicHalfHeight(100, 90)).toBeCloseTo(100)
    expect(orthographicHalfHeight(0, 50)).toBeGreaterThan(0)
  })
})

describe('panTarget', () => {
  it('drags the target across the image plane', () => {
    const moved = panTarget(orientationFor('front'), vec3(0, 0, 0), 10, 0)
    expect(moved.y).toBeCloseTo(0)
    expect(Math.abs(moved.x)).toBeCloseTo(10)
  })

  it('moves along the screen up axis for a vertical drag', () => {
    const moved = panTarget(orientationFor('front'), vec3(0, 0, 0), 0, 4)
    expect(moved.z).toBeCloseTo(-4)
  })

  it('keeps the drag perpendicular to the view direction', () => {
    const orientation = orientationFor('isometric')
    const moved = panTarget(orientation, vec3(0, 0, 0), 3, 7)
    expect(dot(moved, normalize(orientation.eye))).toBeCloseTo(0)
  })
})
