import { decodeBase64 } from './binary'
import { ExportError } from './types'

/**
 * Screenshots of the 3D viewport.
 *
 * The renderer is reached through the narrowest interface that does the job —
 * a canvas that can hand back a data URL, plus the three setters needed to
 * change size and clear colour — so nothing here depends on three.js and a test
 * can stand in for the whole thing. Drawing itself stays with the caller: only
 * the viewport knows which scene and camera belong together, so it passes a
 * `redraw` callback that the exporter invokes once the canvas is set up.
 *
 * Every capture restores the size and clear colour it found, because the same
 * renderer keeps drawing to the screen straight afterwards.
 */

export type ImageFormat = 'png' | 'jpeg'

/**
 * How big the capture should be. `screen` is the canvas as it stands; `2x` and
 * `4x` multiply both axes; an explicit size overrides both — and a `fit` size
 * preserves the viewport's aspect ratio inside the box rather than stretching.
 */
export type ImageResolution =
  | 'screen'
  | '2x'
  | '4x'
  | { readonly width: number; readonly height: number; readonly fit?: boolean }

/**
 * `current` keeps whatever the viewport is already clearing to, `white` forces
 * an opaque white sheet for printing, and `transparent` clears with alpha 0.
 */
export type ImageBackground = 'current' | 'white' | 'transparent'

export const IMAGE_MEDIA: Readonly<Record<ImageFormat, { extension: string; mimeType: string }>> = {
  png: { extension: '.png', mimeType: 'image/png' },
  jpeg: { extension: '.jpg', mimeType: 'image/jpeg' },
}

/** Above this the capture is refused rather than left to fail inside the GPU. */
export const MAX_IMAGE_DIMENSION = 16384

/** The slice of `HTMLCanvasElement` a capture reads back from. */
export interface ImageCanvas {
  readonly width: number
  readonly height: number
  toDataURL(type?: string, quality?: number): string
}

/** The slice of `THREE.WebGLRenderer` a capture drives. */
export interface ViewportRenderer {
  readonly domElement: ImageCanvas
  setSize(width: number, height: number, updateStyle?: boolean): void
  setClearColor?(color: number, alpha: number): void
  /** Reported so the capture can put the pixel ratio back afterwards. */
  getPixelRatio?(): number
  setPixelRatio?(ratio: number): void
}

export interface ImageExportOptions {
  readonly format?: ImageFormat
  readonly resolution?: ImageResolution
  readonly background?: ImageBackground
  /** JPEG quality in 0..1. Ignored by PNG, which is lossless. */
  readonly quality?: number
  /** Base name for the download; the format's extension is appended. */
  readonly fileName?: string
  /**
   * Redraws the scene at the current canvas size. Awaited, so a caller that
   * needs a frame to settle (a fresh render target, a texture upload) can.
   */
  readonly redraw: () => void | Promise<void>
}

/** A capture, as pixels plus everything a download needs. */
export interface CapturedImage {
  readonly fileName: string
  readonly mimeType: string
  readonly format: ImageFormat
  readonly width: number
  readonly height: number
  readonly dataUrl: string
  readonly bytes: Uint8Array
}

export const DEFAULT_JPEG_QUALITY = 0.92
/** Opaque white, as a packed RGB integer — what three's `setClearColor` wants. */
const WHITE = 0xffffff

/** The pixel size a resolution spec asks for, given the canvas it starts from. */
export function resolveImageSize(
  resolution: ImageResolution,
  base: { readonly width: number; readonly height: number },
): { readonly width: number; readonly height: number } {
  if (base.width <= 0 || base.height <= 0) {
    throw new ExportError('Cannot capture an image from a zero-sized viewport')
  }

  const size =
    resolution === 'screen'
      ? base
      : resolution === '2x'
        ? { width: base.width * 2, height: base.height * 2 }
        : resolution === '4x'
          ? { width: base.width * 4, height: base.height * 4 }
          : fitted(resolution, base)

  const width = Math.max(1, Math.round(size.width))
  const height = Math.max(1, Math.round(size.height))
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new ExportError(
      `Requested image is ${width}x${height}, beyond the ${MAX_IMAGE_DIMENSION} pixel limit`,
    )
  }
  return { width, height }
}

