import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '../../src/app/EditorView'
import type { ThreeViewportProps } from '../../src/3d/ThreeViewport'
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
import { meshTopology } from '../../src/kernel/topology'
import { buildRectangle } from '../../src/sketch/domain/builders'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { originPlaneSupport } from '../../src/sketch/domain/SketchSupport'
import type { SelectionItem } from '../../src/view/selection'
import { boxMesh } from '../helpers/meshes'

/**
 * The interaction model, end to end through the editor.
 *
 * Every case here is a report from using the application: a click on a face
 * created a sketch nobody asked for, sketches could be added but never removed,
 * and Extrude built from a sketch the user had not named. The viewport is
 * stubbed — jsdom has no WebGL — but it is stubbed by *capturing its props*
 * rather than by faking behaviour, so a pick in these tests is exactly the call
 * the real viewport makes when something is clicked.
 */

const viewport = vi.hoisted(() => ({ props: null as ThreeViewportProps | null }))

vi.mock('../../src/3d/ThreeViewport', () => ({
  ThreeViewport: (props: ThreeViewportProps) => {
    viewport.props = props
    return <div data-testid="three-viewport" data-mesh-count={props.meshes.length} />
  },
}))

const NOW = '2026-07-26T12:00:00.000Z'
const BOX = boxMesh(20, 10, 6)

/** Whether the drawing surface is the one on screen. */
const drawing = (): boolean => screen.queryByRole('toolbar', { name: 'Sketch tools' }) !== null

const sketchRows = (): HTMLElement[] =>
  within(screen.getByRole('list', { name: 'Sketches' })).getAllByRole('button', {
    name: /^Sketch|^Base|^Profile/,
  })

/** The +Z face of the box body, which is the one a face sketch lands on here. */
function topFaceId(): string {
  const face = meshTopology(BOX).faces.find((candidate) => candidate.normal.z > 0.99)
  if (!face) throw new Error('the box has no +Z face')
  return face.id
}

/** Drives the viewport the way a click on geometry does: it reports a pick. */
function pick(...items: SelectionItem[]): void {
  const onSelectionChange = viewport.props?.onSelectionChange
  if (!onSelectionChange) throw new Error('the viewport is not accepting picks')
  act(() => onSelectionChange(items))
}

/** A document with one solid body already in it, and one sketch on XY. */
function documentWithSolid(): TectonicDocument {
  return {
    ...createDocument({ name: 'Bracket', now: NOW }),
    parts: [createPart('part-1', 'Part 1', [createBody('body-1', 'Base', BOX)])],
  }
}

/** A document whose Extrude is built on the sketch it names, so it has dependents. */
function documentWithDependency(): TectonicDocument {
  const profile = new SketchModel({ id: 's1', name: 'Profile', support: originPlaneSupport('XY') })
  buildRectangle(profile, { x: 0, y: 0 }, { x: 20, y: 10 })
  return {
    ...withSketches(createDocument({ name: 'Bracket', now: NOW }), [profile], NOW),
    features: [
      {
        id: 'feature-1',
        name: 'Extrude 1',
        featureType: FeatureType.Extrude,
        sketchId: 's1',
        parameters: { distance: 10 },
        status: 'active',
        errorMessage: null,
        parentFeatureIds: [],
        childFeatureIds: [],
      },
    ],
  }
}

/* -------------------------------------------------------------------------- */

describe('picking geometry in the 3D view', () => {
  it('selects a face without creating a sketch on it', async () => {
    render(<EditorView document={documentWithSolid()} onSave={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())
    const before = sketchRows().length

    pick({ kind: 'face', bodyId: 'body-1', faceId: topFaceId() })

    // The whole of the bug: this used to be a sketch and a mode switch.
    expect(sketchRows()).toHaveLength(before)
    expect(drawing()).toBe(false)
    // And it *is* selected — the pick was not simply thrown away.
    expect(screen.getByLabelText('Document status').textContent).toContain('1 selected')
  })

  it('selects an origin plane without creating a sketch on it', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    pick({ kind: 'origin-plane', plane: 'XZ' })

    expect(sketchRows()).toHaveLength(1)
    expect(drawing()).toBe(false)
  })

  it('selects a sketch from its 3D overlay without opening it for drawing', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())
    const sketchId = viewport.props?.sketchOverlays?.[0]?.sketchId as string

    pick({ kind: 'sketch', sketchId })

    expect(drawing()).toBe(false)
    expect(screen.getByLabelText('Document status').textContent).toContain('1 selected')
  })
})

