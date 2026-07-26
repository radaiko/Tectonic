import type { BoundingBox, Vec3 } from '../kernel/IKernel'
import type { MeshData } from '../domain/MeshData'
import type { ComponentTransform } from './Transform'
import { applyTransform, transformDirection } from './Transform'

/** An empty box, so an unbuilt component still has something to compare. */
export const EMPTY_BOX: BoundingBox = {
  min: { x: 0, y: 0, z: 0 },
  max: { x: 0, y: 0, z: 0 },
}

/** The axis-aligned extent of a set of points. */
export function boundsOfPoints(points: readonly Vec3[]): BoundingBox {
  if (points.length === 0) return EMPTY_BOX
  const first = points[0] as Vec3
  let minX = first.x
  let minY = first.y
  let minZ = first.z
  let maxX = first.x
  let maxY = first.y
  let maxZ = first.z

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    minZ = Math.min(minZ, point.z)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
    maxZ = Math.max(maxZ, point.z)
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } }
}

export function boundsOfMesh(mesh: MeshData): BoundingBox {
  const points: Vec3[] = []
  for (let index = 0; index + 2 < mesh.positions.length; index += 3) {
    points.push({
      x: mesh.positions[index] as number,
      y: mesh.positions[index + 1] as number,
      z: mesh.positions[index + 2] as number,
    })
  }
  return boundsOfPoints(points)
}

export function boxCorners(box: BoundingBox): Vec3[] {
  const { min, max } = box
  return [
    { x: min.x, y: min.y, z: min.z },
    { x: max.x, y: min.y, z: min.z },
    { x: min.x, y: max.y, z: min.z },
    { x: max.x, y: max.y, z: min.z },
    { x: min.x, y: min.y, z: max.z },
    { x: max.x, y: min.y, z: max.z },
    { x: min.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
  ]
}

/**
 * The extent of a placed box. A rotated box no longer lines up with the axes,
 * so the result is the extent of its eight corners — never smaller than the
 * true solid, which is what makes it safe as an interference pre-filter.
 */
export function transformBounds(box: BoundingBox, transform: ComponentTransform): BoundingBox {
  return boundsOfPoints(boxCorners(box).map((corner) => applyTransform(transform, corner)))
}

export function boxCenter(box: BoundingBox): Vec3 {
  return {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  }
}

export function boxVolume(box: BoundingBox): number {
  const width = Math.max(0, box.max.x - box.min.x)
  const height = Math.max(0, box.max.y - box.min.y)
  const depth = Math.max(0, box.max.z - box.min.z)
  return width * height * depth
}

/** The overlap of two boxes, or null when they do not meet. */
export function intersectBoxes(a: BoundingBox, b: BoundingBox): BoundingBox | null {
  const min = {
    x: Math.max(a.min.x, b.min.x),
    y: Math.max(a.min.y, b.min.y),
    z: Math.max(a.min.z, b.min.z),
  }
  const max = {
    x: Math.min(a.max.x, b.max.x),
    y: Math.min(a.max.y, b.max.y),
    z: Math.min(a.max.z, b.max.z),
  }
  if (max.x <= min.x || max.y <= min.y || max.z <= min.z) return null
  return { min, max }
}

export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return intersectBoxes(a, b) !== null
}

/** The union of two boxes. */
export function unionBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  }
}

/**
 * A copy of a mesh placed by a transform. Assemblies show one tessellation of
 * a part in many places, so the instance geometry is made here rather than
 * asking the kernel to rebuild the same solid over and over.
 */
export function transformMesh(mesh: MeshData, transform: ComponentTransform): MeshData {
  const positions: number[] = new Array(mesh.positions.length)
  const normals: number[] = new Array(mesh.normals.length)

  for (let index = 0; index + 2 < mesh.positions.length; index += 3) {
    const point = applyTransform(transform, {
      x: mesh.positions[index] as number,
      y: mesh.positions[index + 1] as number,
      z: mesh.positions[index + 2] as number,
    })
    positions[index] = point.x
    positions[index + 1] = point.y
    positions[index + 2] = point.z
  }

  for (let index = 0; index + 2 < mesh.normals.length; index += 3) {
    const direction = transformDirection(transform, {
      x: mesh.normals[index] as number,
      y: mesh.normals[index + 1] as number,
      z: mesh.normals[index + 2] as number,
    })
    normals[index] = direction.x
    normals[index + 1] = direction.y
    normals[index + 2] = direction.z
  }

  return { positions, normals, indices: [...mesh.indices] }
}
