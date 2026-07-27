/**
 * A Part Studio: one workspace holding several parts that share one pool of
 * sketches.
 *
 * The distinction from a plain document is where the sketches live. In a
 * single-part document a sketch belongs to the history that consumes it; here
 * the sketches sit at the studio level and any part's feature tree may point at
 * any of them. That is what lets a bracket and its cover plate be driven by the
 * same profile — edit the sketch once and both parts rebuild.
 *
 * Each part keeps its own {@link FeatureTree}, so ordering, suppression and the
 * roll bar stay per part. Parts may additionally declare that they consume
 * another part's geometry (a shared edge, a face to shell against); those links
 * are kept as ids and constrain the order the studio rebuilds in.
 */

import { FeatureTree } from '../features/FeatureTree'
import type { FeatureTreeJSON } from '../features/FeatureTree'
import type { Feature } from '../features/domain/Feature'
import type { FeatureEngine, FeatureEvaluation } from '../features/FeatureEngine'
import { SketchModel } from '../sketch/domain/SketchModel'
import type { SketchModelJSON, SketchModelInit } from '../sketch/domain/SketchModel'
import { newId } from '../sketch/domain/ids'

/** Raised when a studio cannot be assembled or edited as asked. */
export class StudioError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StudioError'
  }
}

export interface StudioPartJSON {
  readonly id: string
  readonly name: string
  readonly visible: boolean
  /** Display colour as a CSS string, or null to use the studio default. */
  readonly color: string | null
  readonly tree: FeatureTreeJSON
  /** Other parts in the studio whose geometry this part's features consume. */
  readonly referencePartIds: readonly string[]
}

export interface StudioPartInit {
  readonly id?: string
  readonly name?: string
  readonly visible?: boolean
  readonly color?: string | null
  readonly tree?: FeatureTree
  readonly referencePartIds?: readonly string[]
}

/**
 * One part inside a studio: a name, a visibility flag and its own history.
 *
 * The part never owns a sketch. It only ever names one, which is what makes a
 * sketch shareable in the first place.
 */
export class StudioPart {
  readonly id: string
  name: string
  visible: boolean
  color: string | null
  readonly tree: FeatureTree
  referencePartIds: string[]

  constructor(init: StudioPartInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Part'
    this.visible = init.visible ?? true
    this.color = init.color ?? null
    this.tree = init.tree ?? new FeatureTree()
    this.referencePartIds = [...(init.referencePartIds ?? [])]
  }

  /** Distinct studio sketches this part's features read, in tree order. */
  get sketchIds(): string[] {
    const seen: string[] = []
    for (const feature of this.tree.features) {
      if (feature.sketchId && !seen.includes(feature.sketchId)) seen.push(feature.sketchId)
    }
    return seen
  }

  usesSketch(sketchId: string): boolean {
    return this.tree.features.some((feature) => feature.sketchId === sketchId)
  }

  /** The features that read a given sketch, in tree order. */
  featuresUsing(sketchId: string): Feature[] {
    return this.tree.features.filter((feature) => feature.sketchId === sketchId)
  }

  referencesPart(partId: string): boolean {
    return this.referencePartIds.includes(partId)
  }

  toJSON(): StudioPartJSON {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      color: this.color,
      tree: this.tree.toJSON(),
      referencePartIds: [...this.referencePartIds],
    }
  }

  static fromJSON(json: StudioPartJSON): StudioPart {
    return new StudioPart({
      id: json.id,
      name: json.name,
      visible: json.visible ?? true,
      color: json.color ?? null,
      tree: FeatureTree.fromJSON(json.tree),
      referencePartIds: json.referencePartIds ?? [],
    })
  }

  clone(): StudioPart {
    return StudioPart.fromJSON(this.toJSON())
  }
}

export interface PartStudioJSON {
  readonly id: string
  readonly name: string
  readonly sketches: readonly SketchModelJSON[]
  readonly parts: readonly StudioPartJSON[]
  readonly activePartId: string | null
}

export interface PartStudioInit {
  readonly id?: string
  readonly name?: string
  readonly sketches?: readonly SketchModel[]
  readonly parts?: readonly StudioPart[]
  readonly activePartId?: string | null
}

