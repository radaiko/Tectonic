import type { SketchModelJSON } from './domain/SketchModel'
import { SketchModel } from './domain/SketchModel'

export const DEFAULT_HISTORY_LIMIT = 100

/**
 * Rewinds a sketch to a snapshot **in place**. The editor hands the same model
 * object to the renderer, the tools and the document, so undo has to refill it
 * rather than hand back a replacement.
 */
export function restoreModel(model: SketchModel, json: SketchModelJSON): void {
  const source = SketchModel.fromJSON(json)
  model.name = source.name
  model.plane = source.plane
  model.gridSpacing = source.gridSpacing

  model.entities.clear()
  for (const [id, entity] of source.entities) model.entities.set(id, entity)
  model.constraints.clear()
  for (const [id, constraint] of source.constraints) model.constraints.set(id, constraint)
}

/**
 * Linear undo stack of whole-sketch snapshots. Sketches are small and JSON
 * round-trips are cheap, which buys correctness that a command log would have to
 * earn one operation at a time.
 */
export class SketchHistory {
  private readonly model: SketchModel
  private readonly limit: number
  private snapshots: SketchModelJSON[]
  private index = 0

  constructor(model: SketchModel, limit: number = DEFAULT_HISTORY_LIMIT) {
    this.model = model
    this.limit = Math.max(1, limit)
    this.snapshots = [model.toJSON()]
  }

  get canUndo(): boolean {
    return this.index > 0
  }

  get canRedo(): boolean {
    return this.index < this.snapshots.length - 1
  }

  get size(): number {
    return this.snapshots.length
  }

  /** Records the sketch as it stands, discarding any redo branch. */
  commit(): void {
    this.snapshots = this.snapshots.slice(0, this.index + 1)
    this.snapshots.push(this.model.toJSON())
    if (this.snapshots.length > this.limit) this.snapshots = this.snapshots.slice(1)
    this.index = this.snapshots.length - 1
  }

  undo(): boolean {
    if (!this.canUndo) return false
    this.index -= 1
    restoreModel(this.model, this.snapshots[this.index] as SketchModelJSON)
    return true
  }

  redo(): boolean {
    if (!this.canRedo) return false
    this.index += 1
    restoreModel(this.model, this.snapshots[this.index] as SketchModelJSON)
    return true
  }
}
