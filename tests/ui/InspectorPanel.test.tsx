import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDocument } from '../../src/domain/Document'
import { createFeature } from '../../src/features/domain/factory'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { originPlaneSupport } from '../../src/sketch/domain/SketchSupport'
import { InspectorPanel } from '../../src/ui/InspectorPanel'
import type { InspectorPanelProps } from '../../src/ui/InspectorPanel'

const NOW = '2026-07-26T12:00:00.000Z'

function props(overrides: Partial<InspectorPanelProps> = {}): InspectorPanelProps {
  return {
    document: createDocument({ name: 'Bracket', now: NOW }),
    stats: { parts: 1, bodies: 2, triangles: 24 },
    backend: 'stub',
    missingCapabilities: [],
    kernelFallbacks: [],
    feature: null,
    computed: [],
    onParameterChange: vi.fn(),
    activePickKey: null,
    onPickKindChange: vi.fn(),
    selection: [],
    onSelectionChange: vi.fn(),
    bodyName: () => undefined,
    sketchName: () => undefined,
    canCreateSketch: false,
    createSketchHint: 'Select an origin plane or a planar face first',
    onCreateSketch: vi.fn(),
    sketch: null,
    drawing: false,
    onOpenSketch: vi.fn(),
    onToggleSketchVisibility: vi.fn(),
    onDeleteSketch: vi.fn(),
    ...overrides,
  }
}

const fillet = () => createFeature(FeatureType.Fillet, { id: 'f1', name: 'Fillet 1' })
const sketch = () =>
  new SketchModel({ id: 's1', name: 'Sketch 1', support: originPlaneSupport('XZ') })

const activeTab = (): string | null =>
  screen.getByRole('tab', { selected: true }).textContent

