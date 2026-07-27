import { MotionError } from './types'

/**
 * A GIF89a encoder, so an animation can leave the app as a file anything opens.
 *
 * Colour is reduced to the 6×6×6 cube — 216 shades, the classic web-safe
 * palette. That is a deliberate trade: a per-frame median cut would look better
 * on a photograph, but a CAD viewport is flat shading over a flat background,
 * where the cube is nearly lossless and every frame can share one global table.
 * One table means no local tables and no per-frame quantisation pass.
 */

/** Levels per channel in the palette cube. */
const LEVELS = 6
const PALETTE_SIZE = 256
const MAX_CODE = 4095

export interface GifFrame {
  /** Row-major RGBA bytes, four per pixel — what `getImageData` hands back. */
  readonly rgba: Uint8Array | Uint8ClampedArray
  /** Overrides the animation-wide delay for this frame, in milliseconds. */
  readonly delayMs?: number
}

export interface GifOptions {
  readonly width: number
  readonly height: number
  /** Frame delay in milliseconds. GIF stores hundredths, so this is rounded. */
  readonly delayMs?: number
  /** 0 loops forever, which is what a mechanism animation wants. */
  readonly loopCount?: number
}

/** The 256-entry global colour table: the 6×6×6 cube, then black padding. */
export function webSafePalette(): Uint8Array {
  const palette = new Uint8Array(PALETTE_SIZE * 3)
  let at = 0
  for (let r = 0; r < LEVELS; r += 1) {
    for (let g = 0; g < LEVELS; g += 1) {
      for (let b = 0; b < LEVELS; b += 1) {
        palette[at] = Math.round((r * 255) / (LEVELS - 1))
        palette[at + 1] = Math.round((g * 255) / (LEVELS - 1))
        palette[at + 2] = Math.round((b * 255) / (LEVELS - 1))
        at += 3
      }
    }
  }
  return palette
}

/** The palette index closest to a colour. */
export function quantize(red: number, green: number, blue: number): number {
  const level = (value: number): number =>
    Math.min(LEVELS - 1, Math.max(0, Math.round((value / 255) * (LEVELS - 1))))
  return level(red) * LEVELS * LEVELS + level(green) * LEVELS + level(blue)
}

/** RGBA pixels reduced to one palette index each. */
export function indexFrame(rgba: Uint8Array | Uint8ClampedArray, pixels: number): Uint8Array {
  const indices = new Uint8Array(pixels)
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const at = pixel * 4
    indices[pixel] = quantize(rgba[at] ?? 0, rgba[at + 1] ?? 0, rgba[at + 2] ?? 0)
  }
  return indices
}

/**
 * GIF's variable-width LZW.
 *
 * Codes start one bit wider than the pixel depth and grow as the dictionary
 * fills. When it reaches 4095 the encoder emits a clear code and starts the
 * dictionary again — that reset is what keeps the codes from overflowing the
 * twelve bits the format allows.
 */
export function lzwEncode(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1

  const output: number[] = []
  let bitBuffer = 0
  let bitCount = 0
  let codeSize = minCodeSize + 1

  const emit = (code: number): void => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff)
      bitBuffer >>= 8
      bitCount -= 8
    }
  }

  let dictionary = new Map<string, number>()
  let nextCode = endCode + 1
  const resetDictionary = (): void => {
    dictionary = new Map<string, number>()
    nextCode = endCode + 1
    codeSize = minCodeSize + 1
  }

  emit(clearCode)
  resetDictionary()

  let prefix = indices.length > 0 ? String(indices[0]) : ''
  let prefixCode = indices[0] ?? 0

  for (let at = 1; at < indices.length; at += 1) {
    const next = indices[at] as number
    const candidate = `${prefix},${next}`
    const known = dictionary.get(candidate)

    if (known !== undefined) {
      prefix = candidate
      prefixCode = known
      continue
    }

    emit(prefixCode)
    if (nextCode > MAX_CODE) {
      emit(clearCode)
      resetDictionary()
    } else {
      // The width grows just before the first code that would not fit it — the
      // decoder widens at the same point, so the two stay in step.
      if (nextCode >= 1 << codeSize && codeSize < 12) codeSize += 1
      dictionary.set(candidate, nextCode)
      nextCode += 1
    }
    prefix = String(next)
    prefixCode = next
  }

  if (indices.length > 0) emit(prefixCode)
  emit(endCode)
  if (bitCount > 0) output.push(bitBuffer & 0xff)

  return Uint8Array.from(output)
}

/** LZW output wrapped in GIF's length-prefixed sub-blocks, 255 bytes each. */
export function subBlocks(data: Uint8Array): number[] {
  const bytes: number[] = []
  for (let at = 0; at < data.length; at += 255) {
    const chunk = data.subarray(at, at + 255)
    bytes.push(chunk.length, ...chunk)
  }
  bytes.push(0)
  return bytes
}

/** The frames as one animated GIF89a file. */
export function encodeGif(frames: readonly GifFrame[], options: GifOptions): Uint8Array {
  const { width, height } = options
  if (!(width > 0) || !(height > 0)) {
    throw new MotionError(`A GIF needs a positive size, got ${width}×${height}`)
  }
  if (frames.length === 0) throw new MotionError('A GIF needs at least one frame')

  const pixels = width * height
  const bytes: number[] = []

  // Header and logical screen descriptor.
  bytes.push(...asciiBytes('GIF89a'))
  bytes.push(...uint16(width), ...uint16(height))
  // Global table present, 8-bit colour resolution, 256 entries.
  bytes.push(0xf7, 0x00, 0x00)
  bytes.push(...webSafePalette())

  // Netscape looping extension.
  bytes.push(0x21, 0xff, 0x0b)
  bytes.push(...asciiBytes('NETSCAPE2.0'))
  bytes.push(0x03, 0x01, ...uint16(options.loopCount ?? 0), 0x00)

  const defaultDelay = options.delayMs ?? 100
  for (const frame of frames) {
    if (frame.rgba.length < pixels * 4) {
      throw new MotionError(
        `Frame has ${frame.rgba.length} bytes but ${width}×${height} needs ${pixels * 4}`,
      )
    }

    // Graphic control extension: delay is in hundredths of a second.
    const hundredths = Math.max(1, Math.round((frame.delayMs ?? defaultDelay) / 10))
    bytes.push(0x21, 0xf9, 0x04, 0x00, ...uint16(hundredths), 0x00, 0x00)

    // Image descriptor: full frame, no local table, not interlaced.
    bytes.push(0x2c, ...uint16(0), ...uint16(0), ...uint16(width), ...uint16(height), 0x00)
    bytes.push(0x08)
    bytes.push(...subBlocks(lzwEncode(indexFrame(frame.rgba, pixels), 8)))
  }

  bytes.push(0x3b)
  return Uint8Array.from(bytes)
}

function uint16(value: number): [number, number] {
  return [value & 0xff, (value >> 8) & 0xff]
}

function asciiBytes(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0))
}
