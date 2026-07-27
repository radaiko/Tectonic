import type { MeshData } from '../domain/MeshData'
import { meshBounds, mergeMeshes } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { cross, normalize } from '../domain/vec3'
import type { NamedMesh } from './types'
import { ExportError } from './types'
import { toNamedMeshes } from './ObjExporter'
import { ByteWriter, encodeUtf8 } from './binary'
import { PdfContent, infoDictionary, pdfNumber, pdfString } from './pdf'
import type { U3dMesh } from './u3d'
import { encodeU3d } from './u3d'

/**
 * A PDF carrying the model as interactive 3D.
 *
 * The page is an ordinary PDF page — a title block, a part list, a frame — with
 * a `/3D` annotation covering most of it. Inside the annotation sits a stream of
 * U3D (see {@link encodeU3d}), which is the payload a viewer instantiates and
 * lets the reader orbit. Everything else in the file exists to point at that
 * stream: the default view fixes the camera, the activation dictionary says when
 * to load it, and the appearance stream is what shows before it does.
 *
 * The PDF side of this is complete and checkable. The U3D side is not: it uses
 * the uncompressed encoding path only, which the spec permits but which not
 * every reader implements. A viewer that rejects the payload still opens the
 * page and shows the poster, so nothing is lost but the interactivity.
 *
 * Unlike {@link exportPdfDrawing} this writes bytes, not text, because a U3D
 * stream cannot survive being treated as ASCII.
 */

/** A4 landscape in PDF points, matching the drawing exporter's default sheet. */
export const DEFAULT_PAGE = { width: 842, height: 595 } as const
const MARGIN = 24
const TITLE_HEIGHT = 48
/** Field of view of the default camera, in degrees. */
export const DEFAULT_FOV = 30

export interface ThreeDPdfOptions {
  readonly title?: string
  readonly author?: string
  readonly subject?: string
  readonly creationDate?: Date
  /** Page size in points. */
  readonly page?: { readonly width: number; readonly height: number }
  /** Uniform scale applied to every position, for unit conversion. */
  readonly scale?: number
  /** Shown in place of the model until the reader activates the annotation. */
  readonly posterText?: string
  /** Background of the 3D canvas, as linear RGB in 0..1. */
  readonly background?: { readonly r: number; readonly g: number; readonly b: number }
}

/**
 * Builds the PDF. `source` accepts the same shapes the mesh exporters do; each
 * named mesh becomes one node in the viewer's model tree and one row in the
 * printed part list.
 */
