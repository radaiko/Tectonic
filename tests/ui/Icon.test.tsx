import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { FEATURE_TYPES } from '../../src/features/domain/FeatureType'
import { featureIconName } from '../../src/ui/featureIcons'
import { hasIcon, Icon, ICON_NAMES } from '../../src/ui/Icon'

describe('the icon set', () => {
  it('draws vector art, not a character', () => {
    const { container } = render(<Icon name="extrude" />)
    const svg = container.querySelector('svg')

    expect(svg).not.toBeNull()
    // Stroked in `currentColor`, which is what lets one definition serve a
    // ribbon button, a browser row and a disabled control.
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
    expect(svg?.textContent).toBe('')
  })

  it('renders every name in the set', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelector('svg')?.childElementCount).toBeGreaterThan(0)
      unmount()
    }
  })

  it('is hidden from assistive technology unless it is given a name', () => {
    const { container, rerender } = render(<Icon name="save" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')

    rerender(<Icon name="save" title="Save" />)
    const named = container.querySelector('svg')
    expect(named?.getAttribute('aria-label')).toBe('Save')
    expect(named?.getAttribute('aria-hidden')).toBeNull()
  })

  it('scales from one 24-unit grid', () => {
    const { container } = render(<Icon name="fillet" size={32} />)
    const svg = container.querySelector('svg')

    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg?.getAttribute('width')).toBe('32')
  })

  it('has a drawing for every kind of feature the tree can hold', () => {
    // A feature with no icon would fall through to an empty box in the browser,
    // the ribbon and the timeline at once.
    for (const type of FEATURE_TYPES) {
      expect(hasIcon(featureIconName(type))).toBe(true)
    }
  })
})
