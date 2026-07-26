import type { Body } from '../../src/domain/Document'
import type { MeshData } from '../../src/domain/MeshData'
import { FeatureEngine } from '../../src/features/FeatureEngine'
import type { FeatureEvaluation } from '../../src/features/FeatureEngine'
import { FeatureTree } from '../../src/features/FeatureTree'
import type { Feature } from '../../src/features/domain/Feature'
import type { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import type { FeatureParameters } from '../../src/features/domain/parameters'
import { featureOperation } from '../../src/features/operations/registry'
import type { OperationContext, Solid } from '../../src/features/operations/types'
import { StubKernel } from '../../src/kernel/StubKernel'
import type { BoundingBox, IKernel } from '../../src/kernel/IKernel'
import { buildCircle, buildLine, buildRectangle } from '../../src/sketch/domain/builders'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import type { SketchPlane } from '../../src/sketch/domain/SketchModel'

/**
 * Shared scaffolding for the feature tests: real sketches, a real stub kernel
 * and a one-feature harness that runs a single operation the way the engine
 * would, so an operation can be tested without a whole tree around it.
 */

export interface SketchOptions {
  readonly id?: string
  readonly name?: string
  readonly plane?: SketchPlane
}

/** A sketch holding one axis-aligned rectangle centred on the origin. */
export function rectangleSketch(
  width = 20,
  height = 10,
  options: SketchOptions = {},
): SketchModel {
  const sketch = new SketchModel({
    ...(options.id === undefined ? {} : { id: options.id }),
    name: options.name ?? 'Rectangle',
    plane: options.plane ?? 'XY',
  })
  buildRectangle(sketch, { x: -width / 2, y: -height / 2 }, { x: width / 2, y: height / 2 })
  return sketch
}

/** A sketch holding one circle, the simplest closed profile there is. */
export function circleSketch(radius = 5, options: SketchOptions = {}): SketchModel {
  const sketch = new SketchModel({
    ...(options.id === undefined ? {} : { id: options.id }),
    name: options.name ?? 'Circle',
    plane: options.plane ?? 'XY',
  })
  buildCircle(sketch, { x: 0, y: 0 }, radius)
  return sketch
}

/** A sketch holding a single open line — a sweep path or a rib centreline. */
export function lineSketch(
  from = { x: 0, y: 0 },
  to = { x: 0, y: 40 },
  options: SketchOptions = {},
): SketchModel {
  const sketch = new SketchModel({
    ...(options.id === undefined ? {} : { id: options.id }),
    name: options.name ?? 'Path',
    plane: options.plane ?? 'XZ',
  })
  buildLine(sketch, from, to)
  return sketch
}

export interface RunOptions {
  readonly sketches?: readonly SketchModel[]
  readonly parameters?: FeatureParameters
  readonly sketchId?: string | null
  readonly kernel?: IKernel
  /** Solids already in the part when the feature runs. */
  readonly solids?: Solid[]
}

export interface RunResult {
  readonly feature: Feature
  readonly solids: readonly Solid[]
  readonly kernel: IKernel
  readonly context: OperationContext
  /** Tessellations of the solids the operation left behind, in order. */
  readonly meshes: readonly MeshData[]
  readonly boxes: readonly BoundingBox[]
}

/**
 * Runs one operation against a working set, then tessellates what it produced.
 * Errors are not caught — an operation test asserts on them directly.
 */
export async function runOperation(
  type: FeatureType,
  options: RunOptions = {},
): Promise<RunResult> {
  const kernel = options.kernel ?? new StubKernel()
  const sketches = new Map<string, SketchModel>()
  for (const sketch of options.sketches ?? []) sketches.set(sketch.id, sketch)

  const feature = createFeature(type, {
    sketchId:
      options.sketchId === undefined
        ? ((options.sketches ?? [])[0]?.id ?? null)
        : options.sketchId,
    ...(options.parameters === undefined ? {} : { parameters: options.parameters }),
  })

  const solids = options.solids ?? []
  let next = solids.length
  const context: OperationContext = {
    kernel,
    feature,
    sketches,
    solids,
    newSolidId: () => `body-${(next += 1)}`,
  }

  await featureOperation(type)(context)

  const meshes: MeshData[] = []
  const boxes: BoundingBox[] = []
  for (const solid of solids) {
    meshes.push(await kernel.triangulate(solid.shape))
    boxes.push(await kernel.boundingBox(solid.shape))
  }

  return { feature, solids, kernel, context, meshes, boxes }
}

/** A ready-made solid to hand an operation that modifies rather than creates. */
export async function boxSolid(
  kernel: IKernel,
  size = 20,
  id = 'body-0',
  featureId = 'seed',
): Promise<Solid> {
  return {
    id,
    name: 'Box',
    shape: await kernel.createBox({ width: size, height: size, depth: size }),
    featureId,
  }
}

/** Builds a tree from features, in the order given. */
export function treeOf(...features: readonly Feature[]): FeatureTree {
  const tree = new FeatureTree()
  for (const feature of features) tree.addFeature(feature)
  return tree
}

export async function evaluate(
  tree: FeatureTree,
  sketches: readonly SketchModel[],
  kernel: IKernel = new StubKernel(),
): Promise<FeatureEvaluation> {
  return new FeatureEngine(kernel).evaluate(tree, sketches)
}

/** Extent of a body along each axis, rounded so assertions stay readable. */
export function extentOf(mesh: MeshData): { x: number; y: number; z: number } {
  const low = [Infinity, Infinity, Infinity]
  const high = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < mesh.positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = mesh.positions[index + axis] as number
      low[axis] = Math.min(low[axis] as number, value)
      high[axis] = Math.max(high[axis] as number, value)
    }
  }
  return {
    x: round((high[0] as number) - (low[0] as number)),
    y: round((high[1] as number) - (low[1] as number)),
    z: round((high[2] as number) - (low[2] as number)),
  }
}

export function vertexCount(mesh: MeshData): number {
  return mesh.positions.length / 3
}

export function bodyNames(bodies: readonly Body[]): string[] {
  return bodies.map((body) => body.name)
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
