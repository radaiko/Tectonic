/**
 * Tiny arithmetic expression language for dimension formulas such as
 * `= d1 * 2 + 5`. Supports `+ - * /`, parentheses, unary sign and references to
 * other named dimensions.
 */
export class ExpressionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpressionError'
  }
}

type TokenType = 'number' | 'identifier' | 'operator' | 'paren'

interface Token {
  readonly type: TokenType
  readonly text: string
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index] as string
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      let text = ''
      while (index < source.length && /[0-9.]/.test(source[index] as string)) {
        text += source[index]
        index += 1
      }
      tokens.push({ type: 'number', text })
      continue
    }
    if (/[A-Za-z_]/.test(char)) {
      let text = ''
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index] as string)) {
        text += source[index]
        index += 1
      }
      tokens.push({ type: 'identifier', text })
      continue
    }
    if ('+-*/'.includes(char)) {
      tokens.push({ type: 'operator', text: char })
      index += 1
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', text: char })
      index += 1
      continue
    }
    throw new ExpressionError(`Unexpected character "${char}" in expression`)
  }

  return tokens
}

class Parser {
  private position = 0

  private readonly tokens: readonly Token[]
  private readonly variables: Readonly<Record<string, number>>

  constructor(tokens: readonly Token[], variables: Readonly<Record<string, number>>) {
    this.tokens = tokens
    this.variables = variables
  }

  private peek(): Token | undefined {
    return this.tokens[this.position]
  }

  private take(): Token {
    const token = this.tokens[this.position]
    if (!token) throw new ExpressionError('Unexpected end of expression')
    this.position += 1
    return token
  }

  parse(): number {
    const value = this.parseSum()
    const leftover = this.peek()
    if (leftover) throw new ExpressionError(`Unexpected "${leftover.text}" in expression`)
    return value
  }

  private parseSum(): number {
    let value = this.parseProduct()
    for (;;) {
      const token = this.peek()
      if (!token || token.type !== 'operator' || (token.text !== '+' && token.text !== '-')) break
      this.position += 1
      const right = this.parseProduct()
      value = token.text === '+' ? value + right : value - right
    }
    return value
  }

  private parseProduct(): number {
    let value = this.parseUnary()
    for (;;) {
      const token = this.peek()
      if (!token || token.type !== 'operator' || (token.text !== '*' && token.text !== '/')) break
      this.position += 1
      const right = this.parseUnary()
      if (token.text === '/') {
        if (right === 0) throw new ExpressionError('Division by zero in expression')
        value /= right
      } else {
        value *= right
      }
    }
    return value
  }

  private parseUnary(): number {
    const token = this.peek()
    if (token?.type === 'operator' && (token.text === '-' || token.text === '+')) {
      this.position += 1
      const value = this.parseUnary()
      return token.text === '-' ? -value : value
    }
    return this.parseAtom()
  }

  private parseAtom(): number {
    const token = this.take()
    if (token.type === 'number') {
      const value = Number(token.text)
      if (Number.isNaN(value)) throw new ExpressionError(`"${token.text}" is not a number`)
      return value
    }
    if (token.type === 'identifier') {
      const value = this.variables[token.text]
      if (value === undefined) throw new ExpressionError(`Unknown parameter "${token.text}"`)
      return value
    }
    if (token.text === '(') {
      const value = this.parseSum()
      const closing = this.peek()
      if (closing?.text !== ')') throw new ExpressionError('Missing closing parenthesis')
      this.position += 1
      return value
    }
    throw new ExpressionError(`Unexpected "${token.text}" in expression`)
  }
}

function stripLeadingEquals(expression: string): string {
  const trimmed = expression.trim()
  return trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
}

export function evaluateExpression(
  expression: string,
  variables: Readonly<Record<string, number>>,
): number {
  const source = stripLeadingEquals(expression)
  if (source.length === 0) throw new ExpressionError('Expression is empty')
  return new Parser(tokenize(source), variables).parse()
}

/** Parameter names an expression depends on, in first-seen order. */
export function expressionReferences(expression: string): string[] {
  let tokens: Token[]
  try {
    tokens = tokenize(stripLeadingEquals(expression))
  } catch {
    // An unparsable expression has no usable dependencies; the solver reports
    // the real error when it tries to evaluate it.
    return []
  }
  const names: string[] = []
  for (const token of tokens) {
    if (token.type === 'identifier' && !names.includes(token.text)) names.push(token.text)
  }
  return names
}
