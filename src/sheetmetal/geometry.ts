import type { PlaneFrame, Vec3 } from '../kernel/IKernel'
import { frameNormal, toWorld } from '../features/geometry/plane'
import type { Vec2 } from '../sketch/domain/geometry'
import { signedArea } from './bend'
import type { SheetEdge } from './types'
import { SheetMetalError } from './types'

const WELD_TOLERANCE = 1e-9

/** A closed loop with duplicate points dropped and a counter-clockwise winding. */
export function normalizeLoop(loop: readonly Vec2[]): Vec2[] {
  const welded: Vec2[] = []
  for (const point of loop) {
    const previous = welded[welded.length - 1]
    if (previous && near(previous, point)) continue
    welded.push({ x: point.x, y: point.y })
  }
  const first = welded[0]
  const last = welded[welded.length - 1]
  if (welded.length > 1 && first && last && near(first, last)) welded.pop()

  if (welded.length < 3) throw new SheetMetalError('A sheet metal face needs at least three corners')
  return signedArea(welded) >= 0 ? welded : welded.reverse()
}

/**
 * The edges of a face, numbered the way a feature names them. The normal of
 * each edge points out of the face, which is the direction a flange on it
 * grows before it is bent.
 */
export function loopEdges(loop: readonly Vec2[]): SheetEdge[] {
  const points = normalizeLoop(loop)
  return points.map((start, index) => {
    const end = points[(index + 1) % points.length] as Vec2
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    return {
      index,
      start,
      end,
      direction: { x: dx / length, y: dy / length },
      // Right-hand normal of a counter-clockwise loop points outwards.
      normal: { x: dy / length, y: -dx / length },
      length,
    }
  })
}

export function requireEdge(edges: readonly SheetEdge[], index: number): SheetEdge {
  const edge = edges[index]
  if (!edge) throw new SheetMetalError(`This face has no edge ${index}`)
  return edge
}

/**
 * The frame a feature attached to `edge` is built in: x runs out of the face,
 * y across the sheet's thickness, and the frame normal runs back along the
 * edge — so an extrusion of the edge's length starting at its far end sweeps
 * exactly the material the feature occupies.
 */
export function edgeFrame(
  edge: SheetEdge,
  sketch: PlaneFrame,
  trimStart = 0,
  trimEnd = 0,
): { readonly frame: PlaneFrame; readonly distance: number } {
  const distance = edge.length - trimStart - trimEnd
  if (!(distance > 0)) {
    throw new SheetMetalError('The mitres on this edge leave no material to bend')
  }

  const origin2d = {
    x: edge.end.x - edge.direction.x * trimEnd,
    y: edge.end.y - edge.direction.y * trimEnd,
  }
  const normal = frameNormal(sketch)
  return {
    frame: {
      origin: toWorld(sketch, origin2d),
      xAxis: planeDirection(sketch, edge.normal),
      yAxis: normal,
    },
    distance,
  }
}

/** Lifts a direction in the sketch plane's 2D space into world space. */
export function planeDirection(sketch: PlaneFrame, direction: Vec2): Vec3 {
  return {
    x: sketch.xAxis.x * direction.x + sketch.yAxis.x * direction.y,
    y: sketch.xAxis.y * direction.x + sketch.yAxis.y * direction.y,
    z: sketch.xAxis.z * direction.x + sketch.yAxis.z * direction.y,
  }
}

/** Lengths of each segment of an open polyline, in order. */
export function segmentLengths(points: readonly Vec2[]): number[] {
  const lengths: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as Vec2
    const current = points[index] as Vec2
    lengths.push(Math.hypot(current.x - previous.x, current.y - previous.y))
  }
  return lengths
}

/**
 * Signed turn, in degrees, at each interior vertex of an open polyline.
 * Positive turns left, which is the direction a positive bend folds towards.
 */
export function turnAngles(points: readonly Vec2[]): number[] {
  const turns: number[] = []
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1] as Vec2, points[index] as Vec2)
    const after = direction(points[index] as Vec2, points[index + 1] as Vec2)
    const cross = before.x * after.y - before.y * after.x
    const dot = before.x * after.x + before.y * after.y
    turns.push((Math.atan2(cross, dot) * 180) / Math.PI)
  }
  return turns
}

function direction(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (!(length > 0)) throw new SheetMetalError('A contour cannot repeat the same point twice')
  return { x: dx / length, y: dy / length }
}

function near(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) < WELD_TOLERANCE && Math.abs(a.y - b.y) < WELD_TOLERANCE
}