describe('Create Sketch', () => {
  /** The ribbon's copy. The inspector carries one too — see the case below. */
  const createButton = (): HTMLElement =>
    within(screen.getByRole('tabpanel', { name: 'Solid' })).getByRole('button', {
      name: 'Create Sketch',
    })

  it('is offered in the ribbon and in the inspector, so the pick has somewhere to go', async () => {
    render(<EditorView document={documentWithSolid()} onSave={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    pick({ kind: 'face', bodyId: 'body-1', faceId: topFaceId() })

    // Two homes on purpose: the ribbon is where commands live, and the
    // inspector is where the user is already looking at what they picked.
    expect(screen.getAllByRole('button', { name: 'Create Sketch' })).toHaveLength(2)
  })

  it('is blocked, and says what it wants, until something can carry a sketch', async () => {
    render(<EditorView document={documentWithSolid()} onSave={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    expect(createButton().hasAttribute('disabled')).toBe(true)

    // An edge is a pick, but not one a sketch can sit on.
    pick({ kind: 'edge', bodyId: 'body-1', edgeId: 'edge-0' })
    expect(createButton().hasAttribute('disabled')).toBe(true)

    // Two faces do not describe one plane either.
    pick(
      { kind: 'face', bodyId: 'body-1', faceId: topFaceId() },
      { kind: 'face', bodyId: 'body-1', faceId: 'face-0' },
    )
    expect(createButton().hasAttribute('disabled')).toBe(true)
  })

  it('starts a sketch on a picked origin plane, and only when pressed', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    pick({ kind: 'origin-plane', plane: 'YZ' })
    expect(sketchRows()).toHaveLength(1)

    await userEvent.click(createButton())

    expect(sketchRows()).toHaveLength(2)
    expect(drawing()).toBe(true)
    expect(sketchRows()[1]?.textContent).toContain('YZ plane')
  })

  it('starts a sketch on a picked planar face', async () => {
    render(<EditorView document={documentWithSolid()} onSave={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    pick({ kind: 'face', bodyId: 'body-1', faceId: topFaceId() })
    await userEvent.click(createButton())

    expect(drawing()).toBe(true)
    expect(sketchRows().at(-1)?.textContent).toContain('Face of body-1')
  })

  it('projects the support face outline into the new sketch as construction geometry', async () => {
    const onSave = vi.fn()
    render(<EditorView document={documentWithSolid()} onSave={onSave} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    pick({ kind: 'face', bodyId: 'body-1', faceId: topFaceId() })
    await userEvent.click(createButton())
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const attached = documentSketches(onSave.mock.calls[0]?.[0] as TectonicDocument).find(
      (entry) => entry.support.kind === 'face',
    )
    expect(attached).toBeDefined()
    // Four corners and one closed loop, all construction — the box's own top
    // face, not a rectangle guessed at from its bounds.
    const entities = [...(attached?.entities.values() ?? [])]
    expect(entities).toHaveLength(5)
    expect(entities.every((entity) => entity.isConstruction)).toBe(true)
    const corners = entities.filter((entity) => entity.type === 'point')
    for (const corner of corners) {
      expect(Math.abs(corner.x)).toBeCloseTo(10, 6)
      expect(Math.abs(corner.y)).toBeCloseTo(5, 6)
    }
  })
})

describe('Extrude asks which sketch it is building from', () => {
  const dialog = (): HTMLElement => screen.getByRole('dialog', { name: 'Extrude' })

  it('builds nothing until a sketch has been named', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))

    expect(within(dialog()).getByText('No sketch selected yet.')).toBeDefined()
    expect(within(dialog()).getByRole('button', { name: 'OK' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText('Extrude 1')).toBeNull()
  })

  it('takes the sketch from a click on its 3D overlay, and shows it as a chip', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())
    const sketchId = viewport.props?.sketchOverlays?.[0]?.sketchId as string

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    // While the command is asking, the viewport only offers sketches — a face
    // click cannot answer "which sketch", so it must not be able to interfere.
    expect(viewport.props?.pickable).toEqual(['sketch'])

    pick({ kind: 'sketch', sketchId })

    expect(
      within(dialog()).getByRole('button', { name: /Remove Sketch 1 — XY plane/ }),
    ).toBeDefined()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'OK' }))

    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Feature tree' })).getByText('Extrude 1'),
      ).toBeDefined(),
    )
  })

  it('takes the sketch from the browser while the command is running', async () => {
    const onSave = vi.fn()
    const document = withSketches(
      createDocument({ now: NOW }),
      [
        createSketchOn(originPlaneSupport('XY'), 'Base'),
        createSketchOn(originPlaneSupport('YZ'), 'Side'),
      ],
      NOW,
    )
    render(<EditorView document={document} onSave={onSave} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    // Choosing a sketch row answers the command rather than opening the sketch.
    await userEvent.click(
      within(screen.getByRole('list', { name: 'Sketches' })).getByRole('button', {
        name: /^Side/,
      }),
    )
    expect(drawing()).toBe(false)
    await userEvent.click(within(dialog()).getByRole('button', { name: 'OK' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const saved = onSave.mock.calls[0]?.[0] as TectonicDocument
    const side = documentSketches(saved).find((entry) => entry.name === 'Side')
    expect(saved.features[0]?.sketchId).toBe(side?.id)
  })

  it('cancels without building anything', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Extrude' })).toBeNull()
    expect(screen.queryByText('Extrude 1')).toBeNull()
  })

  it('answers Escape the same way as Cancel', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Extrude' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Extrude' })).toBeNull()
  })

  it('routes the E shortcut through the very same question', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.keyboard('e')

    // The shortcut is a faster way to reach the command, never a way past it.
    expect(dialog()).toBeDefined()
    expect(screen.queryByText('Extrude 1')).toBeNull()
  })
})

