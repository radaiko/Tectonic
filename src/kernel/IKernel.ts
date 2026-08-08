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

export interface Vec2 {
  readonly x: number
  readonly y: number
}

/**
 * Rigid placement of a 2D sketch plane in world space. `xAxis` and `yAxis` are
 * unit vectors; their cross product is the plane normal, which is also the
 * direction an extrusion takes by default.
 */
export interface PlaneFrame {
  readonly origin: Vec3
  readonly xAxis: Vec3
  readonly yAxis: Vec3
}

/** The world XY plane — the frame every operation falls back to. */
export const WORLD_XY: PlaneFrame = {
  origin: { x: 0, y: 0, z: 0 },
  xAxis: { x: 1, y: 0, z: 0 },
  yAxis: { x: 0, y: 1, z: 0 },
}

/**
 * A closed planar region, given in the plane's local 2D coordinates: one outer
 * loop plus any number of inner loops removed from it.
 */
export interface Profile {
  readonly points: readonly Vec2[]
  readonly holes?: readonly (readonly Vec2[])[]
}

/** Axis-aligned extent of a shape, in world space. */
export interface BoundingBox {
  readonly min: Vec3
  readonly max: Vec3
}

export interface BoxParams {
  readonly width: number
  readonly height: number
  readonly depth: number
  /** Box centre in world space. Defaults to the origin. */
  readonly center?: Vec3
}

/** How a two-sided operation distributes its distance about the sketch plane. */
export type ExtrudeSide = 'one-sided' | 'symmetric' | 'two-sided'

export interface ExtrudeParams {
  readonly profile: Profile
  readonly distance: number
  /** Extrusion direction. Defaults to the plane normal, or +Z without a plane. */
  readonly direction?: Vec3
  /** Placement of the profile in world space. Defaults to the world XY plane. */
  readonly plane?: PlaneFrame
  /** Taper applied along the sweep, in degrees. Positive widens the far end. */
  readonly draftAngle?: number
  readonly side?: ExtrudeSide
  /** Second distance, taken opposite `direction`, for two-sided extrusions. */
  readonly secondDistance?: number
}

/** Axis of revolution, expressed in the sketch plane's 2D coordinates. */
export interface RevolveAxis {
  readonly origin: Vec2
  readonly direction: Vec2
}

export interface RevolveParams {
  readonly profile: Profile
  readonly axis: RevolveAxis
  /** Sweep angle in degrees. 360 makes a full solid of revolution. */
  readonly angle: number
  readonly plane?: PlaneFrame
  /** Splits the sweep evenly either side of the profile. */
  readonly symmetric?: boolean
}

export type SweepOrientation = 'follow-path' | 'perpendicular'

export interface SweepParams {
  readonly profile: Profile
  /** Path polyline in world space; needs at least two distinct points. */
  readonly path: readonly Vec3[]
  readonly plane?: PlaneFrame
  readonly orientation?: SweepOrientation
  /** Total twist about the path, in degrees. */
  readonly twistAngle?: number
}

/** One cross-section of a loft: a profile plus the plane it sits on. */
export interface LoftSection {
  readonly profile: Profile
  readonly plane?: PlaneFrame
}

export interface LoftParams {
  readonly sections: readonly LoftSection[]
  /** Guide curves in world space. The stub records them but does not follow them. */
  readonly guides?: readonly (readonly Vec3[])[]
  readonly closed?: boolean
}

export interface FilletParams {
  readonly radius: number
  /** Edge identifiers to round. Empty means every edge of the shape. */
  readonly edgeIds?: readonly string[]
}

export interface ChamferParams {
  readonly distance: number
  /** Second distance for a distance-distance chamfer. Defaults to `distance`. */
  readonly secondDistance?: number
  /** Angle in degrees for a distance-angle chamfer. */
  readonly angle?: number
  /** Edge identifiers to chamfer. Empty means every edge of the shape. */
  readonly edgeIds?: readonly string[]
}

export interface ShellParams {
  readonly thickness: number
  /** Faces left open. Empty hollows the solid without opening it. */
  readonly openFaceIds?: readonly string[]
}

export type HoleKind = 'simple' | 'countersink' | 'counterbore'

export interface HoleParams {
  /** Hole axis start, in world space — the point the hole is drilled from. */
  readonly center: Vec3
  /** Drilling direction. Defaults to -Z. */
  readonly direction?: Vec3
  readonly diameter: number
  readonly depth: number
  readonly kind?: HoleKind
  /** Head diameter for countersink and counterbore holes. */
  readonly headDiameter?: number
  /** Head depth for counterbore holes; sink height for countersinks. */
  readonly headDepth?: number
}

export interface DraftParams {
  /** Pull direction the draft opens towards. Defaults to +Z. */
  readonly pullDirection?: Vec3
  readonly angle: number
  /** Distance along the pull direction where the section is left unchanged. */
  readonly neutralOffset?: number
  /** Faces to draft. Empty drafts the whole shape. */
  readonly faceIds?: readonly string[]
}

