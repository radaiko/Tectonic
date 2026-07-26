import { describe, expect, it } from 'vitest'
import {
  ExpressionError,
  evaluateExpression,
  expressionReferences,
} from '../../src/solver/expression'

describe('evaluateExpression', () => {
  it('evaluates a plain number', () => {
    expect(evaluateExpression('42', {})).toBe(42)
  })

  it('ignores a leading equals sign', () => {
    expect(evaluateExpression('= 12', {})).toBe(12)
  })

  it('resolves parameter references', () => {
    expect(evaluateExpression('= d1 * 2 + 5', { d1: 10 })).toBe(25)
  })

  it('honours operator precedence', () => {
    expect(evaluateExpression('2 + 3 * 4', {})).toBe(14)
  })

  it('honours parentheses', () => {
    expect(evaluateExpression('(2 + 3) * 4', {})).toBe(20)
  })

  it('supports subtraction and division', () => {
    expect(evaluateExpression('20 / 4 - 1', {})).toBe(4)
  })

  it('supports unary minus and plus', () => {
    expect(evaluateExpression('-d1 + +2', { d1: 3 })).toBe(-1)
  })

  it('supports decimal literals', () => {
    expect(evaluateExpression('1.5 * 2', {})).toBe(3)
  })

  it('rejects an unknown parameter', () => {
    expect(() => evaluateExpression('= dX + 1', {})).toThrow(ExpressionError)
    expect(() => evaluateExpression('= dX + 1', {})).toThrow(/Unknown parameter "dX"/)
  })

  it('rejects an empty expression', () => {
    expect(() => evaluateExpression('  ', {})).toThrow(/empty/i)
  })

  it('rejects an unexpected character', () => {
    expect(() => evaluateExpression('2 # 3', {})).toThrow(/Unexpected character "#"/)
  })

  it('rejects a missing closing parenthesis', () => {
    expect(() => evaluateExpression('(2 + 3', {})).toThrow(/closing/)
  })

  it('rejects trailing junk', () => {
    expect(() => evaluateExpression('2 3', {})).toThrow(/Unexpected/)
  })

  it('rejects a dangling operator', () => {
    expect(() => evaluateExpression('2 +', {})).toThrow(/Unexpected end/)
  })

  it('rejects division by zero', () => {
    expect(() => evaluateExpression('1 / 0', {})).toThrow(/Division by zero/)
  })
})

describe('expressionReferences', () => {
  it('lists every referenced parameter once', () => {
    expect(expressionReferences('= d1 * 2 + d2 - d1')).toEqual(['d1', 'd2'])
  })

  it('returns nothing for a constant', () => {
    expect(expressionReferences('= 5')).toEqual([])
  })

  it('returns nothing for an unparsable expression', () => {
    expect(expressionReferences('= #')).toEqual([])
  })
})
