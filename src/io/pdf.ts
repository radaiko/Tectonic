/**
 * Just enough PDF to write a drawing sheet: indirect objects, one content
 * stream and a cross-reference table.
 *
 * Everything emitted is ASCII, which is what lets the writer use string offsets
 * as byte offsets when it builds the xref table. Any character above 0x7e in a
 * text string is escaped to its octal form on the way in.
 */

export const PDF_VERSION = '1.4'
/** Every xref entry is exactly twenty bytes; the format below produces that. */
const XREF_ENTRY_BYTES = 20

/** Escapes a string for use inside PDF `( ... )` literal syntax. */
export function pdfString(text: string): string {
  let out = '('
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (character === '(' || character === ')' || character === '\\') out += `\\${character}`
    else if (code < 0x20 || code > 0x7e) out += `\\${(code & 0xff).toString(8).padStart(3, '0')}`
    else out += character
  }
  return `${out})`
}

/** PDF date syntax: D:YYYYMMDDHHmmSS with no timezone, i.e. UTC here. */
export function pdfDate(date: Date): string {
  const pad = (value: number, width = 2): string => String(value).padStart(width, '0')
  return (
    `D:${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** A number as PDF wants it: no exponent, no trailing zeroes. */
export function pdfNumber(value: number, precision = 3): string {
  if (!Number.isFinite(value)) return '0'
  const fixed = value.toFixed(precision)
  const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
  return trimmed === '-0' || trimmed === '' ? '0' : trimmed
}

export interface PdfInfo {
  readonly title?: string
  readonly author?: string
  readonly subject?: string
  readonly creationDate?: Date
}

/**
 * Collects indirect objects and serialises the file. Object numbers start at 1
 * and are handed out in the order objects are added.
 */
export class PdfWriter {
  readonly #objects: string[] = []

  /** Adds an object and returns its number. */
  add(body: string): number {
    this.#objects.push(body)
    return this.#objects.length
  }

  /** Adds a stream object, filling in the `/Length` the dictionary needs. */
  addStream(content: string, extraDictionary = ''): number {
    return this.add(
      `<< /Length ${content.length}${extraDictionary} >>\nstream\n${content}\nendstream`,
    )
  }

  get count(): number {
    return this.#objects.length
  }

  /** The whole file, with the xref table addressing the objects added so far. */
  build(rootObject: number, infoObject?: number): string {
    let out = `%PDF-${PDF_VERSION}\n`
    const offsets: number[] = []

    this.#objects.forEach((body, index) => {
      offsets.push(out.length)
      out += `${index + 1} 0 obj\n${body}\nendobj\n`
    })

    const xrefOffset = out.length
    const size = this.#objects.length + 1
    out += `xref\n0 ${size}\n`
    out += `${'0'.repeat(10)} 65535 f \n`
    for (const offset of offsets) {
      out += `${String(offset).padStart(10, '0')} 00000 n \n`
    }

    const info = infoObject === undefined ? '' : ` /Info ${infoObject} 0 R`
    out += `trailer\n<< /Size ${size} /Root ${rootObject} 0 R${info} >>\n`
    out += `startxref\n${xrefOffset}\n%%EOF\n`
    return out
  }
}

/** Builds the `/Info` dictionary body for the given metadata. */
export function infoDictionary(info: PdfInfo): string {
  const parts = ['/Producer (Tectonic)']
  if (info.title !== undefined) parts.push(`/Title ${pdfString(info.title)}`)
  if (info.author !== undefined) parts.push(`/Author ${pdfString(info.author)}`)
  if (info.subject !== undefined) parts.push(`/Subject ${pdfString(info.subject)}`)
  if (info.creationDate !== undefined) {
    parts.push(`/CreationDate ${pdfString(pdfDate(info.creationDate))}`)
  }
  return `<< ${parts.join(' ')} >>`
}

/** Accumulates content-stream operators. */
export class PdfContent {
  readonly #operators: string[] = []
  readonly #precision: number

  constructor(precision = 3) {
    this.#precision = precision
  }

  op(text: string): this {
    this.#operators.push(text)
    return this
  }

  /** Stroke colour and width for everything that follows. */
  stroke(gray: number, width: number): this {
    return this.op(`${this.#n(gray)} G`).op(`${this.#n(width)} w`)
  }

  fillGray(gray: number): this {
    return this.op(`${this.#n(gray)} g`)
  }

  dash(pattern: readonly number[], phase = 0): this {
    const values = pattern.map((value) => this.#n(value)).join(' ')
    return this.op(`[${values}] ${this.#n(phase)} d`)
  }

  moveTo(x: number, y: number): this {
    return this.op(`${this.#n(x)} ${this.#n(y)} m`)
  }

  lineTo(x: number, y: number): this {
    return this.op(`${this.#n(x)} ${this.#n(y)} l`)
  }

  line(x1: number, y1: number, x2: number, y2: number): this {
    return this.moveTo(x1, y1).lineTo(x2, y2).op('S')
  }

  rect(x: number, y: number, width: number, height: number): this {
    return this.op(
      `${this.#n(x)} ${this.#n(y)} ${this.#n(width)} ${this.#n(height)} re`,
    )
  }

  /** A filled polygon, used for the arrowheads. */
  polygon(points: readonly (readonly [number, number])[]): this {
    const [first, ...rest] = points
    if (!first) return this
    this.moveTo(first[0], first[1])
    for (const [x, y] of rest) this.lineTo(x, y)
    return this.op('f')
  }

  text(x: number, y: number, size: number, value: string, font = 'F1'): this {
    return this.op(
      `BT /${font} ${this.#n(size)} Tf ${this.#n(x)} ${this.#n(y)} Td ${pdfString(value)} Tj ET`,
    )
  }

  save(): this {
    return this.op('q')
  }

  restore(): this {
    return this.op('Q')
  }

  toString(): string {
    return this.#operators.join('\n')
  }

  #n(value: number): string {
    return pdfNumber(value, this.#precision)
  }
}

/** Exposed for the test that checks the xref table is well formed. */
export const PDF_XREF_ENTRY_BYTES = XREF_ENTRY_BYTES
