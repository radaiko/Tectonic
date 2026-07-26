import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '../../src/app/EditorView'
import { createBody, createDocument, createPart } from '../../src/domain/Document'
import type { TectonicDocument } from '../../src/domain/Document'
import { FeatureType } from '../../src/features/domain/FeatureType'

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
    expect(screen.getByText('Bracket')).toBeDefined()
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
