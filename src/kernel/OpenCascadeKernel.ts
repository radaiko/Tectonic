import { SweepMode } from 'occt-wasm'
import type { OcctKernel, ShapeHandle as OcctShape } from 'occt-wasm'
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
  IBRepKernel,
  LoftParams,
  MassProperties,
  MoveFaceParams,
  OffsetFaceParams,
  PlaneFrame,
  Profile,
  RevolveParams,
  ShapeHandle,
  ShellParams,
  SplitParams,
  SweepParams,
  TessellationParams,
  Topology,
  TransformParams,
  Vec2,
  Vec3,
} from './IKernel'
import type { KernelCapability } from './IKernel'
import { KERNEL_CAPABILITIES, KernelError, WORLD_XY } from './IKernel'
import type { WasmLoadOptions } from './wasm/WasmLoader'
import { loadOpenCascade } from './wasm/WasmLoader'

const DEG = Math.PI / 180

/**
 * Reconstruction precision for the offset-based operations (shell, thicken,
 * face offset). OpenCascade's own examples use 1e-3; 1e-6 keeps the resulting
 * topology tight, at the cost of failing on inputs a looser value would survive.
 */
const OFFSET_TOLERANCE = 1e-6

/** Sewing tolerance for adopting a triangle mesh, and the looser retry. */
const SEW_TOLERANCE = 1e-6
const SEW_RETRY_TOLERANCE = 1e-3

/** Upper bound for OpenCascade's sub-shape hashes. Large enough to avoid collisions. */
const HASH_BOUND = 1_000_000_000

/** Positions this close together are the same point when cleaning up a loop. */
const POINT_TOLERANCE = 1e-9

/** A face whose normal is this close to perpendicular to the pull counts as a side wall. */
const SIDE_FACE_TOLERANCE = 1e-3

/** Default tessellation quality, matching OpenCascade's own defaults. */
const DEFAULT_LINEAR_DEFLECTION = 0.1
const DEFAULT_ANGULAR_DEFLECTION = 0.5

/** How far a twisted sweep may advance between sections, in degrees of twist. */
const TWIST_DEGREES_PER_SECTION = 30

/**
 * B-Rep kernel backed by OpenCascade compiled to WebAssembly.
 *
 * Unlike {@link StubKernel}, shapes here are exact: faces carry their true
 * surfaces (planes, cylinders, NURBS), volumes are integrated rather than summed
 * over triangles, and fillet, shell and boolean operations are evaluated by the
 * same kernel that Onshape and FreeCAD build on. Triangles are produced only at
 * the very end, for the viewport.
 *
 * Shapes live in OpenCascade's arena and are referenced by opaque handles;
 * {@link dispose} releases one and {@link disposeAll} clears the lot. Every
 * operation cleans up the scaffolding it allocated on its way out, including
 * when it throws.
 */
export class OpenCascadeKernel implements IBRepKernel {
  readonly name = 'opencascade'

  /** A full B-Rep backend: every operation the interface names is a real one. */
  readonly capabilities: readonly KernelCapability[] = [...KERNEL_CAPABILITIES]

  readonly #occt: OcctKernel
  readonly #shapes = new Map<string, OcctShape>()
  #nextId = 0

  private constructor(occt: OcctKernel) {
    this.#occt = occt
  }

  /**
   * Brings the WASM module up and wraps it. Rejects when the binary cannot be
   * loaded or compiled, which is the signal for the caller to fall back.
   */
  static async create(options: WasmLoadOptions = {}): Promise<OpenCascadeKernel> {
    return new OpenCascadeKernel(await loadOpenCascade(options))
  }

  /** Already loaded by {@link create}, so there is nothing left to wait for. */
  async init(): Promise<void> {}

  /* ---------------------------------------------------------------- primitives */

