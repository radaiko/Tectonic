import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SketchEditor } from '../../src/sketch/SketchEditor'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildCircle, buildLine } from '../../src/sketch/domain/builders'
import { LengthConstraint } from '../../src/sketch/domain/Constraint'
import type { LineEntity } from '../../src/sketch/domain/SketchEntity'
import { canvasRecorderFor } from '../helpers/mockCanvas'

/**
 * The editor falls back to an 800x600 viewport when the frame cannot be
 * measured, which is always the case in jsdom. With scale 1 and the origin
 * centred that makes the mapping below exact.
 */
const CENTER_X = 400
const CENTER_Y = 300

function client(world: { x: number; y: number }): { clientX: number; clientY: number } {
  return { clientX: CENTER_X + world.x, clientY: CENTER_Y - world.y }
}

function canvas(): HTMLCanvasElement {
  return screen.getByTestId('sketch-canvas') as HTMLCanvasElement
}

function click(world: { x: number; y: number }, init: Record<string, unknown> = {}): void {
  fireEvent.pointerDown(canvas(), { ...client(world), button: 0, ...init })
  fireEvent.pointerUp(canvas(), { ...client(world), button: 0, ...init })
}

function emptySketch(): SketchModel {
  return new SketchModel({ gridSpacing: 0 })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('toolbar', () => {
  it('offers every tool and starts on Select', () => {
    render(<SketchEditor model={emptySketch()} />)

    expect(screen.getByRole('button', { name: 'Select' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Line' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Dimension' })).toBeDefined()
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThan(10)
  })

  it('highlights the tool that was picked and shows its hint', async () => {
    render(<SketchEditor model={emptySketch()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Line' }))

    expect(screen.getByRole('button', { name: 'Line' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/chain segments/i)).toBeDefined()
  })

  it('shows the options of the active tool', async () => {
    render(<SketchEditor model={emptySketch()} />)
    expect(screen.queryByLabelText('Radius')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Fillet' }))

    const radius = screen.getByLabelText('Radius') as HTMLInputElement
    expect(radius.value).toBe('5')
    fireEvent.change(radius, { target: { value: '8' } })
    expect((screen.getByLabelText('Radius') as HTMLInputElement).value).toBe('8')
  })

  it('offers the pattern mode as a choice', async () => {
    render(<SketchEditor model={emptySketch()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Pattern' }))
    const mode = screen.getByLabelText('Mode') as HTMLSelectElement
    fireEvent.change(mode, { target: { value: 'circular' } })

    expect((screen.getByLabelText('Mode') as HTMLSelectElement).value).toBe('circular')
  })

  it('starts on the tool it was given', () => {
    render(<SketchEditor model={emptySketch()} initialTool="line" />)

    expect(screen.getByRole('button', { name: 'Line' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('draws new geometry as construction when the toggle is on', async () => {
    const model = emptySketch()
    render(<SketchEditor model={model} />)
    await userEvent.click(screen.getByLabelText('Construction'))
    await userEvent.click(screen.getByRole('button', { name: 'Circle' }))

    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 0 })
    fireEvent.pointerUp(canvas(), { ...client({ x: 20, y: 0 }), button: 0 })

    expect(model.entitiesOfType('circle')[0]?.isConstruction).toBe(true)
  })
})

describe('drawing', () => {
  it('draws a line through the active tool and reports the change', async () => {
    const model = emptySketch()
    const onChange = vi.fn()
    render(<SketchEditor model={model} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Line' }))

    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 0 })
    fireEvent.pointerMove(canvas(), client({ x: 50, y: 0 }))
    fireEvent.pointerUp(canvas(), { ...client({ x: 50, y: 0 }), button: 0 })

    expect(model.entitiesOfType('line')).toHaveLength(1)
    const [line] = model.entitiesOfType('line') as LineEntity[]
    expect(model.requirePoint((line as LineEntity).endPointId).x).toBeCloseTo(50)
    expect(onChange).toHaveBeenCalled()
  })

  it('paints the sketch onto the canvas', () => {
    const model = emptySketch()
    buildCircle(model, { x: 0, y: 0 }, 20)

    render(<SketchEditor model={model} />)

    const recorder = canvasRecorderFor(canvas())
    expect(recorder?.countOf('arc')).toBeGreaterThan(0)
    expect(recorder?.countOf('clearRect')).toBeGreaterThan(0)
  })

  it('does not fall over without a 2D context', () => {
    const model = emptySketch()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    expect(() => render(<SketchEditor model={model} />)).not.toThrow()
  })
})

describe('selection', () => {
  it('selects on click and describes the entity', () => {
    const model = emptySketch()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    render(<SketchEditor model={model} />)

    click({ x: 0, y: 0 })

    expect(screen.getByText('Line')).toBeDefined()
    expect(screen.getByText('Length')).toBeDefined()
    expect(screen.getByText('100')).toBeDefined()
  })

  it('marks a construction entity in the properties panel', () => {
    const model = emptySketch()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 }, { isConstruction: true })
    render(<SketchEditor model={model} />)

    click({ x: 0, y: 0 })

    expect(screen.getByText('Line (construction)')).toBeDefined()
  })

  it('counts a multiple selection', () => {
    const model = emptySketch()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    render(<SketchEditor model={model} />)

    // Box select everything.
    fireEvent.pointerDown(canvas(), { ...client({ x: -80, y: -40 }), button: 0 })
    fireEvent.pointerMove(canvas(), client({ x: 80, y: 40 }))
    fireEvent.pointerUp(canvas(), { ...client({ x: 80, y: 40 }), button: 0 })

    expect(screen.getByText('3 entities selected.')).toBeDefined()
  })

  it('deletes the selection with Delete', () => {
    const model = emptySketch()
    const line = buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    render(<SketchEditor model={model} />)
    click({ x: 0, y: 0 })

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(model.getEntity(line.id)).toBeUndefined()
    expect(screen.getByText('Nothing selected.')).toBeDefined()
  })

  it('clears the selection on Escape', () => {
    const model = emptySketch()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    render(<SketchEditor model={model} />)
    click({ x: 0, y: 0 })
    expect(screen.queryByText('Nothing selected.')).toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByText('Nothing selected.')).toBeDefined()
  })

  it('ignores a right click', () => {
    const model = emptySketch()
    buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    render(<SketchEditor model={model} />)

    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 2 })
    fireEvent.pointerUp(canvas(), { ...client({ x: 0, y: 0 }), button: 2 })
    fireEvent.contextMenu(canvas())

    expect(screen.getByText('Nothing selected.')).toBeDefined()
  })
})

describe('undo and redo', () => {
  it('undoes and redoes a drawing operation', async () => {
    const model = emptySketch()
    render(<SketchEditor model={model} />)
    await userEvent.click(screen.getByRole('button', { name: 'Circle' }))
    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 0 })
    fireEvent.pointerUp(canvas(), { ...client({ x: 20, y: 0 }), button: 0 })
    expect(model.entitiesOfType('circle')).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(model.entitiesOfType('circle')).toHaveLength(0)
    expect(screen.getByText('Undo')).toBeDefined()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(model.entitiesOfType('circle')).toHaveLength(1)
    expect(screen.getByText('Redo')).toBeDefined()
  })

  it('redoes with Ctrl+Y as well', async () => {
    const model = emptySketch()
    render(<SketchEditor model={model} />)
    await userEvent.click(screen.getByRole('button', { name: 'Circle' }))
    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 0 })
    fireEvent.pointerUp(canvas(), { ...client({ x: 20, y: 0 }), button: 0 })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })

    expect(model.entitiesOfType('circle')).toHaveLength(1)
  })

  it('says when there is nothing to undo or redo', () => {
    render(<SketchEditor model={emptySketch()} />)

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(screen.getByText('Nothing to undo')).toBeDefined()

    fireEvent.keyDown(window, { key: 'y', metaKey: true })
    expect(screen.getByText('Nothing to redo')).toBeDefined()
  })
})

