import type { Vec2 } from './geometry'
import { newId } from './ids'

/**
 * A raster image placed on the sketch plane, to trace over.
 *
 * The image is stored as a data URL rather than a file reference, because a
 * .tectonic document is a single self-contained file — a path to something on
 * the author's disk would be worthless to anyone else opening it.
 *
 * Placement is described the way the user manipulates it: a centre in sketch
 * coordinates, a uniform scale in sketch units per pixel, and a rotation. That
 * makes dragging a corner a change to two numbers rather than a matrix, and it
 * guarantees the image can never be sheared out of shape.
 */

export type ImageHandle = 'bottomLeft' | 'bottomRight' | 'topRight' | 'topLeft'

/** The four corner handles, counter-clockwise from the bottom left. */
export const IMAGE_HANDLES: readonly ImageHandle[] = [
  'bottomLeft',
  'bottomRight',
  'topRight',
  'topLeft',
]

export interface SketchImageJSON {
  readonly id: string
  readonly name: string
  /** `data:image/png;base64,...` — the pixels, inline. */
  readonly dataUrl: string
  readonly mimeType: string
  readonly pixelWidth: number
  readonly pixelHeight: number
  /** Centre of the image, in sketch coordinates. */
  readonly x: number
  readonly y: number
  /** Sketch units per pixel. */
  readonly scale: number
  /** Counter-clockwise, in radians. */
  readonly rotation: number
  readonly opacity: number
  readonly locked: boolean
  readonly visible: boolean
}

export interface SketchImageInit {
  readonly id?: string
  readonly name?: string
  readonly dataUrl: string
  readonly mimeType?: string
  readonly pixelWidth: number
  readonly pixelHeight: number
  readonly x?: number
  readonly y?: number
  readonly scale?: number
  readonly rotation?: number
  readonly opacity?: number
  readonly locked?: boolean
  readonly visible?: boolean
}

export const DEFAULT_IMAGE_OPACITY = 0.5

export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_OPACITY
  return Math.min(1, Math.max(0, value))
}

export class SketchImage {
  readonly id: string
  name: string
  readonly dataUrl: string
  readonly mimeType: string
  readonly pixelWidth: number
  readonly pixelHeight: number
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean

  constructor(init: SketchImageInit) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Image'
    this.dataUrl = init.dataUrl
    this.mimeType = init.mimeType ?? mimeFromDataUrl(init.dataUrl)
    // A zero-pixel image would make every derived size zero and every scale
    // calculation a division by zero, so it is clamped rather than trusted.
    this.pixelWidth = Math.max(1, Math.round(init.pixelWidth))
    this.pixelHeight = Math.max(1, Math.round(init.pixelHeight))
    this.x = init.x ?? 0
    this.y = init.y ?? 0
    this.scale = init.scale !== undefined && init.scale > 0 ? init.scale : 1
    this.rotation = init.rotation ?? 0
    this.opacity = clampOpacity(init.opacity ?? DEFAULT_IMAGE_OPACITY)
    this.locked = init.locked ?? false
    this.visible = init.visible ?? true
  }

  /** Width on the sketch plane, in sketch units. */
  get width(): number {
    return this.pixelWidth * this.scale
  }

  get height(): number {
    return this.pixelHeight * this.scale
  }

  get center(): Vec2 {
    return { x: this.x, y: this.y }
  }

  toJSON(): SketchImageJSON {
    return {
      id: this.id,
      name: this.name,
      dataUrl: this.dataUrl,
      mimeType: this.mimeType,
      pixelWidth: this.pixelWidth,
      pixelHeight: this.pixelHeight,
      x: this.x,
      y: this.y,
      scale: this.scale,
      rotation: this.rotation,
      opacity: this.opacity,
      locked: this.locked,
      visible: this.visible,
    }
  }

  static fromJSON(json: SketchImageJSON): SketchImage {
    return new SketchImage(json)
  }

  clone(): SketchImage {
    return SketchImage.fromJSON(this.toJSON())
  }
}

/** The mime type a data URL declares, defaulting to PNG when it declares none. */
export function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl)
  return match?.[1] ?? 'image/png'
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                   */
/* -------------------------------------------------------------------------- */

/** Sketch-space corners, counter-clockwise from the bottom left. */
export function imageCorners(image: SketchImage): Vec2[] {
  const halfWidth = image.width / 2
  const halfHeight = image.height / 2
  const local: Vec2[] = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]
  return local.map((point) => toWorld(image, point))
}

