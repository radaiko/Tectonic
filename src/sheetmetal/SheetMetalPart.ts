import type { IKernel, PlaneFrame, ShapeHandle } from '../kernel/IKernel'
import { newId } from '../sketch/domain/ids'
import type { Vec2 } from '../sketch/domain/geometry'
import { SheetMetalParameters } from './SheetMetalParameters'
import type { SheetMetalParametersJSON } from './SheetMetalParameters'
import type { BaseFlangeSpec } from './BaseFlange'
import { baseFlangeEdges, baseFlangeFrame, buildBaseFlange, createBaseFlange } from './BaseFlange'
import type { BendChain, ChainDevelopment } from './bend'
import { chainProfile, developChain } from './bend'
import type { EdgeFlangeSpec } from './EdgeFlange'
import { createEdgeFlange, edgeFlangeChain } from './EdgeFlange'
import type { HemSpec } from './Hem'
import { createHem, hemChain } from './Hem'
import type { JogSpec } from './Jog'
import { createJog, jogChain } from './Jog'
import type { MiterFlangeSpec } from './MiterFlange'
import { expandMiterFlange } from './MiterFlange'
import { edgeFrame, requireEdge } from './geometry'
import type { SheetEdge } from './types'
import { SheetMetalError } from './types'

/** Everything that can hang off an edge of the base face. */
export type EdgeFeatureSpec = EdgeFlangeSpec | HemSpec | JogSpec

/** The bends a feature folds through, whichever kind of feature it is. */
export function edgeFeatureChain(
  spec: EdgeFeatureSpec,
  parameters: SheetMetalParameters,
): BendChain {
  switch (spec.kind) {
    case 'hem':
      return hemChain(spec, parameters)
    case 'jog':
      return jogChain(spec, parameters)
    default:
      return edgeFlangeChain(spec, parameters)
  }
}

/** How far a feature reaches beyond its edge once the part is rolled out flat. */
export function edgeFeatureDevelopment(
  spec: EdgeFeatureSpec,
  parameters: SheetMetalParameters,
): ChainDevelopment {
  const chain = edgeFeatureChain(spec, parameters)
  return developChain(chain.steps, parameters, chain.options)
}

/**
 * The solid one edge feature adds: its folded cross-section, swept along the
 * stretch of edge the feature covers.
 */
export async function buildEdgeFeature(
  kernel: IKernel,
  spec: EdgeFeatureSpec,
  edges: readonly SheetEdge[],
  parameters: SheetMetalParameters,
  sketch: PlaneFrame,
): Promise<ShapeHandle> {
  const edge = requireEdge(edges, spec.edgeIndex)
  const placement = edgeFrame(edge, sketch, spec.trimStart, spec.trimEnd)
  const chain = edgeFeatureChain(spec, parameters)

  return kernel.extrude({
    profile: { points: chainProfile(chain.steps, parameters, chain.options) },
    distance: placement.distance,
    plane: placement.frame,
  })
}

export interface SheetMetalPartJSON {
  readonly id: string
  readonly name: string
  readonly parameters: SheetMetalParametersJSON
  readonly base: BaseFlangeSpec
  readonly features: readonly EdgeFeatureSpec[]
}

export interface SheetMetalPartInit {
  readonly id?: string
  readonly name?: string
  readonly parameters?: SheetMetalParameters
  readonly base: BaseFlangeSpec
  readonly features?: readonly EdgeFeatureSpec[]
}

/**
 * A sheet metal body: one base face, the material it is cut from, and the
 * flanges, hems and jogs folded off its edges.
 *
 * The part is the single source of truth for both views of the model — the
 * folded solid and the flat pattern come from the same specs, so they can never
 * drift apart.
 */
export class SheetMetalPart {
  readonly id: string
  name: string
  parameters: SheetMetalParameters
  base: BaseFlangeSpec
  readonly features: EdgeFeatureSpec[]

