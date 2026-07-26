import { describe, expect, it } from 'vitest'
import { crc32, decodeUtf8, encodeUtf8 } from '../../src/io/binary'
import { dosDateTime, readZip, readZipText, textEntry, writeZip } from '../../src/io/zip'
import { ImportError } from '../../src/io/types'

const ENTRIES = [textEntry('a.txt', 'hello'), textEntry('nested/b.xml', '<x/>')]

describe('writeZip', () => {
  it('starts with a local file header signature', () => {
    const bytes = writeZip(ENTRIES)
    const view = new DataView(bytes.buffer)

    expect(view.getUint32(0, true)).toBe(0x04034b50)
  })

  it('ends with a central directory record naming every entry', () => {
    const bytes = writeZip(ENTRIES)
    const view = new DataView(bytes.buffer)
    const end = bytes.length - 22

    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
  })

  it('stores entries uncompressed with a valid CRC', () => {
    const bytes = writeZip([textEntry('a.txt', 'hello')])
    const view = new DataView(bytes.buffer)

    expect(view.getUint16(8, true)).toBe(0)
    expect(view.getUint32(14, true)).toBe(crc32(encodeUtf8('hello')))
    expect(view.getUint32(18, true)).toBe(5)
  })

  it('is byte-identical for identical input', () => {
    expect([...writeZip(ENTRIES)]).toEqual([...writeZip(ENTRIES)])
  })

  it('accepts an empty archive', () => {
    const bytes = writeZip([])

    expect(readZip(bytes)).toEqual([])
  })
})

describe('readZip', () => {
  it('round-trips names and content', () => {
    const entries = readZip(writeZip(ENTRIES))

    expect(entries.map((entry) => entry.name)).toEqual(['a.txt', 'nested/b.xml'])
    expect(decodeUtf8(entries[0]?.data as Uint8Array)).toBe('hello')
    expect(readZipText(entries, 'nested/b.xml')).toBe('<x/>')
  })

  it('round-trips non-ASCII names and content', () => {
    const entries = readZip(writeZip([textEntry('Bauteil-Größe.xml', '<t>Größe</t>')]))

    expect(entries[0]?.name).toBe('Bauteil-Größe.xml')
    expect(readZipText(entries, 'Bauteil-Größe.xml')).toBe('<t>Größe</t>')
  })

  it('rejects anything without an end record', () => {
    expect(() => readZip(new Uint8Array(40))).toThrow(ImportError)
  })

  it('rejects a truncated central directory', () => {
    const bytes = writeZip(ENTRIES)
    // Point the end record at a directory offset that holds no header.
    new DataView(bytes.buffer).setUint32(bytes.length - 22 + 16, 4, true)

    expect(() => readZip(bytes)).toThrow(/central directory/)
  })

  it('reports a missing member by name', () => {
    expect(() => readZipText(readZip(writeZip(ENTRIES)), 'missing.txt')).toThrow(
      'Archive has no entry "missing.txt"',
    )
  })
})

describe('dosDateTime', () => {
  it('packs a date into the DOS fields', () => {
    const { time, date } = dosDateTime(new Date(2026, 6, 26, 13, 45, 30))

    expect(time).toBe((13 << 11) | (45 << 5) | 15)
    expect(date).toBe(((2026 - 1980) << 9) | (7 << 5) | 26)
  })

  it('clamps dates before the DOS epoch', () => {
    const { date } = dosDateTime(new Date(1970, 0, 1))

    expect(date >> 9).toBe(0)
  })
})
