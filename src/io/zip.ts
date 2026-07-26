import { ByteWriter, concatBytes, crc32, decodeUtf8, encodeUtf8 } from './binary'
import { ImportError } from './types'

/**
 * A ZIP container, written and read without compression.
 *
 * 3MF is an OPC package, which is a ZIP file, and the only member the spec
 * requires a reader to understand is the "stored" method. Deflate would need a
 * compressor we have no dependency for and buys little on the XML we emit, so
 * every entry goes in uncompressed. Readers are required to accept that.
 */

export interface ZipEntry {
  /** Path inside the archive, forward-slash separated, never leading-slashed. */
  readonly name: string
  readonly data: Uint8Array
}

export interface ZipOptions {
  /**
   * Modification stamp for every entry. Fixed by default so the same model
   * always produces byte-identical bytes.
   */
  readonly modified?: Date
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50
const CENTRAL_HEADER_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const STORED = 0
const VERSION_NEEDED = 20
/** Bit 11 of the general purpose flags: entry names are UTF-8. */
const UTF8_NAME_FLAG = 0x0800
/** DOS timestamps cannot express anything before 1980. */
const DOS_EPOCH_YEAR = 1980

/** Packs a date into the DOS date/time pair ZIP headers carry. */
export function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), DOS_EPOCH_YEAR)
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - DOS_EPOCH_YEAR) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

export function textEntry(name: string, text: string): ZipEntry {
  return { name, data: encodeUtf8(text) }
}

/** Builds the archive: every local record, then the central directory. */
export function writeZip(entries: readonly ZipEntry[], options: ZipOptions = {}): Uint8Array {
  const stamp = dosDateTime(options.modified ?? new Date(Date.UTC(DOS_EPOCH_YEAR, 0, 1)))
  const local = new ByteWriter(1024)
  const central = new ByteWriter(512)

  for (const entry of entries) {
    const name = encodeUtf8(entry.name)
    const checksum = crc32(entry.data)
    const offset = local.length

    local
      .u32(LOCAL_HEADER_SIGNATURE)
      .u16(VERSION_NEEDED)
      .u16(UTF8_NAME_FLAG)
      .u16(STORED)
      .u16(stamp.time)
      .u16(stamp.date)
      .u32(checksum)
      .u32(entry.data.length)
      .u32(entry.data.length)
      .u16(name.length)
      .u16(0)
      .raw(name)
      .raw(entry.data)

    central
      .u32(CENTRAL_HEADER_SIGNATURE)
      .u16(VERSION_NEEDED)
      .u16(VERSION_NEEDED)
      .u16(UTF8_NAME_FLAG)
      .u16(STORED)
      .u16(stamp.time)
      .u16(stamp.date)
      .u32(checksum)
      .u32(entry.data.length)
      .u32(entry.data.length)
      .u16(name.length)
      .u16(0)
      .u16(0)
      .u16(0)
      .u16(0)
      .u32(0)
      .u32(offset)
      .raw(name)
  }

  const directory = central.toBytes()
  const end = new ByteWriter(32)
  end
    .u32(END_OF_CENTRAL_DIRECTORY_SIGNATURE)
    .u16(0)
    .u16(0)
    .u16(entries.length)
    .u16(entries.length)
    .u32(directory.length)
    .u32(local.length)
    .u16(0)

  return concatBytes([local.toBytes(), directory, end.toBytes()])
}

/**
 * Reads a stored archive back. Only what `writeZip` produces is supported —
 * enough to verify our own output and to open a 3MF we or another CAD wrote
 * without compression.
 */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = findEndOfCentralDirectory(view)
  const count = view.getUint16(end + 10, true)
  let cursor = view.getUint32(end + 16, true)
  const entries: ZipEntry[] = []

  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== CENTRAL_HEADER_SIGNATURE) {
      throw new ImportError(`ZIP central directory entry ${index} is malformed`)
    }
    const method = view.getUint16(cursor + 10, true)
    const size = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true)
    const name = decodeUtf8(bytes.subarray(cursor + 46, cursor + 46 + nameLength))

    if (method !== STORED) {
      throw new ImportError(`ZIP entry "${name}" is compressed, which is not supported`)
    }
    entries.push({ name, data: readLocalData(bytes, view, localOffset, size, name) })
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/** Convenience for the callers that just want one member as text. */
export function readZipText(entries: readonly ZipEntry[], name: string): string {
  const entry = entries.find((candidate) => candidate.name === name)
  if (!entry) throw new ImportError(`Archive has no entry "${name}"`)
  return decodeUtf8(entry.data)
}

function readLocalData(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  size: number,
  name: string,
): Uint8Array {
  if (offset + 30 > bytes.length || view.getUint32(offset, true) !== LOCAL_HEADER_SIGNATURE) {
    throw new ImportError(`ZIP entry "${name}" has no local header`)
  }
  const nameLength = view.getUint16(offset + 26, true)
  const extraLength = view.getUint16(offset + 28, true)
  const start = offset + 30 + nameLength + extraLength
  if (start + size > bytes.length) throw new ImportError(`ZIP entry "${name}" is truncated`)
  return bytes.slice(start, start + size)
}

/** Scans back from the tail for the end record, which may carry a comment. */
function findEndOfCentralDirectory(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset
  }
  throw new ImportError('Not a ZIP archive: no end of central directory record')
}
