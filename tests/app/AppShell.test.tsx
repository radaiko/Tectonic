import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../../src/app/AppShell'
import { StubKernel } from '../../src/kernel/StubKernel'
import { createDocument } from '../../src/domain/Document'
import * as fileService from '../../src/io/FileService'

// See EditorView.test.tsx — jsdom has no WebGL context.
vi.mock('../../src/3d/ThreeViewport', () => ({
  ThreeViewport: () => <div data-testid="three-viewport" />,
}))

describe('AppShell', () => {
  beforeEach(() => {
    vi.spyOn(fileService, 'saveFile').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts on the start screen', () => {
    render(<AppShell />)

    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
    expect(screen.queryByTestId('three-viewport')).toBeNull()
  })

  it('creates a starter document and enters the editor', async () => {
    render(<AppShell kernel={new StubKernel()} />)

    await userEvent.click(screen.getByRole('button', { name: /New Document/ }))

    await waitFor(() => expect(screen.getByTestId('three-viewport')).toBeDefined())
    expect(screen.getByText('Part 1')).toBeDefined()
    expect(screen.getByText('12 triangles')).toBeDefined()
  })

  it('reports a kernel failure without leaving the start screen', async () => {
    const kernel = new StubKernel()
    vi.spyOn(kernel, 'createBox').mockRejectedValue(new Error('kernel offline'))
    render(<AppShell kernel={kernel} />)

    await userEvent.click(screen.getByRole('button', { name: /New Document/ }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Could not create document: kernel offline',
      ),
    )
    expect(screen.queryByTestId('three-viewport')).toBeNull()
  })

  it('opens a document from the file picker', async () => {
    const opened = {
      ...createDocument({ name: 'Opened', now: '2026-07-26T12:00:00.000Z' }),
    }
    vi.spyOn(fileService, 'openFile').mockResolvedValue(opened)
    render(<AppShell />)

    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    await waitFor(() => expect(screen.getByText('Opened')).toBeDefined())
  })

  it('stays put when the picker is dismissed', async () => {
    vi.spyOn(fileService, 'openFile').mockResolvedValue(null)
    render(<AppShell />)

    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('surfaces an open failure as an alert', async () => {
    vi.spyOn(fileService, 'openFile').mockRejectedValue(new Error('bad file'))
    render(<AppShell />)

    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Could not open file: bad file'),
    )
  })

  it('saves the active document', async () => {
    render(<AppShell kernel={new StubKernel()} />)
    await userEvent.click(screen.getByRole('button', { name: /New Document/ }))
    await waitFor(() => expect(screen.getByTestId('three-viewport')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(fileService.saveFile).toHaveBeenCalledOnce()
  })

  it('returns to the start screen on close', async () => {
    render(<AppShell kernel={new StubKernel()} />)
    await userEvent.click(screen.getByRole('button', { name: /New Document/ }))
    await waitFor(() => expect(screen.getByTestId('three-viewport')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
    expect(screen.queryByTestId('three-viewport')).toBeNull()
  })
})
