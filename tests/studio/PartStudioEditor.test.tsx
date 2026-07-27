import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartStudio, StudioPart } from '../../src/studio/PartStudio'
import { PartStudioEditor, describeUsers } from '../../src/studio/PartStudioEditor'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import { rectangleSketch } from '../features/support'

function studio(): PartStudio {
  const instance = new PartStudio({ name: 'Housing' })
  instance.addSketch(rectangleSketch(20, 10, { id: 'profile', name: 'Profile' }))
  instance.createSketch({ id: 'spare', name: 'Spare' })
  instance.addPart(new StudioPart({ id: 'bracket', name: 'Bracket', color: '#ff0000' }))
  instance.addPart(new StudioPart({ id: 'cover', name: 'Cover' }))

  instance.addFeature(
    'bracket',
    createFeature(FeatureType.Extrude, { id: 'bracket-extrude', name: 'Extrude 1', sketchId: 'profile' }),
  )
  instance.addFeature(
    'bracket',
    createFeature(FeatureType.Fillet, { id: 'bracket-fillet', name: 'Fillet 1' }),
  )
  instance.addFeature(
    'cover',
    createFeature(FeatureType.Extrude, { id: 'cover-extrude', name: 'Extrude 2', sketchId: 'profile' }),
  )
  return instance
}

