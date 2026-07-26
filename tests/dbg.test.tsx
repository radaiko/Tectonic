import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SketchEditor } from '../Users/radaiko/dev/private/Tectonic/src/sketch/SketchEditor'
import { SketchModel } from '../Users/radaiko/dev/private/Tectonic/src/sketch/domain/SketchModel'
import { buildLine } from '../Users/radaiko/dev/private/Tectonic/src/sketch/domain/builders'
import { LengthConstraint } from '../Users/radaiko/dev/private/Tectonic/src/sketch/domain/Constraint'

describe('debug', () => {
  it('negative length', () => {
    const model = new SketchModel({ gridSpacing: 0 })
    const line = buildLine(model, { x: -50, y: 0 }, { x: 50, y: 0 })
    model.addConstraint(new LengthConstraint({ lineId: line.id, value: 100 }))
    render(<SketchEditor model={model} />)
    fireEvent.pointerDown(screen.getByTestId('sketch-canvas'), { clientX: 400, clientY: 282, button: 0 })
    const input = screen.getByLabelText('Dimension value')
    fireEvent.change(input, { target: { value: '-40' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    console.log('MESSAGE:', document.querySelector('.sketch__message')?.textContent)
    console.log('VALUE:', [...model.constraints.values()][0]?.value)
    expect(true).toBe(true)
  })
})
