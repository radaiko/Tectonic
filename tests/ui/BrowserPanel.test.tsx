import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Body } from '../../src/domain/Document'
import { createFeature } from '../../src/features/domain/factory'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { FeatureTree } from '../../src/features/FeatureTree'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { ORIGIN_PLANES, originPlaneSupport } from '../../src/sketch/domain/SketchSupport'
import { BrowserPanel } from '../../src/ui/BrowserPanel'
import { createSectionState } from '../../src/view/section'
import { boxMesh } from '../helpers/meshes'

const body = (id: string, name: string): Body => ({ id, name, mesh: boxMesh() })

function handlers() {
  return {
    onNewSketch: vi.fn(),
    onSelectSketch: vi.fn(),
    onToggleSketchVisibility: vi.fn(),
    onDeleteSketch: vi.fn(),
    onFaceTargetChange: vi.fn(),
    onAddFaceSketch: vi.fn(),
    onToggleBodyVisibility: vi.fn(),
    onIsolate: vi.fn(),
    onShowAll: vi.fn(),
    onSelectFeature: vi.fn(),
    onSelectionChange: vi.fn(),
  }
}

interface Overrides {
  readonly hiddenIds?: ReadonlySet<string>
  readonly faceGroups?: Parameters<typeof BrowserPanel>[0]['sketches']['faceGroups']
  readonly faceTarget?: string
  readonly section?: Parameters<typeof BrowserPanel>[0]['section']
}

function renderBrowser(overrides: Overrides = {}) {
  const spies = handlers()
  const sketch = new SketchModel({ id: 's1', name: 'Sketch 1', support: originPlaneSupport('XY') })
  const tree = new FeatureTree([
    createFeature(FeatureType.Extrude, { id: 'f1', name: 'Extrude 1', sketchId: 's1' }),
  ])

  const result = render(
    <BrowserPanel
      document={{ name: 'Bracket', parts: [] }}
      origin={{ planes: ORIGIN_PLANES, activePlane: 'XY', onNewSketch: spies.onNewSketch }}
      sketches={{
        sketches: [sketch],
        selectedId: 's1',
        onSelect: spies.onSelectSketch,
        onToggleVisibility: spies.onToggleSketchVisibility,
        onDelete: spies.onDeleteSketch,
        faceGroups: overrides.faceGroups ?? [],
        faceTarget: overrides.faceTarget ?? '',
        onFaceTargetChange: spies.onFaceTargetChange,
        onAddFaceSketch: spies.onAddFaceSketch,
      }}
      bodies={{
        bodies: [body('b1', 'Base'), body('b2', 'Boss')],
        ownerByBody: new Map([
          ['b1', 'f1'],
          ['b2', 'f1'],
        ]),
        featureName: (id) => (id === 'f1' ? 'Extrude 1' : undefined),
        hiddenIds: overrides.hiddenIds ?? new Set<string>(),
        onToggleVisibility: spies.onToggleBodyVisibility,
        onIsolate: spies.onIsolate,
        onShowAll: spies.onShowAll,
      }}
      history={{
        tree,
        selectedFeatureId: null,
        onSelectFeature: spies.onSelectFeature,
        onRenameSketch: vi.fn(),
        onReorder: vi.fn(),
        onReorderRefused: vi.fn(),
        onToggleSuppress: vi.fn(),
        onDelete: vi.fn(),
        onRename: vi.fn(),
        onRollBarChange: vi.fn(),
      }}
      section={overrides.section ?? null}
      selection={[]}
      onSelectionChange={spies.onSelectionChange}
    />,
  )
  return { ...result, spies, sketch, tree }
}

