import type { MeshData } from './MeshData'
import type { SketchModelJSON, SketchPlane } from '../sketch/domain/SketchModel'
import { SketchModel } from '../sketch/domain/SketchModel'
import type { SketchSupport } from '../sketch/domain/SketchSupport'
import { originPlaneSupport } from '../sketch/domain/SketchSupport'
import { FeatureTree } from '../features/FeatureTree'
import type { Feature, FeatureJSON } from '../features/domain/Feature'
import { featureFromUnknown } from '../features/domain/Feature'

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

export interface TectonicDocument {
  readonly version: number
  readonly metadata: DocumentMetadata
  /**
   * Geometry that arrived with the file rather than being modelled here. Bodies
   * built by the feature tree are computed on every rebuild and deliberately not
   * written back — the tree plus the sketches is the model.
   */
  readonly parts: Part[]
  /** The ordered modelling history. */
  readonly features: readonly FeatureJSON[]
  /** How many features sit in front of the roll bar. Defaults to all of them. */
  readonly rollBarIndex?: number
  /**
   * Every sketch in the document, in creation order. Each carries its own
   * support, so this is a list of independent entities rather than one global
   * sketch. Optional only so pre-M2 files still open.
   */
  readonly sketches?: readonly SketchModelJSON[]
  /** The single M1 sketch. Read when `sketches` is absent, never written. */
  readonly sketch?: SketchModelJSON
}

export interface NewDocumentOptions {
  readonly name?: string
  readonly units?: LengthUnit
  /** Injected so callers (and tests) control the timestamp. */
  readonly now?: string
}

/**
 * A brand new document: no parts, no bodies, no history. Modelling starts from
 * a sketch, so one empty sketch on the XY plane is seeded to draw on — nothing
 * is built until a feature says so.
 */
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
    sketches: [createBlankSketch().toJSON()],
  }
}

/** An empty sketch on whatever it is attached to — a base plane or a face. */
export function createSketchOn(support: SketchSupport, name = 'Sketch 1'): SketchModel {
  return new SketchModel({ name, support })
}

/** An empty sketch on a base plane, named for its place in the document. */
export function createBlankSketch(name = 'Sketch 1', plane: SketchPlane = 'XY'): SketchModel {
  return createSketchOn(originPlaneSupport(plane), name)
}

/** The next free `Sketch <n>` name, so added sketches never collide. */
export function nextSketchName(existing: Iterable<SketchModel>): string {
  const taken = new Set<string>()
  for (const sketch of existing) taken.add(sketch.name)
  let index = 1
  while (taken.has(`Sketch ${index}`)) index += 1
  return `Sketch ${index}`
}

/**
 * Every sketch in the document, as live models.
 *
 * Files written before sketches were a list carry a single `sketch` instead;
 * that one is read as a one-entry list, which is what keeps old documents
 * opening unchanged. A document with neither has no sketches — that is a
 * legitimate state, not a missing one.
 */
export function documentSketches(document: TectonicDocument): SketchModel[] {
  if (document.sketches) return document.sketches.map((json) => SketchModel.fromJSON(json))
  return document.sketch ? [SketchModel.fromJSON(document.sketch)] : []
}

/**
 * The document's first sketch as a live model, or a blank one when it has none.
 * For callers that only ever deal with a single sketch.
 */
export function documentSketch(document: TectonicDocument): SketchModel {
  return documentSketches(document)[0] ?? createBlankSketch()
}

/** The document with these sketches, restamped as modified. */
export function withSketches(
  document: TectonicDocument,
  sketches: Iterable<SketchModel>,
  now?: string,
): TectonicDocument {
  // The legacy single-sketch field is dropped rather than left to contradict
  // the list; `documentSketches` only reads it when the list is absent.
  const { sketch: _legacy, ...rest } = document
  return {
    ...rest,
    sketches: [...sketches].map((entry) => entry.toJSON()),
    metadata: { ...document.metadata, modified: now ?? new Date().toISOString() },
  }
}

/**
 * The document with one sketch brought up to date, restamped as modified. A
 * sketch the document does not already hold is appended.
 */
export function withSketch(
  document: TectonicDocument,
  sketch: SketchModel,
  now?: string,
): TectonicDocument {
  const sketches = documentSketches(document)
  const index = sketches.findIndex((entry) => entry.id === sketch.id)
  if (index === -1) sketches.push(sketch)
  else sketches[index] = sketch
  return withSketches(document, sketches, now)
}

/**
 * The document's modelling history as a live tree. Entries that are not a
 * feature this build understands are dropped rather than failing the open — a
 * file is worth more half-read than not read at all.
 */
export function documentFeatureTree(document: TectonicDocument): FeatureTree {
  const features: Feature[] = []
  for (const entry of document.features) {
    try {
      features.push(featureFromUnknown(entry))
    } catch {
      // Unknown feature kind: skip it and keep the rest of the history.
    }
  }
  return new FeatureTree(features, document.rollBarIndex)
}

/** The document with the history as it currently stands, restamped as modified. */
export function withFeatureTree(
  document: TectonicDocument,
  tree: FeatureTree,
  now?: string,
): TectonicDocument {
  const json = tree.toJSON()
  return {
    ...document,
    features: json.features,
    rollBarIndex: json.rollBarIndex,
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
