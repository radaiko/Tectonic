import type { MeshData } from '../domain/MeshData'
import type {
  BoundingBox,
  BoxParams,
  ChamferParams,
  DeleteFaceParams,
  DraftParams,
  EdgeInfo,
  ExtrudeParams,
  FaceInfo,
  FilletParams,
  HoleParams,
  IKernel,
  LoftParams,
  MassProperties,
  MoveFaceParams,
  OffsetFaceParams,
  PlaneFrame,
  RevolveParams,
  ShapeHandle,
  ShellParams,
  SplitParams,
  SweepParams,
  TessellationParams,
  Topology,
  TransformParams,
} from './IKernel'
import type { KernelCapability } from './IKernel'
import { KERNEL_CAPABILITIES, KernelError } from './IKernel'
import {
  surveyEdgeInfo,
  surveyFaceInfo,
  surveyMeshEdges,
  surveyMeshFaces,
} from './references'
import type { RustLoadOptions, RustWasmExports } from './rust/RustWasm'
import { loadRustKernel, rustError } from './rust/RustWasm'
import { StubKernel } from './StubKernel'
import type { TranslatedIds } from './vocabulary'
import { translateEdgeIds, translateFaceIds } from './vocabulary'

const DEG = Math.PI / 180

/**
 * The kernel's own tessellation defaults, restated on this side.
 *
 * The interface lets a caller ask for one tolerance and leave the rest to the
 * kernel's judgement, but the quality struct that crosses the boundary is a
 * complete triple. Filling the gaps here rather than relying on the far side's
 * serde defaults is what keeps a partial request working against a `pkg/` built
 * before those defaults existed — the deserializer accepts a whole object from
 * any build of the kernel, a partial one only from a recent enough one.
 */
interface KernelQuality {
  readonly linearDeflection: number
  readonly angularDeflection: number
  readonly maxEdgeLength: number
}

const KERNEL_TESSELLATION: KernelQuality = {
  /** Greatest distance between a facet and the surface it stands in for, in mm. */
  linearDeflection: 0.1,
  /** Greatest angle between the normals at a facet's corners, in radians. */
  angularDeflection: 0.5,
  /** Upper bound on a triangle edge. Zero leaves it unbounded. */
  maxEdgeLength: 0,
}

/** A tessellation request as the kernel wants it: every field present. */
function quality(params: TessellationParams): KernelQuality {
  return {
    linearDeflection: params.linearDeflection ?? KERNEL_TESSELLATION.linearDeflection,
    angularDeflection: params.angularDeflection ?? KERNEL_TESSELLATION.angularDeflection,
    maxEdgeLength: KERNEL_TESSELLATION.maxEdgeLength,
  }
}

/**
 * What the kernel holds for one shape.
 *
 * A shape is a B-Rep body, a tessellation of one, or both — whichever the
 * operations it has been through produced. Neither form is derived until an
 * operation asks for it, so a shape that is only ever modelled and drawn never
 * pays for the round trip, and one that passes through a fallback operation
 * pays for it once.
 */
interface Shape {
  /** The Rust kernel's body JSON. */
  body?: string
  /** The same shape inside the stub, for operations the Rust kernel lacks. */
  stub?: ShapeHandle
}

/**
 * The Rust B-Rep kernel, driven across the WASM boundary.
 *
 * Shapes live on this side as JSON — the kernel itself is stateless, so there is
 * no session to keep in step and no handle that can outlive a reload. Every
 * operation the kernel exports is a single call; the rest are carried out by an
 * internal {@link StubKernel} on a tessellation of the body, and the result is
 * adopted back as a body when something needs one again.
 *
 * That fallback is lossy and deliberately narrow: a body that goes through it
 * comes back faceted, having lost the analytic surfaces that let the kernel
 * re-tessellate a curve smoothly. It covers the direct-editing and hole/draft
 * features that the Rust kernel has no operation for yet, so the app keeps
 * working while they land, rather than losing them to a backend swap.
 */
export class RustKernel implements IKernel {
  readonly name = 'tectonic-rust'