  constructor(init: SheetMetalPartInit) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Sheet Metal'
    this.parameters = init.parameters ?? new SheetMetalParameters()
    this.base = init.base
    this.features = [...(init.features ?? [])]
  }

  /** The edges of the base face features can attach to. */
  get edges(): SheetEdge[] {
    return baseFlangeEdges(this.base)
  }

  /** World placement of the base face. */
  get frame(): PlaneFrame {
    return baseFlangeFrame(this.base)
  }

  getFeature(id: string): EdgeFeatureSpec | undefined {
    return this.features.find((feature) => feature.id === id)
  }

  /**
   * Adds a feature. An edge carries at most one — two flanges folded off the
   * same edge would occupy the same material, in the flat pattern as much as in
   * the solid.
   */
  addFeature(spec: EdgeFeatureSpec): EdgeFeatureSpec {
    requireEdge(this.edges, spec.edgeIndex)
    if (this.features.some((feature) => feature.edgeIndex === spec.edgeIndex)) {
      throw new SheetMetalError(`Edge ${spec.edgeIndex} already carries a feature`)
    }
    this.features.push(spec)
    return spec
  }

  /** Adds every flange of a mitre in one go, with the corner trims worked out. */
  addMiterFlange(spec: MiterFlangeSpec): EdgeFlangeSpec[] {
    const flanges = expandMiterFlange(spec, this.edges, this.parameters)
    for (const flange of flanges) this.addFeature(flange)
    return flanges
  }

  removeFeature(id: string): boolean {
    const index = this.features.findIndex((feature) => feature.id === id)
    if (index === -1) return false
    this.features.splice(index, 1)
    return true
  }

  /** Replaces a feature with a changed copy, keeping its place in the list. */
  updateFeature(id: string, changes: Partial<EdgeFeatureSpec>): EdgeFeatureSpec | undefined {
    const index = this.features.findIndex((feature) => feature.id === id)
    const current = this.features[index]
    if (!current) return undefined

    const merged = rebuildFeature({ ...current, ...changes } as EdgeFeatureSpec)
    requireEdge(this.edges, merged.edgeIndex)
    if (this.features.some((other) => other.id !== id && other.edgeIndex === merged.edgeIndex)) {
      throw new SheetMetalError(`Edge ${merged.edgeIndex} already carries a feature`)
    }
    this.features[index] = merged
    return merged
  }

  setParameters(changes: Parameters<SheetMetalParameters['with']>[0]): SheetMetalParameters {
    this.parameters = this.parameters.with(changes)
    return this.parameters
  }

  /** The folded body. */
  async build(kernel: IKernel): Promise<ShapeHandle> {
    const frame = this.frame
    const edges = this.edges
    let shape = await buildBaseFlange(kernel, this.base, this.parameters)

    for (const feature of this.features) {
      const tool = await buildEdgeFeature(kernel, feature, edges, this.parameters, frame)
      const merged = await kernel.booleanUnion(shape, tool)
      kernel.dispose(shape)
      kernel.dispose(tool)
      shape = merged
    }
    return shape
  }

  toJSON(): SheetMetalPartJSON {
    return {
      id: this.id,
      name: this.name,
      parameters: this.parameters.toJSON(),
      base: cloneBase(this.base),
      features: this.features.map((feature) => ({ ...feature })),
    }
  }

  static fromJSON(json: SheetMetalPartJSON): SheetMetalPart {
    return new SheetMetalPart({
      id: json.id,
      name: json.name,
      parameters: SheetMetalParameters.fromJSON(json.parameters),
      base: createBaseFlange(json.base),
      features: (json.features ?? []).map(rebuildFeature),
    })
  }

  clone(): SheetMetalPart {
    return SheetMetalPart.fromJSON(this.toJSON())
  }
}

/** Re-runs a spec through its factory, so a hand-edited copy is validated. */
export function rebuildFeature(spec: EdgeFeatureSpec): EdgeFeatureSpec {
  switch (spec.kind) {
    case 'hem':
      return createHem(spec)
    case 'jog':
      return createJog(spec)
    case 'edge-flange':
      return createEdgeFlange(spec)
    default:
      throw new SheetMetalError(
        `Unknown sheet metal feature: ${String((spec as { kind?: unknown }).kind)}`,
      )
  }
}

function cloneBase(base: BaseFlangeSpec): BaseFlangeSpec {
  return {
    ...base,
    points: base.points.map((point: Vec2) => ({ x: point.x, y: point.y })),
    holes: base.holes.map((hole) => hole.map((point) => ({ x: point.x, y: point.y }))),
  }
}
