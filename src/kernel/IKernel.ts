import type { MeshData } from '../domain/MeshData'

/**
 * Opaque handle to a solid living inside the kernel. Callers never inspect the
 * topology directly — they pass handles back in and ask for a tessellation.
 */
export interface ShapeHandle {
  readonly id: string
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface BoxParams {
  readonly width: number
  readonly height: number
  readonly depth: number
  /** Box centre in world space. Defaults to the origin. */
  readonly center?: Vec3
}

/** A closed planar polygon, given in the plane's local 2D coordinates. */
export interface Profile {
  readonly points: readonly { readonly x: number; readonly y: number }[]
}

export interface ExtrudeParams {
  readonly profile: Profile
  readonly distance: number
  /** Extrusion direction. Defaults to +Z. */
  readonly direction?: Vec3
}

export interface FilletParams {
  readonly radius: number
  /** Edge identifiers to round. Empty means every edge of the shape. */
  readonly edgeIds?: readonly string[]
}

export interface ChamferParams {
  readonly distance: number
  /** Edge identifiers to chamfer. Empty means every edge of the shape. */
  readonly edgeIds?: readonly string[]
}

export interface TessellationParams {
  /** Maximum deviation between the facets and the true surface. */
  readonly linearDeflection?: number
  /** Maximum angular deviation, in radians. */
  readonly angularDeflection?: number
}

/**
 * The geometry engine contract. Everything above `kernel/` talks to solids only
 * through this interface so the backing implementation (stub today, OpenCascade
 * WASM later) can be swapped without touching callers.
 */
export interface IKernel {
  /** Human-readable backend identifier, e.g. "stub" or "opencascade". */
  readonly name: string

  /** Resolves once the backend is ready to accept operations. */
  init(): Promise<void>

  createBox(params: BoxParams): Promise<ShapeHandle>
  extrude(params: ExtrudeParams): Promise<ShapeHandle>

  booleanUnion(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle>
  booleanSubtract(target: ShapeHandle, tool: ShapeHandle): Promise<ShapeHandle>
  booleanIntersect(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle>

  fillet(shape: ShapeHandle, params: FilletParams): Promise<ShapeHandle>
  chamfer(shape: ShapeHandle, params: ChamferParams): Promise<ShapeHandle>

  /** Converts a shape into renderable triangles. */
  triangulate(shape: ShapeHandle, params?: TessellationParams): Promise<MeshData>

  /** Releases kernel-side resources held for a shape. */
  dispose(shape: ShapeHandle): void
}

/** Thrown when a kernel cannot carry out a requested operation. */
export class KernelError extends Error {
  readonly operation: string

  constructor(message: string, operation: string) {
    super(message)
    this.name = 'KernelError'
    this.operation = operation
  }
}
