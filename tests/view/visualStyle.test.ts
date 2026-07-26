import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VISUAL_STYLE,
  VISUAL_STYLES,
  isTransparent,
  isVisualStyle,
  nextVisualStyle,
  styleAppearance,
  styleLabel,
} from '../../src/view/visualStyle'

describe('visual style catalogue', () => {
  it('offers the six styles the viewport toolbar shows', () => {
    expect(VISUAL_STYLES).toEqual([
      'shaded',
      'shadedEdges',
      'wireframe',
      'xray',
      'hiddenLine',
      'technical',
    ])
    expect(VISUAL_STYLES).toContain(DEFAULT_VISUAL_STYLE)
  })

  it('labels every style', () => {
    for (const style of VISUAL_STYLES) {
      expect(styleLabel(style).length).toBeGreaterThan(0)
    }
  })

  it('describes every style with a usable appearance', () => {
    for (const style of VISUAL_STYLES) {
      const appearance = styleAppearance(style)
      expect(appearance.opacity).toBeGreaterThanOrEqual(0)
      expect(appearance.opacity).toBeLessThanOrEqual(1)
      expect(appearance.background).toMatch(/^#[0-9a-f]{6}$/)
      // Something has to be drawn, or the style would show nothing at all.
      expect(appearance.faces || appearance.edges).toBe(true)
    }
  })
})

describe('individual styles', () => {
  it('draws shaded faces without edges', () => {
    const shaded = styleAppearance('shaded')
    expect(shaded.faces).toBe(true)
    expect(shaded.edges).toBe(false)
  })

  it('draws wireframe as edges only, including the hidden ones', () => {
    const wireframe = styleAppearance('wireframe')
    expect(wireframe.faces).toBe(false)
    expect(wireframe.edges).toBe(true)
    expect(wireframe.hiddenEdges).toBe(true)
  })

  it('makes x-ray faces see-through', () => {
    expect(styleAppearance('xray').opacity).toBeLessThan(1)
    expect(styleAppearance('xray').faces).toBe(true)
  })

  it('paints hidden-line faces in the background colour so they occlude', () => {
    const hidden = styleAppearance('hiddenLine')
    expect(hidden.faceColor).toBe(hidden.background)
    expect(hidden.hiddenEdges).toBe(false)
  })

  it('drops the helpers on the paper-backed styles', () => {
    expect(styleAppearance('technical').helpers).toBe(false)
    expect(styleAppearance('hiddenLine').helpers).toBe(false)
    expect(styleAppearance('shaded').helpers).toBe(true)
  })
})

describe('isVisualStyle', () => {
  it('narrows known style names', () => {
    expect(isVisualStyle('xray')).toBe(true)
    expect(isVisualStyle('sparkles')).toBe(false)
    expect(isVisualStyle(7)).toBe(false)
  })
})

describe('nextVisualStyle', () => {
  it('cycles through every style and wraps', () => {
    let style = VISUAL_STYLES[0]
    const seen = new Set([style])
    for (let step = 0; step < VISUAL_STYLES.length - 1; step += 1) {
      style = nextVisualStyle(style as never)
      seen.add(style)
    }
    expect(seen.size).toBe(VISUAL_STYLES.length)
    expect(nextVisualStyle(style as never)).toBe(VISUAL_STYLES[0])
  })
})

describe('isTransparent', () => {
  it('is true only where faces are drawn with blending', () => {
    expect(isTransparent('xray')).toBe(true)
    expect(isTransparent('shaded')).toBe(false)
    expect(isTransparent('wireframe')).toBe(false)
  })
})
