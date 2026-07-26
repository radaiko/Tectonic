import type { MeshData } from './MeshData'
import type { SketchModelJSON } from '../sketch/domain/SketchModel'
import { SketchModel } from '../sketch/domain/SketchModel'

/** Format version of the .tectonic container. Bump on breaking schema changes. */
export const TECTONIC_FORMAT_VERSION = 1

export interface DocumentMetadata {
  readonly name: string
  /** ISO 8601 timestamp. */
  readonly created: string
  /** ISO 8601 timestamp. */
  readonly modified: string
  /** Unit system all lengths in this document are expressed in. */
  readonly units: LengthUnit
}

export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft'

/** A tessellated solid owned by a part. */
export interface Body {
  readonly id: string
  readonly name: string
  readonly mesh: MeshData
}

export interface Part {
  readonly id: string
  readonly name: string
  readonly bodies: Body[]
}

/**
 * One entry of the ordered, parametric feature tree. `parameters` stays an open
 * record so feature kinds can be added in M2 without a format change.
 */
export interface Feature {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly suppressed: boolean
  readonly parameters: Record<string, FeatureParameterValue>
}

export type FeatureParameterValue = string | number | boolean | null

export interface TectonicDocument {
  readonly version: number
  readonly metadata: DocumentMetadata
  readonly parts: Part[]
  readonly features: Feature[]
  /** The document's 2D sketch. Optional so pre-M1 files still open. */
  readonly sketch?: SketchModelJSON
}

export interface NewDocumentOptions {
  readonly name?: string
  readonly units?: LengthUnit
  /** Injected so callers (and tests) control the timestamp. */
  readonly now?: string
}

export function createDocument(options: NewDocumentOptions = {}): TectonicDocument {
  const timestamp = options.now ?? new Date().toISOString()
  return {
    version: TECTONIC_FORMAT_VERSION,
    metadata: {
      name: options.name ?? 'Untitled',
      created: timestamp,
      modified: timestamp,
      units: options.units ?? 'mm',
    },
    parts: [],
    features: [],
    sketch: createBlankSketch().toJSON(),
  }
}

/** The sketch a brand new document opens on: empty, on the XY plane. */
export function createBlankSketch(name = 'Sketch 1'): SketchModel {
  return new SketchModel({ name, plane: 'XY' })
}

/**
 * The document's sketch as a live model. Documents written before sketches
 * existed simply get a blank one.
 */
export function documentSketch(document: TectonicDocument): SketchModel {
  return document.sketch ? SketchModel.fromJSON(document.sketch) : createBlankSketch()
}

/** The document with the sketch as it currently stands, restamped as modified. */
export function withSketch(
  document: TectonicDocument,
  sketch: SketchModel,
  now?: string,
): TectonicDocument {
  return {
    ...document,
    sketch: sketch.toJSON(),
    metadata: { ...document.metadata, modified: now ?? new Date().toISOString() },
  }
}

export function createPart(id: string, name: string, bodies: Body[] = []): Part {
  return { id, name, bodies }
}

export function createBody(id: string, name: string, mesh: MeshData): Body {
  return { id, name, mesh }
}

/** Total body count across every part — used by the editor status bar. */
export function countBodies(document: TectonicDocument): number {
  return document.parts.reduce((total, part) => total + part.bodies.length, 0)
}
