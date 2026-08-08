import * as THREE from 'three'
import type { MeshData } from '../domain/MeshData'
import { csgIntersect, csgSubtract, csgUnion } from './csg'
import type {
  BoundingBox,
  BoxParams,
  ChamferParams,
  DeleteFaceParams,
  DraftParams,
  ExtrudeParams,
  FilletParams,
  HoleParams,
  IKernel,
  LoftParams,
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
  Vec2,
  Vec3,
} from './IKernel'
import type { KernelCapability } from './IKernel'
import { KernelError, UnsupportedOperationError, WORLD_XY } from './IKernel'
import type { TopologyFace } from './topology'
import { faceVertexIds, facesById, meshTopology } from './topology'

const DEG = Math.PI / 180

/** Facet counts chosen to keep the stub responsive rather than accurate. */
const REVOLVE_SEGMENTS_PER_TURN = 48
const LOFT_MIN_RING_POINTS = 8
const LOFT_MAX_RING_POINTS = 256

/**
 * Placeholder kernel backed by three.js BufferGeometry plus a mesh-level CSG
 * backend. It covers every M2 feature operation well enough to model and view
 * real parts, but it is a tessellation engine, not a B-Rep one: results are
 * faceted, edges and faces have no stable identity, and fillet/chamfer are
 * recorded rather than evaluated. The WASM kernel replaces it wholesale.
 */
export class StubKernel implements IKernel {
  // Typed as the interface declares it rather than as the literal, so a
  // subclass can stand in for another backend without widening it here.
  readonly name: string = 'stub'

  /**
   * Everything a mesh engine can honestly do. Fillet and chamfer are absent
   * because rounding or bevelling an edge needs B-Rep topology; asking for
   * either throws {@link UnsupportedOperationError} rather than handing back the
   * solid untouched.
   */
  readonly capabilities: readonly KernelCapability[] = [
    'shell',
    'draft',
    'hole',
    'split',
    'directEdit',
  ]

  #shapes = new Map<string, THREE.BufferGeometry>()
  #nextId = 0

  async init(): Promise<void> {
    // Nothing to load — the stub is ready immediately.
  }

