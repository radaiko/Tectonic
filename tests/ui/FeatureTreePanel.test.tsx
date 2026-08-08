import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createFeature } from '../../src/features/domain/factory'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { FeatureTree } from '../../src/features/FeatureTree'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { faceSupport } from '../../src/sketch/domain/SketchSupport'
import { FeatureTreePanel } from '../../src/ui/FeatureTreePanel'

const sketch = (id: string, name: string): SketchModel => new SketchModel({ id, name })

const extrude = (id: string, name: string, sketchId: string | null) =>
  createFeature(FeatureType.Extrude, { id, name, sketchId })

/** Draw, build, draw, build — the order the panel has to show. */
function alternating(): { tree: FeatureTree; sketches: SketchModel[] } {
  return {
    tree: new FeatureTree([extrude('f1', 'Extrude 1', 's1'), extrude('f2', 'Extrude 2', 's2')]),
    sketches: [sketch('s1', 'Sketch 1'), sketch('s2', 'Sketch 2')],
  }
}

const rowNames = (): string[] =>
  within(screen.getByRole('list', { name: 'Feature tree' }))
    .getAllByRole('button')
    .filter((button) => button.className.includes('feature-row__name'))
    .map((button) => button.textContent ?? '')

describe('FeatureTreePanel history order', () => {
  it('shows sketches and features as one list, in the order they were made', () => {
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} />)

    expect(rowNames()).toEqual(['Sketch 1', 'Extrude 1', 'Sketch 2', 'Extrude 2'])
  })

  it('counts both kinds in its header', () => {
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} />)

    expect(screen.getByText('4')).toBeDefined()
  })

  /** The panel is still usable from anywhere that has a tree and no sketches. */
  it('is the feature-only list it always was when given no sketches', () => {
    const { tree } = alternating()
    render(<FeatureTreePanel tree={tree} />)

    expect(rowNames()).toEqual(['Extrude 1', 'Extrude 2'])
  })

  it('says so when the document holds nothing at all', () => {
    render(<FeatureTreePanel tree={new FeatureTree()} sketches={[]} />)

    expect(screen.getByText('Nothing modelled yet.')).toBeDefined()
  })

  it('shows a sketch waiting for its feature at the end', () => {
    const tree = new FeatureTree([extrude('f1', 'Extrude 1', 's1')])
    render(<FeatureTreePanel tree={tree} sketches={[sketch('s1', 'Profile'), sketch('s2', 'New')]} />)

    expect(rowNames()).toEqual(['Profile', 'Extrude 1', 'New'])
  })

  it('says what each sketch is attached to', () => {
    const attached = new SketchModel({ id: 's1', name: 'On a face', support: faceSupport('b1', 'face-2') })
    render(<FeatureTreePanel tree={new FeatureTree()} sketches={[attached]} />)

    expect(screen.getByText('Face of b1')).toBeDefined()
  })
})

describe('FeatureTreePanel sketch rows', () => {
  it('asks the caller to open a sketch that is clicked', async () => {
    const onSelectSketch = vi.fn()
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} onSelectSketch={onSelectSketch} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sketch 2' }))

    expect(onSelectSketch).toHaveBeenCalledWith('s2')
  })

  it('marks the open sketch as the selected row', () => {
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} selectedSketchId="s2" />)

    expect(screen.getByRole('button', { name: 'Sketch 2' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Sketch 1' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('offers a visibility toggle that names what it will do', async () => {
    const onToggleSketchVisibility = vi.fn()
    const shown = sketch('s1', 'Sketch 1')
    const hidden = sketch('s2', 'Sketch 2')
    hidden.visible = false
    render(
      <FeatureTreePanel
        tree={new FeatureTree()}
        sketches={[shown, hidden]}
        onToggleSketchVisibility={onToggleSketchVisibility}
      />,
    )

    expect(screen.getByRole('button', { name: 'Hide Sketch 1' })).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Show Sketch 2' }))

    expect(onToggleSketchVisibility).toHaveBeenCalledWith('s2')
  })

  /** Hidden is a display state, so the row is dimmed and never struck through. */
  it('marks a hidden sketch without marking it as removed from the model', () => {
    const hidden = sketch('s1', 'Sketch 1')
    hidden.visible = false
    render(<FeatureTreePanel tree={new FeatureTree()} sketches={[hidden]} />)

    const row = document.querySelector('[data-sketch-id="s1"]') as HTMLElement
    expect(row.className).toContain('feature-row--hidden')
    expect(row.className).not.toContain('feature-row--rolled-back')
  })

  it('renames a sketch through its menu', async () => {
    const onRenameSketch = vi.fn()
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} onRenameSketch={onRenameSketch} />)

    const row = document.querySelector('[data-sketch-id="s1"]') as HTMLElement
    await userEvent.pointer({ keys: '[MouseRight]', target: row })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))

    const field = screen.getByRole('textbox', { name: 'Rename Sketch 1' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Profile{Enter}')

    expect(onRenameSketch).toHaveBeenCalledWith('s1', 'Profile')
  })

  it('keeps a rename that was cancelled from being applied', async () => {
    const onRenameSketch = vi.fn()
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} onRenameSketch={onRenameSketch} />)

    const row = document.querySelector('[data-sketch-id="s1"]') as HTMLElement
    await userEvent.pointer({ keys: '[MouseRight]', target: row })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Rename Sketch 1' }), '{Escape}')

    expect(onRenameSketch).not.toHaveBeenCalled()
  })

  /**
   * A sketch has no build step to skip and no stored position to move, so a
   * suppress item or a drag handle would be a control that does nothing.
   */
  it('offers a sketch neither suppress nor reordering', async () => {
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} />)

    const row = document.querySelector('[data-sketch-id="s1"]') as HTMLElement
    expect(row.getAttribute('draggable')).toBeNull()

    await userEvent.pointer({ keys: '[MouseRight]', target: row })
    const menu = screen.getByRole('menu', { name: 'Sketch 1 actions' })
    expect(within(menu).queryByRole('menuitem', { name: /Suppress/ })).toBeNull()
    expect(within(menu).queryByRole('menuitem', { name: /Delete/ })).toBeNull()
    expect(within(menu).getByRole('menuitem', { name: 'Edit Sketch' })).toBeDefined()
  })
})

