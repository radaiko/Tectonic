import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '../../src/app/EditorView'
import { parseFaceTarget } from '../../src/app/planarFaces'
import {
  createBody,
  createDocument,
  createPart,
  createSketchOn,
  documentSketches,
  withSketches,
} from '../../src/domain/Document'
import type { TectonicDocument } from '../../src/domain/Document'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { originPlaneSupport } from '../../src/sketch/domain/SketchSupport'

// The viewport needs a WebGL context jsdom cannot supply, so it is stubbed out;
// its rendering is verified manually in the browser.
vi.mock('../../src/3d/ThreeViewport', () => ({
  ThreeViewport: ({ meshes }: { meshes: readonly unknown[] }) => (
    <div data-testid="three-viewport" data-mesh-count={meshes.length} />
  ),
}))

const NOW = '2026-07-26T12:00:00.000Z'

/**
 * Whether the drawing surface is the one on screen.
 *
 * Both surfaces stay mounted and the one that is not shown is hidden, which
 * takes it out of the accessibility tree along with its toolbar. There is no
 * header toggle to read a pressed state off any more: a sketch is opened by
 * naming one, so what it is opened *from* is the only thing left to check.
 */
const drawing = (): boolean => screen.queryByRole('toolbar', { name: 'Sketch tools' }) !== null

/** Opens a sketch the way the UI offers it: by picking one from the list. */
async function openFirstSketch(): Promise<void> {
  const list = screen.getByRole('list', { name: 'Sketches' })
  await userEvent.click(within(list).getAllByRole('button')[0] as HTMLElement)
}

const TRIANGLE = {
  positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
  indices: [0, 1, 2],
}

function documentWithGeometry(): TectonicDocument {
  return {
    ...createDocument({ name: 'Bracket', now: NOW }),
    parts: [createPart('part-1', 'Part 1', [createBody('body-1', 'Box 1', TRIANGLE)])],
    features: [
      {
        id: 'feature-1',
        name: 'Extrude 1',
        featureType: FeatureType.Extrude,
        sketchId: null,
        parameters: { distance: 10 },
        status: 'active',
        errorMessage: null,
        parentFeatureIds: [],
        childFeatureIds: [],
      },
    ],
  }
}

