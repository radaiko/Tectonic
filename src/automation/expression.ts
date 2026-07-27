/**
 * The expression language behind the parameter table, the rules engine and the
 * script runner.
 *
 * One parser serves all three: a parameter is an arithmetic expression, a rule
 * condition is the same expression compared against something, and a script
 * reads values through it. Everything evaluates to a number — booleans are 1 and
 * 0 — which keeps the grammar small enough to be worth hand-writing.
 *
 * Units are baked into literals rather than carried through the arithmetic:
 * `25.4mm`, `1in` and `0.1ft` are all the same number once parsed. Lengths
 * settle to millimetres and angles to degrees, so `atan(height / width)` can
 * drive a revolve angle without a conversion. Trigonometry works in degrees for
 * the same reason; `radians()` and `degrees()` are there when it does not.
 */

export class ExpressionError extends Error {
  /** Character offset the failure was noticed at, for an editor caret. */
  readonly position: number

  constructor(message: string, position = 0) {
    super(message)
    this.name = 'ExpressionError'
    this.position = position
  }
}

/**
 * What one unit of each suffix is worth in the base unit of its quantity:
 * millimetres for lengths, degrees for angles.
 */
export const UNIT_FACTORS: Readonly<Record<string, number>> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  inch: 25.4,
  ft: 304.8,
  deg: 1,
  rad: 180 / Math.PI,
}

export const UNIT_NAMES: readonly string[] = Object.keys(UNIT_FACTORS)

export function isUnitName(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(UNIT_FACTORS, value)
}

/** Named constants every expression can use without declaring them. */
export const CONSTANTS: Readonly<Record<string, number>> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  true: 1,
  false: 0,
}

const DEG = Math.PI / 180

interface FunctionSpec {
  readonly minArgs: number
  readonly maxArgs: number
  readonly apply: (args: readonly number[]) => number
}

/** Everything callable from an expression, with the arity it accepts. */
export const FUNCTIONS: Readonly<Record<string, FunctionSpec>> = {
  sin: unary((x) => Math.sin(x * DEG)),
  cos: unary((x) => Math.cos(x * DEG)),
  tan: unary((x) => Math.tan(x * DEG)),
  asin: unary((x) => Math.asin(x) / DEG),
  acos: unary((x) => Math.acos(x) / DEG),
  atan: unary((x) => Math.atan(x) / DEG),
  atan2: binary((y, x) => Math.atan2(y, x) / DEG),
  sqrt: unary(Math.sqrt),
  abs: unary(Math.abs),
  floor: unary(Math.floor),
  ceil: unary(Math.ceil),
  round: unary(Math.round),
  sign: unary(Math.sign),
  exp: unary(Math.exp),
  log: unary(Math.log),
  log10: unary(Math.log10),
  pow: binary((base, exponent) => base ** exponent),
  hypot: { minArgs: 1, maxArgs: 32, apply: (args) => Math.hypot(...args) },
  min: { minArgs: 1, maxArgs: 32, apply: (args) => Math.min(...args) },
  max: { minArgs: 1, maxArgs: 32, apply: (args) => Math.max(...args) },
  /** Degrees to radians, for the rare caller that wants raw radians out. */
  radians: unary((x) => x * DEG),
  /** Radians to degrees — the inverse of {@link FUNCTIONS.radians}. */
  degrees: unary((x) => x / DEG),
  /** `if(condition, whenTrue, whenFalse)` — the ternary in call form. */
  if: { minArgs: 3, maxArgs: 3, apply: (args) => (truthy(args[0] as number) ? (args[1] as number) : (args[2] as number)) },
}

function unary(apply: (value: number) => number): FunctionSpec {
  return { minArgs: 1, maxArgs: 1, apply: (args) => apply(args[0] as number) }
}

function binary(apply: (a: number, b: number) => number): FunctionSpec {
  return { minArgs: 2, maxArgs: 2, apply: (args) => apply(args[0] as number, args[1] as number) }
}

/** Everything but zero is true, matching the 1/0 booleans the grammar returns. */
export function truthy(value: number): boolean {
  return value !== 0
}

