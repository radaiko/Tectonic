import { describe, expect, it } from 'vitest'
import {
  applyPick,
  describeSelection,
  describeSelectionCount,
  removeSelection,
  sameSelection,
  selectionIds,
  selectionIncludes,
  selectionKey,
  selectionOfKind,
  toggleSelection,
} from '../../src/view/selection'
import type { SelectionItem } from '../../src/view/selection'

const FACE: SelectionItem = { kind: 'face', bodyId: 'body-1', faceId: 'face-0' }
const OTHER_FACE: SelectionItem = { kind: 'face', bodyId: 'body-1', faceId: 'face-3' }
const EDGE: SelectionItem = { kind: 'edge', bodyId: 'body-1', edgeId: 'edge-7' }
const BODY: SelectionItem = { kind: 'body', bodyId: 'body-1' }
const PLANE: SelectionItem = { kind: 'origin-plane', plane: 'XZ' }

describe('selection keys', () => {
  it('tells a face apart from an edge with the same ordinal', () => {
    expect(
      selectionKey({ kind: 'face', bodyId: 'b', faceId: '0' }) ===
        selectionKey({ kind: 'edge', bodyId: 'b', edgeId: '0' }),
    ).toBe(false)
  })

  it('tells the same face on two bodies apart', () => {
    expect(
      sameSelection(FACE, { kind: 'face', bodyId: 'body-2', faceId: 'face-0' }),
    ).toBe(false)
  })

  it('treats two references to the same face as one', () => {
    expect(sameSelection(FACE, { kind: 'face', bodyId: 'body-1', faceId: 'face-0' })).toBe(true)
  })
})

describe('building a selection', () => {
  it('adds something new and removes it on a second toggle', () => {
    const once = toggleSelection([], FACE)
    expect(once).toEqual([FACE])
    expect(toggleSelection(once, FACE)).toEqual([])
  })

  it('keeps pick order, which is what a variable-radius fillet reads', () => {
    const selection = toggleSelection(toggleSelection([], OTHER_FACE), FACE)

    expect(selection.map(selectionKey)).toEqual([selectionKey(OTHER_FACE), selectionKey(FACE)])
  })

  it('drops one item without disturbing the rest', () => {
    expect(removeSelection([FACE, EDGE], FACE)).toEqual([EDGE])
  })

  it('reports membership', () => {
    expect(selectionIncludes([FACE, EDGE], EDGE)).toBe(true)
    expect(selectionIncludes([FACE], EDGE)).toBe(false)
  })
})

describe('a click in the viewport', () => {
  it('replaces the selection with what was clicked', () => {
    expect(applyPick([FACE, EDGE], OTHER_FACE, false)).toEqual([OTHER_FACE])
  })

  it('adds to the selection when the modifier is held', () => {
    expect(applyPick([FACE], EDGE, true)).toEqual([FACE, EDGE])
  })

  it('takes something back out when the modifier is held over it', () => {
    expect(applyPick([FACE, EDGE], FACE, true)).toEqual([EDGE])
  })

  it('clears the selection on a click into empty space', () => {
    expect(applyPick([FACE, EDGE], null, false)).toEqual([])
  })

  it('leaves the selection alone on a modified click into empty space', () => {
    // Missing the target while adding to a selection should not throw the whole
    // selection away — that is the one misclick with the highest cost.
    expect(applyPick([FACE, EDGE], null, true)).toEqual([FACE, EDGE])
  })

  it('deselects the single thing that was already selected', () => {
    expect(applyPick([FACE], FACE, false)).toEqual([])
  })
})

describe('reading a selection', () => {
  it('filters to one kind', () => {
    expect(selectionOfKind([FACE, EDGE, BODY], 'edge')).toEqual([EDGE])
  })

  it('hands a feature the bare identifiers it stores', () => {
    expect(selectionIds([FACE, OTHER_FACE, EDGE], 'face')).toEqual(['face-0', 'face-3'])
    expect(selectionIds([FACE, EDGE], 'edge')).toEqual(['edge-7'])
    expect(selectionIds([BODY], 'body')).toEqual(['body-1'])
    expect(selectionIds([PLANE], 'origin-plane')).toEqual(['XZ'])
  })

  it('describes an item using the names things go by on screen', () => {
    expect(describeSelection(BODY, { bodyName: () => 'Bracket body' })).toBe('Bracket body')
    expect(describeSelection(FACE, { bodyName: () => 'Bracket body' })).toBe(
      'face-0 of Bracket body',
    )
    expect(describeSelection(PLANE)).toBe('XZ plane')
  })

  it('falls back to the identifier when there is no name for it', () => {
    expect(describeSelection(BODY)).toBe('body-1')
  })

  it('counts a mixed selection in plain words', () => {
    expect(describeSelectionCount([])).toBe('nothing selected')
    expect(describeSelectionCount([FACE])).toBe('1 face')
    expect(describeSelectionCount([FACE, OTHER_FACE, EDGE])).toBe('2 faces, 1 edge')
    expect(describeSelectionCount([BODY, { kind: 'body', bodyId: 'body-2' }])).toBe('2 bodies')
  })
})