  async createBox(params: BoxParams): Promise<ShapeHandle> {
    const { width, height, depth, center = ORIGIN } = params
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new KernelError('Box dimensions must be positive', 'createBox')
    }
    const half = { x: width / 2, y: height / 2, z: depth / 2 }
    return this.#operation('createBox', (occt) =>
      occt.makeBoxFromCorners(subtract(center, half), add(center, half)),
    )
  }

  /**
   * Adopts a triangle mesh by sewing one planar face per triangle. The result is
   * a genuine B-Rep shell — every facet is a real face — so an imported STL costs
   * as many faces as it has triangles. Meshes that do not close up come back as
   * an open shell rather than a solid.
   */
  async createFromMesh(mesh: MeshData): Promise<ShapeHandle> {
    if (mesh.indices.length < 3 || mesh.positions.length < 9) {
      throw new KernelError('A mesh needs at least one triangle', 'createFromMesh')
    }
    if (mesh.indices.length % 3 !== 0) {
      throw new KernelError('Mesh indices must come in triples', 'createFromMesh')
    }

    return this.#operation('createFromMesh', (occt, scratch) => {
      const faces: OcctShape[] = []
      for (let start = 0; start + 2 < mesh.indices.length; start += 3) {
        const a = vertexOf(mesh, mesh.indices[start] as number)
        const b = vertexOf(mesh, mesh.indices[start + 1] as number)
        const c = vertexOf(mesh, mesh.indices[start + 2] as number)
        // A sliver with no area has no plane, and OpenCascade will not build a
        // face from it; dropping it leaves the shell no worse off.
        if (magnitude(cross(subtract(b, a), subtract(c, a))) <= POINT_TOLERANCE) continue
        faces.push(scratch.hold(occt.buildTriFace(a, b, c)))
      }
      if (faces.length === 0) {
        throw new KernelError('The mesh has no triangle with any area', 'createFromMesh')
      }

      // Either the mesh closes up into a solid, or its vertices do not meet as
      // tightly as the first tolerance demanded, or it is genuinely an open
      // sheet. Solidifying can also "succeed" on a flat sheet and hand back a
      // solid of no volume, so the result has to bound something to be believed.
      for (const tolerance of [SEW_TOLERANCE, SEW_RETRY_TOLERANCE]) {
        try {
          const solid = occt.sewAndSolidify(faces, tolerance)
          if (Math.abs(occt.getVolume(solid)) > POINT_TOLERANCE) {
            return this.#outward(solid, scratch)
          }
          scratch.hold(solid)
        } catch {
          // Try the looser tolerance, then settle for an open shell.
        }
      }
      return occt.sew(faces, SEW_RETRY_TOLERANCE)
    })
  }

  /* ------------------------------------------------------------------- sweeps */

  async extrude(params: ExtrudeParams): Promise<ShapeHandle> {
    const {
      profile,
      distance,
      direction,
      plane,
      draftAngle = 0,
      side = 'one-sided',
      secondDistance = 0,
    } = params
    if (!(distance > 0)) {
      throw new KernelError('Extrude distance must be positive', 'extrude')
    }

    return this.#operation('extrude', (occt, scratch) => {
      const frame = basisOf(plane ?? WORLD_XY, 'extrude')
      const axis = direction
        ? unit(direction, 'Extrude direction must be non-zero', 'extrude')
        : frame.normal

      // The sweep runs one way only, so a two-sided extrusion starts its profile
      // `back` behind the sketch plane and covers the whole span in one prism.
      const back =
        side === 'symmetric'
          ? distance / 2
          : side === 'two-sided'
            ? Math.max(0, secondDistance)
            : 0
      const span = scale(axis, (side === 'symmetric' ? distance / 2 : distance) + back)

      let face = scratch.hold(this.#profileFace(profile, frame, 'extrude', scratch))
      if (back > 0) {
        const shifted = scale(axis, -back)
        face = scratch.hold(occt.translate(face, shifted.x, shifted.y, shifted.z))
      }

      // OpenCascade tapers inwards for a positive angle; the interface promises
      // that a positive angle widens the far end, so the sign is flipped here.
      return draftAngle !== 0
        ? occt.draftPrism(face, span.x, span.y, span.z, -draftAngle)
        : occt.extrude(face, span.x, span.y, span.z)
    })
  }

  async revolve(params: RevolveParams): Promise<ShapeHandle> {
    const { profile, axis, angle, plane, symmetric = false } = params
    if (!(Math.abs(angle) > 0)) {
      throw new KernelError('Revolve angle must be non-zero', 'revolve')
    }
    if (axis.direction.x === 0 && axis.direction.y === 0) {
      throw new KernelError('Revolve axis direction must be non-zero', 'revolve')
    }

    return this.#operation('revolve', (occt, scratch) => {
      const frame = basisOf(plane ?? WORLD_XY, 'revolve')
      const line = {
        point: pointOn(frame, axis.origin.x, axis.origin.y),
        direction: normalize(
          add(scale(frame.xAxis, axis.direction.x), scale(frame.yAxis, axis.direction.y)),
        ),
      }
      const sweep = clamp(angle, -360, 360) * DEG

      let face = scratch.hold(this.#profileFace(profile, frame, 'revolve', scratch))
      if (symmetric) {
        face = scratch.hold(occt.rotate(face, line, -sweep / 2))
      }
      return occt.revolve(face, line, sweep)
    })
  }

  /**
   * Sweeps the profile along the path with `BRepOffsetAPI_MakePipeShell`. A
   * profile with holes is swept once per loop and the loops are cut out of the
   * outer body, so a swept tube stays hollow.
   *
   * Twist is the one thing the pipe shell will not carry, so a twisted sweep is
   * lofted instead through sections spun about the path — still exact surfaces,
   * just interpolated between stations rather than driven by a law.
   */
  async sweep(params: SweepParams): Promise<ShapeHandle> {
    const { profile, path, plane, orientation = 'follow-path', twistAngle = 0 } = params
    const spine = dedupe(path)
    if (spine.length < 2) {
      throw new KernelError('Sweep path needs at least two distinct points', 'sweep')
    }

    return this.#operation('sweep', (occt, scratch) => {
      const frame = basisOf(plane ?? WORLD_XY, 'sweep')
      if (twistAngle !== 0) {
        return this.#twistedSweep(profile, spine, frame, twistAngle, scratch)
      }

      const rail = scratch.hold(this.#polyline(spine, 'sweep', scratch))
      const mode = orientation === 'perpendicular' ? SweepMode.Fixed : SweepMode.Frenet
      const run = (points: readonly Vec2[]): OcctShape => {
        const section = scratch.hold(this.#loopWire(points, frame, 'sweep', scratch))
        return occt.sweepOriented(section, rail, mode)
      }

      const body = run(profile.points)
      const holes = profile.holes ?? []
      if (holes.length === 0) return body

      const tools = holes.map((hole) => scratch.hold(run(hole)))
      scratch.hold(body)
      return this.#simplify(occt.cutAll(body, tools), scratch)
    })
  }

  /**
   * Lofts through the sections with `BRepOffsetAPI_ThruSections`. Guide curves are
   * recorded by the interface but not followed: ThruSections interpolates the
   * sections themselves and takes no guides.
   */
  async loft(params: LoftParams): Promise<ShapeHandle> {
    const { sections, closed = false } = params
    if (sections.length < 2) {
      throw new KernelError('Loft needs at least two sections', 'loft')
    }

    return this.#operation('loft', (occt, scratch) => {
      const wires = sections.map((section) =>
        scratch.hold(
          this.#loopWire(section.profile.points, basisOf(section.plane ?? WORLD_XY, 'loft'), 'loft', scratch),
        ),
      )
      if (!closed) return occt.loft(wires, true, false)

      // A closed loft has no first or last section, which ThruSections cannot
      // express. Building the run and its closing span as open shells and sewing
      // them gives the same surface without a seam cap.
      const run = scratch.hold(occt.loft(wires, false, false))
      const closing = scratch.hold(
        occt.loft([wires[wires.length - 1] as OcctShape, wires[0] as OcctShape], false, false),
      )
      const shell = scratch.hold(occt.sew([run, closing], SEW_TOLERANCE))
      return this.#outward(occt.makeSolid(occt.downcast(shell, 'shell')), scratch)
    })
  }

  /* ----------------------------------------------------------------- booleans */

  async booleanUnion(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle> {
    return this.#combine(a, b, 'booleanUnion', (occt, left, right) => occt.fuse(left, right))
  }

  async booleanSubtract(target: ShapeHandle, tool: ShapeHandle): Promise<ShapeHandle> {
    return this.#combine(target, tool, 'booleanSubtract', (occt, left, right) => occt.cut(left, right))
  }

  async booleanIntersect(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle> {
    return this.#combine(a, b, 'booleanIntersect', (occt, left, right) => occt.common(left, right))
  }

  /* ----------------------------------------------------------- edge treatments */

  async fillet(shape: ShapeHandle, params: FilletParams): Promise<ShapeHandle> {
    if (!(params.radius > 0)) {
      throw new KernelError('Fillet radius must be positive', 'fillet')
    }
    return this.#operation('fillet', (occt, scratch) => {
      const solid = this.#require(shape, 'fillet')
      const edges = this.#pickEdges(solid, params.edgeIds, 'fillet', scratch)
      return occt.fillet(solid, edges, params.radius)
    })
  }

  async chamfer(shape: ShapeHandle, params: ChamferParams): Promise<ShapeHandle> {
    const { distance, secondDistance, angle } = params
    if (!(distance > 0)) {
      throw new KernelError('Chamfer distance must be positive', 'chamfer')
    }
    if (angle !== undefined && (angle <= 0 || angle >= 90)) {
      throw new KernelError('Chamfer angle must be between 0 and 90 degrees', 'chamfer')
    }
    if (secondDistance !== undefined && !(secondDistance > 0)) {
      throw new KernelError('Chamfer second distance must be positive', 'chamfer')
    }

    return this.#operation('chamfer', (occt, scratch) => {
      const solid = this.#require(shape, 'chamfer')
      const edges = this.#pickEdges(solid, params.edgeIds, 'chamfer', scratch)
      if (angle !== undefined) {
        return occt.chamferDistAngle(solid, edges, distance, angle)
      }
      if (secondDistance !== undefined && secondDistance !== distance) {
        // A distance-distance chamfer is the same cut as a distance-angle one
        // whose angle is atan(d2 / d1), which is what OpenCascade exposes here.
        return occt.chamferDistAngle(solid, edges, distance, Math.atan2(secondDistance, distance) / DEG)
      }
      return occt.chamfer(solid, edges, distance)
    })
  }

  /**
   * Hollows the solid with `BRepOffsetAPI_MakeThickSolid`. Naming open faces
   * leaves those openings in the wall; naming none produces a sealed cavity,
   * built by removing an inward offset of the solid from the solid itself.
   */
  async shell(shape: ShapeHandle, params: ShellParams): Promise<ShapeHandle> {
    const { thickness, openFaceIds } = params
    if (!(thickness > 0)) {
      throw new KernelError('Shell thickness must be positive', 'shell')
    }

    return this.#operation('shell', (occt, scratch) => {
      const solid = this.#require(shape, 'shell')
      const box = occt.getBoundingBox(solid, false)
      const thinnest = Math.min(box.xmax - box.xmin, box.ymax - box.ymin, box.zmax - box.zmin)
      if (thickness * 2 >= thinnest) {
        throw new KernelError('Shell thickness exceeds the solid', 'shell')
      }

      const openFaces = this.#pickFaces(solid, openFaceIds ?? [], 'shell', scratch)
      if (openFaces.length > 0) {
        return occt.shell(solid, openFaces, thickness, OFFSET_TOLERANCE)
      }
      const cavity = scratch.hold(occt.offset(solid, -thickness, OFFSET_TOLERANCE))
      return this.#simplify(occt.cut(solid, cavity), scratch)
    })
  }

  async hole(shape: ShapeHandle, params: HoleParams): Promise<ShapeHandle> {
    const { center, diameter, depth, kind = 'simple', headDiameter, headDepth } = params
    if (!(diameter > 0)) throw new KernelError('Hole diameter must be positive', 'hole')
    if (!(depth > 0)) throw new KernelError('Hole depth must be positive', 'hole')

    return this.#operation('hole', (occt, scratch) => {
      const solid = this.#require(shape, 'hole')
      const axis = unit(
        params.direction ?? { x: 0, y: 0, z: -1 },
        'Hole direction must be non-zero',
        'hole',
      )
      const radius = diameter / 2
      // Start the tool just above the surface so no cut face lands coplanar with
      // one of the solid's own — a classic source of boolean failures.
      const overshoot = depth * 1e-3 + 1e-2
      const mouth = add(center, scale(axis, -overshoot))

      const tools = [
        scratch.hold(this.#aim(occt.makeCylinder(radius, depth + 2 * overshoot), axis, mouth, scratch)),
      ]

      if (kind !== 'simple') {
        const headRadius = Math.max(radius, (headDiameter ?? diameter * 2) / 2)
        const sink = Math.max(1e-3, headDepth ?? radius)
        const head =
          kind === 'counterbore'
            ? occt.makeCylinder(headRadius, sink + overshoot)
            : // Widen the cone by the overshoot's worth of taper so the sink
              // angle is unchanged by starting it above the surface.
              occt.makeCone(
                headRadius + ((headRadius - radius) / sink) * overshoot,
                radius,
                sink + overshoot,
              )
        tools.push(scratch.hold(this.#aim(head, axis, mouth, scratch)))
      }

      const drilled = this.#simplify(occt.cutAll(solid, tools), scratch)
      if (occt.subShapeCount(drilled, 'face') === 0) {
        throw new KernelError('Hole removed the whole solid', 'hole')
      }
      return drilled
    })
  }

  /**
   * Tilts faces away from the pull direction with `BRepOffsetAPI_DraftAngle`.
   * With no faces named, every side wall — a face whose normal is perpendicular
   * to the pull — is drafted, which is what a mould draft means.
   *
   * `neutralOffset` is not honoured: this build pins the neutral plane — the
   * height the section keeps unchanged — to the world plane through the origin
   * perpendicular to the pull, rather than to a plane the caller chooses.
   */
  async draft(shape: ShapeHandle, params: DraftParams): Promise<ShapeHandle> {
    const { angle, neutralOffset: _neutralOffset, faceIds } = params
    if (Math.abs(angle) >= 90) {
      throw new KernelError('Draft angle must be less than 90 degrees', 'draft')
    }

    return this.#operation('draft', (occt, scratch) => {
      const solid = this.#require(shape, 'draft')
      const pull = unit(
        params.pullDirection ?? { x: 0, y: 0, z: 1 },
        'Draft pull direction must be non-zero',
        'draft',
      )

      const targets: Vec3[] = []
      if (faceIds && faceIds.length > 0) {
        for (const face of this.#pickFaces(solid, faceIds, 'draft', scratch)) {
          targets.push(occt.getSurfaceCenterOfMass(face))
        }
      } else {
        for (const face of scratch.holdAll(occt.getSubShapes(solid, 'face'))) {
          if (Math.abs(dot(this.#faceNormal(face), pull)) <= SIDE_FACE_TOLERANCE) {
            targets.push(occt.getSurfaceCenterOfMass(face))
          }
        }
      }
      if (targets.length === 0) {
        throw new KernelError('None of those faces can be drafted', 'draft')
      }

      // Each draft rebuilds the solid, so the next target is found again by the
      // centre of the face it started on — drafting one wall barely moves another's.
      let current = solid
      for (const target of targets) {
        const face = this.#nearestFace(current, target, scratch)
        const drafted = occt.draft(current, face, -angle * DEG, pull)
        if (current !== solid) scratch.hold(current)
        current = drafted
      }
      return current === solid ? occt.copy(solid) : current
    })
  }

  /**
   * Cuts the solid with `BOPAlgo_Splitter` against a plane wide enough to cross
   * it, then sorts the fragments by which side of the plane they sit on. Pieces
   * come back front first, where "front" is the side the plane normal points at.
   */
  async split(shape: ShapeHandle, params: SplitParams): Promise<ShapeHandle[]> {
    const { keep = 'both' } = params
    const scratch = new Scratch(this.#occt)
    try {
      const occt = this.#occt
      const solid = this.#require(shape, 'split')
      const frame = basisOf(params.plane, 'split')
      const box = occt.getBoundingBox(solid, false)
      const reach =
        magnitude({ x: box.xmax - box.xmin, y: box.ymax - box.ymin, z: box.zmax - box.zmin }) + 1

      const knife = scratch.hold(
        occt.transform(
          scratch.hold(occt.translate(scratch.hold(occt.makeRectangle(reach * 2, reach * 2)), -reach, -reach, 0)),
          placement(frame),
        ),
      )
      const cut = scratch.hold(occt.split(solid, [knife]))
      const pieces = occt.isCompound(cut) ? scratch.holdAll(occt.getSubShapes(cut, 'solid')) : [cut]

      const front: ShapeHandle[] = []
      const back: ShapeHandle[] = []
      for (const piece of pieces) {
        const side = dot(subtract(occt.getCenterOfMass(piece), frame.origin), frame.normal)
        // `split` hands the shape straight back when the plane misses it, so
        // every piece is copied before it is registered as a shape of our own.
        const owned = occt.copy(piece)
        if (side >= 0) front.push(this.#register(owned))
        else back.push(this.#register(owned))
      }

      const wanted = keep === 'front' ? front : keep === 'back' ? back : [...front, ...back]
      if (wanted.length === 0) {
        for (const piece of [...front, ...back]) this.dispose(piece)
        throw new KernelError('The split plane produced no solid', 'split')
      }
      // The unwanted side is a shape nobody asked for; release it here rather
      // than leaking it into the arena for the rest of the session.
      for (const piece of [...front, ...back]) {
        if (!wanted.includes(piece)) this.dispose(piece)
      }
      return wanted
    } catch (cause) {
      throw asKernelError(cause, 'split')
    } finally {
      scratch.release()
    }
  }

  /* ----------------------------------------------------------------- topology */

  /**
   * Names the shape's boundary. Ids are ordinals over a canonical geometric
   * ordering — faces by centre then area, edges by midpoint then length,
   * vertices by position — rather than over OpenCascade's own hashes, which are
   * tied to a particular instance and would not survive a rebuild of the same
   * model.
   */
  async topology(shape: ShapeHandle): Promise<Topology> {
    const scratch = new Scratch(this.#occt)
    try {
      const index = this.#index(this.#require(shape, 'topology'), scratch)
      return {
        faceIds: [...index.faces.keys()],
        edgeIds: [...index.edges.keys()],
        vertexIds: [...index.vertices.keys()],
      }
    } catch (cause) {
      throw asKernelError(cause, 'topology')
    } finally {
      scratch.release()
    }
  }

  /**
   * Direct edit: drags faces along a direction, extending or trimming whatever
   * they are attached to. Each face is prism-swept and the prism is fused when it
   * lands outside the solid or cut when it lands inside — push-pull as a real
   * boolean, not a vertex nudge.
   */
  async moveFace(shape: ShapeHandle, params: MoveFaceParams): Promise<ShapeHandle> {
    if (params.faceIds.length === 0) {
      throw new KernelError('moveFace needs at least one face', 'moveFace')
    }
    const direction = unit(params.direction, 'Move face direction must be non-zero', 'moveFace')
    const travel = scale(direction, params.distance)

    return this.#pushPull(shape, params.faceIds, 'moveFace', (occt, face, normal) => {
      const along = dot(travel, normal)
      // A face slid within its own plane leaves the solid unchanged.
      if (Math.abs(along) <= POINT_TOLERANCE) return null
      return { body: occt.extrude(face, travel.x, travel.y, travel.z), add: along > 0 }
    })
  }

  /** Direct edit: offsets faces along their own normals, so curved faces stay curved. */
  async offsetFace(shape: ShapeHandle, params: OffsetFaceParams): Promise<ShapeHandle> {
    if (params.faceIds.length === 0) {
      throw new KernelError('offsetFace needs at least one face', 'offsetFace')
    }
    const { distance } = params

    return this.#pushPull(shape, params.faceIds, 'offsetFace', (occt, face) => {
      if (Math.abs(distance) <= POINT_TOLERANCE) return null
      return { body: occt.thicken(face, distance, OFFSET_TOLERANCE), add: distance > 0 }
    })
  }

  /**
   * Direct edit: removes faces and heals what they leave behind. The opening's
   * rim is split into loops, each loop is capped, and the cap plus the removed
   * faces make a patch — fused in when the faces bounded a cavity, cut away when
   * they bounded a boss. Deleting the wall of a through hole fills the hole.
   */
  async deleteFace(shape: ShapeHandle, params: DeleteFaceParams): Promise<ShapeHandle> {
    if (params.faceIds.length === 0) {
      throw new KernelError('deleteFace needs at least one face', 'deleteFace')
    }

    return this.#operation('deleteFace', (occt, scratch) => {
      const solid = this.#require(shape, 'deleteFace')
      const doomed = this.#pickFaces(solid, params.faceIds, 'deleteFace', scratch)
      const removed = new Set(doomed.map((face) => occt.hashCode(face, HASH_BOUND)))
      const kept = scratch
        .holdAll(occt.getSubShapes(solid, 'face'))
        .filter((face) => !removed.has(occt.hashCode(face, HASH_BOUND)))
      if (kept.length === 0) {
        throw new KernelError('Deleting those faces would remove the whole solid', 'deleteFace')
      }

      const caps = this.#capOpenings(doomed, kept, scratch)
      let patch = scratch.hold(occt.sewAndSolidify([...doomed, ...caps], SEW_TOLERANCE))
      patch = scratch.hold(this.#outward(patch, scratch))

      // Whether the patch is material to add or material to take away is settled
      // by where it sits: a pocket's patch is outside the solid, a boss's inside.
      const inside = occt.containsPoint(solid, occt.getCenterOfMass(patch))
      const healed = inside ? occt.cut(solid, patch) : occt.fuse(solid, patch)
      const result = this.#simplify(healed, scratch)
      if (occt.subShapeCount(result, 'face') === 0) {
        throw new KernelError('Deleting those faces would remove the whole solid', 'deleteFace')
      }
      return result
    })
  }

  /* --------------------------------------------------------------- placement */

  async transform(shape: ShapeHandle, params: TransformParams): Promise<ShapeHandle> {
    return this.#operation('transform', (occt, scratch) => {
      let current = this.#require(shape, 'transform')
      const step = (next: OcctShape): void => {
        if (current !== this.#shapes.get(shape.id)) scratch.hold(current)
        current = next
      }

      if (params.scale !== undefined) {
        const factors =
          typeof params.scale === 'number'
            ? { x: params.scale, y: params.scale, z: params.scale }
            : params.scale
        if (factors.x === 0 || factors.y === 0 || factors.z === 0) {
          throw new KernelError('Scale factors must be non-zero', 'transform')
        }
        const about = params.scaleOrigin ?? ORIGIN
        step(
          factors.x === factors.y && factors.y === factors.z
            ? occt.scale(current, about, factors.x)
            : // A per-axis scale is not a rigid motion, so it goes through the
              // general transform, conjugated to act about `about`.
              occt.generalTransform(current, [
                factors.x, 0, 0, about.x - factors.x * about.x,
                0, factors.y, 0, about.y - factors.y * about.y,
                0, 0, factors.z, about.z - factors.z * about.z,
              ]),
        )
      }

      if (params.rotate) {
        const axis = unit(params.rotate.axis, 'Rotation axis must be non-zero', 'transform')
        step(
          occt.rotate(
            current,
            { point: params.rotate.origin ?? ORIGIN, direction: axis },
            params.rotate.angle * DEG,
          ),
        )
      }

      if (params.translate) {
        const { x, y, z } = params.translate
        step(occt.translate(current, x, y, z))
      }

      return current === this.#shapes.get(shape.id) ? occt.copy(current) : current
    })
  }

  async mirror(shape: ShapeHandle, plane: PlaneFrame): Promise<ShapeHandle> {
    return this.#operation('mirror', (occt, scratch) => {
      const frame = basisOf(plane, 'mirror')
      return this.#outward(occt.mirror(this.#require(shape, 'mirror'), frame.origin, frame.normal), scratch)
    })
  }

  async copy(shape: ShapeHandle): Promise<ShapeHandle> {
    return this.#operation('copy', (occt) => occt.copy(this.#require(shape, 'copy')))
  }

  /* ----------------------------------------------------------------- queries */

  async boundingBox(shape: ShapeHandle): Promise<BoundingBox> {
    try {
      // Surface-precise rather than triangle-derived, so a cylinder's bounds do
      // not depend on whether it has been tessellated yet.
      const box = this.#occt.getBoundingBox(this.#require(shape, 'boundingBox'), false)
      return {
        min: { x: box.xmin, y: box.ymin, z: box.zmin },
        max: { x: box.xmax, y: box.ymax, z: box.zmax },
      }
    } catch (cause) {
      throw asKernelError(cause, 'boundingBox')
    }
  }

  async triangulate(shape: ShapeHandle, params?: TessellationParams): Promise<MeshData> {
    try {
      const mesh = this.#occt.tessellate(this.#require(shape, 'triangulate'), {
        linearDeflection: params?.linearDeflection ?? DEFAULT_LINEAR_DEFLECTION,
        angularDeflection: params?.angularDeflection ?? DEFAULT_ANGULAR_DEFLECTION,
      })
      return {
        positions: Array.from(mesh.positions),
        normals: Array.from(mesh.normals),
        indices: Array.from(mesh.indices),
      }
    } catch (cause) {
      throw asKernelError(cause, 'triangulate')
    }
  }

  async massProperties(shape: ShapeHandle): Promise<MassProperties> {
    try {
      const occt = this.#occt
      const solid = this.#require(shape, 'massProperties')
      return {
        volume: occt.getVolume(solid),
        surfaceArea: occt.getSurfaceArea(solid),
        centerOfMass: occt.getCenterOfMass(solid),
        inertia: occt.getInertia(solid),
      }
    } catch (cause) {
      throw asKernelError(cause, 'massProperties')
    }
  }

  async faces(shape: ShapeHandle): Promise<ShapeHandle[]> {
    return this.#explore(shape, 'face', 'faces')
  }

  async edges(shape: ShapeHandle): Promise<ShapeHandle[]> {
    return this.#explore(shape, 'edge', 'edges')
  }

  async faceInfo(shape: ShapeHandle): Promise<readonly FaceInfo[]> {
    return this.#describe(shape, 'faceInfo', (occt, index) =>
      [...index.faces].map(([id, face]) => ({
        id,
        centroid: occt.getSurfaceCenterOfMass(face),
        area: occt.getSurfaceArea(face),
        normal: this.#faceNormal(face),
        kind: occt.surfaceType(face),
      })),
    )
  }

  async edgeInfo(shape: ShapeHandle): Promise<readonly EdgeInfo[]> {
    return this.#describe(shape, 'edgeInfo', (occt, index) =>
      [...index.edges].map(([id, edge]) => ({
        id,
        midpoint: occt.getLinearCenterOfMass(edge),
        length: occt.getLength(edge),
        kind: occt.curveType(edge),
      })),
    )
  }

  async isSolid(shape: ShapeHandle): Promise<boolean> {
    const solid = this.#require(shape, 'isSolid')
    return this.#occt.isSolid(solid) || this.#occt.subShapeCount(solid, 'solid') > 0
  }

  async isValid(shape: ShapeHandle): Promise<boolean> {
    return this.#occt.isValid(this.#require(shape, 'isValid'))
  }

  async thicken(shape: ShapeHandle, thickness: number): Promise<ShapeHandle> {
    if (thickness === 0) {
      throw new KernelError('Thicken distance must be non-zero', 'thicken')
    }
    return this.#operation('thicken', (occt) =>
      occt.thicken(this.#require(shape, 'thicken'), thickness, OFFSET_TOLERANCE),
    )
  }

  async stitch(shapes: readonly ShapeHandle[]): Promise<ShapeHandle> {
    if (shapes.length === 0) {
      throw new KernelError('Stitch needs at least one surface', 'stitch')
    }
    return this.#operation('stitch', (occt, scratch) => {
      const parts = shapes.map((handle) => this.#require(handle, 'stitch'))
      const sewn = occt.sew(parts, SEW_TOLERANCE)
      if (!occt.isShell(sewn)) return sewn
      // A sewn shell that closed up is worth promoting to a solid, so callers can
      // go straight on to a boolean with it.
      try {
        return this.#outward(occt.makeSolid(occt.downcast(sewn, 'shell')), scratch)
      } catch {
        return sewn
      }
    })
  }

  dispose(shape: ShapeHandle): void {
    const held = this.#shapes.get(shape.id)
    if (held === undefined) return
    this.#shapes.delete(shape.id)
    try {
      this.#occt.release(held)
    } catch {
      // Already gone from the arena; the map entry is what mattered.
    }
  }

  /** Releases every shape this kernel is holding. */
  disposeAll(): void {
    for (const held of this.#shapes.values()) {
      try {
        this.#occt.release(held)
      } catch {
        // Nothing left to release.
      }
    }
    this.#shapes.clear()
  }

  /* ------------------------------------------------------------------ internals */

  /**
   * Runs one operation: hands it the kernel and a scratch pad, registers what it
   * returns and releases the scaffolding either way.
   */
  #operation(
    operation: string,
    action: (occt: OcctKernel, scratch: Scratch) => OcctShape,
  ): ShapeHandle {
    const scratch = new Scratch(this.#occt)
    try {
      return this.#register(action(this.#occt, scratch))
    } catch (cause) {
      throw asKernelError(cause, operation)
    } finally {
      scratch.release()
    }
  }

  #combine(
    a: ShapeHandle,
    b: ShapeHandle,
    operation: string,
    action: (occt: OcctKernel, left: OcctShape, right: OcctShape) => OcctShape,
  ): Promise<ShapeHandle> {
    return Promise.resolve(
      this.#operation(operation, (occt, scratch) => {
        const result = this.#simplify(
          action(occt, this.#require(a, operation), this.#require(b, operation)),
          scratch,
        )
        if (occt.subShapeCount(result, 'face') === 0) {
          throw new KernelError(`${operation} produced an empty solid`, operation)
        }
        return result
      }),
    )
  }

  #register(shape: OcctShape): ShapeHandle {
    const id = `occ-shape-${this.#nextId++}`
    this.#shapes.set(id, shape)
    return { id }
  }

  #require(shape: ShapeHandle, operation: string): OcctShape {
    const held = this.#shapes.get(shape.id)
    if (held === undefined) {
      throw new KernelError(`Unknown shape: ${shape.id}`, operation)
    }
    return held
  }

  /** Reads geometry off a shape's topology index, releasing the probes after. */
  #describe<T>(
    shape: ShapeHandle,
    operation: string,
    read: (occt: OcctKernel, index: TopologyIndex) => T,
  ): T {
    const scratch = new Scratch(this.#occt)
    try {
      return read(this.#occt, this.#index(this.#require(shape, operation), scratch))
    } catch (cause) {
      throw asKernelError(cause, operation)
    } finally {
      scratch.release()
    }
  }

  #explore(shape: ShapeHandle, kind: 'face' | 'edge', operation: string): ShapeHandle[] {
    try {
      return this.#occt
        .getSubShapes(this.#require(shape, operation), kind)
        .map((part) => this.#register(part))
    } catch (cause) {
      throw asKernelError(cause, operation)
    }
  }

  /**
   * Unwraps the compound OpenCascade returns from a boolean and merges the
   * coplanar face fragments it leaves behind, so the next selection sees one face
   * where the model has one face.
   */
  #simplify(shape: OcctShape, scratch: Scratch): OcctShape {
    const occt = this.#occt
    let current = shape

    try {
      const unified = occt.unifySameDomain(current)
      scratch.hold(current)
      current = unified
    } catch {
      // Some results cannot be unified; the un-merged shape is still correct.
    }

    if (occt.isCompound(current)) {
      const solids = occt.getSubShapes(current, 'solid')
      if (solids.length === 1) {
        scratch.holdAll(solids.slice(1))
        scratch.hold(current)
        return solids[0] as OcctShape
      }
      scratch.holdAll(solids)
    }
    return current
  }

  /** Flips a shape built from borrowed faces if it came out inside-out. */
  #outward(shape: OcctShape, scratch: Scratch): OcctShape {
    const occt = this.#occt
    if (occt.getVolume(shape) >= 0) return shape
    scratch.hold(shape)
    return occt.fixFaceOrientations(shape)
  }

  /* ------------------------------------------------------- profiles and wires */

  #loopWire(points: readonly Vec2[], frame: Basis, operation: string, scratch: Scratch): OcctShape {
    const loop = cleanLoop(points, operation)
    const world = loop.map((point) => pointOn(frame, point.x, point.y))
    return this.#polyline([...world, world[0] as Vec3], operation, scratch)
  }

  /** A wire through the points in order; a repeated last point closes it. */
  #polyline(points: readonly Vec3[], operation: string, scratch: Scratch): OcctShape {
    const edges: OcctShape[] = []
    for (let index = 0; index + 1 < points.length; index += 1) {
      edges.push(
        scratch.hold(
          this.#occt.makeLineEdge(points[index] as Vec3, points[index + 1] as Vec3),
        ),
      )
    }
    if (edges.length === 0) {
      throw new KernelError(`${operation} needs at least two distinct points`, operation)
    }
    return this.#occt.makeWire(edges)
  }

  #profileFace(profile: Profile, frame: Basis, operation: string, scratch: Scratch): OcctShape {
    const occt = this.#occt
    const outer = scratch.hold(this.#loopWire(profile.points, frame, operation, scratch))
    const face = occt.makeFace(outer)
    const holes = profile.holes ?? []
    if (holes.length === 0) return face

    const wires = holes.map((hole) => scratch.hold(this.#loopWire(hole, frame, operation, scratch)))
    scratch.hold(face)
    return occt.addHolesInFace(face, wires)
  }

  /**
   * Twist as a loft: sections are placed along the path by parallel transport,
   * spun about the tangent by their share of the total twist, and interpolated.
   */
  #twistedSweep(
    profile: Profile,
    spine: readonly Vec3[],
    frame: Basis,
    twistAngle: number,
    scratch: Scratch,
  ): OcctShape {
    const occt = this.#occt
    const stations = resample(
      spine,
      Math.max(spine.length, 2 + Math.ceil(Math.abs(twistAngle) / TWIST_DEGREES_PER_SECTION)),
    )
    const tangents = tangentsOf(stations)

    let u = frame.xAxis
    let v = frame.yAxis
    const wires: OcctShape[] = []

    for (let index = 0; index < stations.length; index += 1) {
      if (index > 0) {
        const rotation = alignment(tangents[index - 1] as Vec3, tangents[index] as Vec3)
        u = rotation(u)
        v = rotation(v)
      }
      const spin = twistAngle * DEG * (index / (stations.length - 1))
      const spun = about(tangents[index] as Vec3, spin)
      const ringU = spun(u)
      const ringV = spun(v)
      const origin = stations[index] as Vec3

      const loop = cleanLoop(profile.points, 'sweep').map((point) =>
        add(origin, add(scale(ringU, point.x), scale(ringV, point.y))),
      )
      wires.push(scratch.hold(this.#polyline([...loop, loop[0] as Vec3], 'sweep', scratch)))
    }

    return occt.loft(wires, true, false)
  }

  /** Rotates a shape whose axis runs along +Z onto `axis`, based at `start`. */
  #aim(shape: OcctShape, axis: Vec3, start: Vec3, scratch: Scratch): OcctShape {
    const occt = this.#occt
    const z: Vec3 = { x: 0, y: 0, z: 1 }
    const turn = cross(z, axis)

    let aimed = shape
    if (magnitude(turn) > POINT_TOLERANCE) {
      scratch.hold(aimed)
      aimed = occt.rotate(
        aimed,
        { point: ORIGIN, direction: normalize(turn) },
        Math.acos(clamp(dot(z, axis), -1, 1)),
      )
    } else if (dot(z, axis) < 0) {
      // Antiparallel: any perpendicular axis will do for the half turn.
      scratch.hold(aimed)
      aimed = occt.rotate(aimed, { point: ORIGIN, direction: { x: 1, y: 0, z: 0 } }, Math.PI)
    }

    scratch.hold(aimed)
    return occt.translate(aimed, start.x, start.y, start.z)
  }

  /* ------------------------------------------------------- topology resolution */

  #index(shape: OcctShape, scratch: Scratch): TopologyIndex {
    const occt = this.#occt
    const ordered = <T>(
      kind: 'face' | 'edge' | 'vertex',
      keyOf: (part: OcctShape) => T,
      compare: (a: T, b: T) => number,
    ): Map<string, OcctShape> => {
      const parts = scratch
        .holdAll(occt.getSubShapes(shape, kind))
        .map((part) => ({ part, key: keyOf(part) }))
      parts.sort((a, b) => compare(a.key, b.key))
      return new Map(parts.map((entry, ordinal) => [`${kind}-${ordinal}`, entry.part]))
    }

    return {
      faces: ordered(
        'face',
        (face) => ({ at: occt.getSurfaceCenterOfMass(face), size: occt.getSurfaceArea(face) }),
        (a, b) => comparePoints(a.at, b.at) || compareNumbers(a.size, b.size),
      ),
      edges: ordered(
        'edge',
        (edge) => ({ at: occt.getLinearCenterOfMass(edge), size: occt.getLength(edge) }),
        (a, b) => comparePoints(a.at, b.at) || compareNumbers(a.size, b.size),
      ),
      vertices: ordered(
        'vertex',
        (vertex) => occt.vertexPosition(vertex),
        (a, b) => comparePoints(a, b),
      ),
    }
  }

  /** The named edges, or every edge when nothing is named. */
  #pickEdges(
    shape: OcctShape,
    edgeIds: readonly string[] | undefined,
    operation: string,
    scratch: Scratch,
  ): OcctShape[] {
    if (!edgeIds || edgeIds.length === 0) {
      const all = scratch.holdAll(this.#occt.getSubShapes(shape, 'edge'))
      if (all.length === 0) {
        throw new KernelError(`${operation} found no edges on this shape`, operation)
      }
      return all
    }

    const index = this.#index(shape, scratch)
    const picked = edgeIds
      .map((id) => index.edges.get(id))
      .filter((edge): edge is OcctShape => edge !== undefined)
    if (picked.length === 0) {
      throw new KernelError('None of those edges belong to this shape', operation)
    }
    return picked
  }

  /**
   * The named faces. An empty selection returns nothing rather than everything —
   * shell and draft both read "no faces named" as a mode of their own.
   */
  #pickFaces(
    shape: OcctShape,
    faceIds: readonly string[],
    operation: string,
    scratch: Scratch,
  ): OcctShape[] {
    if (faceIds.length === 0) return []

    const index = this.#index(shape, scratch)
    const picked = faceIds
      .map((id) => index.faces.get(id))
      .filter((face): face is OcctShape => face !== undefined)
    if (picked.length === 0) {
      throw new KernelError('None of those faces belong to this solid', operation)
    }
    return picked
  }

  /** Outward unit normal of a face, sampled at the middle of its parameter range. */
  #faceNormal(face: OcctShape): Vec3 {
    const bounds = this.#occt.uvBounds(face)
    return this.#occt.surfaceNormal(
      face,
      (bounds.uMin + bounds.uMax) / 2,
      (bounds.vMin + bounds.vMax) / 2,
    )
  }

  /** The face of `shape` whose surface centre sits closest to `target`. */
  #nearestFace(shape: OcctShape, target: Vec3, scratch: Scratch): OcctShape {
    const occt = this.#occt
    let best: OcctShape | undefined
    let bestDistance = Number.POSITIVE_INFINITY

    for (const face of scratch.holdAll(occt.getSubShapes(shape, 'face'))) {
      const distance = magnitude(subtract(occt.getSurfaceCenterOfMass(face), target))
      if (distance < bestDistance) {
        bestDistance = distance
        best = face
      }
    }
    if (best === undefined) {
      throw new KernelError('The shape has no faces', 'draft')
    }
    return best
  }

  /* -------------------------------------------------------------- direct edits */

  #pushPull(
    shape: ShapeHandle,
    faceIds: readonly string[],
    operation: string,
    toolFor: (
      occt: OcctKernel,
      face: OcctShape,
      normal: Vec3,
    ) => { body: OcctShape; add: boolean } | null,
  ): Promise<ShapeHandle> {
    return Promise.resolve(
      this.#operation(operation, (occt, scratch) => {
        const solid = this.#require(shape, operation)
        const faces = this.#pickFaces(solid, faceIds, operation, scratch)

        // Every tool is built from the shape as it was, so faces dragged together
        // move independently instead of compounding on each other.
        const tools = faces
          .map((face) => toolFor(occt, face, this.#faceNormal(face)))
          .filter((tool): tool is { body: OcctShape; add: boolean } => tool !== null)
        if (tools.length === 0) return occt.copy(solid)

        let current = solid
        for (const tool of tools) {
          scratch.hold(tool.body)
          const next = tool.add ? occt.fuse(current, tool.body) : occt.cut(current, tool.body)
          if (current !== solid) scratch.hold(current)
          current = next
        }
        return this.#simplify(current, scratch)
      }),
    )
  }

  /**
   * Planar caps over the openings left by removing `doomed`. The rim is the set of
   * edges the removed and kept faces shared; edges that touch each other belong to
   * the same opening, and each opening gets one cap.
   */
  #capOpenings(doomed: readonly OcctShape[], kept: readonly OcctShape[], scratch: Scratch): OcctShape[] {
    const occt = this.#occt
    const hash = (part: OcctShape): number => occt.hashCode(part, HASH_BOUND)

    const keptEdges = new Set<number>()
    for (const face of kept) {
      for (const edge of scratch.holdAll(occt.getSubShapes(face, 'edge'))) keptEdges.add(hash(edge))
    }

    const rim: OcctShape[] = []
    const seen = new Set<number>()
    for (const face of doomed) {
      for (const edge of scratch.holdAll(occt.getSubShapes(face, 'edge'))) {
        const key = hash(edge)
        if (keptEdges.has(key) && !seen.has(key)) {
          seen.add(key)
          rim.push(edge)
        }
      }
    }
    if (rim.length === 0) {
      throw new KernelError('Those faces leave no opening to heal', 'deleteFace')
    }

    // Group the rim into loops: two edges that meet at a vertex bound the same
    // opening, so a through hole yields two loops and a pocket one.
    const groups = new Groups(rim.length)
    const owner = new Map<number, number>()
    rim.forEach((edge, index) => {
      for (const vertex of scratch.holdAll(occt.getSubShapes(edge, 'vertex'))) {
        const key = hash(vertex)
        const first = owner.get(key)
        if (first === undefined) owner.set(key, index)
        else groups.join(index, first)
      }
    })

    const loops = new Map<number, OcctShape[]>()
    rim.forEach((edge, index) => {
      const root = groups.rootOf(index)
      const loop = loops.get(root)
      if (loop) loop.push(edge)
      else loops.set(root, [edge])
    })

    return [...loops.values()].map((loop) => {
      const wire = scratch.hold(occt.makeWire(loop))
      try {
        return occt.makeFace(wire)
      } catch {
        // A rim that is not planar still bounds a surface; let OpenCascade fit one.
        return occt.makeNonPlanarFace(wire)
      }
    })
  }
}

