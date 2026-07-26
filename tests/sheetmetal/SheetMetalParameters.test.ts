import { describe, expect, it } from 'vitest'
import { SheetMetalParameters } from '../../src/sheetmetal/SheetMetalParameters'
import { SheetMetalError } from '../../src/sheetmetal/types'

const DEG = Math.PI / 180

describe('SheetMetalParameters defaults', () => {
  it('starts from mild steel one unit thick', () => {
    const parameters = new SheetMetalParameters()

    expect(parameters.material).toBe('Steel')
    expect(parameters.thickness).toBe(1)
    expect(parameters.innerRadius).toBe(1)
    expect(parameters.kFactor).toBe(0.33)
    expect(parameters.bendMethod).toBe('k-factor')
    expect(parameters.reliefType).toBe('rectangular')
  })

  it('derives the relief size from the material when it is not given', () => {
    const parameters = new SheetMetalParameters({ thickness: 2, innerRadius: 3 })

    expect(parameters.reliefWidth).toBe(1)
    expect(parameters.reliefDepth).toBe(5)
  })

  it('falls back to the defaults for an unknown bend method or relief', () => {
    const parameters = new SheetMetalParameters({
      bendMethod: 'guesswork' as never,
      reliefType: 'square' as never,
    })

    expect(parameters.bendMethod).toBe('k-factor')
    expect(parameters.reliefType).toBe('rectangular')
  })
})

describe('SheetMetalParameters validation', () => {
  it('refuses a thickness of zero or less', () => {
    expect(() => new SheetMetalParameters({ thickness: 0 })).toThrow(SheetMetalError)
    expect(() => new SheetMetalParameters({ thickness: -1 })).toThrow(
      /thickness must be greater than zero/i,
    )
  })

  it('refuses a negative bend radius', () => {
    expect(() => new SheetMetalParameters({ innerRadius: -0.5 })).toThrow(SheetMetalError)
  })

  it('keeps the K-factor between zero and one', () => {
    expect(() => new SheetMetalParameters({ kFactor: -0.1 })).toThrow(SheetMetalError)
    expect(() => new SheetMetalParameters({ kFactor: 1.5 })).toThrow(/between 0 and 1/i)
    expect(new SheetMetalParameters({ kFactor: 1 }).kFactor).toBe(1)
  })
})

describe('SheetMetalParameters.outerRadius', () => {
  it('is the inner radius plus the thickness', () => {
    expect(new SheetMetalParameters({ innerRadius: 2, thickness: 1.5 }).outerRadius).toBe(3.5)
  })

  it('follows an edit to either quantity', () => {
    const parameters = new SheetMetalParameters({ innerRadius: 1, thickness: 1 })

    expect(parameters.with({ thickness: 3 }).outerRadius).toBe(4)
    expect(parameters.with({ innerRadius: 5 }).outerRadius).toBe(6)
    // The original is untouched: `with` hands back a copy.
    expect(parameters.outerRadius).toBe(2)
  })

  it('re-validates the changes it is given', () => {
    expect(() => new SheetMetalParameters().with({ thickness: 0 })).toThrow(SheetMetalError)
  })
})

describe('SheetMetalParameters development', () => {
  it('develops a bend from the neutral axis under the K-factor method', () => {
    const parameters = new SheetMetalParameters({ thickness: 2, innerRadius: 3, kFactor: 0.4 })

    // BA = θ · (R + K · T)
    expect(parameters.allowanceFor(90)).toBeCloseTo(90 * DEG * (3 + 0.4 * 2), 9)
    expect(parameters.allowanceFor(0)).toBe(0)
    expect(parameters.allowanceFor(-90)).toBeCloseTo(parameters.allowanceFor(90), 9)
  })

  it('scales a tabulated allowance with the angle', () => {
    const parameters = new SheetMetalParameters({ bendMethod: 'bend-allowance', bendAllowance: 4 })

    expect(parameters.allowanceFor(90)).toBe(4)
    expect(parameters.allowanceFor(45)).toBe(2)
  })

  it('turns a tabulated deduction back into an allowance', () => {
    const parameters = new SheetMetalParameters({ bendMethod: 'bend-deduction', bendDeduction: 1.5 })

    expect(parameters.allowanceFor(90)).toBeCloseTo(2 * parameters.outsideSetback(90) - 1.5, 9)
  })

  it('measures the setback to the virtual sharp corner', () => {
    const parameters = new SheetMetalParameters({ thickness: 1, innerRadius: 1 })

    expect(parameters.outsideSetback(90)).toBeCloseTo(2, 9)
    expect(parameters.outsideSetback(0)).toBe(0)
    // A 180° bend has no finite corner, so the setback is clamped.
    expect(Number.isFinite(parameters.outsideSetback(180))).toBe(true)
  })

  it('reports the deduction as twice the setback less the allowance', () => {
    const parameters = new SheetMetalParameters({ thickness: 2, innerRadius: 2 })

    expect(parameters.deductionFor(90)).toBeCloseTo(
      2 * parameters.outsideSetback(90) - parameters.allowanceFor(90),
      9,
    )
  })
})

describe('SheetMetalParameters serialization', () => {
  it('round-trips through JSON unchanged', () => {
    const parameters = new SheetMetalParameters({
      material: 'Aluminium 5052',
      thickness: 1.6,
      innerRadius: 2,
      kFactor: 0.42,
      bendMethod: 'bend-deduction',
      reliefType: 'round',
      reliefWidth: 0.9,
      reliefDepth: 3.2,
    })

    const restored = SheetMetalParameters.fromJSON(JSON.parse(JSON.stringify(parameters)))

    expect(restored.toJSON()).toEqual(parameters.toJSON())
    expect(restored.outerRadius).toBe(parameters.outerRadius)
  })

  it('fills in what a partial record leaves out', () => {
    const restored = SheetMetalParameters.fromJSON({ thickness: 3 })

    expect(restored.thickness).toBe(3)
    expect(restored.material).toBe('Steel')
  })
})
