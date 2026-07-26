import type { MeshData } from '../domain/MeshData'
import { meshBounds } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { scale } from '../domain/vec3'
import { measureSurfaceArea } from './MeasureArea'
import { signedTetrahedronVolume6, signedVolume } from './MeasureVolume'
import { meshTriangles } from './primitives'
import type { Triangle } from './types'

/** A symmetric 3×3 tensor, in row-major order. */
export type Matrix3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
]

export interface MassPropertiesOptions {
  /** Mass per unit volume, in the document's units. Defaults to 1. */
  readonly density?: number
}

export interface MassProperties {
  readonly volume: number
  readonly density: number
  readonly mass: number
  readonly surfaceArea: number
  readonly centroid: Vec3
  /** Inertia tensor about the centroid, in the world axes. */
  readonly inertia: Matrix3
  /** Inertia tensor about the world origin. */
  readonly inertiaAboutOrigin: Matrix3
  /** Principal moments, ascending, with the axes they belong to. */
  readonly principalMoments: readonly [number, number, number]
  readonly principalAxes: readonly [Vec3, Vec3, Vec3]
  /** Radius of gyration about each principal axis. */
  readonly radiiOfGyration: readonly [number, number, number]
}

/** Density of the material a body is made of, for the mass column. */
export const DEFAULT_DENSITY = 1

/**
 * Volume, centre of mass and inertia of a closed mesh.
 *
 * The solid is decomposed into tetrahedra between each triangle and the origin.
 * Each contributes a signed covariance, which sums exactly — the outside
 * contributions of a closed surface cancel — and the inertia tensor follows
 * from the covariance as `trace(C)·I − C`.
 */
export function massProperties(
  mesh: MeshData,
  options: MassPropertiesOptions = {},
): MassProperties {
  const density = options.density ?? DEFAULT_DENSITY
  const triangles = meshTriangles(mesh)
  const volume = signedVolume(mesh)
  const surfaceArea = measureSurfaceArea(mesh)

  if (Math.abs(volume) < 1e-15) {
    // Open or degenerate geometry: report what can still be measured honestly
    // rather than dividing by a zero volume.
    const bounds = meshBounds(mesh)
    return {
      volume: 0,
      density,
      mass: 0,
      surfaceArea,
      centroid: scale({ x: bounds.min.x + bounds.max.x, y: bounds.min.y + bounds.max.y, z: bounds.min.z + bounds.max.z }, 0.5),
      inertia: ZERO_MATRIX,
      inertiaAboutOrigin: ZERO_MATRIX,
      principalMoments: [0, 0, 0],
      principalAxes: [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
      ],
      radiiOfGyration: [0, 0, 0],
    }
  }

  let weightedCentroid: Vec3 = { x: 0, y: 0, z: 0 }
  let covariance = ZERO_MATRIX

  for (const triangle of triangles) {
    const determinant = signedTetrahedronVolume6(triangle)
    if (determinant === 0) continue
    const tetraVolume = determinant / 6
    // Centroid of the tetrahedron with the origin as its fourth vertex.
    weightedCentroid = addVec(
      weightedCentroid,
      scale(centerOfTetrahedron(triangle), tetraVolume),
    )
    covariance = addMatrix(covariance, scaleMatrix(canonicalCovariance(triangle), determinant))
  }

  // The centroid divides by the signed volume, so the winding cancels out; the
  // covariance has to be flipped explicitly for an inward-wound mesh or the
  // inertia would come back negative.
  const centroid = scale(weightedCentroid, 1 / volume)
  const absoluteVolume = Math.abs(volume)
  const outward = volume < 0 ? scaleMatrix(covariance, -1) : covariance

  const inertiaOrigin = inertiaFromCovariance(outward)
  // Parallel axis theorem, applied to the covariance rather than the inertia so
  // both tensors come from the same accumulation.
  const shifted = subtractMatrix(
    outward,
    scaleMatrix(outerProduct(centroid, centroid), absoluteVolume),
  )
  const inertia = inertiaFromCovariance(shifted)

  const { values, vectors } = symmetricEigen(inertia)
  const mass = absoluteVolume * density

  return {
    volume: absoluteVolume,
    density,
    mass,
    surfaceArea,
    centroid,
    inertia: scaleMatrix(inertia, density),
    inertiaAboutOrigin: scaleMatrix(inertiaOrigin, density),
    principalMoments: [
      values[0] * density,
      values[1] * density,
      values[2] * density,
    ] as const,
    principalAxes: vectors,
    radiiOfGyration: [
      radiusOfGyration(values[0] * density, mass),
      radiusOfGyration(values[1] * density, mass),
      radiusOfGyration(values[2] * density, mass),
    ] as const,
  }
}

const ZERO_MATRIX: Matrix3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]

/** Canonical covariance of the unit tetrahedron, mapped onto a triangle. */
const CANONICAL: Matrix3 = [2, 1, 1, 1, 2, 1, 1, 1, 2].map((value) => value / 120) as unknown as Matrix3