describe('viewport', () => {
  it('reports the cursor position in millimetres', () => {
    render(<SketchEditor model={emptySketch()} />)

    fireEvent.pointerMove(canvas(), client({ x: 25, y: -10 }))

    expect(screen.getByText(/X 25 Y -10 mm/)).toBeDefined()
  })

  it('zooms on the wheel', () => {
    render(<SketchEditor model={emptySketch()} />)
    expect(screen.getByText('100%')).toBeDefined()

    fireEvent.wheel(canvas(), { deltaY: -100, clientX: CENTER_X, clientY: CENTER_Y })
    expect(screen.getByText('110%')).toBeDefined()

    fireEvent.wheel(canvas(), { deltaY: 100, clientX: CENTER_X, clientY: CENTER_Y })
    expect(screen.getByText('100%')).toBeDefined()
  })

  it('pans with the middle button', () => {
    render(<SketchEditor model={emptySketch()} />)

    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 1 })
    fireEvent.pointerMove(canvas(), client({ x: 100, y: 0 }))
    fireEvent.pointerUp(canvas(), { ...client({ x: 100, y: 0 }), button: 1 })
    fireEvent.pointerMove(canvas(), client({ x: 0, y: 0 }))

    expect(screen.getByText(/X -100 Y 0 mm/)).toBeDefined()
  })

  it('zooms to fit the sketch', async () => {
    const model = emptySketch()
    buildLine(model, { x: -100, y: -100 }, { x: 100, y: 100 })
    render(<SketchEditor model={model} />)

    await userEvent.click(screen.getByRole('button', { name: 'Fit' }))

    expect(screen.getByText('Zoomed to fit')).toBeDefined()
    expect(screen.getByText('270%')).toBeDefined()
  })

  it('shows the snap the cursor latched onto', () => {
    const model = new SketchModel({ gridSpacing: 10 })
    render(<SketchEditor model={model} />)

    fireEvent.pointerMove(canvas(), client({ x: 21, y: 19 }))

    expect(screen.getByText('Snap: Grid')).toBeDefined()
  })

  it('takes its size from the frame when it can be measured', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 700,
      width: 1000,
      height: 700,
      toJSON: () => ({}),
    })

    render(<SketchEditor model={emptySketch()} />)
    fireEvent.pointerMove(canvas(), { clientX: 500, clientY: 350 })

    expect(screen.getByText(/X 0 Y 0 mm/)).toBeDefined()
  })

  it('watches the frame with a ResizeObserver when there is one', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    class FakeResizeObserver {
      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    const { unmount } = render(<SketchEditor model={emptySketch()} />)
    expect(observe).toHaveBeenCalledOnce()
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })
})

