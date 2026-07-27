import { describe, expect, it, vi } from 'vitest'
import { triangleCount } from '../../src/domain/MeshData'
import type { CadDetection, CadTranslator } from '../../src/io/CadImportService'
import {
  CAD_EXTENSIONS,
  CAD_FORMATS,
  DEFAULT_PLACEHOLDER_SIZE,
  OLE2_SIGNATURE,
  PARASOLID_PREFIX,
  ZIP_SIGNATURE,
  baseName,
  boxMesh,
  cadFormat,
  detectCadFormat,
  detectContainer,
  extensionOf,
  headerText,
  importCad,
  importCadFile,
  isCadFileName,
  parasolidVersion,
  placeholderMesh,
  startsWith,
} from '../../src/io/CadImportService'
import { ImportError } from '../../src/io/types'

/** ASCII text as bytes, optionally padded out so a header window is filled. */
function ascii(text: string, length = text.length): Uint8Array {
  const bytes = new Uint8Array(Math.max(length, text.length))
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index)
  return bytes
}

/** A file starting with the given signature, then filler. */
function signed(signature: readonly number[], filler = 64): Uint8Array {
  const bytes = new Uint8Array(signature.length + filler)
  bytes.set(signature, 0)
  return bytes
}

const PARASOLID_HEADER =
  `${PARASOLID_PREFIX}\n**abcdefghijklmnopqrstuvwxyz\n**PARASOLID !\n` +
  '**PART1;MC=x86_64_linux;\nTRANSMIT FILE created by modeller version 340000 SCH_2100000_34000\n'

describe('extensionOf', () => {
  it('lower-cases the extension', () => {
    expect(extensionOf('Bracket.SLDPRT')).toBe('.sldprt')
  })

  it('reports nothing for a name without a dot', () => {
    expect(extensionOf('Makefile')).toBe('')
  })
})

describe('baseName', () => {
  it('strips the directory and the extension', () => {
    expect(baseName('/parts/lower/Bracket.sldprt')).toBe('Bracket')
  })

  it('handles a Windows path', () => {
    expect(baseName('C:\\parts\\Housing.CATPart')).toBe('Housing')
  })

  it('keeps a name that is all extension', () => {
    expect(baseName('.sldprt')).toBe('.sldprt')
  })

  it('keeps a name with no extension at all', () => {
    expect(baseName('Bracket')).toBe('Bracket')
  })
})

describe('the format table', () => {
  it('covers every format the importer claims to know', () => {
    expect(CAD_FORMATS.map((format) => format.id)).toEqual([
      'solidworks-part',
      'solidworks-assembly',
      'catia-part',
      'catia-product',
      'nx-part',
      'creo-part',
      'creo-assembly',
      'inventor-part',
      'inventor-assembly',
      'parasolid-text',
      'parasolid-binary',
      'jt',
    ])
  })

  it('looks a format up by id', () => {
    expect(cadFormat('jt').application).toBe('Siemens JT')
  })

  it('refuses an id it does not have', () => {
    // The cast is the point: this is what a bad id from outside looks like.
    expect(() => cadFormat('autocad' as never)).toThrow(ImportError)
  })

  it('lists each extension once even where two formats share it', () => {
    expect(new Set(CAD_EXTENSIONS).size).toBe(CAD_EXTENSIONS.length)
    expect(CAD_EXTENSIONS).toContain('.prt')
  })

  it('recognises its own extensions and nothing else', () => {
    expect(isCadFileName('Bracket.sldprt')).toBe(true)
    expect(isCadFileName('Bracket.step')).toBe(false)
  })
})

describe('startsWith', () => {
  it('matches a signature at the head of the file', () => {
    expect(startsWith(signed(OLE2_SIGNATURE), OLE2_SIGNATURE)).toBe(true)
  })

  it('does not match a file shorter than the signature', () => {
    expect(startsWith(new Uint8Array([0xd0, 0xcf]), OLE2_SIGNATURE)).toBe(false)
  })

  it('does not match on a partial signature', () => {
    const bytes = signed(OLE2_SIGNATURE)
    bytes[7] = 0
    expect(startsWith(bytes, OLE2_SIGNATURE)).toBe(false)
  })
})

