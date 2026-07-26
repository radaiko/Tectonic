import { describe, expect, it } from 'vitest'
import { equals, vec3 } from '../../src/domain/vec3'
import { orientationFor } from '../../src/view/camera'
import { createSectionState, setSectionMode } from '../../src/view/section'
import {
  MAX_DISTANCE,
  MIN_DISTANCE,
  activeViewport,
  createMultiViewportState,
  orbitViewport,
  panViewport,
  setActiveViewport,
  setLayout,
  setOrientation,
  setProjection,
  setSection,
  setSplit,
  setStandardView,
  setSyncCameras,
  setVisualStyle,
  updateViewport,
  visibleCount,
  visiblePanes,
  viewportStandardView,
  zoomToFit,
  zoomViewport,
} from '../../src/view/ViewportState'

describe('createMultiViewportState', () => {
  it('starts as a single isometric perspective pane', () => {
    const state = createMultiViewportState()
    expect(state.layout).toBe('single')
    expect(state.viewports).toHaveLength(4)
    expect(state.activeIndex).toBe(0)
    expect(state.syncCameras).toBe(false)
    expect(activeViewport(state).projection).toBe('perspective')
    expect(viewportStandardView(activeViewport(state))).toBe('isometric')
  })

  it('gives the other panes the orthogonal drawing views', () => {
    const state = createMultiViewportState()
    expect(state.viewports.map((viewport) => viewportStandardView(viewport))).toEqual([
      'isometric',
      'front',
      'top',
      'right',
    ])
    expect(state.viewports.slice(1).every((viewport) => viewport.projection === 'orthographic')).toBe(
      true,
    )
  })

  it('gives every pane a distinct id', () => {
    const ids = new Set(createMultiViewportState().viewports.map((viewport) => viewport.id))
    expect(ids.size).toBe(4)
  })

  it('accepts overrides', () => {
    expect(createMultiViewportState({ layout: 'quad' }).layout).toBe('quad')
  })
})

describe('setLayout', () => {
  it('changes how many panes are shown', () => {
    expect(visibleCount(setLayout(createMultiViewportState(), 'quad'))).toBe(4)
    expect(visibleCount(setLayout(createMultiViewportState(), 'twoVertical'))).toBe(2)
  })

  it('pulls the active pane back into view when the layout shrinks', () => {
    const quad = setActiveViewport(setLayout(createMultiViewportState(), 'quad'), 3)
    expect(setLayout(quad, 'single').activeIndex).toBe(0)
    expect(setLayout(quad, 'twoHorizontal').activeIndex).toBe(1)
  })
})

describe('setActiveViewport', () => {
  it('activates a visible pane', () => {
    const quad = setLayout(createMultiViewportState(), 'quad')
    expect(setActiveViewport(quad, 2).activeIndex).toBe(2)
  })

  it('ignores a pane the layout is not showing', () => {
    const single = createMultiViewportState()
    expect(setActiveViewport(single, 2)).toBe(single)
    expect(setActiveViewport(single, -1)).toBe(single)
  })
})

describe('visiblePanes', () => {
  it('pairs each pane with its rectangle', () => {
    const panes = visiblePanes(setLayout(createMultiViewportState(), 'twoHorizontal'), 800, 600)
    expect(panes).toHaveLength(2)
    expect(panes[0]?.rect).toEqual({ x: 0, y: 0, width: 400, height: 600 })
    expect(panes[1]?.config.id).toBe('viewport-2')
    expect(panes[1]?.index).toBe(1)
  })

  it('follows a dragged splitter', () => {
    const state = setSplit(setLayout(createMultiViewportState(), 'twoHorizontal'), 'vertical', 0.25)
    expect(visiblePanes(state, 800, 600)[0]?.rect.width).toBe(200)
  })
})

describe('per-pane settings', () => {
  it('changes style and projection without touching the others', () => {
    const quad = setLayout(createMultiViewportState(), 'quad')
    const styled = setProjection(setVisualStyle(quad, 1, 'wireframe'), 1, 'perspective')
    expect(styled.viewports[1]?.visualStyle).toBe('wireframe')
    expect(styled.viewports[1]?.projection).toBe('perspective')
    expect(styled.viewports[0]?.visualStyle).toBe(quad.viewports[0]?.visualStyle)
  })

  it('sections one pane only', () => {
    const state = setSection(
      createMultiViewportState(),
      0,
      setSectionMode(createSectionState(), 'half'),
    )
    expect(state.viewports[0]?.section.mode).toBe('half')
    expect(state.viewports[1]?.section.mode).toBe('off')
  })

  it('ignores an out-of-range pane', () => {
    const state = createMultiViewportState()
    expect(updateViewport(state, 9, { visualStyle: 'xray' })).toBe(state)
    expect(updateViewport(state, -1, { visualStyle: 'xray' })).toBe(state)
  })
})