/** How one sketch is consumed across the studio. */
export interface SketchUsage {
  readonly sketchId: string
  readonly sketchName: string
  /** Parts whose history reads this sketch, in studio order. */
  readonly partIds: readonly string[]
  /** Feature ids that read it, keyed by part. */
  readonly featureIdsByPart: ReadonlyMap<string, readonly string[]>
  /** True when more than one part reads it — the reason the studio exists. */
  readonly shared: boolean
}

export interface StudioEvaluation {
  /** Rebuild results keyed by part id, only for the parts that were evaluated. */
  readonly byPart: ReadonlyMap<string, FeatureEvaluation>
  /** The order the parts were rebuilt in, references first. */
  readonly order: readonly string[]
}

export class PartStudio {
  readonly id: string
  name: string
  #sketches: SketchModel[] = []
  #parts: StudioPart[] = []
  #activePartId: string | null = null

  constructor(init: PartStudioInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Part Studio'
    for (const sketch of init.sketches ?? []) this.addSketch(sketch)
    for (const part of init.parts ?? []) this.addPart(part)
    this.#activePartId =
      init.activePartId !== undefined && init.activePartId !== null
        ? (this.getPart(init.activePartId)?.id ?? null)
        : (this.#parts[0]?.id ?? null)
  }

  get sketches(): readonly SketchModel[] {
    return this.#sketches
  }

  get parts(): readonly StudioPart[] {
    return this.#parts
  }

  get sketchCount(): number {
    return this.#sketches.length
  }

  get partCount(): number {
    return this.#parts.length
  }

  get visibleParts(): StudioPart[] {
    return this.#parts.filter((part) => part.visible)
  }

  get activePartId(): string | null {
    return this.#activePartId
  }

  /** Selecting a part that is not in the studio clears the selection. */
  setActivePart(partId: string | null): string | null {
    this.#activePartId = partId === null ? null : (this.getPart(partId)?.id ?? null)
    return this.#activePartId
  }

  get activePart(): StudioPart | null {
    return this.#activePartId === null ? null : (this.getPart(this.#activePartId) ?? null)
  }

  // ---------------------------------------------------------------- sketches

  addSketch(sketch: SketchModel): SketchModel {
    if (this.getSketch(sketch.id)) {
      throw new StudioError(`Studio already has a sketch with id ${sketch.id}`)
    }
    this.#sketches.push(sketch)
    return sketch
  }

  /** A new empty sketch, named "Sketch N" against what the studio already holds. */
  createSketch(init: SketchModelInit = {}): SketchModel {
    const sketch = new SketchModel({ name: this.nextSketchName(), ...init })
    return this.addSketch(sketch)
  }

  nextSketchName(): string {
    const taken = new Set(this.#sketches.map((sketch) => sketch.name))
    let index = 1
    while (taken.has(`Sketch ${index}`)) index += 1
    return `Sketch ${index}`
  }

  getSketch(sketchId: string): SketchModel | undefined {
    return this.#sketches.find((sketch) => sketch.id === sketchId)
  }

  requireSketch(sketchId: string): SketchModel {
    const sketch = this.getSketch(sketchId)
    if (!sketch) throw new StudioError(`No sketch with id ${sketchId} in this studio`)
    return sketch
  }

  /**
   * Drops a sketch. A sketch a part still reads is kept unless `force` is set,
   * because deleting it silently would break that part's rebuild.
   */
  removeSketch(sketchId: string, force = false): boolean {
    const index = this.#sketches.findIndex((sketch) => sketch.id === sketchId)
    if (index === -1) return false
    if (!force && this.partsUsingSketch(sketchId).length > 0) return false

    this.#sketches.splice(index, 1)
    for (const part of this.#parts) {
      for (const feature of part.tree.features) {
        if (feature.sketchId === sketchId) feature.sketchId = null
      }
    }
    return true
  }

  /** Parts whose history reads this sketch, in studio order. */
  partsUsingSketch(sketchId: string): StudioPart[] {
    return this.#parts.filter((part) => part.usesSketch(sketchId))
  }

  /** Studio sketches a part reads, in the order its features first name them. */
  sketchesUsedBy(partId: string): SketchModel[] {
    const part = this.getPart(partId)
    if (!part) return []
    return part.sketchIds
      .map((sketchId) => this.getSketch(sketchId))
      .filter((sketch): sketch is SketchModel => sketch !== undefined)
  }

  /** Sketches no part reads — safe to delete, and worth flagging in the browser. */
  unusedSketches(): SketchModel[] {
    return this.#sketches.filter((sketch) => this.partsUsingSketch(sketch.id).length === 0)
  }

  isSketchShared(sketchId: string): boolean {
    return this.partsUsingSketch(sketchId).length > 1
  }

  /** The whole reference picture, one entry per sketch, for the studio browser. */
  sketchUsage(): SketchUsage[] {
    return this.#sketches.map((sketch) => {
      const featureIdsByPart = new Map<string, readonly string[]>()
      const partIds: string[] = []
      for (const part of this.#parts) {
        const features = part.featuresUsing(sketch.id)
        if (features.length === 0) continue
        partIds.push(part.id)
        featureIdsByPart.set(
          part.id,
          features.map((feature) => feature.id),
        )
      }
      return {
        sketchId: sketch.id,
        sketchName: sketch.name,
        partIds,
        featureIdsByPart,
        shared: partIds.length > 1,
      }
    })
  }