/* -------------------------------------------------------------------------- */
/* Scratch handling                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The shapes one operation allocated on its way to an answer. Holding them here
 * and releasing them together is what keeps OpenCascade's arena from filling up
 * with wires and probe handles nobody will look at again.
 */
class Scratch {
  readonly #occt: OcctKernel
  readonly #held: OcctShape[] = []

  constructor(occt: OcctKernel) {
    this.#occt = occt
  }

  hold(shape: OcctShape): OcctShape {
    this.#held.push(shape)
    return shape
  }

  holdAll(shapes: OcctShape[]): OcctShape[] {
    for (const shape of shapes) this.#held.push(shape)
    return shapes
  }

  release(): void {
    // Newest first, so a shape is never released before something built from it.
    for (let index = this.#held.length - 1; index >= 0; index -= 1) {
      try {
        this.#occt.release(this.#held[index] as OcctShape)
      } catch {
        // Already released, or never reached the arena.
      }
    }
    this.#held.length = 0
  }
}

/** Union-find over rim edge positions, for splitting a rim into its loops. */
class Groups {
  readonly #parent: number[]

  constructor(size: number) {
    this.#parent = Array.from({ length: size }, (_, index) => index)
  }

  rootOf(index: number): number {
    let root = index
    while ((this.#parent[root] as number) !== root) root = this.#parent[root] as number
    return root
  }

  join(a: number, b: number): void {
    const rootA = this.rootOf(a)
    const rootB = this.rootOf(b)
    if (rootA !== rootB) this.#parent[rootA] = rootB
  }
}

interface TopologyIndex {
  readonly faces: Map<string, OcctShape>
  readonly edges: Map<string, OcctShape>
  readonly vertices: Map<string, OcctShape>
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                            */
/* -------------------------------------------------------------------------- */

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 }

/** A sketch plane with its axes normalised and its normal worked out. */
interface Basis {
  readonly origin: Vec3
  readonly xAxis: Vec3
  readonly yAxis: Vec3
  readonly normal: Vec3
}

function basisOf(plane: PlaneFrame, operation: string): Basis {
  const xAxis = unit(plane.xAxis, 'Plane axes must be non-zero', operation)
  const yAxis = unit(plane.yAxis, 'Plane axes must be non-zero', operation)
  const normal = cross(xAxis, yAxis)
  if (magnitude(normal) <= POINT_TOLERANCE) {
    throw new KernelError('Plane axes must not be parallel', operation)
  }
  return { origin: plane.origin, xAxis, yAxis, normal: normalize(normal) }
}

function pointOn(frame: Basis, u: number, v: number): Vec3 {
  return add(frame.origin, add(scale(frame.xAxis, u), scale(frame.yAxis, v)))
}

/**
 * The 3×4 row-major matrix that carries the world axes onto `frame` — the layout
 * OpenCascade's `transform` expects, with the basis vectors as columns.
 */
function placement(frame: Basis): number[] {
  const { xAxis: x, yAxis: y, normal: n, origin: o } = frame
  return [x.x, y.x, n.x, o.x, x.y, y.y, n.y, o.y, x.z, y.z, n.z, o.z]
}

/** Drops a repeated closing point and consecutive duplicates from a sketch loop. */
function cleanLoop(points: readonly Vec2[], operation: string): Vec2[] {
  const loop: Vec2[] = []
  for (const point of points) {
    const previous = loop[loop.length - 1]
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) <= POINT_TOLERANCE) {
      continue
    }
    loop.push(point)
  }
  const first = loop[0]
  const last = loop[loop.length - 1]
  if (first && last && loop.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) <= POINT_TOLERANCE) {
    loop.pop()
  }
  if (loop.length < 3) {
    throw new KernelError(`${operation} profile needs at least three points`, operation)
  }
  return loop
}