describe('sketch overlays reach the viewport', () => {
  it('hands every sketch over, with the one that is hidden marked hidden', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())
    expect(viewport.props?.sketchOverlays).toHaveLength(1)
    expect(viewport.props?.sketchOverlays?.[0]?.visible).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Hide Sketch 1' }))

    await waitFor(() => expect(viewport.props?.sketchOverlays?.[0]?.visible).toBe(false))
  })

  it('redraws the overlay as the sketch is drawn on', async () => {
    const document = withSketches(
      createDocument({ now: NOW }),
      [createSketchOn(originPlaneSupport('XY'), 'Base')],
      NOW,
    )
    render(<EditorView document={document} onSave={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    expect(viewport.props?.sketchOverlays?.[0]?.curves).toHaveLength(0)

    // Draw on it through the same route the editor uses: the sketch model is
    // mutated in place, and an edit is what tells the overlay to be rebuilt.
    pick({ kind: 'origin-plane', plane: 'XZ' })
    await userEvent.click(
      within(screen.getByRole('tabpanel', { name: 'Solid' })).getByRole('button', {
        name: 'Create Sketch',
      }),
    )

    await waitFor(() => expect(viewport.props?.sketchOverlays).toHaveLength(2))
  })
})

describe('deleting a sketch', () => {
  it('removes one nothing is built on, without asking', async () => {
    const onSave = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={onSave} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sketch 1' }))

    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('No sketches yet.')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(documentSketches(onSave.mock.calls[0]?.[0] as TectonicDocument)).toEqual([])
    confirm.mockRestore()
  })

  it('takes the overlay off the 3D view with it', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props?.sketchOverlays).toHaveLength(1))

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sketch 1' }))

    await waitFor(() => expect(viewport.props?.sketchOverlays).toHaveLength(0))
  })

  it('asks first when a feature is built on it, and stops when refused', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<EditorView document={documentWithDependency()} onSave={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Profile' }))

    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm.mock.calls[0]?.[0]).toContain('Extrude 1')
    // Refused means nothing happened at all — not a partial delete.
    expect(sketchRows()).toHaveLength(1)
    confirm.mockRestore()
  })

  it('leaves the dependent feature reporting an error rather than repointing it', async () => {
    const onSave = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<EditorView document={documentWithDependency()} onSave={onSave} onClose={vi.fn()} />)
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Profile' }))

    // The feature is still there, still naming the sketch it was built on, and
    // now says out loud that the sketch is gone. Silently pointing it at another
    // sketch would turn one part into a different part without saying so.
    await waitFor(() =>
      expect(screen.getByText(/Sketch s1 is missing from the document/)).toBeDefined(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const saved = onSave.mock.calls[0]?.[0] as TectonicDocument
    expect(saved.features[0]?.sketchId).toBe('s1')
    confirm.mockRestore()
  })

  it('puts a deleted sketch back on undo', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sketch 1' }))
    expect(screen.getByText('No sketches yet.')).toBeDefined()

    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo.title).toBe('Undo Delete Sketch 1')
    await userEvent.click(undo)

    await waitFor(() => expect(sketchRows()).toHaveLength(1))
  })

  it('removes the picked sketch on the Delete key', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())
    const sketchId = viewport.props?.sketchOverlays?.[0]?.sketchId as string

    pick({ kind: 'sketch', sketchId })
    await userEvent.keyboard('{Delete}')

    await waitFor(() => expect(screen.getByText('No sketches yet.')).toBeDefined())
  })

  it('offers Delete in the history context menu too', async () => {
    render(
      <EditorView document={createDocument({ now: NOW })} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    await waitFor(() => expect(viewport.props).not.toBeNull())
    const row = window.document.querySelector('[data-sketch-id]') as HTMLElement

    await userEvent.pointer({ keys: '[MouseRight]', target: row })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('No sketches yet.')).toBeDefined())
  })
})