  /**
   * Everything the interface names. Fillet, chamfer and shell are the kernel's
   * own B-Rep operations; the rest are carried out on a tessellation of the body
   * by the internal stub, which is lossy but genuinely does the work.
   */
  readonly capabilities: readonly KernelCapability[] = [...KERNEL_CAPABILITIES]

  readonly #wasm: RustWasmExports
  readonly #stub = new StubKernel()
  readonly #shapes = new Map<string, Shape>()
  #nextId = 0

  private constructor(wasm: RustWasmExports) {
    this.#wasm = wasm
  }

  /** Loads the WASM module and builds a kernel on it. */
  static async create(options: RustLoadOptions = {}): Promise<RustKernel> {
    return new RustKernel(await loadRustKernel(options))
  }

  /** The kernel's version, as the WASM module reports it. */
  get version(): string {
    return this.#wasm.version()
  }

  async init(): Promise<void> {
    // The module is loaded by `create`; there is nothing left to wait for.
  }

  /* ---------------------------- construction ----------------------------- */

  async createBox(params: BoxParams): Promise<ShapeHandle> {
    const { width, height, depth, center } = params
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new KernelError('Box dimensions must be positive', 'createBox')
    }

    // A box is a centred rectangle pulled both ways — the kernel needs no
    // separate primitive for it, and going through extrude keeps the result a
    // real B-Rep with the six faces a selection can name.
    const [x, y] = [width / 2, height / 2]
    return this.#build('createBox', () =>
      this.#wasm.extrude(
        JSON.stringify({
          profile: {
            points: [
              { x: -x, y: -y },
              { x, y: -y },
              { x, y },
              { x: -x, y },
            ],
          },
          distance: depth,
          side: 'symmetric',
          plane: {
            origin: center ?? { x: 0, y: 0, z: 0 },
            xAxis: { x: 1, y: 0, z: 0 },
            yAxis: { x: 0, y: 1, z: 0 },
          },
        }),
      ),
    )
  }

  async createFromMesh(mesh: MeshData): Promise<ShapeHandle> {
    if (mesh.indices.length < 3 || mesh.positions.length < 9) {
      throw new KernelError('A mesh needs at least one triangle', 'createFromMesh')
    }
    if (mesh.indices.length % 3 !== 0) {
      throw new KernelError('Mesh indices must come in triples', 'createFromMesh')
    }
    return this.#build('createFromMesh', () => this.#wasm.bodyFromMesh(JSON.stringify(mesh)))
  }

  async extrude(params: ExtrudeParams): Promise<ShapeHandle> {
    return this.#build('extrude', () => this.#wasm.extrude(JSON.stringify(params)))
  }

  async revolve(params: RevolveParams): Promise<ShapeHandle> {
    return this.#build('revolve', () => this.#wasm.revolve(JSON.stringify(params)))
  }

  async sweep(params: SweepParams): Promise<ShapeHandle> {
    return this.#build('sweep', () => this.#wasm.sweep(JSON.stringify(params)))
  }

  async loft(params: LoftParams): Promise<ShapeHandle> {
    // `guides` has no counterpart in the kernel; it is dropped rather than sent
    // and silently ignored, so the omission is visible here and not a surprise.
    const { sections, closed } = params
    return this.#build('loft', () => this.#wasm.loft(JSON.stringify({ sections, closed })))
  }

  /* ------------------------------ booleans ------------------------------- */

  async booleanUnion(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle> {
    return this.#combine('booleanUnion', a, b, (x, y) => this.#wasm.booleanUnion(x, y))
  }

  async booleanSubtract(target: ShapeHandle, tool: ShapeHandle): Promise<ShapeHandle> {
    return this.#combine('booleanSubtract', target, tool, (x, y) =>
      this.#wasm.booleanSubtract(x, y),
    )
  }

  async booleanIntersect(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle> {
    return this.#combine('booleanIntersect', a, b, (x, y) => this.#wasm.booleanIntersect(x, y))
  }

  /* --------------------------- dress-up features -------------------------- */

  /**
   * Rounds the named edges, or every edge when none are named.
   *
   * The names are translated into the kernel's own vocabulary first — see
   * {@link RustKernel.topology} for why a picked edge arrives under a different
   * one.
   */
  async fillet(shape: ShapeHandle, params: FilletParams): Promise<ShapeHandle> {
    const body = await this.#bodyOf(shape, 'fillet')
    const edgeIds = await this.#brepEdgeIds(shape, params.edgeIds ?? [], 'fillet')
    return this.#build('fillet', () =>
      this.#wasm.fillet(body, JSON.stringify({ ...params, edgeIds })),
    )
  }

  async chamfer(shape: ShapeHandle, params: ChamferParams): Promise<ShapeHandle> {
    const body = await this.#bodyOf(shape, 'chamfer')
    const { distance } = params
    const edgeIds = await this.#brepEdgeIds(shape, params.edgeIds ?? [], 'chamfer')
    return this.#build('chamfer', () =>
      this.#wasm.chamfer(
        body,
        JSON.stringify({ distance, edgeIds, secondDistance: this.#setback(params) }),
      ),
    )
  }

  /**
   * Hollows the body, leaving the named faces open.
   *
   * The named faces are translated into the kernel's own vocabulary first, so a
   * face picked in the viewport reaches the exact B-Rep shell rather than a
   * re-cut tessellation of it. A face that cannot be paired — one strip of a
   * tessellated cylinder, say, which is no B-Rep face on its own — fails the
   * operation with the reason, because opening a different face than the one
   * asked for would be a silent retarget.
   */
  async shell(shape: ShapeHandle, params: ShellParams): Promise<ShapeHandle> {
    const body = await this.#bodyOf(shape, 'shell')
    const openFaceIds = await this.#brepFaceIds(shape, params.openFaceIds ?? [], 'shell')
    return this.#build('shell', () =>
      this.#wasm.shell(body, JSON.stringify({ ...params, openFaceIds })),
    )
  }


  /* ------------------ operations the Rust kernel has not got -------------- */

  async hole(shape: ShapeHandle, params: HoleParams): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'hole', (stub) => this.#stub.hole(stub, params))
  }

  async draft(shape: ShapeHandle, params: DraftParams): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'draft', (stub) => this.#stub.draft(stub, params))
  }

  async moveFace(shape: ShapeHandle, params: MoveFaceParams): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'moveFace', (stub) => this.#stub.moveFace(stub, params))
  }

  async offsetFace(shape: ShapeHandle, params: OffsetFaceParams): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'offsetFace', (stub) => this.#stub.offsetFace(stub, params))
  }

  async deleteFace(shape: ShapeHandle, params: DeleteFaceParams): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'deleteFace', (stub) => this.#stub.deleteFace(stub, params))
  }

  async transform(shape: ShapeHandle, params: TransformParams): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'transform', (stub) => this.#stub.transform(stub, params))
  }

  async mirror(shape: ShapeHandle, plane: PlaneFrame): Promise<ShapeHandle> {
    return this.#viaStub(shape, 'mirror', (stub) => this.#stub.mirror(stub, plane))
  }

  async split(shape: ShapeHandle, params: SplitParams): Promise<ShapeHandle[]> {
    const stub = await this.#stubOf(shape, 'split')
    const pieces = await this.#stub.split(stub, params)
    return pieces.map((piece) => this.#register({ stub: piece }))
  }

  async copy(shape: ShapeHandle): Promise<ShapeHandle> {
    const held = this.#shape(shape, 'copy')
    // Copying the body is enough when there is one: it is an immutable string,
    // so the two shapes can share it without either being able to disturb the
    // other. A stub-only shape has to be copied inside the stub.
    if (held.body !== undefined) return this.#register({ body: held.body })
    return this.#register({ stub: await this.#stub.copy(held.stub as ShapeHandle) })
  }

  /* ------------------------------ questions ------------------------------ */

  /**
   * The identifiers a caller can name faces, edges and vertices by.
   *
   * These are the B-Rep's own, hashed from each face's geometry, and they are
   * what {@link RustKernel.fillet} and {@link RustKernel.chamfer} take — the
   * exact path, and the one to use when the ids came from here.
   *
   * They are *not* the ids a viewport pick produces. A pick works on the
   * triangles this kernel hands out, and `kernel/topology` derives its own names
   * for those; the two vocabularies describe the same solid and share no
   * identifiers. {@link RustKernel.faceInfo} and {@link RustKernel.edgeInfo}
   * report the geometry that lets the two be paired, which is what the dress-up
   * operations here do with a selection before passing it on — see
   * `kernel/vocabulary`.
   */
  async topology(shape: ShapeHandle): Promise<Topology> {
    const body = await this.#bodyOf(shape, 'topology')
    return this.#read<Topology>('topology', () => this.#wasm.topology(body))
  }

  /**
   * Where each B-Rep face sits, under the ids {@link RustKernel.topology}
   * reports.
   *
   * This is the kernel's own account of its faces, not the tessellated one a
   * pick sees. It is what makes a picked face nameable to the exact B-Rep
   * operations.
   */
  async faceInfo(shape: ShapeHandle): Promise<readonly FaceInfo[]> {
    const body = await this.#bodyOf(shape, 'faceInfo')
    return this.#read<FaceInfo[]>('faceInfo', () => this.#wasm.faceInfo(body))
  }

  /** The same for edges: where each one runs, under `topology`'s edge ids. */
  async edgeInfo(shape: ShapeHandle): Promise<readonly EdgeInfo[]> {
    const body = await this.#bodyOf(shape, 'edgeInfo')
    return this.#read<EdgeInfo[]>('edgeInfo', () => this.#wasm.edgeInfo(body))
  }

  async boundingBox(shape: ShapeHandle): Promise<BoundingBox> {
    const body = await this.#bodyOf(shape, 'boundingBox')
    return this.#read<BoundingBox>('boundingBox', () => this.#wasm.boundingBox(body))
  }

  /** Volume, surface area, centre of mass and inertia, at unit density. */
  async massProperties(shape: ShapeHandle): Promise<MassProperties> {
    const body = await this.#bodyOf(shape, 'massProperties')
    return this.#read<MassProperties>('massProperties', () => this.#wasm.massProperties(body))
  }

  /** True when the shape bounds a volume rather than being a loose shell. */
  async isSolid(shape: ShapeHandle): Promise<boolean> {
    const body = await this.#bodyOf(shape, 'isSolid')
    return this.#call('isSolid', () => this.#wasm.isSolid(body))
  }

  async triangulate(shape: ShapeHandle, params?: TessellationParams): Promise<MeshData> {
    const body = await this.#bodyOf(shape, 'triangulate')
    return this.#meshOf(body, params)
  }

  /** Reduces a mesh to `ratio` of its triangles. Ratios of 1 or more pass through. */
  async simplify(mesh: MeshData, ratio: number): Promise<MeshData> {
    return this.#read<MeshData>('simplify', () =>
      this.#wasm.simplify(JSON.stringify(mesh), ratio),
    )
  }

  dispose(shape: ShapeHandle): void {
    const held = this.#shapes.get(shape.id)
    if (!held) return
    if (held.stub) this.#stub.dispose(held.stub)
    this.#shapes.delete(shape.id)
  }

  /* -------------------------------------------------------------------------- */

  /**
   * The selection restated in the kernel's own face names.
   *
   * An empty selection is passed through untouched: to the operations that take
   * one it means "all", and surveying a body to translate nothing would only cost
   * a tessellation. Anything that cannot be paired fails the operation rather
   * than being dropped, so a shell never quietly opens fewer faces than asked.
   */
  async #brepFaceIds(
    shape: ShapeHandle,
    ids: readonly string[],
    operation: string,
  ): Promise<readonly string[]> {
    if (ids.length === 0) return ids
    const translated = translateFaceIds(
      surveyMeshFaces(await this.triangulate(shape)),
      surveyFaceInfo(await this.faceInfo(shape)),
      ids,
    )
    return this.#paired(translated, operation)
  }

  async #brepEdgeIds(
    shape: ShapeHandle,
    ids: readonly string[],
    operation: string,
  ): Promise<readonly string[]> {
    if (ids.length === 0) return ids
    const translated = translateEdgeIds(
      surveyMeshEdges(await this.triangulate(shape)),
      surveyEdgeInfo(await this.edgeInfo(shape)),
      ids,
    )
    return this.#paired(translated, operation)
  }

  #paired(translated: TranslatedIds, operation: string): readonly string[] {
    if (translated.failures.length > 0) {
      throw new KernelError(translated.failures.join('; '), operation)
    }
    return translated.ids
  }

  #register(shape: Shape): ShapeHandle {
    const id = `rust-${this.#nextId++}`
    this.#shapes.set(id, shape)
    return { id }
  }

  #shape(handle: ShapeHandle, operation: string): Shape {
    const held = this.#shapes.get(handle.id)
    if (!held) throw new KernelError(`Unknown shape ${handle.id}`, operation)
    return held
  }

  /** Runs a kernel call that returns a body and registers the result. */
  #build(operation: string, run: () => string): ShapeHandle {
    return this.#register({ body: this.#call(operation, run) })
  }

  /** Runs a kernel call that returns JSON and parses it. */
  #read<T>(operation: string, run: () => string): T {
    return JSON.parse(this.#call(operation, run)) as T
  }

  #call<T>(operation: string, run: () => T): T {
    try {
      return run()
    } catch (cause) {
      throw rustError(cause, operation)
    }
  }

  async #combine(
    operation: string,
    a: ShapeHandle,
    b: ShapeHandle,
    apply: (a: string, b: string) => string,
  ): Promise<ShapeHandle> {
    const [first, second] = [await this.#bodyOf(a, operation), await this.#bodyOf(b, operation)]
    return this.#build(operation, () => apply(first, second))
  }

  /**
   * Carries out an operation inside the stub and adopts the result.
   *
   * The result is registered as a stub shape alone. Turning it back into a body
   * costs a tessellation, so it is left until something actually asks — often
   * nothing does, because the next thing to happen is a draw.
   */
  async #viaStub(
    shape: ShapeHandle,
    operation: string,
    apply: (stub: ShapeHandle) => Promise<ShapeHandle>,
  ): Promise<ShapeHandle> {
    return this.#register({ stub: await apply(await this.#stubOf(shape, operation)) })
  }

  /** The shape as a body, tessellating it out of the stub if that is all there is. */
  async #bodyOf(shape: ShapeHandle, operation: string): Promise<string> {
    const held = this.#shape(shape, operation)
    if (held.body === undefined) {
      const mesh = await this.#stub.triangulate(held.stub as ShapeHandle)
      held.body = this.#call(operation, () => this.#wasm.bodyFromMesh(JSON.stringify(mesh)))
    }
    return held.body
  }

  /** The shape inside the stub, tessellating the body into it if it is not there yet. */
  async #stubOf(shape: ShapeHandle, operation: string): Promise<ShapeHandle> {
    const held = this.#shape(shape, operation)
    if (!held.stub) {
      held.stub = await this.#stub.createFromMesh(this.#meshOf(held.body as string, undefined))
    }
    return held.stub
  }

  #meshOf(body: string, params?: TessellationParams): MeshData {
    return this.#read<MeshData>('triangulate', () =>
      this.#wasm.triangulate(body, params ? JSON.stringify(quality(params)) : undefined),
    )
  }

  /**
   * How far a chamfer reaches into the edge's second face.
   *
   * The kernel takes two setbacks; the interface also allows an angle, which is
   * the same cut described the other way round. Converting here keeps the kernel
   * from having to know about both.
   */
  #setback(params: ChamferParams): number | undefined {
    const { distance, secondDistance, angle } = params
    if (secondDistance !== undefined) return secondDistance
    if (angle === undefined) return undefined
    if (!(angle > 0 && angle < 90)) {
      throw new KernelError(`Chamfer angle ${angle} must be between 0 and 90 degrees`, 'chamfer')
    }
    return distance * Math.tan(angle * DEG)
  }
}
