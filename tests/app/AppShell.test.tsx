import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../../src/app/AppShell'
import { StubKernel } from '../../src/kernel/StubKernel'
import { createDocument, documentSketches } from '../../src/domain/Document'
import * as fileService from '../../src/io/FileService'
import {
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  loadSession,
} from '../../src/io/DocumentStorage'

// See EditorView.test.tsx — jsdom has no WebGL context.
vi.mock('../../src/3d/ThreeViewport', () => ({
  ThreeViewport: () => <div data-testid="three-viewport" />,
}))

/** The autosave debounce, so a test can wait for the copy to land. */
const AUTOSAVE_DELAY_MS = 500

/** Puts a recoverable session in storage, as a previous page load would have. */
function seedRecovery(name: string, dirty: boolean, savedAt = '2026-07-26T12:00:00.000Z'): void {
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      schema: SESSION_SCHEMA_VERSION,
      savedAt,
      dirty,
      document: createDocument({ name, now: savedAt }),
    }),
  )
}

async function newDocument(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /New Document/ }))
  await waitFor(() => expect(screen.getByTestId('three-viewport')).toBeDefined())
}

/** Makes an edit the shell will see, by renaming the document. */
async function editTitle(text: string): Promise<void> {
  await userEvent.type(screen.getByLabelText('Document name'), text)
  await waitFor(() => expect(screen.getByText('Modified')).toBeDefined())
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.spyOn(fileService, 'saveFile').mockImplementation(() => {})
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('starts on the start screen', () => {
    render(<AppShell />)

    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
    expect(screen.queryByTestId('three-viewport')).toBeNull()
  })

  it('creates an empty starter document and enters the editor', async () => {
    render(<AppShell kernel={new StubKernel()} />)

    await newDocument()

    // Nothing is modelled up front any more: no part, no body, no triangle.
    expect(screen.getByText(/Nothing has been built yet/)).toBeDefined()
    expect(screen.getByText('0 parts')).toBeDefined()
    expect(screen.getByText('0 bodies')).toBeDefined()
    expect(screen.getByText('0 triangles')).toBeDefined()
  })

  it('names the backend the geometry actually came out of', async () => {
    render(<AppShell kernel={new StubKernel()} />)

    await newDocument()

    // A stub result and a B-Rep result look alike on screen. Saying which engine
    // produced this one is the difference between the two being distinguishable
    // and the app quietly passing mesh geometry off as production B-Rep.
    const backend = screen.getByText(/^Kernel: /)
    expect(backend.textContent).toContain('stub')
    expect(backend.textContent).toContain('limited')
    expect(backend.title).toMatch(/Not available on this backend: .*fillet/)
  })

  it('will not open a document while no backend has been resolved', async () => {
    // No injected kernel and nothing it is allowed to load: there is no engine
    // to model with, and starting a document anyway would put the user in an
    // editor whose every rebuild fails.
    render(
      <AppShell
        kernelOptions={{
          backends: ['rust'],
          importRustKernel: () => Promise.reject(new Error('binary missing')),
        }}
      />,
    )

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/binary missing/),
    )
    expect(screen.queryByTestId('three-viewport')).toBeNull()
  })

  it('reports a kernel failure without leaving the start screen', async () => {
    const kernel = new StubKernel()
    vi.spyOn(kernel, 'init').mockRejectedValue(new Error('kernel offline'))
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
    const opened = createDocument({ name: 'Opened', now: '2026-07-26T12:00:00.000Z' })
    vi.spyOn(fileService, 'openFile').mockResolvedValue(opened)
    render(<AppShell kernel={new StubKernel()} />)

    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Opened'),
    )
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
    render(<AppShell kernel={new StubKernel()} />)

    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Could not open file: bad file'),
    )
  })

  it('saves the active document', async () => {
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(fileService.saveFile).toHaveBeenCalledOnce()
  })
})

describe('opening a saved file', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('round-trips a document with several sketches back into the editor', async () => {
    const written: string[] = []
    vi.spyOn(fileService, 'saveFile').mockImplementation((document) => {
      written.push(fileService.serialize(document))
    })
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()

    // Build a document worth reopening: a second sketch and a new title.
    await userEvent.click(screen.getByRole('button', { name: 'XZ' }))
    await editTitle('!')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    // Reopen exactly the bytes that were written.
    const reopened = fileService.deserialize(written[0] as string)
    vi.spyOn(fileService, 'openFile').mockResolvedValue(reopened)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.click(screen.getByRole('button', { name: /Open File/ }))

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Untitled!'),
    )
    expect(documentSketches(reopened).map((entry) => entry.support)).toEqual([
      { kind: 'origin-plane', plane: 'XY', offset: 0 },
      { kind: 'origin-plane', plane: 'XZ', offset: 0 },
    ])
  })
})

