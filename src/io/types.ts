import type { MeshData } from '../domain/MeshData'
import type { LengthUnit } from '../domain/Document'

/**
 * Shared vocabulary for the import/export pipelines. Everything here is plain
 * data: an importer turns bytes into these, an exporter turns these into bytes,
 * and neither knows anything about React, three.js or the kernel.
 */

/** Raised when a file cannot be read as the format it claims to be. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

/** Raised when the model cannot be expressed in the requested format. */
export class ExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExportError'
  }
}

/** Linear RGB in 0..1, the currency every format converts to and from. */
export interface RgbColor {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** A material as much as the mesh formats care about it. */
export interface MaterialSpec {
  readonly name: string
  readonly color: RgbColor
  /** 0 = fully transparent, 1 = opaque. */
  readonly opacity?: number
  readonly metallic?: number
  readonly roughness?: number
}

export const DEFAULT_MATERIAL: MaterialSpec = {
  name: 'Tectonic Default',
  color: { r: 0.8, g: 0.8, b: 0.82 },
  opacity: 1,
  metallic: 0.1,
  roughness: 0.6,
}

/**
 * One named lump of geometry heading out to a mesh format. `uvs` is a flat
 * [u, v, ...] array parallel to the mesh's vertices when texture coordinates
 * are available.
 */
export interface NamedMesh {
  readonly name: string
  readonly mesh: MeshData
  readonly uvs?: readonly number[]
  readonly material?: MaterialSpec
  /** Whether the exporter should emit smooth (vertex) or faceted normals. */
  readonly smooth?: boolean
}

/** Millimetres per unit, for every unit the document can be expressed in. */
export const MILLIMETRES_PER_UNIT: Readonly<Record<LengthUnit, number>> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
}

/** Factor that converts a length in `from` to the same length in `to`. */
export function unitScale(from: LengthUnit, to: LengthUnit): number {
  return MILLIMETRES_PER_UNIT[from] / MILLIMETRES_PER_UNIT[to]
}

/** Formats a number without exponent notation and without trailing zeroes. */
export function formatNumber(value: number, precision = 6): number | string {
  if (!Number.isFinite(value)) return 0
  const fixed = value.toFixed(precision)
  const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
  return trimmed === '-0' ? '0' : trimmed
}

/** `formatNumber` as a string — the shape every text format actually wants. */
export function num(value: number, precision = 6): string {
  return String(formatNumber(value, precision))
}