  async createBox(params: BoxParams): Promise<ShapeHandle> {
    const { width, height, depth, center } = params
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new KernelError('Box dimensions must be positive', 'createBox')
    }
    const geometry = new THREE.BoxGeometry(width, height, depth)
    if (center) {
      geometry.translate(center.x, center.y, center.z)
    }
    return this.#register(geometry)
  }

  async createFromMesh(mesh: MeshData): Promise<ShapeHandle> {
    if (mesh.indices.length < 3 || mesh.positions.length < 9) {
      throw new KernelError('A mesh needs at least one triangle', 'createFromMesh')
    }
    if (mesh.indices.length % 3 !== 0) {
      throw new KernelError('Mesh indices must come in triples', 'createFromMesh')
    }
    // Winding and normals are taken as given: this is how imported geometry and
    // surface bodies enter, and neither is guaranteed to bound a closed volume.
    return this.#register(toBufferGeometry(mesh))
  }

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

    const outline = loopPoints(profile.points, 'extrude')
    if (!(distance > 0)) {
      throw new KernelError('Extrude distance must be positive', 'extrude')
    }

    const shape = new THREE.Shape(outline)
    for (const hole of profile.holes ?? []) {
      shape.holes.push(new THREE.Path(loopPoints(hole, 'extrude')))
    }

    // The sweep always runs along local +Z; `back` is how far it starts below
    // the sketch plane so symmetric and two-sided extrusions land correctly.
    const back =
      side === 'symmetric' ? distance / 2 : side === 'two-sided' ? Math.max(0, secondDistance) : 0
    const front = side === 'symmetric' ? distance / 2 : distance
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: front + back,
      bevelEnabled: false,
      curveSegments: 16,
    })
    geometry.translate(0, 0, -back)

    if (draftAngle !== 0) {
      applyRadialTaper(geometry, centroidOf(outline), draftAngle)
    }

    const frame = plane ?? WORLD_XY
    geometry.applyMatrix4(frameMatrix(frame, 'extrude'))

    if (direction) {
      const target = new THREE.Vector3(direction.x, direction.y, direction.z)
      if (target.lengthSq() === 0) {
        throw new KernelError('Extrude direction must be non-zero', 'extrude')
      }
      rotateAbout(geometry, frame.origin, frameNormal(frame, 'extrude'), target.normalize())
    }

    return this.#register(finish(geometry))
  }

  async revolve(params: RevolveParams): Promise<ShapeHandle> {
    const { profile, axis, angle, plane, symmetric = false } = params
    const outline = loopPoints(profile.points, 'revolve')
    if (!(Math.abs(angle) > 0)) {
      throw new KernelError('Revolve angle must be non-zero', 'revolve')
    }

    const direction = new THREE.Vector2(axis.direction.x, axis.direction.y)
    if (direction.lengthSq() === 0) {
      throw new KernelError('Revolve axis direction must be non-zero', 'revolve')
    }
    direction.normalize()

    // Re-express the profile as (distance from the axis, distance along it).
    const section = outline.map((point) => {
      const dx = point.x - axis.origin.x
      const dy = point.y - axis.origin.y
      return new THREE.Vector2(
        direction.x * dy - direction.y * dx,
        direction.x * dx + direction.y * dy,
      )
    })
    if (Math.max(...section.map((p) => p.x)) <= 0) {
      for (const p of section) p.x = -p.x
    }
    // A profile straddling the axis is folded onto it — an honest approximation
    // of geometry a real kernel would reject outright.
    for (const p of section) p.x = Math.max(0, p.x)
    if (Math.max(...section.map((p) => p.x)) <= 0) {
      throw new KernelError('Revolve profile lies on the axis', 'revolve')
    }

    const sweep = Math.max(-360, Math.min(360, angle)) * DEG
    const start = symmetric ? -sweep / 2 : 0
    const closed = Math.abs(Math.abs(angle) - 360) < 1e-9
    const segments = Math.max(8, Math.round((Math.abs(angle) / 360) * REVOLVE_SEGMENTS_PER_TURN))
    const ringCount = closed ? segments : segments + 1

    const frame = plane ?? WORLD_XY
    const xAxis = unit(frame.xAxis, 'revolve')
    const yAxis = unit(frame.yAxis, 'revolve')
    const normal = frameNormal(frame, 'revolve')
    const along = xAxis.clone().multiplyScalar(direction.x).addScaledVector(yAxis, direction.y)
    const radial = xAxis.clone().multiplyScalar(-direction.y).addScaledVector(yAxis, direction.x)
    const base = new THREE.Vector3(frame.origin.x, frame.origin.y, frame.origin.z)
      .addScaledVector(xAxis, axis.origin.x)
      .addScaledVector(yAxis, axis.origin.y)

    const rings: THREE.Vector3[][] = []
    for (let index = 0; index < ringCount; index += 1) {
      const phi = start + (index / segments) * sweep
      const cos = Math.cos(phi)
      const sin = Math.sin(phi)
      rings.push(
        section.map((p) =>
          base
            .clone()
            .addScaledVector(radial, p.x * cos)
            .addScaledVector(normal, p.x * sin)
            .addScaledVector(along, p.y),
        ),
      )
    }

    return this.#register(
      buildSweptSolid(rings, closed, closed ? undefined : { start: section, end: section }),
    )
  }

  async sweep(params: SweepParams): Promise<ShapeHandle> {
    const { profile, path, plane, orientation = 'follow-path', twistAngle = 0 } = params
    const outline = loopPoints(profile.points, 'sweep')
    const spine = dedupePath(path)
    if (spine.length < 2) {
      throw new KernelError('Sweep path needs at least two distinct points', 'sweep')
    }

    const frame = plane ?? WORLD_XY
    const xAxis = unit(frame.xAxis, 'sweep')
    const yAxis = unit(frame.yAxis, 'sweep')
    const tangents = pathTangents(spine)

    // Parallel transport keeps the section from spinning as the path bends.
    let u = xAxis.clone()
    let v = yAxis.clone()
    if (orientation === 'follow-path') {
      const first = tangents[0] as THREE.Vector3
      u = perpendicularTo(first, xAxis)
      v = new THREE.Vector3().crossVectors(first, u).normalize()
    }

    const rings: THREE.Vector3[][] = []
    for (let index = 0; index < spine.length; index += 1) {
      if (orientation === 'follow-path' && index > 0) {
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          tangents[index - 1] as THREE.Vector3,
          tangents[index] as THREE.Vector3,
        )
        u = u.clone().applyQuaternion(rotation).normalize()
        v = v.clone().applyQuaternion(rotation).normalize()
      }

      const twist = (twistAngle * DEG * index) / Math.max(1, spine.length - 1)
      const spun = new THREE.Quaternion().setFromAxisAngle(tangents[index] as THREE.Vector3, twist)
      const ringU = u.clone().applyQuaternion(spun)
      const ringV = v.clone().applyQuaternion(spun)
      const origin = spine[index] as THREE.Vector3

      rings.push(
        outline.map((p) => origin.clone().addScaledVector(ringU, p.x).addScaledVector(ringV, p.y)),
      )
    }

    return this.#register(buildSweptSolid(rings, false, { start: outline, end: outline }))
  }

  async loft(params: LoftParams): Promise<ShapeHandle> {
    const { sections, closed = false } = params
    if (sections.length < 2) {
      throw new KernelError('Loft needs at least two sections', 'loft')
    }

    const outlines = sections.map((section) => loopPoints(section.profile.points, 'loft'))
    const ringSize = clamp(
      Math.max(...outlines.map((outline) => outline.length)),
      LOFT_MIN_RING_POINTS,
      LOFT_MAX_RING_POINTS,
    )
    const resampled = outlines.map((outline) => resampleLoop(outline, ringSize))

    const rings: THREE.Vector3[][] = sections.map((section, index) => {
      const matrix = frameMatrix(section.plane ?? WORLD_XY, 'loft')
      return (resampled[index] as THREE.Vector2[]).map((p) =>
        new THREE.Vector3(p.x, p.y, 0).applyMatrix4(matrix),
      )
    })

    // Roll each ring so its seam sits nearest the previous one; otherwise the
    // side walls corkscrew between sections.
    for (let index = 1; index < rings.length; index += 1) {
      const offset = bestSeamOffset(
        rings[index - 1] as THREE.Vector3[],
        rings[index] as THREE.Vector3[],
      )
      if (offset !== 0) {
        rings[index] = rotateArray(rings[index] as THREE.Vector3[], offset)
        resampled[index] = rotateArray(resampled[index] as THREE.Vector2[], offset)
      }
    }

    const caps = closed
      ? undefined
      : {
          start: resampled[0] as THREE.Vector2[],
          end: resampled[resampled.length - 1] as THREE.Vector2[],
        }
    return this.#register(buildSweptSolid(rings, closed, caps))
  }

  async booleanUnion(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle> {
    return this.#boolean(a, b, csgUnion, 'booleanUnion')
  }

  async booleanSubtract(target: ShapeHandle, tool: ShapeHandle): Promise<ShapeHandle> {
    return this.#boolean(target, tool, csgSubtract, 'booleanSubtract')
  }

  async booleanIntersect(a: ShapeHandle, b: ShapeHandle): Promise<ShapeHandle> {
    return this.#boolean(a, b, csgIntersect, 'booleanIntersect')
  }

  /**
   * Not available here.
   *
   * Rounding an edge means replacing it with a surface tangent to both faces and
   * trimming those faces back to meet it — which needs the B-Rep topology the
   * stub has not got. This used to return the solid unchanged, so a fillet that
   * had not happened was reported as one that had; refusing is the honest answer,
   * and {@link IKernel.capabilities} says so before anyone asks.
   */
  async fillet(shape: ShapeHandle, params: FilletParams): Promise<ShapeHandle> {
    // Validated first, so a nonsensical radius still reads as the user's mistake
    // rather than as the backend's limitation.
    if (!(params.radius > 0)) {
      throw new KernelError('Fillet radius must be positive', 'fillet')
    }
    this.#require(shape, 'fillet')
    throw new UnsupportedOperationError(this.name, 'fillet')
  }

  /** Not available here — see {@link StubKernel.fillet}. */
  async chamfer(shape: ShapeHandle, params: ChamferParams): Promise<ShapeHandle> {
    if (!(params.distance > 0)) {
      throw new KernelError('Chamfer distance must be positive', 'chamfer')
    }
    if (params.angle !== undefined && (params.angle <= 0 || params.angle >= 90)) {
      throw new KernelError('Chamfer angle must be between 0 and 90 degrees', 'chamfer')
    }
    this.#require(shape, 'chamfer')
    throw new UnsupportedOperationError(this.name, 'chamfer')
  }

  /**
   * Hollows the solid by subtracting a shrunken copy of itself. A real shell
   * offsets every face; this scales about the bounding-box centre, so the wall
   * thickness is only nominal on anything but a boxy solid.
   *
   * Open faces are cut by the plane of the face that was actually named, taken
   * from the same {@link meshTopology} derivation that handed the id out — so
   * opening a side of a box opens *that* side.
   */
  async shell(shape: ShapeHandle, params: ShellParams): Promise<ShapeHandle> {
    const geometry = this.#require(shape, 'shell')
    if (!(params.thickness > 0)) {
      throw new KernelError('Shell thickness must be positive', 'shell')
    }

    const box = boundsOf(geometry)
    const size = new THREE.Vector3().subVectors(box.max, box.min)
    const center = new THREE.Vector3().addVectors(box.min, box.max).multiplyScalar(0.5)
    const factors = new THREE.Vector3(
      (size.x - 2 * params.thickness) / size.x,
      (size.y - 2 * params.thickness) / size.y,
      (size.z - 2 * params.thickness) / size.z,
    )
    if (factors.x <= 0 || factors.y <= 0 || factors.z <= 0) {
      throw new KernelError('Shell thickness exceeds the solid', 'shell')
    }

    const cavity = geometry.clone()
    cavity.translate(-center.x, -center.y, -center.z)
    cavity.scale(factors.x, factors.y, factors.z)
    cavity.translate(center.x, center.y, center.z)

    let result = csgSubtract(toMeshData(geometry), toMeshData(cavity))
    cavity.dispose()

    const openFaceIds = params.openFaceIds ?? []
    if (openFaceIds.length > 0) {
      const solid = toMeshData(geometry)
      const faces = facesById(meshTopology(solid), openFaceIds)
      if (faces.length === 0) {
        throw new KernelError(
          `None of the faces this shell opens (${openFaceIds.join(', ')}) belong to the solid`,
          'shell',
        )
      }
      // A slab straddling each named face's own plane, wide enough to cover the
      // solid: subtracting it takes the wall off that face and nothing else.
      const span = Math.max(size.x, size.y, size.z) * 2 + params.thickness * 4
      for (const face of faces) {
        const lid = new THREE.BoxGeometry(span, span, params.thickness * 2)
        lid.applyMatrix4(slabMatrix(face.normal, face.offset))
        result = csgSubtract(result, toMeshData(lid))
        lid.dispose()
      }
    }

    return this.#register(finish(toBufferGeometry(result)))
  }

  async hole(shape: ShapeHandle, params: HoleParams): Promise<ShapeHandle> {
    const geometry = this.#require(shape, 'hole')
    const { center, diameter, depth, kind = 'simple', headDiameter, headDepth } = params
    if (!(diameter > 0)) throw new KernelError('Hole diameter must be positive', 'hole')
    if (!(depth > 0)) throw new KernelError('Hole depth must be positive', 'hole')

    const direction = new THREE.Vector3(
      params.direction?.x ?? 0,
      params.direction?.y ?? 0,
      params.direction?.z ?? -1,
    )
    if (direction.lengthSq() === 0) {
      throw new KernelError('Hole direction must be non-zero', 'hole')
    }
    direction.normalize()

    const origin = new THREE.Vector3(center.x, center.y, center.z)
    // Overshoot both ends so no cut face lands coplanar with the solid's own.
    const overshoot = depth * 1e-3 + 1e-2
    let tool = toMeshData(
      cylinderAlong(diameter / 2, depth + 2 * overshoot, origin, direction, -overshoot),
    )

    if (kind !== 'simple') {
      const headRadius = Math.max(diameter / 2, (headDiameter ?? diameter * 2) / 2)
      const sink = Math.max(1e-3, headDepth ?? diameter / 2)
      const head =
        kind === 'counterbore'
          ? cylinderAlong(headRadius, sink + overshoot, origin, direction, -overshoot)
          : coneAlong(headRadius, diameter / 2, sink + overshoot, origin, direction, -overshoot)
      tool = csgUnion(tool, toMeshData(head))
      head.dispose()
    }

    const result = csgSubtract(toMeshData(geometry), tool)
    if (result.indices.length === 0) {
      throw new KernelError('Hole removed the whole solid', 'hole')
    }
    return this.#register(finish(toBufferGeometry(result)))
  }

  /**
   * Tapers the solid about a neutral plane, by pushing each vertex outwards in
   * proportion to how far along the pull direction it sits.
   *
   * `faceIds` narrows that to the vertices the named faces are built from, so
   * drafting one wall of a box leaves the other three upright. An empty list
   * drafts the whole shape, as the interface says; a list naming nothing that
   * belongs to the solid is a stale selection and throws, because tapering
   * everything instead would answer a request nobody made and call it done.
   */
  async draft(shape: ShapeHandle, params: DraftParams): Promise<ShapeHandle> {
    const geometry = this.#require(shape, 'draft').clone()
    const { angle, neutralOffset = 0 } = params
    if (Math.abs(angle) >= 90) {
      throw new KernelError('Draft angle must be less than 90 degrees', 'draft')
    }

    const pull = new THREE.Vector3(
      params.pullDirection?.x ?? 0,
      params.pullDirection?.y ?? 0,
      params.pullDirection?.z ?? 1,
    )
    if (pull.lengthSq() === 0) {
      throw new KernelError('Draft pull direction must be non-zero', 'draft')
    }
    pull.normalize()

    // Welded ids rather than buffer positions: a corner shared by a drafted and
    // an undrafted face appears under several vertex numbers, and moving only
    // some of them would tear the mesh open along that seam.
    const faceIds = params.faceIds ?? []
    let drafted: Set<string> | null = null
    let vertexIdOf: readonly string[] = []
    if (faceIds.length > 0) {
      const derived = meshTopology(toMeshData(geometry))
      drafted = faceVertexIds(derived, faceIds)
      if (drafted.size === 0) {
        throw new KernelError(
          `None of the faces this draft names (${faceIds.join(', ')}) belong to the solid`,
          'draft',
        )
      }
      vertexIdOf = derived.vertexIdOf
    }

    const box = boundsOf(geometry)
    const center = new THREE.Vector3().addVectors(box.min, box.max).multiplyScalar(0.5)
    // Neutral plane: `neutralOffset` above the lowest point along the pull.
    const neutral =
      Math.min(box.min.dot(pull), box.max.dot(pull)) + neutralOffset - center.dot(pull)

    const position = geometry.getAttribute('position')
    const taper = Math.tan(angle * DEG)
    const point = new THREE.Vector3()
    const offset = new THREE.Vector3()

    for (let index = 0; index < position.count; index += 1) {
      if (drafted && !drafted.has(vertexIdOf[index] as string)) continue
      point.fromBufferAttribute(position, index).sub(center)
      const axial = point.dot(pull)
      offset.copy(point).addScaledVector(pull, -axial)
      if (offset.lengthSq() === 0) continue
      offset.normalize().multiplyScalar((axial - neutral) * taper)
      point.add(offset).add(center)
      position.setXYZ(index, point.x, point.y, point.z)
    }
    position.needsUpdate = true

    return this.#register(finish(geometry))
  }

  /**
   * Cuts the solid with a plane by intersecting it with a half-space large
   * enough to swallow it. The pieces come back in `keep` order: front first,
   * where "front" is the side the plane normal points at.
   */
  async split(shape: ShapeHandle, params: SplitParams): Promise<ShapeHandle[]> {
    const geometry = this.#require(shape, 'split')
    const { keep = 'both' } = params
    const normal = frameNormal(params.plane, 'split')
    const origin = new THREE.Vector3(
      params.plane.origin.x,
      params.plane.origin.y,
      params.plane.origin.z,
    )

    const box = boundsOf(geometry)
    const reach = new THREE.Vector3().subVectors(box.max, box.min).length() + 1
    const solid = toMeshData(geometry)

    const wanted: ('front' | 'back')[] = keep === 'both' ? ['front', 'back'] : [keep]
    const pieces: ShapeHandle[] = []

    for (const side of wanted) {
      const direction = side === 'front' ? normal : normal.clone().negate()
      const half = new THREE.BoxGeometry(reach * 2, reach * 2, reach * 2)
      half.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction),
      )
      const center = origin.clone().addScaledVector(direction, reach)
      half.translate(center.x, center.y, center.z)

      const result = csgIntersect(solid, toMeshData(half))
      half.dispose()
      // A plane outside the solid leaves one side empty, which is a legitimate
      // answer — the caller simply gets fewer pieces back than it asked for.
      if (result.indices.length > 0) {
        pieces.push(this.#register(finish(toBufferGeometry(result))))
      }
    }

    if (pieces.length === 0) {
      throw new KernelError('The split plane produced no solid', 'split')
    }
    return pieces
  }

  async topology(shape: ShapeHandle): Promise<Topology> {
    const derived = meshTopology(toMeshData(this.#require(shape, 'topology')))
    return {
      faceIds: derived.faces.map((face) => face.id),
      edgeIds: derived.edges.map((edge) => edge.id),
      vertexIds: derived.vertices.map((vertex) => vertex.id),
    }
  }

  async moveFace(shape: ShapeHandle, params: MoveFaceParams): Promise<ShapeHandle> {
    const direction = new THREE.Vector3(
      params.direction.x,
      params.direction.y,
      params.direction.z,
    )
    if (direction.lengthSq() === 0) {
      throw new KernelError('Move face direction must be non-zero', 'moveFace')
    }
    direction.normalize().multiplyScalar(params.distance)

    return this.#dragFaces(shape, params.faceIds, 'moveFace', () => direction)
  }

  async offsetFace(shape: ShapeHandle, params: OffsetFaceParams): Promise<ShapeHandle> {
    return this.#dragFaces(
      shape,
      params.faceIds,
      'offsetFace',
      (face) =>
        new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z).multiplyScalar(
          params.distance,
        ),
    )
  }

  /**
   * Drops the named faces and closes the hole they leave with a fan over each
   * boundary loop. Real healing extends the neighbouring surfaces instead; this
   * caps flat, which is right for the planar openings the stub deals in.
   */
  async deleteFace(shape: ShapeHandle, params: DeleteFaceParams): Promise<ShapeHandle> {
    const mesh = toMeshData(this.#require(shape, 'deleteFace'))
    const derived = meshTopology(mesh)
    const doomed = facesById(derived, params.faceIds)
    if (doomed.length === 0) {
      throw new KernelError('None of those faces belong to this solid', 'deleteFace')
    }

    const removed = new Set(doomed.flatMap((face) => face.triangles))
    const kept: number[] = []
    for (let start = 0; start + 2 < mesh.indices.length; start += 3) {
      if (removed.has(start)) continue
      kept.push(
        mesh.indices[start] as number,
        mesh.indices[start + 1] as number,
        mesh.indices[start + 2] as number,
      )
    }
    if (kept.length === 0) {
      throw new KernelError('Deleting those faces would remove the whole solid', 'deleteFace')
    }

    const positions = [...mesh.positions]
    for (const loop of boundaryLoops(kept, positions)) {
      kept.push(...capLoop(loop, positions))
    }

    return this.#register(finish(toBufferGeometry({ positions, normals: [], indices: kept })))
  }

  /** Shared body of {@link moveFace} and {@link offsetFace}. */
  async #dragFaces(
    shape: ShapeHandle,
    faceIds: readonly string[],
    operation: string,
    offsetOf: (face: TopologyFace) => THREE.Vector3,
  ): Promise<ShapeHandle> {
    if (faceIds.length === 0) {
      throw new KernelError(`${operation} needs at least one face`, operation)
    }

    const geometry = this.#require(shape, operation).clone()
    const mesh = toMeshData(geometry)
    const derived = meshTopology(mesh)
    const faces = facesById(derived, faceIds)
    if (faces.length === 0) {
      throw new KernelError('None of those faces belong to this solid', operation)
    }

    // A vertex shared by several selected faces takes every offset, so a corner
    // dragged from two sides ends up where both faces agree it should be.
    const offsets = new Map<string, THREE.Vector3>()
    for (const face of faces) {
      const offset = offsetOf(face)
      for (const vertexId of face.vertexIds) {
        const running = offsets.get(vertexId)
        if (running) running.add(offset)
        else offsets.set(vertexId, offset.clone())
      }
    }

    const position = geometry.getAttribute('position')
    for (let index = 0; index < position.count; index += 1) {
      const offset = offsets.get(derived.vertexIdOf[index] as string)
      if (!offset) continue
      position.setXYZ(
        index,
        position.getX(index) + offset.x,
        position.getY(index) + offset.y,
        position.getZ(index) + offset.z,
      )
    }
    position.needsUpdate = true

    return this.#register(finish(geometry))
  }

  async transform(shape: ShapeHandle, params: TransformParams): Promise<ShapeHandle> {
    const geometry = this.#require(shape, 'transform').clone()
    geometry.applyMatrix4(transformMatrix(params))
    return this.#register(finish(geometry))
  }

  async mirror(shape: ShapeHandle, plane: PlaneFrame): Promise<ShapeHandle> {
    const geometry = this.#require(shape, 'mirror').clone()
    const normal = frameNormal(plane, 'mirror')
    const offset = normal.dot(new THREE.Vector3(plane.origin.x, plane.origin.y, plane.origin.z))
    const { x: nx, y: ny, z: nz } = normal

    // Householder reflection about the plane, written out in full.
    geometry.applyMatrix4(
      new THREE.Matrix4().set(
        1 - 2 * nx * nx,
        -2 * nx * ny,
        -2 * nx * nz,
        2 * offset * nx,
        -2 * ny * nx,
        1 - 2 * ny * ny,
        -2 * ny * nz,
        2 * offset * ny,
        -2 * nz * nx,
        -2 * nz * ny,
        1 - 2 * nz * nz,
        2 * offset * nz,
        0,
        0,
        0,
        1,
      ),
    )
    return this.#register(finish(geometry))
  }

  async copy(shape: ShapeHandle): Promise<ShapeHandle> {
    return this.#register(this.#require(shape, 'copy').clone())
  }

  async boundingBox(shape: ShapeHandle): Promise<BoundingBox> {
    const box = boundsOf(this.#require(shape, 'boundingBox'))
    return {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    }
  }

  async triangulate(shape: ShapeHandle, _params?: TessellationParams): Promise<MeshData> {
    // The stub's geometry is already tessellated, so deflection settings are moot.
    return toMeshData(this.#require(shape, 'triangulate'))
  }

  dispose(shape: ShapeHandle): void {
    const geometry = this.#shapes.get(shape.id)
    if (geometry) {
      geometry.dispose()
      this.#shapes.delete(shape.id)
    }
  }

  async #boolean(
    a: ShapeHandle,
    b: ShapeHandle,
    operation: (left: MeshData, right: MeshData) => MeshData,
    name: string,
  ): Promise<ShapeHandle> {
    const left = toMeshData(this.#require(a, name))
    const right = toMeshData(this.#require(b, name))

    let result: MeshData
    try {
      result = operation(left, right)
    } catch (cause) {
      throw new KernelError((cause as Error).message, name)
    }
    if (result.indices.length === 0) {
      throw new KernelError(`${name} produced an empty solid`, name)
    }
    return this.#register(finish(toBufferGeometry(result)))
  }

  #require(shape: ShapeHandle, operation: string): THREE.BufferGeometry {
    const geometry = this.#shapes.get(shape.id)
    if (!geometry) {
      throw new KernelError(`Unknown shape: ${shape.id}`, operation)
    }
    return geometry
  }

  #register(geometry: THREE.BufferGeometry): ShapeHandle {
    const id = `stub-shape-${this.#nextId++}`
    this.#shapes.set(id, geometry)
    return { id }
  }
}

