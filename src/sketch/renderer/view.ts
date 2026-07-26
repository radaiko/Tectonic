import type { Vec2 } from '../domain/geometry'
import type { BoundingBox } from '../domain/hitTest'

/**
 * Pan/zoom state of the sketch canvas. `offset` is the world point sitting at
 * the centre of the viewport; screen Y is flipped so sketch Y points up.
 */
export interface SketchView {
  readonly width: number
  readonly height: number
  readonly scale: number
  readonly offset: Vec2
}

export const MIN_SCALE = 0.01
export const MAX_SCALE = 1000

export interface ViewInit {
  readonly scale?: number
  readonly offset?: Vec2
}

export function createView(width: number, height: number, init: ViewInit = {}): SketchView {
  return {
    width,
    height,
    scale: init.scale ?? 1,
    offset: init.offset ?? { x: 0, y: 0 },
  }
}

export function worldToScreen(view: SketchView, point: Vec2): Vec2 {
  return {
    x: view.width / 2 + (point.x - view.offset.x) * view.scale,
    y: view.height / 2 - (point.y - view.offset.y) * view.scale,
  }
}

export function screenToWorld(view: SketchView, point: Vec2): Vec2 {
  return {
    x: view.offset.x + (point.x - view.width / 2) / view.scale,
    y: view.offset.y - (point.y - view.height / 2) / view.scale,
  }
}

/** Drags the view by a screen-space delta. */
export function panView(view: SketchView, deltaX: number, deltaY: number): SketchView {
  return {
    ...view,
    offset: {
      x: view.offset.x - deltaX / view.scale,
      y: view.offset.y + deltaY / view.scale,
    },
  }
}

/** Zooms about a screen anchor, keeping the world point under it fixed. */
export function zoomView(view: SketchView, factor: number, anchor: Vec2): SketchView {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor))
  const before = screenToWorld(view, anchor)
  const zoomed = { ...view, scale }
  const after = screenToWorld(zoomed, anchor)
  return {
    ...zoomed,
    offset: {
      x: zoomed.offset.x + (before.x - after.x),
      y: zoomed.offset.y + (before.y - after.y),
    },
  }
}

export const FIT_MARGIN = 0.1

/** Frames a bounding box, leaving a margin around it. */
export function fitView(width: number, height: number, box: BoundingBox): SketchView {
  const offset = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }
  const spanX = box.maxX - box.minX
  const spanY = box.maxY - box.minY
  if (spanX <= 0 && spanY <= 0) return createView(width, height, { offset })

  const usableX = spanX > 0 ? (width * (1 - FIT_MARGIN)) / spanX : Number.POSITIVE_INFINITY
  const usableY = spanY > 0 ? (height * (1 - FIT_MARGIN)) / spanY : Number.POSITIVE_INFINITY
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(usableX, usableY)))
  return createView(width, height, { scale, offset })
}