describe('the model browser', () => {
  it('shows the document and the four things it is made of', () => {
    renderBrowser()

    expect(screen.getByRole('complementary', { name: 'Browser' })).toBeDefined()
    expect(screen.getByText('Bracket')).toBeDefined()
    for (const section of ['Origin', 'Bodies', 'Sketches', 'History']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${section}`) })).toBeDefined()
    }
  })

  it('collapses a section, and takes its contents out of the tree with it', async () => {
    renderBrowser()
    const toggle = screen.getByRole('button', { name: /^Origin/ })

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(toggle)

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'XZ' })).toBeNull()
  })

  it('starts a sketch from an origin plane', async () => {
    const { spies } = renderBrowser()

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    await userEvent.click(within(planes).getByRole('button', { name: 'XZ' }))

    expect(spies.onNewSketch).toHaveBeenCalledWith('XZ')
  })

  it('marks the plane the open sketch sits on', () => {
    renderBrowser()

    const planes = screen.getByRole('group', { name: 'New sketch on plane' })
    expect(within(planes).getByRole('button', { name: 'XY' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(planes).getByRole('button', { name: 'YZ' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('opens a sketch from the list, and says what each one sits on', async () => {
    const { spies } = renderBrowser()

    const list = screen.getByRole('list', { name: 'Sketches' })
    expect(within(list).getByText('XY plane')).toBeDefined()
    await userEvent.click(within(list).getByRole('button', { name: /^Sketch 1/ }))

    expect(spies.onSelectSketch).toHaveBeenCalledWith('s1')
  })

  it('selects a body with the item a viewport click would produce', async () => {
    const { spies } = renderBrowser()

    await userEvent.click(screen.getByRole('button', { name: /^Base/ }))

    expect(spies.onSelectionChange).toHaveBeenCalledWith([{ kind: 'body', bodyId: 'b1' }])
  })

  it('hides and isolates a body, naming which one in each control', async () => {
    const { spies } = renderBrowser()

    await userEvent.click(screen.getByRole('button', { name: 'Hide Base' }))
    await userEvent.click(screen.getByRole('button', { name: 'Isolate Boss' }))

    expect(spies.onToggleBodyVisibility).toHaveBeenCalledWith('b1')
    expect(spies.onIsolate).toHaveBeenCalledWith('b2')
  })

  it('offers Show all only once something is hidden', async () => {
    const { spies, unmount } = renderBrowser()
    expect(screen.getByRole('button', { name: 'Show all bodies' })).toHaveProperty(
      'disabled',
      true,
    )
    unmount()

    const hidden = renderBrowser({ hiddenIds: new Set(['b1']) })
    await userEvent.click(screen.getByRole('button', { name: 'Show all bodies' }))

    expect(hidden.spies.onShowAll).toHaveBeenCalled()
    expect(spies.onShowAll).not.toHaveBeenCalled()
  })

  it('says there is no face to sketch on until a solid exists', () => {
    renderBrowser()

    expect(screen.getByText(/no face to sketch on/)).toBeDefined()
    expect(screen.queryByLabelText('Face to sketch on')).toBeNull()
  })

  it('offers the faces of a built solid, and only adds one when chosen', async () => {
    const { spies } = renderBrowser({
      faceGroups: [
        {
          bodyId: 'b1',
          bodyName: 'Base',
          omitted: 0,
          faces: [{ bodyId: 'b1', faceId: 'face-0', label: 'Top face', value: 'b1::face-0' }],
        },
      ],
      faceTarget: 'b1::face-0',
    })

    expect(screen.getByLabelText('Face to sketch on')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Add face sketch' }))

    expect(spies.onAddFaceSketch).toHaveBeenCalled()
  })

  it('carries the build order, with one visibility control per sketch and no more', () => {
    renderBrowser()

    // The history section holds the ordered timeline; the Sketches section
    // groups the same sketches without a second "Hide Sketch 1" beside them.
    expect(screen.getByRole('list', { name: 'Feature tree' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Sketch 1$/ }).filter(
      (button) => button.getAttribute('aria-label')?.startsWith('Hide'),
    )).toHaveLength(1)
  })

  it('offers the section controls only once there is something to cut', async () => {
    renderBrowser({
      section: { section: createSectionState(), onChange: vi.fn(), extent: 100 },
    })

    await userEvent.click(screen.getByRole('button', { name: /^Section/ }))
    expect(screen.getByLabelText('Section mode')).toBeDefined()
  })
})
