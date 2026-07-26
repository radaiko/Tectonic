import { ImportError } from './types'

/**
 * A minimal XML reader for the markup formats the I/O layer touches. Kept in
 * house rather than reaching for `DOMParser` so importers stay pure TypeScript
 * and run identically under the browser, a worker and the test runner.
 *
 * It understands elements, attributes, self-closing tags and text — enough for
 * SVG and 3MF, and deliberately no more. No entities beyond the five built-ins,
 * no namespaces resolution, no validation.
 */

export interface XmlNode {
  readonly tag: string
  readonly attrs: Readonly<Record<string, string>>
  readonly children: readonly XmlNode[]
  /** Direct text content, with the standard entities decoded. */
  readonly text: string
}

const TAG_PATTERN = /<\/?([A-Za-z_][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
const ATTR_PATTERN = /([\w.:-]+)\s*=\s*"([^"]*)"|([\w.:-]+)\s*=\s*'([^']*)'/g

/** Strips comments, CDATA, doctypes and processing instructions. */
function stripNonElements(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?>/gi, '')
}

export function decodeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

export function encodeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  ATTR_PATTERN.lastIndex = 0
  let match = ATTR_PATTERN.exec(source)
  while (match) {
    const name = match[1] ?? match[3]
    const value = match[2] ?? match[4]
    if (name !== undefined && value !== undefined) attrs[name] = decodeXmlText(value)
    match = ATTR_PATTERN.exec(source)
  }
  return attrs
}

interface MutableNode {
  tag: string
  attrs: Record<string, string>
  children: MutableNode[]
  text: string
}

/** Parses the document and returns its root element. */
export function parseXml(source: string): XmlNode {
  const text = stripNonElements(source)
  const stack: MutableNode[] = []
  let root: MutableNode | null = null
  let cursor = 0

  TAG_PATTERN.lastIndex = 0
  let match = TAG_PATTERN.exec(text)
  while (match) {
    const [whole, tag = '', attrSource = '', selfClosing = ''] = match
    const parent = stack[stack.length - 1]
    if (parent) parent.text += decodeXmlText(text.slice(cursor, match.index))

    if (whole.startsWith('</')) {
      const open = stack.pop()
      if (!open) throw new ImportError(`Closing tag </${tag}> has no opening tag`)
      if (open.tag !== tag) {
        throw new ImportError(`Closing tag </${tag}> does not match <${open.tag}>`)
      }
    } else {
      const node: MutableNode = { tag, attrs: parseAttrs(attrSource), children: [], text: '' }
      if (parent) parent.children.push(node)
      else if (root) throw new ImportError('XML document has more than one root element')
      else root = node
      if (selfClosing !== '/') stack.push(node)
    }

    cursor = match.index + whole.length
    match = TAG_PATTERN.exec(text)
  }

  if (stack.length > 0) throw new ImportError(`Unclosed XML element <${(stack[0] as MutableNode).tag}>`)
  if (!root) throw new ImportError('No XML element found')
  return root
}

/** Depth-first walk over the node and everything beneath it. */
export function* walkXml(node: XmlNode): Generator<XmlNode> {
  yield node
  for (const child of node.children) yield* walkXml(child)
}

/** Every descendant with the given local tag name, namespace prefix ignored. */
export function findAll(node: XmlNode, tag: string): XmlNode[] {
  const wanted = tag.toLowerCase()
  return [...walkXml(node)].filter((candidate) => localName(candidate.tag) === wanted)
}

export function localName(tag: string): string {
  const colon = tag.indexOf(':')
  return (colon === -1 ? tag : tag.slice(colon + 1)).toLowerCase()
}