describe('PartStudioEditor', () => {
  it('lists every part with its feature count', () => {
    render(<PartStudioEditor studio={studio()} />)

    const list = screen.getByRole('list', { name: 'Studio parts' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Parts (2)' })).toBeTruthy()
    expect(within(list).getByText('Bracket')).toBeTruthy()
  })

  it('lists the shared sketch pool with plane and users', () => {
    render(<PartStudioEditor studio={studio()} />)

    const list = screen.getByRole('list', { name: 'Studio sketches' })
    const rows = within(list).getAllByRole('listitem')

    expect(rows[0]?.getAttribute('data-users')).toBe('2')
    expect(within(rows[0] as HTMLElement).getByText('shared')).toBeTruthy()
    expect(within(rows[0] as HTMLElement).getByText('Bracket, Cover')).toBeTruthy()
    expect(rows[1]?.className).toContain('studio-sketch--unused')
    expect(within(rows[1] as HTMLElement).getByText('unused')).toBeTruthy()
  })

  it('says so when the studio is empty', () => {
    render(<PartStudioEditor studio={new PartStudio()} />)

    expect(screen.getByText('This studio has no parts yet.')).toBeTruthy()
    expect(screen.getByText('This studio has no sketches yet.')).toBeTruthy()
  })

  it('reports selections back to the caller', async () => {
    const onSelectPart = vi.fn()
    const onSelectSketch = vi.fn()
    render(
      <PartStudioEditor
        studio={studio()}
        onSelectPart={onSelectPart}
        onSelectSketch={onSelectSketch}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cover' }))
    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))

    expect(onSelectPart).toHaveBeenCalledWith('cover')
    expect(onSelectSketch).toHaveBeenCalledWith('profile')
  })

  it('clears the sketch selection when the selected sketch is clicked again', async () => {
    const onSelectSketch = vi.fn()
    render(
      <PartStudioEditor studio={studio()} selectedSketchId="profile" onSelectSketch={onSelectSketch} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))

    expect(onSelectSketch).toHaveBeenCalledWith(null)
  })

  it('expands the selected part into its own feature tree', () => {
    render(<PartStudioEditor studio={studio()} selectedPartId="bracket" />)

    const tree = screen.getByRole('list', { name: 'Bracket features' })
    const features = within(tree).getAllByRole('listitem')

    expect(features).toHaveLength(2)
    expect(within(features[0] as HTMLElement).getByText('↳ Profile')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Cover features' })).toBeNull()
  })

  it('marks the sketches the selected part reads', () => {
    render(<PartStudioEditor studio={studio()} selectedPartId="bracket" />)

    const rows = within(screen.getByRole('list', { name: 'Studio sketches' })).getAllByRole(
      'listitem',
    )

    expect(rows[0]?.className).toContain('studio-sketch--highlighted')
    expect(rows[1]?.className).not.toContain('studio-sketch--highlighted')
  })

  it('highlights every part and feature that reads the selected sketch', () => {
    const { container } = render(
      <PartStudioEditor studio={studio()} selectedPartId="bracket" selectedSketchId="profile" />,
    )

    const parts = [...container.querySelectorAll('.studio-part')]
    expect(parts).toHaveLength(2)
    expect(parts.every((part) => part.className.includes('studio-part--highlighted'))).toBe(true)

    const features = within(screen.getByRole('list', { name: 'Bracket features' })).getAllByRole(
      'listitem',
    )
    expect(features[0]?.className).toContain('studio-feature--highlighted')
    expect(features[1]?.className).not.toContain('studio-feature--highlighted')
  })

  it('previews the same highlight while a sketch is merely hovered', async () => {
    render(<PartStudioEditor studio={studio()} />)

    const sketchRow = within(screen.getByRole('list', { name: 'Studio sketches' })).getAllByRole(
      'listitem',
    )[1] as HTMLElement
    await userEvent.hover(sketchRow)

    const parts = within(screen.getByRole('list', { name: 'Studio parts' })).getAllByRole(
      'listitem',
    )
    expect(parts.some((part) => part.className.includes('studio-part--highlighted'))).toBe(false)

    const shared = within(screen.getByRole('list', { name: 'Studio sketches' })).getAllByRole(
      'listitem',
    )[0] as HTMLElement
    await userEvent.hover(shared)

    expect(
      within(screen.getByRole('list', { name: 'Studio parts' }))
        .getAllByRole('listitem')
        .every((part) => part.className.includes('studio-part--highlighted')),
    ).toBe(true)

    await userEvent.unhover(shared)
    expect(
      within(screen.getByRole('list', { name: 'Studio parts' }))
        .getAllByRole('listitem')
        .some((part) => part.className.includes('studio-part--highlighted')),
    ).toBe(false)
  })

  it('toggles visibility through the eye button', async () => {
    const onToggleVisibility = vi.fn()
    render(<PartStudioEditor studio={studio()} onToggleVisibility={onToggleVisibility} />)

    await userEvent.click(screen.getByRole('button', { name: 'Hide Bracket' }))

    expect(onToggleVisibility).toHaveBeenCalledWith('bracket', false)
  })

  it('offers to show a hidden part and dims its row', () => {
    const instance = studio()
    instance.setPartVisible('cover', false)
    render(<PartStudioEditor studio={instance} />)

    expect(screen.getByRole('button', { name: 'Show Cover' })).toBeTruthy()
    const rows = within(screen.getByRole('list', { name: 'Studio parts' })).getAllByRole('listitem')
    expect(rows[1]?.className).toContain('studio-part--hidden')
    expect(rows[1]?.getAttribute('data-visible')).toBe('false')
  })

  it('isolates a part on a double click', async () => {
    const onIsolatePart = vi.fn()
    render(<PartStudioEditor studio={studio()} onIsolatePart={onIsolatePart} />)

    await userEvent.dblClick(screen.getByRole('button', { name: 'Bracket' }))

    expect(onIsolatePart).toHaveBeenCalledWith('bracket')
  })

  it('hides the actions the caller has no handler for', () => {
    render(<PartStudioEditor studio={studio()} />)

    expect(screen.queryByRole('button', { name: 'New part' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New sketch' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull()
  })

  it('runs the header actions', async () => {
    const onAddPart = vi.fn()
    const onAddSketch = vi.fn()
    const onShowAll = vi.fn()
    render(
      <PartStudioEditor
        studio={studio()}
        onAddPart={onAddPart}
        onAddSketch={onAddSketch}
        onShowAll={onShowAll}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New part' }))
    await userEvent.click(screen.getByRole('button', { name: 'New sketch' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))

    expect(onAddPart).toHaveBeenCalledOnce()
    expect(onAddSketch).toHaveBeenCalledOnce()
    expect(onShowAll).toHaveBeenCalledOnce()
  })

  it('reports a feature selection with the part it belongs to', async () => {
    const onSelectFeature = vi.fn()
    render(
      <PartStudioEditor studio={studio()} selectedPartId="cover" onSelectFeature={onSelectFeature} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Extrude 2' }))

    expect(onSelectFeature).toHaveBeenCalledWith('cover', 'cover-extrude')
  })

  it('marks rolled-back, suppressed and failed features', () => {
    const instance = studio()
    const bracket = instance.requirePart('bracket')
    bracket.tree.suppressFeature('bracket-fillet')
    bracket.tree.requireFeature('bracket-extrude').markError('bad profile')
    bracket.tree.moveRollBar(1)
    render(<PartStudioEditor studio={instance} selectedPartId="bracket" />)

    const features = within(screen.getByRole('list', { name: 'Bracket features' })).getAllByRole(
      'listitem',
    )

    expect(features[0]?.className).toContain('studio-feature--error')
    expect(features[1]?.className).toContain('studio-feature--suppressed')
    expect(features[1]?.className).toContain('studio-feature--rolled-back')
  })

  it('calls out a feature pointing at a sketch the studio lost', () => {
    const instance = studio()
    instance.removeSketch('profile', true)
    instance.requirePart('bracket').tree.requireFeature('bracket-extrude').sketchId = 'gone'
    render(<PartStudioEditor studio={instance} selectedPartId="bracket" />)

    expect(screen.getByText('↳ missing sketch')).toBeTruthy()
  })

  it('shows the colour swatch only for parts that have one', () => {
    const { container } = render(<PartStudioEditor studio={studio()} />)

    expect(container.querySelectorAll('.studio-part__swatch')).toHaveLength(1)
  })
})

describe('describeUsers', () => {
  it('names the parts, or says the sketch is unused', () => {
    expect(describeUsers([])).toBe('unused')
    expect(describeUsers(['Bracket'])).toBe('Bracket')
    expect(describeUsers(['Bracket', 'Cover'])).toBe('Bracket, Cover')
  })
})