export function exportThreeDPdf(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: ThreeDPdfOptions = {},
): Uint8Array {
  const title = options.title ?? 'Tectonic Model'
  const page = options.page ?? DEFAULT_PAGE
  const meshes = toNamedMeshes(source, title)
  if (meshes.length === 0) throw new ExportError('3D PDF export needs at least one mesh')

  const u3dMeshes: U3dMesh[] = meshes.map((entry) => ({
    name: entry.name,
    mesh: entry.mesh,
    ...(entry.material === undefined ? {} : { material: entry.material }),
  }))
  const payload = encodeU3d(u3dMeshes, {
    rootName: title,
    ...(options.scale === undefined ? {} : { scale: options.scale }),
  })

  const combined = mergeMeshes(meshes.map((entry) => entry.mesh))
  const view = defaultView(combined, options.scale ?? 1)
  const rect = annotationRect(page)

  const pdf = new BinaryPdfWriter()
  // Object numbers are handed out in creation order, and the dictionaries below
  // reference each other, so everything is reserved up front.
  const catalog = pdf.reserve()
  const pages = pdf.reserve()
  const pageObject = pdf.reserve()
  const annotation = pdf.reserve()
  const stream3d = pdf.reserve()
  const view3d = pdf.reserve()
  const font = pdf.reserve()
  const contents = pdf.reserve()
  const appearance = pdf.reserve()

  pdf.put(catalog, `<< /Type /Catalog /Pages ${pages} 0 R >>`)
  pdf.put(pages, `<< /Type /Pages /Kids [${pageObject} 0 R] /Count 1 >>`)
  pdf.put(
    pageObject,
    `<< /Type /Page /Parent ${pages} 0 R ` +
      `/MediaBox [0 0 ${pdfNumber(page.width)} ${pdfNumber(page.height)}] ` +
      `/Resources << /Font << /F1 ${font} 0 R >> >> ` +
      `/Annots [${annotation} 0 R] /Contents ${contents} 0 R >>`,
  )
  pdf.put(
    annotation,
    `<< /Type /Annot /Subtype /3D /F 4 ` +
      `/Rect [${rect.map((value) => pdfNumber(value)).join(' ')}] ` +
      `/Contents ${pdfString(title)} ` +
      `/3DD ${stream3d} 0 R /3DV ${view3d} 0 R ` +
      // Load when the page opens, unload when it closes, and let the reader
      // click into the model rather than requiring the toolbar.
      `/3DA << /A /PO /AIS /L /D /PC /DIS /I /TB true /NP false >> ` +
      `/AP << /N ${appearance} 0 R >> >>`,
  )
  pdf.putStream(
    stream3d,
    `/Type /3D /Subtype /U3D /VA [${view3d} 0 R] /DV ${view3d} 0 R`,
    payload,
  )
  pdf.put(view3d, viewDictionary(view, options.background))
  pdf.put(font, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const sheet = pageContent(title, meshes, page, rect)
  pdf.putStream(contents, '', encodeUtf8(sheet))
  const poster = posterContent(options.posterText ?? 'Click to activate the 3D model', rect)
  pdf.putStream(
    appearance,
    `/Type /XObject /Subtype /Form ` +
      `/BBox [0 0 ${pdfNumber(rect[2] - rect[0])} ${pdfNumber(rect[3] - rect[1])}] ` +
      `/Resources << /Font << /F1 ${font} 0 R >> >>`,
    encodeUtf8(poster),
  )

  const info = pdf.append(
    infoDictionary({
      title,
      ...(options.author === undefined ? {} : { author: options.author }),
      ...(options.subject === undefined ? {} : { subject: options.subject }),
      ...(options.creationDate === undefined ? {} : { creationDate: options.creationDate }),
    }),
  )
  return pdf.build(catalog, info)
}

/** Where the 3D canvas sits on the page: everything below the title block. */
export function annotationRect(page: {
  readonly width: number
  readonly height: number
}): [number, number, number, number] {
  return [MARGIN, MARGIN, page.width - MARGIN, page.height - MARGIN - TITLE_HEIGHT]
}

/* -------------------------------------------------------------------------- */
/* Default camera                                                              */
/* -------------------------------------------------------------------------- */

/** Where the viewer starts: an isometric camera framing the whole model. */
export interface ThreeDView {
  readonly position: Vec3
  readonly target: Vec3
  /** Camera-to-world matrix, in the twelve numbers PDF's `/C2W` wants. */
  readonly c2w: readonly number[]
  /** Distance from the camera to the orbit centre, PDF's `/CO`. */
  readonly orbit: number
}

const ISO_EYE: Vec3 = { x: 1, y: -1, z: 1 }
const WORLD_UP: Vec3 = { x: 0, y: 0, z: 1 }

/**
 * Frames the model from the standard isometric direction.
 *
 * The distance comes from the bounding sphere and the field of view, with a
 * little slack, so nothing clips against the edge of the canvas whichever way
 * the model is proportioned.
 */
export function defaultView(mesh: MeshData, scale = 1): ThreeDView {
  const bounds = meshBounds(mesh)
  const target: Vec3 = {
    x: ((bounds.min.x + bounds.max.x) / 2) * scale,
    y: ((bounds.min.y + bounds.max.y) / 2) * scale,
    z: ((bounds.min.z + bounds.max.z) / 2) * scale,
  }
  const radius =
    (Math.hypot(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z,
    ) /
      2) *
      Math.abs(scale) || 1

  const orbit = (radius * 1.2) / Math.sin(((DEFAULT_FOV / 2) * Math.PI) / 180)
  const back = normalize(ISO_EYE)
  const position = {
    x: target.x + back.x * orbit,
    y: target.y + back.y * orbit,
    z: target.z + back.z * orbit,
  }

  // Right-handed camera basis: `back` is +z, so right × back gives up.
  const right = normalize(cross(WORLD_UP, back))
  const up = cross(back, right)
  return {
    position,
    target,
    c2w: [
      right.x, right.y, right.z,
      up.x, up.y, up.z,
      back.x, back.y, back.z,
      position.x, position.y, position.z,
    ],
    orbit,
  }
}

function viewDictionary(
  view: ThreeDView,
  background?: { readonly r: number; readonly g: number; readonly b: number },
): string {
  const colour = background ?? { r: 1, g: 1, b: 1 }
  return (
    `<< /Type /3DView /XN (Default) /IN (Default) /MS /M ` +
    `/C2W [${view.c2w.map((value) => pdfNumber(value, 4)).join(' ')}] ` +
    `/CO ${pdfNumber(view.orbit, 4)} ` +
    `/P << /Subtype /P /FOV ${pdfNumber(DEFAULT_FOV)} >> ` +
    `/BG << /Type /3DBG /Subtype /SC /CS /DeviceRGB /C [${pdfNumber(colour.r, 4)} ` +
    `${pdfNumber(colour.g, 4)} ${pdfNumber(colour.b, 4)}] >> ` +
    `/LS << /Type /3DLightingScheme /Subtype /CAD >> ` +
    `/RM << /Type /3DRenderMode /Subtype /Solid >> >>`
  )
}

/* -------------------------------------------------------------------------- */
/* Page furniture                                                              */
/* -------------------------------------------------------------------------- */

/** The printed part of the page: title, frame and the part list. */
function pageContent(
  title: string,
  meshes: readonly NamedMesh[],
  page: { readonly width: number; readonly height: number },
  rect: readonly [number, number, number, number],
): string {
  const content = new PdfContent()
  content.stroke(0.2, 0.6)
  content.rect(MARGIN, MARGIN, page.width - MARGIN * 2, page.height - MARGIN * 2).op('S')

  const titleY = page.height - MARGIN - 28
  content.fillGray(0)
  content.text(MARGIN + 12, titleY, 18, title)
  content.text(MARGIN + 12, titleY - 16, 9, `${meshes.length} part${meshes.length === 1 ? '' : 's'}`)

  content.stroke(0.6, 0.4)
  content.line(MARGIN, rect[3] + 8, page.width - MARGIN, rect[3] + 8)

  // The part list doubles as the model tree for a reader that will not run the
  // 3D annotation, so it carries the same names the U3D nodes use.
  let row = rect[3] - 14
  content.fillGray(0.15)
  for (const entry of meshes) {
    if (row < rect[1] + 12) break
    content.text(rect[0] + 12, row, 9, entry.name)
    row -= 12
  }
  return content.toString()
}

/** The poster: a dashed frame with a hint, drawn until the model loads. */
function posterContent(text: string, rect: readonly [number, number, number, number]): string {
  const width = rect[2] - rect[0]
  const height = rect[3] - rect[1]
  const content = new PdfContent()
  content.stroke(0.65, 0.8).dash([6, 4])
  content.rect(2, 2, width - 4, height - 4).op('S')
  content.dash([])
  content.fillGray(0.4)
  // Helvetica averages a bit under half the point size per character; close
  // enough to centre a single line without embedding metrics.
  content.text(Math.max(4, width / 2 - text.length * 2.4), height / 2, 11, text)
  return content.toString()
}

/* -------------------------------------------------------------------------- */
/* Binary PDF assembly                                                         */
/* -------------------------------------------------------------------------- */

/**
 * A PDF writer that can hold binary streams.
 *
 * The text writer in `pdf.ts` gets away with string offsets because everything
 * it emits is ASCII. A U3D stream is not, so this one accumulates bytes and
 * measures offsets in bytes. Object numbers can be reserved before their bodies
 * exist, which is what lets the dictionaries above reference each other.
 */
export class BinaryPdfWriter {
  readonly #bodies: (Uint8Array | null)[] = []

  /** Claims the next object number without writing anything yet. */
  reserve(): number {
    this.#bodies.push(null)
    return this.#bodies.length
  }

  /** Fills in a reserved object. */
  put(objectNumber: number, body: string): void {
    this.#bodies[objectNumber - 1] = encodeUtf8(body)
  }

  /** Fills in a reserved object with a stream, adding the `/Length` it needs. */
  putStream(objectNumber: number, dictionary: string, data: Uint8Array): void {
    const head = encodeUtf8(
      `<< ${dictionary === '' ? '' : `${dictionary} `}/Length ${data.length} >>\nstream\n`,
    )
    const tail = encodeUtf8('\nendstream')
    const out = new ByteWriter(head.length + data.length + tail.length)
    out.raw(head).raw(data).raw(tail)
    this.#bodies[objectNumber - 1] = out.toBytes()
  }

  /** Adds an object at the end and returns its number. */
  append(body: string): number {
    const objectNumber = this.reserve()
    this.put(objectNumber, body)
    return objectNumber
  }

  build(rootObject: number, infoObject?: number): Uint8Array {
    const out = new ByteWriter(4096)
    // The binary comment on line two tells a transfer agent not to treat the
    // file as text; the four high bytes are the conventional marker.
    out.ascii('%PDF-1.7\n').raw(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3])).ascii('\n')

    const offsets: number[] = []
    this.#bodies.forEach((body, index) => {
      if (body === null) throw new ExportError(`PDF object ${index + 1} was reserved but never written`)
      offsets.push(out.length)
      out.ascii(`${index + 1} 0 obj\n`).raw(body).ascii('\nendobj\n')
    })

    const xrefOffset = out.length
    const size = this.#bodies.length + 1
    out.ascii(`xref\n0 ${size}\n`)
    out.ascii(`${'0'.repeat(10)} 65535 f \n`)
    for (const offset of offsets) out.ascii(`${String(offset).padStart(10, '0')} 00000 n \n`)

    const info = infoObject === undefined ? '' : ` /Info ${infoObject} 0 R`
    out.ascii(`trailer\n<< /Size ${size} /Root ${rootObject} 0 R${info} >>\n`)
    out.ascii(`startxref\n${xrefOffset}\n%%EOF\n`)
    return out.toBytes()
  }
}