function canonicalCovariance(triangle: Triangle): Matrix3 {
  // A has the tetrahedron's three edge vectors as rows; C = Aᵀ · Ccanon · A.
  const a = [
    [triangle.a.x, triangle.a.y, triangle.a.z],
    [triangle.b.x, triangle.b.y, triangle.b.z],
    [triangle.c.x, triangle.c.y, triangle.c.z],
  ]

  const result = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let sum = 0
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          sum +=
            (CANONICAL[i * 3 + j] as number) *
            (a[i]?.[row] as number) *
            (a[j]?.[column] as number)
        }
      }
      result[row * 3 + column] = sum
    }
  }
  return result as unknown as Matrix3
}

function centerOfTetrahedron(triangle: Triangle): Vec3 {
  return {
    x: (triangle.a.x + triangle.b.x + triangle.c.x) / 4,
    y: (triangle.a.y + triangle.b.y + triangle.c.y) / 4,
    z: (triangle.a.z + triangle.b.z + triangle.c.z) / 4,
  }
}

function inertiaFromCovariance(covariance: Matrix3): Matrix3 {
  const trace = (covariance[0] as number) + (covariance[4] as number) + (covariance[8] as number)
  const result = covariance.map((value, index) => (index % 4 === 0 ? trace - value : -value))
  return result as unknown as Matrix3
}

function outerProduct(a: Vec3, b: Vec3): Matrix3 {
  return [
    a.x * b.x, a.x * b.y, a.x * b.z,
    a.y * b.x, a.y * b.y, a.y * b.z,
    a.z * b.x, a.z * b.y, a.z * b.z,
  ]
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function addMatrix(a: Matrix3, b: Matrix3): Matrix3 {
  return a.map((value, index) => value + (b[index] as number)) as unknown as Matrix3
}

export function subtractMatrix(a: Matrix3, b: Matrix3): Matrix3 {
  return a.map((value, index) => value - (b[index] as number)) as unknown as Matrix3
}

export function scaleMatrix(matrix: Matrix3, factor: number): Matrix3 {
  return matrix.map((value) => value * factor) as unknown as Matrix3
}

function radiusOfGyration(moment: number, mass: number): number {
  return mass <= 0 ? 0 : Math.sqrt(Math.max(0, moment) / mass)
}

export interface EigenDecomposition {
  /** Eigenvalues in ascending order. */
  readonly values: readonly [number, number, number]
  /** Unit eigenvectors, parallel to `values`. */
  readonly vectors: readonly [Vec3, Vec3, Vec3]
}

/**
 * Eigen-decomposition of a symmetric 3×3 matrix by cyclic Jacobi rotations.
 * Converges in a handful of sweeps for tensors of this size, and unlike the
 * closed-form solution it stays stable when two moments are nearly equal.
 */
export function symmetricEigen(matrix: Matrix3, sweeps = 24): EigenDecomposition {
  const a = [...matrix] as number[]
  const v = [1, 0, 0, 0, 1, 0, 0, 0, 1]

  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    let off = 0
    for (const [p, q] of OFF_DIAGONAL) off += Math.abs(a[p * 3 + q] as number)
    if (off < 1e-14) break

    for (const [p, q] of OFF_DIAGONAL) {
      const apq = a[p * 3 + q] as number
      if (Math.abs(apq) < 1e-18) continue
      const app = a[p * 3 + p] as number
      const aqq = a[q * 3 + q] as number
      const theta = (aqq - app) / (2 * apq)
      const sign = theta >= 0 ? 1 : -1
      const t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
      const cos = 1 / Math.sqrt(t * t + 1)
      const sin = t * cos

      for (let k = 0; k < 3; k += 1) {
        const akp = a[k * 3 + p] as number
        const akq = a[k * 3 + q] as number
        a[k * 3 + p] = cos * akp - sin * akq
        a[k * 3 + q] = sin * akp + cos * akq
      }
      for (let k = 0; k < 3; k += 1) {
        const apk = a[p * 3 + k] as number
        const aqk = a[q * 3 + k] as number
        a[p * 3 + k] = cos * apk - sin * aqk
        a[q * 3 + k] = sin * apk + cos * aqk
      }
      for (let k = 0; k < 3; k += 1) {
        const vkp = v[k * 3 + p] as number
        const vkq = v[k * 3 + q] as number
        v[k * 3 + p] = cos * vkp - sin * vkq
        v[k * 3 + q] = sin * vkp + cos * vkq
      }
    }
  }

  const columns = [0, 1, 2].map((column) => ({
    value: a[column * 3 + column] as number,
    vector: {
      x: v[column] as number,
      y: v[3 + column] as number,
      z: v[6 + column] as number,
    },
  }))
  columns.sort((first, second) => first.value - second.value)

  return {
    values: [
      columns[0]?.value as number,
      columns[1]?.value as number,
      columns[2]?.value as number,
    ] as const,
    vectors: [
      columns[0]?.vector as Vec3,
      columns[1]?.vector as Vec3,
      columns[2]?.vector as Vec3,
    ] as const,
  }
}

const OFF_DIAGONAL: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [1, 2],
]