describe('constraints and dimensions', () => {
  function sketchWithLengthDimension(): SketchModel {
    const model = emptySketch()
    const line = buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 100 }))
    return model
  }

  it('lists the constraints of the sketch', () => {
    render(<SketchEditor model={sketchWithLengthDimension()} />)

    expect(screen.getByText('d1 = 100')).toBeDefined()
  })

  it('says when there are no constraints', () => {
    render(<SketchEditor model={emptySketch()} />)

    expect(screen.getByText('No constraints yet.')).toBeDefined()
  })

  it('deletes a constraint from the panel', async () => {
    const model = sketchWithLengthDimension()
    const onChange = vi.fn()
    render(<SketchEditor model={model} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete length constraint' }))

    expect(model.constraints.size).toBe(0)
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByText('Constraint deleted')).toBeDefined()
  })

  it('edits a dimension value inline', () => {
    const model = sketchWithLengthDimension()
    render(<SketchEditor model={model} />)

    // The label sits 18px above the midpoint of the line.
    fireEvent.pointerDown(canvas(), { clientX: CENTER_X, clientY: CENTER_Y - 18, button: 0 })
    const input = screen.getByLabelText('Dimension value') as HTMLInputElement
    expect(input.value).toBe('100')

    fireEvent.change(input, { target: { value: '60' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    const [constraint] = [...model.constraints.values()]
    expect((constraint as LengthConstraint).value).toBe(60)
    const [line] = model.entitiesOfType('line') as LineEntity[]
    const start = model.requirePoint((line as LineEntity).startPointId)
    const end = model.requirePoint((line as LineEntity).endPointId)
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(60)
  })

  it('abandons an inline edit on Escape', () => {
    const model = sketchWithLengthDimension()
    render(<SketchEditor model={model} />)
    fireEvent.pointerDown(canvas(), { clientX: CENTER_X, clientY: CENTER_Y - 18, button: 0 })

    fireEvent.keyDown(screen.getByLabelText('Dimension value'), { key: 'Escape' })

    expect(screen.queryByLabelText('Dimension value')).toBeNull()
    expect(([...model.constraints.values()][0] as LengthConstraint | undefined)?.value).toBe(100)
  })

  it('rejects a value that is not a number', () => {
    const model = sketchWithLengthDimension()
    render(<SketchEditor model={model} />)
    fireEvent.pointerDown(canvas(), { clientX: CENTER_X, clientY: CENTER_Y - 18, button: 0 })

    const input = screen.getByLabelText('Dimension value')
    fireEvent.change(input, { target: { value: 'wide' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('"wide" is not a number')).toBeDefined()
    expect(([...model.constraints.values()][0] as LengthConstraint | undefined)?.value).toBe(100)
  })

  it('rejects an empty value', () => {
    const model = sketchWithLengthDimension()
    render(<SketchEditor model={model} />)
    fireEvent.pointerDown(canvas(), { clientX: CENTER_X, clientY: CENTER_Y - 18, button: 0 })

    const input = screen.getByLabelText('Dimension value')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('"" is not a number')).toBeDefined()
    expect(([...model.constraints.values()][0] as LengthConstraint | undefined)?.value).toBe(100)
  })

  it('puts back a value the sketch cannot satisfy', () => {
    const model = emptySketch()
    const line = buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 100 }))
    render(<SketchEditor model={model} />)
    fireEvent.pointerDown(canvas(), { clientX: CENTER_X, clientY: CENTER_Y - 18, button: 0 })

    const input = screen.getByLabelText('Dimension value')
    fireEvent.change(input, { target: { value: '-40' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(([...model.constraints.values()][0] as LengthConstraint | undefined)?.value).toBe(100)
    // The status bar shows the solver diagnostic in preference to the editor's
    // own message, so the rejection surfaces as the over-constrained report.
    expect(screen.getByText(/over-constrained/i)).toBeDefined()
  })

  it('reports the degrees of freedom left in the sketch', async () => {
    const model = emptySketch()
    render(<SketchEditor model={model} />)
    expect(screen.getByText('Fully constrained')).toBeDefined()

    // The readout follows a solve, and a solve only runs when an edit comes
    // back through a tool — so draw the line instead of mutating the model.
    await userEvent.click(screen.getByRole('button', { name: 'Line' }))
    fireEvent.pointerDown(canvas(), { ...client({ x: 0, y: 0 }), button: 0 })
    fireEvent.pointerMove(canvas(), client({ x: 10, y: 0 }))
    fireEvent.pointerUp(canvas(), { ...client({ x: 10, y: 0 }), button: 0 })

    expect(screen.getByText('4 DOF')).toBeDefined()
  })
})
