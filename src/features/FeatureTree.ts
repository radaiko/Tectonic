import type { Feature, FeatureJSON } from './domain/Feature'
import { featureFromUnknown } from './domain/Feature'

export interface FeatureTreeJSON {
  readonly features: readonly FeatureJSON[]
  /** Number of features in front of the roll bar, i.e. the ones evaluated. */
  readonly rollBarIndex: number
}

/**
 * The ordered modelling history. Order is the only thing that decides what a
 * feature can see: everything before it in the list, and nothing after.
 *
 * The roll bar is an index *between* entries — `rollBarIndex` counts how many
 * features are in front of it, so `length` means "nothing rolled back".
 */
export class FeatureTree {
  #features: Feature[] = []
  #rollBarIndex = 0

  constructor(features: readonly Feature[] = [], rollBarIndex?: number) {
    this.#features = [...features]
    this.#rollBarIndex = clampIndex(rollBarIndex ?? this.#features.length, this.#features.length)
  }

  get features(): readonly Feature[] {
    return this.#features
  }

  get length(): number {
    return this.#features.length
  }

  get rollBarIndex(): number {
    return this.#rollBarIndex
  }

  getFeature(id: string): Feature | undefined {
    return this.#features.find((feature) => feature.id === id)
  }

  requireFeature(id: string): Feature {
    const feature = this.getFeature(id)
    if (!feature) throw new Error(`No feature with id ${id}`)
    return feature
  }

  indexOf(id: string): number {
    return this.#features.findIndex((feature) => feature.id === id)
  }

  /**
   * Inserts at `index`, or at the end. The roll bar follows the tail so a
   * feature added while nothing is rolled back stays visible.
   */
  addFeature(feature: Feature, index?: number): Feature {
    const at = index === undefined ? this.#features.length : clampIndex(index, this.#features.length)
    const atTail = this.#rollBarIndex === this.#features.length

    this.#features.splice(at, 0, feature)
    for (const parentId of feature.parentFeatureIds) {
      this.getFeature(parentId)?.addChild(feature.id)
    }

    this.#rollBarIndex = atTail
      ? this.#features.length
      : this.#rollBarIndex + (at < this.#rollBarIndex ? 1 : 0)
    return feature
  }

  /** Removes a feature together with everything built on top of it. */
  removeFeature(id: string): string[] {
    if (this.indexOf(id) === -1) return []

    const doomed = new Set<string>([id, ...this.getDependents(id).map((f) => f.id)])
    this.#features = this.#features.filter((feature) => !doomed.has(feature.id))
    for (const feature of this.#features) {
      for (const removed of doomed) feature.removeLink(removed)
    }
    this.#rollBarIndex = clampIndex(this.#rollBarIndex, this.#features.length)
    return [...doomed]
  }

  /**
   * Moves a feature — and the dependents that must stay behind it — to a new
   * position. Returns false and changes nothing when the move breaks a
   * dependency.
   */
  reorderFeature(id: string, newIndex: number): boolean {
    const block = this.#blockOf(id)
    if (block.length === 0) return false

    const rest = this.#features.filter((feature) => !block.includes(feature))
    const target = clampIndex(newIndex, rest.length)
    if (!this.#blockFits(block, rest, target)) return false

    const atTail = this.#rollBarIndex === this.#features.length
    this.#features = [...rest.slice(0, target), ...block, ...rest.slice(target)]
    if (atTail) this.#rollBarIndex = this.#features.length
    return true
  }

  /** Whether {@link reorderFeature} would succeed, without performing it. */
  validateDependencies(id: string, newIndex: number): boolean {
    const block = this.#blockOf(id)
    if (block.length === 0) return false
    const rest = this.#features.filter((feature) => !block.includes(feature))
    return this.#blockFits(block, rest, clampIndex(newIndex, rest.length))
  }

  suppressFeature(id: string): boolean {
    const feature = this.getFeature(id)
    if (!feature) return false
    feature.status = 'suppressed'
    feature.errorMessage = null
    return true
  }

  unsuppressFeature(id: string): boolean {
    const feature = this.getFeature(id)
    if (!feature || feature.status !== 'suppressed') return false
    feature.status = 'active'
    return true
  }

  renameFeature(id: string, name: string): boolean {
    const feature = this.getFeature(id)
    if (!feature || name.trim().length === 0) return false
    feature.name = name.trim()
    return true
  }

  moveRollBar(newIndex: number): number {
    this.#rollBarIndex = clampIndex(newIndex, this.#features.length)
    return this.#rollBarIndex
  }

  /** Features the engine will evaluate: in front of the bar and not suppressed. */
  getActiveFeatures(): Feature[] {
    return this.#features
      .slice(0, this.#rollBarIndex)
      .filter((feature) => feature.status !== 'suppressed')
  }

  /** Features rolled back behind the bar, in tree order. */
  getRolledBackFeatures(): Feature[] {
    return this.#features.slice(this.#rollBarIndex)
  }

  /** Everything that depends on `id`, transitively, in tree order. */
  getDependents(id: string): Feature[] {
    const found = new Set<string>()
    const queue = [id]

    while (queue.length > 0) {
      const current = queue.shift() as string
      for (const feature of this.#features) {
        if (found.has(feature.id) || feature.id === id) continue
        if (feature.parentFeatureIds.includes(current)) {
          found.add(feature.id)
          queue.push(feature.id)
        }
      }
    }

    return this.#features.filter((feature) => found.has(feature.id))
  }

  /** Clears stale errors so a rebuild starts from a clean slate. */
  clearErrors(): void {
    for (const feature of this.#features) feature.clearError()
  }

  toJSON(): FeatureTreeJSON {
    return {
      features: this.#features.map((feature) => feature.toJSON()),
      rollBarIndex: this.#rollBarIndex,
    }
  }

  static fromJSON(json: FeatureTreeJSON): FeatureTree {
    return new FeatureTree(json.features.map(featureFromUnknown), json.rollBarIndex)
  }

  /** Deep copy — used to trial a reorder or an edit before committing to it. */
  clone(): FeatureTree {
    return FeatureTree.fromJSON(this.toJSON())
  }

  /** A feature plus its dependents, which have to travel with it. */
  #blockOf(id: string): Feature[] {
    const feature = this.getFeature(id)
    if (!feature) return []
    const dependents = new Set(this.getDependents(id).map((child) => child.id))
    return this.#features.filter((candidate) => candidate.id === id || dependents.has(candidate.id))
  }

  /**
   * A block fits at `target` when every parent it depends on — and that is not
   * travelling with it — still sits in front of it.
   */
  #blockFits(block: readonly Feature[], rest: readonly Feature[], target: number): boolean {
    const inBlock = new Set(block.map((feature) => feature.id))
    for (const feature of block) {
      for (const parentId of feature.parentFeatureIds) {
        if (inBlock.has(parentId)) continue
        const position = rest.findIndex((candidate) => candidate.id === parentId)
        if (position >= target) return false
      }
    }
    return true
  }
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length
  return Math.max(0, Math.min(length, Math.trunc(index)))
}