/* -------------------------------------------------------------------------- */
/* Mesh conversion                                                             */
/* -------------------------------------------------------------------------- */

/** Flattens a three.js geometry into the renderer-agnostic mesh representation. */
export function toMeshData(geometry: THREE.BufferGeometry): MeshData {
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals()
  }

  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const index = geometry.index

  const positions = Array.from(position.array as ArrayLike<number>)
  const normals = normal ? Array.from(normal.array as ArrayLike<number>) : []
  const indices = index
    ? Array.from(index.array as ArrayLike<number>)
    : Array.from({ length: position.count }, (_, i) => i)

  return { positions, normals, indices }
}

/** Rebuilds a three.js geometry from mesh data so the viewport can render it. */
export function toBufferGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3))
  if (mesh.normals.length > 0) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3))
  }
  geometry.setIndex(mesh.indices)
  if (mesh.normals.length === 0) {
    geometry.computeVertexNormals()
  }
  return geometry
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Drops a repeated closing point and rejects loops too small to bound an area. */
function loopPoints(points: readonly Vec2[], operation: string): THREE.Vector2[] {
  const loop = points.map((p) => new THREE.Vector2(p.x, p.y))
  const first = loop[0]
  const last = loop[loop.length - 1]
  if (first && last && loop.length > 1 && first.distanceToSquared(last) < 1e-18) {
    loop.pop()
  }
  if (loop.length < 3) {
    throw new KernelError(`${operation} profile needs at least three points`, operation)
  }
  return loop
}

