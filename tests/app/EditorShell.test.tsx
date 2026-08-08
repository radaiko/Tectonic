import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '../../src/app/EditorView'
import { createBody, createDocument, createPart } from '../../src/domain/Document'
import type { TectonicDocument } from '../../src/domain/Document'
import { StubKernel } from '../../src/kernel/StubKernel'

// The viewport needs a WebGL context jsdom cannot supply, so it is stubbed out.
// Its own behaviour — plane picking, the view cube, framing — is covered in
// `tests/3d`, and verified in a real browser.
vi.mock('../../src/3d/ThreeViewport', () => ({
  ThreeViewport: ({
    meshes,
    fitRequest,
  }: {
    readonly meshes: readonly unknown[]
    readonly fitRequest?: number
  }) => (
    <div
      data-testid="three-viewport"
      data-mesh-count={meshes.length}
      data-fit-request={fitRequest}
    />
  ),
}))

const NOW = '2026-07-26T12:00:00.000Z'

const TRIANGLE = {
  positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
  indices: [0, 1, 2],
}

function documentWithGeometry(): TectonicDocument {
  return {
    ...createDocument({ name: 'Bracket', now: NOW }),
    parts: [createPart('part-1', 'Part 1', [createBody('body-1', 'Box 1', TRIANGLE)])],
  }
}

function renderEditor(document = createDocument({ now: NOW })) {
  return render(<EditorView document={document} onSave={vi.fn()} onClose={vi.fn()} />)
}

/** Whether the drawing surface is the one on screen. */
const drawing = (): boolean => screen.queryByRole('toolbar', { name: 'Sketch tools' }) !== null

/** Opens a sketch the way the UI offers it: by naming one in the browser. */
async function openSketch(): Promise<void> {
  const list = screen.getByRole('list', { name: 'Sketches' })
  await userEvent.click(within(list).getAllByRole('button')[0] as HTMLElement)
}

/* -------------------------------------------------------------------------- */

