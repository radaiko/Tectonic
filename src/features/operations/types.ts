import type { IKernel, ShapeHandle } from '../../kernel/IKernel'
import type { SketchModel } from '../../sketch/domain/SketchModel'
import type { Feature } from '../domain/Feature'

/** A solid in the working set, with the kernel handle that currently backs it. */
export interface Solid {
  readonly id: string
  name: string
  shape: ShapeHandle
  /** The feature that last wrote to this solid — drives viewport highlighting. */
  featureId: string
}

/**
 * Everything an operation is allowed to touch. Operations mutate `solids` in
 * place; the engine owns the list and turns it into bodies once the whole tree
 * has been evaluated.
 */
export interface OperationContext {
  readonly kernel: IKernel
  readonly feature: Feature
  readonly sketches: ReadonlyMap<string, SketchModel>
  readonly solids: Solid[]
  /** Allocates a stable id for a newly created solid. */
  newSolidId(): string
}

export type FeatureOperation = (context: OperationContext) => Promise<void>

/** Raised when a feature cannot be built from what the document currently holds. */
export class FeatureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeatureError'
  }
}
