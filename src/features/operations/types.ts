import type { IKernel, ShapeHandle } from '../../kernel/IKernel'
import type { FoldUnfold } from '../../sheetmetal/FoldUnfold'
import type { SketchModel } from '../../sketch/domain/SketchModel'
import type { SurfaceBody } from '../../surface/types'
import type { Feature } from '../domain/Feature'

/**
 * A body in the working set, with the kernel handle that currently backs it.
 *
 * Most entries are plain solids. The two optional fields carry the extra model an
 * environment needs alongside the geometry: a sheet metal body keeps its fold
 * model so later flanges can rebuild it, and a surface body keeps its sheet so it
 * can be trimmed, knitted and eventually thickened. Both are set only by their own
 * environment's operations and are cleared when a body leaves it.
 */
export interface Solid {
  readonly id: string
  name: string
  shape: ShapeHandle
  /** The feature that last wrote to this solid — drives viewport highlighting. */
  featureId: string
  /** Set while this body is a sheet metal part — see `sheetmetal/`. */
  sheetMetal?: FoldUnfold | undefined
  /** Set while this body is an open surface sheet — see `surface/`. */
  surface?: SurfaceBody | undefined
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
