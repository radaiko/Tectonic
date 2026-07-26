import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocumentParseError, TECTONIC_EXTENSION, openFile, serialize } from '../../src/io/FileService'
import { createNewDocument } from '../../src/io/FileService'

const NOW = '2026-07-26T12:00:00.000Z'

/**
 * jsdom never opens a real picker, so the test drives the hidden <input> the
 * service creates: capture it on click, then dispatch the event under test.
 */
function withPicker(act: (input: HTMLInputElement) => void): void {
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
    this: HTMLInputElement,
  ) {
    act(this)
  })
}

function attachFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('openFile', () => {
  it('configures a hidden picker limited to .tectonic files', () => {
    let picker: HTMLInputElement | undefined
    withPicker((input) => {
      picker = input
    })

    void openFile()

    expect(picker?.type).toBe('file')
    expect(picker?.accept).toBe(TECTONIC_EXTENSION)
    expect(picker?.style.display).toBe('none')
  })

  it('resolves with the parsed document and cleans up the input', async () => {
    const original = createNewDocument({ name: 'Bracket', now: NOW })
    let picker: HTMLInputElement | undefined
    withPicker((input) => {
      picker = input
      attachFiles(input, [new File([serialize(original)], `bracket${TECTONIC_EXTENSION}`)])
      input.dispatchEvent(new Event('change'))
    })

    await expect(openFile()).resolves.toEqual(original)
    expect(picker?.isConnected).toBe(false)
  })

  it('resolves with null when the dialog closes with no selection', async () => {
    withPicker((input) => {
      attachFiles(input, [])
      input.dispatchEvent(new Event('change'))
    })

    await expect(openFile()).resolves.toBeNull()
  })

  it('resolves with null when the dialog is cancelled', async () => {
    withPicker((input) => {
      input.dispatchEvent(new Event('cancel'))
    })

    await expect(openFile()).resolves.toBeNull()
  })

  it('rejects when the chosen file is not a document', async () => {
    withPicker((input) => {
      attachFiles(input, [new File(['not json'], `broken${TECTONIC_EXTENSION}`)])
      input.dispatchEvent(new Event('change'))
    })

    await expect(openFile()).rejects.toThrow(DocumentParseError)
  })
})