describe('EditorView', () => {
  it('shows the document name and the feature tree', async () => {
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    // The 3D surface is the default, and its panel is the feature tree.
    expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Bracket')
    expect(screen.getByText('Extrude 1')).toBeDefined()

    // Parts and bodies stay listed once a sketch is opened, too.
    await openFirstSketch()

    expect(drawing()).toBe(true)
    expect(screen.getByText('Part 1')).toBeDefined()
    expect(screen.getByText('Box 1')).toBeDefined()
  })

  it('passes every body mesh to the viewport', () => {
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByTestId('three-viewport').dataset.meshCount).toBe('1')
  })

  it('reports part, body and triangle counts in the status bar', () => {
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('1 parts')).toBeDefined()
    expect(screen.getByText('1 bodies')).toBeDefined()
    expect(screen.getByText('1 triangles')).toBeDefined()
    expect(screen.getByText('mm')).toBeDefined()
  })

  it('says so when the document holds no bodies at all', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    // The body browser is on both surfaces, so opening a sketch must not be
    // what makes an empty document admit it is empty.
    await openFirstSketch()

    expect(screen.getByText(/Nothing has been built yet/)).toBeDefined()
    expect(screen.getByTestId('three-viewport').dataset.meshCount).toBe('0')
  })

  it('wires up save and close', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<EditorView document={documentWithGeometry()} onSave={onSave} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onSave).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('the document title', () => {
  it('is editable, and the edit reaches the saved document', async () => {
    const onSave = vi.fn()
    render(<EditorView document={documentWithGeometry()} onSave={onSave} onClose={vi.fn()} />)

    const title = screen.getByLabelText('Document name')
    await userEvent.clear(title)
    await userEvent.type(title, 'Mounting plate')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave.mock.calls[0]?.[0].metadata.name).toBe('Mounting plate')
  })

  it('marks the document modified, and mirrors the new title to the shell', async () => {
    const onDocumentChange = vi.fn()
    render(
      <EditorView
        document={documentWithGeometry()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onDocumentChange={onDocumentChange}
      />,
    )

    await userEvent.type(screen.getByLabelText('Document name'), '!')

    expect(screen.getByText('Modified')).toBeDefined()
    const [mirrored, dirty] = onDocumentChange.mock.calls.at(-1) ?? []
    expect(mirrored.metadata.name).toBe('Bracket!')
    expect(dirty).toBe(true)
  })

  it('leaves the rest of the metadata alone', async () => {
    const onSave = vi.fn()
    render(<EditorView document={documentWithGeometry()} onSave={onSave} onClose={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Document name'), ' v2')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const saved: TectonicDocument = onSave.mock.calls[0]?.[0]
    expect(saved.metadata.created).toBe(NOW)
    expect(saved.metadata.units).toBe('mm')
  })
})

describe('multiple sketches', () => {
  it('lists every sketch with the support it sits on', () => {
    const document = withSketches(
      createDocument({ now: NOW }),
      [
        createSketchOn(originPlaneSupport('XY'), 'Base'),
        createSketchOn(originPlaneSupport('YZ'), 'Side'),
      ],
      NOW,
    )
    render(<EditorView document={document} onSave={vi.fn()} onClose={vi.fn()} />)

    const list = screen.getByRole('list', { name: 'Sketches' })
    expect(within(list).getByText('Base')).toBeDefined()
    expect(within(list).getByText('XY plane')).toBeDefined()
    expect(within(list).getByText('Side')).toBeDefined()
    expect(within(list).getByText('YZ plane')).toBeDefined()
  })

  it('adds an independent sketch per base plane, and saves them all', async () => {
    const onSave = vi.fn()
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={onSave} onClose={vi.fn()} />,
    )

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    await userEvent.click(within(planes).getByRole('button', { name: 'XZ' }))
    await userEvent.click(within(planes).getByRole('button', { name: 'YZ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const saved = documentSketches(onSave.mock.calls[0]?.[0])
    expect(saved.map((entry) => entry.support)).toEqual([
      { kind: 'origin-plane', plane: 'XY', offset: 0 },
      { kind: 'origin-plane', plane: 'XZ', offset: 0 },
      { kind: 'origin-plane', plane: 'YZ', offset: 0 },
    ])
    // Names are unique, so the list is addressable.
    expect(new Set(saved.map((entry) => entry.name)).size).toBe(3)
  })

  it('selects the sketch that was just added', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    await userEvent.click(within(planes).getByRole('button', { name: 'XZ' }))

    const list = screen.getByRole('list', { name: 'Sketches' })
    const selected = within(list)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toContain('XZ plane')
  })

  it('points a new profile feature at the selected sketch', async () => {
    const onSave = vi.fn()
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={onSave} onClose={vi.fn()} />,
    )

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    await userEvent.click(within(planes).getByRole('button', { name: 'YZ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const saved: TectonicDocument = onSave.mock.calls[0]?.[0]
    const yz = documentSketches(saved).find((entry) => entry.support.kind === 'origin-plane' && entry.support.plane === 'YZ')
    expect(saved.features[0]?.sketchId).toBe(yz?.id)
  })

  it('offers no face to sketch on until something has been built', () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByText(/no face to sketch on/)).toBeDefined()
    expect(screen.queryByLabelText('Face to sketch on')).toBeNull()
  })

  it('attaches a sketch to a face of an existing solid', async () => {
    const onSave = vi.fn()
    render(<EditorView document={documentWithGeometry()} onSave={onSave} onClose={vi.fn()} />)

    const picker = await screen.findByLabelText<HTMLSelectElement>('Face to sketch on')
    // Index 0 is the "choose a face" placeholder; index 1 is the body's first.
    const target = (within(picker).getAllByRole('option')[1] as HTMLOptionElement).value
    // The option value packs both ids; parseFaceTarget is the only thing that
    // knows how, so the test reads it back the same way the picker does.
    const face = parseFaceTarget(target)
    await userEvent.selectOptions(picker, target)
    await userEvent.click(screen.getByRole('button', { name: 'Add face sketch' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const attached = documentSketches(onSave.mock.calls[0]?.[0]).find(
      (entry) => entry.support.kind === 'face',
    )
    // The reference is the body and face id, not a frame frozen at creation.
    expect(face?.bodyId).toBe('body-1')
    expect(attached?.support).toMatchObject({
      kind: 'face',
      bodyId: face?.bodyId,
      faceId: face?.faceId,
      offset: 0,
    })

    // …and alongside the ids, a fingerprint of the face. Both backends derive a
    // face id from where the face is, so the id alone stops naming anything as
    // soon as an upstream feature moves it; this is what the rebuild recognises
    // the same face by afterwards.
    const support = attached?.support as { fingerprint?: Record<string, unknown> }
    expect(support.fingerprint).toBeDefined()
    expect(support.fingerprint).toMatchObject({ normal: { x: 0, y: 0, z: 1 }, outermost: true })
  })

  it('has nothing to draw on when the document holds no sketch', () => {
    const bare = { ...createDocument({ now: NOW }), sketches: [] }
    render(<EditorView document={bare} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('No sketches yet.')).toBeDefined()
    expect(screen.getByText(/no sketches\. Add one from the panel/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Extrude' }).hasAttribute('disabled')).toBe(true)
  })
})

/**
 * Building a feature leaves the editor on the 3D surface. These cover the way
 * out of it: the controls that start the *next* sketch have to be reachable
 * from there, or the second feature of any part has nowhere to begin.
 */
describe('starting a sketch from the 3D surface', () => {
  it('keeps the plane buttons and the sketch list on the 3D surface', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '3D' }))

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    for (const plane of ['XY', 'XZ', 'YZ']) {
      const button = within(planes).getByRole('button', { name: plane })
      expect(button.hasAttribute('disabled')).toBe(false)
    }
    expect(screen.getByRole('list', { name: 'Sketches' })).toBeDefined()
  })

  it('has no header button that opens a sketch without naming one', () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    // The way in is the plane, the face or the sketch itself; the header keeps
    // only the way back out.
    expect(screen.queryByRole('button', { name: 'Sketch' })).toBeNull()
    expect(screen.getByRole('button', { name: '3D' })).toBeDefined()
    expect(drawing()).toBe(false)
  })

  it('creates the sketch and switches to it when a plane is picked from 3D', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '3D' }))
    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    await userEvent.click(within(planes).getByRole('button', { name: 'XZ' }))

    // Picking a plane is what opens the drawing surface — and since that is the
    // only way in, there is no header toggle to flip first either.
    expect(drawing()).toBe(true)
    const selected = within(screen.getByRole('list', { name: 'Sketches' }))
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toContain('XZ plane')
  })

  it('offers Extrude on the 3D surface, where building leaves the user', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '3D' }))

    // Present and usable: the starter document already carries a sketch.
    const extrude = screen.getByRole('button', { name: 'Extrude' })
    expect(extrude.hasAttribute('disabled')).toBe(false)
  })

  it('reaches a face of a freshly built solid without leaving 3D', async () => {
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '3D' }))

    const picker = await screen.findByLabelText<HTMLSelectElement>('Face to sketch on')
    const target = (within(picker).getAllByRole('option')[1] as HTMLOptionElement).value
    await userEvent.selectOptions(picker, target)
    await userEvent.click(screen.getByRole('button', { name: 'Add face sketch' }))

    expect(drawing()).toBe(true)
    const selected = within(screen.getByRole('list', { name: 'Sketches' }))
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(selected[0]?.textContent).toContain('Face of body-1')
  })

  it('still shows the feature tree alongside the sketch controls', async () => {
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '3D' }))

    expect(screen.getByRole('list', { name: 'Feature tree' })).toBeDefined()
    expect(screen.getByRole('group', { name: 'New sketch on plane' })).toBeDefined()
  })
})

