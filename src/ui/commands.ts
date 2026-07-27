/**
 * Commands are the palette's unit of work: a label, an optional shortcut hint
 * and something to run. The shell collects them from wherever they are defined
 * — the app itself, the open editor — so the palette stays a dumb list.
 */
export interface Command {
  /** Stable across renders; used as the React key and for de-duplication. */
  readonly id: string
  readonly title: string
  /** Grouping label shown beside the title, e.g. 'File' or 'Sketch'. */
  readonly category: string
  /** How the same action is reached from the keyboard, e.g. 'Ctrl+S'. */
  readonly shortcut?: string
  readonly run: () => void
}

/**
 * Commands matching every whitespace-separated term in the query, searching
 * category and title together so "sketch line" and "line" both find the line
 * tool. An empty query keeps the list in its declared order.
 */
export function filterCommands(
  commands: readonly Command[],
  query: string,
): readonly Command[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return commands
  return commands.filter((command) => {
    const haystack = `${command.category} ${command.title}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