describe('FeatureTreePanel roll bar over a mixed history', () => {
  /**
   * Rolling back to just before a feature leaves the sketch it is built from
   * standing — that sketch is what a replay would build it out of.
   */
  it('leaves the sketch of a rolled-back feature built', () => {
    const { tree, sketches } = alternating()
    tree.moveRollBar(1)
    render(<FeatureTreePanel tree={tree} sketches={sketches} />)

    const rolledBack = (selector: string): boolean =>
      (document.querySelector(selector) as HTMLElement).className.includes(
        'feature-row--rolled-back',
      )

    expect(rolledBack('[data-sketch-id="s1"]')).toBe(false)
    expect(rolledBack('[data-feature-id="f1"]')).toBe(false)
    expect(rolledBack('[data-sketch-id="s2"]')).toBe(false)
    expect(rolledBack('[data-feature-id="f2"]')).toBe(true)
  })

  it('draws the bar between the entries it separates', () => {
    const { tree, sketches } = alternating()
    tree.moveRollBar(1)
    render(<FeatureTreePanel tree={tree} sketches={sketches} />)

    const rows = [...screen.getByRole('list', { name: 'Feature tree' }).children]
    const bar = rows.findIndex((row) => row.className.includes('feature-tree__rollbar'))

    // s1, f1, s2, then the bar, then f2.
    expect(bar).toBe(3)
    expect(rows[4]?.getAttribute('data-feature-id')).toBe('f2')
  })

  it('spans both kinds with its slider but still counts features', () => {
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} />)

    const slider = screen.getByLabelText<HTMLInputElement>('Roll bar position')
    expect(slider.max).toBe('2')
    expect(slider.value).toBe('2')
  })
})

describe('FeatureTreePanel feature rows', () => {
  it('still reorders a feature by its own index, not its place in the timeline', async () => {
    const onReorder = vi.fn()
    const { tree, sketches } = alternating()
    render(<FeatureTreePanel tree={tree} sketches={sketches} onReorder={onReorder} />)

    const first = document.querySelector('[data-feature-id="f1"]') as HTMLElement
    const second = document.querySelector('[data-feature-id="f2"]') as HTMLElement
    expect(second.getAttribute('data-index')).toBe('1')

    await userEvent.pointer({ keys: '[MouseLeft>]', target: first })
    // jsdom does not carry a drag; the handlers are driven directly.
    first.dispatchEvent(new MouseEvent('dragstart', { bubbles: true }))
    second.dispatchEvent(new MouseEvent('dragover', { bubbles: true, cancelable: true }))
    second.dispatchEvent(new MouseEvent('drop', { bubbles: true, cancelable: true }))

    expect(onReorder).toHaveBeenCalledWith('f1', 1)
  })

  it('still selects a feature and suppresses it through its menu', async () => {
    const onSelect = vi.fn()
    const onToggleSuppress = vi.fn()
    const { tree, sketches } = alternating()
    render(
      <FeatureTreePanel
        tree={tree}
        sketches={sketches}
        onSelect={onSelect}
        onToggleSuppress={onToggleSuppress}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Extrude 1' }))
    expect(onSelect).toHaveBeenCalledWith('f1')

    const row = document.querySelector('[data-feature-id="f1"]') as HTMLElement
    await userEvent.pointer({ keys: '[MouseRight]', target: row })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Suppress' }))

    expect(onToggleSuppress).toHaveBeenCalledWith('f1')
  })
})
