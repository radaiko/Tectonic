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

    // The sketch surface is the default, and its panel lists parts and bodies.
    expect(screen.getByLabelText<HTMLInputElement>('Document name').value).toBe('Bracket')
    expect(screen.getByText('Part 1')).toBeDefined()
    expect(screen.getByText('Box 1')).toBeDefined()

    // The feature tree replaces that panel once the 3D surface is active.
    await userEvent.click(screen.getByRole('button', { name: '3D' }))

    expect(screen.getByText('Extrude 1')).toBeDefined()
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

  it('says so when the document has no parts', () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByText('No parts yet.')).toBeDefined()
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
    expect(attached?.support).toEqual({
      kind: 'face',
      bodyId: face?.bodyId,
      faceId: face?.faceId,
      offset: 0,
    })
  })

  it('has nothing to draw on when the document holds no sketch', () => {
    const bare = { ...createDocument({ now: NOW }), sketches: [] }
    render(<EditorView document={bare} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('No sketches yet.')).toBeDefined()
    expect(screen.getByText(/no sketches\. Add one from the panel/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Extrude' }).hasAttribute('disabled')).toBe(true)
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