describe('closing a document', () => {
  beforeEach(() => {
    vi.spyOn(fileService, 'saveFile').mockImplementation(() => {})
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('returns to the start screen without asking when nothing was edited', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
    expect(screen.queryByTestId('three-viewport')).toBeNull()
  })

  it('warns before discarding unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()
    await editTitle(' edited')

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
  })

  it('stays in the editor when the warning is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()
    await editTitle(' edited')

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.getByTestId('three-viewport')).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Tectonic' })).toBeNull()
  })

  it('does not warn again once the document has been saved to a file', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()
    await editTitle(' edited')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('Saved')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(confirm).not.toHaveBeenCalled()
  })

  it('warns before a New Document would replace unsaved work', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()
    await editTitle(' edited')

    await userEvent.click(screen.getByRole('button', { name: 'New Document' }))

    expect(confirm).toHaveBeenCalledOnce()
    // Declined, so the edited document is still the one on screen.
    expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Untitled edited')
  })

  it('leaves the recovery copy behind so it can be reopened', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AppShell kernel={new StubKernel()} />)
    await newDocument()
    await editTitle(' edited')

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    // Closing flushes the pending write rather than dropping it.
    expect(loadSession()?.document.metadata.name).toBe('Untitled edited')
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeDefined()
  })
})

describe('crash recovery', () => {
  beforeEach(() => {
    vi.spyOn(fileService, 'saveFile').mockImplementation(() => {})
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('offers nothing when storage is empty', () => {
    render(<AppShell />)

    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull()
  })

  it('offers the document a previous session left behind', () => {
    seedRecovery('Bracket', true)
    render(<AppShell />)

    expect(screen.getByLabelText('Recovered document').textContent).toContain('Bracket')
    expect(screen.getByLabelText('Recovered document').textContent).toContain('unsaved changes')
  })

  it('reopens it in the editor, still marked as unsaved', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    seedRecovery('Bracket', true)
    render(<AppShell kernel={new StubKernel()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Bracket')
    expect(screen.getByText('Modified')).toBeDefined()

    // The restored document is still dirty, so closing it warns — and
    // declining the warning leaves the editor exactly where it was.
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByTestId('three-viewport')).toBeDefined()
    expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Bracket')
    expect(screen.queryByRole('heading', { name: 'Tectonic' })).toBeNull()
  })

  it('reports a cleanly saved document without claiming unsaved changes', () => {
    seedRecovery('Bracket', false)
    render(<AppShell />)

    expect(screen.getByLabelText('Recovered document').textContent).not.toContain('unsaved')
  })

  it('can be discarded, and stays discarded', async () => {
    seedRecovery('Bracket', true)
    render(<AppShell />)

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.queryByLabelText('Recovered document')).toBeNull()
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('can still be discarded while the geometry kernel is loading', async () => {
    seedRecovery('Bracket', true)
    // No injected kernel and a backend that never resolves, so the shell sits in
    // its loading state for the whole test. Throwing the recovered copy away
    // needs nothing from the kernel, and used to be blocked anyway.
    render(<AppShell kernelOptions={{ backends: ['rust'], importRustKernel: () => new Promise(() => {}) }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.queryByLabelText('Recovered document')).toBeNull()
  })

  it('ignores a payload it cannot read, and clears it', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, '{ truncated')
    render(<AppShell />)

    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull()
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('ignores an entry written under a different schema', () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ schema: 99, savedAt: '', dirty: true, document: createDocument() }),
    )
    render(<AppShell />)

    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull()
  })

  it('mirrors edits to storage so a reload has something to recover', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<AppShell kernel={new StubKernel()} />)
      await newDocument()
      await editTitle(' in progress')

      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)

      const stored = loadSession()
      expect(stored?.dirty).toBe(true)
      expect(stored?.document.metadata.name).toBe('Untitled in progress')
    } finally {
      vi.useRealTimers()
    }
  })
})