/* --------------------------------------------------------------- tokenizer */

export type TokenType = 'number' | 'reference' | 'operator' | 'punctuation' | 'end'

export interface Token {
  readonly type: TokenType
  readonly text: string
  /** Set on numeric tokens, already converted to the base unit. */
  readonly value?: number
  readonly position: number
}

const OPERATORS: readonly string[] = [
  '**',
  '&&',
  '||',
  '==',
  '!=',
  '<=',
  '>=',
  '+',
  '-',
  '*',
  '/',
  '%',
  '^',
  '<',
  '>',
  '!',
]

const IDENTIFIER_START = /[A-Za-z_]/
const IDENTIFIER_PART = /[A-Za-z0-9_]/

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index] as string

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '(' || char === ')' || char === ',' || char === '?' || char === ':') {
      tokens.push({ type: 'punctuation', text: char, position: index })
      index += 1
      continue
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[index + 1] ?? ''))) {
      const start = index
      while (index < source.length && /[0-9]/.test(source[index] as string)) index += 1
      if (source[index] === '.') {
        index += 1
        while (index < source.length && /[0-9]/.test(source[index] as string)) index += 1
      }
      if (source[index] === 'e' || source[index] === 'E') {
        const exponent = index + (source[index + 1] === '+' || source[index + 1] === '-' ? 2 : 1)
        if (/[0-9]/.test(source[exponent] ?? '')) {
          index = exponent
          while (index < source.length && /[0-9]/.test(source[index] as string)) index += 1
        }
      }

      const literal = Number(source.slice(start, index))
      if (!Number.isFinite(literal)) {
        throw new ExpressionError(`"${source.slice(start, index)}" is not a number`, start)
      }

      const suffix = readUnitSuffix(source, index)
      tokens.push({
        type: 'number',
        text: source.slice(start, suffix.end),
        value: literal * suffix.factor,
        position: start,
      })
      index = suffix.end
      continue
    }

    if (IDENTIFIER_START.test(char)) {
      const start = index
      while (index < source.length && IDENTIFIER_PART.test(source[index] as string)) index += 1
      // A dot only continues the name when a name follows it, so `2.` stays a
      // malformed number rather than becoming part of a reference.
      while (source[index] === '.' && IDENTIFIER_START.test(source[index + 1] ?? '')) {
        index += 1
        while (index < source.length && IDENTIFIER_PART.test(source[index] as string)) index += 1
      }
      tokens.push({ type: 'reference', text: source.slice(start, index), position: start })
      continue
    }

    const operator = OPERATORS.find((candidate) => source.startsWith(candidate, index))
    if (!operator) throw new ExpressionError(`Unexpected character "${char}"`, index)
    tokens.push({ type: 'operator', text: operator, position: index })
    index += operator.length
  }

  tokens.push({ type: 'end', text: '', position: source.length })
  return tokens
}

/**
 * A unit written after a number. Whitespace is allowed — `2 mm` reads the way it
 * is spoken — because a bare identifier can never legally follow a number
 * otherwise, so nothing else could have been meant.
 */
function readUnitSuffix(source: string, from: number): { readonly end: number; readonly factor: number } {
  let index = from
  while (index < source.length && /[ \t]/.test(source[index] as string)) index += 1
  if (index >= source.length || !IDENTIFIER_START.test(source[index] as string)) {
    return { end: from, factor: 1 }
  }

  const start = index
  while (index < source.length && IDENTIFIER_PART.test(source[index] as string)) index += 1
  const name = source.slice(start, index)
  if (!isUnitName(name) || source[index] === '.') return { end: from, factor: 1 }
  return { end: index, factor: UNIT_FACTORS[name] as number }
}

/* ------------------------------------------------------------------ parser */

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '^'
  | '<'
  | '<='
  | '>'
  | '>='
  | '=='
  | '!='
  | '&&'
  | '||'

