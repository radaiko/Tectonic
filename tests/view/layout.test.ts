import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SPLIT,
  MIN_PANE_FRACTION,
  VIEWPORT_LAYOUTS,
  layoutById,
  layoutHandles,
  layoutRects,
  moveSplit,
  paneAt,
  paneCount,
} from '../../src/view/layout'
import type { ViewportLayoutId } from '../../src/view/types'

const ALL: readonly ViewportLayoutId[] = ['single', 'twoHorizontal', 'twoVertical', 'quad']

describe('layout catalogue', () => {
  it('describes four layouts', () => {
    expect(VIEWPORT_LAYOUTS).toHaveLength(4)
    expect(paneCount('single')).toBe(1)
    expect(paneCount('twoHorizontal')).toBe(2)
    expect(paneCount('twoVertical')).toBe(2)
    expect(paneCount('quad')).toBe(4)
  })

  it('rejects an unknown layout', () => {
    expect(() => layoutById('nope' as ViewportLayoutId)).toThrow(/Unknown viewport layout/)
  })

  it('lists the splitters each layout shows', () => {
    expect(layoutHandles('single')).toEqual([])
    expect(layoutHandles('twoHorizontal')).toEqual(['vertical'])
    expect(layoutHandles('twoVertical')).toEqual(['horizontal'])
    expect(layoutHandles('quad')).toEqual(['vertical', 'horizontal'])
  })
})

describe('layoutRects', () => {
  it('gives one pane the whole frame when single', () => {
    expect(layoutRects('single', 800, 600)).toEqual([{ x: 0, y: 0, width: 800, height: 600 }])
  })

  it('splits side by side', () => {
    expect(layoutRects('twoHorizontal', 800, 600)).toEqual([
      { x: 0, y: 0, width: 400, height: 600 },
      { x: 400, y: 0, width: 400, height: 600 },
    ])
  })

  it('splits top and bottom', () => {
    expect(layoutRects('twoVertical', 800, 600)).toEqual([
      { x: 0, y: 0, width: 800, height: 300 },
      { x: 0, y: 300, width: 800, height: 300 },
    ])
  })

  it('splits into four quadrants in reading order', () => {
    expect(layoutRects('quad', 800, 600)).toEqual([
      { x: 0, y: 0, width: 400, height: 300 },
      { x: 400, y: 0, width: 400, height: 300 },
      { x: 0, y: 300, width: 400, height: 300 },
      { x: 400, y: 300, width: 400, height: 300 },
    ])
  })

  it('honours a moved splitter', () => {
    const rects = layoutRects('twoHorizontal', 1000, 400, { vertical: 0.3, horizontal: 0.5 })
    expect(rects[0]?.width).toBe(300)
    expect(rects[1]?.x).toBe(300)
    expect(rects[1]?.width).toBe(700)
  })

  it('tiles the frame exactly, leaving no seam', () => {
    for (const layout of ALL) {
      const rects = layoutRects(layout, 777, 501, { vertical: 0.37, horizontal: 0.61 })
      const area = rects.reduce((total, rect) => total + rect.width * rect.height, 0)
      expect(area).toBe(777 * 501)
    }
  })

  it('clamps a negative frame to zero', () => {
    expect(layoutRects('single', -10, -10)).toEqual([{ x: 0, y: 0, width: 0, height: 0 }])
  })
})

describe('paneAt', () => {
  it('finds the pane under a point', () => {
    expect(paneAt('quad', 800, 600, 10, 10)).toBe(0)
    expect(paneAt('quad', 800, 600, 500, 10)).toBe(1)
    expect(paneAt('quad', 800, 600, 10, 400)).toBe(2)
    expect(paneAt('quad', 800, 600, 500, 400)).toBe(3)
  })

  it('returns -1 outside the frame', () => {
    expect(paneAt('single', 800, 600, 900, 10)).toBe(-1)
    expect(paneAt('single', 0, 0, 0, 0)).toBe(-1)
  })
})

describe('moveSplit', () => {
  it('moves one handle and leaves the other', () => {
    const moved = moveSplit(DEFAULT_SPLIT, 'vertical', 0.25)
    expect(moved).toEqual({ vertical: 0.25, horizontal: 0.5 })
  })

  it('keeps every pane usable', () => {
    expect(moveSplit(DEFAULT_SPLIT, 'vertical', 0).vertical).toBe(MIN_PANE_FRACTION)
    expect(moveSplit(DEFAULT_SPLIT, 'horizontal', 5).horizontal).toBe(1 - MIN_PANE_FRACTION)
  })

  it('falls back to the middle for a non-finite fraction', () => {
    expect(moveSplit(DEFAULT_SPLIT, 'vertical', Number.NaN).vertical).toBe(0.5)
  })
})
