import { describe, expect, it } from 'vitest'
import {
  ByteWriter,
  concatBytes,
  crc32,
  decodeBase64,
  decodeUtf8,
  encodeBase64,
  encodeUtf8,
} from '../../src/io/binary'

describe('base64', () => {
  it('encodes the RFC 4648 test vectors', () => {
    const encode = (text: string): string => encodeBase64(encodeUtf8(text))

    expect(encode('')).toBe('')
    expect(encode('f')).toBe('Zg==')
    expect(encode('fo')).toBe('Zm8=')
    expect(encode('foo')).toBe('Zm9v')
    expect(encode('foob')).toBe('Zm9vYg==')
    expect(encode('fooba')).toBe('Zm9vYmE=')
    expect(encode('foobar')).toBe('Zm9vYmFy')
  })

  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array(256)
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = index

    expect([...decodeBase64(encodeBase64(bytes))]).toEqual([...bytes])
  })

  it('ignores padding and whitespace when decoding', () => {
    expect(decodeUtf8(decodeBase64('Zm9v\nYmFy'))).toBe('foobar')
  })

  it('skips characters outside the alphabet', () => {
    expect(decodeUtf8(decodeBase64('Zm9-v'))).toBe('foo')
  })
})

describe('ByteWriter', () => {
  it('writes little-endian integers', () => {
    const bytes = new ByteWriter(4).u8(0x01).u16(0x0302).u32(0x07060504).toBytes()

    expect([...bytes]).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('writes float32 in little-endian order', () => {
    const bytes = new ByteWriter().f32(1).toBytes()

    expect([...bytes]).toEqual([0, 0, 0x80, 0x3f])
  })

  it('grows past its initial capacity', () => {
    const writer = new ByteWriter(16)
    for (let index = 0; index < 100; index += 1) writer.u32(index)

    expect(writer.length).toBe(400)
    expect(new DataView(writer.toBytes().buffer).getUint32(396, true)).toBe(99)
  })

  it('pads to an alignment boundary', () => {
    const writer = new ByteWriter().u8(1).align(4)

    expect(writer.length).toBe(4)
    expect([...writer.toBytes()]).toEqual([1, 0, 0, 0])
  })

  it('leaves an already-aligned writer alone', () => {
    expect(new ByteWriter().u32(1).align(4).length).toBe(4)
  })

  it('keeps values above 2^31 unsigned', () => {
    const bytes = new ByteWriter().u32(0xfedcba98).toBytes()

    expect([...bytes]).toEqual([0x98, 0xba, 0xdc, 0xfe])
  })
})

describe('crc32', () => {
  it('matches the published checksum for "123456789"', () => {
    expect(crc32(encodeUtf8('123456789'))).toBe(0xcbf43926)
  })

  it('is zero for no bytes', () => {
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('concatBytes', () => {
  it('joins chunks in order', () => {
    const joined = concatBytes([new Uint8Array([1, 2]), new Uint8Array(), new Uint8Array([3])])

    expect([...joined]).toEqual([1, 2, 3])
  })
})
