import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createFeature } from '../../src/features/domain/factory'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { FeatureTree } from '../../src/features/FeatureTree'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { TimelineBar } from '../../src/ui/TimelineBar'

const sketch = (id: string, name: string): SketchModel => new SketchModel({ id, name })
const extrude = (id: string, name: string, sketchId: string | null) =>
  createFeature(FeatureType.Extrude, { id, name, sketchId })

function build() {
  return {
    tree: new FeatureTree([extrude('f1', 'Extrude 1', 's1'), extrude('f2', 'Extrude 2', 's2')]),
    sketches: [sketch('s1', 'Sketch 1'), sketch('s2', 'Sketch 2')],
  }
}

function renderBar(overrides: Partial<Parameters<typeof TimelineBar>[0]> = {}) {
  const { tree, sketches } = build()
  const spies = { onSelectFeature: vi.fn(), onSelectSketch: vi.fn(), onToggleCollapsed: vi.fn() }
  const result = render(
    <TimelineBar
      tree={tree}
      sketches={sketches}
      selectedFeatureId={null}
      selectedSketchId={null}
      onSelectFeature={spies.onSelectFeature}
      onSelectSketch={spies.onSelectSketch}
      collapsed={false}
      onToggleCollapsed={spies.onToggleCollapsed}
      {...overrides}
    />,
  )
  return { ...result, tree, sketches, spies }
}

const steps = (): string[] =>
  within(screen.getByRole('list', { name: 'Timeline' }))
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent ?? '')

describe('the timeline strip', () => {
  it('reads left to right in the order things were made', () => {
    renderBar()

    expect(steps()).toEqual(['Sketch 1', 'Extrude 1', 'Sketch 2', 'Extrude 2'])
  })

  it('names every step, so an icon-only strip is still readable', () => {
    renderBar()

    // The label is visually hidden but present: a row of glyphs with no names
    // is unusable without a pointer and a tooltip.
    expect(screen.getByRole('button', { name: 'Extrude 2' })).toBeDefined()
  })

  it('opens a feature and a sketch from their step', async () => {
    const { spies } = renderBar()

    await userEvent.click(screen.getByRole('button', { name: 'Extrude 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sketch 2' }))

    expect(spies.onSelectFeature).toHaveBeenCalledWith('f1')
    expect(spies.onSelectSketch).toHaveBeenCalledWith('s2')
  })

  it('marks the step that is selected, and only that one', () => {
    renderBar({ selectedFeatureId: 'f2' })

    expect(screen.getByRole('button', { name: 'Extrude 2' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Extrude 1' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('marks the steps the roll bar has rolled back past', () => {
    const { tree, rerender, sketches, spies } = renderBar()
    tree.moveRollBar(1)
    rerender(
      <TimelineBar
        tree={tree}
        sketches={sketches}
        selectedFeatureId={null}
        selectedSketchId={null}
        onSelectFeature={spies.onSelectFeature}
        onSelectSketch={spies.onSelectSketch}
        collapsed={false}
        onToggleCollapsed={spies.onToggleCollapsed}
      />,
    )

    const rolled = screen.getByRole('button', { name: 'Extrude 2' })
    expect(rolled.className).toContain('timeline__step--rolled-back')
    expect(screen.getByRole('button', { name: 'Extrude 1' }).className).not.toContain(
      'rolled-back',
    )
  })

  it('collapses to a count, and says which way the toggle goes', async () => {
    const { spies } = renderBar({ collapsed: true })

    expect(screen.queryByRole('list', { name: 'Timeline' })).toBeNull()
    expect(screen.getByText('4 steps')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Expand the timeline' }))
    expect(spies.onToggleCollapsed).toHaveBeenCalled()
  })

  it('says so when nothing has been modelled', () => {
    render(
      <TimelineBar
        tree={new FeatureTree()}
        sketches={[]}
        selectedFeatureId={null}
        selectedSketchId={null}
        onSelectFeature={vi.fn()}
        onSelectSketch={vi.fn()}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    )

    expect(screen.getByText('Nothing modelled yet.')).toBeDefined()
  })
})