/** The corner a handle names. */
export function imageHandlePoint(image: SketchImage, handle: ImageHandle): Vec2 {
  return imageCorners(image)[IMAGE_HANDLES.indexOf(handle)] as Vec2
}

/** Which handle sits under a point, or `null` when none is within `tolerance`. */
export function imageHandleAt(
  image: SketchImage,
  point: Vec2,
  tolerance: number,
): ImageHandle | null {
  const corners = imageCorners(image)
  for (let index = 0; index < IMAGE_HANDLES.length; index += 1) {
    const corner = corners[index] as Vec2
    if (Math.hypot(corner.x - point.x, corner.y - point.y) <= tolerance) {
      return IMAGE_HANDLES[index] as ImageHandle
    }
  }
  return null
}

/** Whether a sketch point falls inside the image's footprint. */
export function imageContains(image: SketchImage, point: Vec2): boolean {
  const local = toLocal(image, point)
  return Math.abs(local.x) <= image.width / 2 && Math.abs(local.y) <= image.height / 2
}

/** The image moved so its centre lands on `point`. Locked images do not move. */
export function moveImage(image: SketchImage, point: Vec2): SketchImage {
  if (image.locked) return image
  const moved = image.clone()
  moved.x = point.x
  moved.y = point.y
  return moved
}

/** Smallest scale that keeps the image inside a box `width` x `height`. */
export function fitScale(
  image: { readonly pixelWidth: number; readonly pixelHeight: number },
  width: number,
  height: number,
): number {
  if (width <= 0 || height <= 0) return 1
  return Math.min(width / image.pixelWidth, height / image.pixelHeight)
}

export const MIN_IMAGE_SCALE = 1e-6

/**
 * Rescales the image by dragging one corner, pinning the opposite one.
 *
 * The drag is projected onto the image's own diagonal rather than taken at face
 * value, so the aspect ratio survives however the pointer wanders — a corner
 * handle in every CAD package scales uniformly, and a sheared trace would be
 * useless anyway.
 */
export function resizeFromHandle(
  image: SketchImage,
  handle: ImageHandle,
  point: Vec2,
): SketchImage {
  if (image.locked) return image

  const opposite = IMAGE_HANDLES[(IMAGE_HANDLES.indexOf(handle) + 2) % 4] as ImageHandle
  const anchor = imageHandlePoint(image, opposite)
  const dragged = toLocal(image, point)
  const pinned = toLocal(image, anchor)

  const spanX = Math.abs(dragged.x - pinned.x)
  const spanY = Math.abs(dragged.y - pinned.y)
  // Whichever axis the pointer stretched further wins, which is what makes the
  // handle feel like it follows the corner without ever distorting the image.
  const factor = Math.max(spanX / image.width, spanY / image.height)
  const scale = Math.max(MIN_IMAGE_SCALE, image.scale * factor)

  const resized = image.clone()
  resized.scale = scale
  // Keep the pinned corner where it was: it is half the new diagonal away from
  // the centre, in the same direction it always was.
  const halfWidth = (resized.width / 2) * Math.sign(pinned.x || 1)
  const halfHeight = (resized.height / 2) * Math.sign(pinned.y || 1)
  const offset = rotate({ x: halfWidth, y: halfHeight }, image.rotation)
  resized.x = anchor.x - offset.x
  resized.y = anchor.y - offset.y
  return resized
}

/** The image rotated to `radians` about its own centre. */
export function rotateImage(image: SketchImage, radians: number): SketchImage {
  if (image.locked) return image
  const rotated = image.clone()
  rotated.rotation = radians
  return rotated
}

/** The image with a new opacity, clamped into 0..1. */
export function setImageOpacity(image: SketchImage, opacity: number): SketchImage {
  const updated = image.clone()
  updated.opacity = clampOpacity(opacity)
  return updated
}

/** The image with its lock flipped. Locking is always allowed, unlike moving. */
export function setImageLocked(image: SketchImage, locked: boolean): SketchImage {
  const updated = image.clone()
  updated.locked = locked
  return updated
}

/** Axis-aligned extent of the placed image, rotation included. */
export function imageBounds(image: SketchImage): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
} {
  const corners = imageCorners(image)
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

function rotate(point: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }
}

function toWorld(image: SketchImage, local: Vec2): Vec2 {
  const turned = rotate(local, image.rotation)
  return { x: image.x + turned.x, y: image.y + turned.y }
}

function toLocal(image: SketchImage, world: Vec2): Vec2 {
  return rotate({ x: world.x - image.x, y: world.y - image.y }, -image.rotation)
}