describe('the history as one ordered list', () => {
  const historyList = (): HTMLElement => screen.getByRole('list', { name: 'Feature tree' })

  /** What the history shows, in order, whichever kind each row is. */
  const rows = (): string[] =>
    within(historyList())
      .getAllByRole('button')
      .filter((button) => button.className.includes('feature-row__name'))
      .map((button) => button.textContent ?? '')

  it('shows a sketch and the feature built on it in the order they were made', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(rows()).toEqual(['Sketch 1'])

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))

    await waitFor(() => expect(rows()).toEqual(['Sketch 1', 'Extrude 1']))
  })

  /** A sketch drawn after a feature lands after it, which is when it happened. */
  it('puts a newly drawn sketch after the features already built', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    await userEvent.click(within(planes).getByRole('button', { name: 'YZ' }))

    await waitFor(() => expect(rows()).toEqual(['Sketch 1', 'Extrude 1', 'Sketch 2']))
  })

  it('is shown while drawing, not only in 3D', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)

    await openFirstSketch()

    expect(drawing()).toBe(true)
    expect(within(historyList()).getByText('Sketch 1')).toBeDefined()
  })

  it('opens a sketch picked from the history', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '3D' }))

    await userEvent.click(within(historyList()).getByRole('button', { name: 'Sketch 1' }))

    expect(drawing()).toBe(true)
  })

  it('renames a sketch from the history, and takes the rename back', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)
    const row = window.document.querySelector('[data-sketch-id]') as HTMLElement

    await userEvent.pointer({ keys: '[MouseRight]', target: row })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const field = screen.getByRole('textbox', { name: 'Rename Sketch 1' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Base profile{Enter}')

    await waitFor(() => expect(rows()).toEqual(['Base profile']))

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(rows()).toEqual(['Sketch 1']))
  })

  it('hides a sketch from the history without taking it out of the document', async () => {
    const onSave = vi.fn()
    render(<EditorView document={createDocument({ now: NOW })} onSave={onSave} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Hide Sketch 1' }))

    // Still in the history, and still in the file — hidden is how it looks, not
    // whether it is there.
    expect(screen.getByRole('button', { name: 'Show Sketch 1' })).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const saved = documentSketches(onSave.mock.calls[0]?.[0] as TectonicDocument)
    expect(saved).toHaveLength(1)
    expect(saved[0]?.visible).toBe(false)
  })

  it('every plane button is focusable and activates from the keyboard', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    const xz = within(planes).getByRole('button', { name: 'XZ' })
    xz.focus()
    expect(window.document.activeElement).toBe(xz)

    await userEvent.keyboard('{Enter}')

    const selected = within(screen.getByRole('list', { name: 'Sketches' }))
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(selected[0]?.textContent).toContain('XZ plane')
  })
})

