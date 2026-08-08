import type { SketchPlane } from '../sketch/domain/SketchSupport'

/**
 * What the user has picked, wherever they picked it.
 *
 * Modelling in a package like this one is selection-driven: you point at a face
 * and shell it, at an edge and round it. Until now the viewport could only
 * report "a plane was clicked" or "a face was clicked", each straight into one
 * hard-wired action, and every feature that needed a face or an edge asked for
 * its identifier as typed text. This is the type that replaces both — one
 * vocabulary the viewport speaks, the panels read, and the feature parameters
 * are filled from.
 */
export type SelectionItem =
  | { readonly kind: 'origin-plane'; readonly plane: SketchPlane }
  | { readonly kind: 'body'; readonly bodyId: string }
  | { readonly kind: 'face'; readonly bodyId: string; readonly faceId: string }
  | { readonly kind: 'edge'; readonly bodyId: string; readonly edgeId: string }
  | { readonly kind: 'sketch'; readonly sketchId: string }

export type SelectionKind = SelectionItem['kind']

export const SELECTION_KINDS: readonly SelectionKind[] = [
  'origin-plane',
  'body',
  'face',
  'edge',
  'sketch',
]

/** Nothing selected. Shared so an empty selection never re-renders anything. */
export const EMPTY_SELECTION: readonly SelectionItem[] = []

/**
 * A stable string for one selection, for keys, sets and equality.
 *
 * Built by hand rather than by `JSON.stringify` so it does not depend on the
 * order the fields happen to be written in.
 */
export function selectionKey(item: SelectionItem): string {
  switch (item.kind) {
    case 'origin-plane':
      return `origin-plane:${item.plane}`
    case 'body':
      return `body:${item.bodyId}`
    case 'face':
      return `face:${item.bodyId}:${item.faceId}`
    case 'edge':
      return `edge:${item.bodyId}:${item.edgeId}`
    case 'sketch':
      return `sketch:${item.sketchId}`
  }
}

export function sameSelection(a: SelectionItem, b: SelectionItem): boolean {
  return selectionKey(a) === selectionKey(b)
}

export function selectionIncludes(
  selection: readonly SelectionItem[],
  item: SelectionItem,
): boolean {
  const key = selectionKey(item)
  return selection.some((candidate) => selectionKey(candidate) === key)
}

/**
 * Adds an item, or removes it when it is already there.
 *
 * Toggling rather than always adding is what makes a modified click able to
 * take something back out of a selection without a separate gesture for it.
 */
export function toggleSelection(
  selection: readonly SelectionItem[],
  item: SelectionItem,
): SelectionItem[] {
  const key = selectionKey(item)
  const without = selection.filter((candidate) => selectionKey(candidate) !== key)
  return without.length === selection.length ? [...selection, item] : without
}

export function removeSelection(
  selection: readonly SelectionItem[],
  item: SelectionItem,
): SelectionItem[] {
  const key = selectionKey(item)
  return selection.filter((candidate) => selectionKey(candidate) !== key)
}

/**
 * The selection after a click on `item`.
 *
 * `extend` is the modifier key: held, the click adds to or removes from what is
 * already picked; without it the click replaces the lot, which is what a click
 * on empty space does too (`item` of null).
 */
export function applyPick(
  selection: readonly SelectionItem[],
  item: SelectionItem | null,
  extend: boolean,
): SelectionItem[] {
  if (!item) return extend ? [...selection] : []
  if (extend) return toggleSelection(selection, item)
  return selectionIncludes(selection, item) && selection.length === 1 ? [] : [item]
}

/** Just the items of one kind, in the order they were picked. */
export function selectionOfKind<K extends SelectionKind>(
  selection: readonly SelectionItem[],
  kind: K,
): Extract<SelectionItem, { kind: K }>[] {
  return selection.filter(
    (item): item is Extract<SelectionItem, { kind: K }> => item.kind === kind,
  )
}

/** Names things go by on screen, so a chip can read "Top face of Body 1". */
export interface SelectionNames {
  bodyName?(bodyId: string): string | undefined
  sketchName?(sketchId: string): string | undefined
}

/** How a selection reads to a user, and to a screen reader. */
export function describeSelection(item: SelectionItem, names: SelectionNames = {}): string {
  switch (item.kind) {
    case 'origin-plane':
      return `${item.plane} plane`
    case 'body':
      return names.bodyName?.(item.bodyId) ?? item.bodyId
    case 'face':
      return `${item.faceId} of ${names.bodyName?.(item.bodyId) ?? item.bodyId}`
    case 'edge':
      return `${item.edgeId} of ${names.bodyName?.(item.bodyId) ?? item.bodyId}`
    case 'sketch':
      return names.sketchName?.(item.sketchId) ?? item.sketchId
  }
}

/** How a whole selection reads, e.g. "2 faces, 1 edge". Empty reads as "nothing". */
export function describeSelectionCount(selection: readonly SelectionItem[]): string {
  if (selection.length === 0) return 'nothing selected'
  const counts = new Map<SelectionKind, number>()
  for (const item of selection) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
  return [...counts.entries()]
    .map(([kind, count]) => `${count} ${label(kind, count)}`)
    .join(', ')
}

function label(kind: SelectionKind, count: number): string {
  const singular = kind === 'origin-plane' ? 'plane' : kind
  if (count === 1) return singular
  return singular === 'body' ? 'bodies' : `${singular}s`
}

/**
 * The parameter value a feature stores for a selection: the bare identifiers,
 * in pick order. What the *feature* wants is the piece of geometry, and which
 * body it came from is already fixed by the feature's own body targets.
 */
export function selectionIds(
  selection: readonly SelectionItem[],
  kind: SelectionKind,
): string[] {
  const ids: string[] = []
  for (const item of selection) {
    if (item.kind !== kind) continue
    if (item.kind === 'face') ids.push(item.faceId)
    else if (item.kind === 'edge') ids.push(item.edgeId)
    else if (item.kind === 'body') ids.push(item.bodyId)
    else if (item.kind === 'sketch') ids.push(item.sketchId)
    else ids.push(item.plane)
  }
  return ids
}
