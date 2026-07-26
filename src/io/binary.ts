/**
 * Byte plumbing shared by the binary formats. Everything here is written
 * against `Uint8Array` and plain arithmetic so the same code runs in the
 * browser, in a worker and under the test runner without `Buffer`, `btoa` or
 * any other host-specific helper.
 */

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Reverse lookup for `decodeBase64`, built once from the alphabet. */
const BASE64_VALUES = ((): Readonly<Record<string, number>> => {
  const values: Record<string, number> = {}
  for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
    values[BASE64_ALPHABET[index] as string] = index
  }
  return values
})()

export function encodeBase64(bytes: Uint8Array): string {
  let out = ''
  let index = 0

  for (; index + 2 < bytes.length; index += 3) {
    const triple =
      ((bytes[index] as number) << 16) |
      ((bytes[index + 1] as number) << 8) |
      (bytes[index + 2] as number)
    out +=
      (BASE64_ALPHABET[(triple >> 18) & 63] as string) +
      (BASE64_ALPHABET[(triple >> 12) & 63] as string) +
      (BASE64_ALPHABET[(triple >> 6) & 63] as string) +
      (BASE64_ALPHABET[triple & 63] as string)
  }

  const remaining = bytes.length - index
  if (remaining === 1) {
    const value = (bytes[index] as number) << 16
    out += `${BASE64_ALPHABET[(value >> 18) & 63] as string}${
      BASE64_ALPHABET[(value >> 12) & 63] as string
    }==`
  } else if (remaining === 2) {
    const value = ((bytes[index] as number) << 16) | ((bytes[index + 1] as number) << 8)
    out += `${BASE64_ALPHABET[(value >> 18) & 63] as string}${
      BASE64_ALPHABET[(value >> 12) & 63] as string
    }${BASE64_ALPHABET[(value >> 6) & 63] as string}=`
  }
  return out
}

export function decodeBase64(text: string): Uint8Array {
  const clean = text.replace(/[\s=]/g, '')
  const bytes = new Uint8Array(Math.floor((clean.length * 6) / 8))
  let accumulator = 0
  let bits = 0
  let cursor = 0

  for (const character of clean) {
    const value = BASE64_VALUES[character]
    if (value === undefined) continue
    accumulator = (accumulator << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes[cursor] = (accumulator >> bits) & 0xff
      cursor += 1
    }
  }
  return bytes.subarray(0, cursor)
}

export function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

/** Concatenates chunks into one contiguous array. */
export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** Reused by `ByteWriter.f32` to turn a double into its float32 bytes. */
const SCRATCH_VIEW = new DataView(new ArrayBuffer(4))

/** A growable little-endian byte sink — the shape both ZIP and glTF want. */
export class ByteWriter {
  #bytes: Uint8Array
  #length = 0

  constructor(initialCapacity = 256) {
    this.#bytes = new Uint8Array(Math.max(initialCapacity, 16))
  }

  get length(): number {
    return this.#length
  }

  u8(value: number): this {
    this.#reserve(1)
    this.#bytes[this.#length] = value & 0xff
    this.#length += 1
    return this
  }

  u16(value: number): this {
    return this.u8(value).u8(value >>> 8)
  }

  u32(value: number): this {
    // `>>> 0` keeps values above 2^31 positive rather than sign-extended.
    const unsigned = value >>> 0
    return this.u8(unsigned).u8(unsigned >>> 8).u8(unsigned >>> 16).u8(unsigned >>> 24)
  }

  /** Little-endian IEEE-754 single, the only float glTF accessors use here. */
  f32(value: number): this {
    SCRATCH_VIEW.setFloat32(0, value, true)
    return this.u8(SCRATCH_VIEW.getUint8(0))
      .u8(SCRATCH_VIEW.getUint8(1))
      .u8(SCRATCH_VIEW.getUint8(2))
      .u8(SCRATCH_VIEW.getUint8(3))
  }

  raw(chunk: Uint8Array): this {
    this.#reserve(chunk.length)
    this.#bytes.set(chunk, this.#length)
    this.#length += chunk.length
    return this
  }

  ascii(text: string): this {
    return this.raw(encodeUtf8(text))
  }

  /** Pads with zeroes until the length is a multiple of `alignment`. */
  align(alignment: number): this {
    while (this.#length % alignment !== 0) this.u8(0)
    return this
  }

  toBytes(): Uint8Array {
    return this.#bytes.slice(0, this.#length)
  }

  #reserve(extra: number): void {
    if (this.#length + extra <= this.#bytes.length) return
    let capacity = this.#bytes.length * 2
    while (capacity < this.#length + extra) capacity *= 2
    const grown = new Uint8Array(capacity)
    grown.set(this.#bytes.subarray(0, this.#length))
    this.#bytes = grown
  }
}

const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

/** CRC-32 as ZIP (and PNG) define it. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = ((crc >>> 8) ^ (CRC_TABLE[(crc ^ byte) & 0xff] as number)) >>> 0
  }
  return (crc ^ 0xffffffff) >>> 0
}
