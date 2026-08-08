import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewCube } from '../../src/3d/ViewCube'
import { orientationFor } from '../../src/view/camera'

/**
 * The cube's geometry is tested in `view/viewCube`; what matters here is that
 * the widget shows the camera's own attitude and hands back an orientation the
 * camera can be placed on — never a view of its own.
 */
describe('ViewCube', () => {
  it('names the view the camera is currently nearest to', () => {
    render(<ViewCube orientation={orientationFor('front')} onSelect={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'View cube, currently Front' })).toBeDefined()
  })

  it('follows the camera rather than holding a view of its own', () => {
    const { rerender } = render(<ViewCube orientation={orientationFor('top')} onSelect={vi.fn()} />)
    expect(screen.getByRole('img', { name: /currently Top/ })).toBeDefined()

    rerender(<ViewCube orientation={orientationFor('right')} onSelect={vi.fn()} />)

    // Nothing was clicked: the cube reports where the camera went.
    expect(screen.getByRole('img', { name: /currently Right/ })).toBeDefined()
  })

  it('marks the standard-view button matching the camera', () => {
    render(<ViewCube orientation={orientationFor('left')} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Left' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Top' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('asks for the orientation a standard-view button names', async () => {
    const onSelect = vi.fn()
    render(<ViewCube orientation={orientationFor('isometric')} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Front' }))

    expect(onSelect).toHaveBeenCalledWith(orientationFor('front'), 'front')
  })

  it('offers every face view plus isometric, and no near-duplicates', () => {
    render(<ViewCube orientation={orientationFor('isometric')} onSelect={vi.fn()} />)

    const names = screen
      .getAllByRole('button')
      .map((node) => node.textContent)
      .filter((name): name is string => name !== null)

    expect(names).toEqual(['Front', 'Back', 'Right', 'Left', 'Top', 'Bottom', 'Isometric'])
    // Dimetric and trimetric are real orientations but nobody reaches for them
    // by name; leaving them out keeps the widget legible.
    expect(names).not.toContain('Dimetric')
  })

  it('draws only the faces turned towards the camera', () => {
    const { container } = render(
      <ViewCube orientation={orientationFor('front')} onSelect={vi.fn()} />,
    )

    // Looking straight at one face: the five others are edge-on or behind, and
    // drawing a face the camera cannot see would let it be clicked.
    expect(container.querySelectorAll('.viewcube__face')).toHaveLength(1)
  })
})