/**
 * The named pieces of a shape's boundary. Ids are derived from the geometry
 * itself, so they survive a re-tessellation of the same solid but not an edit
 * that changes it — enough for a selection to outlive a rebuild, which is what
 * fillet, shell, draft and direct editing reference.
 */
export interface Topology {
  readonly faceIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly vertexIds: readonly string[]
}

/** Which side of the cutting plane a split keeps. */
export type SplitKeep = 'both' | 'front' | 'back'

export interface SplitParams {
  /** Cutting plane; its normal points at the "front" piece. */
  readonly plane: PlaneFrame
  readonly keep?: SplitKeep
}

export interface MoveFaceParams {
  /** Faces to move. Empty is an error — direct editing needs a selection. */
  readonly faceIds: readonly string[]
  readonly direction: Vec3
  readonly distance: number
}

export interface OffsetFaceParams {
  readonly faceIds: readonly string[]
  /** Distance along each face's own normal. Negative sinks the face inwards. */
  readonly distance: number
}

export interface DeleteFaceParams {
  readonly faceIds: readonly string[]
}

export interface TransformParams {
  readonly translate?: Vec3
  readonly rotate?: {
    readonly axis: Vec3
    readonly origin?: Vec3
    /** Rotation in degrees. */
    readonly angle: number
  }
  /** Uniform or per-axis scale. */
  readonly scale?: number | Vec3
  /** Point the scale is applied about. Defaults to the origin. */
  readonly scaleOrigin?: Vec3
}

export interface TessellationParams {
  /** Maximum deviation between the facets and the true surface. */
  readonly linearDeflection?: number
  /** Maximum angular deviation, in radians. */
  readonly angularDeflection?: number
}

/**
 * An operation a backend may or may not be able to carry out.
 *
 * Only operations that a real backend genuinely might lack are listed. Anything
 * every backend must implement to be a kernel at all — extrude, the booleans,
 * tessellation — is not a capability, it is the contract.
 */
export const KERNEL_CAPABILITIES = [
  'fillet',
  'chamfer',
  'shell',
  'draft',
  'hole',
  'split',
  'directEdit',
] as const

export type KernelCapability = (typeof KERNEL_CAPABILITIES)[number]

/**
 * The geometry engine contract. Everything above `kernel/` talks to solids only
 * through this interface so the backing implementation (stub today, OpenCascade
 * WASM later) can be swapped without touching callers.
 */
export interface IKernel {
  /** Human-readable backend identifier, e.g. "stub" or "opencascade". */
  readonly name: string

  /**
   * What this backend can actually do. Callers check this to offer — or refuse —
   * an operation up front, rather than discovering the gap mid-rebuild.
   */
  readonly capabilities: readonly KernelCapability[]

  /** Resolves once the backend is ready to accept operations. */
  init(): Promise<void>

  createBox(params: BoxParams): Promise<ShapeHandle>
  /**
   * Adopts an existing triangle mesh as a shape. This is how geometry that was
   * not modelled here enters the kernel — an imported file, or a surface body
   * built by `surface/` — so it can be tessellated and combined like any other.
   */
  createFromMesh(mesh: MeshData): Promise<ShapeHandle>
  extrude(params: ExtrudeParams): Promise<ShapeHandle>
  revolve(params: RevolveParams): Promise<ShapeHandle>
  sweep(params: SweepParams): Promise<ShapeHandle>
  loft(params: LoftParams): Promise<ShapeHandle>

