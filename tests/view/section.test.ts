import { describe, expect, it } from 'vitest'
import { equals, vec3 } from '../../src/domain/vec3'
import {
  DEFAULT_SECTION_FILL,
  SECTION_MODES,
  createSectionState,
  dragSectionPlane,
  flipSectionAxis,
  intersectSegment,
  isPointVisible,
  projectOntoPlane,
  sectionAxes,
  sectionModeLabel,
  sectionPlanes,
  setSectionMode,
  setSectionOffset,
  signedDistance,
} from '../../src/view/section'

describe('createSectionState', () => {
  it('starts with no cut', () => {
    const state = createSectionState()
    expect(state.mode).toBe('off')
    expect(state.fillColor).toBe(DEFAULT_SECTION_FILL)
    expect(sectionPlanes(state)).toEqual([])
  })

  it('accepts overrides', () => {
    expect(createSectionState({ mode: 'half', showPlane: false }).showPlane).toBe(false)
  })
})

describe('section modes', () => {
  it('cuts one axis per step', () => {
    expect(SECTION_MODES).toEqual(['off', 'half', 'quarter', 'octant'])
    expect(sectionAxes('off')).toEqual([])
    expect(sectionAxes('half')).toEqual(['x'])
    expect(sectionAxes('quarter')).toEqual(['x', 'y'])
    expect(sectionAxes('octant')).toEqual(['x', 'y', 'z'])
  })

  it('labels every mode', () => {
    for (const mode of SECTION_MODES) expect(sectionModeLabel(mode).length).toBeGreaterThan(0)
  })
})

describe('sectionPlanes', () => {
  it('keeps the half below the offset by default', () => {
    const state = setSectionOffset(setSectionMode(createSectionState(), 'half'), 'x', 5)
    const planes = sectionPlanes(state)
    expect(planes).toHaveLength(1)
    expect(isPointVisible(vec3(4, 0, 0), planes)).toBe(true)
    expect(isPointVisible(vec3(6, 0, 0), planes)).toBe(false)
    expect(isPointVisible(vec3(5, 0, 0), planes)).toBe(true)
  })

  it('keeps the other half once flipped', () => {
    const state = flipSectionAxis(
      setSectionOffset(setSectionMode(createSectionState(), 'half'), 'x', 5),
      'x',
    )
    const planes = sectionPlanes(state)
    expect(isPointVisible(vec3(4, 0, 0), planes)).toBe(false)
    expect(isPointVisible(vec3(6, 0, 0), planes)).toBe(true)
  })

  it('intersects the half-spaces for a quarter section', () => {
    const planes = sectionPlanes(setSectionMode(createSectionState(), 'quarter'))
    expect(planes).toHaveLength(2)
    expect(isPointVisible(vec3(-1, -1, 0), planes)).toBe(true)
    expect(isPointVisible(vec3(1, -1, 0), planes)).toBe(false)
    expect(isPointVisible(vec3(-1, 1, 0), planes)).toBe(false)
  })

  it('cuts all three axes for an octant', () => {
    expect(sectionPlanes(setSectionMode(createSectionState(), 'octant'))).toHaveLength(3)
  })
})

describe('setSectionOffset', () => {
  it('ignores a non-finite offset rather than corrupting the state', () => {
    const state = setSectionMode(createSectionState(), 'half')
    expect(setSectionOffset(state, 'x', Number.NaN)).toBe(state)
  })
})

describe('dragSectionPlane', () => {
  it('moves the plane by the component of the drag along its normal', () => {
    const state = setSectionMode(createSectionState(), 'half')
    const dragged = dragSectionPlane(state, 'x', vec3(3, 100, 100))
    expect(dragged.offsets.x).toBe(3)
    expect(dragged.offsets.y).toBe(0)
  })
})

describe('signedDistance and projectOntoPlane', () => {
  it('measures which side of the cut a point is on', () => {
    const [plane] = sectionPlanes(setSectionMode(createSectionState(), 'half'))
    expect(signedDistance(vec3(-4, 0, 0), plane as never)).toBeCloseTo(4)
    expect(signedDistance(vec3(4, 0, 0), plane as never)).toBeCloseTo(-4)
  })

  it('drops a point onto the plane', () => {
    const [plane] = sectionPlanes(setSectionMode(createSectionState(), 'half'))
    const projected = projectOntoPlane(vec3(7, 2, 3), plane as never)
    expect(equals(projected, vec3(0, 2, 3), 1e-9)).toBe(true)
  })
})

describe('intersectSegment', () => {
  const [plane] = sectionPlanes(setSectionMode(createSectionState(), 'half'))

  it('finds where a segment crosses the cut', () => {
    const hit = intersectSegment(vec3(-2, 1, 1), vec3(2, 1, 1), plane as never)
    expect(hit).not.toBeNull()
    expect(equals(hit as never, vec3(0, 1, 1), 1e-9)).toBe(true)
  })

  it('returns null when both ends sit on the same side', () => {
    expect(intersectSegment(vec3(1, 0, 0), vec3(2, 0, 0), plane as never)).toBeNull()
    expect(intersectSegment(vec3(-1, 0, 0), vec3(-2, 0, 0), plane as never)).toBeNull()
  })

  it('returns null for a segment lying in the plane', () => {
    expect(intersectSegment(vec3(0, 0, 0), vec3(0, 1, 1), plane as never)).toBeNull()
  })

  it('reports a segment that just touches the plane', () => {
    const hit = intersectSegment(vec3(0, 0, 0), vec3(4, 0, 0), plane as never)
    expect(equals(hit as never, vec3(0, 0, 0), 1e-9)).toBe(true)
  })
})
