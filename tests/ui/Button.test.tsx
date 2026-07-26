import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../src/ui/Button'

describe('Button', () => {
  it('renders a non-submitting button with default styling', () => {
    render(<Button>Extrude</Button>)

    const button = screen.getByRole('button', { name: 'Extrude' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button.className).toContain('btn--secondary')
    expect(button.className).toContain('btn--medium')
  })

  it('applies variant, size and caller class names', () => {
    render(
      <Button variant="primary" size="large" className="custom">
        New
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'New' })
    expect(button.className).toBe('btn btn--primary btn--large custom')
  })

  it('forwards clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