function unit(vector: Vec3, operation: string): THREE.Vector3 {
  const result = new THREE.Vector3(vector.x, vector.y, vector.z)
  if (result.lengthSq() === 0) {
    throw new KernelError('Plane axes must be non-zero', operation)
  }
  return result.normalize()
}

function frameNormal(plane: PlaneFrame, operation: string): THREE.Vector3 {
  const normal = new THREE.Vector3().crossVectors(
    unit(plane.xAxis, operation),
    unit(plane.yAxis, operation),
  )
  if (normal.lengthSq() === 0) {
    throw new KernelError('Plane axes must not be parallel', operation)
  }
  return normal.normalize()
}

function frameMatrix(plane: PlaneFrame, operation: string): THREE.Matrix4 {
  const matrix = new THREE.Matrix4().makeBasis(
    unit(plane.xAxis, operation),
    unit(plane.yAxis, operation),
    frameNormal(plane, operation),
  )
  matrix.setPosition(plane.origin.x, plane.origin.y, plane.origin.z)
  return matrix
}

function rotateAbout(
  geometry: THREE.BufferGeometry,
  origin: Vec3,
  from: THREE.Vector3,
  to: THREE.Vector3,
): void {
  const rotation = new THREE.Quaternion().setFromUnitVectors(from, to)
  geometry.translate(-origin.x, -origin.y, -origin.z)
  geometry.applyQuaternion(rotation)
  geometry.translate(origin.x, origin.y, origin.z)
}