export type ExpressionNode =
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'reference'; readonly name: string }
  | { readonly type: 'unary'; readonly operator: '-' | '+' | '!'; readonly operand: ExpressionNode }
  | {
      readonly type: 'binary'
      readonly operator: BinaryOperator
      readonly left: ExpressionNode
      readonly right: ExpressionNode
    }
  | { readonly type: 'call'; readonly name: string; readonly args: readonly ExpressionNode[] }
  | {
      readonly type: 'conditional'
      readonly condition: ExpressionNode
      readonly whenTrue: ExpressionNode
      readonly whenFalse: ExpressionNode
    }

/** Binding power per binary operator; higher binds tighter. */
const PRECEDENCE: Readonly<Record<BinaryOperator, number>> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
  '^': 8,
}

/** Only exponentiation associates to the right, so `2^3^2` is 512. */
const RIGHT_ASSOCIATIVE: readonly BinaryOperator[] = ['^']

export function parseExpression(source: string): ExpressionNode {
  const tokens = tokenize(source)
  let cursor = 0

  const peek = (): Token => tokens[cursor] as Token
  const advance = (): Token => tokens[cursor++] as Token

  const expect = (text: string): Token => {
    const token = peek()
    if (token.text !== text) {
      throw new ExpressionError(`Expected "${text}"${describe(token)}`, token.position)
    }
    return advance()
  }

  const parsePrimary = (): ExpressionNode => {
    const token = advance()

    if (token.type === 'number') return { type: 'number', value: token.value as number }

    if (token.type === 'reference') {
      if (peek().text === '(') {
        advance()
        const args: ExpressionNode[] = []
        if (peek().text !== ')') {
          args.push(parseBinary(0))
          while (peek().text === ',') {
            advance()
            args.push(parseBinary(0))
          }
        }
        expect(')')
        return { type: 'call', name: token.text, args }
      }
      return { type: 'reference', name: token.text }
    }

    if (token.text === '(') {
      const inner = parseTernary()
      expect(')')
      return inner
    }

    if (token.text === '-' || token.text === '+' || token.text === '!') {
      return {
        type: 'unary',
        operator: token.text as '-' | '+' | '!',
        // Unary binds tighter than every binary operator except `^`, so that
        // `-x^2` is `-(x^2)` the way it reads on paper.
        operand: parseBinary(PRECEDENCE['^']),
      }
    }

    throw new ExpressionError(`Unexpected ${token.type === 'end' ? 'end of expression' : `"${token.text}"`}`, token.position)
  }

  const parseBinary = (minimum: number): ExpressionNode => {
    let left = parsePrimary()

    for (;;) {
      const token = peek()
      if (token.type !== 'operator') break
      const operator = (token.text === '**' ? '^' : token.text) as BinaryOperator
      const precedence = PRECEDENCE[operator]
      if (precedence === undefined || precedence < minimum) break

      advance()
      const next = RIGHT_ASSOCIATIVE.includes(operator) ? precedence : precedence + 1
      left = { type: 'binary', operator, left, right: parseBinary(next) }
    }

    return left
  }

  const parseTernary = (): ExpressionNode => {
    const condition = parseBinary(0)
    if (peek().text !== '?') return condition
    advance()
    const whenTrue = parseTernary()
    expect(':')
    return { type: 'conditional', condition, whenTrue, whenFalse: parseTernary() }
  }

  if (source.trim().length === 0) throw new ExpressionError('Expression is empty')
  const node = parseTernary()
  const trailing = peek()
  if (trailing.type !== 'end') {
    throw new ExpressionError(`Unexpected "${trailing.text}"`, trailing.position)
  }
  return node
}

function describe(token: Token): string {
  return token.type === 'end' ? ', but the expression ended' : `, found "${token.text}"`
}

/* --------------------------------------------------------------- evaluation */

/** Looks a name up. Returning undefined means "no such value", not zero. */
export type ReferenceResolver = (name: string) => number | undefined

export interface EvaluateOptions {
  readonly resolve?: ReferenceResolver
}

