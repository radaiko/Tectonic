import type { ViewportLayoutId } from './types'

/** A pane's place inside the frame, in CSS pixels from the top-left corner. */
export interface ViewportRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Where the splitters sit, as a fraction of the frame. `vertical` is the x
 * position of the vertical splitter, `horizontal` the y position of the
 * horizontal one; layouts that have only one splitter ignore the other.
 */
export interface LayoutSplit {
  readonly vertical: number
  readonly horizontal: number
}

export const DEFAULT_SPLIT: LayoutSplit = { vertical: 0.5, horizontal: 0.5 }

/** Splitters cannot be dragged closer than this to an edge, in fractions. */
export const MIN_PANE_FRACTION = 0.1

export interface ViewportLayout {
  readonly id: ViewportLayoutId
  readonly label: string
  readonly panes: number
}

export const VIEWPORT_LAYOUTS: readonly ViewportLayout[] = [
  { id: 'single', label: 'Single', panes: 1 },
  { id: 'twoHorizontal', label: 'Two side by side', panes: 2 },
  { id: 'twoVertical', label: 'Two stacked', panes: 2 },
  { id: 'quad', label: 'Four', panes: 4 },
]

export const MAX_VIEWPORTS = 4

export function layoutById(id: ViewportLayoutId): ViewportLayout {
  const layout = VIEWPORT_LAYOUTS.find((candidate) => candidate.id === id)
  if (!layout) throw new Error(`Unknown viewport layout: ${String(id)}`)
  return layout
}

export function paneCount(id: ViewportLayoutId): number {
  return layoutById(id).panes
}

/** The splitters a layout actually shows, in the order they are rendered. */
export function layoutHandles(id: ViewportLayoutId): readonly ('vertical' | 'horizontal')[] {
  switch (id) {
    case 'single':
      return []
    case 'twoHorizontal':
      return ['vertical']
    case 'twoVertical':
      return ['horizontal']
    case 'quad':
      return ['vertical', 'horizontal']
  }
}

/**
 * Pane rectangles for a layout, in pane order: left to right, then top to
 * bottom. Rounded to whole pixels so neighbouring panes share an exact edge and
 * no seam shows between them.
 */
export function layoutRects(
  id: ViewportLayoutId,
  width: number,
  height: number,
  split: LayoutSplit = DEFAULT_SPLIT,
): ViewportRect[] {
  const frameWidth = Math.max(0, width)
  const frameHeight = Math.max(0, height)
  const midX = Math.round(frameWidth * clampFraction(split.vertical))
  const midY = Math.round(frameHeight * clampFraction(split.horizontal))

  switch (id) {
    case 'single':
      return [{ x: 0, y: 0, width: frameWidth, height: frameHeight }]
    case 'twoHorizontal':
      return [
        { x: 0, y: 0, width: midX, height: frameHeight },
        { x: midX, y: 0, width: frameWidth - midX, height: frameHeight },
      ]
    case 'twoVertical':
      return [
        { x: 0, y: 0, width: frameWidth, height: midY },
        { x: 0, y: midY, width: frameWidth, height: frameHeight - midY },
      ]
    case 'quad':
      return [
        { x: 0, y: 0, width: midX, height: midY },
        { x: midX, y: 0, width: frameWidth - midX, height: midY },
        { x: 0, y: midY, width: midX, height: frameHeight - midY },
        { x: midX, y: midY, width: frameWidth - midX, height: frameHeight - midY },
      ]
  }
}

/** The pane a point falls in, or -1 when the frame has no area. */
export function paneAt(
  id: ViewportLayoutId,
  width: number,
  height: number,
  x: number,
  y: number,
  split: LayoutSplit = DEFAULT_SPLIT,
): number {
  const rects = layoutRects(id, width, height, split)
  return rects.findIndex(
    (rect) =>
      rect.width > 0 &&
      rect.height > 0 &&
      x >= rect.x &&
      x < rect.x + rect.width &&
      y >= rect.y &&
      y < rect.y + rect.height,
  )
}

/** Moves one splitter, keeping every pane at least {@link MIN_PANE_FRACTION} wide. */
export function moveSplit(
  split: LayoutSplit,
  handle: 'vertical' | 'horizontal',
  fraction: number,
): LayoutSplit {
  return { ...split, [handle]: clampFraction(fraction) }
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1 - MIN_PANE_FRACTION, Math.max(MIN_PANE_FRACTION, value))
}