function centroidOf(points: readonly THREE.Vector2[]): THREE.Vector2 {
  const sum = new THREE.Vector2(0, 0)
  for (const point of points) sum.add(point)
  return sum.divideScalar(points.length)
}

/**
 * Pushes vertices away from `centroid` in proportion to their height above the
 * sketch plane — the stub's stand-in for a true draft along an extrusion.
 */
function applyRadialTaper(
  geometry: THREE.BufferGeometry,
  centroid: THREE.Vector2,
  angleDegrees: number,
): void {
  const taper = Math.tan(angleDegrees * DEG)
  const position = geometry.getAttribute('position')
  const radial = new THREE.Vector2()

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    radial.set(x - centroid.x, y - centroid.y)
    if (radial.lengthSq() === 0) continue
    radial.normalize().multiplyScalar(z * taper)
    position.setXY(index, x + radial.x, y + radial.y)
  }
  position.needsUpdate = true
}

/** Recomputes normals and makes sure the solid's triangles face outwards. */
function finish(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (signedVolume(geometry) < 0) {
    flipWinding(geometry)
  }
  geometry.deleteAttribute('normal')
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  return geometry
}

function signedVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position')
  const index = geometry.index
  const count = index ? index.count : position.count
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const bc = new THREE.Vector3()
  let total = 0

  for (let i = 0; i + 2 < count; i += 3) {
    a.fromBufferAttribute(position, index ? index.getX(i) : i)
    b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1)
    c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2)
    total += a.dot(bc.crossVectors(b, c))
  }
  return total / 6
}