  // ------------------------------------------------------------------- parts

  addPart(part: StudioPart): StudioPart {
    if (this.getPart(part.id)) {
      throw new StudioError(`Studio already has a part with id ${part.id}`)
    }
    this.#parts.push(part)
    if (this.#activePartId === null) this.#activePartId = part.id
    return part
  }

  createPart(name?: string): StudioPart {
    return this.addPart(new StudioPart({ name: name ?? this.nextPartName() }))
  }

  nextPartName(): string {
    const taken = new Set(this.#parts.map((part) => part.name))
    let index = 1
    while (taken.has(`Part ${index}`)) index += 1
    return `Part ${index}`
  }

  getPart(partId: string): StudioPart | undefined {
    return this.#parts.find((part) => part.id === partId)
  }

  requirePart(partId: string): StudioPart {
    const part = this.getPart(partId)
    if (!part) throw new StudioError(`No part with id ${partId} in this studio`)
    return part
  }

  /** Removes a part and every reference other parts held to it. */
  removePart(partId: string): boolean {
    const index = this.#parts.findIndex((part) => part.id === partId)
    if (index === -1) return false

    this.#parts.splice(index, 1)
    for (const part of this.#parts) {
      part.referencePartIds = part.referencePartIds.filter((id) => id !== partId)
    }
    if (this.#activePartId === partId) this.#activePartId = this.#parts[0]?.id ?? null
    return true
  }

  renamePart(partId: string, name: string): boolean {
    const part = this.getPart(partId)
    if (!part || name.trim().length === 0) return false
    part.name = name.trim()
    return true
  }

  setPartVisible(partId: string, visible: boolean): boolean {
    const part = this.getPart(partId)
    if (!part) return false
    part.visible = visible
    return true
  }

  togglePartVisibility(partId: string): boolean {
    const part = this.getPart(partId)
    if (!part) return false
    part.visible = !part.visible
    return part.visible
  }

  /** Isolates one part — the studio equivalent of "hide everything else". */
  showOnly(partId: string): boolean {
    if (!this.getPart(partId)) return false
    for (const part of this.#parts) part.visible = part.id === partId
    return true
  }

  showAll(): void {
    for (const part of this.#parts) part.visible = true
  }

  // -------------------------------------------------------------- references

  /**
   * Records that `partId` consumes geometry from `sourceId`.
   *
   * Rejected when it would make a part depend on itself, directly or through a
   * chain, because the studio would then have no order to rebuild in.
   */
  addPartReference(partId: string, sourceId: string): boolean {
    const part = this.requirePart(partId)
    this.requirePart(sourceId)
    if (partId === sourceId) throw new StudioError('A part cannot reference itself')
    if (part.referencesPart(sourceId)) return false
    if (this.#reaches(sourceId, partId)) {
      throw new StudioError(`Referencing ${sourceId} from ${partId} would create a cycle`)
    }
    part.referencePartIds.push(sourceId)
    return true
  }

  removePartReference(partId: string, sourceId: string): boolean {
    const part = this.getPart(partId)
    if (!part || !part.referencesPart(sourceId)) return false
    part.referencePartIds = part.referencePartIds.filter((id) => id !== sourceId)
    return true
  }

  /** Parts that consume this part's geometry, transitively, in studio order. */
  dependentsOf(partId: string): StudioPart[] {
    const found = new Set<string>()
    const queue = [partId]
    while (queue.length > 0) {
      const current = queue.shift() as string
      for (const part of this.#parts) {
        if (found.has(part.id) || part.id === partId) continue
        if (part.referencesPart(current)) {
          found.add(part.id)
          queue.push(part.id)
        }
      }
    }
    return this.#parts.filter((part) => found.has(part.id))
  }

  /**
   * Rebuild order: every part after the parts it reads from. Parts caught in a
   * cycle — only reachable through corrupt JSON, since {@link addPartReference}
   * refuses to make one — are appended in studio order so nothing is dropped.
   */
  buildOrder(): StudioPart[] {
    const ordered: StudioPart[] = []
    const placed = new Set<string>()

    const visit = (part: StudioPart, trail: Set<string>): void => {
      if (placed.has(part.id) || trail.has(part.id)) return
      trail.add(part.id)
      for (const sourceId of part.referencePartIds) {
        const source = this.getPart(sourceId)
        if (source) visit(source, trail)
      }
      trail.delete(part.id)
      placed.add(part.id)
      ordered.push(part)
    }

    for (const part of this.#parts) visit(part, new Set())
    for (const part of this.#parts) {
      if (!placed.has(part.id)) ordered.push(part)
    }
    return ordered
  }

  /** Whether `from` reaches `target` by following references. */
  #reaches(from: string, target: string): boolean {
    if (from === target) return true
    const seen = new Set<string>([from])
    const queue = [from]
    while (queue.length > 0) {
      const current = queue.shift() as string
      for (const sourceId of this.getPart(current)?.referencePartIds ?? []) {
        if (sourceId === target) return true
        if (seen.has(sourceId)) continue
        seen.add(sourceId)
        queue.push(sourceId)
      }
    }
    return false
  }

  // ---------------------------------------------------------------- features

  /**
   * Adds a feature to a part's history, checking first that any sketch it names
   * actually lives in this studio. Catching it here is the difference between a
   * clear error and a mystery rebuild failure.
   */
  addFeature(partId: string, feature: Feature, index?: number): Feature {
    const part = this.requirePart(partId)
    if (feature.sketchId !== null && !this.getSketch(feature.sketchId)) {
      throw new StudioError(
        `Feature ${feature.name} names sketch ${feature.sketchId}, which is not in this studio`,
      )
    }
    return part.tree.addFeature(feature, index)
  }

  /** Every part whose history contains a feature with this id. */
  partsWithFeature(featureId: string): StudioPart[] {
    return this.#parts.filter((part) => part.tree.getFeature(featureId) !== undefined)
  }

  /** Rebuilds one part against the studio's shared sketch pool. */
  async evaluatePart(engine: FeatureEngine, partId: string): Promise<FeatureEvaluation> {
    const part = this.requirePart(partId)
    return engine.evaluate(part.tree, this.#sketches)
  }

  /** Rebuilds every part, references first. */
  async evaluateAll(engine: FeatureEngine): Promise<StudioEvaluation> {
    const byPart = new Map<string, FeatureEvaluation>()
    const order: string[] = []
    for (const part of this.buildOrder()) {
      byPart.set(part.id, await engine.evaluate(part.tree, this.#sketches))
      order.push(part.id)
    }
    return { byPart, order }
  }

  // ------------------------------------------------------------------ format

  toJSON(): PartStudioJSON {
    return {
      id: this.id,
      name: this.name,
      sketches: this.#sketches.map((sketch) => sketch.toJSON()),
      parts: this.#parts.map((part) => part.toJSON()),
      activePartId: this.#activePartId,
    }
  }

  /**
   * Reads a studio back. References to parts that did not survive the round trip
   * are dropped rather than failing the open, matching how the rest of the
   * format treats damage.
   */
  static fromJSON(json: PartStudioJSON): PartStudio {
    const parts = (json.parts ?? []).map(StudioPart.fromJSON)
    const known = new Set(parts.map((part) => part.id))
    for (const part of parts) {
      part.referencePartIds = part.referencePartIds.filter(
        (id) => id !== part.id && known.has(id),
      )
    }
    return new PartStudio({
      id: json.id,
      name: json.name,
      sketches: (json.sketches ?? []).map(SketchModel.fromJSON),
      parts,
      activePartId: json.activePartId ?? null,
    })
  }

  clone(): PartStudio {
    return PartStudio.fromJSON(this.toJSON())
  }
}