export function evaluate(node: ExpressionNode, options: EvaluateOptions = {}): number {
  switch (node.type) {
    case 'number':
      return node.value

    case 'reference': {
      const resolved = options.resolve?.(node.name)
      if (resolved !== undefined) return resolved
      const constant = CONSTANTS[node.name]
      if (constant !== undefined) return constant
      throw new ExpressionError(`Unknown name "${node.name}"`)
    }

    case 'unary': {
      const operand = evaluate(node.operand, options)
      if (node.operator === '-') return -operand
      if (node.operator === '!') return truthy(operand) ? 0 : 1
      return operand
    }

    case 'binary':
      return applyBinary(node.operator, node, options)

    case 'call': {
      const spec = FUNCTIONS[node.name]
      if (!spec) throw new ExpressionError(`Unknown function "${node.name}"`)
      if (node.args.length < spec.minArgs || node.args.length > spec.maxArgs) {
        throw new ExpressionError(
          `${node.name}() takes ${arityText(spec)}, got ${node.args.length}`,
        )
      }
      return spec.apply(node.args.map((argument) => evaluate(argument, options)))
    }

    case 'conditional':
      return truthy(evaluate(node.condition, options))
        ? evaluate(node.whenTrue, options)
        : evaluate(node.whenFalse, options)
  }
}

function applyBinary(
  operator: BinaryOperator,
  node: Extract<ExpressionNode, { type: 'binary' }>,
  options: EvaluateOptions,
): number {
  // Short-circuit before touching the right side: `count > 0 && total / count > 2`
  // has to stay safe when the guard fails.
  if (operator === '&&') {
    return truthy(evaluate(node.left, options)) && truthy(evaluate(node.right, options)) ? 1 : 0
  }
  if (operator === '||') {
    return truthy(evaluate(node.left, options)) || truthy(evaluate(node.right, options)) ? 1 : 0
  }

  const left = evaluate(node.left, options)
  const right = evaluate(node.right, options)

  switch (operator) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      if (right === 0) throw new ExpressionError('Division by zero')
      return left / right
    case '%':
      if (right === 0) throw new ExpressionError('Division by zero')
      return left % right
    case '^':
      return left ** right
    case '<':
      return left < right ? 1 : 0
    case '<=':
      return left <= right ? 1 : 0
    case '>':
      return left > right ? 1 : 0
    case '>=':
      return left >= right ? 1 : 0
    case '==':
      return nearlyEqual(left, right) ? 1 : 0
    case '!=':
      return nearlyEqual(left, right) ? 0 : 1
  }
}

/** Comparing computed lengths exactly would fail on rounding alone. */
function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
}

function arityText(spec: FunctionSpec): string {
  if (spec.minArgs === spec.maxArgs) {
    return `${spec.minArgs} argument${spec.minArgs === 1 ? '' : 's'}`
  }
  return `${spec.minArgs} to ${spec.maxArgs} arguments`
}

/** Parses and evaluates in one step — the common case for a one-off value. */
export function evaluateExpression(source: string, options: EvaluateOptions = {}): number {
  return evaluate(parseExpression(source), options)
}

/** Whether an expression reads as true, for a rule condition. */
export function evaluateCondition(source: string, options: EvaluateOptions = {}): boolean {
  return truthy(evaluateExpression(source, options))
}

/**
 * Every name an expression reads, in the order first met. Constants are left out
 * — they are always available, so they can never be a dependency.
 */
export function expressionReferences(node: ExpressionNode): string[] {
  const found: string[] = []

  const visit = (current: ExpressionNode): void => {
    switch (current.type) {
      case 'reference':
        if (CONSTANTS[current.name] === undefined && !found.includes(current.name)) {
          found.push(current.name)
        }
        break
      case 'unary':
        visit(current.operand)
        break
      case 'binary':
        visit(current.left)
        visit(current.right)
        break
      case 'call':
        for (const argument of current.args) visit(argument)
        break
      case 'conditional':
        visit(current.condition)
        visit(current.whenTrue)
        visit(current.whenFalse)
        break
      case 'number':
        break
    }
  }

  visit(node)
  return found
}

/** The names a source string reads, or none at all when it does not parse. */
export function referencesOf(source: string): string[] {
  try {
    return expressionReferences(parseExpression(source))
  } catch {
    return []
  }
}
