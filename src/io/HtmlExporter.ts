import type { MeshData } from '../domain/MeshData'
import { meshBounds, mergeMeshes, triangleCount, vertexCount } from '../domain/MeshData'
import type { NamedMesh } from './types'
import { DEFAULT_MATERIAL, ExportError } from './types'
import { toNamedMeshes } from './ObjExporter'
import { encodeBase64 } from './binary'
import { VIEWER_SCRIPT, VIEWER_STYLE } from './htmlViewer'

/**
 * A standalone HTML file with the model inside it.
 *
 * The whole point is that the result is one file that works from a thumb drive:
 * no server, no CDN, nothing to install. That rules out shipping three.js — it
 * would have to be either fetched (breaking offline) or inlined in full — so
 * the viewer embedded here is a small purpose-built WebGL renderer instead. It
 * does the four things a recipient actually needs (orbit, pan, zoom, and a part
 * list that toggles visibility) and nothing else.
 *
 * Geometry travels as base64'd typed arrays rather than JSON numbers, which is
 * roughly a quarter of the size and parses without a million-element array
 * literal.
 */

export interface HtmlExportOptions {
  readonly title?: string
  /** Uniform scale applied to every position, for unit conversion. */
  readonly scale?: number
  /** Shown under the title in the sidebar. */
  readonly subtitle?: string
  /** Background of the canvas, as a CSS colour. */
  readonly background?: string
  /** Start with the wireframe overlay on. */
  readonly wireframe?: boolean
}

/** One part as the embedded viewer reads it. */
export interface HtmlViewerPart {
  readonly name: string
  readonly color: readonly [number, number, number]
  readonly opacity: number
  readonly triangles: number
  /** Base64 of the float32 position array. */
  readonly positions: string
  /** Base64 of the float32 normal array. */
  readonly normals: string
  /** Base64 of the uint32 index array. */
  readonly indices: string
}

/** The payload the page carries, before it is serialised into the document. */
export interface HtmlViewerModel {
  readonly title: string
  readonly subtitle: string
  readonly background: string
  readonly wireframe: boolean
  readonly bounds: {
    readonly min: readonly [number, number, number]
    readonly max: readonly [number, number, number]
  }
  readonly parts: readonly HtmlViewerPart[]
}

/** Assembles the payload without serialising it — the exporter's testable half. */
export function htmlViewerModel(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: HtmlExportOptions = {},
): HtmlViewerModel {
  const title = options.title ?? 'Tectonic Model'
  const scale = options.scale ?? 1
  const meshes = toNamedMeshes(source, title)
  if (meshes.length === 0) throw new ExportError('HTML export needs at least one mesh')

  const parts = meshes.map((entry) => {
    const mesh = entry.mesh
    const vertices = vertexCount(mesh)
    if (vertices === 0 || mesh.indices.length === 0) {
      throw new ExportError(`Mesh "${entry.name}" has no geometry to export`)
    }

    const material = entry.material ?? DEFAULT_MATERIAL
    const positions = new Float32Array(vertices * 3)
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] = (mesh.positions[index] ?? 0) * scale
    }
    const normals = new Float32Array(vertices * 3)
    const hasNormals = mesh.normals.length >= vertices * 3
    for (let index = 0; index < normals.length; index += 1) {
      normals[index] = hasNormals ? (mesh.normals[index] ?? 0) : 0
    }

    return {
      name: entry.name,
      color: [material.color.r, material.color.g, material.color.b] as const,
      opacity: material.opacity ?? 1,
      triangles: triangleCount(mesh),
      positions: base64Of(positions),
      normals: base64Of(normals),
      indices: base64Of(Uint32Array.from(mesh.indices)),
    }
  })

  const bounds = meshBounds(mergeMeshes(meshes.map((entry) => entry.mesh)))
  return {
    title,
    subtitle: options.subtitle ?? `${parts.length} part${parts.length === 1 ? '' : 's'}`,
    background: options.background ?? '#1b1e23',
    wireframe: options.wireframe ?? false,
    bounds: {
      min: [bounds.min.x * scale, bounds.min.y * scale, bounds.min.z * scale],
      max: [bounds.max.x * scale, bounds.max.y * scale, bounds.max.z * scale],
    },
    parts,
  }
}

/** The complete, self-contained page. */
export function exportHtml(
  source: MeshData | NamedMesh | readonly NamedMesh[],
  options: HtmlExportOptions = {},
): string {
  const model = htmlViewerModel(source, options)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Tectonic">
<title>${escapeHtml(model.title)}</title>
<style>
${VIEWER_STYLE}
</style>
</head>
<body>
<div id="app">
  <aside id="tree">
    <h1>${escapeHtml(model.title)}</h1>
    <p class="subtitle">${escapeHtml(model.subtitle)}</p>
    <div class="controls">
      <button type="button" data-action="reset">Reset view</button>
      <label><input type="checkbox" data-action="wireframe"${model.wireframe ? ' checked' : ''}> Wireframe</label>
    </div>
    <ul id="parts"></ul>
    <p class="hint">Drag to orbit &middot; Shift-drag or right-drag to pan &middot; Scroll to zoom</p>
  </aside>
  <canvas id="view"></canvas>
</div>
<script id="model" type="application/json">${embedJson(model)}</script>
<script>
${VIEWER_SCRIPT}
</script>
</body>
</html>
`
}

/** Little-endian bytes of a typed array, base64'd. */
function base64Of(array: Float32Array | Uint32Array): string {
  // Node and every browser this targets are little-endian, and the viewer
  // reads the buffer back with the same typed-array view, so no byte swap is
  // needed — but the copy is, because `buffer` may be a shared pool.
  return encodeBase64(new Uint8Array(array.buffer.slice(0) as ArrayBuffer))
}

/**
 * JSON safe to sit inside a `<script>` element. A `</script>` anywhere in the
 * text — a part could legitimately be called that — would close the element
 * early, so the characters that could start a tag are escaped.
 */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