function flipWinding(geometry: THREE.BufferGeometry): void {
  const index = geometry.index
  if (index) {
    for (let i = 0; i + 2 < index.count; i += 3) {
      const swap = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, swap)
    }
    index.needsUpdate = true
    return
  }

  const position = geometry.getAttribute('position')
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i + 1)
    b.fromBufferAttribute(position, i + 2)
    position.setXYZ(i + 1, b.x, b.y, b.z)
    position.setXYZ(i + 2, a.x, a.y, a.z)
  }
  position.needsUpdate = true
}

/**
 * The open rims of a triangle soup, as chains of directed sides. A side that no
 * triangle walks back along is on the boundary; following those sides from end
 * to end traces each hole exactly once.
 */
function boundaryLoops(indices: readonly number[], positions: readonly number[]): number[][] {
  const weldOf = weldMap(positions)
  const sides = new Map<string, [number, number]>()

  for (let start = 0; start + 2 < indices.length; start += 3) {
    for (let corner = 0; corner < 3; corner += 1) {
      const from = indices[start + corner] as number
      const to = indices[start + ((corner + 1) % 3)] as number
      if (weldOf[from] === weldOf[to]) continue
      sides.set(`${weldOf[from]}:${weldOf[to]}`, [from, to])
    }
  }

  const open = new Map<number, [number, number]>()
  for (const [key, side] of sides) {
    const [from, to] = key.split(':')
    if (sides.has(`${to}:${from}`)) continue
    open.set(weldOf[side[0]] as number, side)
  }

  const loops: number[][] = []
  const walked = new Set<number>()

  for (const seed of open.keys()) {
    if (walked.has(seed)) continue

    const loop: number[] = []
    let cursor: number | undefined = seed
    while (cursor !== undefined && !walked.has(cursor)) {
      const side = open.get(cursor)
      if (!side) break
      walked.add(cursor)
      loop.push(side[0])
      cursor = weldOf[side[1]] as number
    }
    if (loop.length >= 3) loops.push(loop)
  }

  return loops
}