describe('camera changes', () => {
  it('snaps a pane to a standard view', () => {
    const state = setStandardView(createMultiViewportState(), 0, 'left')
    expect(state.viewports[0]?.eye).toEqual(orientationFor('left').eye)
    expect(viewportStandardView(state.viewports[0] as never)).toBe('left')
  })

  it('accepts a raw orientation', () => {
    const state = setOrientation(createMultiViewportState(), 0, orientationFor('back'))
    expect(state.viewports[0]?.eye).toEqual(orientationFor('back').eye)
  })

  it('orbits a pane', () => {
    const state = orbitViewport(setStandardView(createMultiViewportState(), 0, 'front'), 0, Math.PI / 2, 0)
    expect(equals(state.viewports[0]?.eye as never, vec3(1, 0, 0), 1e-9)).toBe(true)
  })

  it('ignores an orbit on a pane that does not exist', () => {
    const state = createMultiViewportState()
    expect(orbitViewport(state, 9, 1, 0)).toBe(state)
    expect(panViewport(state, 9, 1, 0)).toBe(state)
    expect(zoomViewport(state, 9, 2)).toBe(state)
    expect(zoomToFit(state, 9, vec3(0, 0, 0), 1)).toBe(state)
  })

  it('zooms within limits', () => {
    const state = createMultiViewportState()
    expect(zoomViewport(state, 0, 2).viewports[0]?.distance).toBeCloseTo(
      (state.viewports[0]?.distance as number) * 2,
    )
    expect(zoomViewport(state, 0, 1e12).viewports[0]?.distance).toBe(MAX_DISTANCE)
    expect(zoomViewport(state, 0, 1e-12).viewports[0]?.distance).toBe(MIN_DISTANCE)
  })

  it('rejects a nonsensical zoom factor', () => {
    const state = createMultiViewportState()
    expect(zoomViewport(state, 0, 0)).toBe(state)
    expect(zoomViewport(state, 0, Number.NaN)).toBe(state)
  })

  it('pans the target across the image plane', () => {
    const state = panViewport(setStandardView(createMultiViewportState(), 0, 'front'), 0, 0, 10)
    expect(state.viewports[0]?.target.z).toBeCloseTo(-10)
  })

  it('frames a bounding sphere', () => {
    const state = zoomToFit(createMultiViewportState(), 0, vec3(1, 2, 3), 50)
    expect(state.viewports[0]?.target).toEqual({ x: 1, y: 2, z: 3 })
    expect(state.viewports[0]?.distance).toBeGreaterThan(50)
  })
})

describe('camera sync', () => {
  it('mirrors a camera change into every pane when on', () => {
    const state = setSyncCameras(setLayout(createMultiViewportState(), 'quad'), true)
    const turned = setStandardView(state, 0, 'back')
    for (const viewport of turned.viewports) {
      expect(viewport.eye).toEqual(orientationFor('back').eye)
    }
  })

  it('leaves style and projection per-pane even while syncing', () => {
    const state = setSyncCameras(setLayout(createMultiViewportState(), 'quad'), true)
    const styled = setVisualStyle(state, 0, 'xray')
    expect(styled.viewports[0]?.visualStyle).toBe('xray')
    expect(styled.viewports[1]?.visualStyle).not.toBe('xray')
  })

  it('shares a zoom across panes', () => {
    const state = setSyncCameras(setLayout(createMultiViewportState(), 'quad'), true)
    const zoomed = zoomViewport(state, 0, 2)
    expect(zoomed.viewports[3]?.distance).toBeCloseTo(zoomed.viewports[0]?.distance as number)
  })

  it('keeps panes independent when off', () => {
    const state = setStandardView(setLayout(createMultiViewportState(), 'quad'), 0, 'back')
    expect(state.viewports[1]?.eye).toEqual(orientationFor('front').eye)
  })
})
