import * as THREE from 'three'
import type { MeshData } from '../domain/MeshData'
import type {
  BoxParams,
  ChamferParams,
  ExtrudeParams,
  FilletParams,
  IKernel,
  ShapeHandle,
  TessellationParams,
} from './IKernel'
import { KernelError } from './IKernel'

/**
 * Placeholder kernel backed by three.js BufferGeometry. It covers just enough to
 * put a shape on screen during M0; boolean, fillet and chamfer operations need
 * real B-Rep topology and are rejected until the WASM kernel lands.
 */
export class StubKernel implements IKernel {
  readonly name = 'stub'

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

  async extrude(params: ExtrudeParams): Promise<ShapeHandle> {
    const { profile, distance, direction } = params
    if (profile.points.length < 3) {
      throw new KernelError('Extrude profile needs at least three points', 'extrude')
    }
    if (distance <= 0) {
      throw new KernelError('Extrude distance must be positive', 'extrude')
    }

    const shape = new THREE.Shape(profile.points.map((p) => new THREE.Vector2(p.x, p.y)))
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false })

    // ExtrudeGeometry always sweeps along +Z; rotate the result when the caller
    // asked for a different direction.
    if (direction) {
      const target = new THREE.Vector3(direction.x, direction.y, direction.z)
      if (target.lengthSq() === 0) {
        throw new KernelError('Extrude direction must be non-zero', 'extrude')
      }
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        target.normalize(),
      )
      geometry.applyQuaternion(rotation)
    }

    return this.#register(geometry)
  }

  async booleanUnion(_a: ShapeHandle, _b: ShapeHandle): Promise<ShapeHandle> {
    throw new KernelError('Boolean union requires the WASM kernel', 'booleanUnion')
  }

  async booleanSubtract(_target: ShapeHandle, _tool: ShapeHandle): Promise<ShapeHandle> {
    throw new KernelError('Boolean subtract requires the WASM kernel', 'booleanSubtract')
  }

  async booleanIntersect(_a: ShapeHandle, _b: ShapeHandle): Promise<ShapeHandle> {
    throw new KernelError('Boolean intersect requires the WASM kernel', 'booleanIntersect')
  }

  async fillet(_shape: ShapeHandle, _params: FilletParams): Promise<ShapeHandle> {
    throw new KernelError('Fillet requires the WASM kernel', 'fillet')
  }

  async chamfer(_shape: ShapeHandle, _params: ChamferParams): Promise<ShapeHandle> {
    throw new KernelError('Chamfer requires the WASM kernel', 'chamfer')
  }

  async triangulate(shape: ShapeHandle, _params?: TessellationParams): Promise<MeshData> {
    // The stub's geometry is already tessellated, so deflection settings are moot.
    const geometry = this.#shapes.get(shape.id)
    if (!geometry) {
      throw new KernelError(`Unknown shape: ${shape.id}`, 'triangulate')
    }
    return toMeshData(geometry)
  }

  dispose(shape: ShapeHandle): void {
    const geometry = this.#shapes.get(shape.id)
    if (geometry) {
      geometry.dispose()
      this.#shapes.delete(shape.id)
    }
  }

  #register(geometry: THREE.BufferGeometry): ShapeHandle {
    const id = `stub-shape-${this.#nextId++}`
    this.#shapes.set(id, geometry)
    return { id }
  }
}

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