/** Fans a boundary loop into triangles about a new centroid vertex. */
function capLoop(loop: readonly number[], positions: number[]): number[] {
  const centroid = new THREE.Vector3()
  for (const index of loop) {
    centroid.add(
      new THREE.Vector3(
        positions[index * 3] as number,
        positions[index * 3 + 1] as number,
        positions[index * 3 + 2] as number,
      ),
    )
  }
  centroid.divideScalar(loop.length)

  const apex = positions.length / 3
  positions.push(centroid.x, centroid.y, centroid.z)

  // Reversed against the rim: the boundary runs the way the *surviving* faces
  // walk it, and the cap has to close the mesh, not repeat that direction.
  const triangles: number[] = []
  for (let index = 0; index < loop.length; index += 1) {
    const from = loop[index] as number
    const to = loop[(index + 1) % loop.length] as number
    triangles.push(apex, to, from)
  }
  return triangles
}

/** Vertex number to welded ordinal, so duplicated corners compare equal. */
function weldMap(positions: readonly number[]): number[] {
  const ordinals = new Map<string, number>()
  const result: number[] = []

  for (let index = 0; index < positions.length / 3; index += 1) {
    const key = [0, 1, 2]
      .map((axis) => Math.round((positions[index * 3 + axis] as number) * 1e6))
      .join(':')
    let ordinal = ordinals.get(key)
    if (ordinal === undefined) {
      ordinal = ordinals.size
      ordinals.set(key, ordinal)
    }
    result.push(ordinal)
  }
  return result
}

function boundsOf(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox()
  return geometry.boundingBox ?? new THREE.Box3()
}

/**
 * Places a slab — a box built flat in local XY — so that its middle sits on the
 * plane `dot(normal, p) = offset`, with its thickness straddling that plane.
 *
 * Straddling rather than sitting behind it is deliberate: a shell's outer wall
 * lies exactly on the face, so a slab that only reached inwards would leave a
 * paper-thin skin over the opening it was meant to cut.
 */
function slabMatrix(normal: Vec3, offset: number): THREE.Matrix4 {
  const axis = new THREE.Vector3(normal.x, normal.y, normal.z).normalize()
  const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis),
  )
  return new THREE.Matrix4()
    .makeTranslation(axis.x * offset, axis.y * offset, axis.z * offset)
    .multiply(rotation)
}

/**
 * Stitches a ladder of equal-sized rings into a closed solid. Every swept
 * operation in the stub — revolve, sweep and loft — reduces to this.
 *
 * Walls and caps are wound independently and then oriented against the geometry
 * itself, because the handedness of a sketch frame, the sign of a revolve angle
 * and the direction a user drew a profile in can each flip the answer.
 */
function buildSweptSolid(
  rings: readonly THREE.Vector3[][],
  closedLoop: boolean,
  caps?: { start: readonly THREE.Vector2[]; end: readonly THREE.Vector2[] },
): THREE.BufferGeometry {
  const ringSize = (rings[0] as THREE.Vector3[]).length
  const points: THREE.Vector3[] = rings.flat()
  const indices: number[] = []

  const walls: number[] = []
  const spans = closedLoop ? rings.length : rings.length - 1
  for (let span = 0; span < spans; span += 1) {
    const a = span * ringSize
    const b = ((span + 1) % rings.length) * ringSize
    for (let j = 0; j < ringSize; j += 1) {
      const next = (j + 1) % ringSize
      walls.push(a + j, a + next, b + next)
      walls.push(a + j, b + next, b + j)
    }
  }
  // Walls should point away from the spine; if they average inwards, flip them.
  const perSpan = 6 * ringSize
  orientTriangles(walls, points, (centroid, offset) =>
    centroid.clone().sub(ringCentroid(rings, Math.floor(offset / perSpan), ringSize)),
  )
  indices.push(...walls)

  if (caps) {
    const advance = new THREE.Vector3().subVectors(
      ringCentroid(rings, rings.length - 1, ringSize),
      ringCentroid(rings, 0, ringSize),
    )
    const last = (rings.length - 1) * ringSize

    const start = THREE.ShapeUtils.triangulateShape([...caps.start], []).flat() as number[]
    orientTriangles(start, points, () => advance.clone().negate())
    indices.push(...start)

    const end = (THREE.ShapeUtils.triangulateShape([...caps.end], []).flat() as number[]).map(
      (index) => last + index,
    )
    orientTriangles(end, points, () => advance)
    indices.push(...end)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      points.flatMap((point) => [point.x, point.y, point.z]),
      3,
    ),
  )
  geometry.setIndex(indices)
  return finish(geometry)
}

function ringCentroid(
  rings: readonly THREE.Vector3[][],
  index: number,
  ringSize: number,
): THREE.Vector3 {
  const ring = rings[index] as THREE.Vector3[]
  const sum = new THREE.Vector3()
  for (const point of ring) sum.add(point)
  return sum.divideScalar(ringSize)
}

/**
 * Reverses `triangles` in place when their normals, on aggregate, disagree with
 * the outward direction `outward` reports for each triangle.
 */
function orientTriangles(
  triangles: number[],
  points: readonly THREE.Vector3[],
  outward: (centroid: THREE.Vector3, offset: number) => THREE.Vector3,
): void {
  const edge1 = new THREE.Vector3()
  const edge2 = new THREE.Vector3()
  const normal = new THREE.Vector3()
  let score = 0

  for (let i = 0; i + 2 < triangles.length; i += 3) {
    const a = points[triangles[i] as number] as THREE.Vector3
    const b = points[triangles[i + 1] as number] as THREE.Vector3
    const c = points[triangles[i + 2] as number] as THREE.Vector3
    normal.crossVectors(edge1.subVectors(b, a), edge2.subVectors(c, a))
    const centroid = a.clone().add(b).add(c).divideScalar(3)
    score += normal.dot(outward(centroid, i))
  }

  if (score >= 0) return
  for (let i = 0; i + 2 < triangles.length; i += 3) {
    const swap = triangles[i + 1] as number
    triangles[i + 1] = triangles[i + 2] as number
    triangles[i + 2] = swap
  }
}

