import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ViewportHud } from '../../src/ui/ViewportHud'

/**
 * A modelling tool is modal, and the HUD is what stops that from being a
 * guessing game. What it says matters more than how it looks, so this is mostly
 * about which of its several states wins.
 */
describe('the viewport HUD', () => {
  it('names the surface that has the screen', () => {
    render(<ViewportHud mode="model" selectionCount={0} />)

    expect(screen.getByText('Model')).toBeDefined()
  })

  it('names the open sketch and the tool holding the pointer', () => {
    render(
      <ViewportHud mode="sketch" sketchName="Base profile" toolLabel="Line" selectionCount={0} />,
    )

    expect(screen.getByText('Base profile')).toBeDefined()
    expect(screen.getByText('Line')).toBeDefined()
  })

  it('says loudest of all that a field is armed', () => {
    render(<ViewportHud mode="model" selectionCount={4} pickingKind="edge" hint="ignored" />)

    // While a field is armed the viewport ignores everything except that kind,
    // and without a read-out the only symptom is that clicks stop working — so
    // this outranks both the selection count and the hint.
    expect(screen.getByRole('status').textContent).toMatch(/Picking edges/)
    expect(screen.queryByText('4 selected')).toBeNull()
  })

  it('reports the 3D selection while the 3D view is what it is over', () => {
    render(<ViewportHud mode="model" selectionCount={2} />)

    expect(screen.getByText('2 selected')).toBeDefined()
  })

  it('leaves the 3D selection alone while drawing', () => {
    render(<ViewportHud mode="sketch" toolLabel="Circle" selectionCount={2} hint="Drag out" />)

    // A sketch has a selection of its own, reported in the sketch status bar.
    expect(screen.queryByText('2 selected')).toBeNull()
    expect(screen.getByText('Drag out')).toBeDefined()
  })

  it('falls back to the hint when there is nothing else to report', () => {
    render(<ViewportHud mode="sketch" toolLabel="Line" selectionCount={0} hint="Click to chain" />)

    expect(screen.getByText('Click to chain')).toBeDefined()
  })

  it('is a read-out, never a control', () => {
    // It sits over the model, so anything clickable in it is a hit target in
    // front of the geometry. (The stylesheet also takes it out of the pointer's
    // way; that is a rule jsdom never loads, so what is checked here is the
    // thing the markup can actually promise.)
    const { container } = render(
      <ViewportHud mode="sketch" toolLabel="Line" selectionCount={3} pickingKind="face" />,
    )

    expect(container.querySelectorAll('button, a, input, select')).toHaveLength(0)
  })
})