function dedupe(path: readonly Vec3[]): Vec3[] {
  const result: Vec3[] = []
  for (const point of path) {
    const previous = result[result.length - 1]
    if (previous && magnitude(subtract(point, previous)) <= POINT_TOLERANCE) continue
    result.push(point)
  }
  return result
}

/** Evenly spaced points along a polyline, `count` of them, ends included. */
function resample(path: readonly Vec3[], count: number): Vec3[] {
  const spans: number[] = [0]
  for (let index = 1; index < path.length; index += 1) {
    spans.push(
      (spans[index - 1] as number) + magnitude(subtract(path[index] as Vec3, path[index - 1] as Vec3)),
    )
  }
  const total = spans[spans.length - 1] as number
  if (total === 0) return Array.from({ length: count }, () => path[0] as Vec3)

  const result: Vec3[] = []
  let cursor = 1
  for (let index = 0; index < count; index += 1) {
    const target = (index / (count - 1)) * total
    while (cursor < spans.length - 1 && (spans[cursor] as number) < target) cursor += 1
    const start = spans[cursor - 1] as number
    const span = (spans[cursor] as number) - start
    const t = span === 0 ? 0 : (target - start) / span
    const from = path[cursor - 1] as Vec3
    const to = path[cursor] as Vec3
    result.push(add(from, scale(subtract(to, from), t)))
  }
  return result
}

