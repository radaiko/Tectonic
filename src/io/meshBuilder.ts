import type { MeshData } from '../domain/MeshData'
import { recomputeNormals } from '../domain/MeshData'

/**
 * Assembles a mesh from loose triangles, the shape every mesh importer produces.
 * Coincident corners are welded so an imported STL behaves like modelled
 * geometry rather than a bag of disconnected facets.
 */

export const DEFAULT_WELD_TOLERANCE = 1e-6

export class MeshBuilder {
  readonly #positions: number[] = []
  readonly #indices: number[] = []
  readonly #lookup = new Map<string, number>()
  readonly #tolerance: number
  readonly #weld: boolean

  constructor(options: { tolerance?: number; weld?: boolean } = {}) {
    this.#tolerance = options.tolerance ?? DEFAULT_WELD_TOLERANCE
    this.#weld = options.weld ?? true
  }

  /** Adds a vertex and returns its index, reusing an existing one when welding. */
  addVertex(x: number, y: number, z: number): number {
    if (!this.#weld) {
      this.#positions.push(x, y, z)
      return this.#positions.length / 3 - 1
    }

    const key = `${this.#quantize(x)},${this.#quantize(y)},${this.#quantize(z)}`
    const existing = this.#lookup.get(key)
    if (existing !== undefined) return existing

    this.#positions.push(x, y, z)
    const index = this.#positions.length / 3 - 1
    this.#lookup.set(key, index)
    return index
  }

  addTriangle(
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    c: readonly [number, number, number],
  ): void {
    const ia = this.addVertex(a[0], a[1], a[2])
    const ib = this.addVertex(b[0], b[1], b[2])
    const ic = this.addVertex(c[0], c[1], c[2])
    // A welded facet can collapse to a line; such a triangle has no area to draw.
    if (ia === ib || ib === ic || ia === ic) return
    this.#indices.push(ia, ib, ic)
  }

  get triangleCount(): number {
    return this.#indices.length / 3
  }

  get vertexCount(): number {
    return this.#positions.length / 3
  }

  /** The finished mesh, with normals derived from the winding. */
  build(): MeshData {
    return recomputeNormals({
      positions: this.#positions,
      normals: [],
      indices: this.#indices,
    })
  }

  #quantize(value: number): number {
    const snapped = Math.round(value / this.#tolerance) * this.#tolerance
    // Keeps -0 and 0 in the same bucket.
    return snapped === 0 ? 0 : snapped
  }
}
