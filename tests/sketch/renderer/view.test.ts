import { describe, expect, it } from 'vitest'
import {
  createView,
  fitView,
  panView,
  screenToWorld,
  worldToScreen,
  zoomView,
} from '../../../src/sketch/renderer/view'

describe('createView', () => {
  it('centres the origin with unit scale by default', () => {
    const view = createView(800, 600)
    expect(view.scale).toBe(1)
    expect(view.offset).toEqual({ x: 0, y: 0 })
    expect(worldToScreen(view, { x: 0, y: 0 })).toEqual({ x: 400, y: 300 })
  })
})

describe('worldToScreen', () => {
  it('flips the y axis so sketch Y points up', () => {
    const view = createView(800, 600)
    expect(worldToScreen(view, { x: 100, y: 50 })).toEqual({ x: 500, y: 250 })
  })

  it('applies the zoom factor', () => {
    const view = createView(800, 600, { scale: 2 })
    expect(worldToScreen(view, { x: 10, y: 0 })).toEqual({ x: 420, y: 300 })
  })

  it('applies the pan offset', () => {
    const view = createView(800, 600, { offset: { x: 100, y: 0 } })
    expect(worldToScreen(view, { x: 100, y: 0 })).toEqual({ x: 400, y: 300 })
  })
})

describe('screenToWorld', () => {
  it('inverts worldToScreen', () => {
    const view = createView(800, 600, { scale: 2.5, offset: { x: -30, y: 12 } })
    const world = { x: 17, y: -4 }
    const roundTripped = screenToWorld(view, worldToScreen(view, world))
    expect(roundTripped.x).toBeCloseTo(world.x)
    expect(roundTripped.y).toBeCloseTo(world.y)
  })
})

describe('panView', () => {
  it('moves the view by a screen-space delta', () => {
    const view = panView(createView(800, 600, { scale: 2 }), 20, -10)
    expect(view.offset).toEqual({ x: -10, y: -5 })
  })
})

describe('zoomView', () => {
  it('keeps the world point under the cursor fixed', () => {
    const view = createView(800, 600)
    const anchor = { x: 600, y: 200 }
    const before = screenToWorld(view, anchor)
    const after = screenToWorld(zoomView(view, 2, anchor), anchor)

    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('multiplies the scale', () => {
    expect(zoomView(createView(800, 600), 2, { x: 400, y: 300 }).scale).toBe(2)
  })

  it('clamps to the usable zoom range', () => {
    const view = createView(800, 600)
    expect(zoomView(view, 1e9, { x: 0, y: 0 }).scale).toBeLessThanOrEqual(1000)
    expect(zoomView(view, 1e-9, { x: 0, y: 0 }).scale).toBeGreaterThanOrEqual(0.01)
  })
})

describe('fitView', () => {
  it('frames a bounding box with margin', () => {
    const view = fitView(800, 600, { minX: -100, minY: -50, maxX: 100, maxY: 50 })
    expect(view.offset).toEqual({ x: 0, y: 0 })
    expect(view.scale).toBeLessThan(800 / 200)
    expect(view.scale).toBeGreaterThan(0)
  })

  it('falls back to unit scale for an empty box', () => {
    const view = fitView(800, 600, { minX: 5, minY: 5, maxX: 5, maxY: 5 })
    expect(view.scale).toBe(1)
    expect(view.offset).toEqual({ x: 5, y: 5 })
  })
})