/** A custom size, shrunk to the viewport's aspect ratio when `fit` is asked for. */
function fitted(
  requested: { readonly width: number; readonly height: number; readonly fit?: boolean },
  base: { readonly width: number; readonly height: number },
): { readonly width: number; readonly height: number } {
  if (requested.fit !== true) return requested
  const scale = Math.min(requested.width / base.width, requested.height / base.height)
  return { width: base.width * scale, height: base.height * scale }
}

/**
 * JPEG has no alpha channel, so a transparent capture would come back with
 * black — or whatever the encoder felt like — behind the model. White is the
 * useful answer, and the caller finds out which background was actually used
 * from the returned value rather than being second-guessed silently.
 */
export function effectiveBackground(
  background: ImageBackground,
  format: ImageFormat,
): ImageBackground {
  return format === 'jpeg' && background === 'transparent' ? 'white' : background
}

/**
 * Renders the viewport once at the requested size and reads the pixels back.
 *
 * Anti-aliasing is a property of the renderer's context and cannot be turned on
 * after the fact, so a supersampled capture (`2x`, `4x`) is the reliable way to
 * get clean edges out of a renderer that was created without it.
 */
export async function captureViewportImage(
  renderer: ViewportRenderer,
  options: ImageExportOptions,
): Promise<CapturedImage> {
  const format = options.format ?? 'png'
  const media = IMAGE_MEDIA[format]
  const canvas = renderer.domElement
  const original = { width: canvas.width, height: canvas.height }
  const size = resolveImageSize(options.resolution ?? 'screen', original)
  const background = effectiveBackground(options.background ?? 'current', format)
  const pixelRatio = renderer.getPixelRatio?.()

  // The canvas is sized in device pixels here, so a viewport running at a
  // pixel ratio above 1 would otherwise multiply the request a second time.
  renderer.setPixelRatio?.(1)
  renderer.setSize(size.width, size.height, false)
  if (background !== 'current') {
    renderer.setClearColor?.(WHITE, background === 'white' ? 1 : 0)
  }

  let dataUrl: string
  try {
    await options.redraw()
    dataUrl = canvas.toDataURL(
      media.mimeType,
      format === 'jpeg' ? (options.quality ?? DEFAULT_JPEG_QUALITY) : undefined,
    )
  } finally {
    // Put the viewport back even if the draw threw — a half-resized renderer
    // would otherwise keep drawing at the capture size.
    if (pixelRatio !== undefined) renderer.setPixelRatio?.(pixelRatio)
    renderer.setSize(original.width, original.height, false)
  }

  if (!dataUrl.startsWith('data:')) {
    throw new ExportError('The viewport canvas did not return image data')
  }

  return {
    fileName: imageFileName(options.fileName ?? 'tectonic', format),
    mimeType: media.mimeType,
    format,
    width: size.width,
    height: size.height,
    dataUrl,
    bytes: dataUrlBytes(dataUrl),
  }
}

/** The base name with the format's extension, added only when it is missing. */
export function imageFileName(name: string, format: ImageFormat): string {
  const lower = name.toLowerCase()
  const extension = IMAGE_MEDIA[format].extension
  if (lower.endsWith(extension)) return name
  // .jpeg is as valid as .jpg; do not staple a second extension onto it.
  if (format === 'jpeg' && lower.endsWith('.jpeg')) return name
  return `${name}${extension}`
}

/** The payload of a `data:` URL as bytes, base64 or percent-encoded. */
export function dataUrlBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma === -1) {
    throw new ExportError('Not a data URL')
  }
  const header = dataUrl.slice(5, comma)
  const payload = dataUrl.slice(comma + 1)
  if (header.endsWith(';base64')) return decodeBase64(payload)

  const text = decodeURIComponent(payload)
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff
  return bytes
}

/** Triggers a browser download of a capture. */
export function downloadImage(image: CapturedImage): void {
  const blob = new Blob([image.bytes.slice().buffer as ArrayBuffer], { type: image.mimeType })
  const url = URL.createObjectURL(blob)

  const link = window.document.createElement('a')
  link.href = url
  link.download = image.fileName
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