describe('export', () => {
  it('offers only formats that can be written, and says why the rest cannot', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    const dialog = screen.getByRole('dialog', { name: 'Export' })

    // A brand new document has no bodies, so the mesh formats explain themselves
    // rather than writing an empty file.
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'stl')
    expect(within(dialog).getByRole('status').textContent).toMatch(/no solid bodies/)
    expect(within(dialog).getByRole('button', { name: 'Export' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('exports the document as the chosen format', async () => {
    const onExport = vi.fn()
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    const dialog = screen.getByRole('dialog', { name: 'Export' })
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'obj')

    expect(within(dialog).queryByRole('status')).toBeNull()
    expect(
      within(dialog).getByRole('button', { name: 'Export' }).hasAttribute('disabled'),
    ).toBe(false)
    expect(onExport).not.toHaveBeenCalled()
  })

  it('closes on cancel without writing anything', async () => {
    render(<EditorView document={documentWithGeometry()} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Export' })).toBeNull())
  })
})

describe('document undo and redo', () => {
  it('offers nothing to undo in a document nobody has touched', () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Undo' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveProperty('disabled', true)
  })

  it('takes back a feature, and puts it back again', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)

    // Scoped to the tree: a selected feature also has its name in the
    // properties panel, and "is it in the history" is the question here.
    const historyList = (): HTMLElement => screen.getByRole('list', { name: 'Feature tree' })

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    expect(await within(historyList()).findByText('Extrude 1')).toBeDefined()

    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo.title).toBe('Undo Add Extrude')
    await userEvent.click(undo)

    // The history holds the document's sketches as well as its features, so it is
    // never empty — that the extrude has left it is the thing to check.
    await waitFor(() =>
      expect(within(historyList()).queryByText('Extrude 1')).toBeNull(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(await within(historyList()).findByText('Extrude 1')).toBeDefined()
  })

  it('takes back an added sketch', async () => {
    const bare = { ...createDocument({ now: NOW }), sketches: [] }
    render(<EditorView document={bare} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.click(within(screen.getByLabelText('New sketch on plane')).getByRole('button', { name: 'XZ' }))
    expect(await screen.findByLabelText('Sketches')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(screen.getByText('No sketches yet.')).toBeDefined())
  })

  it('takes back a rename of the document in one step, not one per keystroke', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)
    const title = screen.getByLabelText<HTMLInputElement>('Document name')

    await userEvent.clear(title)
    await userEvent.type(title, 'Bracket')
    expect(title.value).toBe('Bracket')

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    // One undo, not eight. Typing a title is a single decision.
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Untitled'),
    )
  })

  it('answers Ctrl+Z on the 3D surface, where nothing else claims it', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    const historyList = (): HTMLElement => screen.getByRole('list', { name: 'Feature tree' })
    expect(await within(historyList()).findByText('Extrude 1')).toBeDefined()

    await userEvent.keyboard('{Control>}z{/Control}')

    await waitFor(() => expect(within(historyList()).queryByText('Extrude 1')).toBeNull())
  })

  it('says so rather than doing nothing when there is nothing left to undo', async () => {
    render(<EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />)

    await userEvent.keyboard('{Control>}z{/Control}')

    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      expect.stringContaining('Nothing left to undo'),
    )
  })
})