describe('the inspector', () => {
  it('offers the four things worth inspecting', () => {
    render(<InspectorPanel {...props()} />)

    for (const tab of ['Selection', 'Feature', 'Sketch', 'Document']) {
      expect(screen.getByRole('tab', { name: tab })).toBeDefined()
    }
  })

  it('opens on the document when nothing else is going on', () => {
    render(<InspectorPanel {...props()} />)

    expect(activeTab()).toBe('Document')
    expect(screen.getByText('Bracket')).toBeDefined()
    expect(screen.getByText('24')).toBeDefined()
  })

  it('follows the work: a selected feature brings its parameters up', () => {
    render(<InspectorPanel {...props({ feature: fillet() })} />)

    expect(activeTab()).toBe('Feature')
    expect(screen.getByText('Fillet 1')).toBeDefined()
  })

  it('follows the work: an open sketch brings the sketch up', () => {
    render(<InspectorPanel {...props({ sketch: sketch(), drawing: true })} />)

    expect(activeTab()).toBe('Sketch')
    expect(screen.getByText('XZ plane')).toBeDefined()
  })

  it('honours a tab the user chose by hand', async () => {
    render(<InspectorPanel {...props({ feature: fillet() })} />)

    await userEvent.click(screen.getByRole('tab', { name: 'Document' }))

    expect(activeTab()).toBe('Document')
  })

  it('goes back to following the work when the context changes', async () => {
    const { rerender } = render(<InspectorPanel {...props({ feature: fillet() })} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Document' }))
    expect(activeTab()).toBe('Document')

    // A different thing happened, so the manual choice is retired rather than
    // holding the panel on a tab the user has finished with.
    rerender(<InspectorPanel {...props({ feature: null, sketch: sketch(), drawing: true })} />)

    expect(activeTab()).toBe('Sketch')
  })
})

describe('the selection tab', () => {
  it('says what to do rather than just "nothing"', async () => {
    render(<InspectorPanel {...props()} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Selection' }))

    expect(screen.getByText(/Click an origin plane, a face, an edge, a sketch or a body/)).toBeDefined()
  })

  /**
   * The explicit half of "a click no longer creates a sketch". The command is
   * always on screen while something is picked, so the pick-then-command shape
   * of the workflow is visible rather than something to be discovered.
   */
  it('offers Create Sketch, blocked and explained, when the pick cannot carry one', async () => {
    render(
      <InspectorPanel
        {...props({
          selection: [{ kind: 'edge', bodyId: 'b1', edgeId: 'edge-2' }],
          canCreateSketch: false,
          createSketchHint: 'A sketch needs an origin plane or a planar face to sit on',
        })}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Selection' }))

    const create = screen.getByRole('button', { name: 'Create Sketch' })
    expect(create.hasAttribute('disabled')).toBe(true)
    expect(create.title).toBe('A sketch needs an origin plane or a planar face to sit on')
  })

  it('runs Create Sketch when the pick is a plane, and never on its own', async () => {
    const onCreateSketch = vi.fn()
    render(
      <InspectorPanel
        {...props({
          selection: [{ kind: 'origin-plane', plane: 'XZ' }],
          canCreateSketch: true,
          createSketchHint: 'Start a sketch on the XZ plane',
          onCreateSketch,
        })}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Selection' }))

    // Selecting alone did nothing; pressing the command is what acts.
    expect(onCreateSketch).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Create Sketch' }))
    expect(onCreateSketch).toHaveBeenCalledOnce()
  })

  it('names a picked sketch rather than showing its identifier', async () => {
    render(
      <InspectorPanel
        {...props({
          selection: [{ kind: 'sketch', sketchId: 's1' }],
          sketchName: (id) => (id === 's1' ? 'Base profile' : undefined),
        })}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Selection' }))

    expect(screen.getByText('Base profile')).toBeDefined()
  })

  it('lists what is picked, by name rather than by identifier', () => {
    render(
      <InspectorPanel
        {...props({
          selection: [{ kind: 'face', bodyId: 'b1', faceId: 'face-0' }],
          bodyName: (id) => (id === 'b1' ? 'Base' : undefined),
        })}
      />,
    )

    expect(activeTab()).toBe('Selection')
    const chips = screen.getByRole('list', { name: 'Picked geometry' })
    expect(chips.textContent).toContain('Base')
    expect(chips.textContent).not.toContain('b1')
  })

  it('takes one pick back out, and clears the lot', async () => {
    const onSelectionChange = vi.fn()
    const selection = [
      { kind: 'body' as const, bodyId: 'b1' },
      { kind: 'body' as const, bodyId: 'b2' },
    ]
    render(<InspectorPanel {...props({ selection, onSelectionChange })} />)

    await userEvent.click(screen.getAllByRole('button', { name: /^Remove/ })[0] as HTMLElement)
    expect(onSelectionChange).toHaveBeenLastCalledWith([selection[1]])

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([])
  })
})

describe('the feature tab', () => {
  it('says nothing is selected rather than showing an empty form', async () => {
    render(<InspectorPanel {...props()} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Feature' }))

    expect(screen.getByText(/No feature is selected/)).toBeDefined()
  })

  it('edits a parameter of the selected feature', async () => {
    const onParameterChange = vi.fn()
    render(<InspectorPanel {...props({ feature: fillet(), onParameterChange })} />)

    // The field is controlled by the feature, which a spy does not update, so
    // typing one digit onto the standing value is what a real edit looks like
    // here: 3 becomes 34, and that is the change the editor is told about.
    await userEvent.type(screen.getByLabelText('Radius (mm)'), '4')

    expect(onParameterChange).toHaveBeenLastCalledWith('f1', { radius: 34 })
  })
})

describe('the sketch tab', () => {
  it('says how to start one when none is open', async () => {
    render(<InspectorPanel {...props()} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Sketch' }))

    expect(screen.getByText(/Click an origin plane or a planar face/)).toBeDefined()
  })

  it('offers the way into a sketch that is not open, and never a second way out', async () => {
    const onOpenSketch = vi.fn()
    render(<InspectorPanel {...props({ sketch: sketch(), drawing: false, onOpenSketch })} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Sketch' }))

    await userEvent.click(screen.getByRole('button', { name: 'Edit Sketch' }))
    expect(onOpenSketch).toHaveBeenCalledWith('s1')

    // Finishing belongs to the ribbon, which carries it as its one accented
    // action. Two buttons with the same name is two decisions where there is one.
    expect(screen.queryByRole('button', { name: 'Finish Sketch' })).toBeNull()
  })

  it('offers Delete Sketch alongside Edit, so a sketch can be taken back out', async () => {
    const onDeleteSketch = vi.fn()
    render(<InspectorPanel {...props({ sketch: sketch(), drawing: false, onDeleteSketch })} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Sketch' }))

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sketch' }))
    expect(onDeleteSketch).toHaveBeenCalledWith('s1')
  })

  it('shows and hides the sketch from its own heading', async () => {
    const onToggleSketchVisibility = vi.fn()
    render(<InspectorPanel {...props({ sketch: sketch(), onToggleSketchVisibility })} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Sketch' }))

    await userEvent.click(screen.getByRole('button', { name: 'Hide Sketch 1' }))

    expect(onToggleSketchVisibility).toHaveBeenCalledWith('s1')
  })
})

describe('the document tab', () => {
  it('names the backend the geometry came out of', () => {
    render(<InspectorPanel {...props({ backend: 'opencascade' })} />)

    expect(screen.getByText('opencascade')).toBeDefined()
  })

  it('says what the backend cannot do, rather than leaving it to be discovered', () => {
    render(<InspectorPanel {...props({ missingCapabilities: ['fillet', 'shell'] })} />)

    expect(screen.getByText(/cannot fillet, shell/)).toBeDefined()
  })

  it('reports which backends could not be loaded', () => {
    render(<InspectorPanel {...props({ kernelFallbacks: ['rust: binary missing'] })} />)

    expect(screen.getByText('rust: binary missing')).toBeDefined()
  })
})
