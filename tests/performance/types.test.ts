import { describe, expect, it } from 'vitest'
import {
  ALL_PERFORMANCE_SETTINGS,
  DEFAULT_ASPECT,
  DEFAULT_FOV,
  DEFAULT_PERFORMANCE_SETTINGS,
  PERFORMANCE_OPTIONS,
  boundsCenter,
  boundsRadius,
  boundsSize,
  distanceToBounds,
  distanceToCamera,
  isBehind,
  resolveViewpoint,
  screenCoverage,
  totalTriangles,
} from '../../src/performance/types'
import { cameraAt, componentAt } from '../helpers/components'

const UNIT_BOUNDS = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 4, z: 6 } }

describe('bounds arithmetic', () => {
  it('finds the centre', () => {
    expect(boundsCenter(UNIT_BOUNDS)).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('measures the size along each axis', () => {
    expect(boundsSize(UNIT_BOUNDS)).toEqual({ x: 2, y: 4, z: 6 })
  })

  it('takes the radius from the diagonal, so nothing pops', () => {
    expect(boundsRadius(UNIT_BOUNDS)).toBeCloseTo(Math.hypot(2, 4, 6) / 2, 12)
  })

  it('measures to the nearest face of the box', () => {
    expect(distanceToBounds(UNIT_BOUNDS, { x: 5, y: 2, z: 3 })).toBeCloseTo(3, 12)
  })

  it('reports zero distance from inside the box', () => {
    expect(distanceToBounds(UNIT_BOUNDS, { x: 1, y: 2, z: 3 })).toBe(0)
  })

  it('measures diagonally past a corner', () => {
    expect(distanceToBounds(UNIT_BOUNDS, { x: -3, y: -4, z: 3 })).toBeCloseTo(5, 12)
  })

  it('measures from the camera to a component centre', () => {
    const component = componentAt('a', [3, 4, 0])

    expect(distanceToCamera(component, cameraAt())).toBeCloseTo(5, 12)
  })
})

describe('resolveViewpoint', () => {
  it('fills in the defaults a caller left out', () => {
    const resolved = resolveViewpoint(cameraAt())

    expect(resolved.fov).toBe(DEFAULT_FOV)
    expect(resolved.aspect).toBe(DEFAULT_ASPECT)
    expect(resolved.up).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('normalises the direction it was given', () => {
    const resolved = resolveViewpoint(cameraAt([0, 0, 0], [0, 0, 5]))

    expect(resolved.direction).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('normalises a supplied up vector', () => {
    const resolved = resolveViewpoint(cameraAt([0, 0, 0], [1, 0, 0], { up: { x: 0, y: 3, z: 0 } }))

    expect(resolved.up).toEqual({ x: 0, y: 1, z: 0 })
  })

  it('substitutes a real direction for a zero-length one', () => {
    const resolved = resolveViewpoint(cameraAt([0, 0, 0], [0, 0, 0]))

    expect(resolved.direction).toEqual({ x: 0, y: 1, z: 0 })
  })

  it('keeps an explicit near and far', () => {
    const resolved = resolveViewpoint(cameraAt([0, 0, 0], [1, 0, 0], { near: 5, far: 50 }))

    expect(resolved.near).toBe(5)
    expect(resolved.far).toBe(50)
  })
})

describe('screenCoverage', () => {
  it('shrinks as the component recedes', () => {
    const near = screenCoverage(componentAt('a', [10, 0, 0]), cameraAt())
    const far = screenCoverage(componentAt('a', [100, 0, 0]), cameraAt())

    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
  })

  it('grows with the component', () => {
    const small = screenCoverage(componentAt('a', [10, 0, 0], { size: 1 }), cameraAt())
    const large = screenCoverage(componentAt('a', [10, 0, 0], { size: 5 }), cameraAt())

    expect(large).toBeGreaterThan(small)
  })

  it('sees a distant large part and a near small one at the same size', () => {
    const bolt = screenCoverage(componentAt('bolt', [10, 0, 0], { size: 1 }), cameraAt())
    const gantry = screenCoverage(componentAt('gantry', [100, 0, 0], { size: 10 }), cameraAt())

    expect(bolt).toBeCloseTo(gantry, 2)
  })

  it('fills the screen when the camera is inside the component', () => {
    expect(screenCoverage(componentAt('a', [0, 0, 0], { size: 10 }), cameraAt())).toBe(1)
  })

  it('reports nothing for a component with no extent', () => {
    expect(screenCoverage(componentAt('a', [10, 0, 0], { size: 0 }), cameraAt())).toBe(0)
  })

  it('never exceeds the whole screen', () => {
    const coverage = screenCoverage(componentAt('a', [1, 0, 0], { size: 100 }), cameraAt())

    expect(coverage).toBeLessThanOrEqual(1)
  })

  it('sees more of the model through a narrower lens', () => {
    const wide = screenCoverage(componentAt('a', [10, 0, 0]), cameraAt([0, 0, 0], [1, 0, 0], { fov: 1.2 }))
    const narrow = screenCoverage(componentAt('a', [10, 0, 0]), cameraAt([0, 0, 0], [1, 0, 0], { fov: 0.3 }))

    expect(narrow).toBeGreaterThan(wide)
  })
})

describe('isBehind', () => {
  it('spots a component behind the camera', () => {
    expect(isBehind(componentAt('a', [-10, 0, 0]), cameraAt())).toBe(true)
  })

  it('leaves a component in front alone', () => {
    expect(isBehind(componentAt('a', [10, 0, 0]), cameraAt())).toBe(false)
  })

  it('counts a component straddling the camera as still in view', () => {
    expect(isBehind(componentAt('a', [0, 0, 0], { size: 10 }), cameraAt())).toBe(false)
  })
})

describe('totalTriangles', () => {
  it('adds up what a scene would cost', () => {
    const components = [
      componentAt('a', [0, 0, 0], { triangleCount: 100 }),
      componentAt('b', [0, 0, 0], { triangleCount: 250 }),
    ]

    expect(totalTriangles(components)).toBe(350)
  })

  it('ignores a nonsensical negative count', () => {
    expect(totalTriangles([componentAt('a', [0, 0, 0], { triangleCount: -5 })])).toBe(0)
  })

  it('is zero for an empty scene', () => {
    expect(totalTriangles([])).toBe(0)
  })
})

describe('performance settings', () => {
  it('has every optimisation off by default', () => {
    expect(Object.values(DEFAULT_PERFORMANCE_SETTINGS).every((value) => value === false)).toBe(true)
  })

  it('offers a switch that turns everything on', () => {
    expect(Object.values(ALL_PERFORMANCE_SETTINGS).every((value) => value === true)).toBe(true)
  })

  it('names every option exactly once', () => {
    expect([...PERFORMANCE_OPTIONS].sort()).toEqual(
      Object.keys(DEFAULT_PERFORMANCE_SETTINGS).sort(),
    )
  })
})