  booleanUnion(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle>
  booleanSubtract(target: ShapeHandle, tool: ShapeHandle): Promise<ShapeHandle>
  booleanIntersect(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle>

  fillet(shape: ShapeHandle, params: FilletParams): Promise<ShapeHandle>
  chamfer(shape: ShapeHandle, params: ChamferParams): Promise<ShapeHandle>
  shell(shape: ShapeHandle, params: ShellParams): Promise<ShapeHandle>
  hole(shape: ShapeHandle, params: HoleParams): Promise<ShapeHandle>
  draft(shape: ShapeHandle, params: DraftParams): Promise<ShapeHandle>

  /** Cuts a shape with a plane. Returns the pieces the `keep` mode asks for. */
  split(shape: ShapeHandle, params: SplitParams): Promise<ShapeHandle[]>

  /** The face, edge and vertex identifiers a selection can name. */
  topology(shape: ShapeHandle): Promise<Topology>

  /** Direct edit: drags the named faces, stretching what they are attached to. */
  moveFace(shape: ShapeHandle, params: MoveFaceParams): Promise<ShapeHandle>
  /** Direct edit: pushes the named faces along their own normals. */
  offsetFace(shape: ShapeHandle, params: OffsetFaceParams): Promise<ShapeHandle>
  /** Direct edit: removes the named faces and heals the opening left behind. */
  deleteFace(shape: ShapeHandle, params: DeleteFaceParams): Promise<ShapeHandle>

  /** Rigid (or scaled) placement of a copy of `shape`. */
  transform(shape: ShapeHandle, params: TransformParams): Promise<ShapeHandle>
  /** Reflects a copy of `shape` through a plane, keeping the surface outward. */
  mirror(shape: ShapeHandle, plane: PlaneFrame): Promise<ShapeHandle>
  /** Independent duplicate of `shape`. */
  copy(shape: ShapeHandle): Promise<ShapeHandle>

  boundingBox(shape: ShapeHandle): Promise<BoundingBox>

  /** Converts a shape into renderable triangles. */
  triangulate(shape: ShapeHandle, params?: TessellationParams): Promise<MeshData>

  /** Releases kernel-side resources held for a shape. */
  dispose(shape: ShapeHandle): void
}

/** Mass and inertia of a solid, taken at unit density. */
export interface MassProperties {
  readonly volume: number
  readonly surfaceArea: number
  readonly centerOfMass: Vec3
  /**
   * Matrix of inertia about the centre of mass, row-major 3×3 (nine entries).
   * Symmetric, so `[1] === [3]`, `[2] === [6]` and `[5] === [7]`.
   */
  readonly inertia: readonly number[]
}

/**
 * Where a named face sits and what it is made of. This is what turns a click in
 * the viewport into one of {@link Topology}'s ids: the picker matches on geometry,
 * the feature stores the id.
 */
export interface FaceInfo {
  readonly id: string
  /** Area-weighted centre of the face's surface, in world space. */
  readonly centroid: Vec3
  readonly area: number
  /** Outward unit normal at the middle of the face's parameter range. */
  readonly normal: Vec3
  /** The underlying surface: "plane", "cylinder", "bspline" and so on. */
  readonly kind: string
}

/** Where a named edge sits and what curve it follows. */
export interface EdgeInfo {
  readonly id: string
  /** Midpoint by arc length, in world space. */
  readonly midpoint: Vec3
  readonly length: number
  /** The underlying curve: "line", "circle", "bspline" and so on. */
  readonly kind: string
}

/**
 * The questions only a true B-Rep backend can answer honestly. A tessellation
 * engine can guess at volume from its triangles but cannot say whether a solid is
 * watertight, so these sit outside {@link IKernel} and callers feature-detect
 * with {@link isBRepKernel} instead of assuming.
 */
export interface IBRepKernel extends IKernel {
  massProperties(shape: ShapeHandle): Promise<MassProperties>
  /** The shape's faces, as handles that can be tessellated on their own. */
  faces(shape: ShapeHandle): Promise<ShapeHandle[]>
  edges(shape: ShapeHandle): Promise<ShapeHandle[]>
  /** Face geometry, in the same order and under the same ids as {@link topology}. */
  faceInfo(shape: ShapeHandle): Promise<readonly FaceInfo[]>
  /** Edge geometry, in the same order and under the same ids as {@link topology}. */
  edgeInfo(shape: ShapeHandle): Promise<readonly EdgeInfo[]>
  /** True when the shape bounds a volume rather than being a loose shell. */
  isSolid(shape: ShapeHandle): Promise<boolean>
  /** True when the topology passes the kernel's own consistency checks. */
  isValid(shape: ShapeHandle): Promise<boolean>
  /** Gives a surface body walls, turning it into a solid. */
  thicken(shape: ShapeHandle, thickness: number): Promise<ShapeHandle>
  /** Joins surfaces along shared edges into one shell, closing it if it can. */
  stitch(shapes: readonly ShapeHandle[]): Promise<ShapeHandle>
}

export function isBRepKernel(kernel: IKernel): kernel is IBRepKernel {
  const candidate = kernel as Partial<IBRepKernel>
  return (
    typeof candidate.massProperties === 'function' &&
    typeof candidate.faces === 'function' &&
    typeof candidate.isSolid === 'function'
  )
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

/**
 * Thrown when a backend is asked for something it cannot do.
 *
 * Distinct from a plain {@link KernelError} because the two call for different
 * answers: a kernel error is this model going wrong, an unsupported operation is
 * this *backend* being unable to model it at all, and only the second is worth
 * telling the user to change backend over. Returning the geometry unchanged
 * instead would report a fillet that never happened as a success.
 */
export class UnsupportedOperationError extends KernelError {
  readonly capability: KernelCapability

  constructor(kernelName: string, capability: KernelCapability) {
    super(
      `The "${kernelName}" backend cannot ${capability} — this operation needs a B-Rep kernel`,
      capability,
    )
    this.name = 'UnsupportedOperationError'
    this.capability = capability
  }
}

/** Whether a backend can carry out an operation at all. */
export function kernelSupports(kernel: IKernel, capability: KernelCapability): boolean {
  return kernel.capabilities.includes(capability)
}

/**
 * The capabilities a backend is missing, in the canonical order. Empty for a
 * complete one — which is what lets the UI say nothing when there is nothing to
 * warn about.
 */
export function missingCapabilities(kernel: IKernel): KernelCapability[] {
  return KERNEL_CAPABILITIES.filter((capability) => !kernel.capabilities.includes(capability))
}