describe('headerText', () => {
  it('reads the head of the file as text', () => {
    expect(headerText(ascii('Version 9.5 JT'), 11)).toBe('Version 9.5')
  })

  it('stops at the end of a short file', () => {
    expect(headerText(ascii('JT'), 64)).toBe('JT')
  })
})

describe('detectContainer', () => {
  it('recognises an OLE2 compound file', () => {
    expect(detectContainer(signed(OLE2_SIGNATURE))).toBe('ole2')
  })

  it('recognises a zip', () => {
    expect(detectContainer(signed(ZIP_SIGNATURE))).toBe('zip')
  })

  it('recognises the Parasolid header as ASCII', () => {
    expect(detectContainer(ascii(PARASOLID_HEADER))).toBe('ascii')
  })

  it('admits when it cannot tell', () => {
    expect(detectContainer(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull()
  })
})

describe('detectCadFormat', () => {
  it('identifies a SOLIDWORKS part from the OLE2 signature and the extension', () => {
    const detection = detectCadFormat(signed(OLE2_SIGNATURE), 'Bracket.SLDPRT')

    expect(detection?.format.id).toBe('solidworks-part')
    expect(detection?.confidence).toBe('signature')
  })

  it('tells a SOLIDWORKS assembly from a part by the extension', () => {
    const detection = detectCadFormat(signed(OLE2_SIGNATURE), 'Frame.sldasm')

    expect(detection?.format.id).toBe('solidworks-assembly')
    expect(detection?.format.kind).toBe('assembly')
  })

  it('identifies an Inventor part from the same container', () => {
    const detection = detectCadFormat(signed(OLE2_SIGNATURE), 'Shaft.ipt')

    expect(detection?.format.application).toBe('Autodesk Inventor')
  })

  it('identifies a Parasolid text transmit file and its schema', () => {
    const detection = detectCadFormat(ascii(PARASOLID_HEADER), 'Body.x_t')

    expect(detection?.format.id).toBe('parasolid-text')
    expect(detection?.confidence).toBe('signature')
    expect(detection?.version).toBe('2100000_34000')
  })

  it('identifies a Parasolid binary transmit file from its extension', () => {
    const detection = detectCadFormat(ascii(PARASOLID_HEADER), 'Body.x_b')

    expect(detection?.format.id).toBe('parasolid-binary')
  })

  it('falls back to the body when a Parasolid file has no useful name', () => {
    const text = detectCadFormat(ascii(PARASOLID_HEADER), 'Body')
    const binary = ascii(PARASOLID_HEADER, 400)
    binary[PARASOLID_HEADER.length + 4] = 0xff

    expect(text?.format.id).toBe('parasolid-text')
    expect(detectCadFormat(binary, 'Body')?.format.id).toBe('parasolid-binary')
  })

  it('identifies JT from its version banner', () => {
    const detection = detectCadFormat(ascii('Version 9.5 JT'), 'Housing.jt')

    expect(detection?.format.id).toBe('jt')
    expect(detection?.version).toBe('9.5')
  })

  it('identifies NX from the UGII marker', () => {
    const detection = detectCadFormat(ascii('\u0000\u0000UGII NX 12.0 part'), 'Housing.prt')

    expect(detection?.format.id).toBe('nx-part')
    expect(detection?.confidence).toBe('token')
    expect(detection?.version).toBe('12.0')
  })

  it('identifies Creo from its marker, and an .asm as the assembly', () => {
    const part = detectCadFormat(ascii('\u0001Pro/ENGINEER 7.0'), 'Rod.prt')
    const assembly = detectCadFormat(ascii('\u0001Pro/ENGINEER 7.0'), 'Rig.asm')

    expect(part?.format.id).toBe('creo-part')
    expect(assembly?.format.id).toBe('creo-assembly')
  })

  it('identifies CATIA from the V5_CF marker', () => {
    const detection = detectCadFormat(ascii('\u0000\u0000V5_CF header'), 'Wing.CATPart')

    expect(detection?.format.id).toBe('catia-part')
  })

  it('reads a CATProduct as an assembly', () => {
    const detection = detectCadFormat(ascii('\u0000CATIA V5'), 'Wing.CATProduct')

    expect(detection?.format.id).toBe('catia-product')
  })

  it('falls back to the extension when nothing in the file says anything', () => {
    const detection = detectCadFormat(new Uint8Array(64), 'Housing.CATPart')

    expect(detection?.format.id).toBe('catia-part')
    expect(detection?.confidence).toBe('extension')
  })

  it('says so when an extension cannot settle which application wrote it', () => {
    const detection = detectCadFormat(new Uint8Array(64), 'Housing.prt')

    expect(detection?.confidence).toBe('extension')
    expect(detection?.evidence).toContain('NX and Creo Parametric share it')
  })

  it('gives up on a file it has no reason to recognise', () => {
    expect(detectCadFormat(new Uint8Array(64), 'notes.txt')).toBeNull()
  })

  it('gives up on a file with no name and no signature', () => {
    expect(detectCadFormat(new Uint8Array(64))).toBeNull()
  })
})

describe('parasolidVersion', () => {
  it('prefers the schema token', () => {
    expect(parasolidVersion('SCH_2100000_34000 and more')).toBe('2100000_34000')
  })

  it('falls back to the modeller version', () => {
    expect(parasolidVersion('created by modeller version 340000')).toBe('340000')
  })

  it('reports nothing when the header names no version', () => {
    expect(parasolidVersion('**PARASOLID')).toBeNull()
  })
})

describe('boxMesh', () => {
  it('builds a closed cube of twelve triangles', () => {
    expect(triangleCount(boxMesh(10))).toBe(12)
  })

  it('centres the cube on the origin', () => {
    const mesh = boxMesh(10)

    expect(Math.min(...mesh.positions)).toBe(-5)
    expect(Math.max(...mesh.positions)).toBe(5)
  })

  it('falls back to a visible size when asked for nothing', () => {
    expect(triangleCount(boxMesh(0))).toBe(12)
  })
})

describe('placeholderMesh', () => {
  /** A SOLIDWORKS detection, which every case below builds a stand-in from. */
  function solidworks(): CadDetection {
    const detection = detectCadFormat(signed(OLE2_SIGNATURE), 'Bracket.sldprt')
    if (!detection) throw new Error('the OLE2 fixture was not recognised')
    return detection
  }

  it('names the stand-in after the file and the format', () => {
    expect(placeholderMesh('Bracket', solidworks()).name).toBe(
      'Bracket (SOLIDWORKS Part placeholder)',
    )
  })

  it('gives an unnamed import something to be called', () => {
    expect(placeholderMesh('', solidworks()).name).toBe('Imported (SOLIDWORKS Part placeholder)')
  })

  it('marks the stand-in with a see-through material', () => {
    expect(placeholderMesh('Bracket', solidworks()).material?.opacity).toBeLessThan(1)
  })
})

describe('importCad', () => {
  it('refuses a file it cannot identify', () => {
    expect(() => importCad(new Uint8Array(16), 'notes.txt')).toThrow(ImportError)
  })

  it('returns a placeholder body with a warning that says so', () => {
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', { now: '2026-07-27T00:00:00Z' })

    expect(result.metadata.placeholder).toBe(true)
    expect(result.meshes).toHaveLength(1)
    expect(result.warnings.join(' ')).toContain('placeholder, not the real model')
  })

  it('records what it worked out about the file', () => {
    const bytes = signed(OLE2_SIGNATURE, 200)
    const result = importCad(bytes, 'Bracket.sldprt', { now: '2026-07-27T00:00:00Z' })

    expect(result.metadata).toMatchObject({
      fileName: 'Bracket.sldprt',
      fileSize: bytes.length,
      confidence: 'signature',
      meshCount: 1,
      importedAt: '2026-07-27T00:00:00Z',
    })
    expect(result.metadata.format.application).toBe('SOLIDWORKS')
  })

  it('warns separately when only the extension identified the file', () => {
    const result = importCad(new Uint8Array(64), 'Housing.CATPart')

    expect(result.warnings.some((warning) => warning.includes('extension alone'))).toBe(true)
    expect(result.warnings).toHaveLength(2)
  })

  it('sizes the placeholder as asked', () => {
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', { placeholderSize: 4 })
    const mesh = result.meshes[0]?.mesh

    expect(Math.max(...(mesh?.positions ?? []))).toBe(2)
  })

  it('defaults the placeholder to a size a viewport can find', () => {
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt')

    expect(Math.max(...(result.meshes[0]?.mesh.positions ?? []))).toBe(
      DEFAULT_PLACEHOLDER_SIZE / 2,
    )
  })

  it('stamps the import with the current time when none is given', () => {
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt')

    expect(Number.isNaN(Date.parse(result.metadata.importedAt))).toBe(false)
  })

  it('uses a translator when one is installed', () => {
    const translator: CadTranslator = {
      name: 'Test translator',
      translate: () => [{ name: 'Real body', mesh: boxMesh(2) }],
    }
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', { translator })

    expect(result.metadata.placeholder).toBe(false)
    expect(result.meshes[0]?.name).toBe('Real body')
    expect(result.warnings).toEqual([])
  })

  it('passes the detection to the translator', () => {
    const translate = vi.fn<(...args: CadTranslator['translate'] extends (...a: infer A) => unknown ? A : never[]) => ReturnType<CadTranslator['translate']>>(
      () => [{ name: 'Real body', mesh: boxMesh(2) }],
    )
    importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', {
      translator: { name: 'Test translator', translate },
    })

    expect(translate).toHaveBeenCalledOnce()
    expect(translate.mock.calls[0]![1]!).toMatchObject({ confidence: 'signature' })
  })

  it('falls back to a placeholder when the translator declines the file', () => {
    const translator: CadTranslator = { name: 'Test translator', translate: () => null }
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', { translator })

    expect(result.metadata.placeholder).toBe(true)
  })

  it('treats a translator that read nothing as no translator at all', () => {
    const translator: CadTranslator = { name: 'Test translator', translate: () => [] }
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', { translator })

    expect(result.metadata.placeholder).toBe(true)
  })

  it('reports a translator that threw and carries on', () => {
    const translator: CadTranslator = {
      name: 'Test translator',
      translate: () => {
        throw new Error('licence expired')
      },
    }
    const result = importCad(signed(OLE2_SIGNATURE), 'Bracket.sldprt', { translator })

    expect(result.metadata.placeholder).toBe(true)
    expect(result.warnings[0]).toBe('Test translator could not read the file: licence expired')
  })

  it('counts every mesh a translator produced', () => {
    const translator: CadTranslator = {
      name: 'Test translator',
      translate: () => [
        { name: 'One', mesh: boxMesh(1) },
        { name: 'Two', mesh: boxMesh(1) },
      ],
    }
    const result = importCad(signed(OLE2_SIGNATURE), 'Frame.sldasm', { translator })

    expect(result.metadata.meshCount).toBe(2)
  })
})

describe('importCadFile', () => {
  it('reads the bytes off a File', async () => {
    const file = new File([signed(OLE2_SIGNATURE)], 'Bracket.sldprt')
    const result = await importCadFile(file)

    expect(result.metadata.format.id).toBe('solidworks-part')
    expect(result.metadata.fileName).toBe('Bracket.sldprt')
  })
})