function dedupePath(path: readonly Vec3[]): THREE.Vector3[] {
  const result: THREE.Vector3[] = []
  for (const point of path) {
    const candidate = new THREE.Vector3(point.x, point.y, point.z)
    const previous = result[result.length - 1]
    if (previous && previous.distanceToSquared(candidate) < 1e-18) continue
    result.push(candidate)
  }
  return result
}

function pathTangents(path: readonly THREE.Vector3[]): THREE.Vector3[] {
  return path.map((point, index) => {
    const before = path[Math.max(0, index - 1)] as THREE.Vector3
    const after = path[Math.min(path.length - 1, index + 1)] as THREE.Vector3
    const tangent = new THREE.Vector3().subVectors(after, before)
    if (tangent.lengthSq() === 0) tangent.subVectors(point, before)
    return tangent.normalize()
  })
}

/** A unit vector perpendicular to `axis`, biased towards `preferred`. */
function perpendicularTo(axis: THREE.Vector3, preferred: THREE.Vector3): THREE.Vector3 {
  const candidate = preferred.clone().addScaledVector(axis, -preferred.dot(axis))
  if (candidate.lengthSq() > 1e-12) return candidate.normalize()
  const fallback = Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  return fallback.addScaledVector(axis, -fallback.dot(axis)).normalize()
}

/** Even arc-length resampling of a closed loop to exactly `count` points. */
function resampleLoop(loop: readonly THREE.Vector2[], count: number): THREE.Vector2[] {
  const closed = [...loop, loop[0] as THREE.Vector2]
  const lengths: number[] = [0]
  for (let index = 1; index < closed.length; index += 1) {
    const step = (closed[index] as THREE.Vector2).distanceTo(closed[index - 1] as THREE.Vector2)
    lengths.push((lengths[index - 1] as number) + step)
  }
  const total = lengths[lengths.length - 1] as number
  if (total === 0) {
    return Array.from({ length: count }, () => (loop[0] as THREE.Vector2).clone())
  }

  const result: THREE.Vector2[] = []
  let cursor = 1
  for (let index = 0; index < count; index += 1) {
    const target = (index / count) * total
    while (cursor < lengths.length - 1 && (lengths[cursor] as number) < target) cursor += 1
    const previous = lengths[cursor - 1] as number
    const span = (lengths[cursor] as number) - previous
    const t = span === 0 ? 0 : (target - previous) / span
    result.push(
      (closed[cursor - 1] as THREE.Vector2).clone().lerp(closed[cursor] as THREE.Vector2, t),
    )
  }
  return result
}

/** Index shift that best lines two rings up, minimising loft corkscrew. */
function bestSeamOffset(
  reference: readonly THREE.Vector3[],
  ring: readonly THREE.Vector3[],
): number {
  const anchor = reference[0] as THREE.Vector3
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let offset = 0; offset < ring.length; offset += 1) {
    const distance = anchor.distanceToSquared(ring[offset] as THREE.Vector3)
    if (distance < bestDistance) {
      bestDistance = distance
      best = offset
    }
  }
  return best
}

function rotateArray<T>(items: readonly T[], offset: number): T[] {
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

function transformMatrix(params: TransformParams): THREE.Matrix4 {
  const matrix = new THREE.Matrix4()

  if (params.scale !== undefined) {
    const scale =
      typeof params.scale === 'number'
        ? { x: params.scale, y: params.scale, z: params.scale }
        : params.scale
    if (scale.x === 0 || scale.y === 0 || scale.z === 0) {
      throw new KernelError('Scale factors must be non-zero', 'transform')
    }
    matrix.premultiply(about(params.scaleOrigin, new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z)))
  }

  if (params.rotate) {
    const axis = new THREE.Vector3(params.rotate.axis.x, params.rotate.axis.y, params.rotate.axis.z)
    if (axis.lengthSq() === 0) {
      throw new KernelError('Rotation axis must be non-zero', 'transform')
    }
    matrix.premultiply(
      about(
        params.rotate.origin,
        new THREE.Matrix4().makeRotationAxis(axis.normalize(), params.rotate.angle * DEG),
      ),
    )
  }

  if (params.translate) {
    matrix.premultiply(
      new THREE.Matrix4().makeTranslation(
        params.translate.x,
        params.translate.y,
        params.translate.z,
      ),
    )
  }

  return matrix
}

/** Conjugates `matrix` so it acts about `origin` instead of the world origin. */
function about(origin: Vec3 | undefined, matrix: THREE.Matrix4): THREE.Matrix4 {
  if (!origin) return matrix
  return new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z))
}

/** Cylinder whose axis starts `offset` along `direction` from `origin`. */
function cylinderAlong(
  radius: number,
  height: number,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  offset: number,
): THREE.BufferGeometry {
  return placeAlong(new THREE.CylinderGeometry(radius, radius, height, 32), height, origin, direction, offset)
}

/** Truncated cone, wide end first — the countersink tool. */
function coneAlong(
  topRadius: number,
  bottomRadius: number,
  height: number,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  offset: number,
): THREE.BufferGeometry {
  return placeAlong(
    new THREE.CylinderGeometry(topRadius, bottomRadius, height, 32),
    height,
    origin,
    direction,
    offset,
  )
}

function placeAlong(
  geometry: THREE.BufferGeometry,
  height: number,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  offset: number,
): THREE.BufferGeometry {
  // three.js builds these about +Y, centred on the origin; shift them so the
  // solid starts at the origin and runs along +Y before being aimed.
  geometry.translate(0, height / 2, 0)
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
  )
  const start = origin.clone().addScaledVector(direction, offset)
  geometry.translate(start.x, start.y, start.z)
  return geometry
}
