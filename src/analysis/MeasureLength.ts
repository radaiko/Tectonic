import type { MeshData } from '../domain/MeshData'
import type { Vec3 } from '../domain/vec3'
import { distance, normalize, subtract } from '../domain/vec3'
import { meshTriangles } from './primitives'
import type { EdgeTarget } from './types'

export interface LengthMeasurement {
  readonly length: number
  readonly direction: Vec3
  readonly midpoint: Vec3
}

/** Length of a straight edge, with the direction and midpoint a label needs. */
export function measureLength(edge: EdgeTarget): LengthMeasurement {
  return {
    length: distance(edge.start, edge.end),
    direction: normalize(subtract(edge.end, edge.start)),
    midpoint: {
      x: (edge.start.x + edge.end.x) / 2,
      y: (edge.start.y + edge.end.y) / 2,
      z: (edge.start.z + edge.end.z) / 2,
    },
  }
}

/** Total length of a chain of points — a tessellated curve, or a sketch loop. */
export function measurePolylineLength(points: readonly Vec3[], closed = false): number {
  if (points.length < 2) return 0
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1] as Vec3, points[index] as Vec3)
  }
  if (closed) total += distance(points[points.length - 1] as Vec3, points[0] as Vec3)
  return total
}

/**
 * Total length of the mesh's edges, counting a shared edge once. Reported as
 * "wire length" in the analysis panel and used as a rough complexity measure.
 */
export function measureEdgeLength(mesh: MeshData): number {
  const seen = new Set<string>()
  let total = 0

  for (const triangle of meshTriangles(mesh)) {
    for (const [from, to] of [
      [triangle.a, triangle.b],
      [triangle.b, triangle.c],
      [triangle.c, triangle.a],
    ] as const) {
      const key = edgeKey(from, to)
      if (seen.has(key)) continue
      seen.add(key)
      total += distance(from, to)
    }
  }
  return total
}

/** Order-independent key for an edge, rounded so coincident vertices agree. */
function edgeKey(from: Vec3, to: Vec3): string {
  const first = pointKey(from)
  const second = pointKey(to)
  return first < second ? `${first}|${second}` : `${second}|${first}`
}

function pointKey(point: Vec3): string {
  return `${round(point.x)},${round(point.y)},${round(point.z)}`
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