function tangentsOf(path: readonly Vec3[]): Vec3[] {
  return path.map((point, index) => {
    const before = path[Math.max(0, index - 1)] as Vec3
    const after = path[Math.min(path.length - 1, index + 1)] as Vec3
    const tangent = subtract(after, before)
    return normalize(magnitude(tangent) > POINT_TOLERANCE ? tangent : subtract(point, before))
  })
}

/** Rotation that takes `from` onto `to`, as a function on vectors. */
function alignment(from: Vec3, to: Vec3): (vector: Vec3) => Vec3 {
  const axis = cross(from, to)
  if (magnitude(axis) <= POINT_TOLERANCE) {
    // Parallel needs nothing; antiparallel is a half turn about any perpendicular.
    if (dot(from, to) > 0) return (vector) => vector
    const fallback = Math.abs(from.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
    return about(normalize(subtract(fallback, scale(from, dot(fallback, from)))), Math.PI)
  }
  return about(normalize(axis), Math.acos(clamp(dot(normalize(from), normalize(to)), -1, 1)))
}

/** Rotation about `axis` by `radians`, as a function on vectors (Rodrigues). */
function about(axis: Vec3, radians: number): (vector: Vec3) => Vec3 {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return (vector) =>
    add(
      add(scale(vector, cos), scale(cross(axis, vector), sin)),
      scale(axis, dot(axis, vector) * (1 - cos)),
    )
}

function vertexOf(mesh: MeshData, index: number): Vec3 {
  return {
    x: mesh.positions[index * 3] ?? 0,
    y: mesh.positions[index * 3 + 1] ?? 0,
    z: mesh.positions[index * 3 + 2] ?? 0,
  }
}

function unit(vector: Vec3, complaint: string, operation: string): Vec3 {
  if (magnitude(vector) <= POINT_TOLERANCE) {
    throw new KernelError(complaint, operation)
  }
  return normalize(vector)
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function scale(vector: Vec3, factor: number): Vec3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function magnitude(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z)
}

function normalize(vector: Vec3): Vec3 {
  const length = magnitude(vector)
  return length === 0 ? vector : scale(vector, 1 / length)
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** Rounded before comparing, so equivalent constructions sort the same way. */
function compareNumbers(a: number, b: number): number {
  const left = Math.round(a * 1e9)
  const right = Math.round(b * 1e9)
  return left === right ? 0 : left < right ? -1 : 1
}

function comparePoints(a: Vec3, b: Vec3): number {
  return compareNumbers(a.x, b.x) || compareNumbers(a.y, b.y) || compareNumbers(a.z, b.z)
}

/**
 * Turns an OpenCascade failure into a {@link KernelError}. The WASM build's own
 * messages read `[object WebAssembly.Exception]`, so what survives is the
 * structured error code and the operation that raised it.
 */
function asKernelError(cause: unknown, operation: string): KernelError {
  if (cause instanceof KernelError) return cause

  const detail = cause as { code?: unknown; operation?: unknown; message?: unknown }
  const where = typeof detail.operation === 'string' ? detail.operation : operation
  const code = typeof detail.code === 'string' ? ` (${detail.code})` : ''
  const message = typeof detail.message === 'string' ? detail.message : String(cause)
  const readable = message.includes('WebAssembly.Exception') ? '' : `: ${message}`
  return new KernelError(`OpenCascade could not complete ${where}${code}${readable}`, operation)
}
