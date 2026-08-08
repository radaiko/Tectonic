import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionControls } from '../../src/ui/SectionControls'
import { createSectionState, sectionPlanes } from '../../src/view/section'

describe('SectionControls', () => {
  it('offers no offsets at all while the section is off', () => {
    render(<SectionControls section={createSectionState()} onChange={vi.fn()} />)

    // Nothing is being cut, so an offset would be a control that does nothing.
    expect(screen.queryByLabelText('X')).toBeNull()
  })

  it('shows one offset per axis the mode actually cuts on', () => {
    const { rerender } = render(
      <SectionControls section={createSectionState({ mode: 'half' })} onChange={vi.fn()} />,
    )
    expect(screen.getByLabelText('X')).toBeDefined()
    expect(screen.queryByLabelText('Y')).toBeNull()

    rerender(
      <SectionControls section={createSectionState({ mode: 'octant' })} onChange={vi.fn()} />,
    )
    expect(screen.getByLabelText('Y')).toBeDefined()
    expect(screen.getByLabelText('Z')).toBeDefined()
  })

  it('changes mode through the domain transition rather than by hand', async () => {
    const onChange = vi.fn()
    render(<SectionControls section={createSectionState()} onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('Section mode'), 'quarter')

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'quarter' }))
  })

  it('flips which half of the model a cut keeps', async () => {
    const onChange = vi.fn()
    const before = createSectionState({ mode: 'half' })
    render(<SectionControls section={before} onChange={onChange} />)

    await userEvent.click(screen.getByLabelText('Flip X section'))

    const flipped = onChange.mock.calls[0]?.[0] as typeof before
    expect(flipped.flipped.x).toBe(true)
    // The half-space the viewport clips against turns around with it: unflipped
    // keeps the model below the offset, flipped keeps what is above it.
    expect(sectionPlanes(before)[0]?.normal.x).toBe(-1)
    expect(sectionPlanes(flipped)[0]?.normal.x).toBe(1)
  })

  it('sizes the sliders to the model it is cutting', () => {
    render(
      <SectionControls section={createSectionState({ mode: 'half' })} onChange={vi.fn()} extent={7} />,
    )

    const slider = screen.getByLabelText('X') as HTMLInputElement
    expect(slider.min).toBe('-7')
    expect(slider.max).toBe('7')
  })
})
