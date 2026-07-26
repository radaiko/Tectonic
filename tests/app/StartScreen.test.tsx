import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StartScreen } from '../../src/app/StartScreen'

describe('StartScreen', () => {
  it('shows the branding and both actions', () => {
    render(<StartScreen onNewDocument={vi.fn()} onOpenFile={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
    expect(screen.getByRole('button', { name: /New Document/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Open File/ })).toBeDefined()
  })

  it('has no error region by default', () => {
    render(<StartScreen onNewDocument={vi.fn()} onOpenFile={vi.fn()} />)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('invokes the callbacks on click', async () => {
    const onNewDocument = vi.fn()
    const onOpenFile = vi.fn()
    render(<StartScreen onNewDocument={onNewDocument} onOpenFile={onOpenFile} />)

    await userEvent.click(screen.getByRole('button', { name: /New Document/ }))
    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    expect(onNewDocument).toHaveBeenCalledOnce()
    expect(onOpenFile).toHaveBeenCalledOnce()
  })

  it('disables both actions while busy', async () => {
    const onNewDocument = vi.fn()
    render(<StartScreen onNewDocument={onNewDocument} onOpenFile={vi.fn()} busy />)

    await userEvent.click(screen.getByRole('button', { name: /New Document/ }))

    expect(onNewDocument).not.toHaveBeenCalled()
  })

  it('surfaces an error message as an alert', () => {
    render(<StartScreen onNewDocument={vi.fn()} onOpenFile={vi.fn()} error="Could not open file" />)

    expect(screen.getByRole('alert').textContent).toBe('Could not open file')
  })
})