describe('the editor shell', () => {
  it('lays the window out as the five regions a CAD application has', () => {
    renderEditor()

    expect(screen.getByRole('banner')).toBeDefined()
    expect(screen.getByRole('tablist', { name: 'Workspace' })).toBeDefined()
    expect(screen.getByRole('complementary', { name: 'Browser' })).toBeDefined()
    expect(screen.getByTestId('three-viewport')).toBeDefined()
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeDefined()
    expect(screen.getByRole('contentinfo', { name: 'Document status' })).toBeDefined()
  })

  it('keeps the document identity, its save state and history in the top bar', () => {
    renderEditor()
    const bar = within(screen.getByRole('banner'))

    expect(bar.getByLabelText<HTMLInputElement>('Document name').value).toBe('Untitled')
    expect(bar.getByText('Saved')).toBeDefined()
    expect(bar.getByRole('group', { name: 'Document history' })).toBeDefined()
  })

  it('reports what the document holds in the status bar', () => {
    renderEditor(documentWithGeometry())
    const status = within(screen.getByRole('contentinfo', { name: 'Document status' }))

    expect(status.getByText('1 part')).toBeDefined()
    expect(status.getByText('1 body')).toBeDefined()
    expect(status.getByText('mm')).toBeDefined()
    expect(status.getByText(/^Kernel: /)).toBeDefined()
  })

  it('shows the ordered build along the bottom, and collapses it away', async () => {
    renderEditor()

    expect(screen.getByRole('list', { name: 'Timeline' })).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse the timeline' }))

    expect(screen.queryByRole('list', { name: 'Timeline' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Expand the timeline' })).toBeDefined()
  })
})

describe('the modelling workspaces', () => {
  it('opens on Solid, with the groups a modeller works in', () => {
    renderEditor()

    expect(screen.getByRole('tab', { name: 'Solid' }).getAttribute('aria-selected')).toBe('true')
    for (const group of ['Create', 'Modify', 'Inspect', 'Make']) {
      expect(screen.getByRole('group', { name: group })).toBeDefined()
    }
  })

  it('switches the commands on screen when a workspace is chosen', async () => {
    renderEditor()

    expect(screen.getByRole('button', { name: 'Extrude' })).toBeDefined()
    await userEvent.click(screen.getByRole('tab', { name: 'Surface' }))

    expect(screen.queryByRole('button', { name: 'Extrude' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Extruded Surface' })).toBeDefined()
  })

  it('walks the workspaces from the keyboard', async () => {
    renderEditor()
    screen.getByRole('tab', { name: 'Solid' }).focus()

    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Surface' }).getAttribute('aria-selected')).toBe('true')
    expect(window.document.activeElement).toBe(screen.getByRole('tab', { name: 'Surface' }))
  })

  it('says what an environment this editor does not hold is for', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('tab', { name: 'Assemble' }))

    expect(screen.getByText(/this editor opens a single part document/)).toBeDefined()
  })

  it('blocks a command the backend cannot carry out, and says which backend', () => {
    render(
      <EditorView
        document={documentWithGeometry()}
        kernel={new StubKernel()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    // The stub tessellates but has no B-Rep, so the operations it cannot do are
    // named rather than offered and then failed.
    const fillet = screen.getByRole('button', { name: /^Fillet — not available/ })
    expect(fillet.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('sketch mode', () => {
  it('swaps the ribbon for the sketch toolset and pins the way out', async () => {
    renderEditor()
    expect(drawing()).toBe(false)

    await openSketch()

    expect(drawing()).toBe(true)
    expect(screen.getByRole('button', { name: 'Finish Sketch' })).toBeDefined()
    // The drawing tools, grouped rather than a single undifferentiated strip.
    for (const group of ['Create', 'Modify', 'Constrain']) {
      expect(screen.getByRole('group', { name: group })).toBeDefined()
    }
  })

  it('returns to the 3D view when the sketch is finished', async () => {
    renderEditor()
    await openSketch()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Sketch' }))

    expect(drawing()).toBe(false)
    expect(screen.queryByRole('button', { name: 'Finish Sketch' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Extrude' })).toBeDefined()
  })

  it('leaves the sketch when a modelling workspace is chosen instead', async () => {
    renderEditor()
    await openSketch()

    // Wanting the Solid tab is wanting to be done drawing, so it does not leave
    // a modelling ribbon hovering over a canvas that ignores it.
    await userEvent.click(screen.getByRole('tab', { name: 'Solid' }))

    expect(drawing()).toBe(false)
    expect(screen.getByRole('tab', { name: 'Solid' }).getAttribute('aria-selected')).toBe('true')
  })

  it('drives the drawing tool from the ribbon', async () => {
    renderEditor()
    await openSketch()
    const tools = within(screen.getByRole('toolbar', { name: 'Sketch tools' }))

    await userEvent.click(tools.getByRole('button', { name: 'Circle' }))

    expect(tools.getByRole('button', { name: 'Circle' }).getAttribute('aria-pressed')).toBe('true')
    expect(tools.getByRole('button', { name: 'Select' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('draws the tool palette once, not once per surface', async () => {
    renderEditor()
    await openSketch()

    // The ribbon is the palette now; the sketch editor's own strip stands down
    // rather than showing the same sixteen tools a second time.
    expect(screen.getAllByRole('button', { name: 'Rectangle' })).toHaveLength(1)
  })
})

describe('the viewport and its overlays', () => {
  it('states which surface is live, and what is picked', async () => {
    renderEditor()
    const hud = screen.getByTestId('viewport-hud-state')

    expect(hud.textContent).toContain('Model')
    await openSketch()

    expect(screen.getByTestId('viewport-hud-state').textContent).toContain('Sketch 1')
  })

  it('offers framing on the view cube rather than a second time in the ribbon', async () => {
    renderEditor(documentWithGeometry())

    // The cube is on screen whatever tab is showing, and it is where anyone
    // looks for a view command; the ribbon would only be a second control for
    // one camera move. (The cube itself is covered in `tests/3d`.)
    await userEvent.click(screen.getByRole('tab', { name: 'Inspect' }))

    expect(screen.queryByRole('button', { name: 'Fit' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Inspect' })).toBeDefined()
  })

  it('cuts the model open from the ribbon, and puts it back', async () => {
    renderEditor(documentWithGeometry())
    const section = () =>
      within(screen.getByRole('group', { name: 'Inspect' })).getByRole('button', {
        name: 'Section',
      })

    await waitFor(() => expect(section().hasAttribute('disabled')).toBe(false))
    await userEvent.click(section())

    expect(section().getAttribute('aria-pressed')).toBe('true')
    // The browser's Section panel is where the mode and offsets are changed
    // from there, so opening it is how the cut is read back.
    await userEvent.click(
      within(screen.getByRole('complementary', { name: 'Browser' })).getByRole('button', {
        name: /^Section/,
      }),
    )
    expect(screen.getByLabelText<HTMLSelectElement>('Section mode').value).toBe('half')

    await userEvent.click(section())
    expect(screen.getByLabelText<HTMLSelectElement>('Section mode').value).toBe('off')
  })
})

describe('body visibility', () => {
  it('takes a body out of the viewport without taking it out of the document', async () => {
    renderEditor(documentWithGeometry())
    const viewport = () => screen.getByTestId('three-viewport')
    const status = () => screen.getByRole('contentinfo', { name: 'Document status' })

    expect(viewport().dataset.meshCount).toBe('1')
    await userEvent.click(screen.getByRole('button', { name: 'Hide Box 1' }))

    // Off the screen, still in the count — hiding is a way of looking at the
    // model, not a change to it.
    expect(viewport().dataset.meshCount).toBe('0')
    expect(within(status()).getByText('1 body')).toBeDefined()
    expect(within(status()).getByText('1 hidden')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Show all bodies' }))
    expect(viewport().dataset.meshCount).toBe('1')
  })
})
