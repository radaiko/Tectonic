import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeaturePropertiesPanel } from '../../src/ui/FeaturePropertiesPanel'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import type { SelectionItem } from '../../src/view/selection'

const EDGE_A: SelectionItem = { kind: 'edge', bodyId: 'body-1', edgeId: 'edge-0' }
const EDGE_B: SelectionItem = { kind: 'edge', bodyId: 'body-1', edgeId: 'edge-4' }

function fillet(edgeIds: readonly string[] = []) {
  return createFeature(FeatureType.Fillet, {
    id: 'fillet-1',
    name: 'Fillet 1',
    parameters: { radius: 2, edgeIds: [...edgeIds] },
  })
}

describe('a parameter that names geometry', () => {
  it('is picked in the viewport rather than typed', () => {
    render(<FeaturePropertiesPanel feature={fillet()} />)

    // The old free-text box asked the user to know that the edge they wanted was
    // called `edge-4`, which is not something anyone can be expected to know.
    expect(screen.queryByLabelText('Edges')).toBeNull()
    expect(screen.getByRole('button', { name: 'Pick edges' })).toBeDefined()
  })

  it('says plainly what an empty selection means for the build', () => {
    render(<FeaturePropertiesPanel feature={fillet()} />)

    expect(screen.getByText(/every edge of the target is used/)).toBeDefined()
  })

  it('arms the field, and tells the editor what it wants', async () => {
    const onPickKindChange = vi.fn()
    render(<FeaturePropertiesPanel feature={fillet()} onPickKindChange={onPickKindChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Pick edges' }))

    expect(onPickKindChange).toHaveBeenCalledWith('edge')
  })

  it('reads as armed while it is the field taking picks', () => {
    render(<FeaturePropertiesPanel feature={fillet()} activePickKey="edgeIds" />)

    expect(screen.getByRole('button', { name: 'Picking edges…' }).ariaPressed).toBe('true')
  })

  it('disarms on a second press', async () => {
    const onPickKindChange = vi.fn()
    render(
      <FeaturePropertiesPanel
        feature={fillet()}
        activePickKey="edgeIds"
        onPickKindChange={onPickKindChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Picking edges…' }))

    expect(onPickKindChange).toHaveBeenCalledWith(null)
  })

  it('offers nothing to add until something of the right kind is picked', () => {
    render(<FeaturePropertiesPanel feature={fillet()} selection={[]} />)

    expect(screen.getByRole('button', { name: 'No new edge picked' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('adds what is picked to the parameter', async () => {
    const onChange = vi.fn()
    render(
      <FeaturePropertiesPanel
        feature={fillet()}
        selection={[EDGE_A, EDGE_B]}
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add 2 edges' }))

    expect(onChange).toHaveBeenCalledWith('fillet-1', { edgeIds: ['edge-0', 'edge-4'] })
  })

  it('ignores what is already in the parameter rather than doubling it', () => {
    render(<FeaturePropertiesPanel feature={fillet(['edge-0'])} selection={[EDGE_A, EDGE_B]} />)

    expect(screen.getByRole('button', { name: 'Add 1 edge' })).toBeDefined()
  })

  it('ignores a selection of the wrong kind', () => {
    render(
      <FeaturePropertiesPanel
        feature={fillet()}
        selection={[{ kind: 'face', bodyId: 'body-1', faceId: 'face-0' }]}
      />,
    )

    expect(screen.getByRole('button', { name: 'No new edge picked' })).toBeDefined()
  })

  it('shows each reference as a chip that can be dropped', async () => {
    const onChange = vi.fn()
    render(<FeaturePropertiesPanel feature={fillet(['edge-0', 'edge-4'])} onChange={onChange} />)

    const chips = screen.getByRole('list', { name: 'Edges' })
    expect(within(chips).getAllByRole('button')).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Remove edge-0 from Edges' }))

    expect(onChange).toHaveBeenCalledWith('fillet-1', { edgeIds: ['edge-4'] })
  })

  it('clears the whole list in one press', async () => {
    const onChange = vi.fn()
    render(<FeaturePropertiesPanel feature={fillet(['edge-0', 'edge-4'])} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith('fillet-1', { edgeIds: [] })
  })

  it('stores a single reference as a bare id, not a list', async () => {
    const onChange = vi.fn()
    const unfold = createFeature(FeatureType.Unfold, { id: 'unfold-1', parameters: {} })
    render(
      <FeaturePropertiesPanel
        feature={unfold}
        selection={[{ kind: 'body', bodyId: 'body-2' }]}
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add 1 body' }))

    expect(onChange).toHaveBeenCalledWith('unfold-1', { targetBodyId: 'body-2' })
  })
})

describe('the rest of the properties panel', () => {
  it('still edits plain numbers in place', async () => {
    const onChange = vi.fn()
    render(<FeaturePropertiesPanel feature={fillet()} onChange={onChange} />)

    await userEvent.clear(screen.getByLabelText('Radius (mm)'))

    expect(onChange).toHaveBeenCalled()
  })

  it('says what a rebuild made of the feature', () => {
    render(
      <FeaturePropertiesPanel
        feature={fillet()}
        computed={[{ label: 'Bodies', value: '1' }]}
      />,
    )

    // Scoped to the read-only block: "Bodies" is also the label of the field
    // that picks which bodies the fillet applies to.
    const results = screen.getByRole('heading', { name: 'Result' }).nextElementSibling
    expect(within(results as HTMLElement).getByText('Bodies')).toBeDefined()
    expect(within(results as HTMLElement).getByText('1')).toBeDefined()
  })

  it('shows the failure when the last rebuild could not build it', () => {
    const broken = fillet()
    broken.markError('The "stub" backend cannot fillet')

    render(<FeaturePropertiesPanel feature={broken} />)

    expect(screen.getByRole('alert').textContent).toMatch(/cannot fillet/)
  })

  it('asks for a selection when there is no feature', () => {
    render(<FeaturePropertiesPanel feature={null} />)

    expect(screen.getByText('Select a feature to edit its parameters.')).toBeDefined()
  })

  it('pluralises the kind a field picks the way English does', () => {
    render(<FeaturePropertiesPanel feature={fillet()} />)

    // A bare "s" gave "Pick bodys", which reads as a typo because it is one.
    expect(screen.getByRole('button', { name: 'Pick bodies' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Pick bodys' })).toBeNull()
  })

  it('counts a single addition in the singular', async () => {
    const onChange = vi.fn()
    render(
      <FeaturePropertiesPanel feature={fillet()} selection={[EDGE_A]} onChange={onChange} />,
    )

    expect(screen.getByRole('button', { name: 'Add 1 edge' })).toBeDefined()
  })
})
