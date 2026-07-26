import { describe, expect, it } from 'vitest'
import {
  add,
  angleBetween,
  cross,
  distance,
  dot,
  equals,
  length,
  lerp,
  midpoint,
  negate,
  normalize,
  perpendicular,
  rotateAbout,
  scale,
  subtract,
  UNIT_X,
  UNIT_Y,
  UNIT_Z,
  vec3,
  ZERO,
} from '../../src/domain/vec3'

describe('vec3 arithmetic', () => {
  it('adds, subtracts and scales', () => {
    expect(add(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 })
    expect(subtract(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: -3, y: -3, z: -3 })
    expect(scale(vec3(1, -2, 3), 2)).toEqual({ x: 2, y: -4, z: 6 })
    expect(negate(vec3(1, -2, 3))).toEqual({ x: -1, y: 2, z: -3 })
  })

  it('takes dot and cross products', () => {
    expect(dot(UNIT_X, UNIT_Y)).toBe(0)
    expect(dot(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(32)
    expect(cross(UNIT_X, UNIT_Y)).toEqual(UNIT_Z)
    expect(cross(UNIT_Y, UNIT_X)).toEqual({ x: 0, y: 0, z: -1 })
  })

  it('measures length and distance', () => {
    expect(length(vec3(3, 4, 0))).toBe(5)
    expect(distance(vec3(1, 0, 0), vec3(1, 3, 4))).toBe(5)
  })

  it('normalizes, and leaves a zero vector alone', () => {
    expect(normalize(vec3(0, 0, 5))).toEqual(UNIT_Z)
    expect(normalize(ZERO)).toEqual(ZERO)
  })

  it('interpolates', () => {
    expect(lerp(vec3(0, 0, 0), vec3(10, 20, 30), 0.25)).toEqual({ x: 2.5, y: 5, z: 7.5 })
    expect(midpoint(vec3(0, 0, 0), vec3(2, 4, 6))).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('compares within a tolerance', () => {
    expect(equals(vec3(1, 1, 1), vec3(1 + 1e-12, 1, 1))).toBe(true)
    expect(equals(vec3(1, 1, 1), vec3(1.1, 1, 1))).toBe(false)
    expect(equals(vec3(1, 1, 1), vec3(1.05, 1, 1), 0.1)).toBe(true)
  })
})

describe('angleBetween', () => {
  it('measures the angle between directions', () => {
    expect(angleBetween(UNIT_X, UNIT_Y)).toBeCloseTo(Math.PI / 2)
    expect(angleBetween(UNIT_X, UNIT_X)).toBeCloseTo(0)
    expect(angleBetween(UNIT_X, negate(UNIT_X))).toBeCloseTo(Math.PI)
  })

  it('returns zero rather than NaN for a degenerate input', () => {
    expect(angleBetween(ZERO, UNIT_X)).toBe(0)
  })
})

describe('rotateAbout', () => {
  it('turns a vector about an axis', () => {
    const rotated = rotateAbout(UNIT_X, UNIT_Z, Math.PI / 2)
    expect(equals(rotated, UNIT_Y, 1e-9)).toBe(true)
  })

  it('leaves points on the axis where they are', () => {
    expect(equals(rotateAbout(UNIT_Z, UNIT_Z, 1.2), UNIT_Z, 1e-9)).toBe(true)
  })

  it('does nothing when the axis has no length', () => {
    expect(rotateAbout(UNIT_X, ZERO, 1)).toEqual(UNIT_X)
  })
})

describe('perpendicular', () => {
  it('returns a unit vector at right angles to the input', () => {
    for (const direction of [UNIT_X, UNIT_Y, UNIT_Z, vec3(1, 2, 3)]) {
      const perp = perpendicular(direction)
      expect(length(perp)).toBeCloseTo(1)
      expect(dot(perp, normalize(direction))).toBeCloseTo(0)
    }
  })
})
